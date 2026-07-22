// Conversion drills: clearly winning positions the player must actually WIN
// against engine defense. This targets the #1 documented leak — 62% of
// endgame-decided games lost, three of five reviewed losses from won positions.

export interface ConversionDrill {
  id: string
  title: string
  fen: string
  playerColor: 'w' | 'b'
  edge: string // what the advantage is
  plan: string // the coach's conversion plan
}

export const CONVERSION_DRILLS: ConversionDrill[] = [
  {
    id: 'piece-up-middlegame',
    title: 'A clean piece up',
    fen: 'r2q1rk1/ppp2ppp/2n5/3p4/3P4/2N1PN2/PP3PPP/R2Q1RK1 w - - 0 12',
    playerColor: 'w',
    edge: 'Up a full knight, quiet position.',
    plan: 'The Won-Game Protocol, verbatim: trade PIECES (not pawns), keep everything defended, push nothing until rooks are connected. Ten strong boring moves beat one flashy one.',
  },
  {
    id: 'queen-up-counterplay',
    title: 'Queen up — like loss #4',
    fen: '6k1/5pp1/7p/8/8/8/3r1PPP/1Q3RK1 w - - 0 28',
    playerColor: 'w',
    edge: 'Queen for nothing, but Black still has an active rook.',
    plan: 'Offer the rook trade (Rd1 — your queen on b1 guards it). Every trade multiplies your advantage. Scan for mate-in-1 both ways every single move.',
  },
  {
    id: 'exchange-up',
    title: 'Exchange up, technique required',
    fen: '6k1/pp3ppp/5b2/8/8/8/PP3PPP/3R2K1 w - - 0 25',
    playerColor: 'w',
    edge: 'Rook vs bishop.',
    plan: 'Rooks want open files and the 7th rank. Rd7 hits pawns; create a passed pawn on the side the bishop cannot cover. Do not let the bishop blockade on one color complex.',
  },
  {
    id: 'rook-up-checks',
    title: 'Rook up, queen checks incoming',
    fen: '8/5pkp/6p1/8/8/8/q4PPP/1R1Q2K1 w - - 0 30',
    playerColor: 'w',
    edge: 'A whole rook, but the black queen is loose in your camp.',
    plan: 'The counterplay-killer: offer the QUEEN trade with Qb3 — the b1-rook protects it, so Qxb3 Rxb3 is a trivially won rook ending. With queens off, a rook up is trivial. Never move a kingside pawn while her queen is near — that is how perpetuals happen.',
  },
  {
    id: 'outside-passer',
    title: 'Two up: the outside passer',
    fen: '8/4kp2/6p1/8/1P6/5PP1/6KP/8 w - - 0 40',
    playerColor: 'w',
    edge: 'Two extra pawns, one a distant passer.',
    plan: 'The b-pawn is a decoy, not a hero: push it until their king must chase it, then run YOUR king to eat f7/g6. Count moves like the square rule taught you.',
  },
  {
    id: 'knight-up-endgame',
    title: 'Knight up in the endgame',
    fen: '8/5pkp/6p1/8/8/5NP1/5PKP/8 w - - 0 35',
    playerColor: 'w',
    edge: 'Extra knight, symmetric pawns.',
    plan: 'The knight is a harvester: attack a pawn, force the king to babysit it, attack another. Win one pawn, then a second, THEN make a passer. No rush — Black has zero threats.',
  },
  {
    id: 'mate-with-material',
    title: 'Overwhelming force, no stalemate',
    fen: '7k/8/8/8/8/8/5QPP/6K1 w - - 0 40',
    playerColor: 'w',
    edge: 'Queen vs bare king.',
    plan: 'Finish in under ten moves WITHOUT stalemate. Box, king up, mate. If your move leaves the king zero replies and no check — that was stalemate; the drill fails.',
  },
]
