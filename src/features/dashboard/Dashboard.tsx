import { useEffect, useMemo, useState } from 'react'
import { BASELINE, generateToday } from '../../store/planner'
import { latestRatings, sampleRatingsIfStale, windowMetrics, ROLLING_WINDOW } from '../../store/stats'
import { useProfile } from '../../hooks/useProfile'
import { fetchBriefing, type CoachBriefing } from '../../lib/briefing'
import { checkCloudNewer, restoreFromCloud } from '../../lib/sync'
import { update, type WeaknessKey } from '../../store/profile'
import type { Route } from '../../App'

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
  const metrics = windowMetrics(profile, ROLLING_WINDOW)
  const live = latestRatings(profile)
  const [briefing, setBriefing] = useState<CoachBriefing | null>(null)

  useEffect(() => {
    void sampleRatingsIfStale()
  }, [])
  const [cloudOffer, setCloudOffer] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)

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

  // Newer progress in the cloud (another device)? Offer it as a banner.
  useEffect(() => {
    let cancelled = false
    void checkCloudNewer().then((offer) => {
      if (!cancelled && offer) setCloudOffer(offer.updatedAt)
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
          <div className="eyebrow">
            {profile.settings.username} · rapid {live?.rating ?? `${BASELINE.rating} (audit)`} · best{' '}
            {live?.best ?? BASELINE.best}
          </div>
          <h1>Today&apos;s training</h1>
        </div>
        <div className="row">
          {profile.streak.days > 0 && <span className="tag accent">{profile.streak.days}-day streak</span>}
        </div>
      </div>
      <p className="muted" style={{ maxWidth: 700 }}>
        Seeded by the July 2026 audit of 162 games, updated daily by the coach routine and your
        rolling last-{ROLLING_WINDOW}. The plan attacks the leaks in order: converting won games,
        loose pieces, and the 1.d4 black hole. Twenty focused minutes beats two hours of autopilot
        queuing.
      </p>

      {cloudOffer && (
        <div className="notice" style={{ marginTop: '1rem' }}>
          Cloud progress from <strong>{new Date(cloudOffer).toLocaleString()}</strong> is newer than
          this device.{' '}
          <button
            className="primary"
            disabled={restoring}
            onClick={async () => {
              setRestoring(true)
              await restoreFromCloud()
              setRestoring(false)
              setCloudOffer(null)
            }}
          >
            {restoring ? 'Loading…' : 'Load it here'}
          </button>{' '}
          <button className="ghost" onClick={() => setCloudOffer(null)}>
            Keep this device&apos;s version
          </button>
        </div>
      )}

      {briefing && (
        <div className="panel" style={{ margin: '1rem 0', borderColor: 'var(--sienna)' }}>
          <div className="spread">
            <div className="eyebrow">Coach&apos;s briefing · {briefing.date}</div>
            {briefing.stats?.record && <span className="tag">{briefing.stats.record}</span>}
          </div>
          <h3>{briefing.headline}</h3>
          <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{briefing.note}</p>
          {briefing.tasks && briefing.tasks.length > 0 ? (
            <div>
              <div className="eyebrow" style={{ marginTop: '0.4rem' }}>Coach&apos;s orders — in this order</div>
              {briefing.tasks.map((t, i) => (
                <button
                  key={i}
                  className="option-btn"
                  onClick={() => go(t.route as Route, t.target)}
                >
                  <strong>{i + 1}. {t.title}</strong>
                  {t.minutes ? <span className="muted mono small"> · {t.minutes} min</span> : null}
                  <div className="muted small">{t.detail}</div>
                </button>
              ))}
            </div>
          ) : briefing.focus ? (
            <button className="primary" onClick={() => go(briefing.focus!.route as Route, briefing.focus!.target)}>
              {briefing.focus.title} →
            </button>
          ) : null}
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
          <div className="eyebrow">Last {metrics.games} games vs the plan&apos;s targets</div>
          <div className="grid2" style={{ marginTop: '0.6rem' }}>
            <Metric
              label="Blunders / analyzed game"
              value={metrics.blundersPerGame !== null ? metrics.blundersPerGame.toFixed(1) : '—'}
              target={`target < 2.0 · audit ${BASELINE.blundersPerGame}`}
              status={
                metrics.blundersPerGame === null ? undefined : metrics.blundersPerGame < 2 ? 'ok' : 'bad'
              }
            />
            <Metric
              label="Castled by move 8"
              value={metrics.castleBy8 !== null ? `${Math.round(metrics.castleBy8 * 100)}%` : '—'}
              target={`target 70% · audit ${Math.round(BASELINE.castleBy8Rate * 100)}%`}
              status={
                metrics.castleBy8 === null ? undefined : metrics.castleBy8 >= 0.7 ? 'ok' : metrics.castleBy8 > BASELINE.castleBy8Rate ? 'warn' : 'bad'
              }
            />
            <Metric
              label="Score vs 1.d4"
              value={metrics.vsD4 !== null ? `${Math.round(metrics.vsD4 * 100)}%` : '—'}
              target={`target 40%+ · audit ${Math.round(BASELINE.vsD4Score * 100)}%`}
              status={metrics.vsD4 === null ? undefined : metrics.vsD4 >= 0.4 ? 'ok' : 'warn'}
            />
            <Metric
              label="Recent record"
              value={metrics.record}
              target={`rolling last ${ROLLING_WINDOW}`}
            />
          </div>
          <p className="muted small" style={{ marginTop: '0.6rem' }}>
            Rolling window of your most recent games; the July 2026 audit (162 games) is the dated
            baseline. Full trends live on the Progress page.
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
