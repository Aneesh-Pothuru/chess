import { useState, type CSSProperties } from 'react'
import type { Square } from 'chess.js'
import { Board, type CoachArrow } from '../../components/Board'
import { Scoresheet } from '../../components/Scoresheet'
import { OPPONENT_PRESETS } from '../../engine/presets'
import { scoreToCp } from '../../chess/coach'
import { useProfile } from '../../hooks/useProfile'
import { update } from '../../store/profile'
import { useCoachedGame } from './useCoachedGame'

export function Play() {
  const profile = useProfile()
  const game = useCoachedGame()
  const [hintArrow, setHintArrow] = useState<CoachArrow | null>(null)
  const [hintText, setHintText] = useState('')
  const [hintBusy, setHintBusy] = useState(false)
  const [gatePulse, setGatePulse] = useState(0)

  const strict = profile.settings.strictMode
  const presetId = profile.settings.opponentPresetId

  const playerClock = game.clocks[game.playerColor]
  const botClock = game.clocks[game.playerColor === 'w' ? 'b' : 'w']

  const highlights: Record<string, CSSProperties> = {}
  if (game.threatPrompt) {
    for (const sq of game.threatPrompt.squares) {
      highlights[sq] = { boxShadow: 'inset 0 0 0 3px var(--claret)' }
    }
  }

  function fmt(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function showHint() {
    if (hintBusy) return
    setHintBusy(true)
    try {
      const h = await game.engineHint()
      if (h) {
        setHintArrow({ from: h.from, to: h.to, color: '#c9a227' })
        setHintText(h.note)
      } else {
        setHintArrow(null)
        setHintText('No hint right now — run the scan: checks, captures, threats.')
      }
    } finally {
      setHintBusy(false)
    }
  }

  const evalLabel =
    game.evalScore === null
      ? '—'
      : game.evalScore.mate !== null
        ? `M${Math.abs(game.evalScore.mate)}`
        : (scoreToCp(game.evalScore) / 100).toFixed(1)

  return (
    <div>
      <div className="spread" style={{ marginBottom: '0.8rem' }}>
        <div>
          <div className="eyebrow">Coached game</div>
          <h1>Play the coach&apos;s bot</h1>
        </div>
        {game.status === 'playing' && (
          <div className="row">
            <span className={`clock ${botClock < 60 ? 'low' : ''}`}>{fmt(botClock)}</span>
            <span className="muted">bot</span>
            <span className={`clock ${playerClock < 60 ? 'low' : ''}`}>{fmt(playerClock)}</span>
            <span className="muted">you</span>
          </div>
        )}
      </div>

      {game.status === 'idle' && (
        <div className="panel" style={{ maxWidth: 640 }}>
          <h2>New training game</h2>
          <p className="muted">
            The coach watches every move: blunder checks, mate scans, hanging-piece alerts, and your
            three habits — castle by 8, spend the clock, convert won games.
          </p>
          <div className="row" style={{ margin: '0.8rem 0' }}>
            <label>
              Opponent{' '}
              <select
                value={presetId}
                onChange={(e) => update((p) => (p.settings.opponentPresetId = e.target.value))}
              >
                {OPPONENT_PRESETS.filter((p) => p.id !== 'full').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.eloLabel})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={strict}
                onChange={(e) => update((p) => (p.settings.strictMode = e.target.checked))}
              />{' '}
              Strict mode (threat checks + takebacks)
            </label>
          </div>
          <div className="row">
            <button className="primary" onClick={() => game.start('w', presetId, strict)}>
              Play White (London)
            </button>
            <button className="primary" onClick={() => game.start('b', presetId, strict)}>
              Play Black (Caro-Kann / KID)
            </button>
          </div>
        </div>
      )}

      {game.status !== 'idle' && (
        <div className="board-page">
          <div>
            <CoachStrip
              game={game}
              hintText={hintText}
              gatePulse={gatePulse}
            />
            <Board
              fen={game.fen}
              orientation={game.playerColor === 'w' ? 'white' : 'black'}
              onMove={(from, to, promotion) => {
                if (game.threatPrompt) {
                  // The strict-mode gate is on: pulse the banner instead of
                  // silently swallowing the move.
                  setGatePulse((p) => p + 1)
                  return false
                }
                setHintArrow(null)
                setHintText('')
                return game.playerMove(from, to, promotion)
              }}
              onSquareClick={(sq: Square) => game.resolveThreatClick(sq)}
              arrows={hintArrow ? [hintArrow] : []}
              highlights={highlights}
              interactive={game.status === 'playing'}
            />
            <div className="row" style={{ marginTop: '0.7rem' }}>
              {game.status === 'playing' && (
                <>
                  <button onClick={() => void showHint()} disabled={hintBusy}>
                    {hintBusy ? 'Thinking…' : 'Hint'}
                  </button>
                  <button onClick={game.resign}>Resign</button>
                  {game.wonGame && <span className="tag good">WINNING — protocol on</span>}
                  <span className="muted small">
                    eval <span className="mono">{evalLabel}</span>
                    {game.thinking ? ' · bot thinking…' : ''}
                  </span>
                </>
              )}
              {game.status === 'over' && (
                <>
                  <button className="primary" onClick={() => game.start(game.playerColor, presetId, strict)}>
                    Rematch
                  </button>
                  <button onClick={() => game.start(game.playerColor === 'w' ? 'b' : 'w', presetId, strict)}>
                    Switch colors
                  </button>
                </>
              )}
            </div>
            {game.status === 'over' && <ReportCard />}
          </div>
          <Scoresheet
            entries={game.entries}
            title="Scoresheet"
            subtitle={game.playerColor === 'w' ? 'you play White' : 'you play Black'}
            onTakeback={game.takeback}
            allowTakeback={strict && game.status === 'playing'}
          />
        </div>
      )}
    </div>
  )
}

// Fixed-height message slot above the board: content swaps, the board NEVER
// moves. One message at a time, by priority.
function CoachStrip({
  game,
  hintText,
  gatePulse,
}: {
  game: ReturnType<typeof useCoachedGame>
  hintText: string
  gatePulse: number
}) {
  let content: React.ReactNode
  let cls = 'coach-tip'
  if (game.engineFailed) {
    cls = 'alert'
    content = (
      <>
        The engine worker stopped responding.{' '}
        <button onClick={() => location.reload()}>Reload</button>
      </>
    )
  } else if (game.status === 'over') {
    cls = 'notice'
    content = <strong>{game.resultText}</strong>
  } else if (game.threatPrompt) {
    cls = 'alert'
    content = (
      <>
        <strong>Before you move:</strong> {game.threatPrompt.hint} Click the highlighted square to
        continue.{' '}
        <button className="ghost small" onClick={game.skipThreatPrompt}>
          I see it — skip
        </button>
      </>
    )
  } else if (hintText) {
    cls = 'notice'
    content = hintText
  } else if (game.wonGame) {
    cls = 'won-banner'
    content = (
      <>
        <strong>WON-GAME PROTOCOL.</strong> Every move: ① scan mate-in-1 — yours AND theirs ② trade
        pieces, not pawns ③ slow down. There is no rush.
      </>
    )
  } else {
    content = (
      <span className="muted">
        The scan, every move: checks, captures, threats — theirs first, then yours.
      </span>
    )
  }
  return (
    <div className="coach-strip" key={gatePulse}>
      <div className={`${cls} ${gatePulse > 0 ? 'gate-pulse' : ''}`}>{content}</div>
    </div>
  )
}

function ReportCard() {
  const profile = useProfile()
  const last = profile.games[profile.games.length - 1]
  if (!last) return null
  return (
    <div className="panel" style={{ marginTop: '0.9rem' }}>
      <div className="eyebrow">Report card</div>
      <div className="row">
        <span className={`tag ${last.blunders === 0 ? 'good' : 'bad'}`}>
          {last.blunders} blunder{last.blunders === 1 ? '' : 's'}
        </span>
        <span className="tag">{last.mistakes} mistakes</span>
        <span className={`tag ${last.castleMove !== null && last.castleMove <= 8 ? 'good' : 'bad'}`}>
          {last.castleMove ? `castled move ${last.castleMove}` : 'never castled'}
        </span>
        <span className="tag">{last.avgSecondsPerMove.toFixed(0)}s / move</span>
        {last.wonGameConverted !== null && (
          <span className={`tag ${last.wonGameConverted ? 'good' : 'bad'}`}>
            {last.wonGameConverted ? 'won game converted' : 'won game NOT converted'}
          </span>
        )}
        {last.motifs.map((m) => (
          <span key={m} className="tag accent">
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}
