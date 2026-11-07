import { CharacterVoiceProfile, TTSEngineInfo } from '../types/animation';

export const CHARACTER_VOICE_PROFILES: Record<string, CharacterVoiceProfile> = {
  jange: {
    id: 'voice_jange_genz',
    characterId: 'jange',
    characterName: 'Jange',
    label: 'Jange — Young Indonesian Male (Gen Z, Sleepy & Confused)',
    description:
      '19-year-old Indonesian male. Youthful tenor timbre (+1.5 semitones), slightly sleepy relaxed pace (0.94x), soft breathy onset, casual Gen Z Jakarta/Banten intonation.',
    preferredEngine: 'local_mms_vits_onnx',
    languageCode: 'id-ID',
    dialectStyle: 'indonesian_genz_casual',
    pitchShiftSemitones: 1.5,
    speakingRate: 0.94,
    formantRatio: 0.95,
    breathiness: 0.12,
    externalVoiceId: 'alloy',
    sampleLines: [
      {
        label: 'Ep 01 Line (Confused)',
        text: 'Bang, kok toko lu doang yang nyala?',
        emotion: 'confused',
      },
      {
        label: 'Sleepy Gen Z Monologue',
        text: 'Aduh... niat beli kopi sachet doang malah berasa masuk dimensi lain dah.',
        emotion: 'sleepy',
      },
      {
        label: 'Scared Reaction',
        text: 'Bang Dullah! Itu mesin kasir lu ngapa manggil nama gue sendiri?!',
        emotion: 'scared',
      },
      {
        label: 'Whispering Anomaly',
        text: 'Ssst... Bang, denger suara dengung dari kulkas belakang kagak?',
        emotion: 'whispering',
      },
    ],
  },
  bang_dullah: {
    id: 'voice_dullah_serang',
    characterId: 'bang_dullah',
    characterName: 'Bang Dullah',
    label: 'Bang Dullah — Adult Indonesian Male (Calm Cashier, Jawa Serang)',
    description:
      '29-year-old Indonesian minimarket cashier. Warm grounded adult male baritone (-2.2 semitones), relaxed steady tempo (0.91x), expressive chest resonance, optional authentic Jawa Serang / Banten dialect.',
    preferredEngine: 'local_mms_vits_onnx',
    languageCode: 'id-ID',
    dialectStyle: 'indonesian_jawa_serang',
    pitchShiftSemitones: -2.2,
    speakingRate: 0.91,
    formantRatio: 1.07,
    breathiness: 0.04,
    externalVoiceId: 'onyx',
    sampleLines: [
      {
        label: 'Ep 01 Line (Standard)',
        text: 'Gue juga kagak ngerti, Nge.',
        emotion: 'confused',
        isJawaSerang: false,
      },
      {
        label: 'Ep 01 Line + Jawa Serang Dialect',
        text: 'Gue juga kagak ngerti, Nge. Dari magrib lampu kampung mati kabeh, geh.',
        emotion: 'confused',
        isJawaSerang: true,
      },
      {
        label: 'Surprised Jawa Serang Expression',
        text: 'Lah, ora umum iki! Mesin kasir ngapa urip dewek padahal kabelnya dicabut, geh!',
        emotion: 'surprised',
        isJawaSerang: true,
      },
      {
        label: 'Calm Cashier Advice',
        text: 'Udah santai bae Nge, palingan gardu depan lagi konslet biasa.',
        emotion: 'calm',
        isJawaSerang: true,
      },
    ],
  },
  cashier_machine: {
    id: 'voice_pos_terminal',
    characterId: 'cashier_machine',
    characterName: 'Mesin Kasir POS-01',
    label: 'Mesin Kasir POS-01 — Automated Terminal Voice',
    description:
      'Synthetic Indonesian POS terminal announcer with precision syllable cadence and subtle metallic ring-modulation.',
    preferredEngine: 'local_mms_vits_onnx',
    languageCode: 'id-ID',
    dialectStyle: 'synthetic_pos_terminal',
    pitchShiftSemitones: -0.5,
    speakingRate: 0.89,
    formantRatio: 1.0,
    breathiness: 0.0,
    externalVoiceId: 'echo',
    sampleLines: [
      {
        label: 'Ep 01 Anomaly Callout',
        text: 'Pelanggan berikutnya: JANGE.',
        emotion: 'alert',
      },
      {
        label: 'System Warning',
        text: 'Peringatan sistem. Transaksi tengah malam dimulai.',
        emotion: 'alert',
      },
    ],
  },
};

export const TTS_ENGINES_REGISTRY: TTSEngineInfo[] = [
  {
    id: 'local_mms_vits_onnx',
    name: 'Local Neural VITS Indonesian (Meta MMS-TTS ONNX + Character DSP)',
    providerType: 'local_neural',
    indonesianSupportLevel: 'native_neural',
    naturalnessRating: 4,
    licenseName: 'CC-BY-NC 4.0 (Meta MMS Weights)',
    commercialUseAllowed: false,
    requiresApiKey: false,
    configured: true,
    investigationSummary:
      'Runs 100% locally in Node.js via @huggingface/transformers ONNX Runtime (payam1394/traxlate-mms-tts-ind) with custom pitch/formant/emotion DSP for Jange & Bang Dullah. NOTE: Meta MMS weights are CC-BY-NC 4.0 (Non-Commercial); use for local storyboarding/preview and switch to Commercial API or human voice actor for monetized release.',
  },
  {
    id: 'edge_neural_id',
    name: 'Indonesian Neural Prosody Engine (id-ID-ArdiNeural SSML + DSP)',
    providerType: 'external_cloud',
    indonesianSupportLevel: 'native_neural',
    naturalnessRating: 5,
    licenseName: 'Preview / Requires Azure Commercial Key for Broadcast',
    commercialUseAllowed: false,
    requiresApiKey: false,
    configured: true,
    investigationSummary:
      'High-naturalness native Indonesian male neural voice (id-ID-ArdiNeural) with character pitch/rate/emotional prosody shaping. Free endpoint is for non-commercial prototyping only; commercial production requires an Azure Cognitive Services Speech commercial subscription.',
  },
  {
    id: 'openai_external',
    name: 'OpenAI Audio TTS (gpt-4o-mini-tts / tts-1-hd — External Commercial API)',
    providerType: 'external_cloud',
    indonesianSupportLevel: 'native_neural',
    naturalnessRating: 5,
    licenseName: 'OpenAI Commercial Terms of Use (Commercial Safe)',
    commercialUseAllowed: true,
    requiresApiKey: true,
    configured: false,
    investigationSummary:
      'Full commercial broadcast rights when used with OPENAI_API_KEY. Supports expressive Indonesian dialogue instructions (sleepy Gen Z, Jawa Serang inflection, whispering, scared).',
  },
  {
    id: 'elevenlabs_external',
    name: 'ElevenLabs Multilingual v2 (External Commercial API)',
    providerType: 'external_cloud',
    indonesianSupportLevel: 'native_neural',
    naturalnessRating: 5,
    licenseName: 'ElevenLabs Commercial License (Creator/Pro Tier)',
    commercialUseAllowed: true,
    requiresApiKey: true,
    configured: false,
    investigationSummary:
      'Full commercial rights on paid plans via ELEVENLABS_API_KEY. Supports native Indonesian pronunciation and fine-grained stability/style exaggeration.',
  },
  {
    id: 'local_klatt_dsp',
    name: 'Local Klatt Acoustic Formant Synthesizer (Offline CC0 Fallback)',
    providerType: 'local_dsp',
    indonesianSupportLevel: 'phonetic_dsp',
    naturalnessRating: 2,
    licenseName: 'CC0 / MIT In-House Mathematical Synthesis (Commercial Safe)',
    commercialUseAllowed: true,
    requiresApiKey: false,
    configured: true,
    investigationSummary:
      '100% offline mathematical formant synthesizer with zero third-party model weights. Fully commercial-safe animatic timing fallback.',
  },
];

export interface RejectedOrAuditedModelInfo {
  modelName: string;
  indonesianSupport: string;
  license: string;
  commercialAllowed: boolean;
  verdict: 'REJECTED_NO_INDONESIAN' | 'REJECTED_QUALITY_AND_LICENSE' | 'REJECTED_NON_COMMERCIAL_CPML' | 'INCLUDED_LOCAL_PREVIEW';
  technicalNotes: string;
}

export const TTS_MODEL_AUDIT_LOG: RejectedOrAuditedModelInfo[] = [
  {
    modelName: 'Kokoro-82M (hexgrad/Kokoro-82M)',
    indonesianSupport: 'Unsupported (EN, JA, ZH, FR, ES, IT, PT, HI only)',
    license: 'Apache 2.0',
    commercialAllowed: true,
    verdict: 'REJECTED_NO_INDONESIAN',
    technicalNotes:
      'Verified before installation: Kokoro-82M v1.0 phoneme vocabulary and G2P pipeline do not support Bahasa Indonesia (id-ID). Not installed.',
  },
  {
    modelName: 'Piper TTS (rhasspy/piper-voices — id_ID-news_tts-medium)',
    indonesianSupport: 'Single monotonic newsreader voice fine-tuned from US English Lessac',
    license: 'Engine MIT / Voice dataset derived from Kaggle URL with unverified commercial rights',
    commercialAllowed: false,
    verdict: 'REJECTED_QUALITY_AND_LICENSE',
    technicalNotes:
      'Verified HuggingFace MODEL_CARD: Only 1 flat speaker fine-tuned from English Lessac; lacks expressive character prosody for Jange/Bang Dullah and dataset license is unverified.',
  },
  {
    modelName: 'Coqui XTTS-v2',
    indonesianSupport: 'Multilingual zero-shot',
    license: 'Coqui Public Model License (CPML — Strictly Non-Commercial)',
    commercialAllowed: false,
    verdict: 'REJECTED_NON_COMMERCIAL_CPML',
    technicalNotes:
      'CPML strictly forbids commercial use and Coqui has shut down commercial licensing.',
  },
  {
    modelName: 'Meta MMS-TTS Indonesian (facebook/mms-tts-ind ONNX)',
    indonesianSupport: 'Native Indonesian VITS neural acoustic model',
    license: 'CC-BY-NC 4.0 (Non-Commercial)',
    commercialAllowed: false,
    verdict: 'INCLUDED_LOCAL_PREVIEW',
    technicalNotes:
      'Included as local offline neural VITS engine with custom Character Vocal Tract & Emotion DSP. Clearly flagged in Commercial Safety gate as Non-Commercial Preview until replaced by Commercial API or human voice recording.',
  },
];

