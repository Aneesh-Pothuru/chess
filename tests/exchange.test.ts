import { describe, expect, it } from 'vitest'
import { captureExchange, makeAttackCountDrill, makeExchangeDrill } from '../src/chess/exchange'
import { PUZZLE_BUCKETS } from '../src/data/puzzles'
import { Chess } from 'chess.js'

describe('captureExchange', () => {
  it('null when no capture exists on the square', () => {
    expect(captureExchange(new Chess().fen(), 'e4')).toBeNull()
  })

  it('free pawn grab is +1', () => {
    // c5 pawn takes an undefended d6 pawn.
    expect(captureExchange('4k3/8/3p4/2P5/8/8/8/4K3 w - - 0 1', 'd6')).toBe(1)
  })

  it('pawn-takes-defended-pawn is an even trade', () => {
    // cxd6 exd6: 0 net.
    expect(captureExchange('4k3/4p3/3p4/2P5/8/8/8/4K3 w - - 0 1', 'd6')).toBe(0)
  })

  it('queen taking a pawn-defended rook loses material', () => {
    // Qxd5 cxd5: rook (5) for queen (9) = -4.
    expect(captureExchange('4k3/8/2p5/3r4/8/8/3Q4/4K3 w - - 0 1', 'd5')).toBe(-4)
  })

  it('knight-for-two-pawns capture war is correctly negative', () => {
    // Nxd5 cxd5 Qxd5: White ends up trading a knight for two pawns = -1.
    // (The counting the drill teaches: the initiating side may NOT stop ahead here.)
    const fen = '4k3/8/2p5/3p4/8/4N3/3Q4/4K3 w - - 0 1'
    expect(captureExchange(fen, 'd5')).toBe(-1)
  })
})

describe('board math drill generation', () => {
  it('exchange drills generate with valid answers', () => {
    let generated = 0
    for (const p of PUZZLE_BUCKETS['fork'].slice(0, 50)) {
      const d = makeExchangeDrill(p, () => 0.5)
      if (!d) continue
      generated++
      expect(d.options.length).toBeGreaterThanOrEqual(2)
      expect(d.answerIndex).toBeGreaterThanOrEqual(0)
      expect(d.answerIndex).toBeLessThan(d.options.length)
      // The stored net must match a fresh computation.
      expect(captureExchange(d.fen, d.square)).toBe(d.net)
    }
    expect(generated).toBeGreaterThan(10)
  })

  it('attack-count drills match chess.js ground truth', () => {
    let generated = 0
    for (const p of PUZZLE_BUCKETS['hangingPiece'].slice(0, 30)) {
      const d = makeAttackCountDrill(p, () => 0.3)
      if (!d) continue
      generated++
      const game = new Chess(d.fen)
      expect(game.attackers(d.square, d.askColor).length).toBe(d.count)
      expect(d.options[d.answerIndex]).toBe(`${d.count}`)
    }
    expect(generated).toBeGreaterThan(10)
  })
})
