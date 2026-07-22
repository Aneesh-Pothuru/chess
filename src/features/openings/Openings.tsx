import { useMemo, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Board } from '../../components/Board'
import { REPERTOIRES } from '../../data/openings'
import type { RepNode, Repertoire } from '../../data/openings/types'
import {
  childrenAt,
  enumerateLines,
  nodeAt,
  primaryMove,
  isAcceptable,
  sampleReply,
} from '../../chess/repertoire'
import { dueKeys, newSrsState, recordResult } from '../../store/srs'
import { update } from '../../store/profile'
import { useProfile } from '../../hooks/useProfile'
import { courseFor, type CourseUnit } from '../../data/openings/courses'
import { fenAtStep, lastMoveAtStep, unitWalks, type LessonWalk } from '../../chess/course'

type Mode = 'course' | 'browse' | 'learn' | 'drill'

export function Openings({ initialTarget }: { initialTarget?: string }) {
  const [repId, setRepId] = useState<string | null>(initialTarget ?? null)
  const [mode, setMode] = useState<Mode>('course')
  const rep = REPERTOIRES.find((r) => r.id === repId) ?? null

  if (!rep) {
    return (
      <div>
        <div className="eyebrow">Opening lab</div>
        <h1>Your repertoire</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          Three openings, learned properly: the London as White, the Caro-Kann against 1.e4, the
          King&apos;s Indian against everything else. The format is generic — more openings can be
          added later, but these three come first.
        </p>
        <div className="grid3" style={{ marginTop: '1rem' }}>
          {REPERTOIRES.map((r) => (
            <RepCard key={r.id} rep={r} onOpen={() => setRepId(r.id)} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="spread">
        <div>
          <div className="eyebrow">Opening lab</div>
          <h1>{rep.name}</h1>
        </div>
        <div className="row">
          <button className={mode === 'course' ? 'primary' : ''} onClick={() => setMode('course')}>
            Course
          </button>
          <button className={mode === 'browse' ? 'primary' : ''} onClick={() => setMode('browse')}>
            Ideas
          </button>
          <button className={mode === 'learn' ? 'primary' : ''} onClick={() => setMode('learn')}>
            Explore lines
          </button>
          <button className={mode === 'drill' ? 'primary' : ''} onClick={() => setMode('drill')}>
            Drill
          </button>
          <button className="ghost" onClick={() => { setRepId(null); setMode('course') }}>
            ← All openings
          </button>
        </div>
      </div>
      {mode === 'course' && <Course rep={rep} />}
      {mode === 'browse' && <Ideas rep={rep} />}
      {mode === 'learn' && <Learn rep={rep} />}
      {mode === 'drill' && <Drill rep={rep} />}
    </div>
  )
}

// ---------------------------------------------------------------- Course

function Course({ rep }: { rep: Repertoire }) {
  const profile = useProfile()
  const units = courseFor(rep.id)
  const [unitId, setUnitId] = useState<string | null>(null)
  const unit = units.find((u) => u.id === unitId) ?? null

  if (unit) {
    return (
      <UnitLesson
        rep={rep}
        unit={unit}
        onExit={() => setUnitId(null)}
        onNext={() => {
          const i = units.findIndex((u) => u.id === unit.id)
          setUnitId(units[i + 1]?.id ?? null)
        }}
        hasNext={units.findIndex((u) => u.id === unit.id) < units.length - 1}
      />
    )
  }

  const doneCount = units.filter((u) => (profile.drills[`lesson:${u.id}`]?.successes ?? 0) > 0).length
  return (
    <div style={{ marginTop: '0.9rem' }}>
      <p className="muted" style={{ maxWidth: 680 }}>
        The guided course: each lesson walks a variation move by move with the coach narrating, then
        you replay the main line yourself. Work top to bottom — {doneCount}/{units.length} complete.
      </p>
      <div className="grid2" style={{ marginTop: '0.8rem' }}>
        {units.map((u, i) => {
          const prog = profile.drills[`lesson:${u.id}`]
          const done = (prog?.successes ?? 0) > 0
          return (
            <div key={u.id} className="clickable-card panel" onClick={() => setUnitId(u.id)}>
              <div className="spread">
                <h3>
                  <span style={{ color: 'var(--sienna)', marginRight: 8 }}>{i + 1}.</span>
                  {u.title}
                </h3>
                {done ? (
                  <span className="tag good">done{prog!.bestMoves === 0 ? ' · clean' : ''}</span>
                ) : (
                  <span className="tag">start</span>
                )}
              </div>
              <p className="muted small">{u.intro.split('. ').slice(0, 1).join('. ')}.</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type LessonPhase = 'watch' | 'try' | 'done'

function UnitLesson({
  rep,
  unit,
  onExit,
  onNext,
  hasNext,
}: {
  rep: Repertoire
  unit: CourseUnit
  onExit: () => void
  onNext: () => void
  hasNext: boolean
}) {
  const walks = useMemo(() => unitWalks(rep, unit), [rep, unit])
  const [phase, setPhase] = useState<LessonPhase>('watch')
  const [walkIdx, setWalkIdx] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [tryStep, setTryStep] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [tryMsg, setTryMsg] = useState('')

  const walk: LessonWalk = walks[Math.min(walkIdx, walks.length - 1)]
  const main = walks[0]

  // ---------------- watch phase helpers
  const watchFen = useMemo(() => fenAtStep(walk, stepIdx), [walk, stepIdx])
  const watchLast = useMemo(() => lastMoveAtStep(walk, stepIdx), [walk, stepIdx])
  const currentStep = stepIdx > 0 ? walk.steps[stepIdx - 1] : null
  const atWalkEnd = stepIdx >= walk.steps.length

  function nextWatch() {
    if (!atWalkEnd) {
      setStepIdx(stepIdx + 1)
    } else if (walkIdx < walks.length - 1) {
      setWalkIdx(walkIdx + 1)
      setStepIdx(0)
    } else {
      startTry()
    }
  }

  function startTry() {
    setPhase('try')
    setTryStep(0)
    setMistakes(0)
    setTryMsg('Your turn: play the main line from move one. The board plays the other side.')
    // If the opponent moves first (Black repertoires), roll their opening plies in.
    scheduleOpponentPlies(0)
  }

  function scheduleOpponentPlies(fromStep: number) {
    let i = fromStep
    while (i < main.steps.length && !main.steps[i].ours) i++
    if (i > fromStep) {
      setTimeout(() => setTryStep((prev) => (prev === fromStep ? i : prev)), 550)
    }
  }

  const tryFen = useMemo(() => fenAtStep(main, tryStep), [main, tryStep])
  const tryLast = useMemo(() => lastMoveAtStep(main, tryStep), [main, tryStep])

  function onTryMove(from: Square, to: Square, promotion?: string): boolean {
    if (phase !== 'try' || tryStep >= main.steps.length) return false
    const expected = main.steps[tryStep]
    if (!expected.ours) return false
    const g = new Chess(tryFen)
    const exp = g.move(expected.san)
    g.undo()
    if (exp.from !== from || exp.to !== to || (exp.promotion ?? undefined) !== (promotion ?? undefined)) {
      setMistakes((m) => m + 1)
      setTryMsg(`Not that one — the lesson plays ${expected.label}${expected.note ? ` — ${expected.note}` : '.'} Try it.`)
      return false
    }
    const nextStep = tryStep + 1
    setTryStep(nextStep)
    setTryMsg(expected.note ?? `${expected.label} — exactly.`)
    if (nextStep >= main.steps.length) {
      finishTry()
    } else {
      scheduleOpponentPlies(nextStep)
      // If the remaining steps are all opponent plies ending the line, finish after they roll in.
      if (main.steps.slice(nextStep).every((s) => !s.ours)) {
        setTimeout(() => finishTry(), 700)
      }
    }
    return true
  }

  function finishTry() {
    setPhase('done')
    update((p) => {
      const key = `lesson:${unit.id}`
      const d = p.drills[key] ?? { attempts: 0, successes: 0, bestMoves: null, lastAt: 0 }
      p.drills[key] = {
        attempts: d.attempts + 1,
        successes: d.successes + 1,
        bestMoves: d.bestMoves === null ? mistakes : Math.min(d.bestMoves, mistakes),
        lastAt: Date.now(),
      }
      p.srs[main.key] = recordResult(p.srs[main.key] ?? newSrsState(), mistakes === 0)
    })
  }

  const orientation = rep.color === 'w' ? 'white' : 'black'

  return (
    <div className="board-page" style={{ marginTop: '0.9rem' }}>
      <div>
        <div className="coach-strip">
          {phase === 'watch' ? (
            <div className={currentStep?.note ? 'notice' : 'coach-tip'}>
              {currentStep ? (
                <>
                  <strong className="mono">{currentStep.label}</strong>
                  {currentStep.note ? ` — ${currentStep.note}` : currentStep.ours ? ' — your move in this line.' : ''}
                </>
              ) : (
                <span className="muted">
                  {walk.title} · press Next to step through. Notes appear as moves land.
                </span>
              )}
            </div>
          ) : phase === 'try' ? (
            <div className="notice">{tryMsg}</div>
          ) : (
            <div className="won-banner">
              <strong>
                Lesson complete{mistakes === 0 ? ' — clean run!' : ` — ${mistakes} slip${mistakes === 1 ? '' : 's'}, worth one more pass someday.`}
              </strong>{' '}
              This line is now in your spaced-repetition queue.
            </div>
          )}
        </div>
        <Board
          fen={phase === 'watch' ? watchFen : tryFen}
          orientation={orientation}
          onMove={phase === 'try' ? onTryMove : undefined}
          lastMove={phase === 'watch' ? watchLast : tryLast}
          interactive={phase === 'try'}
        />
        <div className="row" style={{ marginTop: '0.7rem' }}>
          {phase === 'watch' && (
            <>
              <button onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}>
                ← Back
              </button>
              <button className="primary" onClick={nextWatch}>
                {!atWalkEnd ? 'Next →' : walkIdx < walks.length - 1 ? `Next: ${walks[walkIdx + 1].title}` : 'Your turn →'}
              </button>
              <button className="ghost" onClick={startTry}>
                Skip to Your turn
              </button>
              <span className="muted small">
                {walk.title} · {stepIdx}/{walk.steps.length}
              </span>
            </>
          )}
          {phase === 'try' && (
            <span className="muted small">
              Replaying the main line · move {Math.ceil((tryStep + 1) / 2)} · {mistakes} slip{mistakes === 1 ? '' : 's'}
            </span>
          )}
          {phase === 'done' && (
            <>
              {hasNext && (
                <button className="primary" onClick={onNext}>
                  Next lesson →
                </button>
              )}
              <button onClick={onExit}>Back to course</button>
              <button className="ghost" onClick={() => { setPhase('watch'); setWalkIdx(0); setStepIdx(0) }}>
                Rewatch
              </button>
            </>
          )}
          <button className="ghost" onClick={onExit} style={{ marginLeft: 'auto' }}>
            ✕ Exit
          </button>
        </div>
      </div>
      <div className="panel">
        <div className="eyebrow">{unit.title}</div>
        <p className="small">{unit.intro}</p>
        {phase === 'watch' && walks.length > 1 && (
          <>
            <div className="eyebrow" style={{ marginTop: '0.8rem' }}>Lines in this lesson</div>
            {walks.map((w, i) => (
              <button
                key={w.key}
                className={`option-btn ${i === walkIdx ? 'correct' : ''}`}
                onClick={() => {
                  setWalkIdx(i)
                  setStepIdx(0)
                }}
              >
                {w.title} ({Math.ceil(w.steps.length / 2)} moves)
              </button>
            ))}
          </>
        )}
        {phase !== 'watch' && (
          <p className="muted small" style={{ marginTop: '0.6rem' }}>
            The replay uses the main line. Sidelines come back in the Drill with spaced repetition.
          </p>
        )}
      </div>
    </div>
  )
}

function RepCard({ rep, onOpen }: { rep: Repertoire; onOpen: () => void }) {
  const profile = useProfile()
  const lines = useMemo(() => enumerateLines(rep), [rep])
  const due = dueKeys(profile.srs, lines.map((l) => l.key)).length
  return (
    <div className="panel clickable-card" onClick={onOpen}>
      <h3>{rep.name}</h3>
      <p className="muted small">{rep.keyIdeas[0]}</p>
      <div className="row">
        <span className="tag">{lines.length} lines</span>
        <span className={`tag ${due > 0 ? 'accent' : 'good'}`}>{due} due</span>
      </div>
    </div>
  )
}

function Ideas({ rep }: { rep: Repertoire }) {
  return (
    <div className="grid2" style={{ marginTop: '0.9rem' }}>
      <div className="panel">
        <div className="eyebrow">Key ideas</div>
        <ul>
          {rep.keyIdeas.map((idea, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>
              {idea}
            </li>
          ))}
        </ul>
      </div>
      <div className="panel">
        <div className="eyebrow">Watch for</div>
        <ul>
          {rep.watchFor.map((w, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>
              {w}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Explore

function lastMoveOf(game: Chess): { from: string; to: string } | null {
  const h = game.history({ verbose: true })
  const tail = h[h.length - 1]
  return tail ? { from: tail.from, to: tail.to } : null
}

function Learn({ rep }: { rep: Repertoire }) {
  const [path, setPath] = useState<string[]>([])
  const game = useMemo(() => {
    const g = new Chess()
    for (const san of path) g.move(san)
    return g
  }, [path])
  const node = nodeAt(rep, path)
  const options = childrenAt(rep, path)
  const playerToMove = game.turn() === rep.color

  function advance(child: RepNode) {
    setPath([...path, child.san])
  }

  return (
    <div className="board-page" style={{ marginTop: '0.9rem' }}>
      <Board
        fen={game.fen()}
        orientation={rep.color === 'w' ? 'white' : 'black'}
        lastMove={lastMoveOf(game)}
        interactive={false}
      />
      <div>
        <div className="panel">
          <div className="eyebrow">{path.length === 0 ? 'Start' : path.join(' ')}</div>
          {node?.note && <p>{node.note}</p>}
          {options.length === 0 && (
            <p className="muted">
              End of the book line. From here: principles — improve your worst piece, keep the scan
              running.
            </p>
          )}
          {options.length > 0 && playerToMove && (
            <>
              <p className="muted small">Your move here:</p>
              <div className="row">
                {options.map((c) => (
                  <button
                    key={c.san}
                    className={c.primary ? 'primary' : ''}
                    onClick={() => advance(c)}
                  >
                    {c.san}
                    {c.alsoOk ? ' (ok too)' : ''}
                  </button>
                ))}
              </div>
            </>
          )}
          {options.length > 0 && !playerToMove && (
            <>
              <p className="muted small">They might play:</p>
              <div className="row">
                {options.map((c) => (
                  <button key={c.san} onClick={() => advance(c)}>
                    {c.san}
                    {c.name ? ` — ${c.name}` : ''}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="row" style={{ marginTop: '0.8rem' }}>
            <button className="ghost" onClick={() => setPath(path.slice(0, -1))} disabled={path.length === 0}>
              ← Back
            </button>
            <button className="ghost" onClick={() => setPath([])} disabled={path.length === 0}>
              Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Drill

interface DrillState {
  lineKey: string | null
  path: string[]
  feedback: { kind: 'good' | 'bad'; text: string } | null
  finished: boolean
  failed: boolean
}

function Drill({ rep }: { rep: Repertoire }) {
  const profile = useProfile()
  const lines = useMemo(() => enumerateLines(rep), [rep])
  const due = useMemo(
    () => dueKeys(profile.srs, lines.map((l) => l.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rep, profile.srs],
  )
  const [drill, setDrill] = useState<DrillState>({ lineKey: null, path: [], feedback: null, finished: false, failed: false })

  const game = useMemo(() => {
    const g = new Chess()
    for (const san of drill.path) g.move(san)
    return g
  }, [drill.path])

  function startDrill() {
    const key = due[0] ?? lines[Math.floor(Math.random() * lines.length)].key
    let path: string[] = []
    // If the player is Black, the opponent's first move comes from the drilled line.
    const linePath = lines.find((l) => l.key === key)?.path ?? []
    if (rep.color === 'b' && linePath.length > 0) path = [linePath[0]]
    setDrill({ lineKey: key, path, feedback: null, finished: false, failed: false })
  }

  function lineFor(key: string): string[] {
    return lines.find((l) => l.key === key)?.path ?? []
  }

  function opponentAdvance(path: string[], lineKey: string): string[] {
    // Follow the drilled line where it applies; otherwise sample by weight.
    const linePath = lineFor(lineKey)
    const matchesLine = path.every((san, i) => linePath[i] === san)
    const nextFromLine = matchesLine ? linePath[path.length] : undefined
    if (nextFromLine && nodeAt(rep, [...path, nextFromLine])) return [...path, nextFromLine]
    const reply = sampleReply(rep, path)
    return reply ? [...path, reply.san] : path
  }

  function onMove(from: Square, to: Square, promotion?: string): boolean {
    if (drill.finished || !drill.lineKey) return false
    const g = new Chess(game.fen())
    let san: string
    try {
      san = g.move({ from, to, promotion }).san
    } catch {
      return false
    }
    if (!isAcceptable(rep, drill.path, san)) {
      const book = primaryMove(rep, drill.path)
      recordDrillResult(drill.lineKey, false)
      setDrill({
        ...drill,
        feedback: {
          kind: 'bad',
          text: `${san} is off-book. The repertoire plays ${book?.san ?? '…'}${book?.note ? ` — ${book.note}` : '.'} Line marked for review.`,
        },
        failed: true,
        finished: true,
      })
      return false
    }
    const nextPath = [...drill.path, san]
    const node = nodeAt(rep, nextPath)
    const noteText = node?.note
    // Opponent replies from the line (or weighted sample).
    const options = childrenAt(rep, nextPath)
    if (options.length === 0) {
      recordDrillResult(drill.lineKey, true)
      setDrill({
        lineKey: drill.lineKey,
        path: nextPath,
        feedback: { kind: 'good', text: noteText ?? 'Line complete. Scheduled for spaced review.' },
        finished: true,
        failed: false,
      })
      return true
    }
    const replyPath = opponentAdvance(nextPath, drill.lineKey)
    const stillHasChildren = childrenAt(rep, replyPath).length > 0
    if (!stillHasChildren) recordDrillResult(drill.lineKey, true)
    // Show the player's move first; the book reply lands after the animation.
    setDrill({
      lineKey: drill.lineKey,
      path: nextPath,
      feedback: noteText ? { kind: 'good', text: noteText } : null,
      finished: false,
      failed: false,
    })
    setTimeout(() => {
      setDrill((prev) => {
        if (prev.lineKey !== drill.lineKey || prev.finished || prev.path.join(' ') !== nextPath.join(' ')) {
          return prev
        }
        return { ...prev, path: replyPath, finished: !stillHasChildren }
      })
    }, 550)
    return true
  }

  function recordDrillResult(key: string, pass: boolean) {
    update((p) => {
      p.srs[key] = recordResult(p.srs[key] ?? newSrsState(), pass)
    })
  }

  if (!drill.lineKey) {
    return (
      <div className="panel" style={{ marginTop: '0.9rem', maxWidth: 560 }}>
        <h2>Drill the {rep.name.split(' ')[0]}</h2>
        <p className="muted">
          The board plays the opponent&apos;s side; you must produce the repertoire move. Wrong moves
          fail the line and schedule it for review — that is the system working, not a problem.
        </p>
        <p>
          <span className={`tag ${due.length > 0 ? 'accent' : 'good'}`}>{due.length} lines due</span>{' '}
          <span className="tag">{lines.length} total</span>
        </p>
        <button className="primary" onClick={startDrill}>
          Start drill
        </button>
      </div>
    )
  }

  return (
    <div className="board-page" style={{ marginTop: '0.9rem' }}>
      <div>
        <div className="coach-strip">
          {drill.feedback ? (
            <div className={drill.feedback.kind === 'good' ? 'won-banner' : 'alert'}>{drill.feedback.text}</div>
          ) : (
            <div className="coach-tip">
              <span className="muted">Play your repertoire move. Notes appear here as the line unfolds.</span>
            </div>
          )}
        </div>
        <Board
          fen={game.fen()}
          orientation={rep.color === 'w' ? 'white' : 'black'}
          onMove={onMove}
          lastMove={lastMoveOf(game)}
          interactive={!drill.finished && game.turn() === rep.color}
        />
        <div className="row" style={{ marginTop: '0.7rem' }}>
          {drill.finished ? (
            <button className="primary" onClick={startDrill}>
              Next line
            </button>
          ) : (
            <span className="muted small">Play your repertoire move.</span>
          )}
          <span className="mono small muted">{drill.path.join(' ')}</span>
        </div>
      </div>
      <div className="panel">
        <div className="eyebrow">How this works</div>
        <p className="small muted">
          Lines you get right come back on the ladder: 4h → 1d → 3d → 1w → 2w → 1mo. Lines you miss
          come back immediately. Master the {rep.color === 'b' ? 'Black' : 'White'} side of every
          branch and the opening phase stops costing you games.
        </p>
      </div>
    </div>
  )
}
