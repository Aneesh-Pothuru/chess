import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Board } from '../../components/Board'
import { ENDGAME_DRILLS, STAGE_NAMES, type EndgameDrill } from '../../data/endgames'
import { CONVERSION_DRILLS, type ConversionDrill } from '../../data/conversion'
import { getAnalyst, getOpponent } from '../../engine/instances'
import { opponentMove } from '../../engine/opponent'
import { presetById } from '../../engine/presets'
import { opponentMobility } from '../../chess/coach'
import { update, bumpWeakness } from '../../store/profile'
import { useProfile } from '../../hooks/useProfile'

type RunnerConfig = {
  id: string
  title: string
  fen: string
  playerColor: 'w' | 'b'
  goal: 'mate' | 'promote' | 'draw'
  moveTarget: number
  lesson: string
  trap?: string
  /** 'full' = perfect defense (mate drills); 'challenger' = beatable resistance. */
  defense: 'full' | 'challenger'
}

export function Endgame({ initialTarget }: { initialTarget?: string }) {
  const [config, setConfig] = useState<RunnerConfig | null>(null)
  const [tab, setTab] = useState<'endgame' | 'conversion'>(initialTarget === 'conversion' ? 'conversion' : 'endgame')
  const profile = useProfile()

  if (config) {
    return <DrillRunner config={config} onExit={() => setConfig(null)} />
  }

  const fromEndgame = (d: EndgameDrill): RunnerConfig => ({
    id: d.id, title: d.title, fen: d.fen, playerColor: d.playerColor, goal: d.goal,
    moveTarget: d.moveTarget, lesson: d.lesson, trap: d.trap, defense: 'full',
  })
  const fromConversion = (d: ConversionDrill): RunnerConfig => ({
    id: `conv-${d.id}`, title: d.title, fen: d.fen, playerColor: d.playerColor, goal: 'mate',
    moveTarget: 60, lesson: `${d.edge} ${d.plan}`, defense: 'challenger',
  })

  return (
    <div>
      <div className="spread">
        <div>
          <div className="eyebrow">The conversion gym</div>
          <h1>Endgames &amp; won positions</h1>
        </div>
        <div className="row">
          <button className={tab === 'endgame' ? 'primary' : ''} onClick={() => setTab('endgame')}>
            Technique curriculum
          </button>
          <button className={tab === 'conversion' ? 'primary' : ''} onClick={() => setTab('conversion')}>
            Convert won games
          </button>
        </div>
      </div>
      <p className="muted" style={{ maxWidth: 680 }}>
        {tab === 'endgame'
          ? 'The curriculum, in order. Mate drills are against PERFECT defense — if your technique has a hole, the engine will find it. Beat the move target without stalemating.'
          : 'You lose 62% of endgame-decided games and have thrown away whole-queen leads. These are winning positions; your only job is the full point. Trade pieces, scan for mate, slow down.'}
      </p>
      <div className="grid3" style={{ marginTop: '1rem' }}>
        {tab === 'endgame' &&
          ENDGAME_DRILLS.map((d) => {
            const prog = profile.drills[d.id]
            return (
              <div key={d.id} className="panel clickable-card" onClick={() => setConfig(fromEndgame(d))}>
                <div className="eyebrow">Stage {d.stage} · {STAGE_NAMES[d.stage]}</div>
                <h3>{d.title}</h3>
                <div className="row">
                  <span className="tag">{d.goal} in ≤ {d.moveTarget}</span>
                  {prog && prog.successes > 0 && (
                    <span className="tag good">
                      done ×{prog.successes}{prog.bestMoves ? ` · best ${prog.bestMoves}` : ''}
                    </span>
                  )}
                  {prog && prog.successes === 0 && <span className="tag bad">0/{prog.attempts}</span>}
                </div>
              </div>
            )
          })}
        {tab === 'conversion' &&
          CONVERSION_DRILLS.map((d) => {
            const prog = profile.drills[`conv-${d.id}`]
            return (
              <div key={d.id} className="panel clickable-card" onClick={() => setConfig(fromConversion(d))}>
                <h3>{d.title}</h3>
                <p className="muted small">{d.edge}</p>
                <div className="row">
                  {prog && prog.successes > 0 && <span className="tag good">converted ×{prog.successes}</span>}
                  {prog && prog.attempts > prog.successes && (
                    <span className="tag bad">{prog.attempts - prog.successes} failed</span>
                  )}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- runner

function DrillRunner({ config, onExit }: { config: RunnerConfig; onExit: () => void }) {
  const gameRef = useRef(new Chess(config.fen))
  const [fen, setFen] = useState(config.fen)
  const [state, setState] = useState<'playing' | 'success' | 'failed'>('playing')
  const [message, setMessage] = useState('')
  const [playerMoves, setPlayerMoves] = useState(0)
  const [thinking, setThinking] = useState(false)
  const genRef = useRef(0)

  const record = useCallback(
    (success: boolean, moves: number) => {
      update((p) => {
        const d = p.drills[config.id] ?? { attempts: 0, successes: 0, bestMoves: null, lastAt: 0 }
        p.drills[config.id] = {
          attempts: d.attempts + 1,
          successes: d.successes + (success ? 1 : 0),
          bestMoves: success ? Math.min(d.bestMoves ?? Infinity, moves) : d.bestMoves,
          lastAt: Date.now(),
        }
      })
      bumpWeakness(config.defense === 'challenger' ? 'conversion' : 'endgameTechnique', success ? -0.03 : 0.03)
    },
    [config.id, config.defense],
  )

  const finish = useCallback(
    (success: boolean, text: string, moves: number) => {
      setState(success ? 'success' : 'failed')
      setMessage(text)
      record(success, moves)
    },
    [record],
  )

  const checkPosition = useCallback(
    (afterPlayerMove: boolean, moves: number, lastWasPromotion: boolean, enginePromoted: boolean): boolean => {
      const g = gameRef.current
      if (g.isCheckmate()) {
        const winner = g.turn() === 'w' ? 'b' : 'w'
        if (winner === config.playerColor) {
          if (moves <= config.moveTarget) {
            finish(true, `Mate in ${moves} — target was ${config.moveTarget}. Clean.`, moves)
          } else {
            finish(true, `Mate in ${moves}. Over the ${config.moveTarget}-move target — run it again faster.`, moves)
          }
        } else {
          finish(false, 'You got mated. Reset and rethink the plan.', moves)
        }
        return true
      }
      if (g.isStalemate()) {
        if (config.goal === 'draw') {
          finish(true, `Stalemate — a draw. The defense held in ${moves} moves.`, moves)
        } else {
          finish(
            false,
            config.trap ? `STALEMATE. ${config.trap}` : 'STALEMATE — half a point gone. Before every move in a won position: does their king have a move?',
            moves,
          )
        }
        return true
      }
      if (g.isDraw()) {
        if (config.goal === 'draw') {
          finish(true, 'Draw held. That is the defensive half of the technique.', moves)
        } else {
          finish(false, 'Drawn — insufficient material or repetition. The win slipped.', moves)
        }
        return true
      }
      if (config.goal === 'promote' && afterPlayerMove && lastWasPromotion) {
        finish(true, `Promoted in ${moves} moves. The rest is the K+Q mate you already know.`, moves)
        return true
      }
      if (config.goal === 'draw' && enginePromoted) {
        finish(false, 'Their pawn queened — the square rule failed somewhere. Count again.', moves)
        return true
      }
      if (config.goal === 'mate' && moves > config.moveTarget) {
        finish(false, `Move ${moves} of ${config.moveTarget} — target exceeded. Technique, not shuffling: reset and follow the lesson.`, moves)
        return true
      }
      return false
    },
    [config, finish],
  )

  const engineTurn = useCallback(async () => {
    const gen = genRef.current
    const g = gameRef.current
    if (g.isGameOver() || g.turn() === config.playerColor) return
    setThinking(true)
    try {
      let uci: string
      if (config.defense === 'full') {
        const analyst = await getAnalyst()
        uci = (await analyst.search(g.fen(), 'go depth 18 movetime 400')).bestMove
      } else {
        const engine = await getOpponent()
        uci = await opponentMove(engine, g.fen(), presetById('challenger'))
      }
      if (gen !== genRef.current) return
      const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      setFen(g.fen())
      checkPosition(false, playerMovesRef.current, false, mv.isPromotion())
    } catch {
      if (gen === genRef.current) {
        setState('failed')
        setMessage('The engine stopped responding. Reload the page, then try the drill again.')
      }
    } finally {
      if (gen === genRef.current) setThinking(false)
    }
  }, [checkPosition, config.defense, config.playerColor])

  const playerMovesRef = useRef(0)

  // Engine opens if it moves first.
  useEffect(() => {
    if (new Chess(config.fen).turn() !== config.playerColor) void engineTurn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onMove(from: Square, to: Square, promotion?: string): boolean {
    if (state !== 'playing' || thinking) return false
    const g = gameRef.current
    if (g.turn() !== config.playerColor) return false
    let mv
    try {
      mv = g.move({ from, to, promotion })
    } catch {
      return false
    }
    const moves = playerMovesRef.current + 1
    playerMovesRef.current = moves
    setPlayerMoves(moves)
    setFen(g.fen())
    // Early stalemate warning while still playing.
    if (!g.isGameOver() && config.goal === 'mate') {
      const mobility = opponentMobility(g.fen())
      if (mobility === 1) setMessage('Careful — their king is down to one square.')
      else setMessage('')
    }
    if (!checkPosition(true, moves, mv.isPromotion(), false)) {
      void engineTurn()
    }
    return true
  }

  function restart() {
    genRef.current++
    gameRef.current = new Chess(config.fen)
    playerMovesRef.current = 0
    setPlayerMoves(0)
    setFen(config.fen)
    setState('playing')
    setMessage('')
    setThinking(false)
    if (new Chess(config.fen).turn() !== config.playerColor) void engineTurn()
  }

  return (
    <div>
      <div className="spread">
        <div>
          <div className="eyebrow">{config.defense === 'full' ? 'Perfect defense' : 'Conversion — real resistance'}</div>
          <h1>{config.title}</h1>
        </div>
        <button className="ghost" onClick={onExit}>← All drills</button>
      </div>
      <div className="board-page" style={{ marginTop: '0.6rem' }}>
        <div>
          {state === 'success' && <div className="won-banner"><strong>{message}</strong></div>}
          {state === 'failed' && <div className="alert"><strong>{message}</strong></div>}
          {state === 'playing' && message && <div className="notice">{message}</div>}
          <Board
            fen={fen}
            orientation={config.playerColor === 'w' ? 'white' : 'black'}
            onMove={onMove}
            interactive={state === 'playing' && !thinking}
          />
          <div className="row" style={{ marginTop: '0.7rem' }}>
            <button onClick={restart}>{state === 'playing' ? 'Reset drill' : 'Try again'}</button>
            <span className="muted small">
              move {playerMoves} / {config.moveTarget}
              {thinking ? ' · defending…' : ''}
            </span>
          </div>
        </div>
        <div className="panel">
          <div className="eyebrow">The lesson</div>
          <p className="small">{config.lesson}</p>
          {config.trap && (
            <>
              <div className="eyebrow" style={{ marginTop: '0.8rem' }}>The trap</div>
              <p className="small" style={{ color: 'var(--claret)' }}>{config.trap}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
