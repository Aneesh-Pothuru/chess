import { describe, expect, it } from 'vitest'
import { LADDER_MAX, LADDER_MIN, LADDER_START, nextWorkingRating, orderUnseenByLadder } from '../src/chess/puzzleLadder'
import { PUZZLE_BUCKETS } from '../src/data/puzzles'

describe('puzzle difficulty ladder', () => {
  it('climbs on solves and falls faster on misses', () => {
    let r = LADDER_START
    for (let i = 0; i < 10; i++) r = nextWorkingRating(r, true)
    expect(r).toBe(LADDER_START + 180)
    expect(nextWorkingRating(r, false)).toBe(r - 25)
  })

  it('clamps to the ladder bounds', () => {
    expect(nextWorkingRating(LADDER_MAX - 5, true)).toBe(LADDER_MAX)
    expect(nextWorkingRating(LADDER_MIN + 5, false)).toBe(LADDER_MIN)
  })

  it('starts at the ladder start when no history exists', () => {
    expect(nextWorkingRating(undefined, true)).toBe(LADDER_START + 18)
  })

  it('serves puzzles nearest the working rating, preferring harder on ties', () => {
    const pool = PUZZLE_BUCKETS['fork'].slice(0, 100)
    const low = orderUnseenByLadder(pool, 450)
    const high = orderUnseenByLadder(pool, 1100)
    // Average rating of the first 10 served must track the working rating.
    const avg = (xs: typeof pool) => xs.slice(0, 10).reduce((s, p) => s + p.rating, 0) / 10
    expect(avg(low)).toBeLessThan(avg(high))
    expect(Math.abs(avg(high) - 1100)).toBeLessThan(200)
  })
})

import {
  MAX_REVIEWS_PER_SESSION,
  PUZZLE_SRS_INTERVALS_MS,
  SESSION_SIZE,
  buildPuzzleQueue,
} from '../src/chess/puzzleLadder'
import { newSrsState, recordResult } from '../src/store/srs'
import type { RawPuzzle } from '../src/chess/calculation'

const mk = (id: string, rating: number): RawPuzzle => ({ id, fen: '', moves: '', rating, themes: '' })

describe('buildPuzzleQueue', () => {
  it('caps due reviews so a backlog cannot crowd out new puzzles', () => {
    const seen = Array.from({ length: 30 }, (_, i) => mk(`seen${i}`, 450))
    const fresh = Array.from({ length: 30 }, (_, i) => mk(`new${i}`, 700 + i))
    const queue = buildPuzzleQueue([...seen, ...fresh], (p) => p.id.startsWith('seen'), () => true, 700)
    expect(queue).toHaveLength(SESSION_SIZE)
    expect(queue.filter((p) => p.id.startsWith('seen'))).toHaveLength(MAX_REVIEWS_PER_SESSION)
    expect(queue.filter((p) => p.id.startsWith('new'))).toHaveLength(SESSION_SIZE - MAX_REVIEWS_PER_SESSION)
  })

  it('fills entirely with unseen material when nothing is due', () => {
    const pool = Array.from({ length: 20 }, (_, i) => mk(`p${i}`, 400 + i * 50))
    const queue = buildPuzzleQueue(pool, () => false, () => false, 550)
    expect(queue).toHaveLength(SESSION_SIZE)
  })

  it('unseen portion is served nearest the working rating', () => {
    const pool = [mk('low', 500), mk('near', 890), mk('above', 910), mk('high', 1300)]
    const queue = buildPuzzleQueue(pool, () => false, () => false, 900)
    expect(queue.map((p) => p.id)).toEqual(['above', 'near', 'high', 'low'])
  })
})

describe('puzzle SRS intervals', () => {
  it('first successful review waits a full day, not four hours', () => {
    const now = 1_000_000
    const s = recordResult(newSrsState(now), true, now, PUZZLE_SRS_INTERVALS_MS)
    expect(s.dueAt - now).toBe(24 * 3600_000)
  })

  it('failing still brings the puzzle back immediately within the session', () => {
    const now = 1_000_000
    const s = recordResult(newSrsState(now), false, now, PUZZLE_SRS_INTERVALS_MS)
    expect(s.dueAt).toBe(now)
  })
})
