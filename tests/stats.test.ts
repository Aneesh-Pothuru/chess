import { describe, expect, it } from 'vitest'
import { areaTrends, ratingSeries, windowMetrics } from '../src/store/stats'
import { DEFAULT_WEAKNESS, type Profile } from '../src/store/profile'

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    version: 1,
    createdAt: 0,
    settings: { username: 'pots1125', opponentPresetId: 'sparring', strictMode: true, tenSecondFloor: true },
    weakness: { ...DEFAULT_WEAKNESS },
    srs: {},
    games: [],
    imported: [],
    drills: {},
    puzzleStats: {},
    streak: { lastDay: '', days: 0 },
    focusWeek: 'conversion',
    ...overrides,
  }
}

const day = 86400_000

function importedGame(i: number, over: Record<string, unknown> = {}) {
  return {
    url: `u${i}`,
    at: i * day,
    color: 'b' as const,
    result: 'loss' as const,
    opening: 'x',
    firstWhiteMove: 'd4',
    castleMove: null,
    scanned: true,
    blunders: 3,
    motifs: ['hangingPiece'],
    myRating: 700 + i,
    ...over,
  }
}

describe('windowMetrics', () => {
  it('computes rates over the most recent window only', () => {
    // 60 old bad games, then 10 recent good ones — a 10-window sees only good.
    const imported = [
      ...Array.from({ length: 60 }, (_, i) => importedGame(i)),
      ...Array.from({ length: 10 }, (_, i) =>
        importedGame(100 + i, { result: 'win', castleMove: 6, blunders: 0, motifs: [] }),
      ),
    ]
    const m = windowMetrics(makeProfile({ imported }), 10)
    expect(m.games).toBe(10)
    expect(m.castleBy8).toBe(1)
    expect(m.vsD4).toBe(1)
    expect(m.blundersPerGame).toBe(0)
    expect(m.hangingRate).toBe(0)
  })

  it('handles empty profiles without dividing by zero', () => {
    const m = windowMetrics(makeProfile({}), 50)
    expect(m.games).toBe(0)
    expect(m.castleBy8).toBeNull()
    expect(m.vsD4).toBeNull()
  })
})

describe('areaTrends', () => {
  it('marks castling as improving when the recent half is better', () => {
    const imported = [
      ...Array.from({ length: 25 }, (_, i) => importedGame(i, { castleMove: null })),
      ...Array.from({ length: 25 }, (_, i) => importedGame(100 + i, { castleMove: 6 })),
    ]
    const trends = areaTrends(makeProfile({ imported }), 50)
    const castling = trends.find((t) => t.key === 'castling')!
    expect(castling.now).toBe('100%')
    expect(castling.improving).toBe(true)
  })
})

describe('ratingSeries', () => {
  it('merges per-game ratings and samples in time order', () => {
    const profile = makeProfile({
      imported: [importedGame(1), importedGame(5)],
      ratingHistory: [{ at: 10 * day, rating: 750, best: 841 }],
    })
    const s = ratingSeries(profile)
    expect(s.map((x) => x.rating)).toEqual([701, 705, 750])
  })
})
