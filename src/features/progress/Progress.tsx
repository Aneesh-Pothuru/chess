// The Progress page: everything the app knows about the player's improvement,
// in one place — metrics vs the audit baseline, coached-game history, puzzle
// accuracy by theme, drill mastery, and opening-line mastery.

import { useMemo } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { BASELINE, computeMetrics } from '../../store/planner'
import { BUCKET_INFO } from '../../data/puzzles'
import { ENDGAME_DRILLS, STAGE_NAMES } from '../../data/endgames'
import { CONVERSION_DRILLS } from '../../data/conversion'
import { REPERTOIRES } from '../../data/openings'
import { enumerateLines } from '../../chess/repertoire'
import { dueKeys } from '../../store/srs'
import { getSyncStatus, getToken } from '../../lib/sync'

export function Progress() {
  const profile = useProfile()
  const metrics = computeMetrics(profile)

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
  const wonGames = profile.games.filter((g) => g.wonGameConverted !== null)
  const converted = wonGames.filter((g) => g.wonGameConverted).length

  const synced = getToken().length > 0

  return (
    <div>
      <div className="spread">
        <div>
          <div className="eyebrow">Progress</div>
          <h1>Your improvement, measured</h1>
        </div>
        {profile.streak.days > 0 && <span className="tag accent">{profile.streak.days}-day streak</span>}
      </div>
      <p className="muted small">
        {synced
          ? `Cloud sync on — ${getSyncStatus().message}`
          : 'Cloud sync is OFF on this device — progress here stays in this browser. Set it up in My games → Cloud sync.'}
        {profile.updatedAt ? ` Last activity: ${new Date(profile.updatedAt).toLocaleString()}.` : ''}
      </p>

      <div className="panel" style={{ marginTop: '0.9rem' }}>
        <div className="eyebrow">Headline metrics vs the plan&apos;s targets</div>
        <div className="grid2" style={{ marginTop: '0.6rem' }}>
          <Metric
            label="Blunders / game (coached)"
            value={metrics.blundersPerGame !== null ? metrics.blundersPerGame.toFixed(1) : 'no games yet'}
            target={`target < 2.0 · baseline ${BASELINE.blundersPerGame}`}
            status={metrics.blundersPerGame === null ? undefined : metrics.blundersPerGame < 2 ? 'ok' : 'bad'}
          />
          <Metric
            label="Castled by move 8"
            value={metrics.castleBy8Rate !== null ? `${Math.round(metrics.castleBy8Rate * 100)}%` : 'no games yet'}
            target={`target 70% · baseline ${Math.round(BASELINE.castleBy8Rate * 100)}%`}
            status={metrics.castleBy8Rate === null ? undefined : metrics.castleBy8Rate >= 0.7 ? 'ok' : metrics.castleBy8Rate > BASELINE.castleBy8Rate ? 'warn' : 'bad'}
          />
          <Metric
            label="Score vs 1.d4 (imported)"
            value={metrics.vsD4Score !== null ? `${Math.round(metrics.vsD4Score * 100)}%` : 'no data yet'}
            target={`target 40%+ · baseline ${Math.round(BASELINE.vsD4Score * 100)}%`}
            status={metrics.vsD4Score === null ? undefined : metrics.vsD4Score >= 0.4 ? 'ok' : 'warn'}
          />
          <Metric
            label="Won games converted"
            value={wonGames.length > 0 ? `${converted}/${wonGames.length}` : 'no data yet'}
            target="target: every single one"
            status={wonGames.length === 0 ? undefined : converted === wonGames.length ? 'ok' : 'bad'}
          />
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
