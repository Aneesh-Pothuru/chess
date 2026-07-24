// Adaptive puzzle difficulty: each bucket tracks a "working rating" that
// climbs as you solve and drops as you miss, and unseen puzzles are served
// from closest to that rating — so sets get harder as you improve instead of
// marching easiest-first through the pool.

import type { RawPuzzle } from './calculation'

export const LADDER_START = 550
export const LADDER_MIN = 400
export const LADDER_MAX = 1500

/** Elo-ladder update: solving pushes you up, missing pulls you down faster. */
export function nextWorkingRating(current: number | undefined, solved: boolean): number {
  const base = current ?? LADDER_START
  const next = base + (solved ? 18 : -25)
  return Math.max(LADDER_MIN, Math.min(LADDER_MAX, next))
}

/**
 * Order the unseen pool for a session: nearest to the working rating first,
 * with a slight upward pull so ties break toward harder puzzles.
 */
export function orderUnseenByLadder(pool: RawPuzzle[], working: number): RawPuzzle[] {
  return [...pool].sort((a, b) => {
    const da = Math.abs(a.rating - working) + (a.rating < working ? 8 : 0)
    const db = Math.abs(b.rating - working) + (b.rating < working ? 8 : 0)
    return da - db
  })
}

/**
 * Puzzle review schedule: first successful review waits a full day, not the
 * 4-hour opening-trainer default — same-day repeats made sessions feel like
 * replaying the identical set.
 */
export const PUZZLE_SRS_INTERVALS_MS: number[] = [
  // Index 0 is only reached on failure, which reschedules immediately — the
  // first PASSED review lands on index 1: one full day out.
  24 * 3600_000,
  24 * 3600_000,
  3 * 24 * 3600_000,
  7 * 24 * 3600_000,
  14 * 24 * 3600_000,
  30 * 24 * 3600_000,
  90 * 24 * 3600_000,
  180 * 24 * 3600_000,
]

/** At most this many due reviews per session — the rest is always new material. */
export const MAX_REVIEWS_PER_SESSION = 4
export const SESSION_SIZE = 12

/**
 * Build a session queue: a few due reviews for retention, then unseen puzzles
 * served nearest the working rating so difficulty climbs with the ladder.
 */
export function buildPuzzleQueue(
  pool: RawPuzzle[],
  isSeen: (p: RawPuzzle) => boolean,
  isDuePuzzle: (p: RawPuzzle) => boolean,
  working: number,
): RawPuzzle[] {
  const due = pool.filter((p) => isSeen(p) && isDuePuzzle(p)).slice(0, MAX_REVIEWS_PER_SESSION)
  const unseen = orderUnseenByLadder(pool.filter((p) => !isSeen(p)), working)
  return [...due, ...unseen].slice(0, SESSION_SIZE)
}
