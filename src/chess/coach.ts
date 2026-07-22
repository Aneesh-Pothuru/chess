// The coach's brain: instant, engine-free motif detectors plus eval-swing
// classification. Everything here is a pure function of FEN strings so it can
// be unit-tested against crafted positions.

import { Chess, type Color, type Square } from 'chess.js'
import { PIECE_VALUE, materialFor, piecePoints } from './material'
import type { Score } from '../engine/uci'

// ---------------------------------------------------------------- hanging pieces

export interface HangingPiece {
  square: Square
  piece: string // 'p' | 'n' | ...
  /** 'free' = attacked, zero defenders. 'underDefended' = cheapest attacker is worth less. */
  kind: 'free' | 'underDefended'
}

/**
 * Attackers of `square` by `byColor` that can actually capture there legally —
 * chess.js attackers() ignores pins, so an absolutely pinned "attacker" must
 * be filtered out. When it is not byColor's turn, legality is probed on a
 * turn-flipped copy of the position (en passant cleared).
 */
export function legalAttackers(game: Chess, square: Square, byColor: Color): Square[] {
  const raw = game.attackers(square, byColor)
  if (raw.length === 0) return raw
  let probe = game
  if (game.turn() !== byColor) {
    const parts = game.fen().split(' ')
    parts[1] = byColor
    parts[3] = '-'
    try {
      probe = new Chess(parts.join(' '))
    } catch {
      return raw // unflippable position (e.g. mover in check); keep the heuristic
    }
  }
  return raw.filter((from) => {
    try {
      probe.move({ from, to: square, promotion: 'q' })
      probe.undo()
      return true
    } catch {
      return false
    }
  })
}

/** Pieces of `color` that can be won by a simple capture right now. */
export function hangingPieces(fen: string, color: Color): HangingPiece[] {
  const game = new Chess(fen)
  const enemy: Color = color === 'w' ? 'b' : 'w'
  const out: HangingPiece[] = []
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color || cell.type === 'k') continue
      const attackers = legalAttackers(game, cell.square, enemy)
      if (attackers.length === 0) continue
      const defenders = game.attackers(cell.square, color)
      if (defenders.length === 0) {
        out.push({ square: cell.square, piece: cell.type, kind: 'free' })
        continue
      }
      const cheapest = Math.min(
        ...attackers.map((sq) => PIECE_VALUE[game.get(sq)?.type ?? 'q']),
      )
      if (cheapest < PIECE_VALUE[cell.type]) {
        out.push({ square: cell.square, piece: cell.type, kind: 'underDefended' })
      }
    }
  }
  return out
}

// ---------------------------------------------------------------- mate in one

/** SAN of every legal move that delivers checkmate immediately. */
export function mateInOneMoves(fen: string): string[] {
  const game = new Chess(fen)
  const mates: string[] = []
  for (const m of game.moves()) {
    game.move(m)
    if (game.isCheckmate()) mates.push(m)
    game.undo()
  }
  return mates
}

/** After the side to move plays `san`, does the opponent have mate in one? */
export function moveAllowsMateInOne(fen: string, san: string): string | null {
  const game = new Chess(fen)
  game.move(san)
  const replies = mateInOneMoves(game.fen())
  return replies.length > 0 ? replies[0] : null
}

// ---------------------------------------------------------------- forks

export interface ForkInfo {
  bySquare: Square
  targets: Square[]
}

/**
 * Did the move just played (leading to `fenAfter` from `fenBefore`) create a
 * fork? The moved piece must attack two or more profitable targets: king,
 * higher-value piece, or an undefended piece.
 */
export function detectFork(fenBefore: string, san: string): ForkInfo | null {
  const game = new Chess(fenBefore)
  const move = game.move(san)
  const mover = move.color
  const enemy: Color = mover === 'w' ? 'b' : 'w'
  const from = move.to // the piece now sits on move.to
  // A promoted pawn forks with its NEW value; a king can never favorably
  // capture a defended piece, so only undefended targets count for it.
  const moverValue = move.piece === 'k' ? Infinity : PIECE_VALUE[move.promotion ?? move.piece]
  const targets: Square[] = []
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy) continue
      const attackedByMover = game.attackers(cell.square, mover).includes(from)
      if (!attackedByMover) continue
      if (cell.type === 'k') {
        targets.push(cell.square)
        continue
      }
      const value = PIECE_VALUE[cell.type]
      const defenders = game.attackers(cell.square, enemy).filter((s) => s !== cell.square)
      if (value > moverValue || defenders.length === 0) targets.push(cell.square)
    }
  }
  if (targets.length < 2) return null
  // A pinned/capturable forker is not a real fork if it can be taken for free.
  const forkerDefenders = game.attackers(from, mover)
  const forkerAttackers = game.attackers(from, enemy)
  if (forkerAttackers.length > 0 && forkerDefenders.length === 0) return null
  return { bySquare: from, targets }
}

// ---------------------------------------------------------------- f7/f2 danger

export interface F7Danger {
  square: Square
  attackers: Square[]
}

/**
 * The classic scholar/fried-liver target: is `color`'s weak bishop-pawn square
 * (f7 for Black, f2 for White) under converging attack?
 */
export function f7f2Danger(fen: string, color: Color): F7Danger | null {
  const game = new Chess(fen)
  const square: Square = color === 'w' ? 'f2' : 'f7'
  const enemy: Color = color === 'w' ? 'b' : 'w'
  const attackers = game.attackers(square, enemy)
  if (attackers.length < 2) return null
  const defenders = game.attackers(square, color)
  // King always defends f2/f7 initially; converging attack = attackers exceed
  // non-king defenders + 1.
  if (attackers.length <= defenders.length) return null
  return { square, attackers }
}

// ---------------------------------------------------------------- queen raid

/**
 * The report's rule: no pawn-grabbing queen expeditions before development is
 * done. Fires when `color`'s queen is deep in enemy territory while two or
 * more of its minor pieces still sit at home.
 */
export function queenRaidWarning(fen: string, color: Color): Square | null {
  const game = new Chess(fen)
  const homeRank = color === 'w' ? '1' : '8'
  const enemyHalf = color === 'w' ? ['5', '6', '7', '8'] : ['1', '2', '3', '4']
  let queenSquare: Square | null = null
  let mindersAtHome = 0
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue
      if (cell.type === 'q' && enemyHalf.includes(cell.square[1])) queenSquare = cell.square
      if ((cell.type === 'n' || cell.type === 'b') && cell.square[1] === homeRank) mindersAtHome++
    }
  }
  return queenSquare && mindersAtHome >= 2 ? queenSquare : null
}

// ---------------------------------------------------------------- back rank

/** Is `color` vulnerable to a back-rank mate pattern right now? */
export function backRankWeakness(fen: string, color: Color): boolean {
  const game = new Chess(fen)
  const backRank = color === 'w' ? '1' : '8'
  const king = game.findPiece({ type: 'k', color })[0]
  if (!king || king[1] !== backRank) return false
  // King boxed in by own pawns on the three squares in front of it?
  const file = king.charCodeAt(0)
  let boxed = true
  for (const f of [file - 1, file, file + 1]) {
    if (f < 97 || f > 104) continue
    const front = (String.fromCharCode(f) + (color === 'w' ? '2' : '7')) as Square
    const p = game.get(front)
    if (!p || p.color !== color) {
      boxed = false
      break
    }
  }
  if (!boxed) return false
  // A live threat needs an enemy heavy piece already ON the back rank, or one
  // aiming down a pawn-free file at an UNDEFENDED back-rank landing square.
  const enemy: Color = color === 'w' ? 'b' : 'w'
  const board = game.board()
  const fileHasPawn = (f: number): boolean => {
    for (const row of board) {
      const cell = row[f]
      if (cell && cell.type === 'p') return true
    }
    return false
  }
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy || (cell.type !== 'r' && cell.type !== 'q')) continue
      if (cell.square[1] === backRank) return true
      const f = cell.square.charCodeAt(0) - 97
      if (fileHasPawn(f)) continue
      const landing = (cell.square[0] + backRank) as Square
      const occupant = game.get(landing)
      if (occupant && occupant.color === enemy) continue
      // Defended landing square (excluding the boxed king itself) is not a mate threat.
      const defenders = game.attackers(landing, color).filter((s) => s !== king)
      if (defenders.length === 0) return true
    }
  }
  return false
}

// ---------------------------------------------------------------- eval swings

export type MoveJudgment = 'blunder' | 'mistake' | 'inaccuracy' | 'ok' | 'good'

/** Collapse cp/mate into one comparable number (White's perspective). */
export function scoreToCp(score: Score): number {
  if (score.mate !== null) {
    return score.mate > 0 ? 10000 - score.mate * 10 : -10000 - score.mate * 10
  }
  return score.cp ?? 0
}

/**
 * Judge the player's move from evals before and after it (both from White's
 * perspective). `color` is the player who moved.
 */
export function judgeMove(before: Score, after: Score, color: Color): MoveJudgment {
  const sign = color === 'w' ? 1 : -1
  const swing = (scoreToCp(before) - scoreToCp(after)) * sign
  if (swing >= 250) return 'blunder'
  if (swing >= 120) return 'mistake'
  if (swing >= 60) return 'inaccuracy'
  if (swing <= 10) return 'good'
  return 'ok'
}

export const JUDGMENT_GLYPH: Record<MoveJudgment, string> = {
  blunder: '??',
  mistake: '?',
  inaccuracy: '?!',
  ok: '',
  good: '',
}

// ---------------------------------------------------------------- phases & won game

export type Phase = 'opening' | 'middlegame' | 'endgame'

export function phaseOf(game: Chess): Phase {
  if (piecePoints(game) <= 14) return 'endgame'
  if (game.moveNumber() <= 10) return 'opening'
  return 'middlegame'
}

/** Won-Game Protocol trigger: clearly winning on eval or material. */
export function wonGameActive(score: Score | null, fen: string, color: Color): boolean {
  const game = new Chess(fen)
  if (materialFor(game, color) >= 5) return true
  if (!score) return false
  const cp = scoreToCp(score) * (color === 'w' ? 1 : -1)
  return cp >= 300
}

/** Stalemate alarm: winning side to move next; count opponent's replies. */
export function opponentMobility(fen: string): number {
  const game = new Chess(fen)
  return game.moves().length
}
