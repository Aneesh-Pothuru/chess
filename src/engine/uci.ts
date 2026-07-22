// Thin promise-based wrapper around a Stockfish UCI worker.
// One UciEngine per Worker; commands are serialized through a queue so
// overlapping searches can never interleave their output.

export interface Score {
  /** Centipawns from White's perspective, or null when mate is scored. */
  cp: number | null
  /** Moves until mate from White's perspective (negative: White gets mated). */
  mate: number | null
}

export interface SearchResult {
  bestMove: string // UCI, e.g. "e2e4" or "e7e8q"
  score: Score | null
  /** Principal variation in UCI moves, from the searched position. */
  pv: string[]
}

const WORKER_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`

export class UciEngine {
  private worker: Worker | null = null
  private listeners: Array<(line: string) => void> = []
  private queue: Promise<unknown> = Promise.resolve()
  private _ready = false

  get ready(): boolean {
    return this._ready
  }

  async init(): Promise<void> {
    if (this.worker) return
    this.worker = new Worker(WORKER_URL)
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : ''
      for (const fn of [...this.listeners]) fn(line)
    }
    await this.request('uci', (line) => line === 'uciok')
    await this.waitReady()
    this._ready = true
  }

  send(cmd: string): void {
    this.worker?.postMessage(cmd)
  }

  /** Send a command and resolve when `until` matches an output line. */
  private request(cmd: string, until: (line: string) => boolean, timeoutMs = 20000): Promise<string> {
    const run = () =>
      new Promise<string>((resolve, reject) => {
        if (!this.worker) return reject(new Error('engine not initialized'))
        const timer = setTimeout(() => {
          this.listeners = this.listeners.filter((l) => l !== onLine)
          reject(new Error(`engine timeout waiting after: ${cmd}`))
        }, timeoutMs)
        const onLine = (line: string) => {
          if (until(line)) {
            clearTimeout(timer)
            this.listeners = this.listeners.filter((l) => l !== onLine)
            resolve(line)
          }
        }
        this.listeners.push(onLine)
        this.send(cmd)
      })
    const next = this.queue.then(run, run)
    this.queue = next.catch(() => undefined)
    return next
  }

  async waitReady(): Promise<void> {
    await this.request('isready', (line) => line === 'readyok')
  }

  async setOption(name: string, value: string | number): Promise<void> {
    this.send(`setoption name ${name} value ${value}`)
    await this.waitReady()
  }

  /**
   * Run a search from `fen`. `go` example: "go depth 10" / "go movetime 200".
   * Score is normalized to White's perspective.
   */
  async search(fen: string, go: string, timeoutMs = 30000): Promise<SearchResult> {
    const whiteToMove = fen.split(' ')[1] !== 'b'
    let lastInfo: { score: Score; pv: string[] } | null = null
    const infoListener = (line: string) => {
      if (!line.startsWith('info ') || !line.includes(' multipv 1 ') && !line.includes(' score ')) return
      if (line.includes(' multipv ') && !line.includes(' multipv 1 ')) return
      const m = /score (cp|mate) (-?\d+)/.exec(line)
      if (!m) return
      const raw = Number(m[2])
      const sign = whiteToMove ? 1 : -1
      const score: Score =
        m[1] === 'cp' ? { cp: raw * sign, mate: null } : { cp: null, mate: raw * sign }
      const pvm = / pv (.+)$/.exec(line)
      lastInfo = { score, pv: pvm ? pvm[1].trim().split(/\s+/) : [] }
    }
    this.listeners.push(infoListener)
    try {
      this.send(`position fen ${fen}`)
      const bestLine = await this.request(go, (line) => line.startsWith('bestmove'), timeoutMs)
      const bestMove = bestLine.split(/\s+/)[1]
      const info = lastInfo as { score: Score; pv: string[] } | null
      return { bestMove, score: info?.score ?? null, pv: info?.pv ?? [] }
    } finally {
      this.listeners = this.listeners.filter((l) => l !== infoListener)
    }
  }

  async newGame(): Promise<void> {
    this.send('ucinewgame')
    await this.waitReady()
  }

  destroy(): void {
    this.worker?.terminate()
    this.worker = null
    this._ready = false
    this.listeners = []
  }
}
