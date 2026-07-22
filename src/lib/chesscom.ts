// chess.com public API client. CORS is open (`access-control-allow-origin: *`),
// but etiquette requires SERIAL fetching — always await one response before the
// next request. No custom headers (preflight only allows Origin).

import { castleMoveNumber, openingName, parsePgn } from './pgn'
import type { ImportedGame } from '../store/profile'

const BASE = 'https://api.chess.com/pub'

const DRAW_RESULTS = new Set([
  'agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient',
])

export interface ApiGame {
  url: string
  pgn?: string
  time_class: string
  end_time: number
  rated: boolean
  white: { username: string; rating: number; result: string }
  black: { username: string; rating: number; result: string }
  accuracies?: { white: number; black: number }
}

export async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url)
    if (res.status === 429 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      continue
    }
    if (!res.ok) throw new Error(`chess.com API ${res.status} for ${url}`)
    return (await res.json()) as T
  }
}

export async function fetchArchives(username: string): Promise<string[]> {
  const data = await fetchJson<{ archives: string[] }>(
    `${BASE}/player/${username.toLowerCase()}/games/archives`,
  )
  return data.archives
}

export async function fetchRating(username: string): Promise<number | null> {
  try {
    const data = await fetchJson<{ chess_rapid?: { last?: { rating?: number } } }>(
      `${BASE}/player/${username.toLowerCase()}/stats`,
    )
    return data.chess_rapid?.last?.rating ?? null
  } catch {
    return null
  }
}

export function toImportedGame(game: ApiGame, username: string): ImportedGame | null {
  if (game.time_class !== 'rapid' || !game.pgn) return null
  const color: 'w' | 'b' = game.white.username.toLowerCase() === username.toLowerCase() ? 'w' : 'b'
  const me = color === 'w' ? game.white : game.black
  const opp = color === 'w' ? game.black : game.white
  const result: ImportedGame['result'] =
    me.result === 'win' ? 'win' : DRAW_RESULTS.has(me.result) || DRAW_RESULTS.has(opp.result) ? 'draw' : 'loss'
  const parsed = parsePgn(game.pgn)
  return {
    url: game.url,
    at: game.end_time * 1000,
    color,
    result,
    opening: openingName(parsed.headers),
    firstWhiteMove: parsed.moves[0] ?? '?',
    castleMove: castleMoveNumber(parsed.moves, color),
    scanned: false,
    blunders: 0,
    motifs: [],
  }
}

/**
 * Serially fetch recent months of rapid games, newest months last.
 * `onProgress(done, total)` reports month-level progress.
 */
export async function fetchRecentGames(
  username: string,
  months: number,
  onProgress?: (done: number, total: number) => void,
): Promise<{ games: ImportedGame[]; pgns: Map<string, string> }> {
  const archives = await fetchArchives(username)
  const recent = archives.slice(-months)
  const games: ImportedGame[] = []
  const pgns = new Map<string, string>()
  let done = 0
  for (const url of recent) {
    const data = await fetchJson<{ games: ApiGame[] }>(url)
    for (const g of data.games) {
      const imported = toImportedGame(g, username)
      if (imported) {
        games.push(imported)
        if (g.pgn) pgns.set(g.url, g.pgn)
      }
    }
    done++
    onProgress?.(done, recent.length)
  }
  return { games, pgns }
}
