import React, { useEffect, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import {
  Film,
  Users,
  MessageSquare,
  Camera,
  Music,
  ShieldCheck,
  Code2,
  Play,
  Pause,
  Download,
  Upload,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Volume2,
  RefreshCw,
  FileVideo,
  Eye,
  Grid,
  SkipBack,
  SkipForward,
  Mic,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { DEFAULT_EPISODE } from './data/defaultEpisode';
import {
  CHARACTER_VOICE_PROFILES,
  TTS_ENGINES_REGISTRY,
  TTS_MODEL_AUDIT_LOG,
} from './data/voiceProfiles';
import { EpisodeComposition } from './remotion/EpisodeComposition';
import { CharacterPuppet } from './remotion/components/CharacterPuppet';
import {
  BodyMovementType,
  CameraMovementType,
  CharacterVoiceProfile,
  DialogueLine,
  EmotionState,
  EpisodeData,
  HeadMovementType,
  PhonemeCue,
  SceneTransitionType,
  TTSEngineId,
  TTSEngineInfo,
  VisemeCode,
} from './types/animation';
import { generateIndonesianPhonemes } from './utils/lipSync';

type StudioTab =
  | 'dialogue'
  | 'scenes'
  | 'characters'
  | 'camera'
  | 'audio'
  | 'licensing'
  | 'episode_json';

interface RenderJobStatus {
  status: 'idle' | 'rendering' | 'completed' | 'error';
  episodeId: string;
  progress: number;
  stage: string;
  downloadUrl: string | null;
  outputPath: string | null;
  error: string | null;
}

const ALL_EMOTIONS: EmotionState[] = [
  'confused',
  'scared',
  'surprised',
  'angry',
  'whispering',
  'sleepy',
  'calm',
  'shocked',
  'alert',
  'neutral',
];

export default function App() {
  const [episode, setEpisode] = useState<EpisodeData>(DEFAULT_EPISODE);
  const [episodesList, setEpisodesList] = useState<EpisodeData[]>([DEFAULT_EPISODE]);
  const [activeTab, setActiveTab] = useState<StudioTab>('dialogue');
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    DEFAULT_EPISODE.scenes[0]?.id || ''
  );

  // Player & Timeline State
  const playerRef = useRef<PlayerRef>(null);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // TTS & Character Voice Preview Lab State
  const [ttsEngines, setTtsEngines] = useState<TTSEngineInfo[]>(TTS_ENGINES_REGISTRY);
  const [selectedEngineId, setSelectedEngineId] = useState<TTSEngineId>('openai_external');
  const [voiceProfiles, setVoiceProfiles] = useState<Record<string, CharacterVoiceProfile>>(
    CHARACTER_VOICE_PROFILES
  );
  const [previewCharId, setPreviewCharId] = useState<string>('jange');
  const [previewText, setPreviewText] = useState<string>(
    'Bang, kok toko lu doang yang nyala?'
  );
  const [previewEmotion, setPreviewEmotion] = useState<EmotionState>('confused');
  const [previewJawaSerang, setPreviewJawaSerang] = useState<boolean>(false);
  const [isSynthesizingPreview, setIsSynthesizingPreview] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<{
    fileUrl: string;
    durationSec: number;
    engineUsed: TTSEngineId;
    processedText: string;
    phonemes: PhonemeCue[];
    licenseName: string;
    commercialUseAllowed: boolean;
  } | null>({
    fileUrl: '/audio/preview_jange_confused.wav',
    durationSec: 2.26,
    engineUsed: 'local_mms_vits_onnx',
    processedText: 'Bang, kok toko lu doang yang nyala?',
    phonemes: generateIndonesianPhonemes('Bang, kok toko lu doang yang nyala?', 2.26),
    licenseName: 'CC-BY-NC 4.0 (Meta MMS Weights)',
    commercialUseAllowed: false,
  });
  const [regeneratingLineId, setRegeneratingLineId] = useState<string | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState<string>('');
  const [showApiKeysModal, setShowApiKeysModal] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // Character Rig Inspector Sandbox State
  const [selectedCharId, setSelectedCharId] = useState<string>('jange');
  const [sandboxEmotion, setSandboxEmotion] = useState<EmotionState>('sleepy');
  const [sandboxViseme, setSandboxViseme] = useState<VisemeCode>('REST');
  const [sandboxHead, setSandboxHead] = useState<HeadMovementType>('subtle_bob');
  const [sandboxBody, setSandboxBody] = useState<BodyMovementType>('idle');
  const [sandboxFrame, setSandboxFrame] = useState<number>(0);

  // Save & Render State
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [renderJob, setRenderJob] = useState<RenderJobStatus>({
    status: 'idle',
    episodeId: DEFAULT_EPISODE.id,
    progress: 0,
    stage: 'Ready to export MP4',
    downloadUrl: null,
    outputPath: null,
    error: null,
  });
  const [rawJsonText, setRawJsonText] = useState<string>(
    JSON.stringify(DEFAULT_EPISODE, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const totalFrames = Math.max(30, Math.round(episode.duration * episode.fps));
  const currentTimeSec = currentFrame / episode.fps;

  // Load episodes, TTS engine registry, and initial render status from backend API
  useEffect(() => {
    fetch('/api/episodes')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.episodes?.length > 0) {
          setEpisodesList(data.episodes);
          setEpisode(data.episodes[0]);
          setRawJsonText(JSON.stringify(data.episodes[0], null, 2));
        }
      })
      .catch(() => {});

    fetch('/api/tts/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.engines) setTtsEngines(data.engines);
        if (data?.voiceProfiles) setVoiceProfiles(data.voiceProfiles);
      })
      .catch(() => {});

    fetch('/api/render/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.job) setRenderJob(data.job);
      })
      .catch(() => {});
  }, []);

  // Poll render status while rendering
  useEffect(() => {
    if (renderJob.status !== 'rendering') return;
    const timer = setInterval(() => {
      fetch('/api/render/status')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.job) {
            setRenderJob(data.job);
          }
        })
        .catch(() => {});
    }, 1000);
    return () => clearInterval(timer);
  }, [renderJob.status]);

  // Subscribe to Remotion Player frame updates
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrameUpdate = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, []);

  // Animate Character Rig Sandbox preview at 30fps when on Characters tab
  useEffect(() => {
    if (activeTab !== 'characters') return;
    const interval = setInterval(() => {
      setSandboxFrame((f) => (f + 1) % 600);
    }, 33);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Keep Raw JSON text synced when episode changes
  useEffect(() => {
    setRawJsonText(JSON.stringify(episode, null, 2));
  }, [episode]);

  const seekToSecond = (sec: number) => {
    const targetFrame = Math.min(
      totalFrames - 1,
      Math.max(0, Math.round(sec * episode.fps))
    );
    setCurrentFrame(targetFrame);
    playerRef.current?.seekTo(targetFrame);
  };

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSaveEpisode = async () => {
    try {
      const res = await fetch(`/api/episodes/${episode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode }),
      });
      if (res.ok) {
        setSaveMessage('Disimpan ke data/episodes/' + episode.id + '.json');
      } else {
        setSaveMessage('Disimpan secara lokal di state sesi');
      }
    } catch {
      setSaveMessage('Disimpan secara lokal di state sesi');
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Synthesize Character Voice Preview (Jange / Bang Dullah / POS)
  const handleSynthesizeVoicePreview = async (
    overrideCharId?: string,
    overrideText?: string,
    overrideEmotion?: EmotionState,
    overrideJawaSerang?: boolean
  ) => {
    const charId = overrideCharId ?? previewCharId;
    const text = overrideText ?? previewText;
    const emotion = overrideEmotion ?? previewEmotion;
    const includeJawaSerang = overrideJawaSerang ?? previewJawaSerang;

    setIsSynthesizingPreview(true);
    try {
      const res = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: charId,
          text,
          emotion,
          engineId: selectedEngineId,
          includeJawaSerang,
          voiceProfileOverride: voiceProfiles[charId],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'TTS preview failed');
      if (data?.preview) {
        setPreviewResult(data.preview);
        setTimeout(() => {
          previewAudioRef.current?.load();
          previewAudioRef.current?.play().catch(() => {});
        }, 120);
      }
    } catch (err) {
      console.error('Preview error:', err);
      setSaveMessage(`Voice preview gagal: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSynthesizingPreview(false);
    }
  };

  // Regenerate an individual dialogue line with TTS and synchronize mouth timing + audio track
  const handleRegenerateDialogueLine = async (dlg: DialogueLine) => {
    setRegeneratingLineId(dlg.id);
    try {
      const res = await fetch('/api/tts/regenerate-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogueId: dlg.id,
          speakerId: dlg.speakerId,
          text: dlg.text,
          emotion: dlg.emotion,
          engineId: selectedEngineId,
          includeJawaSerang: Boolean(dlg.includeJawaSerangFlavor),
          voiceProfileOverride: voiceProfiles[dlg.speakerId],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Voice generation failed');
      if (data?.result) {
        const { fileUrl, durationSec, phonemes, engineUsed, processedText, commercialUseAllowed } =
          data.result;

        setEpisode((prev) => {
          const updatedDialogue = prev.dialogue.map((item) =>
            item.id === dlg.id
              ? {
                  ...item,
                  text: processedText || item.text,
                  duration: durationSec,
                  audioRef: fileUrl,
                  phonemes,
                  ttsEngineUsed: engineUsed,
                }
              : item
          );

          // Also synchronize matching voice AudioTrack in episode.audioTracks
          const matchingTrackId =
            dlg.id === 'dlg_01_jange'
              ? 'aud_dlg_01_jange'
              : dlg.id === 'dlg_02_bang_dullah'
              ? 'aud_dlg_02_dullah'
              : dlg.id === 'dlg_03_machine'
              ? 'aud_dlg_03_machine'
              : `aud_${dlg.id}`;

          const hasTrack = prev.audioTracks.some((t) => t.id === matchingTrackId);
          const updatedTracks = hasTrack
            ? prev.audioTracks.map((t) =>
                t.id === matchingTrackId
                  ? {
                      ...t,
                      fileUrl,
                      startTime: dlg.startTime,
                      duration: durationSec,
                      ttsEngineId: engineUsed,
                      licenseStatus: commercialUseAllowed
                        ? ('commercial_licensed' as const)
                        : ('non_commercial_preview' as const),
                    }
                  : t
              )
            : [
                ...prev.audioTracks,
                {
                  id: matchingTrackId,
                  label: `Voice: ${dlg.speakerName} ("${dlg.text.slice(0, 28)}...")`,
                  category: 'voice' as const,
                  fileUrl,
                  startTime: dlg.startTime,
                  duration: durationSec,
                  volume: 0.95,
                  licenseStatus: commercialUseAllowed
                    ? ('commercial_licensed' as const)
                    : ('non_commercial_preview' as const),
                  ttsEngineId: engineUsed,
                  notes: `Generated via ${engineUsed}`,
                },
              ];

          return {
            ...prev,
            dialogue: updatedDialogue,
            audioTracks: updatedTracks,
          };
        });

        setSaveMessage(
          `Voice "${dlg.speakerName}" diregenerasi (${durationSec}s, ${phonemes.length} visemes synced)`
        );
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err) {
      console.error('Failed to regenerate line:', err);
      setSaveMessage(`Gagal membuat dialog: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRegeneratingLineId(null);
    }
  };

  const handleSaveApiKeys = async () => {
    try {
      const res = await fetch('/api/tts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey, elevenlabsApiKey }),
      });
      const data = await res.json();
      if (data?.engines) {
        setTtsEngines(data.engines);
      }
      setShowApiKeysModal(false);
      setSaveMessage('Konfigurasi External TTS API disimpan');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {}
  };

  const handleExportMp4 = async () => {
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode }),
      });
      const data = await res.json();
      if (data?.job) {
        setRenderJob(data.job);
      }
    } catch {
      setRenderJob({
        ...renderJob,
        status: 'error',
        error:
          'Pastikan server backend berjalan (npm run dev) atau jalankan npm run render.',
      });
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(episode, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${episode.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result)) as EpisodeData;
        if (parsed && parsed.title && Array.isArray(parsed.scenes)) {
          setEpisode(parsed);
          setSelectedSceneId(parsed.scenes[0]?.id || '');
          setSaveMessage(`Berhasil memuat JSON: ${parsed.title}`);
          setTimeout(() => setSaveMessage(null), 3000);
        }
      } catch {
        alert('Format JSON episode tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  // Import a human-recorded performance, replacing BOTH dialogue and Remotion audio track.
  const handleUploadVoiceFile = (
    dlg: DialogueLine,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(wav|mp3)$/i.test(file.name)) {
      setSaveMessage('Gunakan rekaman WAV atau MP3.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = String(ev.target?.result || '');
      try {
        const res = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: `${dlg.id}_${file.name}`,
            base64Data,
            text: dlg.text,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.fileUrl) throw new Error(data?.error || 'Upload failed');
        const fileUrl: string = data.fileUrl;
        const newDuration: number = data.durationSec || dlg.duration;
        const newPhonemes: PhonemeCue[] =
          data.phonemes || generateIndonesianPhonemes(dlg.text, newDuration);
        setEpisode((prev) => {
          const updatedDialogue = prev.dialogue.map((line) =>
            line.id === dlg.id
              ? { ...line, audioRef: fileUrl, duration: newDuration, phonemes: newPhonemes, ttsEngineUsed: undefined }
              : line
          );
          const previousTrack = prev.audioTracks.find(
            (track) =>
              track.category === 'voice' &&
              (track.id === `aud_${dlg.id}` ||
                (track.startTime === dlg.startTime && track.fileUrl === dlg.audioRef))
          );
          const trackId = previousTrack?.id || `aud_${dlg.id}`;
          const updatedTrack = {
            id: trackId,
            label: `Rekaman: ${dlg.speakerName}`,
            category: 'voice' as const,
            fileUrl,
            startTime: dlg.startTime,
            duration: newDuration,
            volume: 0.95,
            licenseStatus: 'original_studio' as const,
            notes: 'Voice recording uploaded by the operator. Confirm performer permission before commercial publishing.',
          };
          return {
            ...prev,
            dialogue: updatedDialogue,
            audioTracks: [
              ...prev.audioTracks.filter((t) => t.id !== trackId),
              updatedTrack,
            ],
            humanReview: { ...prev.humanReview, dialogueLipSyncVerified: false, commercialAssetLicenseVerified: false },
          };
        });
        setSaveMessage(`Rekaman ${dlg.speakerName} tersimpan di track MP4. Cek lisensi dan sinkronisasi sebelum rilis.`);
      } catch (err) {
        setSaveMessage(`Gagal impor suara: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateDialogueLine = (
    dialogueId: string,
    patch: Partial<DialogueLine>
  ) => {
    setEpisode((prev) => ({
      ...prev,
      dialogue: prev.dialogue.map((d) => {
        if (d.id !== dialogueId) return d;
        const updated = { ...d, ...patch };
        if (
          (patch.text !== undefined || patch.duration !== undefined) &&
          !patch.phonemes
        ) {
          updated.phonemes = generateIndonesianPhonemes(
            updated.text,
            updated.duration
          );
        }
        return updated;
      }),
    }));
  };

  const selectedScene =
    episode.scenes.find((s) => s.id === selectedSceneId) || episode.scenes[0];
  const selectedChar =
    episode.characters.find((c) => c.id === selectedCharId) ||
    episode.characters[0];
  const activePreviewProfile =
    voiceProfiles[previewCharId] || voiceProfiles.jange;
  const activeEngineMeta =
    ttsEngines.find((e) => e.id === selectedEngineId) || ttsEngines[0];

  const allReviewChecksPassed =
    episode.humanReview.characterAnimationVerified &&
    episode.humanReview.dialogueLipSyncVerified &&
    episode.humanReview.cameraCompositionVerified &&
    episode.humanReview.commercialAssetLicenseVerified &&
    episode.humanReview.antiSpamOriginalityVerified;

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900 flex flex-col">
      {/* ==================================================================
          TOP ENTERPRISE STUDIO BAR
         ================================================================== */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              OKS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900 text-base tracking-tight">
                  Otak Konslet Studio
                </h1>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  NATURAL ID VOICE + 2D ENGINE
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {episode.episodeCode} — {episode.title} ({episode.width}×
                {episode.height} • {episode.fps} FPS)
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Active TTS Engine Selector */}
          <div className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedEngineId}
              onChange={(e) => setSelectedEngineId(e.target.value as TTSEngineId)}
              className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-800 focus:outline-none focus:border-blue-600"
              title="Select Active Indonesian TTS Engine"
            >
              {ttsEngines.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  TTS: {eng.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowApiKeysModal(!showApiKeysModal)}
              className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
              title="Configure External Commercial TTS API Keys (OpenAI / ElevenLabs)"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Viewport Overlay Toggles */}
          <button
            onClick={() =>
              setEpisode((p) => ({
                ...p,
                showPlaceholderBadges: !p.showPlaceholderBadges,
              }))
            }
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors ${
              episode.showPlaceholderBadges
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Toggle Placeholder Rig Labels on Video Canvas"
          >
            <Eye className="w-3.5 h-3.5" />
            Rig Badges: {episode.showPlaceholderBadges ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() =>
              setEpisode((p) => ({
                ...p,
                showSafeAreaGuides: !p.showSafeAreaGuides,
              }))
            }
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors ${
              episode.showSafeAreaGuides
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Toggle 9:16 Broadcast Safe Area Guides"
          >
            <Grid className="w-3.5 h-3.5" />
            Safe Guides
          </button>
        </div>

        {/* Right Actions: Save, Import/Export JSON, Export MP4 */}
        <div className="flex items-center gap-2.5">
          {saveMessage && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              {saveMessage}
            </span>
          )}

          <button
            onClick={handleSaveEpisode}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-gray-500" />
            Save Project
          </button>

          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            JSON
          </button>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportJsonFile}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportMp4}
            disabled={renderJob.status === 'rendering'}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-xs transition-colors cursor-pointer"
          >
            <FileVideo className="w-4 h-4" />
            {renderJob.status === 'rendering'
              ? `Rendering MP4 (${renderJob.progress}%)...`
              : 'Export MP4 (1080×1920)'}
          </button>
        </div>
      </header>

      {/* External Commercial TTS API Key Configuration Drawer */}
      {showApiKeysModal && (
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="text-xs">
            <strong className="text-gray-900">
              External Commercial TTS API Keys (Optional):
            </strong>{' '}
            <span className="text-gray-500">
              Local Neural Indonesian VITS (`mms-tts-ind`) works offline out-of-the-box. Add OpenAI or ElevenLabs keys for commercial-licensed cloud synthesis.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder="OPENAI_API_KEY (sk-...)"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              className="text-xs font-mono border border-gray-200 rounded px-2.5 py-1.5 w-48"
            />
            <input
              type="password"
              placeholder="ELEVENLABS_API_KEY"
              value={elevenlabsApiKey}
              onChange={(e) => setElevenlabsApiKey(e.target.value)}
              className="text-xs font-mono border border-gray-200 rounded px-2.5 py-1.5 w-48"
            />
            <button
              onClick={handleSaveApiKeys}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              Save Keys
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================
          RENDER PROGRESS / DOWNLOAD NOTIFICATION BAR
         ================================================================== */}
      {(renderJob.status === 'rendering' ||
        renderJob.status === 'completed' ||
        renderJob.status === 'error') && (
        <div
          className={`px-6 py-2.5 border-b flex items-center justify-between text-xs ${
            renderJob.status === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : renderJob.status === 'completed'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {renderJob.status === 'rendering' && (
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            )}
            {renderJob.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            {renderJob.status === 'error' && (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-medium">{renderJob.stage}</span>
            {renderJob.outputPath && (
              <span className="font-mono text-[11px] text-gray-600">
                ({renderJob.outputPath})
              </span>
            )}
            {renderJob.error && (
              <span className="font-mono text-red-700">{renderJob.error}</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {renderJob.status === 'rendering' && (
              <div className="w-48 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${renderJob.progress}%` }}
                />
              </div>
            )}
            {renderJob.downloadUrl && (
              <a
                href={renderJob.downloadUrl}
                download={`${episode.id}.mp4`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Rendered MP4
              </a>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================
          MAIN WORKSPACE GRID (LEFT: STUDIO EDITORS, RIGHT: 9:16 PLAYER)
         ================================================================== */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* LEFT COLUMN (7 Cols): Navigation Tabs + Active Editor Module */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col border-r border-gray-200 bg-[#f9fafb]">
          {/* Module Navigation Bar */}
          <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-1 overflow-x-auto">
            {[
              {
                id: 'dialogue',
                label: 'Voice Studio & Dialogue',
                icon: MessageSquare,
                count: episode.dialogue.length,
              },
              {
                id: 'scenes',
                label: 'Scene Editor',
                icon: Film,
                count: episode.scenes.length,
              },
              {
                id: 'characters',
                label: 'Character Library',
                icon: Users,
                count: episode.characters.length,
              },
              {
                id: 'camera',
                label: 'Camera System',
                icon: Camera,
                count: episode.camera.length,
              },
              {
                id: 'audio',
                label: 'Audio Stems',
                icon: Music,
                count: episode.audioTracks.length,
              },
              {
                id: 'licensing',
                label: 'Commercial Safety & TTS Audit',
                icon: ShieldCheck,
              },
              {
                id: 'episode_json',
                label: 'Episode JSON',
                icon: Code2,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as StudioTab)}
                  className={`inline-flex items-center gap-2 px-3.5 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Editor Content Scroll Area */}
          <div className="p-6 overflow-y-auto max-h-[calc(100vh-310px)] space-y-6">
            {/* ==============================================================
                TAB 1: CHARACTER VOICE STUDIO & DIALOGUE LIP-SYNC EDITOR
               ============================================================== */}
            {activeTab === 'dialogue' && (
              <div className="space-y-6">
                {/* ==========================================================
                    CHARACTER VOICE PREVIEW & AUDITION LAB (JANGE & BANG DULLAH)
                   ========================================================== */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-900">
                          Character Voice Preview & Audition Lab (Bahasa Indonesia)
                        </h2>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                            activeEngineMeta.commercialUseAllowed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {activeEngineMeta.licenseName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Test and fine-tune separate Indonesian voice profiles for{' '}
                        <strong>Jange</strong> (young sleepy/confused Gen Z male) and{' '}
                        <strong>Bang Dullah</strong> (relaxed adult male cashier with Jawa Serang expressions).
                      </p>
                    </div>
                  </div>

                  {/* Character Voice Profile Selector Pills */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.values(voiceProfiles).map((prof) => {
                      const isSel = prof.characterId === previewCharId;
                      return (
                        <div
                          key={prof.id}
                          onClick={() => {
                            setPreviewCharId(prof.characterId);
                            const firstSample = prof.sampleLines[0];
                            if (firstSample) {
                              setPreviewText(firstSample.text);
                              setPreviewEmotion(firstSample.emotion);
                              setPreviewJawaSerang(Boolean(firstSample.isJawaSerang));
                            }
                          }}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                            isSel
                              ? 'bg-blue-50/40 border-blue-600 ring-1 ring-blue-600'
                              : 'bg-gray-50/60 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-900">
                              {prof.characterName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                              Pitch {prof.pitchShiftSemitones >= 0 ? `+${prof.pitchShiftSemitones}` : prof.pitchShiftSemitones} st • {prof.speakingRate}x
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 line-clamp-2">
                            {prof.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sample Preset Lines & Emotional Tag Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700">
                          Indonesian Preview Text ({activePreviewProfile.characterName})
                        </label>
                        {previewCharId === 'bang_dullah' && (
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={previewJawaSerang}
                              onChange={(e) => setPreviewJawaSerang(e.target.checked)}
                              className="rounded border-gray-300 text-teal-600"
                            />
                            + Logat Jawa Serang (", geh")
                          </label>
                        )}
                      </div>
                      <input
                        type="text"
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        className="w-full text-xs bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 font-medium focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Emotional Delivery Tag
                      </label>
                      <select
                        value={previewEmotion}
                        onChange={(e) => setPreviewEmotion(e.target.value as EmotionState)}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2 font-medium"
                      >
                        {ALL_EMOTIONS.map((em) => (
                          <option key={em} value={em}>
                            {em.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <button
                        onClick={() => handleSynthesizeVoicePreview()}
                        disabled={isSynthesizingPreview}
                        className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-xs cursor-pointer"
                      >
                        {isSynthesizingPreview ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Synthesizing...
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            Preview Voice
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Audition Presets for Jange & Bang Dullah */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-gray-500 mr-1">
                      Quick Audition Presets:
                    </span>
                    {activePreviewProfile.sampleLines.map((sample, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setPreviewText(sample.text);
                          setPreviewEmotion(sample.emotion);
                          setPreviewJawaSerang(Boolean(sample.isJawaSerang));
                          handleSynthesizeVoicePreview(
                            previewCharId,
                            sample.text,
                            sample.emotion,
                            Boolean(sample.isJawaSerang)
                          );
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 text-gray-700 transition-colors cursor-pointer"
                      >
                        {sample.label} ({sample.emotion})
                      </button>
                    ))}
                  </div>

                  {/* Voice Profile Acoustic Tuning Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-3 rounded-md border border-gray-200/80 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600 font-medium">
                          Pitch Shift (Semitones)
                        </span>
                        <span className="font-mono font-semibold text-gray-900">
                          {activePreviewProfile.pitchShiftSemitones} st
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.2"
                        value={activePreviewProfile.pitchShiftSemitones}
                        onChange={(e) =>
                          setVoiceProfiles((prev) => ({
                            ...prev,
                            [previewCharId]: {
                              ...prev[previewCharId],
                              pitchShiftSemitones: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600 font-medium">
                          Speaking Rate (Cadence)
                        </span>
                        <span className="font-mono font-semibold text-gray-900">
                          {activePreviewProfile.speakingRate}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.25"
                        step="0.02"
                        value={activePreviewProfile.speakingRate}
                        onChange={(e) =>
                          setVoiceProfiles((prev) => ({
                            ...prev,
                            [previewCharId]: {
                              ...prev[previewCharId],
                              speakingRate: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600 font-medium">
                          Breathiness / Aspiration
                        </span>
                        <span className="font-mono font-semibold text-gray-900">
                          {Math.round(activePreviewProfile.breathiness * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.4"
                        step="0.02"
                        value={activePreviewProfile.breathiness}
                        onChange={(e) =>
                          setVoiceProfiles((prev) => ({
                            ...prev,
                            [previewCharId]: {
                              ...prev[previewCharId],
                              breathiness: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* Active Preview Audio Player & Synced Visemes */}
                  {previewResult && (
                    <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-950">
                            Latest Voice Preview: “{previewResult.processedText}”
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-700">
                            {previewResult.durationSec}s • {previewResult.phonemes.length} viseme cues
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 font-mono">
                          Engine: {previewResult.engineUsed} • File: {previewResult.fileUrl}
                        </p>
                      </div>
                      <audio
                        ref={previewAudioRef}
                        controls
                        src={previewResult.fileUrl}
                        className="h-8 w-64"
                      />
                    </div>
                  )}
                </div>

                {/* ==========================================================
                    EPISODE DIALOGUE LINES (WITH PER-LINE REGENERATE & PREVIEW)
                   ========================================================== */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Episode Dialogue Lines & Synchronized Mouth Visemes
                    </h2>
                    <p className="text-xs text-gray-500">
                      Regenerate individual lines with natural Indonesian TTS or
                      import manually recorded WAV/MP3 files.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newLine: DialogueLine = {
                        id: `dlg_${Date.now()}`,
                        speakerId: 'jange',
                        speakerName: 'JANGE',
                        text: 'Waduh, suara apaan tuh Bang?',
                        startTime: 14.0,
                        duration: 2.0,
                        audioRef: '/audio/dlg_01_jange.wav',
                        emotion: 'scared',
                        ttsEngineUsed: selectedEngineId,
                        voiceProfileId: 'voice_jange_genz',
                        animationInstructions: {
                          headMovement: 'double_take',
                          bodyMovement: 'freeze',
                        },
                        phonemes: generateIndonesianPhonemes(
                          'Waduh, suara apaan tuh Bang?',
                          2.0
                        ),
                      };
                      setEpisode((p) => ({
                        ...p,
                        dialogue: [...p.dialogue, newLine],
                      }));
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Dialogue Line
                  </button>
                </div>

                {episode.dialogue.map((dlg, idx) => {
                  const isRegenerating = regeneratingLineId === dlg.id;
                  return (
                    <div
                      key={dlg.id}
                      className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            LINE 0{idx + 1}
                          </span>
                          <select
                            value={dlg.speakerId}
                            onChange={(e) => {
                              const charObj = episode.characters.find(
                                (c) => c.id === e.target.value
                              );
                              updateDialogueLine(dlg.id, {
                                speakerId: e.target.value,
                                speakerName:
                                  charObj?.name.toUpperCase() || e.target.value,
                              });
                            }}
                            className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-gray-900"
                          >
                            {episode.characters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.role})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => seekToSecond(dlg.startTime + 0.2)}
                            className="text-xs font-mono text-blue-600 hover:underline cursor-pointer"
                          >
                            Jump to {dlg.startTime.toFixed(1)}s →
                          </button>
                        </div>

                        {/* Per-Line Voice Controls: Audio Player, Regenerate TTS, Import WAV/MP3 */}
                        <div className="flex items-center gap-2">
                          <audio
                            controls
                            src={dlg.audioRef}
                            className="h-7 w-40"
                            title="Play generated dialogue WAV"
                          />

                          <button
                            onClick={() => handleRegenerateDialogueLine(dlg)}
                            disabled={isRegenerating}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                            title="Regenerate this dialogue line using the selected Indonesian TTS engine and synchronize mouth visemes"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${
                                isRegenerating ? 'animate-spin' : ''
                              }`}
                            />
                            {isRegenerating ? 'Generating...' : 'Regenerate Voice'}
                          </button>

                          <label className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 cursor-pointer">
                            <Upload className="w-3 h-3" />
                            Import WAV/MP3
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleUploadVoiceFile(dlg, e)}
                              className="hidden"
                            />
                          </label>

                          {episode.dialogue.length > 1 && (
                            <button
                              onClick={() =>
                                setEpisode((p) => ({
                                  ...p,
                                  dialogue: p.dialogue.filter(
                                    (item) => item.id !== dlg.id
                                  ),
                                }))
                              }
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                              title="Delete Dialogue Line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dialogue Text & Timing Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-6">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-medium text-gray-600">
                              Indonesian Dialogue Text
                            </label>
                            {dlg.speakerId === 'bang_dullah' && (
                              <label className="inline-flex items-center gap-1 text-[11px] text-teal-800 font-medium cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(dlg.includeJawaSerangFlavor)}
                                  onChange={(e) =>
                                    updateDialogueLine(dlg.id, {
                                      includeJawaSerangFlavor: e.target.checked,
                                    })
                                  }
                                  className="rounded border-gray-300"
                                />
                                Jawa Serang Dialect (", geh")
                              </label>
                            )}
                          </div>
                          <input
                            type="text"
                            value={dlg.text}
                            onChange={(e) =>
                              updateDialogueLine(dlg.id, {
                                text: e.target.value,
                              })
                            }
                            className="w-full text-xs bg-white border border-gray-200 rounded px-3 py-2 text-gray-900 font-medium focus:outline-none focus:border-blue-600"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Start (s)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={dlg.startTime}
                            onChange={(e) =>
                              updateDialogueLine(dlg.id, {
                                startTime: Number(e.target.value),
                              })
                            }
                            className="w-full text-xs font-mono bg-white border border-gray-200 rounded px-2.5 py-2"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Synced Duration (s)
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            value={dlg.duration}
                            onChange={(e) =>
                              updateDialogueLine(dlg.id, {
                                duration: Number(e.target.value),
                              })
                            }
                            className="w-full text-xs font-mono bg-white border border-gray-200 rounded px-2.5 py-2"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Emotional Tag
                          </label>
                          <select
                            value={dlg.emotion}
                            onChange={(e) =>
                              updateDialogueLine(dlg.id, {
                                emotion: e.target.value as EmotionState,
                              })
                            }
                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-2 font-medium"
                          >
                            {ALL_EMOTIONS.map((em) => (
                              <option key={em} value={em}>
                                {em}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Animation Instructions & Audio Reference */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-md border border-gray-200/80">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Head Movement Instruction
                          </label>
                          <select
                            value={dlg.animationInstructions.headMovement}
                            onChange={(e) =>
                              updateDialogueLine(dlg.id, {
                                animationInstructions: {
                                  ...dlg.animationInstructions,
                                  headMovement: e.target
                                    .value as HeadMovementType,
                                },
                              })
                            }
                            className="w-full text-xs bg-white border border-gray-200 rounded px-2.5 py-1.5"
                          >
                            <option value="tilt_confused">tilt_confused</option>
                            <option value="nod">nod</option>
                            <option value="subtle_bob">subtle_bob</option>
                            <option value="look_around">look_around</option>
                            <option value="double_take">double_take</option>
                            <option value="freeze">freeze</option>
                            <option value="none">none</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Body Gesture Instruction
                          </label>
                          <select
                            value={dlg.animationInstructions.bodyMovement}
                            onChange={(e) =>
                              updateDialogueLine(dlg.id, {
                                animationInstructions: {
                                  ...dlg.animationInstructions,
                                  bodyMovement: e.target
                                    .value as BodyMovementType,
                                },
                              })
                            }
                            className="w-full text-xs bg-white border border-gray-200 rounded px-2.5 py-1.5"
                          >
                            <option value="point">point</option>
                            <option value="shrug">shrug</option>
                            <option value="idle">idle</option>
                            <option value="lean_counter">lean_counter</option>
                            <option value="freeze">freeze</option>
                            <option value="activate_pulse">
                              activate_pulse
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Saved Audio File & Engine
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={dlg.audioRef}
                              readOnly
                              className="w-full text-xs font-mono bg-white border border-gray-200 rounded px-2.5 py-1.5 text-gray-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Synchronized Phoneme / Viseme + Acoustic Energy Strip */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-medium text-gray-500">
                            Audio-Synchronized Mouth Viseme Timeline (
                            {dlg.phonemes?.length || 0} cues • Duration:{' '}
                            {dlg.duration}s)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {(dlg.phonemes || []).map((cue, cIdx) => (
                            <div
                              key={cIdx}
                              className="px-2 py-1 rounded bg-gray-100 border border-gray-200 text-[10px] font-mono flex flex-col items-center min-w-[50px]"
                            >
                              <span className="font-bold text-blue-700">
                                {cue.viseme}
                              </span>
                              <span className="text-gray-700 truncate max-w-[44px]">
                                {cue.syllable}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                +{cue.offset}s
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ==============================================================
                TAB 2: SCENE & EPISODE EDITOR
               ============================================================== */}
            {activeTab === 'scenes' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Episode Metadata & Story Breakdown
                      </h2>
                      <p className="text-xs text-gray-500">
                        Reusable data-driven episode definition for Otak Konslet Studio
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      Duration: {episode.duration}s ({totalFrames} frames)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Episode Title
                      </label>
                      <input
                        type="text"
                        value={episode.title}
                        onChange={(e) =>
                          setEpisode({ ...episode, title: e.target.value })
                        }
                        className="w-full text-xs bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Setting / Location Stamp
                      </label>
                      <input
                        type="text"
                        value={episode.location}
                        onChange={(e) =>
                          setEpisode({ ...episode, location: e.target.value })
                        }
                        className="w-full text-xs bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Episode Code
                        </label>
                        <input
                          type="text"
                          value={episode.episodeCode}
                          onChange={(e) =>
                            setEpisode({
                              ...episode,
                              episodeCode: e.target.value,
                            })
                          }
                          className="w-full text-xs font-mono bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Duration (sec)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={episode.duration}
                          onChange={(e) =>
                            setEpisode({
                              ...episode,
                              duration: Number(e.target.value) || 20,
                            })
                          }
                          className="w-full text-xs font-mono bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Scene Selector Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {episode.scenes.map((scene) => {
                    const isSelected = scene.id === selectedScene?.id;
                    const isCurrentTimeInScene =
                      currentTimeSec >= scene.startTime &&
                      currentTimeSec < scene.endTime;

                    return (
                      <div
                        key={scene.id}
                        onClick={() => {
                          setSelectedSceneId(scene.id);
                          seekToSecond(scene.startTime + 0.5);
                        }}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-blue-600 ring-1 ring-blue-600 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                              SCENE 0{scene.sceneNumber}
                            </span>
                            <span className="text-xs font-mono text-blue-600 font-semibold">
                              {scene.startTime}s – {scene.endTime}s
                            </span>
                          </div>
                          {isCurrentTimeInScene && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              LIVE ON STAGE
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {scene.title}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                          {scene.description}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                          <span>
                            Lighting:{' '}
                            <strong className="font-mono text-gray-700">
                              {scene.lightingMode}
                            </strong>
                          </span>
                          <span>
                            Characters:{' '}
                            <strong className="text-gray-700">
                              {scene.characters.length}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Scene Inspector */}
                {selectedScene && (
                  <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Scene 0{selectedScene.sceneNumber} Staging:{' '}
                          {selectedScene.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Configure character positions (start X/Y to end X/Y),
                          scale, base emotion, and body animation
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase">
                            <th className="py-2 pr-3">Character</th>
                            <th className="py-2 px-2">Start X / End X (%)</th>
                            <th className="py-2 px-2">Y Pos (%)</th>
                            <th className="py-2 px-2">Scale</th>
                            <th className="py-2 px-2">Body Action</th>
                            <th className="py-2 px-2">Base Emotion</th>
                            <th className="py-2 pl-2">Flip X</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {selectedScene.characters.map((placement, idx) => {
                            const charInfo = episode.characters.find(
                              (c) => c.id === placement.characterId
                            );
                            const updatePlacement = (
                              patch: Partial<typeof placement>
                            ) => {
                              setEpisode((prev) => ({
                                ...prev,
                                scenes: prev.scenes.map((s) =>
                                  s.id === selectedScene.id
                                    ? {
                                        ...s,
                                        characters: s.characters.map((c, i) =>
                                          i === idx ? { ...c, ...patch } : c
                                        ),
                                      }
                                    : s
                                ),
                              }));
                            };

                            return (
                              <tr key={placement.characterId}>
                                <td className="py-2.5 pr-3 font-medium text-gray-900">
                                  {charInfo?.name || placement.characterId}
                                </td>
                                <td className="py-2.5 px-2">
                                  <div className="flex items-center gap-1 font-mono">
                                    <input
                                      type="number"
                                      value={placement.startX}
                                      onChange={(e) =>
                                        updatePlacement({
                                          startX: Number(e.target.value),
                                        })
                                      }
                                      className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs"
                                    />
                                    <span>→</span>
                                    <input
                                      type="number"
                                      value={placement.endX}
                                      onChange={(e) =>
                                        updatePlacement({
                                          endX: Number(e.target.value),
                                        })
                                      }
                                      className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 font-mono">
                                  <input
                                    type="number"
                                    value={placement.startY}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      updatePlacement({
                                        startY: val,
                                        endY: val,
                                      });
                                    }}
                                    className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-2 font-mono">
                                  <input
                                    type="number"
                                    step="0.05"
                                    value={placement.startScale}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      updatePlacement({
                                        startScale: val,
                                        endScale: val,
                                      });
                                    }}
                                    className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs"
                                  />
                                </td>
                                <td className="py-2.5 px-2">
                                  <select
                                    value={placement.baseBodyAction}
                                    onChange={(e) =>
                                      updatePlacement({
                                        baseBodyAction: e.target
                                          .value as BodyMovementType,
                                      })
                                    }
                                    className="border border-gray-200 rounded px-2 py-1 text-xs bg-gray-50"
                                  >
                                    <option value="idle">idle</option>
                                    <option value="walk">walk</option>
                                    <option value="shrug">shrug</option>
                                    <option value="lean_counter">
                                      lean_counter
                                    </option>
                                    <option value="point">point</option>
                                    <option value="freeze">freeze</option>
                                    <option value="activate_pulse">
                                      activate_pulse
                                    </option>
                                  </select>
                                </td>
                                <td className="py-2.5 px-2">
                                  <select
                                    value={placement.baseEmotion}
                                    onChange={(e) =>
                                      updatePlacement({
                                        baseEmotion: e.target
                                          .value as EmotionState,
                                      })
                                    }
                                    className="border border-gray-200 rounded px-2 py-1 text-xs bg-gray-50"
                                  >
                                    {ALL_EMOTIONS.map((em) => (
                                      <option key={em} value={em}>
                                        {em}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2.5 pl-2">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(placement.flipX)}
                                    onChange={(e) =>
                                      updatePlacement({
                                        flipX: e.target.checked,
                                      })
                                    }
                                    className="rounded border-gray-300"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                TAB 3: LAYERED 2D CHARACTER LIBRARY & RIG SANDBOX
               ============================================================== */}
            {activeTab === 'characters' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {episode.characters.map((char) => {
                    const isSelected = char.id === selectedChar.id;
                    return (
                      <div
                        key={char.id}
                        onClick={() => {
                          setSelectedCharId(char.id);
                          setSandboxEmotion(char.defaultEmotion);
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-blue-600 ring-1 ring-blue-600 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {char.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            {char.layersIncluded.length} LAYERS
                          </span>
                        </div>
                        <p className="text-xs font-medium text-blue-700 mb-1">
                          {char.role} {char.age ? `• ${char.age} thn` : ''}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-3 mb-2">
                          {char.description}
                        </p>
                        <div className="text-[11px] text-gray-500 font-mono truncate">
                          Voice: {char.voiceProfile?.label || char.dialectNotes}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Interactive Character Puppet Rig Inspector */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-5 bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden border border-slate-800">
                    <div className="absolute top-3 left-3 text-[11px] font-mono text-slate-400">
                      LIVE RIG SANDBOX • 30 FPS
                    </div>
                    <div className="mt-8">
                      <CharacterPuppet
                        character={selectedChar}
                        frame={sandboxFrame}
                        fps={30}
                        emotion={sandboxEmotion}
                        headMovement={sandboxHead}
                        bodyMovement={sandboxBody}
                        viseme={sandboxViseme}
                        mouthOpenness={sandboxViseme === 'REST' ? 0.05 : 0.85}
                        isSpeaking={sandboxViseme !== 'REST'}
                        scale={0.62}
                        showPlaceholderBadge={true}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-4">
                    <div className="border-b border-gray-100 pb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900">
                          {selectedChar.name} — Multi-Layer 2D Rig Inspector
                        </h3>
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-medium">
                          Temporary Placeholder Asset
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Test expressions (`confused`, `scared`, `surprised`, `angry`, `whispering`, `sleepy`), mouth visemes, and kinematics.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Facial Expression (Eyes & Brows)
                        </label>
                        <select
                          value={sandboxEmotion}
                          onChange={(e) =>
                            setSandboxEmotion(e.target.value as EmotionState)
                          }
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                        >
                          {ALL_EMOTIONS.map((em) => (
                            <option key={em} value={em}>
                              {em}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Mouth Lip-Sync Viseme Shape
                        </label>
                        <select
                          value={sandboxViseme}
                          onChange={(e) =>
                            setSandboxViseme(e.target.value as VisemeCode)
                          }
                          className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                        >
                          <option value="REST">REST (Closed M / B / P)</option>
                          <option value="AA">AA (Wide Open Jaw A)</option>
                          <option value="EE">EE (Wide Smile Teeth E / I)</option>
                          <option value="OH">OH (Rounded Open O)</option>
                          <option value="OO">OO (Tight Round U / W)</option>
                          <option value="FV">FV (Consonant Teeth S / T)</option>
                          <option value="SHOCK">SHOCK (Frozen Gasp)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Head Articulation
                        </label>
                        <select
                          value={sandboxHead}
                          onChange={(e) =>
                            setSandboxHead(e.target.value as HeadMovementType)
                          }
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                        >
                          <option value="subtle_bob">subtle_bob</option>
                          <option value="tilt_confused">tilt_confused</option>
                          <option value="nod">nod</option>
                          <option value="look_around">look_around</option>
                          <option value="double_take">double_take</option>
                          <option value="freeze">freeze</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Body / Walk Cycle Kinematics
                        </label>
                        <select
                          value={sandboxBody}
                          onChange={(e) =>
                            setSandboxBody(e.target.value as BodyMovementType)
                          }
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                        >
                          <option value="idle">idle (Breathing)</option>
                          <option value="walk">walk (Full Stride Cycle)</option>
                          <option value="point">point (Raise Right Arm)</option>
                          <option value="shrug">shrug (Dual Arm Shrug)</option>
                          <option value="lean_counter">lean_counter</option>
                          <option value="freeze">freeze (Shock Tremor)</option>
                          <option value="activate_pulse">
                            activate_pulse (POS Terminal)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        Articulated Character Layer Hierarchy (
                        {selectedChar.layersIncluded.length} Independent SVG
                        Groups)
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        {selectedChar.layersIncluded.map((layerName, i) => (
                          <div
                            key={layerName}
                            className="text-[11px] font-mono px-2.5 py-1.5 rounded bg-gray-50 border border-gray-200 text-gray-700 flex items-center gap-2"
                          >
                            <span className="text-gray-400 font-bold">
                              L{String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="truncate">{layerName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                TAB 4: CAMERA SYSTEM EDITOR
               ============================================================== */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs">
                  <h2 className="text-sm font-semibold text-gray-900">
                    2D Cinematic Camera & Transition Rig
                  </h2>
                  <p className="text-xs text-gray-500">
                    Configure zoom-in, zoom-out, tracking pan, high-frequency
                    camera shake, and scene transitions across the timeline.
                  </p>
                </div>

                {episode.camera.map((cam, idx) => (
                  <div
                    key={cam.id}
                    className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                          CAM 0{idx + 1}
                        </span>
                        <span className="text-xs font-mono font-semibold text-blue-600">
                          {cam.startTime}s – {cam.endTime}s
                        </span>
                        <span className="text-xs font-semibold text-gray-900">
                          {cam.label}
                        </span>
                      </div>
                      <button
                        onClick={() => seekToSecond(cam.startTime + 0.2)}
                        className="text-xs font-mono text-blue-600 hover:underline cursor-pointer"
                      >
                        Jump to Camera Cue →
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Movement Type
                        </label>
                        <select
                          value={cam.type}
                          onChange={(e) => {
                            const val = e.target.value as CameraMovementType;
                            setEpisode((p) => ({
                              ...p,
                              camera: p.camera.map((c) =>
                                c.id === cam.id ? { ...c, type: val } : c
                              ),
                            }));
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono"
                        >
                          <option value="static">static</option>
                          <option value="zoom_in">zoom_in</option>
                          <option value="zoom_out">zoom_out</option>
                          <option value="pan">pan</option>
                          <option value="shake">shake</option>
                          <option value="zoom_and_shake">zoom_and_shake</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Start Zoom → End Zoom
                        </label>
                        <div className="flex items-center gap-1 font-mono">
                          <input
                            type="number"
                            step="0.05"
                            value={cam.startZoom}
                            onChange={(e) =>
                              setEpisode((p) => ({
                                ...p,
                                camera: p.camera.map((c) =>
                                  c.id === cam.id
                                    ? {
                                        ...c,
                                        startZoom: Number(e.target.value),
                                      }
                                    : c
                                ),
                              }))
                            }
                            className="w-16 border border-gray-200 rounded px-1.5 py-1"
                          />
                          <span>→</span>
                          <input
                            type="number"
                            step="0.05"
                            value={cam.endZoom}
                            onChange={(e) =>
                              setEpisode((p) => ({
                                ...p,
                                camera: p.camera.map((c) =>
                                  c.id === cam.id
                                    ? { ...c, endZoom: Number(e.target.value) }
                                    : c
                                ),
                              }))
                            }
                            className="w-16 border border-gray-200 rounded px-1.5 py-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Pan X (Start → End px)
                        </label>
                        <div className="flex items-center gap-1 font-mono">
                          <input
                            type="number"
                            value={cam.startPanX}
                            onChange={(e) =>
                              setEpisode((p) => ({
                                ...p,
                                camera: p.camera.map((c) =>
                                  c.id === cam.id
                                    ? {
                                        ...c,
                                        startPanX: Number(e.target.value),
                                      }
                                    : c
                                ),
                              }))
                            }
                            className="w-16 border border-gray-200 rounded px-1.5 py-1"
                          />
                          <span>→</span>
                          <input
                            type="number"
                            value={cam.endPanX}
                            onChange={(e) =>
                              setEpisode((p) => ({
                                ...p,
                                camera: p.camera.map((c) =>
                                  c.id === cam.id
                                    ? { ...c, endPanX: Number(e.target.value) }
                                    : c
                                ),
                              }))
                            }
                            className="w-16 border border-gray-200 rounded px-1.5 py-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Shake Intensity (px)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={25}
                          value={cam.shakeIntensity}
                          onChange={(e) =>
                            setEpisode((p) => ({
                              ...p,
                              camera: p.camera.map((c) =>
                                c.id === cam.id
                                  ? {
                                      ...c,
                                      shakeIntensity: Number(e.target.value),
                                    }
                                  : c
                              ),
                            }))
                          }
                          className="w-full font-mono border border-gray-200 rounded px-2 py-1.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Transition In
                        </label>
                        <select
                          value={cam.transitionIn}
                          onChange={(e) =>
                            setEpisode((p) => ({
                              ...p,
                              camera: p.camera.map((c) =>
                                c.id === cam.id
                                  ? {
                                      ...c,
                                      transitionIn: e.target
                                        .value as SceneTransitionType,
                                    }
                                  : c
                              ),
                            }))
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono"
                        >
                          <option value="none">none</option>
                          <option value="fade_from_black">
                            fade_from_black
                          </option>
                          <option value="glitch_flash">glitch_flash</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Transition Out
                        </label>
                        <select
                          value={cam.transitionOut}
                          onChange={(e) =>
                            setEpisode((p) => ({
                              ...p,
                              camera: p.camera.map((c) =>
                                c.id === cam.id
                                  ? {
                                      ...c,
                                      transitionOut: e.target
                                        .value as SceneTransitionType,
                                    }
                                  : c
                              ),
                            }))
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono"
                        >
                          <option value="none">none</option>
                          <option value="cross_dissolve">cross_dissolve</option>
                          <option value="hard_cut_to_black">
                            hard_cut_to_black
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ==============================================================
                TAB 5: AUDIO STEM MANAGEMENT
               ============================================================== */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Synchronized Audio Stems (Character Voices, Sound Effects & Background Ambience)
                  </h2>
                  <p className="text-xs text-gray-500">
                    All voice, SFX, and ambience stems are mixed into the Remotion
                    composition and encoded into the exported H.264 MP4.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase">
                        <th className="py-3 px-4">Track Label</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Timing</th>
                        <th className="py-3 px-3">Volume</th>
                        <th className="py-3 px-3">Preview Player</th>
                        <th className="py-3 px-4">License Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {episode.audioTracks.map((track) => (
                        <tr key={track.id}>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">
                              {track.label}
                            </div>
                            <div className="text-[11px] font-mono text-gray-400">
                              {track.fileUrl}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                              {track.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-700">
                            {track.startTime}s –{' '}
                            {(track.startTime + track.duration).toFixed(2)}s
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={track.volume}
                              onChange={(e) => {
                                const vol = Number(e.target.value);
                                setEpisode((p) => ({
                                  ...p,
                                  audioTracks: p.audioTracks.map((t) =>
                                    t.id === track.id
                                      ? { ...t, volume: vol }
                                      : t
                                  ),
                                }));
                              }}
                              className="w-24 accent-blue-600"
                            />
                            <span className="ml-2 font-mono text-[11px]">
                              {Math.round(track.volume * 100)}%
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <audio
                              controls
                              src={track.fileUrl}
                              className="h-7 w-44"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                                track.licenseStatus === 'non_commercial_preview'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {track.licenseStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==============================================================
                TAB 6: COMMERCIAL SAFETY & TTS MODEL INVESTIGATION AUDIT
               ============================================================== */}
            {activeTab === 'licensing' && (
              <div className="space-y-6">
                {/* TTS Model Investigation & Commercial Licensing Verification Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                  <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Indonesian TTS Model Investigation & Commercial License Audit
                      </h3>
                      <p className="text-xs text-gray-500">
                        Verified Indonesian language support and licensing terms before model installation
                      </p>
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase">
                        <th className="py-2.5 px-4">Evaluated TTS Model</th>
                        <th className="py-2.5 px-3">Indonesian Support</th>
                        <th className="py-2.5 px-3">License</th>
                        <th className="py-2.5 px-3">Audit Verdict</th>
                        <th className="py-2.5 px-4">Technical Findings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {TTS_MODEL_AUDIT_LOG.map((audit) => (
                        <tr key={audit.modelName}>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {audit.modelName}
                          </td>
                          <td className="py-3 px-3 text-gray-700">
                            {audit.indonesianSupport}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-gray-700">
                            {audit.license}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                audit.verdict === 'INCLUDED_LOCAL_PREVIEW'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {audit.verdict}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {audit.technicalNotes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Anti-Spam & Human Review Gate Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Commercial Production Safety & Human Director Review Gate
                      </h2>
                      <p className="text-xs text-gray-500">
                        Enforces original asset licensing, clearly labels
                        temporary MVP placeholders, and requires human review
                        before publishing.
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                        allReviewChecksPassed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {allReviewChecksPassed
                        ? 'Human Review Gate: PASSED'
                        : 'Human Review Gate: PENDING'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {[
                      {
                        key: 'characterAnimationVerified',
                        label:
                          'Layered character animation & expressions reviewed (No flat single-PNG rigs)',
                      },
                      {
                        key: 'dialogueLipSyncVerified',
                        label:
                          'Indonesian dialogue timing & syllable viseme lip-sync verified',
                      },
                      {
                        key: 'cameraCompositionVerified',
                        label:
                          'Camera movements, shake, and 18.8s Cut-to-Black verified',
                      },
                      {
                        key: 'commercialAssetLicenseVerified',
                        label:
                          'TTS model & voice license verified for target release channel',
                      },
                      {
                        key: 'antiSpamOriginalityVerified',
                        label:
                          'Human-authored narrative episode (Not bulk-generated spam content)',
                      },
                    ].map((item) => {
                      const k = item.key as keyof typeof episode.humanReview;
                      const checked = Boolean(episode.humanReview[k]);
                      return (
                        <label
                          key={item.key}
                          className="flex items-start gap-2.5 p-3 rounded-md border border-gray-200 bg-gray-50/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setEpisode((p) => ({
                                ...p,
                                humanReview: {
                                  ...p.humanReview,
                                  [k]: e.target.checked,
                                },
                              }))
                            }
                            className="mt-0.5 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-gray-800 font-medium">
                            {item.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Asset Licensing Checklist Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                  <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Episode Asset Licensing & Provenance Checklist
                    </h3>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase">
                        <th className="py-2.5 px-4">Asset Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">License Type</th>
                        <th className="py-2.5 px-3">Commercial Safe</th>
                        <th className="py-2.5 px-4">Provenance & Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {episode.licensingChecklist.map((lic) => (
                        <tr key={lic.id}>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {lic.assetName}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                            {lic.category}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {lic.licenseType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {lic.commercialSafe ? (
                              <span className="text-emerald-700 font-semibold">
                                Yes (Commercial Safe)
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">
                                Preview Only (CC-BY-NC)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            <div>{lic.verificationNotes}</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                              Source: {lic.ownerOrSource}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==============================================================
                TAB 7: STRUCTURED EPISODE JSON EDITOR
               ============================================================== */}
            {activeTab === 'episode_json' && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Structured Episode JSON Schema (`{episode.id}.json`)
                    </h2>
                    <p className="text-xs text-gray-500">
                      Edit the complete episode JSON directly to drive the
                      reusable animation engine without touching application code.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(rawJsonText) as EpisodeData;
                        setEpisode(parsed);
                        setJsonError(null);
                        setSaveMessage('JSON Applied to Live Stage');
                        setTimeout(() => setSaveMessage(null), 2500);
                      } catch (err) {
                        setJsonError(
                          err instanceof Error ? err.message : 'Invalid JSON'
                        );
                      }
                    }}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Apply JSON Changes
                  </button>
                </div>

                {jsonError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs font-mono text-red-700">
                    JSON Syntax Error: {jsonError}
                  </div>
                )}

                <textarea
                  value={rawJsonText}
                  onChange={(e) => setRawJsonText(e.target.value)}
                  rows={22}
                  className="w-full font-mono text-xs bg-gray-900 text-gray-100 p-4 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================
            RIGHT COLUMN (5 Cols): VERTICAL 9:16 REMOTION PLAYER MONITOR
           ================================================================== */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-white flex flex-col items-center justify-between p-5 border-b border-gray-200">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-semibold text-gray-900">
                Program Monitor (9:16 Vertical HD)
              </span>
              <span className="ml-2 text-[11px] font-mono text-gray-500">
                1080×1920 • {episode.fps} FPS
              </span>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
              {currentTimeSec.toFixed(2)}s / {episode.duration.toFixed(1)}s (F
              {String(currentFrame).padStart(3, '0')})
            </span>
          </div>

          {/* Remotion Player Container */}
          <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-300 bg-black flex items-center justify-center">
            <Player
              ref={playerRef}
              component={EpisodeComposition}
              inputProps={{ episode }}
              durationInFrames={totalFrames}
              fps={episode.fps}
              compositionWidth={episode.width}
              compositionHeight={episode.height}
              style={{
                width: 270,
                height: 480,
              }}
              controls
              loop
            />
          </div>

          {/* Transport Controls Bar */}
          <div className="w-full mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => seekToSecond(0)}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-700 cursor-pointer"
                title="Jump to Start (0.0s)"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Play
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  seekToSecond(Math.min(episode.duration, currentTimeSec + 1))
                }
                className="p-1.5 rounded hover:bg-gray-200 text-gray-700 cursor-pointer"
                title="Step Forward +1s"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Story Beat Jump Buttons */}
            <div className="flex items-center gap-1">
              {[
                { label: '0s Blackout', sec: 0.5 },
                { label: '6s Jange', sec: 6.0 },
                { label: '10.6s Dullah', sec: 10.6 },
                { label: '15.3s POS', sec: 15.3 },
              ].map((beat) => (
                <button
                  key={beat.label}
                  onClick={() => seekToSecond(beat.sec)}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-white border border-gray-200 hover:border-blue-500 text-gray-700 cursor-pointer"
                >
                  {beat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================
          BOTTOM MULTI-TRACK PRODUCTION TIMELINE (SCENES, CAMERA, DIALOGUE)
         ================================================================== */}
      <footer className="bg-white border-t border-gray-200 px-6 py-3 select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
              Multi-Track Production Timeline
            </span>
            <span className="text-[11px] font-mono text-gray-500">
              Click anywhere on the timeline tracks to scrub playhead
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-gray-500">
            <span>00.0s</span>
            <span>05.0s</span>
            <span>10.0s</span>
            <span>15.0s</span>
            <span>20.0s</span>
          </div>
        </div>

        <div
          className="relative bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1.5 cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            seekToSecond(ratio * episode.duration);
          }}
        >
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-20 pointer-events-none"
            style={{
              left: `${(currentTimeSec / episode.duration) * 100}%`,
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 -ml-1" />
          </div>

          {/* Track 1: Scenes */}
          <div className="relative h-6 bg-gray-200/60 rounded overflow-hidden flex items-center">
            {episode.scenes.map((s) => {
              const leftPct = (s.startTime / episode.duration) * 100;
              const widthPct =
                ((s.endTime - s.startTime) / episode.duration) * 100;
              return (
                <div
                  key={s.id}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className="absolute top-0.5 bottom-0.5 bg-slate-700 text-white text-[10px] font-mono px-2 flex items-center truncate rounded-xs border-r border-white"
                >
                  S{s.sceneNumber}: {s.title} ({s.startTime}–{s.endTime}s)
                </div>
              );
            })}
          </div>

          {/* Track 2: Dialogue & Lip-Sync Cues */}
          <div className="relative h-6 bg-gray-200/60 rounded overflow-hidden flex items-center">
            {episode.dialogue.map((d) => {
              const leftPct = (d.startTime / episode.duration) * 100;
              const widthPct = (d.duration / episode.duration) * 100;
              const colorClass =
                d.speakerId === 'cashier_machine'
                  ? 'bg-red-600'
                  : d.speakerId === 'jange'
                  ? 'bg-blue-600'
                  : 'bg-teal-600';
              return (
                <div
                  key={d.id}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute top-0.5 bottom-0.5 ${colorClass} text-white text-[10px] font-mono px-2 flex items-center truncate rounded-xs shadow-2xs`}
                >
                  {d.speakerName} [{d.emotion}]: “{d.text}” ({d.duration}s)
                </div>
              );
            })}
          </div>

          {/* Track 3: Camera Instructions */}
          <div className="relative h-5 bg-gray-200/60 rounded overflow-hidden flex items-center">
            {episode.camera.map((c) => {
              const leftPct = (c.startTime / episode.duration) * 100;
              const widthPct =
                ((c.endTime - c.startTime) / episode.duration) * 100;
              return (
                <div
                  key={c.id}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className="absolute top-0.5 bottom-0.5 bg-amber-500/90 text-gray-950 text-[10px] font-mono font-semibold px-2 flex items-center truncate rounded-xs border-r border-white"
                >
                  CAM [{c.type.toUpperCase()}] {c.startZoom}x→{c.endZoom}x
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
