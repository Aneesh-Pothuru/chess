// Spaced-repetition scheduler using the industry-standard interval ladder
// (Chessable/chess.com MoveTrainer defaults): 4h, 1d, 3d, 1w, 2w, 1mo, 3mo, 6mo.
// Failure resets to the bottom of the ladder.

export const SRS_INTERVALS_MS: number[] = [
  4 * 3600_000,
  24 * 3600_000,
  3 * 24 * 3600_000,
  7 * 24 * 3600_000,
  14 * 24 * 3600_000,
  30 * 24 * 3600_000,
  90 * 24 * 3600_000,
  180 * 24 * 3600_000,
]

export interface SrsState {
  level: number // index into SRS_INTERVALS_MS
  dueAt: number // epoch ms
  passes: number
  fails: number
  lastAt: number
}

export function newSrsState(now: number = Date.now()): SrsState {
  return { level: 0, dueAt: now, passes: 0, fails: 0, lastAt: 0 }
}

export function recordResult(
  state: SrsState,
  pass: boolean,
  now: number = Date.now(),
  intervals: number[] = SRS_INTERVALS_MS,
): SrsState {
  const level = pass ? Math.min(state.level + 1, intervals.length - 1) : 0
  return {
    level,
    // Failed items come back immediately within the session; passed items wait
    // out their ladder interval.
    dueAt: pass ? now + intervals[level] : now,
    passes: state.passes + (pass ? 1 : 0),
    fails: state.fails + (pass ? 0 : 1),
    lastAt: now,
  }
}

export function isDue(state: SrsState | undefined, now: number = Date.now()): boolean {
  return !state || state.dueAt <= now
}

/** Sort keys by urgency: overdue reviews first (oldest due first), then never-seen. */
export function dueKeys(states: Record<string, SrsState>, keys: string[], now: number = Date.now()): string[] {
  return keys
    .filter((k) => isDue(states[k], now))
    .sort((a, b) => (states[a]?.dueAt ?? Infinity) - (states[b]?.dueAt ?? Infinity))
}
