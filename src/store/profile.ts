// Single localStorage-backed store for everything the coach knows about the
// player. Plain module + subscribe so React views use useSyncExternalStore.

import type { SrsState } from './srs'

export type WeaknessKey =
  | 'conversion'
  | 'hangingPiece'
  | 'fork'
  | 'mateThreats'
  | 'f7f2'
  | 'openingD4'
  | 'openingE4'
  | 'endgameTechnique'
  | 'timeUsage'
  | 'castling'
  | 'boardVision'
  | 'coordinates'

export interface GameReport {
  id: string
  at: number
  color: 'w' | 'b'
  presetId: string
  result: 'win' | 'loss' | 'draw'
  moves: number
  blunders: number
  mistakes: number
  castleMove: number | null
  avgSecondsPerMove: number
  motifs: string[] // e.g. 'hangingPiece', 'missedMateIn1'
  opening: string
  wonGameConverted: boolean | null // was a won position reached, and did it convert
}

export interface ImportedGame {
  url: string
  at: number
  color: 'w' | 'b'
  result: 'win' | 'loss' | 'draw'
  opening: string
  firstWhiteMove: string
  castleMove: number | null
  scanned: boolean
  blunders: number
  motifs: string[]
}

export interface DrillProgress {
  attempts: number
  successes: number
  bestMoves: number | null // fewest moves to mate
  lastAt: number
}

export interface Profile {
  version: 1
  createdAt: number
  settings: {
    username: string
    opponentPresetId: string
    strictMode: boolean
    tenSecondFloor: boolean
  }
  weakness: Record<WeaknessKey, number>
  srs: Record<string, SrsState>
  games: GameReport[]
  imported: ImportedGame[]
  drills: Record<string, DrillProgress>
  puzzleStats: Record<string, { attempts: number; correct: number }> // per bucket
  streak: { lastDay: string; days: number }
  focusWeek: 'conversion' | 'openings'
  /** Coach-briefing id whose adjustments were already applied. */
  lastBriefingId?: string
}

// Seeded from the improvement report + the 162-game baseline analysis.
export const DEFAULT_WEAKNESS: Record<WeaknessKey, number> = {
  conversion: 0.95,
  hangingPiece: 0.9,
  fork: 0.85,
  mateThreats: 0.85,
  f7f2: 0.8,
  openingD4: 0.9,
  openingE4: 0.55,
  endgameTechnique: 0.8,
  timeUsage: 0.7,
  castling: 0.75,
  boardVision: 0.7,
  coordinates: 0.55,
}

const KEY = 'chess-coach-profile-v1'

function defaultProfile(): Profile {
  return {
    version: 1,
    createdAt: Date.now(),
    settings: {
      username: 'pots1125',
      opponentPresetId: 'sparring',
      strictMode: true,
      tenSecondFloor: true,
    },
    weakness: { ...DEFAULT_WEAKNESS },
    srs: {},
    games: [],
    imported: [],
    drills: {},
    puzzleStats: {},
    streak: { lastDay: '', days: 0 },
    focusWeek: 'conversion',
  }
}

let profile: Profile = load()
const listeners = new Set<() => void>()

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProfile()
    const parsed = JSON.parse(raw) as Profile
    // Merge so new fields get defaults after app updates.
    const base = defaultProfile()
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      weakness: { ...base.weakness, ...parsed.weakness },
    }
  } catch {
    return defaultProfile()
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // Storage full or unavailable; keep running in-memory.
  }
  for (const fn of listeners) fn()
}

export function getProfile(): Profile {
  return profile
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** All mutations go through update() so persistence and notify stay in sync. */
export function update(mutate: (p: Profile) => void): void {
  const next = structuredClone(profile)
  mutate(next)
  profile = next
  persist()
}

export function bumpWeakness(key: WeaknessKey, delta: number): void {
  update((p) => {
    p.weakness[key] = Math.min(1, Math.max(0.05, p.weakness[key] + delta))
  })
}

export function touchStreak(): void {
  const today = new Date().toISOString().slice(0, 10)
  update((p) => {
    if (p.streak.lastDay === today) return
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
    p.streak.days = p.streak.lastDay === yesterday ? p.streak.days + 1 : 1
    p.streak.lastDay = today
  })
}

export function exportProfile(): string {
  return JSON.stringify(profile, null, 2)
}

export function importProfile(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    if (parsed?.version !== 1) return false
    profile = parsed
    persist()
    return true
  } catch {
    return false
  }
}

export function resetProfile(): void {
  profile = defaultProfile()
  persist()
}
