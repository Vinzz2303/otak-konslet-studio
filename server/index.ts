import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_EPISODE } from '../src/data/defaultEpisode';
import { ensureDemoAssets } from '../scripts/generate-demo-audio';
import { renderEpisodeToMp4 } from '../scripts/render-episode';
import {
  CharacterVoiceProfile,
  EmotionState,
  EpisodeData,
  TTSEngineId,
} from '../src/types/animation';
import {
  CHARACTER_VOICE_PROFILES,
  TTS_MODEL_AUDIT_LOG,
} from '../src/data/voiceProfiles';
import {
  extractSyncedPhonemesFromAudio,
  getAvailableTTSEngines,
  setRuntimeTTSApiKeys,
  synthesizeCharacterDialogueToWav,
} from './ttsService';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure demo WAV files & initial episode JSON exist on startup
ensureDemoAssets();

const episodesDir = path.resolve(process.cwd(), 'data', 'episodes');
const publicAudioDir = path.resolve(process.cwd(), 'public', 'audio');
const outDir = path.resolve(process.cwd(), 'out');

fs.mkdirSync(episodesDir, { recursive: true });
fs.mkdirSync(publicAudioDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

app.use('/renders', express.static(outDir));

interface RenderJobState {
  status: 'idle' | 'rendering' | 'completed' | 'error';
  episodeId: string;
  progress: number;
  stage: string;
  downloadUrl: string | null;
  outputPath: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

let currentRenderJob: RenderJobState = {
  status: 'idle',
  episodeId: DEFAULT_EPISODE.id,
  progress: 0,
  stage: 'Ready to export',
  downloadUrl: fs.existsSync(path.join(outDir, `${DEFAULT_EPISODE.id}.mp4`))
    ? `/renders/${DEFAULT_EPISODE.id}.mp4`
    : null,
  outputPath: fs.existsSync(path.join(outDir, `${DEFAULT_EPISODE.id}.mp4`))
    ? path.join(outDir, `${DEFAULT_EPISODE.id}.mp4`)
    : null,
  error: null,
  startedAt: null,
  completedAt: null,
};

// ============================================================================
// TTS ENGINE & CHARACTER VOICE SYSTEM ENDPOINTS
// ============================================================================

app.get('/api/tts/info', (_req, res) => {
  res.json({
    engines: getAvailableTTSEngines(),
    voiceProfiles: CHARACTER_VOICE_PROFILES,
    modelAuditLog: TTS_MODEL_AUDIT_LOG,
  });
});

app.post('/api/tts/config', (req, res) => {
  const { openaiApiKey, elevenlabsApiKey } = req.body as {
    openaiApiKey?: string;
    elevenlabsApiKey?: string;
  };
  setRuntimeTTSApiKeys({ openaiApiKey, elevenlabsApiKey });
  res.json({
    ok: true,
    engines: getAvailableTTSEngines(),
  });
});

// Synthesize Voice Preview for Jange, Bang Dullah, or Cashier Machine
app.post('/api/tts/preview', async (req, res) => {
  try {
    const {
      characterId = 'jange',
      text = 'Bang, kok toko lu doang yang nyala?',
      emotion = 'confused',
      engineId = 'local_mms_vits_onnx',
      includeJawaSerang = false,
      voiceProfileOverride,
    } = req.body as {
      characterId: string;
      text: string;
      emotion: EmotionState;
      engineId?: TTSEngineId;
      includeJawaSerang?: boolean;
      voiceProfileOverride?: Partial<CharacterVoiceProfile>;
    };

    const result = await synthesizeCharacterDialogueToWav({
      characterId,
      text,
      emotion,
      engineId,
      includeJawaSerang,
      outputFileName: `preview_${characterId}_${emotion}.wav`,
      voiceProfileOverride,
    });

    res.json({
      ok: true,
      preview: result,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Regenerate an individual dialogue line & synchronize timing + mouth visemes
app.post('/api/tts/regenerate-line', async (req, res) => {
  try {
    const {
      dialogueId,
      speakerId,
      text,
      emotion,
      engineId = 'local_mms_vits_onnx',
      includeJawaSerang = false,
      voiceProfileOverride,
    } = req.body as {
      dialogueId: string;
      speakerId: string;
      text: string;
      emotion: EmotionState;
      engineId?: TTSEngineId;
      includeJawaSerang?: boolean;
      voiceProfileOverride?: Partial<CharacterVoiceProfile>;
    };

    const outputFileName = `${dialogueId}.wav`;
    const result = await synthesizeCharacterDialogueToWav({
      characterId: speakerId,
      text,
      emotion,
      engineId,
      includeJawaSerang,
      outputFileName,
      voiceProfileOverride,
    });

    res.json({
      ok: true,
      dialogueId,
      result,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ============================================================================
// EPISODE & AUDIO MANAGEMENT ENDPOINTS
// ============================================================================

app.get('/api/episodes', (_req, res) => {
  try {
    const files = fs.readdirSync(episodesDir).filter((f) => f.endsWith('.json'));
    const episodes: EpisodeData[] = files.map((f) =>
      JSON.parse(fs.readFileSync(path.join(episodesDir, f), 'utf-8'))
    );
    if (episodes.length === 0) {
      episodes.push(DEFAULT_EPISODE);
    }
    res.json({ episodes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/episodes/:id', (req, res) => {
  const filePath = path.join(episodesDir, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Episode not found' });
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.json({ episode: data });
});

app.put('/api/episodes/:id', (req, res) => {
  try {
    const episode: EpisodeData = req.body.episode;
    if (!episode || !episode.id) {
      res.status(400).json({ error: 'Invalid episode payload' });
      return;
    }
    const filePath = path.join(episodesDir, `${req.params.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(episode, null, 2), 'utf-8');
    res.json({ ok: true, episode });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/episodes', (req, res) => {
  try {
    const episode: EpisodeData = req.body.episode;
    if (!episode || !episode.id || !episode.title) {
      res.status(400).json({ error: 'Episode id and title are required' });
      return;
    }
    const existingFiles = fs.readdirSync(episodesDir).filter((f) => f.endsWith('.json'));
    if (existingFiles.length >= 25) {
      res.status(429).json({
        error:
          'Commercial Safety Policy: Bulk automated episode generation is restricted. Please complete human review on existing episodes first.',
      });
      return;
    }
    const filePath = path.join(episodesDir, `${episode.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(episode, null, 2), 'utf-8');
    res.json({ ok: true, episode });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Upload manually recorded WAV/MP3 dialogue & synchronize mouth animation timing
app.post('/api/audio/upload', (req, res) => {
  try {
    const { fileName, base64Data, text } = req.body as {
      fileName: string;
      base64Data: string;
      text?: string;
    };
    if (!fileName || !base64Data) {
      res.status(400).json({ error: 'fileName and base64Data are required' });
      return;
    }
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const cleanBase64 = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const targetPath = path.join(publicAudioDir, safeName);
    fs.writeFileSync(targetPath, buffer);

    // If it's a PCM WAV file, parse duration & extract amplitude-synced phonemes
    let durationSec: number | undefined;
    let phonemes: any = undefined;
    if (
      buffer.length > 44 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WAVE'
    ) {
      const numChannels = buffer.readUInt16LE(22) || 1;
      const sampleRate = buffer.readUInt32LE(24) || 44100;
      const bitsPerSample = buffer.readUInt16LE(34) || 16;
      const bytesPerSample = (bitsPerSample / 8) * numChannels;
      const pcmBytes = buffer.length - 44;
      const totalFrames = Math.floor(pcmBytes / Math.max(1, bytesPerSample));
      durationSec = Number((totalFrames / sampleRate).toFixed(2));

      if (text && bitsPerSample === 16) {
        const floatSamples = new Float32Array(totalFrames);
        for (let i = 0; i < totalFrames; i++) {
          const offset = 44 + i * bytesPerSample;
          if (offset + 2 <= buffer.length) {
            floatSamples[i] = buffer.readInt16LE(offset) / 32768;
          }
        }
        const extracted = extractSyncedPhonemesFromAudio(
          text,
          floatSamples,
          sampleRate
        );
        phonemes = extracted.phonemes;
      }
    }

    res.json({
      ok: true,
      fileUrl: `/audio/${safeName}?t=${Date.now()}`,
      sizeBytes: buffer.length,
      durationSec,
      phonemes,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get render status
app.get('/api/render/status', (_req, res) => {
  res.json({ job: currentRenderJob });
});

// Trigger Remotion MP4 Export
app.post('/api/render', async (req, res) => {
  if (currentRenderJob.status === 'rendering') {
    res.status(409).json({
      error: 'A video export is already in progress.',
      job: currentRenderJob,
    });
    return;
  }

  const episode: EpisodeData = req.body.episode || DEFAULT_EPISODE;

  // Save latest episode JSON before rendering
  const epPath = path.join(episodesDir, `${episode.id}.json`);
  fs.writeFileSync(epPath, JSON.stringify(episode, null, 2), 'utf-8');

  currentRenderJob = {
    status: 'rendering',
    episodeId: episode.id,
    progress: 2,
    stage: 'Initializing Remotion H.264 pipeline...',
    downloadUrl: null,
    outputPath: null,
    error: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  res.json({ ok: true, job: currentRenderJob });

  renderEpisodeToMp4(episode, (pct, stage) => {
    currentRenderJob.progress = pct;
    currentRenderJob.stage = stage;
  })
    .then((outputPath) => {
      currentRenderJob = {
        ...currentRenderJob,
        status: 'completed',
        progress: 100,
        stage: 'MP4 export completed (1080x1920, H.264, 30 FPS, Synchronized Voices & Audio included)',
        downloadUrl: `/renders/${episode.id}.mp4?t=${Date.now()}`,
        outputPath,
        completedAt: new Date().toISOString(),
      };
    })
    .catch((err) => {
      currentRenderJob = {
        ...currentRenderJob,
        status: 'error',
        stage: 'Render failed',
        error: err instanceof Error ? err.message : String(err),
      };
    });
});

app.listen(PORT, () => {
  console.log(
    `[Otak Konslet Studio API] Running at http://localhost:${PORT}`
  );
});
