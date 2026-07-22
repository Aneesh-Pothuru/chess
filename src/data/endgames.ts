// Endgame curriculum drills, in the research-verified teaching order.
// Mate drills are played out against full-strength engine defense; stalemate
// or exceeding the move target fails the drill with an explanation.

export interface EndgameDrill {
  id: string
  title: string
  stage: number // curriculum order
  fen: string
  playerColor: 'w' | 'b'
  /** Mate (or win condition) within this many player moves. */
  moveTarget: number
  goal: 'mate' | 'promote' | 'draw'
  lesson: string
  /** Named trap this drill is specifically testing. */
  trap?: string
}

export const ENDGAME_DRILLS: EndgameDrill[] = [
  // Stage 1 — two-rook ladder mate
  {
    id: 'ladder-1',
    title: 'Two-rook ladder mate',
    stage: 1,
    fen: '8/8/4k3/8/8/8/R7/1R2K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 8,
    goal: 'mate',
    lesson:
      'The ladder: one rook checks, the other cuts off the next rank. Walk the king to the edge rung by rung. If the king attacks a rook, slide that rook to the far side of the board.',
  },
  {
    id: 'ladder-2',
    title: 'Ladder mate, rooks under attack',
    stage: 1,
    fen: '8/8/8/3k4/8/8/R7/R3K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 9,
    goal: 'mate',
    lesson: 'Same ladder, but the king will chase your rooks. The answer is always the same: move the harassed rook far away along its rank — it loses no power at distance.',
  },
  // Stage 2 — K+Q mate
  {
    id: 'kq-1',
    title: 'King + queen mate',
    stage: 2,
    fen: '8/8/3k4/8/8/8/8/2Q1K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 10,
    goal: 'mate',
    lesson:
      "The box method: put your queen a knight's-move away from their king and shrink the box every move — never check. When their king reaches the edge, bring YOUR king up two squares away, then mate.",
    trap: "Queen a knight's-move from a CORNERED king = stalemate. When the king sits in the corner, stop shrinking and walk your own king in.",
  },
  {
    id: 'kq-stalemate-test',
    title: 'K+Q: the stalemate minefield',
    stage: 2,
    fen: 'k7/8/8/2Q5/8/8/8/4K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 6,
    goal: 'mate',
    lesson:
      'The king is already cornered on a8. Qb6?? or Qc7?? right now is STALEMATE — the exact draw that has cost you half-points. Mark time with your king (Kd2, Ke3...) and only close in when mate is forced.',
    trap: 'Qc7 or Qb6 immediately = stalemate. The queen waits; the king walks.',
  },
  // Stage 3 — K+R mate
  {
    id: 'kr-1',
    title: 'King + rook mate',
    stage: 3,
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 16,
    goal: 'mate',
    lesson:
      'The box, patiently: the rook fences the king; your king walks up to take the opposition. When the kings face off, check with the rook to push theirs back a rank. Repeat to the edge.',
    trap: 'Kc6+Rb7 vs Ka8 with Black to move is stalemate — keep the fenced area no smaller than it must be until your king arrives.',
  },
  // Stage 4 — rule of the square
  {
    id: 'square-1',
    title: 'Rule of the square: catch it',
    stage: 4,
    fen: '8/8/8/8/5k2/8/1P6/1K6 b - - 0 1',
    playerColor: 'b',
    moveTarget: 6,
    goal: 'draw',
    lesson:
      "Draw the square from the pawn to its promotion rank. If your king can step inside it, the pawn is caught. From f4: Ke4, then d5, c5, and take on b6 — inside the square the whole way.",
  },
  {
    id: 'square-2',
    title: 'Rule of the square: promote it',
    stage: 4,
    fen: '8/8/8/8/7k/8/1P6/1K6 w - - 0 1',
    playerColor: 'w',
    moveTarget: 6,
    goal: 'promote',
    lesson:
      'From h4 the king stands OUTSIDE the square once you push: b4! Now count — it can never step inside. One tempo decides every pawn race; do this count before pushing, every time.',
  },
  // Stage 5 — opposition
  {
    id: 'opp-1',
    title: 'Opposition: win the duel',
    stage: 5,
    fen: '8/4k3/8/4K3/8/4P3/8/8 w - - 0 1',
    playerColor: 'w',
    moveTarget: 12,
    goal: 'promote',
    lesson:
      'Your king stands TWO squares in front of the pawn — that wins no matter whose move it is. Method: king first, pawn only when the king cannot improve, and push to the 7th WITHOUT giving check, or it is a draw.',
    trap: 'Advancing the pawn early throws the win away. King leads; pawn follows.',
  },
  {
    id: 'opp-2',
    title: 'Opposition: hold the draw',
    stage: 5,
    fen: '4k3/8/8/4K3/4P3/8/8/8 b - - 0 1',
    playerColor: 'b',
    moveTarget: 12,
    goal: 'draw',
    lesson:
      'Defending side: stay directly in front of the pawn, and when pushed back, drop STRAIGHT back to keep taking the opposition. Corner rule bonus: against a rook pawn, reaching the corner always draws.',
  },
  // Stage 6 — key squares / technique
  {
    id: 'kp-key-1',
    title: 'Key squares: king in front',
    stage: 6,
    fen: '8/8/3k4/8/3K4/8/3P4/8 w - - 0 1',
    playerColor: 'w',
    moveTarget: 14,
    goal: 'promote',
    lesson:
      'Win condition checklist: king two ahead of the pawn (yes), now fight for the key squares c5/d5/e5. Advance the KING; the pawn is the last piece to move.',
  },
  // Stage 7 — practical technique
  {
    id: 'rook-cut-1',
    title: 'Rook endgame: cut the king',
    stage: 7,
    fen: '8/8/1k6/8/8/8/PK6/7R w - - 0 1',
    playerColor: 'w',
    moveTarget: 18,
    goal: 'promote',
    lesson:
      'The winning pattern: use the rook to cut the enemy king off by a FILE, then walk your pawn home behind the fence. Rh6/Rh5 first, march second.',
  },
  {
    id: 'q-vs-p-1',
    title: 'Queen vs 7th-rank pawn',
    stage: 7,
    fen: '8/8/8/7Q/8/2k3K1/1p6/8 w - - 0 1',
    playerColor: 'w',
    moveTarget: 12,
    goal: 'mate',
    lesson:
      'The b-pawn cannot save itself: check until the king is forced IN FRONT of its own pawn — that move costs Black a tempo, and your king takes a free step closer each time. Repeat, arrive, mate. (Rook and bishop pawns have stalemate tricks; knight pawns do not.)',
  },
]

export const STAGE_NAMES: Record<number, string> = {
  1: 'Ladder mate',
  2: 'Queen mate',
  3: 'Rook mate',
  4: 'Rule of the square',
  5: 'Opposition',
  6: 'Key squares',
  7: 'Practical technique',
}
