// Guided course units per repertoire. Each unit points at path prefixes in
// the tree; the course engine (src/chess/course.ts) generates the narrated
// walks and sidelines from there, so lesson content always matches the tree.

export interface CourseUnit {
  id: string
  repId: string
  title: string
  intro: string
  /** Path prefixes into the repertoire tree. First = the unit's main line. */
  paths: string[][]
}

export const COURSES: Record<string, CourseUnit[]> = {
  london: [
    {
      id: 'london-shape',
      repId: 'london',
      title: 'The shape: London vs ...d5',
      intro:
        'One setup, nearly every game: d4, Bf4, e3, Nf3, c3, Bd3, Nbd2, O-O. This lesson walks the normal ...d5 game so the shape goes into your hands. Learn the SHAPE first; every other lesson is an exception to it.',
      paths: [['d4', 'd5', 'Bf4', 'Nf6']],
    },
    {
      id: 'london-bishop-trade',
      repId: 'london',
      title: 'The bishop question: ...Bd6',
      intro:
        "Black's most natural plan is trading off your best piece with ...Bd6. The answer is always Bg3: keep the bishop, and if they take anyway, your h-file opens toward their king. Rook lifts and Qd3 ideas live there later.",
      paths: [['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'Bd6']],
    },
    {
      id: 'london-b2',
      repId: 'london',
      title: 'The b2 problem: meeting ...Qb6',
      intro:
        'The queen raid on b2 is how YOU have lost London games — so learn every answer cold. With c3 in: Qb3, offer the trade. Without c3 and without ...d5 played: Nc3! and b2 is poisoned. Otherwise: Qc1, ugly but solid. Three positions, three answers.',
      paths: [
        ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Qb6'],
        ['d4', 'Nf6', 'Bf4', 'c5', 'e3', 'Qb6'],
        ['d4', 'd5', 'Bf4', 'c5', 'e3', 'Qb6'],
      ],
    },
    {
      id: 'london-chigorin',
      repId: 'london',
      title: 'Early c3 vs ...Nc6',
      intro:
        'Four of your six White losses came from ...Nc6 systems. The whole fix is one move of prophylaxis: c3, immediately. ...Nb4 never lands, your Bf4 keeps its retreat, d4 stays solid.',
      paths: [['d4', 'd5', 'Bf4', 'Nc6']],
    },
    {
      id: 'london-anti-kid',
      repId: 'london',
      title: "Anti-King's Indian: the h3 fortress",
      intro:
        "When Black fianchettos, the London becomes a fortress: e3, h3 (saving the bishop from ...Nh5), Nf3, Be2, O-O. The one discipline moment: when ...e5 comes, you know exactly when the pawn is takeable — and it's because of h3.",
      paths: [['d4', 'Nf6', 'Bf4', 'g6']],
    },
    {
      id: 'london-englund',
      repId: 'london',
      title: 'The Englund Gambit trap',
      intro:
        "1.d4 e5?! is a trap opening aimed specifically at d4 players — thousands of London players have lost their queen to it in under 8 moves. Take the pawn, then play the next few moves EXACTLY: the entire trap needs you to play Bc3, and you never will.",
      paths: [['d4', 'e5']],
    },
    {
      id: 'london-rest',
      repId: 'london',
      title: 'Everything else: Dutch, ...d6, ...e6, ...c5',
      intro:
        'The rest of the menagerie needs no theory — the setup handles it. One line each so nothing surprises you: the Dutch, early ...d6, the French move order, and the 1...c5 strike.',
      paths: [
        ['d4', 'f5'],
        ['d4', 'd6'],
        ['d4', 'e6'],
        ['d4', 'c5'],
        ['d4', 'g6'],
      ],
    },
  ],
  'caro-kann': [
    {
      id: 'caro-advance',
      repId: 'caro-kann',
      title: 'The Advance: bishop out, then strike',
      intro:
        "White's most common try. The whole Caro-Kann in one lesson: ...Bf5 BEFORE ...e6 (the French player's dream), then hit the chain base with ...c5. Also covered: the g4 lunge and the h4 chase — both have one calm answer each.",
      paths: [['e4', 'c6', 'd4', 'd5', 'e5']],
    },
    {
      id: 'caro-exchange',
      repId: 'caro-kann',
      title: 'The Exchange: symmetric but not equal',
      intro:
        'exd5 cxd5 looks harmless, and it is — if you develop with purpose: Nc6, Nf6, Bg4 before ...e6, then Bd6 and castle. Includes the Qb3 b7-hit and the calm ...Qc8 answer.',
      paths: [
        ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3'],
        ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Nf3'],
      ],
    },
    {
      id: 'caro-panov',
      repId: 'caro-kann',
      title: 'The Panov: blockade the isolani',
      intro:
        'c4 turns the game into an isolated-pawn battle. Your recipe never changes: e6, Be7, O-O, then blockade d5 with a knight and trade pieces. Boring is winning here.',
      paths: [['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4']],
    },
    {
      id: 'caro-classical',
      repId: 'caro-kann',
      title: 'The Classical poem',
      intro:
        'Nc3 (or Nd2), take, and recite: Bf5, Bg6, h6, Nd7, Bh7, Bxd3, e6. A forcing, memorizable sequence that has served Caro players for a century. Say it like a poem until your hands know it.',
      paths: [
        ['e4', 'c6', 'd4', 'd5', 'Nc3'],
        ['e4', 'c6', 'd4', 'd5', 'Nd2'],
      ],
    },
    {
      id: 'caro-fantasy',
      repId: 'caro-kann',
      title: 'Fantasy & early Bd3: decline politely',
      intro:
        '3.f3 begs you to take and open lines for White. Decline with ...e6, develop, and let the overextended center rot. Early Bd3 just loses White a tempo — take the bishop pair situation you want.',
      paths: [
        ['e4', 'c6', 'd4', 'd5', 'f3'],
        ['e4', 'c6', 'd4', 'd5', 'Bd3'],
      ],
    },
    {
      id: 'caro-two-knights',
      repId: 'caro-kann',
      title: 'Two Knights: the ...Bg4 equalizer',
      intro:
        'When White develops both knights before d4, pin with ...Bg4, trade on f3 without regret, and build the granite ...e6 structure. The bishop pair is fair rent for an unbreakable position.',
      paths: [
        ['e4', 'c6', 'Nc3'],
        ['e4', 'c6', 'Nf3'],
      ],
    },
    {
      id: 'caro-sidelines',
      repId: 'caro-kann',
      title: 'Sidelines: KIA, c4, the Hillbilly',
      intro:
        "Slow setups get punished by the full center; the accelerated c4 line has one move-order trap (knight recaptures, never early Qxd5); and the Hillbilly Bc4 simply runs into ...d5. One line each and you're covered.",
      paths: [
        ['e4', 'c6', 'd3'],
        ['e4', 'c6', 'c4'],
        ['e4', 'c6', 'Bc4'],
        ['e4', 'c6', 'f4'],
      ],
    },
  ],
  'kings-indian': [
    {
      id: 'kid-setup',
      repId: 'kings-indian',
      title: 'The universal setup & the ...e5 break',
      intro:
        'Nf6, g6, Bg7, d6, O-O — castled by move 5 or 6, every single game. Then the thematic ...e5 strike. This one lesson fixes half of your 26% score against 1.d4: the setup is transposition-proof, so you can stop fearing move orders.',
      paths: [['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O']],
    },
    {
      id: 'kid-endgame-trick',
      repId: 'kings-indian',
      title: 'The dxe5 "endgame trick"',
      intro:
        "Queens come off and club players relax — then lose. After dxe5 dxe5 Qxd8 Rxd8, if White grabs e5: ...Nxe4! regains everything. Know it cold; it wins real games at your level, and knowing it means ...e5 never costs you a pawn.",
      paths: [
        ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'dxe5'],
        ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'dxe5'],
      ],
    },
    {
      id: 'kid-mar-del-plata',
      repId: 'kings-indian',
      title: 'The Mar del Plata race',
      intro:
        "When White locks the center with d5, the board splits in two: they attack the queenside, you storm the kingside with ...f5, ...f4, ...g5. Count attackers, not pawns — in the race, speed IS material.",
      paths: [['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7']],
    },
    {
      id: 'kid-saemisch-fourpawns',
      repId: 'kings-indian',
      title: 'Sämisch & Four Pawns: strike the big centers',
      intro:
        "When White grabs space with f3 or f4, the answer is always central counterplay: ...e5 against the Sämisch, ...c5 against the Four Pawns. Big centers are targets — every pawn move White made is a piece not developed.",
      paths: [
        ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3'],
        ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4'],
      ],
    },
    {
      id: 'kid-fianchetto',
      repId: 'kings-indian',
      title: 'The Fianchetto system',
      intro:
        'g3 setups are the quiet way to meet the KID. Your plan slows down with them: ...Nbd7, ...e5, ...Re8, keep the tension. Nobody gets mated early here — it is a maneuvering game you can learn to enjoy.',
      paths: [
        ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'Nf3', 'd6', 'g3'],
        ['d4', 'Nf6', 'Nf3', 'g6', 'g3'],
      ],
    },
    {
      id: 'kid-vs-london',
      repId: 'kings-indian',
      title: 'Beating the London as Black',
      intro:
        "You'll face the London constantly at this level — and you know its weak point personally: b2. Castle, then ...c5 and ...Qb6, the exact raid that has beaten you from the other side. This is the revenge lesson.",
      paths: [['d4', 'Nf6', 'Bf4', 'g6']],
    },
    {
      id: 'kid-flank',
      repId: 'kings-indian',
      title: 'English, Réti & flank stuff',
      intro:
        'Same house, different doors: against c4, Nf3, b3, the Bird — the setup does not change. Center, develop, castle by 8. Flank openings are answered in the center, and your Bg7 already points at it.',
      paths: [
        ['c4', 'Nf6'],
        ['Nf3', 'Nf6'],
        ['f4', 'Nf6'],
        ['b3', 'Nf6'],
        ['e3', 'Nf6'],
        ['g3', 'Nf6'],
      ],
    },
    {
      id: 'kid-tromp',
      repId: 'kings-indian',
      title: 'Trompowsky & Colle oddities',
      intro:
        "Bg5 on move two looks scary and isn't: stay on system, and if they take on f6, recapture toward the center — your dark-squared bishop becomes a monster. The Colle gets the standard treatment.",
      paths: [
        ['d4', 'Nf6', 'Bg5'],
        ['d4', 'Nf6', 'e3'],
      ],
    },
  ],
}

export function courseFor(repId: string): CourseUnit[] {
  return COURSES[repId] ?? []
}
