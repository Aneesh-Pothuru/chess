import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
  backRankWeakness,
  detectFork,
  f7f2Danger,
  hangingPieces,
  judgeMove,
  mateInOneMoves,
  moveAllowsMateInOne,
  phaseOf,
  queenRaidWarning,
  scoreToCp,
  wonGameActive,
} from '../src/chess/coach'
import { pickInjectedMove } from '../src/engine/opponent'

describe('hangingPieces', () => {
  it('finds a piece attacked with zero defenders', () => {
    const out = hangingPieces('r3k3/8/8/8/N7/8/8/4K3 w - - 0 1', 'w')
    expect(out).toEqual([{ square: 'a4', piece: 'n', kind: 'free' }])
  })

  it('flags a defended piece attacked by something cheaper', () => {
    const out = hangingPieces('4k3/8/8/4p3/3Q4/2P5/8/4K3 w - - 0 1', 'w')
    expect(out.map((h) => h.square)).toContain('d4')
    expect(out[0].kind).toBe('underDefended')
  })

  it('reports nothing in the start position', () => {
    expect(hangingPieces(new Chess().fen(), 'w')).toEqual([])
    expect(hangingPieces(new Chess().fen(), 'b')).toEqual([])
  })

  it('ignores attackers that are absolutely pinned', () => {
    // Bb5 pins Nc6 to Ke8: the d4 pawn is NOT capturable.
    expect(hangingPieces('4k3/8/2n5/1B6/3P4/8/8/4K3 b - - 0 1', 'w')).toEqual([])
  })
})

describe('mate in one', () => {
  const backRank = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1'
  it('finds the back-rank mate', () => {
    expect(mateInOneMoves(backRank)).toEqual(['Ra8#'])
  })

  it('detects a move that allows mate in one', () => {
    // Qh6+Bb2 aim at g7; a pass move like ...a6 allows Qg7#.
    const fen = '6k1/p4p1p/7Q/8/8/8/1B6/4K3 b - - 0 1'
    expect(moveAllowsMateInOne(fen, 'a6')).toBe('Qg7#')
  })

  it('returns null when the move is safe', () => {
    const fen = '6k1/p4p1p/7Q/8/8/8/1B6/4K3 b - - 0 1'
    // ...f6 blocks the b2-bishop's defense of g7, so Qg7+ just loses the queen.
    expect(moveAllowsMateInOne(fen, 'f6')).toBeNull()
  })
})

describe('detectFork', () => {
  it('sees a royal knight fork', () => {
    const fork = detectFork('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'Nc7+')
    expect(fork).not.toBeNull()
    expect(fork!.bySquare).toBe('c7')
    expect(fork!.targets.sort()).toEqual(['a8', 'e8'])
  })

  it('ignores a "fork" where the forker hangs for free', () => {
    // Ne5 hits queen and rook but d6xe5 removes it for nothing.
    const fork = detectFork('6k1/3q1r2/3p4/8/8/5N2/8/4K3 w - - 0 1', 'Ne5')
    expect(fork).toBeNull()
  })

  it('a king touching defended pieces is not forking them', () => {
    const fork = detectFork('7k/2p5/1n1n4/8/1K6/8/8/8 w - - 0 1', 'Kc5')
    expect(fork).toBeNull()
  })

  it('a promotion forking defended pieces is valued as the new piece', () => {
    // g8=Q "attacks" Nd8 (defended by Ra8) and Ng5 (defended by h6 pawn):
    // queen-for-knight trades are not forks.
    const fork = detectFork('r2n4/6P1/7p/k5n1/8/8/8/7K w - - 0 1', 'g8=Q')
    expect(fork).toBeNull()
  })
})

describe('f7f2Danger', () => {
  it('fires on the fried-liver setup', () => {
    const g = new Chess()
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5']) g.move(m)
    const danger = f7f2Danger(g.fen(), 'b')
    expect(danger).not.toBeNull()
    expect(danger!.square).toBe('f7')
    expect(danger!.attackers.sort()).toEqual(['c4', 'g5'])
  })

  it('quiet in the start position', () => {
    expect(f7f2Danger(new Chess().fen(), 'b')).toBeNull()
  })
})

describe('queenRaidWarning', () => {
  it('warns when the queen raids before development', () => {
    const g = new Chess()
    for (const m of ['e4', 'e5', 'Qh5']) g.move(m)
    expect(queenRaidWarning(g.fen(), 'w')).toBe('h5')
  })

  it('silent when minors are developed', () => {
    // White queen on b5 but three minors are out (only Bc1 home).
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/1Qb1p3/2B1P3/2N2N2/PPPP1PPP/R1B1K2R w KQkq - 0 1'
    expect(queenRaidWarning(fen, 'w')).toBeNull()
  })
})

describe('backRankWeakness', () => {
  it('flags a boxed king facing a rook on an open file', () => {
    expect(backRankWeakness('3rk3/8/8/8/8/8/5PPP/6K1 w - - 0 1', 'w')).toBe(true)
  })
  it('quiet with luft', () => {
    expect(backRankWeakness('3rk3/8/8/8/8/6P1/5P1P/6K1 w - - 0 1', 'w')).toBe(false)
  })
  it('quiet in the start position (all files closed)', () => {
    expect(backRankWeakness(new Chess().fen(), 'w')).toBe(false)
    expect(backRankWeakness(new Chess().fen(), 'b')).toBe(false)
  })
  it('quiet when own rooks guard the back rank', () => {
    expect(backRankWeakness('3rk3/8/8/8/8/8/5PPP/R3R1K1 w - - 0 1', 'w')).toBe(false)
  })
})

describe('judgeMove & scores', () => {
  it('classifies a 350cp drop as blunder for White', () => {
    expect(judgeMove({ cp: 50, mate: null }, { cp: -300, mate: null }, 'w')).toBe('blunder')
  })
  it('classifies from Black perspective correctly', () => {
    expect(judgeMove({ cp: -50, mate: null }, { cp: 100, mate: null }, 'b')).toBe('mistake')
  })
  it('throwing away a mate counts as blunder', () => {
    expect(judgeMove({ cp: null, mate: 3 }, { cp: 0, mate: null }, 'w')).toBe('blunder')
  })
  it('scoreToCp orders mates above evals', () => {
    expect(scoreToCp({ cp: null, mate: 1 })).toBeGreaterThan(scoreToCp({ cp: 900, mate: null }))
    expect(scoreToCp({ cp: null, mate: -2 })).toBeLessThan(scoreToCp({ cp: -900, mate: null }))
  })
})

describe('phase & won-game', () => {
  it('start position is the opening', () => {
    expect(phaseOf(new Chess())).toBe('opening')
  })
  it('K+R vs K is an endgame', () => {
    expect(phaseOf(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 0 40'))).toBe('endgame')
  })
  it('won-game triggers on material', () => {
    expect(wonGameActive(null, '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'w')).toBe(true)
    expect(wonGameActive(null, '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'b')).toBe(false)
  })
  it('won-game triggers on eval', () => {
    expect(wonGameActive({ cp: 350, mate: null }, new Chess().fen(), 'w')).toBe(true)
    expect(wonGameActive({ cp: 350, mate: null }, new Chess().fen(), 'b')).toBe(false)
  })
})

describe('pickInjectedMove', () => {
  it('never returns a checkmating move', () => {
    const fen = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1'
    for (let i = 0; i < 50; i++) {
      const uci = pickInjectedMove(fen, () => i / 50)
      expect(uci).not.toBe('a1a8')
    }
  })
  it('returns a legal move', () => {
    const g = new Chess()
    const uci = pickInjectedMove(g.fen(), () => 0.5)
    expect(uci).toBeTruthy()
    expect(() => g.move({ from: uci!.slice(0, 2), to: uci!.slice(2, 4) })).not.toThrow()
  })
})
