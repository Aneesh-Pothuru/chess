import { n, type Repertoire } from './types'

// The King's Indian for Black against everything except 1.e4.
// One universal setup — Nf6, g6, Bg7, d6, O-O — then a plan per White system.
// This directly targets the biggest documented leak: ~26% score vs 1.d4.

export const kingsIndian: Repertoire = {
  id: 'kings-indian',
  name: "King's Indian (Black vs 1.d4 and flank openings)",
  color: 'b',
  vs: ['d4', 'c4', 'Nf3', 'f4', 'b3', 'g3', 'e3', 'd3'],
  keyIdeas: [
    'The setup never changes: Nf6, g6, Bg7, d6 (or d5 vs some setups), O-O — castled by move 6 in ANY order White allows. That alone fixes half your 1.d4 problem.',
    'Your break is ...e5 (sometimes ...c5). Play it once development is done, not before.',
    'When White locks the center with d5, the board splits: White attacks the queenside, you attack the kingside with ...f5, ...f4, ...g5. Speed matters more than material there.',
    'Against the London (Bf4): castle, then ...c5 and ...Qb6 gunning at b2 — the exact raid that has beaten YOU from the other side. The f4 bishop abandoned b2; make them pay for it.',
    'Against slow systems (Colle, e3 stuff, Bird): your setup needs no changes. Castle by 8, break with ...e5, play chess.',
  ],
  watchFor: [
    'The dxe5/Qxd8 "endgame trick": after ...e5, dxe5 dxe5 Qxd8 Rxd8 Nxe5?? loses to ...Nxe4! — both knights hang, and you regain the pawn with a fine game. Know it cold; it wins games at your level.',
    'Do not release the tension with ...exd4 without a reason — it hands White the center. Keep the pawn on e5 and improve pieces.',
    'In race positions, every ...a6/...h6 slow move is a wasted tempo. Count attackers, not pawns.',
  ],
  root: [
    n('d4', {}, [
      n('Nf6', { primary: true }, [
        n('c4', { weight: 4 }, [
          n('g6', { primary: true }, [
            n('Nc3', { weight: 3 }, [
              n('Bg7', { primary: true }, [
                n('e4', { weight: 3, name: 'Classical' }, [
                  n('d6', { primary: true }, [
                    n('Nf3', { weight: 2 }, [
                      n('O-O', { primary: true, note: 'Castled by move 5. Now ...e5 is coming and nothing White does can stop it.' }, [
                        n('Be2', { weight: 2 }, [
                          n('e5', { primary: true, note: 'The thematic strike. If dxe5 you have the ...Nxe4 trick after the queen trade; everything else transposes to plans you know.' }, [
                            n('O-O', { weight: 2 }, [
                              n('Nc6', { primary: true, note: 'The main-line tabiya. If d5 kicks the knight, ...Ne7 and the race begins: your ...f5 storm vs their c5 queenside play.' }, [
                                n('d5', { weight: 2 }, [
                                  n('Ne7', { primary: true, note: 'The Mar del Plata. Your plan, in order: ...Nd7 (unblocks f-pawn), ...f5, ...f4, ...g5-g4. Do not count material on the queenside — you are mating on the kingside.' }, [
                                    n('Ne1', { weight: 1 }, [
                                      n('Nd7', { primary: true, note: 'Reroute begins. ...f5 next, and the pawn storm rolls.' }, [
                                        n('Be3', { weight: 1 }, [
                                          n('f5', { primary: true, note: 'The storm. f4 next hits the bishop; then ...g5, ...Rf6-h6 ideas. This is the most fun attack in chess — commit to it.' }),
                                        ]),
                                      ]),
                                    ]),
                                    n('b4', { weight: 1 }, [
                                      n('Nd7', { primary: true, note: 'Ignore the queenside. ...f5 comes; the race is on and your target is a king.' }),
                                    ]),
                                  ]),
                                ]),
                                n('dxe5', { weight: 1 }, [
                                  n('dxe5', { primary: true }, [
                                    n('Qxd8', { weight: 1 }, [
                                      n('Rxd8', { primary: true, note: 'This "boring" endgame is fine for you — and if Nxe5?? now, ...Nxe4! regains everything: both knights hang and yours took a center pawn.' }, [
                                        n('Nxe5', { weight: 1 }, [
                                          n('Nxe4', {
                                            primary: true,
                                            note: 'The trick, on the board. If Nxe4, ...Bxe5 restores material with the better bishop; White has nothing.',
                                          }, [
                                            n('Nxe4', { weight: 1 }, [
                                              n('Bxe5', { primary: true, note: 'Material equal, your bishop dominates the long diagonal, their e4-knight floats. You are the one pressing.' }),
                                            ]),
                                          ]),
                                        ]),
                                        n('Bg5', { weight: 1 }, [
                                          n('Rd4', { primary: true, note: 'Active rook, hits e4 and c4. Endgames are won by activity — this is what "convert" looks like.' }),
                                        ]),
                                      ]),
                                    ]),
                                  ]),
                                ]),
                              ]),
                            ]),
                            n('dxe5', { weight: 1 }, [
                              n('dxe5', { primary: true }, [
                                n('Qxd8', { weight: 1 }, [
                                  n('Rxd8', { primary: true, note: 'Same trick pattern: if Nxe5, then ...Nxe4! Learn it once, win with it forever.' }),
                                ]),
                              ]),
                            ]),
                            n('d5', { weight: 1 }, [
                              n('a5', { primary: true, note: 'Against the early space grab: fix the queenside with ...a5, then ...Na6-c5, and the kingside storm still comes later.' }),
                            ]),
                          ]),
                        ]),
                        n('h3', { weight: 1 }, [
                          n('e5', { primary: true, note: 'Same reply. h3 is slow; you are already striking.' }),
                        ]),
                        n('Bd3', { weight: 1 }, [
                          n('e5', { primary: true }),
                        ]),
                      ]),
                    ]),
                    n('f3', { weight: 1, name: 'Sämisch' }, [
                      n('O-O', { primary: true }, [
                        n('Be3', { weight: 1 }, [
                          n('e5', { primary: true, note: 'Strike the center before the pawn storm arrives. If d5, then ...c6 chips at it; the Sämisch king often ends up the weaker one.' }, [
                            n('d5', { weight: 1 }, [
                              n('c6', { primary: true, note: 'Chip the chain. ...cxd5 at the right moment gives your queen the b6-g1 diagonal — the uncastled Sämisch king feels it.' }),
                            ]),
                            n('Nge2', { weight: 1 }, [
                              n('Nc6', { primary: true, note: 'Pressure d4 immediately; exd4 only when it wins something concrete.' }),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                    n('f4', { weight: 1, name: 'Four Pawns Attack' }, [
                      n('O-O', { primary: true }, [
                        n('Nf3', { weight: 1 }, [
                          n('c5', {
                            primary: true,
                            note: 'The antidote to the pawn avalanche: strike at d4 immediately. Four pawns moved means four moves not developing — punish the arrogance.',
                          }, [
                            n('d5', { weight: 1 }, [
                              n('e6', { primary: true, note: 'Keep chipping. After dxe6 fxe6 or ...exd5, the center White built dissolves and their king has no shelter.' }),
                            ]),
                            n('Be2', { weight: 1 }, [
                              n('cxd4', { primary: true, note: 'Win the d4 pawn trade, then hit e4 with ...Nc6 and ...Bg4 ideas. Their center is a target, not an asset.' }),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
                n('Nf3', { weight: 1 }, [
                  n('d6', { primary: true, note: 'Without e4, White is playing a quieter system. Castle and break with ...e5 anyway.' }, [
                    n('g3', { weight: 1, name: 'Fianchetto' }, [
                      n('O-O', { primary: true }, [
                        n('Bg2', { weight: 1 }, [
                          n('Nbd7', { primary: true, note: 'The Fianchetto antidote: ...Nbd7, ...e5, ...Re8, sometimes ...c6+...Qb6. Slower burn, same story.' }, [
                            n('O-O', { weight: 1 }, [
                              n('e5', { primary: true, note: 'The break lands as always. Keep the tension; ...Re8 and ...c6 build behind it.' }),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            n('Nf3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('g3', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'Fianchetto system; ...d6, ...Nbd7, ...e5 is your recipe.' }, [
                    n('Bg2', { weight: 1 }, [
                      n('d6', { primary: true }),
                    ]),
                  ]),
                ]),
                n('Nc3', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'Transposes to the main lines after e4/d6. Nothing new to learn.' }),
                ]),
              ]),
            ]),
          ]),
        ]),
        n('Bf4', { weight: 3, name: 'London (as Black)' }, [
          n('g6', { primary: true, note: 'Your setup works fine against the London — and you know its weak point personally: b2.' }, [
            n('e3', { weight: 2 }, [
              n('Bg7', { primary: true }, [
                n('Nf3', { weight: 2 }, [
                  n('O-O', { primary: true }, [
                    n('Be2', { weight: 2 }, [
                      n('d6', { primary: true, note: 'd6 (not d5): keep the long diagonal open for the raid.' }, [
                        n('O-O', { weight: 1 }, [
                          n('c5', { primary: true, note: 'Here it comes.' }, [
                            n('c3', { weight: 1 }, [
                              n('Qb6', {
                                primary: true,
                                note: 'The raid that beat you in loss #5 — now yours. The Bf4 abandoned b2; the queen hits it AND d4-adjacent squares. If Qb3, trade and play the endgame; if Qc1, keep pressing with ...Nc6, ...Bf5.',
                              }, [
                                n('Qb3', { weight: 1 }, [
                                  n('Qxb3', { primary: true, note: 'Trade happily — their most active piece leaves; your structure is no worse and b2 stays weak.' }, [
                                    n('axb3', { weight: 1 }, [
                                      n('Nc6', { primary: true, note: 'Develop, ...Bf5 or ...Bg4, rooks to c8/d8. You have the plans; they have a pawn on b3.' }),
                                    ]),
                                  ]),
                                ]),
                                n('Qc1', { weight: 1 }, [
                                  n('Nc6', { primary: true, note: 'Their queen guards b2 from the corner. Pile on: ...Bf5, ...Rac8, ...cxd4 when it wins material.' }),
                                ]),
                              ]),
                            ]),
                            n('dxc5', { weight: 1 }, [
                              n('dxc5', { primary: true, note: 'Recapture and welcome the queen trade: your rook lands on d8 first, the g7 bishop now stares at an undefended b2, and c5 controls d4. "Boring" positions like this are where you outplay people.' }, [
                                n('Qxd8', { weight: 1 }, [
                                  n('Rxd8', { primary: true, note: 'Rook on the open file, bishop on the long diagonal, targets on b2 and d4. Play ...Nc6, ...Be6, ...Rac8 — pressure without risk.' }),
                                ]),
                              ]),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                    n('Bd3', { weight: 1 }, [
                      n('d6', { primary: true, note: 'Same plan regardless of where the bishop goes: ...c5, ...Qb6.' }),
                    ]),
                  ]),
                ]),
                n('h3', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'They know the anti-KID setup; you know the anti-London raid. Proceed: ...d6, ...c5, ...Qb6.' }),
                ]),
              ]),
            ]),
            n('Nf3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('e3', { weight: 1 }, [
                  n('O-O', { primary: true }),
                ]),
              ]),
            ]),
          ]),
        ]),
        n('Nf3', { weight: 2 }, [
          n('g6', { primary: true }, [
            n('g3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('Bg2', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'Castle first, ask questions later. ...d6 and ...e5 follow; vs double-fianchetto setups ...c5 works too.' }, [
                    n('O-O', { weight: 1 }, [
                      n('d6', { primary: true }, [
                        n('c4', { weight: 1 }, [
                          n('Nbd7', { primary: true, note: 'Fianchetto KID proper: ...e5 next. You have seen this position before and they have not.' }),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            n('c4', { weight: 1 }, [
              n('Bg7', { primary: true, note: 'Transposes to the main lines. Your setup is transposition-proof — that is the point of it.' }),
            ]),
            n('Bf4', { weight: 1 }, [
              n('Bg7', { primary: true, note: 'London again — you know what to do: castle, ...d6, ...c5, ...Qb6.' }),
            ]),
          ]),
        ]),
        n('Bg5', { weight: 1, name: 'Trompowsky' }, [
          n('g6', {
            primary: true,
            note: 'Stay on system. If Bxf6 exf6: your pawns look funny but the dark-squared bishop becomes a monster and no one at this level knows how to punish doubled pawns.',
          }, [
            n('Bxf6', { weight: 1 }, [
              n('exf6', { primary: true, note: 'Recapture toward the center. ...Bg7, ...O-O, ...d5 or ...d6, ...f5 later — the bishop pair is long-term interest.' }),
            ]),
            n('Nc3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('e4', { weight: 1 }, [
                  n('d6', { primary: true, note: 'A Classical where their bishop went to g5 early; ...h6 gains a tempo whenever you want it.' }),
                ]),
              ]),
            ]),
          ]),
        ]),
        n('e3', { weight: 1, name: 'Colle-ish' }, [
          n('g6', { primary: true, note: 'Slow setups get the full treatment: castle by 6, ...e5 by 10.' }, [
            n('Nf3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('Bd3', { weight: 1 }, [
                  n('O-O', { primary: true }, [
                    n('O-O', { weight: 1 }, [
                      n('d6', { primary: true, note: 'Then ...Nbd7 and ...e5. The Colle bishop on d3 stares at granite on g6.' }),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    n('c4', { name: 'English' }, [
      n('Nf6', { primary: true }, [
        n('Nc3', { weight: 2 }, [
          n('g6', { primary: true }, [
            n('g3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('Bg2', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'Same house, different door. ...d6, ...e5, ...Nc6 — a King\'s Indian where White spent a move on c4.' }, [
                    n('Nf3', { weight: 1 }, [
                      n('d6', { primary: true }, [
                        n('O-O', { weight: 1 }, [
                          n('e5', { primary: true, note: 'The break works against the English too. ...Nc6, ...h6, ...Be6 complete the familiar picture.' }),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            n('e4', { weight: 1 }, [
              n('d6', { primary: true, note: 'A Botvinnik-style center: strike it with ...e5, then ...Nc6/...Nd4 or ...c6+...d5 later.' }, [
                n('d4', { weight: 1 }, [
                  n('Bg7', { primary: true, note: 'Full transposition to the Classical KID. Home turf.' }),
                ]),
              ]),
            ]),
            n('Nf3', { weight: 1 }, [
              n('Bg7', { primary: true }),
            ]),
          ]),
        ]),
        n('Nf3', { weight: 1 }, [
          n('g6', { primary: true }, [
            n('d4', { weight: 1 }, [
              n('Bg7', { primary: true, note: 'Straight back into the main lines.' }),
            ]),
            n('g3', { weight: 1 }, [
              n('Bg7', { primary: true }),
            ]),
          ]),
        ]),
        n('g3', { weight: 1 }, [
          n('g6', { primary: true }, [
            n('Bg2', { weight: 1 }, [
              n('Bg7', { primary: true, note: 'Symmetry with a plan: castle, ...d6, ...e5, and outplay them in a structure you know better.' }),
            ]),
          ]),
        ]),
      ]),
    ]),
    n('Nf3', {}, [
      n('Nf6', { primary: true, note: 'Flexible reply; nearly everything transposes to systems you already play.' }, [
        n('g3', { weight: 1 }, [
          n('g6', { primary: true }, [
            n('Bg2', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('O-O', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'Both castled by move 4 — your fastest castle-by-8 metric win ever. ...d6 and ...e5 next.' }),
                ]),
              ]),
            ]),
          ]),
        ]),
        n('d4', { weight: 2 }, [
          n('g6', { primary: true, note: 'Transposes to 1.d4 lines.' }),
        ]),
        n('c4', { weight: 1 }, [
          n('g6', { primary: true, note: 'English/KID transposition; carry on with the setup.' }),
        ]),
      ]),
    ]),
    n('f4', { name: "Bird's Opening" }, [
      n('Nf6', { primary: true, note: 'Loss #4 was a Bird — and the opening was never the problem. Standard setup, extra care on the e5/g5 squares f4 gave away.' }, [
        n('Nf3', { weight: 1 }, [
          n('g6', { primary: true }, [
            n('e3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('Be2', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'Castle, ...d6, then ...e5 when ready — it often costs White the f4 pawn or the e-file. Their kingside is airier than yours forever.' }, [
                    n('O-O', { weight: 1 }, [
                      n('d6', { primary: true }),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            n('b3', { weight: 1 }, [
              n('Bg7', { primary: true, note: 'Double flank play. Take the center: ...d6, ...e5. Flank openings are refuted by central play, said Tarrasch — prove it.' }),
            ]),
          ]),
        ]),
        n('g3', { weight: 1 }, [
          n('g6', { primary: true }),
        ]),
      ]),
    ]),
    n('b3', {}, [
      n('Nf6', { primary: true }, [
        n('Bb2', { weight: 1 }, [
          n('g6', { primary: true, note: 'Their bishop wants your long diagonal; your Bg7 will contest it directly. ...d6 before ...e5, always — the b2 bishop eyes e5.' }, [
            n('e3', { weight: 1 }, [
              n('Bg7', { primary: true }, [
                n('Nf3', { weight: 1 }, [
                  n('O-O', { primary: true, note: 'Then ...d6, ...e5 with care (count the attackers on e5), or ...c5+...d5 taking the center outright.' }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    n('e3', {}, [
      n('Nf6', { primary: true, note: 'The 1.e3 crowd wants a quiet life. Deny it: full setup, fast castle, ...e5 break.' }, [
        n('d4', { weight: 1 }, [
          n('g6', { primary: true, note: 'A Colle by transposition — see the 1.d4 e3 lines.' }),
        ]),
        n('Nf3', { weight: 1 }, [
          n('g6', { primary: true }),
        ]),
      ]),
    ]),
    n('d3', {}, [
      n('Nf6', { primary: true, note: 'Slower than slow. Setup, castle by 6, take the whole center with ...d5 and ...e5 when they let you.' }, [
        n('Nf3', { weight: 1 }, [
          n('g6', { primary: true }),
        ]),
        n('e4', { weight: 1 }, [
          n('g6', { primary: true, note: 'A reversed King\'s Indian Attack. Your normal plans apply; you even know their side of it.' }),
        ]),
      ]),
    ]),
    n('g3', {}, [
      n('Nf6', { primary: true }, [
        n('Bg2', { weight: 1 }, [
          n('g6', { primary: true, note: 'Mirror fianchettos; yours comes with a better follow-up: ...d6, ...e5, real central presence.' }),
        ]),
      ]),
    ]),
  ],
}
