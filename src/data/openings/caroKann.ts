import { n, type Repertoire } from './types'

// The Caro-Kann for Black against 1.e4. Built around one idea a 700-1100
// player can hold onto: get the c8-bishop OUT (to f5 or g4) before playing
// ...e6, then develop calmly into a solid structure.

export const caroKann: Repertoire = {
  id: 'caro-kann',
  name: 'Caro-Kann (Black vs 1.e4)',
  color: 'b',
  vs: ['e4'],
  keyIdeas: [
    'The whole point of ...c6: support ...d5 AND open the diagonal so the c8-bishop gets out BEFORE ...e6 locks it in. Bishop first, then e6.',
    'Your structure (pawns c6+e6+d5 or the Advance chain) is hard to attack. When in doubt: develop a piece toward the center, castle short, do not grab pawns.',
    "Against the Advance (3.e5): ...Bf5 immediately, then ...e6, then hit White's chain base with ...c5.",
    'Against anything slow or weird: play ...d5 anyway. The move ...d5 IS the repertoire.',
    'Castle by move 8-10. The Caro-Kann king almost always belongs on g8.',
  ],
  watchFor: [
    'The 4.g4!? pawn lunge in the Advance: do not panic, retreat ...Bd7. White loosened their own king to win one tempo.',
    'Qb3 hitting b7 once your bishop left c8: answer ...Qc8 or ...Qd7 calmly. The b7 pawn is defensible; losing your nerve is not.',
    'In the Classical line, the h4-h5 pawn chase: meet h4 with ...h6 (air for the bishop) and h5 with ...Bh7. Automatic moves — drill them.',
  ],
  root: [
    n('e4', {}, [
      n('c6', { primary: true }, [
        n('d4', { weight: 5 }, [
          n('d5', { primary: true }, [
            n('e5', { weight: 4, name: 'Advance Variation' }, [
              n('Bf5', {
                primary: true,
                note: 'The move the whole opening exists for. The "problem bishop" of the French develops to its dream square before ...e6.',
              }, [
                n('Nf3', { weight: 3 }, [
                  n('e6', { primary: true, note: 'Structure set. Plan: ...c5 hitting the chain base, knights to d7 and e7 (often ...Ne7-g6 or ...Nf5).' }, [
                    n('Be2', { weight: 2 }, [
                      n('c5', { primary: true, note: 'Strike the base of the pawn chain. This is YOUR pawn break in the Advance — play it nearly every game.' }, [
                        n('O-O', { weight: 2 }, [
                          n('Nc6', { primary: true, note: 'Pressure d4. Next: ...Nge7, ...cxd4 at the right moment, ...Be7, castle.' }, [
                            n('c3', { weight: 1 }, [
                              n('Nge7', { primary: true, note: 'The knight heads to g6 or f5, both eyeing d4 and e5. Castle next.' }),
                            ]),
                            n('Be3', { weight: 1 }, [
                              n('Nge7', { primary: true }),
                            ]),
                          ]),
                        ]),
                        n('c3', { weight: 1 }, [
                          n('Nc6', { primary: true }),
                        ]),
                        n('dxc5', { weight: 1 }, [
                          n('Bxc5', { primary: true, note: 'Recapture with the bishop — free development, and d4 is gone. You are already comfortable.' }),
                        ]),
                      ]),
                    ]),
                    n('c3', { weight: 1 }, [
                      n('c5', { primary: true, note: 'Same break, same plan.' }),
                    ]),
                    n('Bd3', { weight: 1 }, [
                      n('Bxd3', { primary: true, note: 'Happy trade: their good bishop for your "problem" one — and your e6/d5 structure has no bad bishop left.' }, [
                        n('Qxd3', { weight: 1 }, [
                          n('c5', { primary: true, note: 'The thematic base strike, right on schedule.' }),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
                n('g4', { weight: 1, name: 'The pawn lunge' }, [
                  n('Bd7', {
                    primary: true,
                    note: 'Cold blood. The bishop steps back; White spent two tempi loosening their own king. Later ...e6, ...c5, and their g4 pawn is a target forever.',
                  }, [
                    n('Nf3', { weight: 1 }, [
                      n('e6', { primary: true, note: 'Business as usual. ...c5 next; White must now defend a airy kingside all game.' }),
                    ]),
                  ]),
                ]),
                n('h4', { weight: 1 }, [
                  n('h5', { primary: true, note: 'Freeze the pawn. Without h5-h6 the chase is over, and g5 is now a hole for your pieces.' }, [
                    n('Nf3', { weight: 1 }, [
                      n('e6', { primary: true }),
                    ]),
                  ]),
                ]),
                n('Bd3', { weight: 1 }, [
                  n('Bxd3', { primary: true, note: 'Always take. Their attacking bishop leaves the board and the light squares are yours.' }, [
                    n('Qxd3', { weight: 1 }, [
                      n('e6', { primary: true, note: 'Then ...c5, ...Nc6/...Ne7, castle. A French Defense where your bishop problem never existed.' }),
                    ]),
                  ]),
                ]),
                n('Nc3', { weight: 1 }, [
                  n('e6', { primary: true, note: 'Solid. If g4 comes now: ...Bg6, then meet h4 with ...h5. The bishop is never trapped if you know those two moves.' }),
                ]),
              ]),
            ]),
            n('exd5', { weight: 3, name: 'Exchange Variation' }, [
              n('cxd5', { primary: true }, [
                n('Bd3', { weight: 2 }, [
                  n('Nc6', { primary: true, note: 'Develop with threats-in-waiting: ...Nb4 ideas keep their bishop honest. Plan: ...Nf6, ...Bg4, ...e6, ...Bd6, castle.' }, [
                    n('c3', { weight: 2 }, [
                      n('Nf6', { primary: true }, [
                        n('Bf4', { weight: 1 }, [
                          n('Bg4', {
                            primary: true,
                            note: 'Bishop OUT before ...e6, as always. It pins nothing yet but stops Nf3 cold.',
                          }, [
                            n('Qb3', { weight: 1, name: 'The b7 hit' }, [
                              n('Qc8', {
                                primary: true,
                                note: 'Calm defense: b7 is covered, the bishop stays on g4, and Qc8 eyes the c-file. Do not panic-trade or drop a pawn to end the annoyance.',
                              }),
                            ]),
                            n('Nf3', { weight: 1 }, [
                              n('e6', { primary: true, note: 'Now e6 — the bishop already lives outside. Bd6 and castling next.' }),
                            ]),
                          ]),
                        ]),
                        n('Nf3', { weight: 1 }, [
                          n('Bg4', { primary: true }),
                        ]),
                      ]),
                    ]),
                    n('Nf3', { weight: 1 }, [
                      n('Bg4', { primary: true, note: 'The pin, immediately. White has already committed the bishop; you develop with tempo-threats on d4.' }),
                    ]),
                  ]),
                ]),
                n('Nf3', { weight: 1 }, [
                  n('Nc6', { primary: true, note: 'Same plan every time: Nc6, Bg4 pinning, e6, Bd6. The symmetry favors whoever develops with more purpose — you.' }, [
                    n('Bb5', { weight: 1 }, [
                      n('Bd7', { primary: true, note: 'Break the pin at zero cost; the bishop often retakes on c6 with a fine game.' }),
                    ]),
                  ]),
                ]),
                n('c4', { weight: 1, name: 'Panov Attack' }, [
                  n('Nf6', { primary: true, note: 'The Panov is an isolated-pawn game. Your recipe: e6, Be7, O-O, then blockade d5 with a knight and trade pieces.' }, [
                    n('Nc3', { weight: 1 }, [
                      n('e6', { primary: true }, [
                        n('Nf3', { weight: 1 }, [
                          n('Be7', { primary: true, note: 'Modest and right. Castle, then ...Nc6, ...b6/...Bb7 or ...dxc4 at the proper moment. Blockade beats greed.' }, [
                            n('c5', { weight: 1 }, [
                              n('b6', { primary: true, note: 'The standard counter: chip the overextended pawn chain at once.' }),
                            ]),
                            n('cxd5', { weight: 1 }, [
                              n('Nxd5', { primary: true, note: 'Recapture with the knight, hitting c3. Trades ease your game against the isolated pawn.' }),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            n('Nc3', { weight: 2, name: 'Classical' }, [
              n('dxe4', { primary: true }, [
                n('Nxe4', { weight: 1 }, [
                  n('Bf5', { primary: true, note: 'The Classical main line — a forcing, memorizable sequence. Say it like a poem: Bf5, Bg6, h6, Nd7, Bh7, Bxd3, e6.' }, [
                    n('Ng3', { weight: 2 }, [
                      n('Bg6', { primary: true }, [
                        n('h4', { weight: 2 }, [
                          n('h6', { primary: true, note: 'Air for the bishop before h5 comes. Automatic.' }, [
                            n('Nf3', { weight: 1 }, [
                              n('Nd7', { primary: true, note: 'Covers e5 and prepares ...Ngf6 without allowing doubled pawns after a trade.' }, [
                                n('h5', { weight: 1 }, [
                                  n('Bh7', { primary: true }, [
                                    n('Bd3', { weight: 1 }, [
                                      n('Bxd3', { primary: true }, [
                                        n('Qxd3', { weight: 1 }, [
                                          n('e6', { primary: true, note: 'The full sequence complete. Now ...Ngf6, ...Bd6 or ...Be7, ...Qc7, castle (either side). Textbook solidity.' }),
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
                          n('Nd7', { primary: true, note: 'Same system, calmer version. ...Ngf6, ...e6, ...Be7, castle.' }),
                        ]),
                      ]),
                    ]),
                    n('Nc5', { weight: 1 }, [
                      n('b6', { primary: true, note: 'Kick it straight back. The knight achieved nothing on c5.' }),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            n('Nd2', { weight: 1 }, [
              n('dxe4', { primary: true, note: 'Identical to the Classical: take, then ...Bf5 against Nxe4 with the same poem.' }, [
                n('Nxe4', { weight: 1 }, [
                  n('Bf5', { primary: true }),
                ]),
              ]),
            ]),
            n('f3', { weight: 1, name: 'Fantasy Variation' }, [
              n('e6', {
                primary: true,
                note: 'Decline the invitation. f3 built a big center that cannot castle comfortably; develop and let it overextend. Do NOT take on e4 yet.',
              }, [
                n('Nc3', { weight: 1 }, [
                  n('Nf6', { primary: true, note: 'If e5 kicks the knight, ...Nfd7 then ...c5 chips the chain just like an Advance French.' }, [
                    n('e5', { weight: 1 }, [
                      n('Nfd7', { primary: true }, [
                        n('f4', { weight: 1 }, [
                          n('c5', { primary: true, note: 'The standard demolition of an overextended chain. Their king is still in the middle.' }),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
                n('Be3', { weight: 1 }, [
                  n('Nf6', { primary: true }),
                ]),
              ]),
            ]),
            n('Bd3', { weight: 1 }, [
              n('dxe4', { primary: true, note: 'Take — the bishop must recapture and your knight develops onto it with tempo.' }, [
                n('Bxe4', { weight: 1 }, [
                  n('Nf6', { primary: true, note: 'Hits the bishop; it moves again and you are ahead in development for free.' }),
                ]),
              ]),
            ]),
          ]),
        ]),
        n('Nc3', { weight: 2 }, [
          n('d5', { primary: true }, [
            n('Nf3', { weight: 2, name: 'Two Knights' }, [
              n('Bg4', {
                primary: true,
                note: 'The equalizer: pin, then happily give the bishop pair for a granite structure.',
              }, [
                n('h3', { weight: 2 }, [
                  n('Bxf3', { primary: true, note: 'Give the pair without regret; their doubled f-pawn potential and your unbreakable center are full payment.' }, [
                    n('Qxf3', { weight: 1 }, [
                      n('e6', { primary: true, note: 'Then ...Nf6, ...Nbd7, ...Bd6 or ...Be7, castle. Nothing in your camp can be attacked.' }, [
                        n('d4', { weight: 1 }, [
                          n('Nf6', { primary: true, note: 'Develop — do not grab on e4 or d4; open lines only help the side with two bishops.' }),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
                n('exd5', { weight: 1 }, [
                  n('cxd5', { primary: true }),
                ]),
              ]),
            ]),
            n('exd5', { weight: 1 }, [
              n('cxd5', { primary: true, note: 'A pleasant Exchange structure; Nc6, Nf6, Bg4 as usual.' }),
            ]),
            n('e5', { weight: 1 }, [
              n('Bf5', { primary: true, note: 'Advance rules apply: bishop out, ...e6, ...c5 later.' }),
            ]),
          ]),
        ]),
        n('Nf3', { weight: 2 }, [
          n('d5', { primary: true }, [
            n('Nc3', { weight: 1 }, [
              n('Bg4', { primary: true, note: 'Two Knights again — same pin, same plan.' }),
            ]),
            n('exd5', { weight: 1 }, [
              n('cxd5', { primary: true }, [
                n('d4', { weight: 1 }, [
                  n('Nc6', { primary: true, note: 'Exchange Variation by another road. Bg4 next.' }),
                ]),
              ]),
            ]),
            n('e5', { weight: 1 }, [
              n('Bg4', { primary: true, note: 'With the knight already on f3 you get the improved version: pin first, ...e6 next, and White’s space means nothing.' }),
            ]),
          ]),
        ]),
        n('d3', { weight: 1, name: "King's Indian Attack" }, [
          n('d5', { primary: true }, [
            n('Nd2', { weight: 1 }, [
              n('e5', {
                primary: true,
                note: 'Punish the slow setup by taking the whole center. You get the space for free — a role reversal they did not sign up for.',
              }, [
                n('Ngf3', { weight: 1 }, [
                  n('Bd6', { primary: true, note: 'Then ...Ne7 or ...Nf6, ...O-O, ...Re8. You are White in this position, in every way that matters.' }),
                ]),
              ]),
            ]),
            n('Nf3', { weight: 1 }, [
              n('Bg4', { primary: true, note: 'Pin, then ...e6 or even ...e5. Slow play earns the full center treatment.' }),
            ]),
          ]),
        ]),
        n('c4', { weight: 1 }, [
          n('d5', { primary: true, note: 'Stick to the plan. After exd5 cxd5 cxd5, recapture with the KNIGHT (...Nf6xd5), never rushing Qxd5 into Nc3.' }, [
            n('exd5', { weight: 1 }, [
              n('cxd5', { primary: true }, [
                n('cxd5', { weight: 1 }, [
                  n('Nf6', {
                    primary: true,
                    note: 'The safe recapture: the knight takes on d5 next move. ...Qxd5?? first walks into Nc3 developing with tempo.',
                  }, [
                    n('Nc3', { weight: 1 }, [
                      n('Nxd5', { primary: true, note: 'Pawn recovered, knight centralized. Develop normally; you are fully equal.' }),
                    ]),
                    n('Nf3', { weight: 1 }, [
                      n('Nxd5', { primary: true }),
                    ]),
                  ]),
                ]),
                n('d4', { weight: 1 }, [
                  n('Nf6', { primary: true, note: 'A Panov by transposition: e6, Be7, O-O, blockade d5.' }),
                ]),
              ]),
            ]),
          ]),
        ]),
        n('Bc4', { weight: 1, name: 'Hillbilly Attack' }, [
          n('d5', { primary: true, note: 'The one-move refutation of early Bc4: the bishop is hit and c6 already covers d5 — the ...d5 break comes with tempo.' }, [
            n('exd5', { weight: 1 }, [
              n('cxd5', { primary: true }, [
                n('Bb5+', { weight: 1 }, [
                  n('Bd7', { primary: true, note: 'Block, offer the trade, develop. Their opening is already a failure — two bishop moves to reach an inferior Exchange Caro.' }),
                ]),
                n('Bb3', { weight: 1 }, [
                  n('Nf6', { primary: true, note: 'Develop with gain; ...e6 and ...Bd6 follow. You have the center and the tempi.' }),
                ]),
              ]),
            ]),
          ]),
        ]),
        n('f4', { weight: 1 }, [
          n('d5', { primary: true, note: 'Always ...d5. If e5 comes, ...Bf5 like an Advance; f4 only weakened their king.' }, [
            n('e5', { weight: 1 }, [
              n('Bf5', { primary: true }),
            ]),
            n('exd5', { weight: 1 }, [
              n('cxd5', { primary: true }),
            ]),
          ]),
        ]),
      ]),
    ]),
  ],
}
