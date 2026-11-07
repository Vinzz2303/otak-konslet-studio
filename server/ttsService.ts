import fs from 'node:fs';
import path from 'node:path';
import {
  CharacterVoiceProfile,
  EmotionState,
  PhonemeCue,
  TTSEngineId,
  TTSEngineInfo,
} from '../src/types/animation';
import {
  CHARACTER_VOICE_PROFILES,
  TTS_ENGINES_REGISTRY,
} from '../src/data/voiceProfiles';
import { generateIndonesianPhonemes } from '../src/utils/lipSync';
import {
  synthesizeSpeechFromPhonemes,
  writeWavFile,
} from '../scripts/generate-demo-audio';

// Singleton cache for the local HuggingFace Transformers.js VITS pipeline
let cachedLocalMmsPipeline: any = null;
let loadingLocalMmsPromise: Promise<any> | null = null;

export interface RuntimeTTSConfig {
  openaiApiKey?: string;
  elevenlabsApiKey?: string;
}

const runtimeConfig: RuntimeTTSConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
};

export function setRuntimeTTSApiKeys(keys: Partial<RuntimeTTSConfig>) {
  if (keys.openaiApiKey !== undefined) {
    runtimeConfig.openaiApiKey = keys.openaiApiKey.trim();
  }
  if (keys.elevenlabsApiKey !== undefined) {
    runtimeConfig.elevenlabsApiKey = keys.elevenlabsApiKey.trim();
  }
}

export function getAvailableTTSEngines(): TTSEngineInfo[] {
  return TTS_ENGINES_REGISTRY.map((eng) => {
    if (eng.id === 'openai_external') {
      return { ...eng, configured: Boolean(runtimeConfig.openaiApiKey) };
    }
    if (eng.id === 'elevenlabs_external') {
      return { ...eng, configured: Boolean(runtimeConfig.elevenlabsApiKey) };
    }
    return eng;
  });
}

/**
 * Normalizes colloquial Indonesian & Jawa Serang expressions so neural VITS / SSML
 * pronounces particles ("Nge", "geh", "kagak", "doang", "ora umum") naturally.
 */
export function preprocessIndonesianDialogue(
  rawText: string,
  characterId: string,
  emotion: EmotionState,
  includeJawaSerang?: boolean
): string {
  let text = rawText.trim();

  // Optional Jawa Serang expression enrichment for Bang Dullah if requested
  if (
    characterId === 'bang_dullah' &&
    includeJawaSerang &&
    !/\b(geh|ora|kabeh|bae|dewek)\b/i.test(text)
  ) {
    text = text.replace(/\.$/, '') + ', geh.';
  }

  // Ensure natural breath pause before vocative nicknames ("Nge", "Bang", "geh")
  text = text.replace(/\s+(Nge|geh)([.?!]|$)/gi, ', $1$2');

  // Phonetic hints for acronyms so Indonesian VITS reads them cleanly
  text = text.replace(/\bPOS\b/g, 'pos');
  text = text.replace(/\bJANGE\b/g, 'Jange');

  if (emotion === 'confused' && !text.endsWith('?')) {
    text = text.replace(/[.!]+$/, '') + '?';
  }

  return text;
}

/**
 * Loads the local Indonesian VITS neural TTS model (`payam1394/traxlate-mms-tts-ind`)
 * via @huggingface/transformers ONNX Runtime.
 */
async function getLocalIndonesianVitsPipeline() {
  if (cachedLocalMmsPipeline) {
    return cachedLocalMmsPipeline;
  }
  if (!loadingLocalMmsPromise) {
    loadingLocalMmsPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      console.log(
        '[TTS Service] Initializing local Indonesian VITS model (payam1394/traxlate-mms-tts-ind)...'
      );
      cachedLocalMmsPipeline = await pipeline(
        'text-to-speech',
        'payam1394/traxlate-mms-tts-ind',
        { dtype: 'fp32' }
      );
      console.log('[TTS Service] Local Indonesian VITS model ready.');
      return cachedLocalMmsPipeline;
    })();
  }
  return loadingLocalMmsPromise;
}

/**
 * Synthesizes raw mono Float32Array audio using the selected TTS engine BEFORE character/emotion DSP.
 */
async function synthesizeRawEngineAudio(
  text: string,
  engineId: TTSEngineId,
  profile: CharacterVoiceProfile,
  emotion: EmotionState
): Promise<{ samples: Float32Array; sampleRate: number; actualEngineUsed: TTSEngineId }> {
  // 1. Try External OpenAI Commercial TTS if requested & configured
  if (engineId === 'openai_external' && runtimeConfig.openaiApiKey) {
    try {
      const voice = profile.externalVoiceId || (profile.characterId === 'bang_dullah' ? 'onyx' : 'alloy');
      const instructions = `Speak in natural Bahasa Indonesia (${profile.description}). Emotion: ${emotion}.`;
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${runtimeConfig.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice,
          input: text,
          instructions,
          response_format: 'pcm',
        }),
      });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const int16 = new Int16Array(arrayBuf);
        const floatSamples = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          floatSamples[i] = int16[i] / 32768;
        }
        return {
          samples: floatSamples,
          sampleRate: 24000,
          actualEngineUsed: 'openai_external',
        };
      }
    } catch (err) {
      console.warn('[TTS Service] OpenAI TTS fallback to local VITS:', err);
    }
  }

  // 2. Try External ElevenLabs Multilingual v2 if requested & configured
  if (engineId === 'elevenlabs_external' && runtimeConfig.elevenlabsApiKey) {
    try {
      const voiceId =
        profile.characterId === 'bang_dullah'
          ? 'pNInz6obpgDQGcFmaJgB' // Adam (deep adult male)
          : 'ErXwobaYiN019PkySvjV'; // Antoni (young male)
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_24000`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': runtimeConfig.elevenlabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: emotion === 'scared' || emotion === 'surprised' ? 0.35 : 0.65,
              similarity_boost: 0.8,
              style: emotion === 'calm' || emotion === 'sleepy' ? 0.2 : 0.6,
            },
          }),
        }
      );
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const int16 = new Int16Array(arrayBuf);
        const floatSamples = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          floatSamples[i] = int16[i] / 32768;
        }
        return {
          samples: floatSamples,
          sampleRate: 24000,
          actualEngineUsed: 'elevenlabs_external',
        };
      }
    } catch (err) {
      console.warn('[TTS Service] ElevenLabs fallback to local VITS:', err);
    }
  }

  // 3. Try Indonesian Neural Prosody Engine (msedge-tts id-ID-ArdiNeural) if selected
  if (engineId === 'edge_neural_id') {
    try {
      const { MsEdgeTTS } = await import('msedge-tts');
      const tts = new MsEdgeTTS();
      await tts.setMetadata(
        'id-ID-ArdiNeural',
        'raw-24khz-16bit-mono-pcm' as any
      );
      const { audioStream } = tts.toStream(text);
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        audioStream.on('end', () => resolve());
        audioStream.on('error', (e: Error) => reject(e));
      });
      const pcmBuf = Buffer.concat(chunks);
      if (pcmBuf.length > 400) {
        const sampleCount = Math.floor(pcmBuf.length / 2);
        const floatSamples = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
          floatSamples[i] = pcmBuf.readInt16LE(i * 2) / 32768;
        }
        return {
          samples: floatSamples,
          sampleRate: 24000,
          actualEngineUsed: 'edge_neural_id',
        };
      }
    } catch (err) {
      console.warn('[TTS Service] Edge Neural fallback to Local VITS:', err);
    }
  }

  // 4. Local Neural VITS Indonesian (`local_mms_vits_onnx` via @huggingface/transformers)
  if (engineId !== 'local_klatt_dsp') {
    try {
      const vits = await getLocalIndonesianVitsPipeline();
      const out = await vits(text);
      const rawAudio: Float32Array =
        out.audio instanceof Float32Array
          ? out.audio
          : new Float32Array(out.audio);
      return {
        samples: rawAudio,
        sampleRate: out.sampling_rate || 16000,
        actualEngineUsed: 'local_mms_vits_onnx',
      };
    } catch (err) {
      console.warn('[TTS Service] Local VITS error, using Klatt DSP:', err);
    }
  }

  // 5. Offline Klatt Formant DSP Fallback (`local_klatt_dsp`)
  const estDuration = Math.max(1.4, Math.min(7.5, text.length * 0.085));
  const phonemes = generateIndonesianPhonemes(text, estDuration);
  const baseHz =
    profile.characterId === 'bang_dullah'
      ? 110
      : profile.characterId === 'cashier_machine'
      ? 185
      : 145;
  const dspSamples = synthesizeSpeechFromPhonemes(
    estDuration,
    phonemes,
    baseHz,
    profile.characterId === 'cashier_machine'
  );
  return {
    samples: dspSamples,
    sampleRate: 44100,
    actualEngineUsed: 'local_klatt_dsp',
  };
}

/**
 * Applies character voice identity (Jange vs Bang Dullah vs POS Machine)
 * and emotional delivery modulation (confused, scared, surprised, angry, whispering, sleepy, calm)
 * and resamples cleanly to 44,100 Hz mono for Remotion.
 */
export function applyCharacterAndEmotionDSP(
  inputSamples: Float32Array,
  inputSampleRate: number,
  profile: CharacterVoiceProfile,
  emotion: EmotionState
): Float32Array {
  const TARGET_SR = 44100;

  // Trim excess leading/trailing silence from raw neural output, keeping 80ms pad
  let startIdx = 0;
  let endIdx = inputSamples.length - 1;
  const silenceThreshold = 0.008;
  while (startIdx < endIdx && Math.abs(inputSamples[startIdx]) < silenceThreshold) {
    startIdx++;
  }
  while (endIdx > startIdx && Math.abs(inputSamples[endIdx]) < silenceThreshold) {
    endIdx--;
  }
  const padSamples = Math.floor(inputSampleRate * 0.07);
  startIdx = Math.max(0, startIdx - padSamples);
  endIdx = Math.min(inputSamples.length - 1, endIdx + padSamples);
  const trimmed = inputSamples.subarray(startIdx, endIdx + 1);

  // Emotion-specific pitch (in semitones) and rate modifiers
  let emotionSemitones = 0;
  let emotionRateMult = 1.0;
  let vibratoDepth = 0;
  let vibratoHz = 6.0;
  let whisperMix = profile.breathiness || 0;
  let harmonicDrive = 1.0;

  switch (emotion) {
    case 'sleepy':
      emotionSemitones = -0.8;
      emotionRateMult = 0.88;
      whisperMix += 0.1;
      break;
    case 'confused':
      emotionSemitones = 0.4;
      emotionRateMult = 0.95;
      break;
    case 'calm':
      emotionSemitones = -0.4;
      emotionRateMult = 0.93;
      break;
    case 'scared':
    case 'shocked':
      emotionSemitones = 1.6;
      emotionRateMult = 1.07;
      vibratoDepth = 0.022; // Vocal tremor in fear/shock
      vibratoHz = 6.8;
      whisperMix += 0.08;
      break;
    case 'surprised':
      emotionSemitones = 2.2;
      emotionRateMult = 1.09;
      harmonicDrive = 1.25;
      break;
    case 'angry':
      emotionSemitones = 0.9;
      emotionRateMult = 1.11;
      harmonicDrive = 1.65;
      break;
    case 'whispering':
      emotionSemitones = 0.0;
      emotionRateMult = 0.89;
      whisperMix = 0.68; // Strong aspirated whisper turbulence
      break;
    default:
      break;
  }

  const totalSemitones = profile.pitchShiftSemitones + emotionSemitones;
  const basePitchRatio = Math.pow(2, totalSemitones / 12);
  const effectiveSpeed = Math.max(0.7, Math.min(1.4, profile.speakingRate * emotionRateMult));

  // Output duration after speakingRate adjustment
  const sourceDurationSec = trimmed.length / inputSampleRate;
  const targetDurationSec = sourceDurationSec / effectiveSpeed;
  const outLength = Math.max(1024, Math.floor(targetDurationSec * TARGET_SR));
  const out = new Float32Array(outLength);

  // Overlap-Add (SOLA/WSOLA-inspired) pitch & time-scale warper so pitch and speaking rate are independent!
  const grainSize = Math.floor(TARGET_SR * 0.032); // 32ms Hann window grain
  const halfGrain = Math.floor(grainSize / 2);

  for (let gStart = 0; gStart < outLength - grainSize; gStart += halfGrain) {
    const progress = gStart / outLength;

    // Emotional intonation contour over the sentence
    let contourPitchMult = 1.0;
    if (emotion === 'confused' && progress > 0.65) {
      // Questioning upward inflection at end of sentence
      const qProg = (progress - 0.65) / 0.35;
      contourPitchMult = 1.0 + qProg * 0.11;
    } else if (emotion === 'surprised' && progress < 0.35) {
      contourPitchMult = 1.08;
    } else if (emotion === 'sleepy') {
      // Drooping pitch toward end of phrase
      contourPitchMult = 1.02 - progress * 0.07;
    }

    const centerSourceIdx = progress * (trimmed.length - 1);
    const localPitchRatio = basePitchRatio * contourPitchMult;

    for (let i = 0; i < grainSize; i++) {
      const tSec = (gStart + i) / TARGET_SR;
      const vibratoMod =
        vibratoDepth > 0 ? 1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoHz * tSec) : 1;

      const offsetFromCenter = (i - halfGrain) * (inputSampleRate / TARGET_SR) * localPitchRatio * vibratoMod;
      const srcPos = centerSourceIdx + offsetFromCenter;

      if (srcPos >= 0 && srcPos < trimmed.length - 1) {
        const idx0 = Math.floor(srcPos);
        const frac = srcPos - idx0;
        const sample = trimmed[idx0] * (1 - frac) + trimmed[idx0 + 1] * frac;
        // Hann window
        const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (grainSize - 1)));
        out[gStart + i] += sample * window;
      }
    }
  }

  // Apply Character Timbre Filter (Chest Resonance for Bang Dullah, Youthful Presence for Jange, POS Ring-Mod for Machine, or Whisper High-Pass)
  let lowPassState = 0;
  let highPassState = 0;
  let prevSample = 0;
  const isBangDullah = profile.characterId === 'bang_dullah';
  const isPosMachine = profile.characterId === 'cashier_machine';

  let maxPeak = 0.01;
  for (let i = 0; i < outLength; i++) {
    let s = out[i];
    const env = Math.min(1, Math.abs(s) * 3.5);

    // 1-pole low-pass for chest warmth (~320Hz)
    lowPassState = lowPassState + 0.045 * (s - lowPassState);
    // 1-pole high-pass for crispness / whisper (~450Hz)
    highPassState = 0.94 * (highPassState + s - prevSample);
    prevSample = s;

    if (emotion === 'whispering') {
      // Hushed aspirated whisper: replace heavy vocal cord fundamental with envelope-shaped turbulent breath + high-pass
      const whiteNoise = (Math.random() * 2 - 1) * env * 0.55;
      s = highPassState * 0.55 + whiteNoise * whisperMix;
    } else if (isPosMachine) {
      // Cashier Machine synthetic terminal ring-modulation
      const t = i / TARGET_SR;
      const ringCarrier = 0.78 + 0.22 * Math.sin(2 * Math.PI * 92 * t);
      s = (s * 0.75 + highPassState * 0.35) * ringCarrier;
    } else if (isBangDullah) {
      // Bang Dullah: Warm relaxed adult chest resonance
      s = s * 0.8 + lowPassState * 0.55;
    } else {
      // Jange: Youthful Gen-Z presence + subtle breathiness
      const breath = (Math.random() * 2 - 1) * env * whisperMix * 0.18;
      s = s * 0.85 + highPassState * 0.25 + breath;
    }

    if (harmonicDrive > 1.05) {
      s = Math.tanh(s * harmonicDrive);
    }

    out[i] = s;
    if (Math.abs(s) > maxPeak) {
      maxPeak = Math.abs(s);
    }
  }

  // Normalize to clean broadcast peak (-1.5 dBFS / 0.84)
  const targetPeak = emotion === 'whispering' ? 0.48 : 0.85;
  const normGain = targetPeak / Math.max(0.02, maxPeak);
  for (let i = 0; i < outLength; i++) {
    out[i] = Math.max(-0.98, Math.min(0.98, out[i] * normGain));
  }

  return out;
}

/**
 * Extracts synchronized PhonemeCue[] timing and real acoustic RMS energy
 * from the generated audio waveform so character mouth animations match the voice!
 */
export function extractSyncedPhonemesFromAudio(
  text: string,
  samples: Float32Array,
  sampleRate = 44100
): { durationSec: number; phonemes: PhonemeCue[] } {
  const durationSec = Number((samples.length / sampleRate).toFixed(2));
  const baseCues = generateIndonesianPhonemes(text, durationSec);

  const synced = baseCues.map((cue) => {
    const sIdx = Math.max(0, Math.floor(cue.offset * sampleRate));
    const eIdx = Math.min(
      samples.length,
      Math.floor((cue.offset + cue.duration) * sampleRate)
    );
    let sumSq = 0;
    const count = Math.max(1, eIdx - sIdx);
    for (let i = sIdx; i < eIdx; i++) {
      sumSq += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSq / count);
    const energy = Number(Math.min(1, rms * 3.2).toFixed(2));

    // If audio is genuinely silent during a vowel cue, close mouth to REST
    const effectiveViseme =
      energy < 0.04 && cue.viseme !== 'REST' ? 'REST' : cue.viseme;

    return {
      ...cue,
      viseme: effectiveViseme,
      energy,
    };
  });

  return { durationSec, phonemes: synced };
}

export interface SynthesizeDialogueOptions {
  characterId: string;
  text: string;
  emotion: EmotionState;
  engineId?: TTSEngineId;
  includeJawaSerang?: boolean;
  outputFileName: string;
  voiceProfileOverride?: Partial<CharacterVoiceProfile>;
}

export interface SynthesizeDialogueResult {
  fileUrl: string;
  filePath: string;
  durationSec: number;
  engineUsed: TTSEngineId;
  processedText: string;
  phonemes: PhonemeCue[];
  commercialUseAllowed: boolean;
  licenseName: string;
}

/**
 * Main entry point: Synthesizes natural Indonesian character speech, applies
 * Jange/Bang Dullah vocal tract & emotional DSP, saves the WAV file to public/audio/,
 * and returns synchronized phoneme viseme cues.
 */
export async function synthesizeCharacterDialogueToWav(
  opts: SynthesizeDialogueOptions
): Promise<SynthesizeDialogueResult> {
  const baseProfile =
    CHARACTER_VOICE_PROFILES[opts.characterId] || CHARACTER_VOICE_PROFILES.jange;
  const profile: CharacterVoiceProfile = {
    ...baseProfile,
    ...(opts.voiceProfileOverride || {}),
  };

  const requestedEngine = opts.engineId || profile.preferredEngine || 'local_mms_vits_onnx';
  const processedText = preprocessIndonesianDialogue(
    opts.text,
    opts.characterId,
    opts.emotion,
    opts.includeJawaSerang
  );

  const { samples: rawSamples, sampleRate, actualEngineUsed } =
    await synthesizeRawEngineAudio(
      processedText,
      requestedEngine,
      profile,
      opts.emotion
    );

  const shapedSamples = applyCharacterAndEmotionDSP(
    rawSamples,
    sampleRate,
    profile,
    opts.emotion
  );

  const { durationSec, phonemes } = extractSyncedPhonemesFromAudio(
    opts.text,
    shapedSamples,
    44100
  );

  const safeName = opts.outputFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const publicAudioDir = path.resolve(process.cwd(), 'public', 'audio');
  fs.mkdirSync(publicAudioDir, { recursive: true });
  const filePath = path.join(publicAudioDir, safeName);

  writeWavFile(filePath, shapedSamples);

  const engineMeta =
    TTS_ENGINES_REGISTRY.find((e) => e.id === actualEngineUsed) ||
    TTS_ENGINES_REGISTRY[0];

  return {
    fileUrl: `/audio/${safeName}?t=${Date.now()}`,
    filePath,
    durationSec,
    engineUsed: actualEngineUsed,
    processedText,
    phonemes,
    commercialUseAllowed: engineMeta.commercialUseAllowed,
    licenseName: engineMeta.licenseName,
  };
}
