// Minimal PGN parsing for chess.com game imports: headers, SAN move list,
// per-move clocks, and derived per-player facts (castle move, time usage).

export interface ParsedPgn {
  headers: Record<string, string>
  /** SAN moves in order (both sides). */
  moves: string[]
  /** Clock strings aligned with moves (may be shorter if PGN lacks clocks). */
  clocks: (string | null)[]
}

export function parsePgn(pgn: string): ParsedPgn {
  const headers: Record<string, string> = {}
  for (const m of pgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) {
    headers[m[1]] = m[2]
  }
  let body = pgn.replace(/\[.*?\]\s*\n/g, '')
  // Tokenize move-text keeping clock comments attached to the preceding move.
  const moves: string[] = []
  const clocks: (string | null)[] = []
  body = body.replace(/\r/g, ' ')
  const tokens = body.matchAll(
    /(?:\d+\.{1,3}\s*)?([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O[+#]?|O-O[+#]?)\s*(?:\{\[%clk\s+([\d:.]+)\]\})?/g,
  )
  for (const t of tokens) {
    moves.push(t[1])
    clocks.push(t[2] ?? null)
  }
  return { headers, moves, clocks }
}

export function clockToSeconds(clk: string): number {
  const parts = clk.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] ?? 0
}

/** Move number at which `color` castled, or null. */
export function castleMoveNumber(moves: string[], color: 'w' | 'b'): number | null {
  const start = color === 'w' ? 0 : 1
  for (let i = start; i < moves.length; i += 2) {
    if (moves[i].startsWith('O-O')) return Math.floor(i / 2) + 1
  }
  return null
}

/** Final remaining clock (seconds) for `color`, or null when no clocks. */
export function finalClockSeconds(clocks: (string | null)[], color: 'w' | 'b'): number | null {
  const start = color === 'w' ? 0 : 1
  let last: string | null = null
  for (let i = start; i < clocks.length; i += 2) {
    if (clocks[i]) last = clocks[i]
  }
  return last ? clockToSeconds(last) : null
}

/** Opening name from the chess.com ECOUrl header, humanized. */
export function openingName(headers: Record<string, string>): string {
  const url = headers['ECOUrl']
  if (url) {
    const slug = url.split('/openings/')[1] ?? ''
    return slug.replace(/-/g, ' ').slice(0, 60) || 'Unknown'
  }
  return headers['ECO'] ?? 'Unknown'
}
