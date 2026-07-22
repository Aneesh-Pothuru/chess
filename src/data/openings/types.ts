export interface RepNode {
  /** SAN move played to reach this node. */
  san: string
  /** Coach explanation shown when this move is played or taught. */
  note?: string
  /** Our repertoire move at a player-to-move level (exactly one per sibling group). */
  primary?: boolean
  /** Acceptable alternative for the player (not drilled, but not flagged). */
  alsoOk?: boolean
  /** Opponent-move sampling weight for drills (default 1). */
  weight?: number
  /** Variation label, e.g. "Advance Variation". */
  name?: string
  children?: RepNode[]
}

export interface Repertoire {
  id: string
  name: string
  color: 'w' | 'b'
  /** Which first moves by White this repertoire answers (for auto-routing). */
  vs?: string[]
  keyIdeas: string[]
  /** Traps and named dangers the player must know. */
  watchFor: string[]
  root: RepNode[]
}

/** Compact node builder used by the data files. */
export function n(
  san: string,
  opts: Omit<RepNode, 'san' | 'children'> = {},
  children?: RepNode[],
): RepNode {
  return { san, ...opts, ...(children && children.length > 0 ? { children } : {}) }
}
