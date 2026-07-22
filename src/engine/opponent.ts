// Move selection for the coach's opponent: engine move at limited strength,
// with occasional injected "human" blunders so weak presets actually play
// like ~600-900 players instead of Stockfish's 1320 floor.

import { Chess } from 'chess.js'
import type { UciEngine } from './uci'
import type { OpponentPreset } from './presets'

/**
 * Pick a plausible blunder: prefer moves a low-rated human actually plays —
 * captures, checks, pawn pushes near the action — over random shuffles.
 * Excludes moves that immediately deliver mate for us (a "blunder" that wins
 * would be confusing) but may well hang material; that is the point.
 */
export function pickInjectedMove(fen: string, rng: () => number = Math.random): string | null {
  const game = new Chess(fen)
  const moves = game.moves({ verbose: true })
  if (moves.length <= 1) return null
  const weighted: Array<{ uci: string; w: number }> = []
  for (const m of moves) {
    game.move(m.san)
    const mates = game.isCheckmate()
    game.undo()
    if (mates) continue
    let w = 1
    if (m.isCapture()) w += 2 // beginners love captures
    if (m.piece === 'p') w += 1
    if (m.piece === 'q') w += 1.5 // and queen wanders
    weighted.push({ uci: m.from + m.to + (m.promotion ?? ''), w })
  }
  if (weighted.length === 0) return null
  const total = weighted.reduce((s, x) => s + x.w, 0)
  let r = rng() * total
  for (const x of weighted) {
    r -= x.w
    if (r <= 0) return x.uci
  }
  return weighted[weighted.length - 1].uci
}

export async function opponentMove(
  engine: UciEngine,
  fen: string,
  preset: OpponentPreset,
  rng: () => number = Math.random,
): Promise<string> {
  if (preset.blunderChance > 0 && rng() < preset.blunderChance) {
    const injected = pickInjectedMove(fen, rng)
    if (injected) return injected
  }
  await engine.setOption('Skill Level', preset.skill)
  const res = await engine.search(fen, `go depth ${preset.depth} movetime ${preset.movetimeMs}`)
  return res.bestMove
}
