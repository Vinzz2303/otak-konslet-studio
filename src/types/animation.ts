export type EmotionState =
  | 'neutral'
  | 'sleepy'
  | 'confused'
  | 'calm'
  | 'shocked'
  | 'scared'
  | 'surprised'
  | 'angry'
  | 'whispering'
  | 'awkward'
  | 'alert';

export type TTSEngineId =
  | 'local_mms_vits_onnx'
  | 'edge_neural_id'
  | 'elevenlabs_external'
  | 'openai_external'
  | 'local_klatt_dsp';

export interface TTSEngineInfo {
  id: TTSEngineId;
  name: string;
  providerType: 'local_neural' | 'local_dsp' | 'external_cloud';
  indonesianSupportLevel: 'native_neural' | 'phonetic_dsp' | 'unsupported';
  naturalnessRating: number; // 1 to 5
  licenseName: string;
  commercialUseAllowed: boolean;
  requiresApiKey: boolean;
  configured: boolean;
  investigationSummary: string;
}

export interface CharacterVoiceProfile {
  id: string;
  characterId: string;
  characterName: string;
  label: string;
  description: string;
  preferredEngine: TTSEngineId;
  languageCode: 'id-ID';
  dialectStyle: 'indonesian_genz_casual' | 'indonesian_jawa_serang' | 'synthetic_pos_terminal';
  /** Pitch shift in semitones (-6 to +6) */
  pitchShiftSemitones: number;
  /** Speaking rate multiplier (0.75 to 1.35) */
  speakingRate: number;
  /** Vocal tract formant scale (>1 deeper/larger chest, <1 younger/lighter) */
  formantRatio: number;
  /** Breathiness / aspiration factor (0.0 to 0.5) */
  breathiness: number;
  /** External provider voice ID (e.g. ElevenLabs or OpenAI voice name) */
  externalVoiceId?: string;
  sampleLines: {
    label: string;
    text: string;
    emotion: EmotionState;
    isJawaSerang?: boolean;
  }[];
}

export type VisemeCode =
  | 'REST' // Closed mouth (M, B, P, silence)
  | 'AA'   // Open wide (A)
  | 'EE'   // Wide smile/teeth (E, I, Y)
  | 'OH'   // Rounded open (O)
  | 'OO'   // Tight round (U, W)
  | 'FV'   // Consonant teeth/lip (S, T, K, N, R, L)
  | 'SHOCK'; // Frozen open gasp

export interface PhonemeCue {
  /** Offset in seconds relative to the start of the dialogue line */
  offset: number;
  /** Duration in seconds */
  duration: number;
  /** Target mouth shape viseme */
  viseme: VisemeCode;
  /** Source syllable or phoneme label for editor clarity */
  syllable?: string;
  /** Optional real audio amplitude envelope (0..1) extracted from generated WAV */
  energy?: number;
}

export type HeadMovementType =
  | 'none'
  | 'subtle_bob'
  | 'nod'
  | 'tilt_confused'
  | 'look_around'
  | 'look_left'
  | 'look_right'
  | 'freeze'
  | 'double_take';

export type BodyMovementType =
  | 'idle'
  | 'walk'
  | 'shrug'
  | 'lean_counter'
  | 'point'
  | 'freeze'
  | 'activate_pulse';

export interface AnimationInstructions {
  headMovement: HeadMovementType;
  bodyMovement: BodyMovementType;
  blinkRateMultiplier?: number;
  eyebrowState?: 'normal' | 'raised' | 'furrowed' | 'asymmetrical';
  notes?: string;
}

export interface CharacterLayerPalette {
  skin: string;
  skinShadow: string;
  hair: string;
  primaryTop: string;
  secondaryTop: string;
  bottoms: string;
  footwear: string;
  accessory: string;
  accent: string;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  role: string;
  age?: number;
  archetype: string;
  dialectNotes: string;
  rigType: 'humanoid_layered_2d' | 'machine_terminal_2d';
  isPlaceholderAsset: boolean;
  placeholderLabel: string;
  defaultEmotion: EmotionState;
  voiceProfile?: CharacterVoiceProfile;
  palette: CharacterLayerPalette;
  layersIncluded: string[];
  description: string;
}

export interface SceneCharacterPlacement {
  characterId: string;
  /** Start X position in percentage of 1080 canvas width (0 - 100) */
  startX: number;
  /** Start Y position in percentage of 1920 canvas height (0 - 100) */
  startY: number;
  /** End X position (for walking/approaching interpolation) */
  endX: number;
  /** End Y position */
  endY: number;
  /** Scale multiplier (e.g., 1.0 = normal, 1.35 = close-up) */
  startScale: number;
  endScale: number;
  flipX?: boolean;
  zIndex: number;
  baseBodyAction: BodyMovementType;
  baseEmotion: EmotionState;
  baseHeadMovement: HeadMovementType;
}

export interface BackgroundDefinition {
  id: string;
  name: string;
  locationLabel: string;
  environmentType:
    | 'minimarket_exterior_blackout'
    | 'minimarket_entrance_approach'
    | 'minimarket_counter_interior'
    | 'minimarket_pos_closeup';
  description: string;
  isPlaceholderAsset: boolean;
  skyColor: string;
  groundColor: string;
  neonAccentColor: string;
}

export interface SceneDefinition {
  id: string;
  sceneNumber: number;
  title: string;
  description: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  backgroundId: string;
  lightingMode: 'blackout_contrast' | 'fluorescent_hum' | 'emergency_red_glitch' | 'pitch_black';
  characters: SceneCharacterPlacement[];
  cutToBlackAtSecond?: number;
}

export interface DialogueLine {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startTime: number; // in seconds
  duration: number;  // in seconds
  audioRef: string;  // path in /audio/...
  emotion: EmotionState;
  ttsEngineUsed?: TTSEngineId;
  voiceProfileId?: string;
  includeJawaSerangFlavor?: boolean;
  animationInstructions: AnimationInstructions;
  /** Optional explicit phoneme/viseme schedule; auto-derived & audio-envelope synced */
  phonemes?: PhonemeCue[];
}

export type CameraMovementType =
  | 'static'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan'
  | 'shake'
  | 'zoom_and_shake';

export type SceneTransitionType =
  | 'none'
  | 'fade_from_black'
  | 'cross_dissolve'
  | 'glitch_flash'
  | 'hard_cut_to_black';

export interface CameraInstruction {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
  type: CameraMovementType;
  startZoom: number;
  endZoom: number;
  /** Focal offset X in pixels (-540 to +540) */
  startPanX: number;
  endPanX: number;
  /** Focal offset Y in pixels (-960 to +960) */
  startPanY: number;
  endPanY: number;
  shakeIntensity: number; // 0 to 25 px
  transitionIn: SceneTransitionType;
  transitionOut: SceneTransitionType;
  framingPreset: 'establishing_wide' | 'medium_two_shot' | 'over_shoulder' | 'extreme_closeup';
}

export interface AudioTrack {
  id: string;
  label: string;
  category: 'voice' | 'ambience' | 'sfx' | 'music';
  fileUrl: string;
  startTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0
  licenseStatus:
    | 'original_studio'
    | 'cc0_public_domain'
    | 'commercial_licensed'
    | 'non_commercial_preview'
    | 'placeholder_synth';
  ttsEngineId?: TTSEngineId;
  notes: string;
}

export interface AssetLicenseItem {
  id: string;
  assetName: string;
  category: 'character_rig' | 'background_art' | 'voice_audio' | 'tts_model' | 'sfx_ambience' | 'typography';
  licenseType:
    | 'Original In-House'
    | 'Procedural Synth (CC0)'
    | 'OFL Open Font'
    | 'Temporary Placeholder Rig'
    | 'CC-BY-NC 4.0 (Non-Commercial TTS)'
    | 'Commercial TTS API / Human Voice';
  commercialSafe: boolean;
  isFinalProductionAsset: boolean;
  ownerOrSource: string;
  verificationNotes: string;
}

export interface HumanReviewGate {
  characterAnimationVerified: boolean;
  dialogueLipSyncVerified: boolean;
  cameraCompositionVerified: boolean;
  commercialAssetLicenseVerified: boolean;
  antiSpamOriginalityVerified: boolean;
  reviewerName: string;
  reviewNotes: string;
  lastReviewedAt?: string;
}

export interface EpisodeData {
  id: string;
  episodeCode: string;
  seriesTitle: string;
  title: string;
  location: string;
  synopsis: string;
  duration: number; // 20 seconds
  fps: number;      // 30
  width: number;    // 1080
  height: number;   // 1920
  status: 'draft_mvp' | 'human_review' | 'approved_for_export';
  showPlaceholderBadges: boolean;
  showSafeAreaGuides: boolean;
  characters: CharacterDefinition[];
  backgrounds: BackgroundDefinition[];
  scenes: SceneDefinition[];
  dialogue: DialogueLine[];
  camera: CameraInstruction[];
  audioTracks: AudioTrack[];
  licensingChecklist: AssetLicenseItem[];
  humanReview: HumanReviewGate;
}
