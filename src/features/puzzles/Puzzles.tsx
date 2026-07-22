import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Board } from '../../components/Board'
import { BUCKET_INFO, puzzlesFor } from '../../data/puzzles'
import type { RawPuzzle } from '../../chess/calculation'
import { dueKeys, newSrsState, recordResult } from '../../store/srs'
import { update, bumpWeakness, type WeaknessKey } from '../../store/profile'
import { useProfile } from '../../hooks/useProfile'
import { pickPuzzleBuckets, seededRng } from '../../store/planner'

const BUCKET_WEAKNESS: Record<string, WeaknessKey> = {
  hangingPiece: 'hangingPiece',
  fork: 'fork',
  mateIn1: 'mateThreats',
  mateIn2: 'mateThreats',
  mateIn3: 'mateThreats',
  backRankMate: 'mateThreats',
  attackingF2F7: 'f7f2',
  rookEndgame: 'endgameTechnique',
  pawnEndgame: 'endgameTechnique',
  queenEndgame: 'endgameTechnique',
}

interface Session {
  bucketId: string
  queue: RawPuzzle[]
  index: number
  solved: number
  failed: number
}

interface Active {
  puzzle: RawPuzzle
  game: Chess
  solutionUci: string[]
  step: number // next expected index into solutionUci (player plays odd steps 1,3,...)
  state: 'solving' | 'solved' | 'failed'
  message: string
  orientation: 'white' | 'black'
  lastMove: { from: string; to: string } | null
  hintSquare: string | null
}

export function Puzzles({ initialTarget }: { initialTarget?: string }) {
  const profile = useProfile()
  const [session, setSession] = useState<Session | null>(null)
  const [active, setActive] = useState<Active | null>(null)
  const solvingSince = useRef(Date.now())
  const autoStarted = useRef(false)

  useEffect(() => {
    if (initialTarget && !autoStarted.current) {
      autoStarted.current = true
      startSession(initialTarget)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTarget])

  const dailyBuckets = useMemo(() => {
    const d = new Date()
    return pickPuzzleBuckets(profile, 3, seededRng(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startSession(bucketId: string) {
    const pool = puzzlesFor(bucketId)
    const srsKeys = pool.map((p) => `puzzle:${p.id}`)
    const due = new Set(dueKeys(profile.srs, srsKeys))
    // Due-for-review first, then unseen, easiest first.
    const dueP = pool.filter((p) => due.has(`puzzle:${p.id}`) && profile.srs[`puzzle:${p.id}`])
    const unseen = pool.filter((p) => !profile.srs[`puzzle:${p.id}`]).sort((a, b) => a.rating - b.rating)
    const queue = [...dueP, ...unseen].slice(0, 12)
    if (queue.length === 0) {
      return
    }
    const s: Session = { bucketId, queue, index: 0, solved: 0, failed: 0 }
    setSession(s)
    loadPuzzle(s, 0)
  }

  function loadPuzzle(s: Session, index: number) {
    const puzzle = s.queue[index]
    const game = new Chess(puzzle.fen)
    const uci = puzzle.moves.split(' ')
    const setup = game.move({ from: uci[0].slice(0, 2), to: uci[0].slice(2, 4), promotion: uci[0][4] })
    solvingSince.current = Date.now()
    setActive({
      puzzle,
      game,
      solutionUci: uci,
      step: 1,
      state: 'solving',
      message: `${setup.san} was just played. ${game.turn() === 'w' ? 'White' : 'Black'} to move — punish it.`,
      orientation: game.turn() === 'w' ? 'white' : 'black',
      lastMove: { from: setup.from, to: setup.to },
      hintSquare: null,
    })
  }

  function finishPuzzle(pass: boolean) {
    if (!session || !active) return
    update((p) => {
      const key = `puzzle:${active.puzzle.id}`
      p.srs[key] = recordResult(p.srs[key] ?? newSrsState(), pass)
      const stats = p.puzzleStats[session.bucketId] ?? { attempts: 0, correct: 0 }
      p.puzzleStats[session.bucketId] = {
        attempts: stats.attempts + 1,
        correct: stats.correct + (pass ? 1 : 0),
      }
    })
    const wk = BUCKET_WEAKNESS[session.bucketId]
    if (wk) bumpWeakness(wk, pass ? -0.01 : 0.02)
  }

  function onMove(from: Square, to: Square, promotion?: string): boolean {
    if (!active || !session || active.state !== 'solving') return false
    const expected = active.solutionUci[active.step]
    const played = from + to + (promotion ?? '')
    const g = new Chess(active.game.fen())
    let mv
    try {
      mv = g.move({ from, to, promotion })
    } catch {
      return false
    }
    const isMatch = played === expected || played === expected?.slice(0, 4)
    // Lichess rule: on the final move, ANY checkmate counts.
    const isAltMate = g.isCheckmate()
    if (!isMatch && !isAltMate) {
      finishPuzzle(false)
      setSession({ ...session, failed: session.failed + 1 })
      setActive({
        ...active,
        state: 'failed',
        message: `${mv.san} misses it. The solution starts ${sanOf(active.game.fen(), expected)} — replay it, then move on.`,
        lastMove: { from: mv.from, to: mv.to },
        hintSquare: null,
      })
      return false
    }
    // Correct so far: play it, then the opponent's scripted reply lands after
    // the player's animation finishes.
    let step = active.step + 1
    const reply = active.solutionUci[step]
    if (isAltMate || step >= active.solutionUci.length) {
      finishPuzzle(true)
      const seconds = Math.round((Date.now() - solvingSince.current) / 1000)
      setSession({ ...session, solved: session.solved + 1 })
      setActive({
        ...active,
        game: g,
        step,
        state: 'solved',
        message: `Solved in ${seconds}s. Rating ${active.puzzle.rating}.`,
        lastMove: { from: mv.from, to: mv.to },
        hintSquare: null,
      })
      return true
    }
    const afterPlayer = new Chess(g.fen())
    setActive({
      ...active,
      game: afterPlayer,
      step,
      message: 'Keep going — find the follow-up.',
      lastMove: { from: mv.from, to: mv.to },
      hintSquare: null,
    })
    const expectedStepAfterReply = step + 1
    setTimeout(() => {
      setActive((prev) => {
        // Only apply if the puzzle is still on this exact step.
        if (!prev || prev.puzzle.id !== active.puzzle.id || prev.step !== step || prev.state !== 'solving') return prev
        const g2 = new Chess(prev.game.fen())
        const replyMv = g2.move({ from: reply.slice(0, 2) as Square, to: reply.slice(2, 4) as Square, promotion: reply[4] })
        return {
          ...prev,
          game: g2,
          step: expectedStepAfterReply,
          lastMove: { from: replyMv.from, to: replyMv.to },
        }
      })
    }, 550)
    return true
  }

  function showHint() {
    if (!active || active.state !== 'solving') return
    const expected = active.solutionUci[active.step]
    if (!expected) return
    setActive({
      ...active,
      hintSquare: expected.slice(0, 2),
      message: 'The highlighted piece makes the move. Now find its square.',
    })
  }

  function next() {
    if (!session) return
    const nextIndex = session.index + 1
    if (nextIndex >= session.queue.length) {
      setActive(null)
      setSession({ ...session, index: nextIndex })
      return
    }
    setSession({ ...session, index: nextIndex })
    loadPuzzle(session, nextIndex)
  }

  // ---------------------------------------------------------------- render

  if (!session || (!active && session.index < session.queue.length)) {
    return (
      <div>
        <div className="eyebrow">Tactics</div>
        <h1>Targeted puzzles</h1>
        <p className="muted" style={{ maxWidth: 680 }}>
          2,810 real Lichess puzzles filtered to YOUR miss profile. Today&apos;s rotation:{' '}
          {dailyBuckets.map((b) => BUCKET_INFO.find((i) => i.id === b)?.label ?? b).join(' · ')}.
          Solve to 100% certainty before you touch a piece — that is the whole discipline.
        </p>
        <div className="grid3" style={{ marginTop: '1rem' }}>
          {BUCKET_INFO.map((b) => {
            const stats = profile.puzzleStats[b.id]
            const pool = puzzlesFor(b.id)
            const isDaily = dailyBuckets.includes(b.id)
            return (
              <div key={b.id} className="panel clickable-card" onClick={() => startSession(b.id)}>
                <div className="spread">
                  <h3>{b.label}</h3>
                  {isDaily && <span className="tag accent">today</span>}
                </div>
                <p className="muted small">{b.why}</p>
                <div className="row">
                  <span className="tag">{pool.length} puzzles</span>
                  {stats && (
                    <span className="tag">
                      {stats.correct}/{stats.attempts} solved
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!active) {
    // Session complete.
    return (
      <div className="panel" style={{ maxWidth: 560 }}>
        <h2>Set complete</h2>
        <p>
          {session.solved} solved, {session.failed} missed.{' '}
          {session.failed > 0
            ? 'Missed puzzles come back on the review ladder — they are the valuable ones.'
            : 'Clean sweep. The next set gets harder.'}
        </p>
        <button className="primary" onClick={() => setSession(null)}>
          Back to buckets
        </button>
      </div>
    )
  }

  return (
    <div className="board-page">
      <div>
        <div className={active.state === 'failed' ? 'alert' : active.state === 'solved' ? 'won-banner' : 'notice'}>
          {active.message}
        </div>
        <Board
          fen={active.game.fen()}
          orientation={active.orientation}
          onMove={onMove}
          lastMove={active.lastMove}
          highlights={
            active.hintSquare ? { [active.hintSquare]: { boxShadow: 'inset 0 0 0 3px var(--gold)' } } : {}
          }
          interactive={active.state === 'solving'}
        />
        <div className="row" style={{ marginTop: '0.7rem' }}>
          {active.state === 'solving' && (
            <button onClick={showHint} disabled={!!active.hintSquare}>
              Hint
            </button>
          )}
          {active.state !== 'solving' && (
            <button className="primary" onClick={next}>
              Next puzzle
            </button>
          )}
          <span className="muted small">
            Puzzle {session.index + 1} of {session.queue.length} ·{' '}
            {BUCKET_INFO.find((i) => i.id === session.bucketId)?.label}
          </span>
        </div>
      </div>
      <div className="panel">
        <div className="eyebrow">The rule</div>
        <p className="small muted">
          In a game no one tells you a tactic exists. Before every solution ask: what did their last
          move stop defending? Checks first, then captures, then threats. When you find a good move,
          look for a better one.
        </p>
      </div>
    </div>
  )
}

function sanOf(fen: string, uci?: string): string {
  if (!uci) return '…'
  try {
    const g = new Chess(fen)
    return g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  } catch {
    return uci
  }
}
