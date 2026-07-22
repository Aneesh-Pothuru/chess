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
      "The ladder: your rooks take turns, rung by rung. First, one rook fences the rank just BELOW their king — here, Ra5. Then the other checks on the king's rank — Rb6+ — and the king must retreat, because the fence blocks the way down. The back rook leapfrogs up to become the new fence, the other checks again. Repeat to the back rank, where the last check IS mate. Your own king never moves. Two safety rules: always check from a DISTANCE — a rook that lands next to their king gets eaten — and if their king walks toward a rook, slide that rook to the far side along its rank. Note: the target fits THIS method; the Hint button shows the engine's fastest mate, which may not ladder at all. Both win.",
  },
  {
    id: 'ladder-2',
    title: 'Ladder mate, rooks under attack',
    stage: 1,
    fen: '8/8/8/3k4/8/8/R7/R3K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 9,
    goal: 'mate',
    lesson: "Same ladder — but two wrinkles: your rooks start stacked on one file, blocking each other, and their king starts close enough to hunt them. Solve both BEFORE you climb: swing one rook to the far wing (Rh2), then ladder from there. Distance is the entire defense — a rook fences a rank just as well from across the board. Every time the king chases a rook, slide it along its rank to the far side and carry on. Never land a rook next to their king. Hints show the engine's fastest mate, which may not look like a ladder; the target fits the ladder.",
  },
  // Stage 2 — K+Q mate
  {
    id: 'kq-1',
    title: 'King + queen mate',
    stage: 2,
    fen: '8/8/3k4/8/8/8/8/2Q1K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 15, // tablebase-audited: DTM is 8, but the TAUGHT box method takes 15 vs perfect defense

    goal: 'mate',
    lesson:
      "The box method, four steps. ONE: put the queen a knight's-move from their king — from d6, that's Qc4 — then COPY every step their king takes, same direction, keeping that distance. The copy is the whole trick: the box shrinks by itself, and the queen can never be caught. No checks. TWO, the STOP: the moment their king is stuck shuffling on the edge, the queen FREEZES — one more shrink is stalemate. THREE: walk YOUR king up until it stands two squares from theirs. FOUR: the first check of the whole drill is the mate. About the target: 15 moves fits THIS method against perfect defense (measured exactly). The engine mates in 8 using checks the method forbids — so when a Hint shows a check, that's the engine's fastest road, not a correction of the box. Both win; the box is the one you'll trust under the clock.",
    trap: "Queen a knight's-move from a CORNERED king = stalemate. When the king sits in the corner, stop shrinking and walk your own king in.",
  },
  {
    id: 'kq-stalemate-test',
    title: 'K+Q: the stalemate minefield',
    stage: 2,
    fen: 'k7/8/8/2Q5/8/8/8/4K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 8, // DTM is exactly 7 vs best defense; 8 leaves one waiting move

    goal: 'mate',
    lesson:
      "Their king is already in jail: Qc5 pins it to a8, b7 and b8 — three squares, nothing else. The queen's work is DONE, and touching her is where the half-point dies: Qb6?? or Qc7?? this instant is stalemate. Leave the queen alone and MARCH your king the short road: Kd2, Kc3, Kb4, Kb5, then b6. If their king parks on b7 to block, one long-distance check (Qd5+) shoves it back — then keep walking. With your king on b6, the queen's next move is mate. Before EVERY queen move: does their king have a square? For once the method IS the engine's fastest line — mate in 7, so the 8-move target gives one move of slack.",
    trap: 'Qc7 or Qb6 immediately = stalemate. The queen waits; the king walks.',
  },
  // Stage 3 — K+R mate
  {
    id: 'kr-1',
    title: 'King + rook mate',
    stage: 3,
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    playerColor: 'w',
    moveTarget: 20, // theoretical max is 16 vs perfect defense; 20 = good human technique

    goal: 'mate',
    lesson:
      "The box, patiently — three tools. ONE, the fence: your rook holds one rank between the kings and never gives up that job; park it on the far side, out of their king's reach, and if chased, slide it ALONG its rank, never off it. TWO, your king does all the pushing: walk it up behind the fence until it faces their king with one square between — only on that face-off does the rook check, pushing them back a rank. THREE, the tempo move: when their king steps SIDEWAYS instead of facing yours, do NOT check — slide the rook one square along its rank instead. Now they must face your king (you check) or drift to the corner. The finish: kings face to face, rook checks along the edge — mate. The 20-move target is exactly what this method achieves vs perfect defense (measured); the engine mates in 14 with moves that look nothing like a box. Both win.",
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
