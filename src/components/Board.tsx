// Themed wrapper around react-chessboard v5 with drag AND click-to-move.
// Pawn promotion opens a picker (react-chessboard's own piece set) anchored
// over the promotion square — v5 has no built-in dialog, so this is the
// documented pattern: intercept the move, render the choice, then submit.

import { useMemo, useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import {
  Chessboard,
  defaultPieces,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from 'react-chessboard'

export interface CoachArrow {
  from: string
  to: string
  color?: string
}

interface BoardProps {
  fen: string
  orientation: 'white' | 'black'
  /** Return true to accept the move. Called with SAN-compatible from/to. */
  onMove?: (from: Square, to: Square, promotion?: string) => boolean
  arrows?: CoachArrow[]
  highlights?: Record<string, CSSProperties>
  interactive?: boolean
  onSquareClick?: (square: Square) => void
  maxWidth?: number
  /** The move just played — its from/to squares get the standard soft tint. */
  lastMove?: { from: string; to: string } | null
}

const SELECT_STYLE: CSSProperties = { background: 'rgba(201, 162, 39, 0.45)' }
const LAST_MOVE_STYLE: CSSProperties = { background: 'rgba(201, 162, 39, 0.25)' }
const TARGET_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, rgba(201, 111, 59, 0.55) 22%, transparent 24%)',
}
const CAPTURE_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, transparent 62%, rgba(201, 111, 59, 0.6) 66%)',
}

const PROMOTION_CHOICES = ['q', 'r', 'n', 'b'] as const

export function Board({
  fen,
  orientation,
  onMove,
  arrows = [],
  highlights = {},
  interactive = true,
  onSquareClick,
  maxWidth = 560,
  lastMove = null,
}: BoardProps) {
  // Selection remembers the fen it was made against, so any external position
  // change (engine reply, takeback, next puzzle) invalidates it implicitly.
  const [sel, setSel] = useState<{ square: Square; fen: string } | null>(null)
  const selected = sel && sel.fen === fen ? sel.square : null
  const setSelected = (square: Square | null) => setSel(square ? { square, fen } : null)

  // A pawn move onto the last rank parks here until a piece is picked.
  // Fen-keyed for the same reason as the selection.
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square; fen: string } | null>(null)
  const pending = pendingPromo && pendingPromo.fen === fen ? pendingPromo : null

  const game = useMemo(() => new Chess(fen), [fen])

  const legalTargets = useMemo(() => {
    if (!selected) return new Map<string, boolean>()
    const targets = new Map<string, boolean>()
    for (const m of game.moves({ square: selected, verbose: true })) {
      targets.set(m.to, m.isCapture())
    }
    return targets
  }, [selected, game])

  function tryMove(from: Square, to: Square): boolean {
    const isPromotion = game
      .moves({ square: from, verbose: true })
      .some((m) => m.to === to && m.promotion !== undefined)
    if (isPromotion) {
      // Hold the move and let the picker finish it. Returning false keeps the
      // dragged pawn on its source square until a piece is chosen.
      setPendingPromo({ from, to, fen })
      setSelected(null)
      return false
    }
    const ok = onMove?.(from, to, undefined) ?? false
    if (ok) setSelected(null)
    return ok
  }

  function pickPromotion(piece: (typeof PROMOTION_CHOICES)[number]) {
    if (!pending) return
    setPendingPromo(null)
    onMove?.(pending.from, pending.to, piece)
  }

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare || !interactive) return false
    return tryMove(sourceSquare as Square, targetSquare as Square)
  }

  function handleSquareClick({ square, piece }: SquareHandlerArgs) {
    onSquareClick?.(square as Square)
    if (!interactive) return
    if (pending) {
      setPendingPromo(null)
      return
    }
    if (selected && legalTargets.has(square)) {
      tryMove(selected, square as Square)
      return
    }
    if (piece && piece.pieceType[0] === game.turn()) {
      setSelected(square as Square)
    } else {
      setSelected(null)
    }
  }

  const squareStyles: Record<string, CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = LAST_MOVE_STYLE
    squareStyles[lastMove.to] = LAST_MOVE_STYLE
  }
  for (const [sq, style] of Object.entries(highlights)) {
    squareStyles[sq] = { ...squareStyles[sq], ...style }
  }
  if (selected) squareStyles[selected] = { ...squareStyles[selected], ...SELECT_STYLE }
  for (const [sq, isCapture] of legalTargets) {
    squareStyles[sq] = { ...squareStyles[sq], ...(isCapture ? CAPTURE_STYLE : TARGET_STYLE) }
  }

  // Picker geometry: a column of four squares anchored over the promotion
  // square, growing toward the board's center (lichess-style). The promotion
  // square is on the viewer's top row when the mover promotes toward them.
  const promoColor = game.turn() // side to move owns the pending promotion
  const promoLeft = pending
    ? (orientation === 'white'
        ? pending.to.charCodeAt(0) - 97
        : 104 - pending.to.charCodeAt(0)) * 12.5
    : 0
  const promoAtTop = pending
    ? (orientation === 'white') === (pending.to[1] === '8')
    : true

  return (
    <div className="board-wrap" style={{ maxWidth, position: 'relative' }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          onPieceDrop: handleDrop,
          onSquareClick: handleSquareClick,
          allowDragging: interactive && !pending,
          squareStyles,
          arrows: arrows.map((a) => ({
            startSquare: a.from,
            endSquare: a.to,
            color: a.color ?? '#c96f3b',
          })),
          animationDurationInMs: 180,
          darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
          lightSquareStyle: { backgroundColor: 'var(--board-light)' },
          boardStyle: { borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.45)' },
        }}
      />
      {pending && (
        <>
          <div
            aria-label="cancel promotion"
            onClick={() => setPendingPromo(null)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(20, 16, 12, 0.45)',
              borderRadius: 6,
              zIndex: 5,
            }}
          />
          <div
            role="dialog"
            aria-label="choose promotion piece"
            style={{
              position: 'absolute',
              left: `${promoLeft}%`,
              width: '12.5%',
              zIndex: 6,
              display: 'flex',
              flexDirection: promoAtTop ? 'column' : 'column-reverse',
              ...(promoAtTop ? { top: 0 } : { bottom: 0 }),
              background: 'var(--board-light)',
              borderRadius: 4,
              boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
              overflow: 'hidden',
            }}
          >
            {PROMOTION_CHOICES.map((p) => {
              const Piece = defaultPieces[`${promoColor}${p.toUpperCase()}` as keyof typeof defaultPieces]
              return (
                <button
                  key={p}
                  aria-label={`promote to ${p === 'q' ? 'queen' : p === 'r' ? 'rook' : p === 'n' ? 'knight' : 'bishop'}`}
                  onClick={() => pickPromotion(p)}
                  style={{
                    display: 'block',
                    width: '100%',
                    aspectRatio: '1',
                    padding: '6%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Piece />
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
