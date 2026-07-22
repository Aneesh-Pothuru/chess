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
