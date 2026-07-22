import { useEffect, useMemo, useState } from 'react'
import { computeMetrics, generateToday } from '../../store/planner'
import { useProfile } from '../../hooks/useProfile'
import { fetchBriefing, type CoachBriefing } from '../../lib/briefing'
import { update, type WeaknessKey } from '../../store/profile'
import type { Route } from '../../App'

// Baseline numbers from the 162-game analysis (July 2026) — what we measure against.
const BASELINE = {
  blundersPerGame: 2.4,
  castleBy8Rate: 0.31,
  vsD4Score: 0.26,
  clockLeft: '4:36',
  rating: 713,
  best: 841,
}

const BLOCK_ICONS: Record<string, string> = {
  puzzles: '♞',
  opening: '♗',
  endgame: '♔',
  conversion: '♕',
  calculation: '♘',
  game: '♟',
}

export function Dashboard({ go }: { go: (route: Route, target?: string) => void }) {
  const profile = useProfile()
  const today = useMemo(() => generateToday(profile), [profile])
  const metrics = computeMetrics(profile)
  const [briefing, setBriefing] = useState<CoachBriefing | null>(null)

  // Daily-routine channel: load the coach briefing and apply its weakness
  // adjustments exactly once per briefing id.
  useEffect(() => {
    let cancelled = false
    void fetchBriefing().then((b) => {
      if (cancelled || !b) return
      setBriefing(b)
      update((p) => {
        if (p.lastBriefingId === b.id) return
        p.lastBriefingId = b.id
        for (const [key, delta] of Object.entries(b.adjustments ?? {})) {
          if (key in p.weakness && typeof delta === 'number') {
            const k = key as WeaknessKey
            const clamped = Math.max(-0.1, Math.min(0.1, delta))
            p.weakness[k] = Math.min(1, Math.max(0.05, p.weakness[k] + clamped))
          }
        }
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const weaknesses = Object.entries(profile.weakness).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <div>
      <div className="spread">
        <div>
          <div className="eyebrow">pots1125 · rapid {BASELINE.rating} · best {BASELINE.best}</div>
          <h1>Today&apos;s training</h1>
        </div>
        <div className="row">
          {profile.streak.days > 0 && <span className="tag accent">{profile.streak.days}-day streak</span>}
        </div>
      </div>
      <p className="muted" style={{ maxWidth: 700 }}>
        Built from your last 162 rapid games. The plan attacks three leaks in order: converting won
        games, loose pieces around f7, and the 1.d4 black hole. Twenty focused minutes beats two
        hours of autopilot queuing.
      </p>

      {briefing && (
        <div className="panel" style={{ margin: '1rem 0', borderColor: 'var(--sienna)' }}>
          <div className="spread">
            <div className="eyebrow">Coach&apos;s briefing · {briefing.date}</div>
            {briefing.stats?.record && <span className="tag">{briefing.stats.record}</span>}
          </div>
          <h3>{briefing.headline}</h3>
          <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{briefing.note}</p>
          {briefing.focus && (
            <button className="primary" onClick={() => go(briefing.focus!.route as Route, briefing.focus!.target)}>
              {briefing.focus.title} →
            </button>
          )}
        </div>
      )}

      <div className="grid2" style={{ margin: '1rem 0' }}>
        {today.map((block, i) => (
          <div key={i} className="panel clickable-card" onClick={() => go(block.route as Route, block.target)}>
            <div className="spread">
              <h3>
                <span style={{ color: 'var(--sienna)', marginRight: 8 }}>{BLOCK_ICONS[block.kind]}</span>
                {block.title}
              </h3>
              <span className="tag">{block.minutes} min</span>
            </div>
            <p className="muted small">{block.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="eyebrow">Metrics vs the plan&apos;s targets</div>
          <div className="grid2" style={{ marginTop: '0.6rem' }}>
            <Metric
              label="Blunders / game"
              value={metrics.blundersPerGame !== null ? metrics.blundersPerGame.toFixed(1) : '—'}
              target={`target < 2.0 · was ${BASELINE.blundersPerGame}`}
              status={
                metrics.blundersPerGame === null ? undefined : metrics.blundersPerGame < 2 ? 'ok' : 'bad'
              }
            />
            <Metric
              label="Castled by move 8"
              value={metrics.castleBy8Rate !== null ? `${Math.round(metrics.castleBy8Rate * 100)}%` : '—'}
              target={`target 70% · was ${Math.round(BASELINE.castleBy8Rate * 100)}%`}
              status={
                metrics.castleBy8Rate === null ? undefined : metrics.castleBy8Rate >= 0.7 ? 'ok' : metrics.castleBy8Rate > BASELINE.castleBy8Rate ? 'warn' : 'bad'
              }
            />
            <Metric
              label="Score vs 1.d4"
              value={metrics.vsD4Score !== null ? `${Math.round(metrics.vsD4Score * 100)}%` : '—'}
              target={`target 40%+ · was ${Math.round(BASELINE.vsD4Score * 100)}%`}
              status={metrics.vsD4Score === null ? undefined : metrics.vsD4Score >= 0.4 ? 'ok' : 'warn'}
            />
            <Metric
              label="Games tracked"
              value={`${metrics.gamesTracked}`}
              target="coached + imported"
            />
          </div>
          <p className="muted small" style={{ marginTop: '0.6rem' }}>
            Baseline: 162 games through July 2026. Import new games in Review to refresh these
            numbers; re-audit in 4–6 weeks.
          </p>
        </div>

        <div className="panel">
          <div className="eyebrow">Current focus (auto-adjusting)</div>
          {weaknesses.map(([key, w]) => (
            <div key={key} style={{ marginBottom: '0.55rem' }}>
              <div className="spread small">
                <span>{WEAKNESS_LABELS[key] ?? key}</span>
                <span className="muted mono">{Math.round(w * 100)}</span>
              </div>
              <div className="progressbar">
                <div style={{ width: `${w * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="muted small">
            Weights rise when a leak shows up in games or drills, fall as you fix it. The daily plan
            samples from the top of this list.
          </p>
        </div>
      </div>
    </div>
  )
}

const WEAKNESS_LABELS: Record<string, string> = {
  conversion: 'Converting won games',
  hangingPiece: 'Hanging pieces',
  fork: 'Forks (missed & allowed)',
  mateThreats: 'Mate threats — both ways',
  f7f2: 'The f7/f2 complex',
  openingD4: 'Facing 1.d4',
  openingE4: 'Facing 1.e4',
  endgameTechnique: 'Endgame technique',
  timeUsage: 'Spending the clock',
  castling: 'Castling on time',
  boardVision: 'Board awareness & counting',
  coordinates: 'Square-name fluency',
}

function Metric({ label, value, target, status }: { label: string; value: string; target: string; status?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className={`metric ${status ?? ''}`}>
      <span className="small muted">{label}</span>
      <span className="value">{value}</span>
      <span className="target">{target}</span>
    </div>
  )
}
