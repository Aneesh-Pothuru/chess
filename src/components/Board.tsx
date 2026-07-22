// Themed wrapper around react-chessboard v5 with drag AND click-to-move.
// Promotion auto-queens (right >99% of the time at this level; the coach
// mentions underpromotion in the endgame drills where it matters).

import { useMemo, useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'

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
}

const SELECT_STYLE: CSSProperties = { background: 'rgba(201, 162, 39, 0.45)' }
const TARGET_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, rgba(201, 111, 59, 0.55) 22%, transparent 24%)',
}
const CAPTURE_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, transparent 62%, rgba(201, 111, 59, 0.6) 66%)',
}

export function Board({
  fen,
  orientation,
  onMove,
  arrows = [],
  highlights = {},
  interactive = true,
  onSquareClick,
  maxWidth = 560,
}: BoardProps) {
  const [selected, setSelected] = useState<Square | null>(null)

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
    // Auto-queen when a pawn reaches the last rank.
    const piece = game.get(from)
    const promotion =
      piece?.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined
    const ok = onMove?.(from, to, promotion) ?? false
    if (ok) setSelected(null)
    return ok
  }

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare || !interactive) return false
    return tryMove(sourceSquare as Square, targetSquare as Square)
  }

  function handleSquareClick({ square, piece }: SquareHandlerArgs) {
    onSquareClick?.(square as Square)
    if (!interactive) return
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

  const squareStyles: Record<string, CSSProperties> = { ...highlights }
  if (selected) squareStyles[selected] = { ...squareStyles[selected], ...SELECT_STYLE }
  for (const [sq, isCapture] of legalTargets) {
    squareStyles[sq] = { ...squareStyles[sq], ...(isCapture ? CAPTURE_STYLE : TARGET_STYLE) }
  }

  return (
    <div className="board-wrap" style={{ maxWidth }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          onPieceDrop: handleDrop,
          onSquareClick: handleSquareClick,
          allowDragging: interactive,
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
    </div>
  )
}
