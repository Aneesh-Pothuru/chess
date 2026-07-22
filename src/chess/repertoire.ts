// Walking and drilling repertoire trees. A tree starts from the initial
// position; node depth alternates colors starting with White's first move.

import { Chess } from 'chess.js'
import type { RepNode, Repertoire } from '../data/openings/types'

export interface WalkState {
  rep: Repertoire
  /** SAN path from the start position. */
  path: string[]
  node: RepNode | null // null once off the end of the book
}

/** Whose move is it after `path`? */
export function turnAfter(path: string[]): 'w' | 'b' {
  return path.length % 2 === 0 ? 'w' : 'b'
}

export function childrenAt(rep: Repertoire, path: string[]): RepNode[] {
  let nodes = rep.root
  for (const san of path) {
    const found = nodes.find((c) => c.san === san)
    if (!found) return []
    nodes = found.children ?? []
  }
  return nodes
}

export function nodeAt(rep: Repertoire, path: string[]): RepNode | null {
  let nodes = rep.root
  let node: RepNode | null = null
  for (const san of path) {
    node = nodes.find((c) => c.san === san) ?? null
    if (!node) return null
    nodes = node.children ?? []
  }
  return node
}

/** The repertoire (primary) move for the player at this point, if any. */
export function primaryMove(rep: Repertoire, path: string[]): RepNode | null {
  const options = childrenAt(rep, path)
  return options.find((c) => c.primary) ?? null
}

export function isAcceptable(rep: Repertoire, path: string[], san: string): boolean {
  const options = childrenAt(rep, path)
  const found = options.find((c) => c.san === san)
  return !!found && (found.primary === true || found.alsoOk === true)
}

/** Weighted-random opponent reply for drills. */
export function sampleReply(rep: Repertoire, path: string[], rng: () => number = Math.random): RepNode | null {
  const options = childrenAt(rep, path)
  if (options.length === 0) return null
  const total = options.reduce((s, c) => s + (c.weight ?? 1), 0)
  let r = rng() * total
  for (const c of options) {
    r -= c.weight ?? 1
    if (r <= 0) return c
  }
  return options[options.length - 1]
}

export interface RepLine {
  /** SRS key: repId + '/' + moves joined by spaces. */
  key: string
  path: string[]
  /** Variation names encountered along the path. */
  names: string[]
}

/** Every root-to-leaf path (a drillable "line"). */
export function enumerateLines(rep: Repertoire): RepLine[] {
  const lines: RepLine[] = []
  const walk = (nodes: RepNode[], path: string[], names: string[]) => {
    for (const node of nodes) {
      const nextPath = [...path, node.san]
      const nextNames = node.name ? [...names, node.name] : names
      if (!node.children || node.children.length === 0) {
        lines.push({ key: `${rep.id}/${nextPath.join(' ')}`, path: nextPath, names: nextNames })
      } else {
        walk(node.children, nextPath, nextNames)
      }
    }
  }
  walk(rep.root, [], [])
  return lines
}

/** Replay a path onto a fresh board. Throws on illegal SAN — tests rely on this. */
export function fenAfter(path: string[]): string {
  const game = new Chess()
  for (const san of path) game.move(san)
  return game.fen()
}

/**
 * Validate every path through the tree is legal, and structural rules hold:
 * player-to-move levels have exactly one primary; opponent levels have none.
 * Returns a list of problems (empty = valid).
 */
export function validateRepertoire(rep: Repertoire): string[] {
  const problems: string[] = []
  const walk = (nodes: RepNode[], path: string[], game: Chess) => {
    const playerToMove = game.turn() === rep.color
    const primaries = nodes.filter((c) => c.primary)
    if (playerToMove && nodes.length > 0 && primaries.length !== 1) {
      problems.push(`${rep.id} at [${path.join(' ')}]: expected exactly 1 primary, got ${primaries.length}`)
    }
    if (!playerToMove && primaries.length > 0) {
      problems.push(`${rep.id} at [${path.join(' ')}]: opponent level has primary flags`)
    }
    for (const node of nodes) {
      try {
        game.move(node.san)
      } catch {
        problems.push(`${rep.id} at [${path.join(' ')}]: illegal move ${node.san}`)
        continue
      }
      walk(node.children ?? [], [...path, node.san], game)
      game.undo()
    }
  }
  walk(rep.root, [], new Chess())
  return problems
}
