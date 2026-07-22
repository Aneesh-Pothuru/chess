import { describe, expect, it } from 'vitest'
import { REPERTOIRES, repertoireById } from '../src/data/openings'
import { COURSES } from '../src/data/openings/courses'
import { fenAtStep, mainPathFrom, unitWalks } from '../src/chess/course'
import { nodeAt } from '../src/chess/repertoire'

describe('guided courses', () => {
  it('every repertoire has a course', () => {
    for (const rep of REPERTOIRES) {
      expect(COURSES[rep.id]?.length, rep.id).toBeGreaterThanOrEqual(5)
    }
  })

  for (const [repId, units] of Object.entries(COURSES)) {
    describe(repId, () => {
      const rep = repertoireById(repId)!

      it('unit ids are unique and repIds match', () => {
        const ids = units.map((u) => u.id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const u of units) expect(u.repId).toBe(repId)
      })

      for (const unit of units) {
        it(`${unit.id}: every path prefix exists in the tree`, () => {
          for (const path of unit.paths) {
            expect(nodeAt(rep, path), `missing node at [${path.join(' ')}]`).not.toBeNull()
          }
        })

        it(`${unit.id}: walks generate, replay legally, and include our moves`, () => {
          const walks = unitWalks(rep, unit)
          expect(walks.length).toBeGreaterThan(0)
          for (const walk of walks) {
            expect(walk.steps.length).toBeGreaterThan(1)
            // Full replay must be legal (fenAtStep throws otherwise).
            expect(() => fenAtStep(walk, walk.steps.length)).not.toThrow()
            expect(walk.steps.some((s) => s.ours)).toBe(true)
          }
        })
      }

      it('main paths reach leaves (no dangling walks)', () => {
        for (const unit of units) {
          for (const prefix of unit.paths) {
            const full = mainPathFrom(rep, prefix)
            expect(full.length).toBeGreaterThanOrEqual(prefix.length)
            const node = nodeAt(rep, full)
            expect(node?.children?.length ?? 0).toBe(0)
          }
        }
      })

      it('course covers a healthy share of the tree notes', () => {
        // Every unit's walks should surface at least one authored note.
        for (const unit of units) {
          const walks = unitWalks(rep, unit)
          const notes = walks.flatMap((w) => w.steps.filter((s) => s.note))
          expect(notes.length, `${unit.id} has no notes in its walks`).toBeGreaterThan(0)
        }
      })
    })
  }
})
