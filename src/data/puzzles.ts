// Curated Lichess puzzles (CC0), filtered July 2026 export: rating 400-1500,
// popularity >= 80, plays >= 200, bucketed by the player's miss profile.

import rawJson from './puzzles.json'
import type { RawPuzzle } from '../chess/calculation'

export const PUZZLE_BUCKETS = rawJson as Record<string, RawPuzzle[]>

export interface BucketInfo {
  id: string
  label: string
  why: string
}

export const BUCKET_INFO: BucketInfo[] = [
  { id: 'mateIn1', label: 'Mate in 1', why: 'You have missed eight of these in real games. Five seconds of scanning fixes it.' },
  { id: 'mateIn2', label: 'Mate in 2', why: 'The follow-up skill: forcing sequences two moves deep.' },
  { id: 'mateIn3', label: 'Mate in 3', why: 'You are 0-for-5 lifetime on long mates. Stretch goal.' },
  { id: 'fork', label: 'Forks', why: 'You find only two-thirds of knight forks. This bucket closes the gap.' },
  { id: 'hangingPiece', label: 'Hanging pieces', why: '129 pieces left hanging all-time, including 12 queens. The single highest-value habit.' },
  { id: 'discoveredAttack', label: 'Discovered attacks', why: 'The tactic that hides behind your own piece.' },
  { id: 'pin', label: 'Pins', why: 'See them, use them, escape them.' },
  { id: 'skewer', label: 'Skewers', why: 'The pin\'s bigger sibling.' },
  { id: 'backRankMate', label: 'Back-rank mates', why: 'Checkmated in 45 of 88 losses — many on the back rank. Both directions matter.' },
  { id: 'attackingF2F7', label: 'The f7/f2 strike', why: 'Losses #1 and #2 died to Nxf7 tricks. Learn the pattern from BOTH sides.' },
  { id: 'trappedPiece', label: 'Trapped pieces', why: 'Queens that wander get caught — yours and theirs.' },
  { id: 'promotion', label: 'Promotion', why: 'Pawn endings are won and lost at the finish line.' },
  { id: 'defensiveMove', label: 'Defense', why: 'Finding the one move that holds. Not every puzzle is an attack.' },
  { id: 'rookEndgame', label: 'Rook endgames', why: 'The most common endgame in rapid chess.' },
  { id: 'pawnEndgame', label: 'Pawn endgames', why: 'Square rule and opposition, applied under pressure.' },
  { id: 'queenEndgame', label: 'Queen endgames', why: 'Convert with the queen without stalemating.' },
  { id: 'op:london', label: 'From London games', why: 'Tactics that actually occurred in London System games.' },
  { id: 'op:caroKann', label: 'From Caro-Kann games', why: 'Tactics from real Caro-Kann positions.' },
  { id: 'op:kingsIndian', label: "From King's Indian games", why: "Tactics from real King's Indian positions." },
]

export function puzzlesFor(bucketId: string): RawPuzzle[] {
  return PUZZLE_BUCKETS[bucketId] ?? []
}

export function allBucketIds(): string[] {
  return Object.keys(PUZZLE_BUCKETS)
}
