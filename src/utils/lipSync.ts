import { DialogueLine, PhonemeCue, VisemeCode } from '../types/animation';

/**
 * Maps Indonesian vowels/consonant clusters to standard 2D animation viseme codes:
 * - AA: 'a' (wide open jaw)
 * - EE: 'e', 'i', 'y' (wide corners, teeth visible)
 * - OH: 'o' (rounded open mouth)
 * - OO: 'u', 'w' (tight pursed lips)
 * - FV: 's', 't', 'k', 'n', 'r', 'l', 'ng', 'ny', 'c', 'j', 'd', 'g' (consonant articulation)
 * - REST: 'm', 'b', 'p', punctuation pauses
 */
export function generateIndonesianPhonemes(text: string, totalDuration: number): PhonemeCue[] {
  const clean = text.trim();
  if (!clean || totalDuration <= 0) {
    return [{ offset: 0, duration: Math.max(0.1, totalDuration), viseme: 'REST', syllable: '-' }];
  }

  // Tokenize into words and punctuation pauses
  const rawTokens = clean.match(/[A-Za-z0-9]+|[,.:;?!]+/g) || [clean];
  const segments: { syllable: string; viseme: VisemeCode; weight: number }[] = [];

  for (const token of rawTokens) {
    if (/^[,.:;?!]+$/.test(token)) {
      segments.push({
        syllable: token,
        viseme: 'REST',
        weight: token.includes('.') || token.includes(':') || token.includes('?') ? 1.4 : 0.9,
      });
      continue;
    }

    // Break Indonesian word into approximate CV/CVC syllables
    const lower = token.toLowerCase();
    const syllables = lower.match(/[^aiueo]*[aiueo]+(?:ng|ny|[bcdfghjklmnpqrstvwxyz])?|[^aiueo]+/g) || [lower];

    for (const syl of syllables) {
      // If syllable starts with bilabial (m, b, p), add brief closed-lip onset
      if (/^[mbp]/.test(syl) && syl.length > 1) {
        segments.push({
          syllable: syl[0],
          viseme: 'REST',
          weight: 0.35,
        });
      }

      // Determine core vowel viseme
      let vowelViseme: VisemeCode = 'FV';
      if (syl.includes('a')) {
        vowelViseme = 'AA';
      } else if (syl.includes('o')) {
        vowelViseme = 'OH';
      } else if (syl.includes('u')) {
        vowelViseme = 'OO';
      } else if (syl.includes('e') || syl.includes('i')) {
        vowelViseme = 'EE';
      }

      segments.push({
        syllable: syl,
        viseme: vowelViseme,
        weight: 1.0,
      });

      // Add brief consonant closure at end of syllable if closed
      if (/[mbp]$/.test(syl)) {
        segments.push({
          syllable: syl.slice(-1),
          viseme: 'REST',
          weight: 0.35,
        });
      } else if (/(ng|k|t|s|r|n|l)$/.test(syl)) {
        segments.push({
          syllable: syl.slice(-1),
          viseme: 'FV',
          weight: 0.4,
        });
      }
    }
  }

  // Add subtle rest at the very end so mouth closes cleanly
  segments.push({ syllable: 'end', viseme: 'REST', weight: 0.45 });

  const totalWeight = segments.reduce((acc, s) => acc + s.weight, 0);
  let cursor = 0;

  return segments.map((seg) => {
    const dur = Number(((seg.weight / totalWeight) * totalDuration).toFixed(3));
    const cue: PhonemeCue = {
      offset: Number(cursor.toFixed(3)),
      duration: Math.max(0.04, dur),
      viseme: seg.viseme,
      syllable: seg.syllable,
    };
    cursor += dur;
    return cue;
  });
}

/**
 * Resolves the active VisemeCode and jaw openness factor (0..1) for a character at a given timestamp.
 * Uses real audio waveform RMS `energy` when present on PhonemeCue!
 */
export function resolveCharacterLipSync(
  characterId: string,
  timeInSeconds: number,
  dialogueList: DialogueLine[],
  baseEmotion?: string
): {
  isSpeaking: boolean;
  viseme: VisemeCode;
  openness: number;
  activeDialogue: DialogueLine | null;
  activeSyllable: string;
} {
  const activeLine = dialogueList.find(
    (d) =>
      d.speakerId === characterId &&
      timeInSeconds >= d.startTime &&
      timeInSeconds <= d.startTime + d.duration
  );

  if (!activeLine) {
    if (baseEmotion === 'shocked' || baseEmotion === 'scared' || baseEmotion === 'surprised') {
      return {
        isSpeaking: false,
        viseme: 'SHOCK',
        openness: baseEmotion === 'surprised' ? 0.75 : 0.85,
        activeDialogue: null,
        activeSyllable: '',
      };
    }
    return {
      isSpeaking: false,
      viseme: 'REST',
      openness: 0,
      activeDialogue: null,
      activeSyllable: '',
    };
  }

  const relativeTime = timeInSeconds - activeLine.startTime;
  const cues =
    activeLine.phonemes && activeLine.phonemes.length > 0
      ? activeLine.phonemes
      : generateIndonesianPhonemes(activeLine.text, activeLine.duration);

  const currentCue =
    cues.find((c) => relativeTime >= c.offset && relativeTime < c.offset + c.duration) ||
    cues[cues.length - 1];

  // Add smooth attack/decay envelope within the phoneme cue so jaw doesn't snap robotically
  const localProgress = currentCue
    ? Math.min(1, Math.max(0, (relativeTime - currentCue.offset) / Math.max(0.04, currentCue.duration)))
    : 0;
  const envelope = Math.sin(localProgress * Math.PI);

  const opennessMap: Record<VisemeCode, number> = {
    REST: 0.05,
    FV: 0.3,
    EE: 0.55,
    OO: 0.5,
    OH: 0.8,
    AA: 1.0,
    SHOCK: 0.9,
  };

  const targetViseme = currentCue?.viseme ?? 'REST';
  const energyBoost =
    currentCue?.energy !== undefined ? 0.55 + currentCue.energy * 0.65 : 1.0;
  const whisperScale = activeLine.emotion === 'whispering' ? 0.55 : 1.0;

  const openness = Number(
    Math.min(
      1,
      opennessMap[targetViseme] * (0.65 + 0.35 * envelope) * energyBoost * whisperScale
    ).toFixed(2)
  );

  return {
    isSpeaking: true,
    viseme: targetViseme,
    openness,
    activeDialogue: activeLine,
    activeSyllable: currentCue?.syllable ?? '',
  };
}

/**
 * Future-ready adapter: Converts external Rhubarb Lip Sync JSON cues (A-H, X)
 * into Otak Konslet Studio PhonemeCue[] format.
 */
export function convertRhubarbCuesToPhonemes(
  rhubarbMouthCues: Array<{ start: number; end: number; value: string }>
): PhonemeCue[] {
  const rhubarbMap: Record<string, VisemeCode> = {
    A: 'REST',
    B: 'FV',
    C: 'EE',
    D: 'AA',
    E: 'OH',
    F: 'OO',
    G: 'FV',
    H: 'FV',
    X: 'REST',
  };

  return rhubarbMouthCues.map((cue) => ({
    offset: Number(cue.start.toFixed(3)),
    duration: Number(Math.max(0.04, cue.end - cue.start).toFixed(3)),
    viseme: rhubarbMap[cue.value] || 'REST',
    syllable: `rhubarb:${cue.value}`,
  }));
}
