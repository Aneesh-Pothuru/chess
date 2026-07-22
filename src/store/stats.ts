// Live, windowed statistics. Philosophy: "current you" = a rolling window of
// the most recent games (default 50); the July 2026 audit numbers are kept as
// a dated BASELINE for comparison, never presented as current.

import { fetchJson } from '../lib/chesscom'
import { getProfile, update, type GameReport, type ImportedGame, type Profile } from './profile'

export interface RatingSample {
  at: number
  rating: number
  best?: number
  tactics?: number
}

export const ROLLING_WINDOW = 50
const SAMPLE_TTL_MS = 6 * 3600_000

// ------------------------------------------------------------ live ratings

export function latestRatings(profile: Profile): RatingSample | null {
  const h = profile.ratingHistory ?? []
  return h.length > 0 ? h[h.length - 1] : null
}

/** Fetch chess.com ratings at most once per 6h and append to the history. */
export async function sampleRatingsIfStale(): Promise<void> {
  const prof = getProfile()
  const last = latestRatings(prof)
  if (last && Date.now() - last.at < SAMPLE_TTL_MS) return
  try {
    const data = await fetchJson<{
      chess_rapid?: { last?: { rating?: number }; best?: { rating?: number } }
      tactics?: { highest?: { rating?: number } }
    }>(`https://api.chess.com/pub/player/${prof.settings.username.toLowerCase()}/stats`)
    const rating = data.chess_rapid?.last?.rating
    if (typeof rating !== 'number') return
    const sample: RatingSample = {
      at: Date.now(),
      rating,
      best: data.chess_rapid?.best?.rating,
      tactics: data.tactics?.highest?.rating,
    }
    update((p) => {
      p.ratingHistory = [...(p.ratingHistory ?? []), sample].slice(-300)
    })
  } catch {
    // Offline is fine; we keep the last sample.
  }
}

// ------------------------------------------------------------ rating series

/** Rating-over-time points for the trend chart: per-game ratings + samples. */
export function ratingSeries(profile: Profile): RatingSample[] {
  const fromGames: RatingSample[] = (profile.imported ?? [])
    .filter((g) => typeof g.myRating === 'number')
    .map((g) => ({ at: g.at, rating: g.myRating! }))
  const merged = [...fromGames, ...(profile.ratingHistory ?? [])].sort((a, b) => a.at - b.at)
  // Collapse near-duplicate timestamps (same hour) to the latest value.
  const out: RatingSample[] = []
  for (const s of merged) {
    const prev = out[out.length - 1]
    if (prev && s.at - prev.at < 3600_000) out[out.length - 1] = s
    else out.push(s)
  }
  return out
}

// ------------------------------------------------------------ rolling window

type AnyGame =
  | { kind: 'imported'; at: number; g: ImportedGame }
  | { kind: 'coached'; at: number; g: GameReport }

function recentGames(profile: Profile, window: number): AnyGame[] {
  const all: AnyGame[] = [
    ...(profile.imported ?? []).map((g) => ({ kind: 'imported' as const, at: g.at, g })),
    ...(profile.games ?? []).map((g) => ({ kind: 'coached' as const, at: g.at, g })),
  ]
  return all.sort((a, b) => b.at - a.at).slice(0, window)
}

export interface WindowMetrics {
  games: number
  record: string
  castleBy8: number | null
  vsD4: number | null
  blundersPerGame: number | null
  /** Share of SCANNED/coached games with a hanging-piece motif. */
  hangingRate: number | null
  /** Share of SCANNED/coached games where a mate-in-1 was allowed. */
  allowedMateRate: number | null
  /** Won-position conversion from coached games: converted / reached. */
  conversion: { converted: number; reached: number } | null
}

export function windowMetrics(profile: Profile, window = ROLLING_WINDOW): WindowMetrics {
  const games = recentGames(profile, window)
  const n = games.length
  let w = 0, l = 0, d = 0
  const castles: Array<number | null> = []
  const d4: Array<'win' | 'loss' | 'draw'> = []
  let blunderGames = 0, blunders = 0
  let motifGames = 0, hangs = 0, mates = 0
  let reached = 0, converted = 0
  for (const item of games) {
    const res = item.g.result
    if (res === 'win') w++
    else if (res === 'loss') l++
    else d++
    castles.push(item.g.castleMove)
    if (item.kind === 'imported') {
      const g = item.g
      if (g.color === 'b' && g.firstWhiteMove === 'd4') d4.push(g.result)
      if (g.scanned) {
        blunderGames++
        blunders += g.blunders
        motifGames++
        if (g.motifs.includes('hangingPiece')) hangs++
        if (g.motifs.includes('allowedMate') || g.motifs.includes('missedMateIn1')) mates++
      }
    } else {
      const g = item.g
      blunderGames++
      blunders += g.blunders
      motifGames++
      if (g.motifs.includes('hangingPiece')) hangs++
      if (g.motifs.includes('allowedMateIn1') || g.motifs.includes('missedMateIn1')) mates++
      if (g.wonGameConverted !== null) {
        reached++
        if (g.wonGameConverted) converted++
      }
    }
  }
  return {
    games: n,
    record: `${w}W-${l}L-${d}D`,
    castleBy8: castles.length > 0 ? castles.filter((m) => m !== null && m <= 8).length / castles.length : null,
    vsD4: d4.length > 0 ? d4.reduce((s, r) => s + (r === 'win' ? 1 : r === 'draw' ? 0.5 : 0), 0) / d4.length : null,
    blundersPerGame: blunderGames > 0 ? blunders / blunderGames : null,
    hangingRate: motifGames > 0 ? hangs / motifGames : null,
    allowedMateRate: motifGames > 0 ? mates / motifGames : null,
    conversion: reached > 0 ? { converted, reached } : null,
  }
}

// ------------------------------------------------------------ area trends

export interface AreaTrend {
  key: string
  label: string
  /** Formatted current value over the recent half-window. */
  now: string
  /** Direction: true = improving, false = slipping, null = not enough data. */
  improving: boolean | null
  detail: string
}

function pct(x: number | null): string {
  return x === null ? '—' : `${Math.round(x * 100)}%`
}

/** Compare the last half-window vs the half before it, per area. */
export function areaTrends(profile: Profile, window = ROLLING_WINDOW): AreaTrend[] {
  const half = Math.floor(window / 2)
  const nowM = windowMetrics(profile, half)
  const all = recentGames(profile, window)
  const prevProfile: Profile = {
    ...profile,
    imported: all.slice(half).filter((x) => x.kind === 'imported').map((x) => x.g as ImportedGame),
    games: all.slice(half).filter((x) => x.kind === 'coached').map((x) => x.g as GameReport),
  }
  const prevM = windowMetrics(prevProfile, half)

  const cmp = (
    now: number | null,
    prev: number | null,
    higherIsBetter: boolean,
    minDelta = 0.02,
  ): boolean | null => {
    if (now === null || prev === null) return null
    const delta = now - prev
    if (Math.abs(delta) < minDelta) return null
    return higherIsBetter ? delta > 0 : delta < 0
  }

  return [
    {
      key: 'castling',
      label: 'Castled by move 8',
      now: pct(nowM.castleBy8),
      improving: cmp(nowM.castleBy8, prevM.castleBy8, true),
      detail: `was ${pct(prevM.castleBy8)} in the previous stretch`,
    },
    {
      key: 'openingD4',
      label: 'Score vs 1.d4 as Black',
      now: pct(nowM.vsD4),
      improving: cmp(nowM.vsD4, prevM.vsD4, true, 0.05),
      detail: `was ${pct(prevM.vsD4)} before`,
    },
    {
      key: 'hangingPiece',
      label: 'Games with a hung piece',
      now: pct(nowM.hangingRate),
      improving: cmp(nowM.hangingRate, prevM.hangingRate, false),
      detail: `was ${pct(prevM.hangingRate)} before (lower is better)`,
    },
    {
      key: 'mateThreats',
      label: 'Games with a missed/allowed mate',
      now: pct(nowM.allowedMateRate),
      improving: cmp(nowM.allowedMateRate, prevM.allowedMateRate, false),
      detail: `was ${pct(prevM.allowedMateRate)} before (lower is better)`,
    },
    {
      key: 'conversion',
      label: 'Won positions converted',
      now: nowM.conversion ? `${nowM.conversion.converted}/${nowM.conversion.reached}` : '—',
      improving:
        nowM.conversion && prevM.conversion
          ? cmp(
              nowM.conversion.converted / nowM.conversion.reached,
              prevM.conversion.converted / prevM.conversion.reached,
              true,
              0.01,
            )
          : null,
      detail: prevM.conversion ? `was ${prevM.conversion.converted}/${prevM.conversion.reached} before` : 'coached games only',
    },
    {
      key: 'blunders',
      label: 'Blunders per analyzed game',
      now: nowM.blundersPerGame === null ? '—' : nowM.blundersPerGame.toFixed(1),
      improving: cmp(nowM.blundersPerGame, prevM.blundersPerGame, false, 0.15),
      detail: `was ${prevM.blundersPerGame === null ? '—' : prevM.blundersPerGame.toFixed(1)} before`,
    },
  ]
}
