// "Chess math" drills: capture-exchange counting (can I take that? who wins
// the trade war?) and attacker counting (board awareness). Both are generated
// from real puzzle positions so content never runs out.

import { Chess, type Color, type Square } from 'chess.js'
import { PIECE_VALUE } from './material'
import type { RawPuzzle } from './calculation'
import { preparePuzzle } from './calculation'

/**
 * Net material outcome (for the side to move) of initiating captures on
 * `square`, with both sides playing the capture war optimally and allowed to
 * stop. Uses real legal moves, so pins are handled. Returns null when the
 * side to move has no capture on that square.
 */
export function captureExchange(fen: string, square: Square): number | null {
  const game = new Chess(fen)
  const caps = game.moves({ verbose: true }).filter((m) => m.to === square && m.isCapture())
  if (caps.length === 0) return null
  let best: number | null = null
  for (const cap of caps) {
    const gained = PIECE_VALUE[cap.captured ?? 'p']
    game.move(cap.san)
    const reply = continuation(game, square)
    game.undo()
    const net = gained - reply
    if (best === null || net > best) best = net
  }
  return best
}

/** Value of continuing the capture war on `square` for the side to move (>= 0: stopping is allowed). */
function continuation(game: Chess, square: Square): number {
  const caps = game.moves({ verbose: true }).filter((m) => m.to === square && m.isCapture())
  let best = 0
  for (const cap of caps) {
    const gained = PIECE_VALUE[cap.captured ?? 'p']
    game.move(cap.san)
    const reply = continuation(game, square)
    game.undo()
    best = Math.max(best, gained - reply)
  }
  return best
}

export interface ExchangeDrill {
  kind: 'exchange'
  puzzleId: string
  fen: string
  square: Square
  sideToMove: Color
  /** Net for the side to move if it initiates captures on the square. */
  net: number
  options: string[]
  answerIndex: number
}

export interface AttackCountDrill {
  kind: 'attackers'
  puzzleId: string
  fen: string
  square: Square
  askColor: Color
  count: number
  options: string[]
  answerIndex: number
}

export type BoardMathDrill = ExchangeDrill | AttackCountDrill

function outcomeLabel(net: number, side: Color): string {
  const who = side === 'w' ? 'White' : 'Black'
  if (net > 0) return `${who} wins ${net} point${net === 1 ? '' : 's'} of material`
  if (net === 0) return 'Dead even — material stays level'
  return `${who} LOSES ${-net} point${net === -1 ? '' : 's'} — don't take`
}

export function makeExchangeDrill(p: RawPuzzle, rng: () => number = Math.random): ExchangeDrill | null {
  const { game } = preparePuzzle(p)
  const fen = game.fen()
  const mover = game.turn()
  // Contested candidate squares: enemy-occupied, not a king, not a promotion
  // rank, at least one capture available and at least one enemy defender so
  // the answer takes actual counting.
  const candidates: Array<{ square: Square; net: number }> = []
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.color === mover || cell.type === 'k') continue
      const rank = cell.square[1]
      if (rank === '1' || rank === '8') continue
      const defenders = game.attackers(cell.square, cell.color)
      if (defenders.length === 0) continue
      const net = captureExchange(fen, cell.square)
      if (net === null) continue
      candidates.push({ square: cell.square, net })
    }
  }
  if (candidates.length === 0) return null
  const pick = candidates[Math.floor(rng() * candidates.length)]
  const labels = new Set<number>([pick.net])
  for (const d of [pick.net + 1, pick.net - 1, pick.net + 2, pick.net - 2, 0, -pick.net]) {
    if (labels.size >= 4) break
    labels.add(d)
  }
  const values = [...labels].slice(0, 4).sort((a, b) => b - a)
  const options = values.map((v) => outcomeLabel(v, mover))
  return {
    kind: 'exchange',
    puzzleId: p.id,
    fen,
    square: pick.square,
    sideToMove: mover,
    net: pick.net,
    options,
    answerIndex: values.indexOf(pick.net),
  }
}

export function makeAttackCountDrill(p: RawPuzzle, rng: () => number = Math.random): AttackCountDrill | null {
  const { game } = preparePuzzle(p)
  const askColor: Color = rng() < 0.5 ? 'w' : 'b'
  // Pick an occupied, interesting square (some attention on it).
  const candidates: Array<{ square: Square; count: number }> = []
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue
      const count = game.attackers(cell.square, askColor).length
      if (count >= 1 && count <= 5) candidates.push({ square: cell.square, count })
    }
  }
  if (candidates.length === 0) return null
  const pick = candidates[Math.floor(rng() * candidates.length)]
  const opts = new Set<number>([pick.count])
  let delta = 1
  while (opts.size < 4) {
    if (pick.count - delta >= 0) opts.add(pick.count - delta)
    if (opts.size < 4) opts.add(pick.count + delta)
    delta++
  }
  const values = [...opts].slice(0, 4).sort((a, b) => a - b)
  return {
    kind: 'attackers',
    puzzleId: p.id,
    fen: game.fen(),
    square: pick.square,
    askColor,
    count: pick.count,
    options: values.map((v) => `${v}`),
    answerIndex: values.indexOf(pick.count),
  }
}
