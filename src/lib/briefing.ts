// Coach briefing channel: a daily Claude Code routine analyzes recent
// chess.com games and commits public/coach/briefing.json to the GitHub repo.
// The app reads it (local copy first, then GitHub raw so a cloud routine's
// commit shows up without a manual pull) and adjusts the day's plan.

import type { WeaknessKey } from '../store/profile'

export interface BriefingFocus {
  route: 'play' | 'openings' | 'puzzles' | 'endgame' | 'calculation' | 'review'
  target?: string
  title: string
  detail: string
  minutes?: number
}

export interface CoachBriefing {
  /** Unique id, normally the ISO date; adjustments apply once per id. */
  id: string
  date: string // YYYY-MM-DD
  headline: string
  note: string
  focus?: BriefingFocus
  /** Weakness weight deltas, applied once. Clamped to +-0.1 per key. */
  adjustments?: Partial<Record<WeaknessKey, number>>
  stats?: { gamesAnalyzed?: number; record?: string; blunders?: number }
}

const LOCAL_URL = `${import.meta.env.BASE_URL}coach/briefing.json`
const REMOTE_URL = 'https://raw.githubusercontent.com/Aneesh-Pothuru/chess/main/public/coach/briefing.json'
const MAX_AGE_DAYS = 4

function valid(b: unknown): b is CoachBriefing {
  if (typeof b !== 'object' || b === null) return false
  const o = b as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.date === 'string' &&
    typeof o.headline === 'string' &&
    typeof o.note === 'string'
  )
}

function isFresh(b: CoachBriefing, now: Date): boolean {
  const age = now.getTime() - new Date(`${b.date}T00:00:00`).getTime()
  return age >= 0 ? age < MAX_AGE_DAYS * 86400_000 : true
}

async function tryFetch(url: string): Promise<CoachBriefing | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    return valid(data) ? data : null
  } catch {
    return null
  }
}

/** Newest fresh briefing from the local copy or the GitHub repo, if any. */
export async function fetchBriefing(now: Date = new Date()): Promise<CoachBriefing | null> {
  const [local, remote] = await Promise.all([tryFetch(LOCAL_URL), tryFetch(REMOTE_URL)])
  const fresh = [local, remote].filter((b): b is CoachBriefing => b !== null && isFresh(b, now))
  if (fresh.length === 0) return null
  fresh.sort((a, b) => (a.date < b.date ? 1 : -1))
  return fresh[0]
}
