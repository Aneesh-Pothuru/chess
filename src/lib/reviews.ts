// Archive of the daily deep-review pages. build.cjs maintains
// public/coach/review/index.json; we read the copy baked into the deployed
// bundle and the repo's latest via GitHub raw, then merge — raw may know about
// a review the last deploy predates, the local copy works offline.

import { getToken as getGithubToken } from './sync'

export interface ReviewIndexEntry {
  date: string
  headline: string
  record?: string
  games?: number
  video?: boolean
  path: string
}

const LOCAL_URL = `${import.meta.env.BASE_URL}coach/review/index.json`
const RAW_URL = 'https://raw.githubusercontent.com/Aneesh-Pothuru/chess/main/public/coach/review/index.json'
const API_URL = 'https://api.github.com/repos/Aneesh-Pothuru/chess/contents/public/coach/review/index.json?ref=main'

function valid(entries: unknown): entries is ReviewIndexEntry[] {
  return Array.isArray(entries) && entries.every(
    (e) => typeof e === 'object' && e !== null &&
      typeof (e as ReviewIndexEntry).date === 'string' &&
      typeof (e as ReviewIndexEntry).path === 'string',
  )
}

async function tryFetch(url: string, headers?: Record<string, string>): Promise<ReviewIndexEntry[] | null> {
  try {
    // A hung network (offline, blocked host) must never block the archive list —
    // the locally bundled copy renders on its own if the other source stalls.
    const res = await fetch(url, { cache: 'no-cache', headers, signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data: unknown = await res.json()
    return valid(data) ? data : null
  } catch {
    return null
  }
}

function remoteIndex(): Promise<ReviewIndexEntry[] | null> {
  const token = getGithubToken()
  if (token) {
    return tryFetch(API_URL, { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json' })
  }
  return tryFetch(RAW_URL)
}

/** All known deep reviews, newest first (merged local bundle + repo head). */
export async function fetchReviewIndex(): Promise<ReviewIndexEntry[]> {
  const [local, remote] = await Promise.all([tryFetch(LOCAL_URL), remoteIndex()])
  const byDate = new Map<string, ReviewIndexEntry>()
  for (const list of [local ?? [], remote ?? []]) {
    for (const e of list) byDate.set(e.date, e)
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}
