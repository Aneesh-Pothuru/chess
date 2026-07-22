// The signature element: a live tournament scoresheet the coach annotates in
// the margin as the game unfolds.

import { useEffect, useRef } from 'react'
import { JUDGMENT_GLYPH } from '../chess/coach'
import type { CoachNote, SheetEntry } from '../features/play/useCoachedGame'

interface ScoresheetProps {
  entries: SheetEntry[]
  title: string
  subtitle?: string
  onTakeback?: (to: number) => void
  allowTakeback: boolean
}

const NOTE_CLASS: Record<CoachNote['kind'], string> = {
  blunder: 'bad',
  mistake: 'bad',
  warning: 'bad',
  praise: 'good',
  info: '',
  book: '',
}

export function Scoresheet({ entries, title, subtitle, onTakeback, allowTakeback }: ScoresheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    sheetRef.current?.scrollTo({ top: sheetRef.current.scrollHeight })
  }, [entries])

  // Group into move rows (white ply, black ply), interleaving margin notes.
  const rows: Array<{ num: number; white?: SheetEntry; black?: SheetEntry }> = []
  for (const e of entries) {
    const num = Math.ceil(e.ply / 2)
    let row = rows[rows.length - 1]
    if (!row || row.num !== num) {
      row = { num }
      rows.push(row)
    }
    if (e.ply % 2 === 1) row.white = e
    else row.black = e
  }

  const glyphClass = (e?: SheetEntry) =>
    e?.judgment ? `glyph-${e.judgment}` : ''

  const fmtEval = (cp?: number): string => {
    if (cp === undefined) return ''
    if (cp >= 9000) return '+M'
    if (cp <= -9000) return '-M'
    const p = cp / 100
    return `${p > 0 ? '+' : ''}${p.toFixed(1)}`
  }

  const verdictClass = (e: SheetEntry): string =>
    e.judgment === 'good' ? 'good' : e.judgment === 'blunder' || e.judgment === 'mistake' ? 'bad' : ''

  return (
    <div className="scoresheet">
      <header>
        <span>{title}</span>
        <span className="muted small">{subtitle}</span>
      </header>
      <div className="sheet" ref={sheetRef}>
        {rows.length === 0 && <div className="muted">The scoresheet fills in as you play.</div>}
        {rows.map((row) => (
          <div key={row.num}>
            <div className="moverow">
              <span className="num">{row.num}.</span>
              <span className={glyphClass(row.white)}>
                {row.white ? row.white.san + (JUDGMENT_GLYPH[row.white.judgment ?? 'ok'] ?? '') : ''}
              </span>
              <span className={glyphClass(row.black)}>
                {row.black ? row.black.san + (JUDGMENT_GLYPH[row.black.judgment ?? 'ok'] ?? '') : ''}
              </span>
            </div>
            {[row.white, row.black].map(
              (e) =>
                e && (
                  <div key={`x${e.ply}`}>
                    {e.verdict && (
                      <div className={`verdict ${verdictClass(e)}`}>
                        {e.evalAfter !== undefined && <span className="eval-chip">{fmtEval(e.evalAfter)}</span>}
                        <span className="who">{e.ply % 2 === 1 ? '' : '… '}{e.san}:</span> {e.verdict}
                      </div>
                    )}
                    {e.notes.map((note) => (
                      <div key={note.id} className={`margin-note ${NOTE_CLASS[note.kind]}`}>
                        {note.text}
                        {allowTakeback && note.takebackTo !== undefined && onTakeback && (
                          <div className="actions">
                            <button onClick={() => onTakeback(note.takebackTo!)}>Take back & retry</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
