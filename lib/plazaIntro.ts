/**
 * The intro video at the top of the Plaza (2026-11-26): what each stretch of
 * assets/video/plaza-intro.mp4 shows, so the line under the headline can follow
 * it. The video has no words in it; the app draws them, so every language gets
 * its own.
 */

export type PlazaIntroCueKey = 'cue_life' | 'cue_discover' | 'cue_feedback' | 'cue_chat' | 'cue_account';

// The video is cut to its music: each part is three bars of 2.1424 s.
const PART = 3 * 2.1424;

/** Seconds into the video at which each line starts. The last line stays through the closing chord. */
export const PLAZA_INTRO_CUES: readonly { from: number; key: PlazaIntroCueKey }[] = [
  { from: 0, key: 'cue_life' },
  { from: PART, key: 'cue_discover' },
  { from: 2 * PART, key: 'cue_feedback' },
  { from: 3 * PART, key: 'cue_chat' },
  { from: 4 * PART, key: 'cue_account' },
];

export const PLAZA_INTRO_CUE_KEYS: readonly PlazaIntroCueKey[] = [
  'cue_life',
  'cue_discover',
  'cue_feedback',
  'cue_chat',
  'cue_account',
];

/** Width over height of the video frame. */
export const PLAZA_INTRO_ASPECT = 16 / 10;

export function plazaIntroCue(seconds: number): PlazaIntroCueKey {
  let current: PlazaIntroCueKey = PLAZA_INTRO_CUES[0].key;
  if (!Number.isFinite(seconds)) return current;
  for (const cue of PLAZA_INTRO_CUES) {
    if (seconds >= cue.from) current = cue.key;
  }
  return current;
}

/**
 * Which face the changing line is set in. Kalam only has Latin letters and the
 * Chinese hand face only the common simplified characters, so anything else
 * gets the system face at regular weight: a missing glyph would otherwise fall
 * back to a bold face that looks like the headline.
 */
export function plazaIntroLineFace(langCode: string, lines: readonly string[]): 'kalam' | 'kuaile' | 'system' {
  if (langCode === 'zh') return 'kuaile';
  const latinOnly = lines.every((line) => [...line].every((ch) => ch.codePointAt(0)! <= 0x024f || ch === '’'));
  return latinOnly ? 'kalam' : 'system';
}
