import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_EPISODE } from '../src/data/defaultEpisode';
import { PhonemeCue } from '../src/types/animation';

const SAMPLE_RATE = 44100;

export function writeWavFile(filePath: string, samples: Float32Array) {
  const numSamples = samples.length;
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = numSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = mono)
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    buffer.writeInt16LE(Math.round(int16), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

/**
 * Generates formant-like vocal speech audio synced to the exact PhonemeCue array
 * so placeholder dialogue lines sound expressive and match mouth movements.
 */
export function synthesizeSpeechFromPhonemes(
  durationSec: number,
  phonemes: PhonemeCue[],
  basePitchHz: number,
  isRobotic: boolean
): Float32Array {
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);

  const formantMap: Record<string, [number, number]> = {
    AA: [750, 1200],
    EE: [320, 2200],
    OH: [450, 850],
    OO: [300, 700],
    FV: [400, 1600],
    REST: [200, 500],
    SHOCK: [700, 1400],
  };

  let phaseFund = 0;
  let phaseF1 = 0;
  let phaseF2 = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const cue = phonemes.find((c) => t >= c.offset && t < c.offset + c.duration);

    if (!cue || cue.viseme === 'REST') {
      continue;
    }

    const localT = (t - cue.offset) / Math.max(0.04, cue.duration);
    const syllableEnv = Math.sin(Math.min(1, Math.max(0, localT)) * Math.PI);

    // Intonation contour
    const pitchMod = isRobotic
      ? (Math.floor(t * 9) % 2 === 0 ? 1.0 : 1.06)
      : 1 + 0.08 * Math.sin(t * 6.5) + 0.04 * Math.cos(t * 13);

    const f0 = basePitchHz * pitchMod;
    const [f1, f2] = formantMap[cue.viseme] || [500, 1200];

    phaseFund += (2 * Math.PI * f0) / SAMPLE_RATE;
    phaseF1 += (2 * Math.PI * f1) / SAMPLE_RATE;
    phaseF2 += (2 * Math.PI * f2) / SAMPLE_RATE;

    const fundWave = isRobotic
      ? Math.sign(Math.sin(phaseFund)) * 0.45
      : (Math.sin(phaseFund) + 0.5 * Math.sin(phaseFund * 2) + 0.25 * Math.sin(phaseFund * 3)) * 0.4;

    const formantWave = 0.35 * Math.sin(phaseF1) + 0.2 * Math.sin(phaseF2);
    out[i] = (fundWave + formantWave) * syllableEnv * 0.48;
  }

  return out;
}

function generateAmbience(durationSec: number): Float32Array {
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    // 100Hz / 50Hz Indonesian fluorescent neon ballast hum
    const neonHum =
      0.04 * Math.sin(2 * Math.PI * 50 * t) +
      0.025 * Math.sin(2 * Math.PI * 100 * t) +
      0.012 * Math.sin(2 * Math.PI * 200 * t);

    // Subtle night cricket chirp pulse in Ciruas exterior (stronger 0-6s)
    const cricketGate = Math.sin(2 * Math.PI * 3.2 * t) > 0.45 ? 1 : 0;
    const pulseMod = Math.sin(2 * Math.PI * 28 * t) > 0 ? 1 : 0;
    const exteriorWeight = t < 6 ? 0.05 : 0.015;
    const cricket = exteriorWeight * cricketGate * pulseMod * Math.sin(2 * Math.PI * 4150 * t);

    out[i] = neonHum + cricket;
  }

  return out;
}

function generatePosActivationSfx(durationSec: number): Float32Array {
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Double high-tech POS barcode beep + low ominous sub drop
    let signal = 0;
    if (t < 0.16) {
      signal += 0.55 * Math.sin(2 * Math.PI * 1850 * t);
    } else if (t >= 0.22 && t < 0.42) {
      signal += 0.6 * Math.sin(2 * Math.PI * 2480 * t);
    } else if (t >= 0.45) {
      const env = Math.max(0, 1 - (t - 0.45) / 0.35);
      signal += 0.5 * env * Math.sin(2 * Math.PI * 110 * t);
    }
    out[i] = signal;
  }

  return out;
}

export function ensureDemoAssets() {
  const publicAudioDir = path.resolve(process.cwd(), 'public', 'audio');
  fs.mkdirSync(publicAudioDir, { recursive: true });

  // 1. Ambience
  const ambPath = path.join(publicAudioDir, 'ambience_ciruas_night.wav');
  if (!fs.existsSync(ambPath)) {
    writeWavFile(ambPath, generateAmbience(18.8));
  }

  // 2. Dialogue 1: Jange (only create fallback if not already generated by TTS)
  const dlg1Path = path.join(publicAudioDir, 'dlg_01_jange.wav');
  if (!fs.existsSync(dlg1Path)) {
    const dlg1 = DEFAULT_EPISODE.dialogue[0];
    writeWavFile(
      dlg1Path,
      synthesizeSpeechFromPhonemes(dlg1.duration, dlg1.phonemes || [], 148, false)
    );
  }

  // 3. Dialogue 2: Bang Dullah
  const dlg2Path = path.join(publicAudioDir, 'dlg_02_dullah.wav');
  if (!fs.existsSync(dlg2Path)) {
    const dlg2 = DEFAULT_EPISODE.dialogue[1];
    writeWavFile(
      dlg2Path,
      synthesizeSpeechFromPhonemes(dlg2.duration, dlg2.phonemes || [], 112, false)
    );
  }

  // 4. POS Activation SFX
  const sfxPath = path.join(publicAudioDir, 'sfx_pos_activate.wav');
  if (!fs.existsSync(sfxPath)) {
    writeWavFile(sfxPath, generatePosActivationSfx(0.8));
  }

  // 5. Dialogue 3: Cashier Machine
  const dlg3Path = path.join(publicAudioDir, 'dlg_03_machine.wav');
  if (!fs.existsSync(dlg3Path)) {
    const dlg3 = DEFAULT_EPISODE.dialogue[2];
    writeWavFile(
      dlg3Path,
      synthesizeSpeechFromPhonemes(dlg3.duration, dlg3.phonemes || [], 196, true)
    );
  }

  // 6. Save Episode JSON to data/episodes/ep01-minimarket-ciruas.json
  const episodesDir = path.resolve(process.cwd(), 'data', 'episodes');
  fs.mkdirSync(episodesDir, { recursive: true });
  const epPath = path.join(episodesDir, `${DEFAULT_EPISODE.id}.json`);
  if (!fs.existsSync(epPath)) {
    fs.writeFileSync(epPath, JSON.stringify(DEFAULT_EPISODE, null, 2), 'utf-8');
  }

  console.log('[Otak Konslet Studio] Demo audio stems and episode JSON verified.');
}

// Run directly if invoked as script
if (process.argv[1] && process.argv[1].includes('generate-demo-audio')) {
  ensureDemoAssets();
}

