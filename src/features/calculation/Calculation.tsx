import { useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import { Board } from '../../components/Board'
import { PUZZLE_BUCKETS } from '../../data/puzzles'
import {
  makeThreatScanDrill,
  makeVisualizationDrill,
  type ThreatScanDrill,
  type VisualizationDrill,
} from '../../chess/calculation'
import { bumpWeakness, update } from '../../store/profile'
import { useProfile } from '../../hooks/useProfile'
import { latestRatings } from '../../store/stats'
import { BoardMath } from './BoardMath'
import { Coordinates } from './Coordinates'

const VIS_SOURCES = ['mateIn2', 'fork', 'discoveredAttack', 'pin']
const DEEP_SOURCES = ['mateIn3', 'mateIn2', 'discoveredAttack']

type Tab = 'visualize' | 'scan' | 'math' | 'coords'

export function Calculation() {
  const [tab, setTab] = useState<Tab>('visualize')
  return (
    <div>
      <div className="spread">
        <div>
          <div className="eyebrow">The bridge</div>
          <h1>Calculation &amp; vision</h1>
        </div>
        <div className="row">
          <button className={tab === 'visualize' ? 'primary' : ''} onClick={() => setTab('visualize')}>
            Visualization
          </button>
          <button className={tab === 'scan' ? 'primary' : ''} onClick={() => setTab('scan')}>
            Threat scan
          </button>
          <button className={tab === 'math' ? 'primary' : ''} onClick={() => setTab('math')}>
            Board math
          </button>
          <button className={tab === 'coords' ? 'primary' : ''} onClick={() => setTab('coords')}>
            Coordinates
          </button>
        </div>
      </div>
      <RatingGapIntro />
      {tab === 'visualize' && <Visualize />}
      {tab === 'scan' && <ThreatScan />}
      {tab === 'math' && <BoardMath />}
      {tab === 'coords' && <Coordinates />}
    </div>
  )
}

function RatingGapIntro() {
  const profile = useProfile()
  const live = latestRatings(profile)
  const puzzle = live?.tactics ?? 1427
  const game = live?.rating ?? 713
  return (
    <p className="muted" style={{ maxWidth: 700 }}>
      Your puzzle rating is {puzzle}; your game rating is {game}. The difference is these skills:
      seeing moves that have NOT been played yet, counting captures without touching pieces, and
      knowing every square by name — in positions where nobody told you a tactic exists.
    </p>
  )
}

// ---------------------------------------------------------------- visualization

function Visualize() {
  const [drill, setDrill] = useState<VisualizationDrill | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const [depth, setDepth] = useState<'short' | 'deep'>('short')

  function nextDrill(mode: 'short' | 'deep' = depth) {
    const sources = mode === 'deep' ? DEEP_SOURCES : VIS_SOURCES
    const minPlies = mode === 'deep' ? 4 : 2
    for (let attempt = 0; attempt < 60; attempt++) {
      const bucket = PUZZLE_BUCKETS[sources[Math.floor(Math.random() * sources.length)]]
      const p = bucket[Math.floor(Math.random() * bucket.length)]
      const d = makeVisualizationDrill(p, Math.random, mode === 'deep' ? 7 : 5)
      if (d && d.lineSan.length >= minPlies) {
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
    bumpWeakness('mateThreats', right ? -0.005 : 0.01)
    update(() => {}) // persist weakness change timestamping via profile write
  }

  if (!drill) return <div className="panel">Loading…</div>

  const revealed = picked !== null

  return (
    <div className="board-page" style={{ marginTop: '0.9rem' }}>
      <div>
        <Board
          fen={revealed ? drill.explainFen : drill.fen}
          orientation={drill.fen.includes(' w ') ? 'white' : 'black'}
          interactive={false}
        />
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          {revealed ? 'Position AFTER the line — check your mental picture against it.' : 'Position stays frozen. The line happens only in your head.'}
        </p>
      </div>
      <div>
        <div className="panel">
          <div className="eyebrow">Read this line — do not move the pieces</div>
          <div className="line-chips" style={{ margin: '0.5rem 0 0.8rem' }}>
            {drill.lineSan.map((san, i) => (
              <span key={i} className="chip">
                {san}
              </span>
            ))}
          </div>
          <p>{drill.question}</p>
          {drill.options.map((opt, i) => (
            <button
              key={i}
              className={`option-btn ${
                revealed ? (i === drill.answerIndex ? 'correct' : i === picked ? 'wrong' : '') : ''
              }`}
              onClick={() => answer(i)}
            >
              {opt}
            </button>
          ))}
          {revealed && (
            <div className="row" style={{ marginTop: '0.8rem' }}>
              <button className="primary" onClick={() => nextDrill()}>
                Next drill
              </button>
              <span className="muted small">
                {score.right}/{score.total} this session
              </span>
            </div>
          )}
          <div className="row" style={{ marginTop: '0.8rem' }}>
            <span className="small muted">Line length:</span>
            <button
              className={depth === 'short' ? 'primary' : 'ghost'}
              onClick={() => {
                setDepth('short')
                nextDrill('short')
              }}
            >
              Short (2-5)
            </button>
            <button
              className={depth === 'deep' ? 'primary' : 'ghost'}
              onClick={() => {
                setDepth('deep')
                nextDrill('deep')
              }}
            >
              Deep (4-7)
            </button>
            <span className="small muted">Long-term vision = holding longer lines. Move up once short lines feel easy.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- threat scan

const SCAN_SECONDS = 12

function ThreatScan() {
  const [drill, setDrill] = useState<ThreatScanDrill | null>(null)
  const [found, setFound] = useState<Set<string>>(new Set())
  const [misses, setMisses] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(SCAN_SECONDS)
  const [state, setState] = useState<'scanning' | 'done'>('scanning')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const source = useMemo(() => [...PUZZLE_BUCKETS['hangingPiece'], ...PUZZLE_BUCKETS['fork']], [])

  function nextDrill() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const p = source[Math.floor(Math.random() * source.length)]
      const d = makeThreatScanDrill(p)
      if (d) {
        setDrill(d)
        setFound(new Set())
        setMisses(0)
        setSecondsLeft(SCAN_SECONDS)
        setState('scanning')
        return
      }
    }
  }

  useEffect(() => {
    nextDrill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state !== 'scanning' || !drill) return
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setState('done')
          bumpWeakness('hangingPiece', 0.01)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state, drill])

  function clickSquare(sq: Square) {
    if (!drill || state !== 'scanning') return
    if (drill.targets.includes(sq)) {
      const next = new Set(found)
      next.add(sq)
      setFound(next)
      if (next.size === drill.targets.length) {
        setState('done')
        bumpWeakness('hangingPiece', -0.01)
        update(() => {})
      }
    } else {
      setMisses((m) => m + 1)
    }
  }

  if (!drill) return <div className="panel">Loading…</div>

  const highlights: Record<string, React.CSSProperties> = {}
  for (const sq of found) highlights[sq] = { boxShadow: 'inset 0 0 0 3px var(--laurel)' }
  if (state === 'done') {
    for (const sq of drill.targets) {
      if (!found.has(sq)) highlights[sq] = { boxShadow: 'inset 0 0 0 3px var(--claret)' }
    }
  }

  return (
    <div className="board-page" style={{ marginTop: '0.9rem' }}>
      <div>
        <div className={state === 'done' && found.size === drill.targets.length ? 'won-banner' : 'notice'}>
          {state === 'scanning' ? (
            <>
              <strong>{secondsLeft}s.</strong> {drill.sideToMove === 'w' ? 'White' : 'Black'} to move —
              click every loose enemy piece ({found.size}/{drill.targets.length} found
              {misses > 0 ? `, ${misses} wrong clicks` : ''}).
            </>
          ) : found.size === drill.targets.length ? (
            <>All targets found. This exact scan, every move of every game.</>
          ) : (
            <>Time. Red = what you missed — the pieces that decide games at your level.</>
          )}
        </div>
        <Board
          fen={drill.fen}
          orientation={drill.sideToMove === 'w' ? 'white' : 'black'}
          interactive={false}
          onSquareClick={clickSquare}
          highlights={highlights}
        />
        {state === 'done' && (
          <div className="row" style={{ marginTop: '0.7rem' }}>
            <button className="primary" onClick={nextDrill}>
              Next scan
            </button>
          </div>
        )}
      </div>
      <div className="panel">
        <div className="eyebrow">Why this drill</div>
        <p className="small muted">
          129 pieces left hanging across your games — and your opponents hang just as many. Twelve
          seconds is generous: in a real game this scan should take five. Loose pieces first, then
          checks, then captures, then threats.
        </p>
      </div>
    </div>
  )
}
