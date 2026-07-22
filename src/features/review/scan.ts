// Post-game scanning of imported chess.com games: one analyst eval per
// position, judge the player's moves, tag motifs with the instant detectors.

import { Chess } from 'chess.js'
import { getAnalyst } from '../../engine/instances'
import { ANALYST } from '../../engine/presets'
import type { Score } from '../../engine/uci'
import {
  hangingPieces,
  judgeMove,
  mateInOneMoves,
  moveAllowsMateInOne,
} from '../../chess/coach'
import { parsePgn } from '../../lib/pgn'

export interface ScanResult {
  blunders: number
  mistakes: number
  motifs: string[]
}

export async function scanGame(
  pgn: string,
  color: 'w' | 'b',
  onProgress?: (done: number, total: number) => void,
  shouldAbort?: () => boolean,
): Promise<ScanResult | null> {
  const { moves } = parsePgn(pgn)
  if (moves.length === 0) return { blunders: 0, mistakes: 0, motifs: [] }
  const analyst = await getAnalyst()
  const game = new Chess()
  const fens: string[] = [game.fen()]
  const sans: string[] = []
  for (const san of moves) {
    try {
      game.move(san)
    } catch {
      break // PGN parsing hiccup; scan what we have
    }
    sans.push(san)
    fens.push(game.fen())
  }
  const evals: (Score | null)[] = []
  for (let i = 0; i < fens.length; i++) {
    if (shouldAbort?.()) return null
    if (new Chess(fens[i]).isGameOver()) {
      evals.push(null)
    } else {
      const res = await analyst.search(fens[i], `go depth ${ANALYST.scanDepth} movetime 350`)
      evals.push(res.score)
    }
    onProgress?.(i + 1, fens.length)
  }
  const motifs = new Set<string>()
  let blunders = 0
  let mistakes = 0
  const playerStart = color === 'w' ? 0 : 1
  for (let i = playerStart; i < sans.length; i += 2) {
    const before = evals[i]
    const after = evals[i + 1]
    if (before && after) {
      const j = judgeMove(before, after, color)
      if (j === 'blunder') blunders++
      if (j === 'mistake') mistakes++
      if (j === 'blunder' || j === 'mistake') {
        const beforeHanging = new Set(hangingPieces(fens[i], color).map((h) => h.square))
        const nowHanging = hangingPieces(fens[i + 1], color).filter((h) => !beforeHanging.has(h.square))
        if (nowHanging.length > 0) motifs.add('hangingPiece')
        if (moveAllowsMateInOne(fens[i], sans[i])) motifs.add('allowedMate')
      }
    }
    const mates = mateInOneMoves(fens[i])
    if (mates.length > 0 && !mates.includes(sans[i])) {
      const g = new Chess(fens[i])
      g.move(sans[i])
      if (!g.isCheckmate()) motifs.add('missedMateIn1')
    }
  }
  return { blunders, mistakes, motifs: [...motifs] }
}
