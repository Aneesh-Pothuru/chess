// Calculation trainers targeting the puzzle→game transfer gap (puzzle rating
// 1427 vs game rating ~713). Drills are auto-generated with chess.js from the
// bundled puzzle positions, so content never runs out.

import { Chess, type Color, type Square } from 'chess.js'
import { PIECE_VALUE } from './material'
import { hangingPieces, type HangingPiece } from './coach'

export interface RawPuzzle {
  id: string
  fen: string
  moves: string // UCI, space separated; moves[0] is the opponent setup move
  rating: number
  themes: string
}

export interface VisualizationDrill {
  puzzleId: string
  /** Position shown on the board (after the setup move). */
  fen: string
  /** The line to visualize, in SAN, starting from `fen`. NOT played on the board. */
  lineSan: string[]
  question: string
  options: string[]
  answerIndex: number
  explainFen: string // final position, revealed after answering
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
}

/** Apply the setup move; return the game ready for the solver plus SAN solution. */
export function preparePuzzle(p: RawPuzzle): { game: Chess; solutionSan: string[]; solverColor: Color } {
  const game = new Chess(p.fen)
  const uci = p.moves.split(' ')
  game.move({ from: uci[0].slice(0, 2), to: uci[0].slice(2, 4), promotion: uci[0][4] })
  const solverColor = game.turn()
  const solutionSan: string[] = []
  const replay = new Chess(game.fen())
  for (const m of uci.slice(1)) {
    const mv = replay.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
    solutionSan.push(mv.san)
  }
  return { game, solutionSan, solverColor }
}

function materialDiffLabel(game: Chess): string {
  let diff = 0
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell && cell.type !== 'k') diff += (cell.color === 'w' ? 1 : -1) * PIECE_VALUE[cell.type]
    }
  }
  if (diff === 0) return 'Material is equal'
  return diff > 0 ? `White is up ${diff}` : `Black is up ${-diff}`
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Build a visualization drill from a puzzle: the player reads a line (never
 * played on the board) and answers a question about the resulting position.
 */
export function makeVisualizationDrill(
  p: RawPuzzle,
  rng: () => number = Math.random,
  maxPlies = 5,
): VisualizationDrill | null {
  const { game, solutionSan } = preparePuzzle(p)
  if (solutionSan.length < 2) return null
  const lineSan = solutionSan.slice(0, Math.min(solutionSan.length, maxPlies))
  const finalGame = new Chess(game.fen())
  const startFen = game.fen()
  let lastMove: { san: string; to: Square; piece: string } | null = null
  for (const san of lineSan) {
    const mv = finalGame.move(san)
    lastMove = { san: mv.san, to: mv.to, piece: mv.piece }
  }
  const kind = Math.floor(rng() * 3)
  if (kind === 0 && lastMove && lastMove.piece !== 'k') {
    // Where does the moving piece end up?
    const correct = lastMove.to
    const files = 'abcdefgh'
    const distractors = new Set<string>()
    while (distractors.size < 3) {
      const f = files[Math.floor(rng() * 8)]
      const r = 1 + Math.floor(rng() * 8)
      const sq = `${f}${r}`
      if (sq !== correct) distractors.add(sq)
    }
    const options = shuffled([correct, ...distractors], rng)
    return {
      puzzleId: p.id,
      fen: startFen,
      lineSan,
      question: `Without moving the pieces: after this line, which square is the ${PIECE_NAMES[lastMove.piece]} that just moved standing on?`,
      options,
      answerIndex: options.indexOf(correct),
      explainFen: finalGame.fen(),
    }
  }
  if (kind === 1) {
    // Is the side to move in check at the end of the line?
    const correct = finalGame.inCheck() ? 'Yes' : 'No'
    const options = ['Yes', 'No']
    return {
      puzzleId: p.id,
      fen: startFen,
      lineSan,
      question: 'Without moving the pieces: at the end of this line, is the side to move in check?',
      options,
      answerIndex: options.indexOf(correct),
      explainFen: finalGame.fen(),
    }
  }
  // Material count question.
  const correct = materialDiffLabel(finalGame)
  const candidates = new Set<string>([correct])
  const base = new Chess(startFen)
  candidates.add(materialDiffLabel(base))
  candidates.add('Material is equal')
  candidates.add('White is up 3')
  candidates.add('Black is up 3')
  candidates.add('White is up 5')
  const options = shuffled([...candidates].slice(0, 4), rng)
  if (!options.includes(correct)) options[0] = correct
  const finalOptions = shuffled(options, rng)
  return {
    puzzleId: p.id,
    fen: startFen,
    lineSan,
    question: 'Without moving the pieces: after this line completes, what is the material count?',
    options: finalOptions,
    answerIndex: finalOptions.indexOf(correct),
    explainFen: finalGame.fen(),
  }
}

export interface ThreatScanDrill {
  puzzleId: string
  fen: string
  /** Squares of the side-to-move's pieces that are hanging (the answers). */
  targets: Square[]
  sideToMove: Color
}

/**
 * Threat-scan drill: the player has a few seconds to click every hanging piece
 * belonging to the side to move (i.e., "what can be taken / what is loose?").
 */
export function makeThreatScanDrill(p: RawPuzzle): ThreatScanDrill | null {
  const { game } = preparePuzzle(p)
  const mover = game.turn()
  const enemy: Color = mover === 'w' ? 'b' : 'w'
  // Loose enemy pieces = capture targets for the player.
  const targets = hangingPieces(game.fen(), enemy).map((h: HangingPiece) => h.square)
  if (targets.length === 0 || targets.length > 4) return null
  return { puzzleId: p.id, fen: game.fen(), targets, sideToMove: mover }
}
