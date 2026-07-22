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
