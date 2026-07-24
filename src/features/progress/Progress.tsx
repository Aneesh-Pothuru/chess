// The Progress page: everything the app knows about the player's improvement,
// in one place — metrics vs the audit baseline, coached-game history, puzzle
// accuracy by theme, drill mastery, and opening-line mastery.

import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { BASELINE } from '../../store/planner'
import { areaTrends, latestRatings, ratingSeries, sampleRatingsIfStale, windowMetrics, ROLLING_WINDOW } from '../../store/stats'
import { RatingChart } from '../../components/RatingChart'
import { BUCKET_INFO } from '../../data/puzzles'
import { ENDGAME_DRILLS, STAGE_NAMES } from '../../data/endgames'
import { CONVERSION_DRILLS } from '../../data/conversion'
import { REPERTOIRES } from '../../data/openings'
import { enumerateLines } from '../../chess/repertoire'
import { dueKeys } from '../../store/srs'
import { getSyncStatus, getToken } from '../../lib/sync'
import { fetchReviewIndex, type ReviewIndexEntry } from '../../lib/reviews'

export function Progress() {
  const profile = useProfile()
  const metrics = windowMetrics(profile, ROLLING_WINDOW)
  const trends = useMemo(() => areaTrends(profile), [profile])
  const series = useMemo(() => ratingSeries(profile), [profile])
  const live = latestRatings(profile)

  useEffect(() => {
    void sampleRatingsIfStale()
  }, [])

  const [reviews, setReviews] = useState<ReviewIndexEntry[]>([])
  useEffect(() => {
    void fetchReviewIndex().then(setReviews)
  }, [])

  const openingStats = useMemo(
    () =>
      REPERTOIRES.map((rep) => {
        const lines = enumerateLines(rep)
        const keys = lines.map((l) => l.key)
        const states = keys.map((k) => profile.srs[k]).filter(Boolean)
        const learned = states.filter((s) => s!.passes > 0).length
        const mastered = states.filter((s) => s!.level >= 3).length
        const due = dueKeys(profile.srs, keys).filter((k) => profile.srs[k]).length
        return { name: rep.name, total: lines.length, learned, mastered, due }
      }),
    [profile.srs],
  )

  const puzzleRows = BUCKET_INFO.map((b) => ({
    label: b.label,
    stats: profile.puzzleStats[b.id],
  })).filter((r) => r.stats && r.stats.attempts > 0)

  const endgameDone = ENDGAME_DRILLS.filter((d) => (profile.drills[d.id]?.successes ?? 0) > 0)
  const conversionsDone = CONVERSION_DRILLS.filter((d) => (profile.drills[`conv-${d.id}`]?.successes ?? 0) > 0)
  const coordBest = profile.drills['coord-sprint']?.bestMoves ?? null
  const boardMath = profile.drills['board-math']

  const games = [...profile.games].reverse().slice(0, 20)

  const synced = getToken().length > 0

  const deltaBest = live?.best ?? BASELINE.best

  return (
    <div>
      <div className="spread">
        <div>
          <div className="eyebrow">Progress</div>
          <h1>Your improvement, measured</h1>
        </div>
        <div className="row">
          {live && <span className="tag accent">rapid {live.rating} · best {deltaBest}</span>}
          {profile.streak.days > 0 && <span className="tag accent">{profile.streak.days}-day streak</span>}
        </div>
      </div>
      <p className="muted small">
        Current-you metrics use your last {ROLLING_WINDOW} games (rolling); the July 2026 audit of
        162 games is kept as the dated baseline.{' '}
        {synced
          ? `Cloud sync on — ${getSyncStatus().message}`
          : 'Cloud sync is OFF on this device — set it up in My games → Cloud sync.'}
      </p>

      <div className="panel" style={{ marginTop: '0.9rem' }}>
        <div className="eyebrow">Rapid rating trend</div>
        <RatingChart series={series} baseline={BASELINE.rating} />
      </div>

      {reviews.length > 0 && (
        <div className="panel" style={{ marginTop: '0.9rem' }}>
          <div className="eyebrow">Morning deep reviews</div>
          <p className="muted small" style={{ margin: '0.3rem 0 0.5rem' }}>
            Every day&apos;s engine-checked review — boards, lines, and the narrated summary.
          </p>
          {reviews.map((r) => (
            <a
              key={r.date}
              className="option-btn"
              href={`${import.meta.env.BASE_URL}${r.path}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textDecoration: 'none' }}
            >
              <strong>{r.date}</strong> · {r.headline}
              <div className="muted small">
                {r.record ?? ''}{r.games ? ` · ${r.games} games analyzed` : ''}{r.video ? ' · 🎬 video summary' : ''}
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="grid2" style={{ marginTop: '0.9rem' }}>
        <div className="panel">
          <div className="eyebrow">Last {Math.min(metrics.games, ROLLING_WINDOW)} games ({metrics.record})</div>
          <div className="grid2" style={{ marginTop: '0.6rem' }}>
            <Metric
              label="Blunders / analyzed game"
              value={metrics.blundersPerGame !== null ? metrics.blundersPerGame.toFixed(1) : 'scan games first'}
              target={`target < 2.0 · audit ${BASELINE.blundersPerGame}`}
              status={metrics.blundersPerGame === null ? undefined : metrics.blundersPerGame < 2 ? 'ok' : 'bad'}
            />
            <Metric
              label="Castled by move 8"
              value={metrics.castleBy8 !== null ? `${Math.round(metrics.castleBy8 * 100)}%` : 'no games yet'}
              target={`target 70% · audit ${Math.round(BASELINE.castleBy8Rate * 100)}%`}
              status={metrics.castleBy8 === null ? undefined : metrics.castleBy8 >= 0.7 ? 'ok' : metrics.castleBy8 > BASELINE.castleBy8Rate ? 'warn' : 'bad'}
            />
            <Metric
              label="Score vs 1.d4 as Black"
              value={metrics.vsD4 !== null ? `${Math.round(metrics.vsD4 * 100)}%` : 'no data yet'}
              target={`target 40%+ · audit ${Math.round(BASELINE.vsD4Score * 100)}%`}
              status={metrics.vsD4 === null ? undefined : metrics.vsD4 >= 0.4 ? 'ok' : 'warn'}
            />
            <Metric
              label="Won positions converted"
              value={metrics.conversion ? `${metrics.conversion.converted}/${metrics.conversion.reached}` : 'no data yet'}
              target="target: every single one"
              status={!metrics.conversion ? undefined : metrics.conversion.converted === metrics.conversion.reached ? 'ok' : 'bad'}
            />
          </div>
        </div>

        <div className="panel">
          <div className="eyebrow">Areas — recent {Math.floor(ROLLING_WINDOW / 2)} vs the {Math.floor(ROLLING_WINDOW / 2)} before</div>
          {trends.map((t) => (
            <div key={t.key} className="spread small" style={{ padding: '0.32rem 0', borderBottom: '1px solid var(--line)' }}>
              <span>
                {t.label}: <strong className="mono">{t.now}</strong>
              </span>
              <span
                style={{
                  color: t.improving === null ? 'var(--boxwood-dim)' : t.improving ? 'var(--laurel)' : 'var(--claret)',
                }}
              >
                {t.improving === null ? '— steady' : t.improving ? '▲ improving' : '▼ slipping'}
              </span>
            </div>
          ))}
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            Trends need analyzed games on both sides of the split — import and scan regularly to keep
            these honest.
          </p>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: '0.9rem' }}>
        <div className="panel">
          <div className="eyebrow">Opening mastery (spaced repetition)</div>
          {openingStats.map((o) => (
            <div key={o.name} style={{ marginBottom: '0.7rem' }}>
              <div className="spread small">
                <span>{o.name}</span>
                <span className="muted mono">
                  {o.learned}/{o.total} learned · {o.mastered} mastered{o.due > 0 ? ` · ${o.due} due` : ''}
                </span>
              </div>
              <div className="progressbar">
                <div style={{ width: `${(o.learned / Math.max(1, o.total)) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="muted small">
            Learned = drilled correctly at least once. Mastered = survived three reviews on the
            ladder. Drill lines in the Opening lab to move these bars.
          </p>
        </div>

        <div className="panel">
          <div className="eyebrow">Drills</div>
          <div className="row" style={{ marginBottom: '0.5rem' }}>
            <span className="tag">
              endgame stages: {new Set(endgameDone.map((d) => d.stage)).size}/{Object.keys(STAGE_NAMES).length}
            </span>
            <span className={`tag ${conversionsDone.length > 0 ? 'good' : ''}`}>
              conversions won: {conversionsDone.length}/{CONVERSION_DRILLS.length}
            </span>
          </div>
          <div className="row">
            <span className="tag">{coordBest !== null ? `coordinate sprint best: ${coordBest}` : 'coordinate sprint: not tried'}</span>
            <span className="tag">
              {boardMath && boardMath.attempts > 0
                ? `board math: ${Math.round((boardMath.successes / boardMath.attempts) * 100)}% of ${boardMath.attempts}`
                : 'board math: not tried'}
            </span>
          </div>
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            The conversion gym is the highest-value bar on this page — it attacks the leak that
            costs you the most rating.
          </p>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: '0.9rem' }}>
        <div className="panel">
          <div className="eyebrow">Puzzle accuracy by theme</div>
          {puzzleRows.length === 0 && <p className="muted small">No puzzles solved yet on this device.</p>}
          {puzzleRows.map((r) => {
            const pct = Math.round((r.stats!.correct / r.stats!.attempts) * 100)
            return (
              <div key={r.label} style={{ marginBottom: '0.55rem' }}>
                <div className="spread small">
                  <span>{r.label}</span>
                  <span className="muted mono">
                    {r.stats!.correct}/{r.stats!.attempts} · {pct}%
                  </span>
                </div>
                <div className="progressbar">
                  <div style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="panel">
          <div className="eyebrow">Coached games ({profile.games.length})</div>
          {games.length === 0 && (
            <p className="muted small">No coached games yet — play one and its report card lands here.</p>
          )}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {games.map((g) => (
              <div key={g.id} className="spread small" style={{ padding: '0.3rem 0', borderBottom: '1px solid var(--line)' }}>
                <span className="row">
                  <span className={`tag ${g.result === 'win' ? 'good' : g.result === 'loss' ? 'bad' : ''}`}>{g.result}</span>
                  <span className="muted">{new Date(g.at).toLocaleDateString()}</span>
                  <span>{g.color === 'w' ? 'White' : 'Black'}</span>
                </span>
                <span className="row muted">
                  <span className={g.blunders === 0 ? 'mono' : 'mono'}>{g.blunders}bl</span>
                  <span className="mono">{g.castleMove ? `O-O@${g.castleMove}` : 'no O-O'}</span>
                  {g.wonGameConverted === false && <span className="tag bad">threw a win</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
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
