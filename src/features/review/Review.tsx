import { useRef, useState } from 'react'
import { fetchRecentGames } from '../../lib/chesscom'
import { update, bumpWeakness } from '../../store/profile'
import { useProfile } from '../../hooks/useProfile'
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

      <div className="panel">
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
