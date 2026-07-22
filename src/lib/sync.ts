// Cloud progress sync: the GitHub repo is the single source of truth shared by
// this app (any device) and the daily coach routine. The app pushes
// progress/profile.json via the GitHub Contents API using a fine-grained PAT
// the user pastes in Settings. The token lives ONLY in this browser's
// localStorage — it is never written into the profile or the repo.

import { getProfile, replaceProfile, subscribe, type Profile } from '../store/profile'

const OWNER = 'Aneesh-Pothuru'
const REPO = 'chess'
const PATH = 'progress/profile.json'
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${PATH}`
const TOKEN_KEY = 'chess-coach-github-token'

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim())
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

export interface SyncStatus {
  state: 'idle' | 'pushing' | 'ok' | 'error'
  message: string
  at: number
}

let status: SyncStatus = { state: 'idle', message: 'Not synced this session.', at: 0 }
const statusListeners = new Set<() => void>()

export function getSyncStatus(): SyncStatus {
  return status
}

export function subscribeSyncStatus(fn: () => void): () => void {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

function setStatus(next: Omit<SyncStatus, 'at'>): void {
  status = { ...next, at: Date.now() }
  for (const fn of statusListeners) fn()
}

function b64encode(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
}

async function currentSha(token: string): Promise<string | null> {
  const res = await fetch(`${API}?ref=main`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`)
  const data = (await res.json()) as { sha: string }
  return data.sha
}

/** Push the current profile to the repo. Retries once on a sha conflict. */
export async function pushProgress(): Promise<boolean> {
  const token = getToken()
  if (!token) {
    setStatus({ state: 'error', message: 'No GitHub token saved — add one below to enable sync.' })
    return false
  }
  setStatus({ state: 'pushing', message: 'Pushing progress to GitHub…' })
  const body = JSON.stringify(getProfile(), null, 1)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const sha = await currentSha(token)
      const res = await fetch(API, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        body: JSON.stringify({
          message: `Sync training progress (${new Date().toISOString().slice(0, 16)})`,
          content: b64encode(body),
          branch: 'main',
          ...(sha ? { sha } : {}),
        }),
      })
      if (res.status === 409 && attempt === 0) continue // stale sha; refetch and retry
      if (!res.ok) throw new Error(`GitHub write failed (${res.status})`)
      setStatus({ state: 'ok', message: `Progress synced ${new Date().toLocaleTimeString()}.` })
      return true
    } catch (e) {
      if (attempt === 1) {
        setStatus({ state: 'error', message: `Sync failed: ${(e as Error).message}` })
        return false
      }
    }
  }
  return false
}

/** Fetch the cloud copy (no token needed — the repo is public raw-readable). */
export async function fetchCloudProfile(): Promise<Profile | null> {
  try {
    const res = await fetch(`${RAW}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as Profile
    return data?.version === 1 ? data : null
  } catch {
    return null
  }
}

/** Overwrite local progress with the cloud copy. */
export async function restoreFromCloud(): Promise<boolean> {
  const remote = await fetchCloudProfile()
  if (!remote) return false
  replaceProfile(remote)
  setStatus({ state: 'ok', message: 'Cloud progress loaded onto this device.' })
  return true
}

/**
 * On startup: if the cloud copy is meaningfully newer than this device
 * (another device or a fresh browser), offer to load it.
 */
export async function offerRestoreIfNewer(): Promise<void> {
  const remote = await fetchCloudProfile()
  if (!remote?.updatedAt) return
  const local = getProfile()
  const localAt = local.updatedAt ?? 0
  if (remote.updatedAt > localAt + 60_000) {
    const when = new Date(remote.updatedAt).toLocaleString()
    if (window.confirm(`Cloud training progress from ${when} is newer than this device. Load it here?`)) {
      replaceProfile(remote)
    }
  }
}

/** Debounced auto-push: sync 90s after the last profile change, if a token exists. */
export function initAutoSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const unsub = subscribe(() => {
    if (!getToken()) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void pushProgress()
    }, 90_000)
  })
  return () => {
    unsub()
    if (timer) clearTimeout(timer)
  }
}
