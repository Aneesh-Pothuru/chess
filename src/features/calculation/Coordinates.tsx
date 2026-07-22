// Coordinate sprint: the named square flashes, click it. Trains instant
// square-name recognition from BOTH sides of the board — the foundation for
// reading lines, coach notes, and books at speed.

import { useEffect, useRef, useState } from 'react'
import { update } from '../../store/profile'
import { useProfile } from '../../hooks/useProfile'

const SPRINT_SECONDS = 30
const FILES = 'abcdefgh'

function randomSquare(rng: () => number = Math.random): string {
  return FILES[Math.floor(rng() * 8)] + (1 + Math.floor(rng() * 8))
}

export function Coordinates() {
  const profile = useProfile()
  const [asBlack, setAsBlack] = useState(false)
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [target, setTarget] = useState(randomSquare())
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS)
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const best = profile.drills['coord-sprint']?.bestMoves ?? null

  useEffect(() => {
    if (state !== 'running') return
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setState('done')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state])

  // Persist the run once when it finishes.
  const recordedRef = useRef(false)
  useEffect(() => {
    if (state === 'done' && !recordedRef.current) {
      recordedRef.current = true
      update((p) => {
        const d = p.drills['coord-sprint'] ?? { attempts: 0, successes: 0, bestMoves: null, lastAt: 0 }
        p.drills['coord-sprint'] = {
          attempts: d.attempts + 1,
          successes: d.successes + (score > 0 ? 1 : 0),
          bestMoves: Math.max(d.bestMoves ?? 0, score),
          lastAt: Date.now(),
        }
        p.weakness.coordinates = Math.min(1, Math.max(0.05, p.weakness.coordinates + (score >= 20 ? -0.02 : 0.01)))
      })
    }
    if (state === 'running') recordedRef.current = false
  }, [state, score])

  function start() {
    setScore(0)
    setMisses(0)
    setSecondsLeft(SPRINT_SECONDS)
    setTarget(randomSquare())
    setState('running')
  }

  function clickSquare(square: string) {
    if (state !== 'running') return
    if (square === target) {
      setScore((s) => s + 1)
      setFlash('hit')
      setTarget((prev) => {
        let next = randomSquare()
        while (next === prev) next = randomSquare()
        return next
      })
    } else {
      setMisses((m) => m + 1)
      setFlash('miss')
    }
    setTimeout(() => setFlash(null), 150)
  }

  // Render our own quiet 8x8 grid: no pieces, no printed coordinates.
  const ranks = asBlack ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]
  const files = asBlack ? [...FILES].reverse() : [...FILES]

  return (
    <div className="board-page" style={{ marginTop: '0.9rem' }}>
      <div>
        <div className={state === 'done' ? 'won-banner' : 'notice'}>
          {state === 'idle' && <>30-second sprint. A square name appears — click it. No printed coordinates to lean on.</>}
          {state === 'running' && (
            <>
              <strong style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }}>{target}</strong>
              {'  ·  '}
              {secondsLeft}s · {score} hit{score === 1 ? '' : 's'}
              {misses > 0 ? ` · ${misses} misses` : ''}
            </>
          )}
          {state === 'done' && (
            <>
              <strong>{score} squares in {SPRINT_SECONDS}s</strong> ({misses} misses).{' '}
              {best !== null && score > best
                ? 'New personal best!'
                : best !== null
                  ? `Best: ${Math.max(best, score)}.`
                  : ''}{' '}
              {score >= 25 ? 'Master level.' : score >= 18 ? 'Solid — push for 25.' : 'Target 18+ to make square names automatic.'}
            </>
          )}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            maxWidth: 480,
            aspectRatio: '1',
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
            outline: flash === 'hit' ? '3px solid var(--laurel)' : flash === 'miss' ? '3px solid var(--claret)' : 'none',
          }}
        >
          {ranks.map((r) =>
            files.map((f) => {
              const dark = (FILES.indexOf(f) + r) % 2 === 0
              return (
                <button
                  key={`${f}${r}`}
                  onClick={() => clickSquare(`${f}${r}`)}
                  aria-label={`${f}${r}`}
                  style={{
                    border: 'none',
                    borderRadius: 0,
                    padding: 0,
                    cursor: state === 'running' ? 'pointer' : 'default',
                    background: dark ? 'var(--board-dark)' : 'var(--board-light)',
                  }}
                />
              )
            }),
          )}
        </div>
        <div className="row" style={{ marginTop: '0.7rem' }}>
          <button className="primary" onClick={start}>
            {state === 'running' ? 'Restart' : 'Start sprint'}
          </button>
          <label className="small muted">
            <input type="checkbox" checked={asBlack} onChange={(e) => setAsBlack(e.target.checked)} /> from
            Black&apos;s side
          </label>
          {best !== null && <span className="tag good">best {best}</span>}
        </div>
      </div>
      <div className="panel">
        <div className="eyebrow">Why this drill</div>
        <p className="small muted">
          Every skill upstream — reading lines, remembering openings, spotting back-rank ideas —
          runs on instant square recognition. Train from Black&apos;s side too: half your games are
          played upside down.
        </p>
      </div>
    </div>
  )
}
