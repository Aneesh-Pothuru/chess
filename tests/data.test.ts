import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { PUZZLE_BUCKETS } from '../src/data/puzzles'
import { ENDGAME_DRILLS } from '../src/data/endgames'
import { CONVERSION_DRILLS } from '../src/data/conversion'
import { preparePuzzle, makeVisualizationDrill, makeThreatScanDrill } from '../src/chess/calculation'
import { materialFor } from '../src/chess/material'

describe('puzzle data', () => {
  it('every puzzle FEN is valid and the full solution replays legally', () => {
    let count = 0
    for (const puzzles of Object.values(PUZZLE_BUCKETS)) {
      for (const p of puzzles) {
        const game = new Chess(p.fen)
        for (const uci of p.moves.split(' ')) {
          game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
        }
        count++
      }
    }
    expect(count).toBeGreaterThan(2500)
  })

  it('preparePuzzle applies the setup move and reports solver color', () => {
    const p = Object.values(PUZZLE_BUCKETS)[0][0]
    const fenTurn = p.fen.split(' ')[1]
    const { solverColor, solutionSan } = preparePuzzle(p)
    expect(solverColor).not.toBe(fenTurn) // solver is the opposite of the FEN's side to move
    expect(solutionSan.length).toBeGreaterThan(0)
  })

  it('visualization drills generate with a correct answer present', () => {
    let generated = 0
    for (const p of PUZZLE_BUCKETS['mateIn2'].slice(0, 30)) {
      const drill = makeVisualizationDrill(p, () => 0.42)
      if (!drill) continue
      generated++
      expect(drill.options.length).toBeGreaterThanOrEqual(2)
      expect(drill.answerIndex).toBeGreaterThanOrEqual(0)
      expect(drill.answerIndex).toBeLessThan(drill.options.length)
    }
    expect(generated).toBeGreaterThan(10)
  })

  it('threat scan drills produce clickable targets when they generate', () => {
    let generated = 0
    for (const p of PUZZLE_BUCKETS['hangingPiece'].slice(0, 60)) {
      const drill = makeThreatScanDrill(p)
      if (!drill) continue
      generated++
      expect(drill.targets.length).toBeGreaterThan(0)
      expect(drill.targets.length).toBeLessThanOrEqual(4)
    }
    expect(generated).toBeGreaterThan(5)
  })
})

describe('drill positions', () => {
  it('endgame drill FENs are legal and not already over', () => {
    for (const d of ENDGAME_DRILLS) {
      const g = new Chess(d.fen)
      expect(g.isGameOver(), d.id).toBe(false)
      expect(g.turn(), `${d.id} should be player to move`).toBe(d.playerColor)
    }
  })

  it('conversion drills give the player a decisive material edge', () => {
    for (const d of CONVERSION_DRILLS) {
      const g = new Chess(d.fen)
      expect(g.isGameOver(), d.id).toBe(false)
      expect(materialFor(g, d.playerColor), `${d.id} material edge`).toBeGreaterThanOrEqual(2)
    }
  })
})
