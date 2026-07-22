// Coach briefing channel: a daily Claude Code routine analyzes recent
// chess.com games and commits public/coach/briefing.json to the GitHub repo.
// The app reads it (local copy first, then GitHub raw so a cloud routine's
// commit shows up without a manual pull) and adjusts the day's plan.

import type { WeaknessKey } from '../store/profile'
import { getToken as getGithubToken } from './sync'

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
// Anonymous raw URL works only if the repo is public; the API URL works for a
// private repo when the user has saved a token (Cloud sync panel).
const RAW_URL = 'https://raw.githubusercontent.com/Aneesh-Pothuru/chess/main/public/coach/briefing.json'
const API_URL = 'https://api.github.com/repos/Aneesh-Pothuru/chess/contents/public/coach/briefing.json?ref=main'
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

async function tryFetch(url: string, headers?: Record<string, string>): Promise<CoachBriefing | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache', headers })
    if (!res.ok) return null
    const data: unknown = await res.json()
    return valid(data) ? data : null
  } catch {
    return null
  }
}

function remoteBriefing(): Promise<CoachBriefing | null> {
  const token = getGithubToken()
  if (token) {
    return tryFetch(API_URL, {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.raw+json',
    })
  }
  return tryFetch(RAW_URL)
}

/** Newest fresh briefing from the local copy or the GitHub repo, if any. */
export async function fetchBriefing(now: Date = new Date()): Promise<CoachBriefing | null> {
  const [local, remote] = await Promise.all([tryFetch(LOCAL_URL), remoteBriefing()])
  const fresh = [local, remote].filter((b): b is CoachBriefing => b !== null && isFresh(b, now))
  if (fresh.length === 0) return null
  fresh.sort((a, b) => (a.date < b.date ? 1 : -1))
  return fresh[0]
}
