import { describe, expect, it } from 'vitest'
import { newestBriefing, type CoachBriefing } from '../src/lib/briefing'

const briefing = (over: Partial<CoachBriefing>): CoachBriefing => ({
  id: '2026-07-23',
  date: '2026-07-23',
  headline: 'h',
  note: 'n',
  ...over,
})

const task = { route: 'puzzles' as const, title: 't', detail: 'd' }

describe('newestBriefing', () => {
  it('returns null with no candidates', () => {
    expect(newestBriefing([])).toBeNull()
  })

  it('newer date wins regardless of order', () => {
    const older = briefing({ id: '2026-07-22', date: '2026-07-22', tasks: [task, task] })
    const newer = briefing({ id: '2026-07-23', date: '2026-07-23' })
    expect(newestBriefing([older, newer])).toBe(newer)
    expect(newestBriefing([newer, older])).toBe(newer)
  })

  it('same-day tie prefers the copy with a task list', () => {
    const legacy = briefing({ focus: { ...task } })
    const tasked = briefing({ tasks: [task] })
    expect(newestBriefing([legacy, tasked])).toBe(tasked)
  })

  it('same-day re-run ("-2" id) beats the stale copy of the original', () => {
    const original = briefing({ id: '2026-07-23', tasks: [task] })
    const rerun = briefing({ id: '2026-07-23-2', tasks: [task] })
    expect(newestBriefing([original, rerun])).toBe(rerun)
    expect(newestBriefing([rerun, original])).toBe(rerun)
  })

  it('identical candidates keep first (local) copy', () => {
    const local = briefing({ tasks: [task] })
    const remote = briefing({ tasks: [task] })
    expect(newestBriefing([local, remote])).toBe(local)
  })
})
