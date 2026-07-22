import { useRef, useState, useSyncExternalStore } from 'react'
import { fetchRecentGames } from '../../lib/chesscom'
import { update, bumpWeakness } from '../../store/profile'
import { useProfile } from '../../hooks/useProfile'
import {
  getSyncStatus,
  getToken,
  pushProgress,
  restoreFromCloud,
  setToken,
  subscribeSyncStatus,
  verifyToken,
} from '../../lib/sync'
import { scanGame } from './scan'

// PGNs are big; keep them in memory only for the session.
const pgnCache = new Map<string, string>()

export function Review() {
  const profile = useProfile()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef(false)

  const username = profile.settings.username

  async function importGames() {
    setBusy(true)
    setError('')
    try {
      const { games, pgns } = await fetchRecentGames(username, 3, (done, total) =>
        setProgress(`Fetching month ${done}/${total}…`),
      )
      for (const [url, pgn] of pgns) pgnCache.set(url, pgn)
      update((p) => {
        const known = new Set(p.imported.map((g) => g.url))
        for (const g of games) {
          if (!known.has(g.url)) p.imported.push(g)
        }
        p.imported.sort((a, b) => b.at - a.at)
        if (p.imported.length > 120) p.imported.length = 120
      })
      setProgress(`Imported. ${games.length} rapid games available.`)
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}. chess.com may be rate limiting — wait a minute and retry.`)
    } finally {
      setBusy(false)
    }
  }

  async function scanAll() {
    setBusy(true)
    abortRef.current = false
    setError('')
    const unscanned = profile.imported.filter((g) => !g.scanned && pgnCache.has(g.url))
    if (unscanned.length === 0) {
      setError('Nothing to scan. Import first (PGNs live only for this browser session).')
      setBusy(false)
      return
    }
    let done = 0
    for (const g of unscanned.slice(0, 30)) {
      if (abortRef.current) break
      setProgress(`Scanning game ${done + 1}/${Math.min(unscanned.length, 30)} (each takes ~20s)…`)
      const result = await scanGame(
        pgnCache.get(g.url)!,
        g.color,
        undefined,
        () => abortRef.current,
      )
      if (result) {
        update((p) => {
          const target = p.imported.find((x) => x.url === g.url)
          if (target) {
            target.scanned = true
            target.blunders = result.blunders
            target.motifs = result.motifs
          }
        })
        if (result.motifs.includes('hangingPiece')) bumpWeakness('hangingPiece', 0.01)
        if (result.motifs.includes('missedMateIn1')) bumpWeakness('mateThreats', 0.02)
        if (g.color === 'b' && g.firstWhiteMove === 'd4' && g.result === 'loss') bumpWeakness('openingD4', 0.01)
      }
      done++
    }
    setProgress(abortRef.current ? 'Scan stopped.' : 'Scan complete. The weakness profile has been updated.')
    setBusy(false)
  }

  const scanned = profile.imported.filter((g) => g.scanned)
  const avgBlunders =
    scanned.length > 0 ? (scanned.reduce((s, g) => s + g.blunders, 0) / scanned.length).toFixed(1) : null

  return (
    <div>
      <div className="eyebrow">Game import</div>
      <h1>Learn from your real games</h1>
      <p className="muted" style={{ maxWidth: 680 }}>
        Pulls your recent rapid games from chess.com ({username}), scans them with Stockfish, tags
        the blunders by motif, and feeds the results back into your training plan. Re-run this every
        few weeks — it is how the program evolves with you.
      </p>
      <div className="row" style={{ margin: '0.9rem 0' }}>
        <button className="primary" onClick={importGames} disabled={busy}>
          Import recent games
        </button>
        <button onClick={scanAll} disabled={busy}>
          Scan for blunders
        </button>
        {busy && (
          <button className="ghost" onClick={() => (abortRef.current = true)}>
            Stop
          </button>
        )}
        <span className="muted small">{progress}</span>
      </div>
      {error && <div className="alert">{error}</div>}

      {avgBlunders && (
        <div className="notice">
          Scanned games average <strong>{avgBlunders} blunders per game</strong>. The target from your
          improvement plan is under 2.0 (baseline: 2.4).
        </div>
      )}

      <SyncPanel />

      <div className="panel" style={{ marginTop: '0.9rem' }}>
        <div className="eyebrow">Imported games ({profile.imported.length})</div>
        {profile.imported.length === 0 && (
          <p className="muted">Nothing imported yet.</p>
        )}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {profile.imported.map((g) => (
            <div key={g.url} className="spread" style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--line)' }}>
              <span className="row">
                <span className={`tag ${g.result === 'win' ? 'good' : g.result === 'loss' ? 'bad' : ''}`}>
                  {g.result}
                </span>
                <span className="small">{g.color === 'w' ? 'White' : 'Black'}</span>
                <span className="small muted">{g.opening.slice(0, 40)}</span>
              </span>
              <span className="row small muted">
                {g.castleMove ? `O-O @${g.castleMove}` : 'no castle'}
                {g.scanned && (
                  <span className={`tag ${g.blunders <= 1 ? 'good' : 'bad'}`}>{g.blunders} blunders</span>
                )}
                {g.motifs.map((m) => (
                  <span key={m} className="tag accent">{m}</span>
                ))}
                <a href={g.url} target="_blank" rel="noreferrer">
                  view
                </a>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- cloud sync

function SyncPanel() {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)
  const [tokenInput, setTokenInput] = useState(getToken())
  const [busy, setBusy] = useState(false)
  const [tokenFeedback, setTokenFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmLoad, setConfirmLoad] = useState(false)
  const profile = useProfile()
  const hasToken = getToken().length > 0

  async function saveToken() {
    setBusy(true)
    setTokenFeedback({ ok: true, text: 'Checking the token against GitHub…' })
    const check = await verifyToken(tokenInput)
    if (check.ok) {
      setToken(tokenInput)
      let text = `✓ ${check.message} Auto-sync is now on.`
      if (check.cloudUpdatedAt) {
        text += ` Cloud progress from ${new Date(check.cloudUpdatedAt).toLocaleString()} exists — use "Load cloud progress" to bring it onto this device.`
      } else {
        text += ' No cloud progress exists yet — press "Push progress now" on the device where you have been training.'
      }
      setTokenFeedback({ ok: true, text })
    } else {
      if (!tokenInput.trim()) setToken('')
      setTokenFeedback({ ok: false, text: `✗ ${check.message}` })
    }
    setBusy(false)
  }

  return (
    <div className="panel" style={{ marginTop: '0.9rem' }}>
      <div className="eyebrow">Cloud sync — your progress, everywhere</div>
      <p className="muted small" style={{ maxWidth: 680 }}>
        Pushes your training progress to <span className="mono">progress/profile.json</span> in your
        GitHub repo. The daily coach routine reads it (alongside your chess.com games) to adapt the
        plan, and any device you open the app on can load it. Create a{' '}
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
          fine-grained token
        </a>{' '}
        restricted to the <span className="mono">chess</span> repo with Contents read &amp; write only.
        The token stays in THIS browser — it is never uploaded anywhere.
      </p>
      <div className="row" style={{ margin: '0.6rem 0' }}>
        <input
          type="password"
          placeholder="github_pat_…"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <button onClick={() => void saveToken()} disabled={busy}>
          {busy ? 'Checking…' : 'Save token'}
        </button>
        <button
          className="primary"
          disabled={!hasToken || busy}
          onClick={async () => {
            setBusy(true)
            await pushProgress()
            setBusy(false)
          }}
        >
          Push progress now
        </button>
        <button
          disabled={busy}
          className={confirmLoad ? 'primary' : ''}
          onClick={async () => {
            if (!confirmLoad) {
              setConfirmLoad(true)
              setTokenFeedback({ ok: true, text: 'This overwrites THIS device with the cloud copy. Click again to confirm.' })
              return
            }
            setConfirmLoad(false)
            setBusy(true)
            const ok = await restoreFromCloud()
            setBusy(false)
            setTokenFeedback(
              ok
                ? { ok: true, text: '✓ Cloud progress loaded onto this device.' }
                : { ok: false, text: '✗ No cloud progress found yet — press "Push progress now" on the device where you have been training.' },
            )
          }}
        >
          {confirmLoad ? 'Confirm: load cloud copy' : 'Load cloud progress'}
        </button>
      </div>
      {tokenFeedback && (
        <div className={tokenFeedback.ok ? 'won-banner' : 'alert'} style={{ marginTop: '0.4rem' }}>
          {tokenFeedback.text}
        </div>
      )}
      <p className="small muted">
        {hasToken ? 'Auto-sync is on: changes push ~90s after your last action. ' : 'No token saved — sync is off. '}
        <span className={status.state === 'error' ? 'mono' : 'mono muted'}>{status.message}</span>
        {profile.updatedAt ? ` · last local change ${new Date(profile.updatedAt).toLocaleTimeString()}` : ''}
      </p>
    </div>
  )
}
