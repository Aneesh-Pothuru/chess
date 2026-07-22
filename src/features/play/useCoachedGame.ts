// The coached game state machine: play vs the strength-limited opponent while
// the coach layer (instant TS detectors + async analyst evals) annotates a
// live scoresheet, offers takebacks, and enforces the training habits.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess, type Color, type Square } from 'chess.js'
import { getAnalyst, getOpponent } from '../../engine/instances'
import { opponentMove } from '../../engine/opponent'
import { presetById, ANALYST } from '../../engine/presets'
import type { Score } from '../../engine/uci'
import {
  explainMove,
  f7f2Danger,
  hangingPieces,
  judgeMove,
  mateInOneMoves,
  moveAllowsMateInOne,
  opponentMobility,
  queenRaidWarning,
  scoreToCp,
  wonGameActive,
  type MoveJudgment,
} from '../../chess/coach'
import { blackRepertoireFor, london } from '../../data/openings'
import { isAcceptable, nodeAt, primaryMove } from '../../chess/repertoire'
import type { Repertoire } from '../../data/openings/types'
import { update, touchStreak, bumpWeakness, type GameReport } from '../../store/profile'

export interface CoachNote {
  id: number
  kind: 'blunder' | 'mistake' | 'warning' | 'praise' | 'info' | 'book'
  text: string
  /** History length to rewind to when taking back. */
  takebackTo?: number
}

export interface SheetEntry {
  ply: number
  san: string
  judgment?: MoveJudgment
  /** One-line coach verdict shown under the move (player moves only). */
  verdict?: string
  /** Eval after the move, centipawns from White's perspective. */
  evalAfter?: number
  notes: CoachNote[]
}

export interface ThreatPrompt {
  squares: Square[]
  hint: string
}

export type GameStatus = 'idle' | 'playing' | 'over'

const START_CLOCK = 600

export interface CoachedGame {
  fen: string
  status: GameStatus
  playerColor: Color
  entries: SheetEntry[]
  resultText: string
  thinking: boolean
  evalScore: Score | null
  wonGame: boolean
  threatPrompt: ThreatPrompt | null
  clocks: { w: number; b: number }
  engineFailed: boolean
  lastMove: { from: string; to: string } | null
  start: (color: Color, presetId: string, strict: boolean) => void
  playerMove: (from: Square, to: Square, promotion?: string) => boolean
  resolveThreatClick: (square: Square) => void
  skipThreatPrompt: () => void
  takeback: (to: number) => void
  resign: () => void
  hint: () => { from: string; to: string; note: string } | null
  engineHint: () => Promise<{ from: string; to: string; note: string } | null>
}

let noteId = 0

export function useCoachedGame(): CoachedGame {
  const gameRef = useRef(new Chess())
  const [fen, setFen] = useState(gameRef.current.fen())
  const [status, setStatus] = useState<GameStatus>('idle')
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [entries, setEntries] = useState<SheetEntry[]>([])
  const [resultText, setResultText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [evalScore, setEvalScore] = useState<Score | null>(null)
  const [wonGame, setWonGame] = useState(false)
  const [threatPrompt, setThreatPrompt] = useState<ThreatPrompt | null>(null)
  const [clocks, setClocks] = useState({ w: START_CLOCK, b: START_CLOCK })
  const [engineFailed, setEngineFailed] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

  const genRef = useRef(0)
  const presetRef = useRef(presetById('sparring'))
  const strictRef = useRef(true)
  const repRef = useRef<Repertoire | null>(null)
  const bookPathRef = useRef<string[]>([])
  const inBookRef = useRef(true)
  const moveStartRef = useRef(Date.now())
  const moveTimesRef = useRef<number[]>([])
  const motifsRef = useRef<Set<string>>(new Set())
  const wonEverRef = useRef(false)
  const oncePerGameRef = useRef<Set<string>>(new Set())
  const statusRef = useRef<GameStatus>('idle')
  const playerColorRef = useRef<Color>('w')
  const wonGameRef = useRef(false)
  const playerMovedAtRef = useRef(0)

  // ------------------------------------------------------------ clock
  useEffect(() => {
    if (status !== 'playing') return
    const t = setInterval(() => {
      setClocks((c) => {
        const turn = gameRef.current.turn()
        const next = { ...c, [turn]: Math.max(0, c[turn] - 1) }
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [status])

  useEffect(() => {
    if (status !== 'playing') return
    const flagged = clocks.w === 0 ? 'w' : clocks.b === 0 ? 'b' : null
    if (flagged) {
      finish(
        flagged === playerColorRef.current
          ? 'You ran out of time. (Rare for you — usually the opposite problem.)'
          : 'The bot ran out of time.',
        flagged === playerColorRef.current ? 'loss' : 'win',
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clocks, status])

  const judgmentsRef = useRef(new Map<number, MoveJudgment>())

  const pushEntry = useCallback((entry: SheetEntry) => {
    setEntries((prev) => [...prev, entry])
  }, [])

  const attachToEntry = useCallback(
    (
      ply: number,
      judgment?: MoveJudgment,
      note?: CoachNote,
      extra?: { verdict?: string; evalAfter?: number },
    ) => {
      if (judgment) judgmentsRef.current.set(ply, judgment)
      setEntries((prev) =>
        prev.map((e) =>
          e.ply === ply
            ? {
                ...e,
                judgment: judgment ?? e.judgment,
                verdict: extra?.verdict ?? e.verdict,
                evalAfter: extra?.evalAfter ?? e.evalAfter,
                notes: note ? [...e.notes, note] : e.notes,
              }
            : e,
        ),
      )
    },
    [],
  )

  const note = useCallback(
    (ply: number, kind: CoachNote['kind'], text: string, takebackTo?: number) => {
      attachToEntry(ply, undefined, { id: ++noteId, kind, text, takebackTo })
    },
    [attachToEntry],
  )

  // ------------------------------------------------------------ finish & report
  const finish = useCallback(
    (text: string, result: 'win' | 'loss' | 'draw') => {
      if (statusRef.current === 'over') return
      statusRef.current = 'over'
      setStatus('over')
      setResultText(text)
      setThreatPrompt(null)
      const g = gameRef.current
      const history = g.history()
      const color = playerColorRef.current
      const start = color === 'w' ? 0 : 1
      let castleMove: number | null = null
      for (let i = start; i < history.length; i += 2) {
        if (history[i].startsWith('O-O')) {
          castleMove = Math.floor(i / 2) + 1
          break
        }
      }
      const times = moveTimesRef.current
      const judgments = [...judgmentsRef.current.values()]
      const report: GameReport = {
        id: `${Date.now()}`,
        at: Date.now(),
        color,
        presetId: presetRef.current.id,
        result,
        moves: Math.ceil(history.length / 2),
        blunders: judgments.filter((j) => j === 'blunder').length,
        mistakes: judgments.filter((j) => j === 'mistake').length,
        castleMove,
        avgSecondsPerMove: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        motifs: [...motifsRef.current],
        opening: bookPathRef.current.slice(0, 6).join(' ') || 'unknown',
        wonGameConverted: wonEverRef.current ? result === 'win' : null,
      }
      update((p) => {
        p.games.push(report)
      })
      touchStreak()
      if (wonEverRef.current && result !== 'win') bumpWeakness('conversion', 0.05)
      if (wonEverRef.current && result === 'win') bumpWeakness('conversion', -0.03)
      if (castleMove !== null && castleMove <= 8) bumpWeakness('castling', -0.02)
      if (castleMove === null) bumpWeakness('castling', 0.03)
    },
    [],
  )

  const checkGameEnd = useCallback((): boolean => {
    const g = gameRef.current
    if (!g.isGameOver()) return false
    const color = playerColorRef.current
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'b' : 'w'
      finish(
        winner === color ? 'Checkmate — you win. Conversion complete.' : 'Checkmate. Review the scoresheet: where did the scan break down?',
        winner === color ? 'win' : 'loss',
      )
    } else if (g.isStalemate()) {
      finish(
        wonGameRef.current
          ? 'STALEMATE — the classic conversion tragedy. The coach warned about low mobility; always give the king a move.'
          : 'Stalemate — draw.',
        'draw',
      )
    } else {
      finish('Draw.', 'draw')
    }
    return true
  }, [finish])

  // ------------------------------------------------------------ analyst eval
  const runEval = useCallback(
    async (fenBefore: string, fenAfter: string, ply: number, san: string) => {
      const gen = genRef.current
      try {
        const analyst = await getAnalyst()
        const go = `go depth ${ANALYST.checkDepth} movetime 700`
        const before = await analyst.search(fenBefore, go)
        if (gen !== genRef.current) return
        const gameOverAfter = new Chess(fenAfter).isGameOver()
        const after = gameOverAfter ? null : await analyst.search(fenAfter, go)
        if (gen !== genRef.current) return
        const afterScore: Score = after?.score ?? { cp: null, mate: 0 }
        if (!before.score) return
        setEvalScore(after?.score ?? before.score)
        const color = playerColorRef.current
        const won = wonGameActive(after?.score ?? null, fenAfter, color)
        wonGameRef.current = won
        setWonGame(won)
        if (won) wonEverRef.current = true
        if (gameOverAfter) return
        const judgment = judgeMove(before.score, afterScore, color)
        const evalAfter = scoreToCp(afterScore)
        const bestSan = uciToSan(fenBefore, before.bestMove)
        const playedBest = san === bestSan || san.replace(/[+#]/, '') === bestSan.replace(/[+#]/, '')
        const reason = playedBest ? '' : explainMove(fenBefore, before.bestMove)
        const why = reason ? ` — ${reason}` : ''
        let verdict: string
        if (judgment === 'good') {
          verdict = playedBest ? "The engine's top choice." : 'Good — keeps everything you had.'
        } else if (judgment === 'ok') {
          verdict = `Fine. Engine slightly prefers ${bestSan}${why}.`
        } else if (judgment === 'inaccuracy') {
          verdict = `Inaccuracy — ${bestSan} was stronger${why}.`
        } else {
          verdict = judgment === 'mistake' ? 'Mistake — see the note.' : 'Blunder — see the note.'
        }
        attachToEntry(ply, judgment, undefined, { verdict, evalAfter })
        if (judgment === 'blunder' || judgment === 'mistake') {
          const takebackTo = fenHistoryLengthAt(ply)
          attachToEntry(ply, judgment, {
            id: ++noteId,
            kind: judgment,
            text:
              judgment === 'blunder'
                ? `${san} loses ground fast. The position had ${bestSan}${why}. Pause, run checks-captures-threats, and find it next time.`
                : `${san} slips. Stronger was ${bestSan}${why}.`,
            takebackTo: strictRef.current ? takebackTo : undefined,
          })
        }
      } catch {
        if (gen === genRef.current) setEngineFailed(true)
      }
    },
    [attachToEntry],
  )

  // ------------------------------------------------------------ engine reply
  const engineReply = useCallback(async () => {
    const gen = genRef.current
    const g = gameRef.current
    if (g.isGameOver()) return
    setThinking(true)
    try {
      const engine = await getOpponent()
      const uci = await opponentMove(engine, g.fen(), presetRef.current)
      // Let the player's move animation finish before the reply lands — two
      // pieces moving at once reads as chaos.
      const sincePlayer = Date.now() - playerMovedAtRef.current
      if (sincePlayer < 550) await new Promise((r) => setTimeout(r, 550 - sincePlayer))
      // The game may have ended (resign, flag) while the bot was thinking.
      if (gen !== genRef.current || statusRef.current !== 'playing') return
      const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      setLastMove({ from: mv.from, to: mv.to })
      const ply = g.history().length
      setFen(g.fen())
      pushEntry({ ply, san: mv.san, notes: [] })
      // Book tracking for opponent move (rep may be unresolved before Black's
      // repertoire is chosen; the effect below handles that first move).
      const rep = repRef.current
      if (inBookRef.current && rep) {
        if (isInBook(rep, bookPathRef.current, mv.san)) {
          bookPathRef.current = [...bookPathRef.current, mv.san]
        } else {
          inBookRef.current = false
        }
      }
      moveStartRef.current = Date.now()
      if (checkGameEnd()) return
      // Strict mode: surface the new threats before the player moves.
      const color = playerColorRef.current
      const threats: Square[] = []
      let hint = ''
      const hanging = hangingPieces(g.fen(), color)
      if (hanging.length > 0) {
        threats.push(...hanging.map((h) => h.square))
        hint = 'Something of yours can be taken.'
      }
      const f7 = f7f2Danger(g.fen(), color)
      if (f7) {
        threats.push(f7.square)
        hint = `The ${f7.square} strike is loaded — count the attackers before anything else.`
        if (!oncePerGameRef.current.has('f7')) {
          oncePerGameRef.current.add('f7')
          note(ply, 'warning', `Careful: ${f7.attackers.join(' + ')} are converging on ${f7.square}. This exact pattern has beaten you before — usually just capturing back is fine; panic is what loses the game.`)
          motifsRef.current.add('f7f2')
        }
      }
      if (strictRef.current && threats.length > 0) {
        setThreatPrompt({ squares: [...new Set(threats)], hint })
      }
    } catch {
      if (gen === genRef.current) setEngineFailed(true)
    } finally {
      if (gen === genRef.current) setThinking(false)
    }
  }, [checkGameEnd, note, pushEntry])

  // ------------------------------------------------------------ player move
  const playerMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      const g = gameRef.current
      if (statusRef.current !== 'playing' || g.turn() !== playerColorRef.current) return false
      if (threatPrompt) return false // must acknowledge the threat first
      const fenBefore = g.fen()
      let mv
      try {
        mv = g.move({ from, to, promotion })
      } catch {
        return false
      }
      const ply = g.history().length
      const san = mv.san
      const fenAfter = g.fen()
      setFen(fenAfter)
      setLastMove({ from: mv.from, to: mv.to })
      playerMovedAtRef.current = Date.now()
      const seconds = (Date.now() - moveStartRef.current) / 1000
      moveTimesRef.current.push(seconds)
      pushEntry({ ply, san, notes: [] })
      const color = playerColorRef.current
      const takebackTo = ply - 1

      // -------- instant coach checks (no engine needed)
      const mates = mateInOneMoves(fenBefore)
      if (mates.length > 0 && !g.isCheckmate()) {
        note(ply, 'blunder', `You had mate in one: ${mates[0]}. This is the #1 habit — scan for mate EVERY move, both ways.`, takebackTo)
        motifsRef.current.add('missedMateIn1')
        bumpWeakness('mateThreats', 0.04)
      }
      if (!g.isGameOver()) {
        const allows = moveAllowsMateInOne(fenBefore, san)
        if (allows) {
          note(ply, 'warning', `${san} allows mate in one (${allows}). Check every check before you commit.`, takebackTo)
          motifsRef.current.add('allowedMateIn1')
          bumpWeakness('mateThreats', 0.04)
        }
        const beforeHanging = new Set(hangingPieces(fenBefore, color).map((h) => h.square))
        const nowHanging = hangingPieces(fenAfter, color).filter((h) => !beforeHanging.has(h.square))
        if (nowHanging.length > 0) {
          const worst = nowHanging[0]
          note(ply, 'warning', `Your ${pieceName(worst.piece)} on ${worst.square} is ${worst.kind === 'free' ? 'hanging — free to take' : 'attacked by something cheaper'}. the July audit counted 129 hung pieces; the scan takes five seconds.`, takebackTo)
          motifsRef.current.add('hangingPiece')
          bumpWeakness('hangingPiece', 0.03)
        }
        const raid = queenRaidWarning(fenAfter, color)
        if (raid && !oncePerGameRef.current.has('raid')) {
          oncePerGameRef.current.add('raid')
          note(ply, 'warning', `Queen on ${raid} with your minor pieces still at home — the queen-raid rule says finish development first. Every check, capture, and threat in reply must be counted before pawn-grabbing.`)
          motifsRef.current.add('queenRaid')
        }
        if (wonGameRef.current) {
          const mobility = opponentMobility(fenAfter)
          if (mobility <= 3 && !new Chess(fenAfter).inCheck()) {
            note(ply, 'warning', `Opponent is down to ${mobility} legal ${mobility === 1 ? 'reply' : 'replies'} — stalemate territory. Always leave the king a square unless you are giving mate.`)
          }
          if (mv.isCapture()) {
            note(ply, 'praise', 'Trading while ahead — exactly right. Fewer pieces, fewer accidents.')
          }
        }
        // Castling habits.
        if (san.startsWith('O-O')) {
          const moveNo = Math.ceil(ply / 2)
          if (moveNo <= 8) note(ply, 'praise', `Castled by move ${moveNo}. In the July audit, castling this early scored 13 points better than castling late (45% vs 32%) — keep the habit.`)
        } else if (!oncePerGameRef.current.has('castle8')) {
          const moveNo = Math.ceil(ply / 2)
          const stillCanCastle = g.getCastlingRights(color).k || g.getCastlingRights(color).q
          if (moveNo === 8 && stillCanCastle && !hasCastled(g, color)) {
            oncePerGameRef.current.add('castle8')
            note(ply, 'info', 'Move 8 and the king is still in the middle. In the July audit, castling in the opening phase won 45% vs 32% later — make it the next move unless something is on fire.')
          }
        }
        // Ten-second floor.
        if (seconds < 10 && ply > 8 && !oncePerGameRef.current.has(`fast-${Math.floor(ply / 10)}`)) {
          oncePerGameRef.current.add(`fast-${Math.floor(ply / 10)}`)
          note(ply, 'info', `${Math.round(seconds)}s on that move. The audit clocked your losses ending with 4+ minutes unspent — the floor is 10 seconds in any non-forced position.`)
          bumpWeakness('timeUsage', 0.01)
        }
      }

      // -------- book adherence
      if (inBookRef.current && repRef.current) {
        const rep = repRef.current
        const path = bookPathRef.current
        if (isAcceptable(rep, path, san)) {
          bookPathRef.current = [...path, san]
          const node = nodeAt(rep, bookPathRef.current)
          if (node?.note) note(ply, 'book', node.note)
        } else {
          const book = primaryMove(rep, path)
          if (book) {
            note(ply, 'book', `Off-book: your repertoire plays ${book.san} here${book.note ? ` — ${book.note}` : '.'}`)
            bumpWeakness(rep.id === 'caro-kann' ? 'openingE4' : rep.id === 'kings-indian' ? 'openingD4' : 'openingE4', 0.01)
          }
          inBookRef.current = false
        }
      }

      if (!checkGameEnd()) {
        void runEval(fenBefore, fenAfter, ply, san)
        void engineReply()
      } else {
        void runEval(fenBefore, fenAfter, ply, san)
      }
      return true
    },
    [checkGameEnd, engineReply, note, pushEntry, runEval, threatPrompt],
  )

  // ------------------------------------------------------------ controls
  const start = useCallback(
    (color: Color, presetId: string, strict: boolean) => {
      genRef.current++
      gameRef.current = new Chess()
      presetRef.current = presetById(presetId)
      strictRef.current = strict
      playerColorRef.current = color
      statusRef.current = 'playing'
      bookPathRef.current = []
      inBookRef.current = true
      repRef.current = color === 'w' ? london : null // black repertoire resolves on White's first move
      moveTimesRef.current = []
      judgmentsRef.current = new Map()
      motifsRef.current = new Set()
      wonEverRef.current = false
      wonGameRef.current = false
      oncePerGameRef.current = new Set()
      moveStartRef.current = Date.now()
      setPlayerColor(color)
      setEntries([])
      setResultText('')
      setEvalScore(null)
      setWonGame(false)
      setThreatPrompt(null)
      setEngineFailed(false)
      setLastMove(null)
      playerMovedAtRef.current = 0
      setClocks({ w: START_CLOCK, b: START_CLOCK })
      setFen(gameRef.current.fen())
      setStatus('playing')
      void getOpponent().then((e) => e.newGame())
      void getAnalyst().then((e) => e.newGame())
      if (color === 'b') void engineReply()
    },
    [engineReply],
  )

  // Resolve the black repertoire once White's first move is known.
  useEffect(() => {
    if (playerColor === 'b' && entries.length === 1 && repRef.current === null) {
      repRef.current = blackRepertoireFor(entries[0].san)
      if (isInBook(repRef.current, [], entries[0].san)) {
        bookPathRef.current = [entries[0].san]
      } else {
        inBookRef.current = false
      }
    }
  }, [entries, playerColor])

  const resolveThreatClick = useCallback(
    (square: Square) => {
      if (!threatPrompt) return
      if (threatPrompt.squares.includes(square)) {
        setThreatPrompt(null)
        moveStartRef.current = Date.now()
      }
    },
    [threatPrompt],
  )

  const skipThreatPrompt = useCallback(() => setThreatPrompt(null), [])

  const takeback = useCallback((to: number) => {
    const g = gameRef.current
    genRef.current++ // cancel in-flight evals/replies
    while (g.history().length > to) g.undo()
    // If it is now the engine's turn (player took back an engine reply too), undo once more.
    if (g.turn() !== playerColorRef.current && g.history().length > 0) g.undo()
    const len = g.history().length
    setEntries((prev) => prev.filter((e) => e.ply <= len))
    for (const ply of [...judgmentsRef.current.keys()]) {
      if (ply > len) judgmentsRef.current.delete(ply)
    }
    // Recompute book state from scratch — a takeback can put us back IN book.
    const rep = repRef.current
    bookPathRef.current = []
    inBookRef.current = true
    if (rep) {
      for (const san of g.history()) {
        if (inBookRef.current && isInBook(rep, bookPathRef.current, san)) {
          bookPathRef.current = [...bookPathRef.current, san]
        } else {
          inBookRef.current = false
        }
      }
    }
    setFen(g.fen())
    setThreatPrompt(null)
    setThinking(false)
    setEvalScore(null)
    const hist = g.history({ verbose: true })
    const tail = hist[hist.length - 1]
    setLastMove(tail ? { from: tail.from, to: tail.to } : null)
    moveStartRef.current = Date.now()
  }, [])

  const resign = useCallback(() => {
    finish('You resigned. Every resignation is a data point — tag the leak in the report.', 'loss')
  }, [finish])

  const hint = useCallback((): { from: string; to: string; note: string } | null => {
    if (gameRef.current.turn() !== playerColorRef.current) return null
    if (!inBookRef.current || !repRef.current) return null
    const book = primaryMove(repRef.current, bookPathRef.current)
    if (!book) return null
    const g = new Chess(gameRef.current.fen())
    try {
      const mv = g.move(book.san)
      return { from: mv.from, to: mv.to, note: book.note ?? `Repertoire move: ${book.san}` }
    } catch {
      return null
    }
  }, [])

  /** Book hint when in book; otherwise ask the analyst and explain its choice. */
  const engineHint = useCallback(async (): Promise<{ from: string; to: string; note: string } | null> => {
    const book = hint()
    if (book) return book
    if (statusRef.current !== 'playing' || gameRef.current.turn() !== playerColorRef.current) return null
    const gen = genRef.current
    try {
      const analyst = await getAnalyst()
      const fen = gameRef.current.fen()
      const res = await analyst.search(fen, 'go depth 12 movetime 900')
      if (gen !== genRef.current || !res.bestMove || res.bestMove === '(none)') return null
      const san = uciToSan(fen, res.bestMove)
      const reason = explainMove(fen, res.bestMove)
      return {
        from: res.bestMove.slice(0, 2),
        to: res.bestMove.slice(2, 4),
        note: `Out of book, so this is analysis, not repertoire: ${san}${reason ? ` — ${reason}` : ''}.`,
      }
    } catch {
      return null
    }
  }, [hint])

  return {
    fen,
    status,
    playerColor,
    entries,
    resultText,
    thinking,
    evalScore,
    wonGame,
    threatPrompt,
    clocks,
    engineFailed,
    lastMove,
    start,
    playerMove,
    resolveThreatClick,
    skipThreatPrompt,
    takeback,
    resign,
    hint,
    engineHint,
  }
}

// ------------------------------------------------------------ helpers

function pieceName(p: string): string {
  return { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[p] ?? p
}

function uciToSan(fen: string, uci: string): string {
  try {
    const g = new Chess(fen)
    const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return mv.san
  } catch {
    return uci
  }
}

function fenHistoryLengthAt(ply: number): number {
  return ply - 1
}

function hasCastled(g: Chess, color: Color): boolean {
  const start = color === 'w' ? 0 : 1
  const h = g.history()
  for (let i = start; i < h.length; i += 2) if (h[i].startsWith('O-O')) return true
  return false
}

function isInBook(rep: Repertoire, path: string[], san: string): boolean {
  const node = nodeAt(rep, [...path, san])
  return node !== null
}
