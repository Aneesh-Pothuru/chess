import { Chess, type Color } from 'chess.js'

/** Display values a club player thinks in. */
export const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

export interface MaterialCount {
  white: number
  black: number
  /** Positive means White is up material. */
  diff: number
}

export function materialCount(game: Chess): MaterialCount {
  let white = 0
  let black = 0
  for (const row of game.board()) {
    for (const sq of row) {
      if (!sq) continue
      if (sq.color === 'w') white += PIECE_VALUE[sq.type]
      else black += PIECE_VALUE[sq.type]
    }
  }
  return { white, black, diff: white - black }
}

/** Total non-pawn piece points on the board (both sides), for phase detection. */
export function piecePoints(game: Chess): number {
  let total = 0
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.type !== 'p' && sq.type !== 'k') total += PIECE_VALUE[sq.type]
    }
  }
  return total
}

export function materialFor(game: Chess, color: Color): number {
  const m = materialCount(game)
  return color === 'w' ? m.diff : -m.diff
}
