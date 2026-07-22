import { describe, expect, it } from 'vitest'
import { REPERTOIRES } from '../src/data/openings'
import {
  enumerateLines,
  fenAfter,
  primaryMove,
  sampleReply,
  validateRepertoire,
  isAcceptable,
  nodeAt,
} from '../src/chess/repertoire'

describe('repertoire trees', () => {
  for (const rep of REPERTOIRES) {
    it(`${rep.id}: every line is legal and structurally sound`, () => {
      expect(validateRepertoire(rep)).toEqual([])
    })

    it(`${rep.id}: every enumerated line replays to a legal position`, () => {
      const lines = enumerateLines(rep)
      expect(lines.length).toBeGreaterThan(5)
      for (const line of lines) {
        expect(() => fenAfter(line.path)).not.toThrow()
      }
    })
  }

  it('london: primary move at root is d4', () => {
    const london = REPERTOIRES.find((r) => r.id === 'london')!
    expect(primaryMove(london, [])?.san).toBe('d4')
    expect(isAcceptable(london, [], 'd4')).toBe(true)
    expect(isAcceptable(london, [], 'e4')).toBe(false)
  })

  it('caro-kann: answers 1.e4 with c6 and knows the b2-raid answer', () => {
    const ck = REPERTOIRES.find((r) => r.id === 'caro-kann')!
    expect(primaryMove(ck, ['e4'])?.san).toBe('c6')
    const qc8 = nodeAt(ck, ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3', 'Nc6', 'c3', 'Nf6', 'Bf4', 'Bg4', 'Qb3', 'Qc8'])
    expect(qc8?.primary).toBe(true)
  })

  it('kings-indian: with a knight on c6 the endgame line recaptures on e5', () => {
    // Audited: ...Nxe4 is wrong here (Nxc6! escapes); plain recapture wins a piece.
    const kid = REPERTOIRES.find((r) => r.id === 'kings-indian')!
    const path = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5',
      'O-O', 'Nc6', 'dxe5', 'dxe5', 'Qxd8', 'Rxd8', 'Nxe5', 'Nxe5']
    expect(nodeAt(kid, path)?.primary).toBe(true)
    expect(() => fenAfter(path)).not.toThrow()
  })

  it('sampleReply returns weighted children deterministically at extremes', () => {
    const london = REPERTOIRES.find((r) => r.id === 'london')!
    const first = sampleReply(london, ['d4'], () => 0)
    expect(first?.san).toBeTruthy()
    const last = sampleReply(london, ['d4'], () => 0.9999)
    expect(last?.san).toBeTruthy()
  })
})
