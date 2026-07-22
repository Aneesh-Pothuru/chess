// Board math: the counting skills behind "can I take that?" —
// capture-exchange outcomes and attacker counting, on real positions.

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Board } from '../../components/Board'
import { PUZZLE_BUCKETS } from '../../data/puzzles'
import { makeAttackCountDrill, makeExchangeDrill, type BoardMathDrill } from '../../chess/exchange'
import { update } from '../../store/profile'

export function BoardMath() {
  const [drill, setDrill] = useState<BoardMathDrill | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })

  const source = useMemo(
    () => [
      ...PUZZLE_BUCKETS['fork'],
      ...PUZZLE_BUCKETS['hangingPiece'],
      ...PUZZLE_BUCKETS['pin'],
      ...PUZZLE_BUCKETS['discoveredAttack'],
    ],
    [],
  )

  function nextDrill() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const p = source[Math.floor(Math.random() * source.length)]
      const d = Math.random() < 0.6 ? makeExchangeDrill(p) : makeAttackCountDrill(p)
      if (d) {
        setDrill(d)
        setPicked(null)
        return
      }
    }
  }

  useEffect(() => {
    nextDrill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function answer(i: number) {
    if (!drill || picked !== null) return
    setPicked(i)
    const right = i === drill.answerIndex
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }))
    update((p) => {
      const d = p.drills['board-math'] ?? { attempts: 0, successes: 0, bestMoves: null, lastAt: 0 }
      p.drills['board-math'] = {
        attempts: d.attempts + 1,
        successes: d.successes + (right ? 1 : 0),
        bestMoves: d.bestMoves,
        lastAt: Date.now(),
      }
      p.weakness.boardVision = Math.min(1, Math.max(0.05, p.weakness.boardVision + (right ? -0.01 : 0.015)))
    })
  }

  if (!drill) return <div className="panel">Loading…</div>

  const revealed = picked !== null
  const sideName = (c: 'w' | 'b') => (c === 'w' ? 'White' : 'Black')
  const highlights: Record<string, CSSProperties> = {
    [drill.square]: { boxShadow: 'inset 0 0 0 3px var(--gold)' },
  }

  const question =
    drill.kind === 'exchange'
      ? `${sideName(drill.sideToMove)} to move. If ${sideName(drill.sideToMove)} starts taking on ${drill.square} and both sides play the capture war perfectly (either side may stop), what happens?`
      : `How many ${sideName(drill.askColor)} pieces aim at ${drill.square} right now (ignore pins — count the geometry)?`

  return (
    <div className="board-page" style={{ marginTop: '0.9rem' }}>
      <div>
        <Board
          fen={drill.fen}
          orientation={drill.kind === 'exchange' ? (drill.sideToMove === 'w' ? 'white' : 'black') : 'white'}
          interactive={false}
          highlights={highlights}
        />
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          Count attackers cheapest-first: pawns take first, queens take last. That order IS the math.
        </p>
      </div>
      <div className="panel">
        <div className="eyebrow">{drill.kind === 'exchange' ? 'The capture war' : 'Attacker count'}</div>
        <p>{question}</p>
        {drill.options.map((opt, i) => (
          <button
            key={i}
            className={`option-btn ${revealed ? (i === drill.answerIndex ? 'correct' : i === picked ? 'wrong' : '') : ''}`}
            onClick={() => answer(i)}
          >
            {opt}
          </button>
        ))}
        {revealed && (
          <div className="row" style={{ marginTop: '0.8rem' }}>
            <button className="primary" onClick={nextDrill}>
              Next
            </button>
            <span className="muted small">
              {score.right}/{score.total} this session
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
