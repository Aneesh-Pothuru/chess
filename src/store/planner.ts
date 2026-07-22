// Today's Training generator: turns the weakness profile into a concrete
// 20-40 minute session, following the improvement report's weekly structure.

import type { Profile, WeaknessKey } from './profile'

export interface SessionBlock {
  kind: 'puzzles' | 'opening' | 'endgame' | 'conversion' | 'calculation' | 'game'
  title: string
  detail: string
  /** Route within the app, e.g. 'puzzles' tab id. */
  route: string
  /** Extra routing hint (bucket name, opening id, drill stage...). */
  target?: string
  minutes: number
}

/** Map weaknesses to the puzzle buckets that train them. */
const WEAKNESS_BUCKETS: Partial<Record<WeaknessKey, string[]>> = {
  hangingPiece: ['hangingPiece'],
  fork: ['fork'],
  mateThreats: ['mateIn1', 'mateIn2', 'backRankMate'],
  f7f2: ['attackingF2F7'],
  conversion: ['mateIn1', 'mateIn2'],
  endgameTechnique: ['rookEndgame', 'pawnEndgame', 'queenEndgame'],
  openingD4: ['op:kingsIndian', 'op:london'],
  openingE4: ['op:caroKann'],
}

/** Deterministic-ish weighted pick of the day's puzzle buckets (all distinct). */
export function pickPuzzleBuckets(profile: Profile, count: number, rng: () => number = Math.random): string[] {
  const entries = Object.entries(WEAKNESS_BUCKETS) as [WeaknessKey, string[]][]
  // A bucket trained by several weaknesses sums their weights (more likely,
  // never duplicated).
  const weights = new Map<string, number>()
  for (const [key, buckets] of entries) {
    for (const bucket of buckets) {
      weights.set(bucket, (weights.get(bucket) ?? 0) + profile.weakness[key])
    }
  }
  const picked: string[] = []
  const pool = [...weights.entries()].map(([bucket, w]) => ({ bucket, w }))
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.w, 0)
    let r = rng() * total
    let idx = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w
      if (r <= 0) {
        idx = i
        break
      }
    }
    picked.push(pool[idx].bucket)
    pool.splice(idx, 1)
  }
  return picked
}

/** Day index drives the focus rotation (report: alternate conversion / opening weeks). */
export function generateToday(profile: Profile, now: Date = new Date()): SessionBlock[] {
  const blocks: SessionBlock[] = []
  const buckets = pickPuzzleBuckets(profile, 3, seededRng(dayKey(now)))

  blocks.push({
    kind: 'puzzles',
    title: 'Warm-up: targeted puzzles',
    detail: `12 puzzles from your weakness rotation: ${buckets.join(', ')}. Solve to certainty — no guessing.`,
    route: 'puzzles',
    target: buckets[0],
    minutes: 10,
  })

  const weekIsConversion = weekIndex(now) % 2 === 0 ? profile.focusWeek === 'conversion' : profile.focusWeek !== 'conversion'
  if (weekIsConversion) {
    blocks.push({
      kind: 'conversion',
      title: 'Focus: convert a won game',
      detail: 'One conversion drill to mate + one mate drill under the move target. Trading pieces is the win condition.',
      route: 'endgame',
      target: 'conversion',
      minutes: 12,
    })
  } else {
    const target = profile.weakness.openingD4 >= profile.weakness.openingE4 ? 'kings-indian' : 'caro-kann'
    blocks.push({
      kind: 'opening',
      title: 'Focus: opening patch',
      detail:
        target === 'kings-indian'
          ? "Drill the King's Indian vs 1.d4 — your 26% score there is the single biggest fixable number."
          : 'Drill the Caro-Kann lines due for review.',
      route: 'openings',
      target,
      minutes: 12,
    })
  }

  const visionBias = Math.max(profile.weakness.boardVision, profile.weakness.coordinates)
  blocks.push({
    kind: 'calculation',
    title: 'Bridge: calculation & vision reps',
    detail:
      visionBias >= 0.65
        ? '5 visualization drills + a board-math set (capture counting) or a coordinate sprint. The muscles that move your 1427 puzzle brain into your 713 game brain.'
        : '5 visualization drills — go Deep (4-6 plies) once Short lines feel easy.',
    route: 'calculation',
    minutes: 8,
  })

  blocks.push({
    kind: 'game',
    title: 'Coached game',
    detail: 'One rapid game vs the sparring bot, strict mode on: threat-check before each move, 10-second floor, castle by 8.',
    route: 'play',
    minutes: 15,
  })

  return blocks
}

function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/** Continuous epoch-based week index — parity alternates cleanly across year boundaries. */
function weekIndex(d: Date): number {
  const local = d.getTime() - d.getTimezoneOffset() * 60000
  return Math.floor(local / (7 * 86400_000))
}

/**
 * Tiny deterministic PRNG so the daily plan is stable within a day. Hashed
 * counter (splitmix-style) — consecutive integer seeds must decorrelate, or
 * the "daily" rotation freezes on the same buckets for weeks.
 */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x9e3779b9) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad)
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97)
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296
  }
}

/** Weekly metrics vs the report's targets, from coached + imported games. */
export interface MetricsSummary {
  blundersPerGame: number | null
  castleBy8Rate: number | null
  vsD4Score: number | null
  gamesTracked: number
}

export function computeMetrics(profile: Profile): MetricsSummary {
  const games = profile.games
  const imported = profile.imported
  const blunders =
    games.length > 0 ? games.reduce((s, g) => s + g.blunders, 0) / games.length : null
  const castleSample = [...games.map((g) => g.castleMove), ...imported.map((g) => g.castleMove)]
  const castleBy8 =
    castleSample.length > 0
      ? castleSample.filter((m) => m !== null && m <= 8).length / castleSample.length
      : null
  const d4 = imported.filter((g) => g.color === 'b' && g.firstWhiteMove === 'd4')
  const vsD4 =
    d4.length > 0
      ? d4.reduce((s, g) => s + (g.result === 'win' ? 1 : g.result === 'draw' ? 0.5 : 0), 0) / d4.length
      : null
  return {
    blundersPerGame: blunders,
    castleBy8Rate: castleBy8,
    vsD4Score: vsD4,
    gamesTracked: games.length + imported.length,
  }
}
