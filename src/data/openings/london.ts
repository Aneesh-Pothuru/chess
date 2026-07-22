import { n, type Repertoire } from './types'

// The London System for White. Coverage tuned to what a 700-1100 opponent
// actually plays, with the two documented patches from the improvement report:
// the b2 problem (answer ...Qb6 with Qb3 or Qc1) and early c3 vs ...Nc6.

export const london: Repertoire = {
  id: 'london',
  name: 'London System (White)',
  color: 'w',
  keyIdeas: [
    'The setup, almost every game: d4, Bf4, e3, Nf3, c3, Bd3 or Be2, Nbd2, O-O. Learn the shape, then the exceptions.',
    'The b2 problem: when Black plays ...Qb6 hitting b2, answer Qb3 (offer the trade — you are better developed) or Qc1 (guard b2, keep queens on). Never just leave b2 hanging.',
    'Against ...Nc6 setups, play c3 EARLY. It blunts ...Nb4 hitting your Bd3, gives the Bf4 a retreat, and supports d4.',
    'Your dark-squared bishop on f4 is the soul of the London. When Black offers a trade with ...Bd6, retreat Bg3 — if they take, hxg3 opens the h-file toward their king.',
    'Central breaks (e4) only after a full checks-captures-threats scan. Loss #5 died to 20.e4?? played without one.',
    'Castle by move 8. The setup makes it easy — do not drift.',
  ],
  watchFor: [
    'The Greek Gift: with your Bd3 + Nf3 + Qd1 aimed kingside and Black castled, Bxh7+!? Kxh7 Ng5+ then Qh5 is often crushing. Know the pattern exists — check it when Black leaves h7 defended only by the king.',
    "...Qb6xb2 raids: if you ignore the queen, you lose the b-pawn AND the rook's corner. The answers are Qb3 and Qc1 — pick one and play it immediately.",
    '...Nb4 hopping at your Bd3 when you skipped c3. If it happens anyway: retreat Be2 and kick the knight with a3 next move.',
  ],
  root: [
    n('d4', { primary: true }, [
      n('d5', { weight: 9 }, [
        n('Bf4', { primary: true, note: 'The modern move order: bishop out before Nf3, so ...Bd6 can always be met by Bg3.' }, [
          n('Nf6', { weight: 7 }, [
            n('e3', { primary: true }, [
              n('e6', { weight: 4 }, [
                n('Nf3', { primary: true }, [
                  n('Bd6', { weight: 4, name: 'Bishop trade offer' }, [
                    n('Bg3', { primary: true, note: 'Keep the London bishop. If Black takes, hxg3 gives you a half-open h-file pointing at their king.' }, [
                      n('Bxg3', { weight: 2 }, [
                        n('hxg3', { primary: true, note: 'The h-file is now yours. Later: Bd3, Qd2 or Qe2, and watch for Rxh7 tricks once files open.' }, [
                          n('O-O', { weight: 1 }, [
                            n('Bd3', { primary: true, note: 'Standard: Bd3, Nbd2, Qe2, O-O or even O-O-O. Full development before any adventures.' }),
                          ]),
                        ]),
                      ]),
                      n('O-O', { weight: 3 }, [
                        n('Bd3', { primary: true }, [
                          n('c5', { weight: 2 }, [
                            n('c3', { primary: true, note: 'The London triangle d4-e3-c3. Solid. Next: Nbd2, O-O.' }, [
                              n('Nc6', { weight: 2 }, [
                                n('Nbd2', { primary: true, note: 'Setup complete after O-O. Middlegame plan: Ne5, f4 if allowed, or trade on d6 and play on the e-file.' }),
                              ]),
                            ]),
                          ]),
                          n('b6', { weight: 1 }, [
                            n('Nbd2', { primary: true, note: 'Black fianchettoes; you finish development. Castle next move.' }),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                  n('c5', { weight: 3 }, [
                    n('c3', { primary: true, note: 'Answer the wing strike with the triangle. d4 is rock solid.' }, [
                      n('Nc6', { weight: 2 }, [
                        n('Nbd2', { primary: true, note: 'Next Bd3 and O-O. If Black ever plays ...Qb6, you have Qb3 ready.' }, [
                          n('Bd6', { weight: 1 }, [
                            n('Bg3', { primary: true, note: 'Same rule: preserve the bishop.' }),
                          ]),
                          n('cxd4', { weight: 1 }, [
                            n('exd4', { primary: true, note: 'Recapture toward the center. Your e-file opens for the rook after castling.' }),
                          ]),
                        ]),
                      ]),
                      n('Qb6', { weight: 1, name: 'The b2 raid' }, [
                        n('Qb3', {
                          primary: true,
                          note: 'The b2 patch. Offer the queen trade — you are better developed, so every trade helps you. If ...Qxb3, axb3 opens the a-file for your rook.',
                        }, [
                          n('Qxb3', { weight: 2 }, [
                            n('axb3', { primary: true, note: 'A fine structure: the a-file is half open and b3 controls c4. Develop and play chess up a tempo.' }),
                          ]),
                          n('c4', { weight: 1 }, [
                            n('Qc2', { primary: true, note: 'Retreat, keep b2 covered. The pawn on c4 releases pressure on d4 — you are comfortable.' }),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                  n('Be7', { weight: 2 }, [
                    n('Bd3', { primary: true, note: 'Quiet setups get the full system: Bd3, Nbd2, c3, O-O — in any order.' }, [
                      n('O-O', { weight: 1 }, [
                        n('Nbd2', { primary: true }),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
              n('c5', { weight: 3 }, [
                n('c3', { primary: true, note: 'Triangle first. Never let the center get traded off cheaply.' }, [
                  n('Nc6', { weight: 2 }, [
                    n('Nf3', { primary: true }, [
                      n('Qb6', { weight: 1, name: 'The b2 raid' }, [
                        n('Qb3', { primary: true, note: 'Same patch, same reasons: trade queens or make Black lose time.' }),
                      ]),
                      n('e6', { weight: 2 }, [
                        n('Nbd2', { primary: true, note: 'Bd3 and O-O complete the setup.' }),
                      ]),
                    ]),
                  ]),
                  n('Qb6', { weight: 1 }, [
                    n('Qb3', { primary: true, note: 'Meet the raid head-on. Every queen trade favors the better-developed side: you.' }),
                  ]),
                  n('cxd4', { weight: 1 }, [
                    n('exd4', { primary: true, note: 'Toward the center, always.' }),
                  ]),
                ]),
              ]),
              n('c6', { weight: 1 }, [
                n('Nf3', { primary: true, note: 'Slav-style setup from Black. Business as usual: Nf3, Bd3, Nbd2, c3 if needed, O-O by move 8.' }, [
                  n('Bf5', { weight: 1 }, [
                    n('c4', { primary: true, note: 'With ...Bf5 committed, hitting d5 is annoying: b7 is loose once the bishop left. Qb3 may follow.' }),
                  ]),
                ]),
              ]),
            ]),
          ]),
          n('c5', { weight: 3 }, [
            n('e3', { primary: true }, [
              n('Qb6', { weight: 1, name: 'Early b2 strike' }, [
                n('Qc1', {
                  primary: true,
                  note: 'With no c3 played yet, Qb3 walks into ...c4. Qc1 guards b2, keeps the queens on, and you develop normally. Ugly but correct — and only temporary.',
                }, [
                  n('Nc6', { weight: 1 }, [
                    n('Nf3', { primary: true, note: 'Carry on: c3, Be2, O-O. The queen returns to better squares later.' }),
                  ]),
                  n('cxd4', { weight: 1 }, [
                    n('exd4', { primary: true, note: 'Recapture toward the center. If the queen ever grabs d4, Nf3 hits her with tempo and your pieces flood out — the initiative outweighs the pawn at this level.' }),
                  ]),
                ]),
              ]),
              n('Nc6', { weight: 2 }, [
                n('c3', { primary: true, note: 'The prophylaxis patch: c3 before Bd3, so ...Nb4 never lands.' }, [
                  n('Qb6', { weight: 1 }, [
                    n('Qb3', { primary: true, note: 'Now Qb3 works — c4 by Black no longer hits the queen with tempo since you just trade.' }),
                  ]),
                  n('Nf6', { weight: 2 }, [
                    n('Nf3', { primary: true }, [
                      n('e6', { weight: 1 }, [
                        n('Nbd2', { primary: true, note: 'Bd3 or Be2 next, castle by 8. Setup done.' }),
                      ]),
                    ]),
                  ]),
                  n('cxd4', { weight: 1 }, [
                    n('exd4', { primary: true }),
                  ]),
                ]),
              ]),
              n('cxd4', { weight: 1 }, [
                n('exd4', { primary: true, note: 'Recapture toward the center; develop with Nf3, c3, Bd3.' }),
              ]),
            ]),
          ]),
          n('Nc6', { weight: 2, name: 'Chigorin setup' }, [
            n('c3', {
              primary: true,
              note: 'Four of your six White losses came from these ...Nc6 systems. The fix is this exact move: c3 immediately — ...Nb4 is dead before it exists.',
            }, [
              n('Nf6', { weight: 2 }, [
                n('e3', { primary: true }, [
                  n('e6', { weight: 1 }, [
                    n('Nf3', { primary: true, note: 'Standard setup; Bd3 is finally safe because b4 is covered.' }, [
                      n('Bd6', { weight: 1 }, [
                        n('Bg3', { primary: true, note: 'Preserve the bishop, as always.' }),
                      ]),
                    ]),
                  ]),
                  n('Bf5', { weight: 1 }, [
                    n('Qb3', { primary: true, note: 'The bishop left b7 undefended. Qb3 hits b7 and d5 at once — often wins a pawn outright.' }),
                  ]),
                ]),
              ]),
              n('e5', { weight: 1, name: 'Center strike' }, [
                n('dxe5', { primary: true, note: 'Just take. You are a clean pawn up; if Black regains it with ...d4 tricks, give it back calmly with e3 and develop. Greed is fine, panic is not.' }, [
                  n('d4', { weight: 1 }, [
                    n('Nf3', { primary: true, note: 'Develop, guard e5, let the d4 pawn overextend. cxd4 comes when it is safe.' }),
                  ]),
                ]),
              ]),
              n('Bf5', { weight: 1 }, [
                n('Qb3', { primary: true, note: 'Same punishment: b7 is loose the moment that bishop leaves home.' }),
              ]),
            ]),
          ]),
          n('e6', { weight: 1 }, [
            n('e3', { primary: true, note: 'French-style. Full system as usual — and remember ...c5+...Qb6 is coming: Qc1 or Qb3 on cue.' }, [
              n('Bd6', { weight: 1 }, [
                n('Bg3', { primary: true }),
              ]),
            ]),
          ]),
        ]),
      ]),
      n('Nf6', { weight: 6 }, [
        n('Bf4', { primary: true }, [
          n('g6', { weight: 3, name: "King's Indian setup" }, [
            n('e3', { primary: true }, [
              n('Bg7', { weight: 3 }, [
                n('h3', {
                  primary: true,
                  note: 'The anti-KID move: h3 preserves your Bf4 from ...Nh5. Then Nf3, Be2, c3, O-O — a fortress Black must burn time to crack.',
                }, [
                  n('O-O', { weight: 2 }, [
                    n('Nf3', { primary: true }, [
                      n('d6', { weight: 2 }, [
                        n('Be2', { primary: true }, [
                          n('Nbd7', { weight: 1 }, [
                            n('O-O', { primary: true, note: 'Castled by move 7. When ...e5 comes: dxe5 dxe5 and take on e5 — h3 is exactly why the grab works here (see the line).' }, [
                              n('e5', { weight: 1 }, [
                                n('dxe5', { primary: true }, [
                                  n('dxe5', { weight: 1 }, [
                                    n('Nxe5', { primary: true, note: 'Count it out: this wins a clean pawn BECAUSE you played h3. The old trick ...Qxd1, ...Ng4 hitting your bishop fails to hxg4. Without h3 on the board, do not grab.' }, [
                                      n('Nxe5', { weight: 1 }, [
                                        n('Bxe5', { primary: true, note: 'If ...Qxd1 Rxd1 Ng4, then hxg4 keeps the pawn; if ...Nd7, Bxg7 Kxg7 and you are up a pawn with the safer king. A pawn is a pawn — convert it.' }),
                                      ]),
                                    ]),
                                  ]),
                                ]),
                              ]),
                            ]),
                          ]),
                        ]),
                      ]),
                      n('d5', { weight: 1 }, [
                        n('Be2', { primary: true, note: 'A Grünfeld-ish ...d5 changes little: same setup, castle, then c4 or c3 by taste.' }),
                      ]),
                    ]),
                  ]),
                  n('d6', { weight: 1 }, [
                    n('Nf3', { primary: true }),
                  ]),
                ]),
              ]),
            ]),
          ]),
          n('e6', { weight: 2 }, [
            n('e3', { primary: true, note: 'Almost always transposes to the main London after ...d5.' }, [
              n('d5', { weight: 1 }, [
                n('Nf3', { primary: true, note: 'Back in the main line. Bd3/Be2, Nbd2, c3, O-O.' }),
              ]),
              n('b6', { weight: 1 }, [
                n('Nf3', { primary: true, note: 'Queen-side fianchetto: keep an eye on e4 and the long diagonal; Bd3 and Nbd2 cover it.' }),
              ]),
            ]),
          ]),
          n('c5', { weight: 2 }, [
            n('e3', { primary: true }, [
              n('Qb6', { weight: 1 }, [
                n('Nc3', {
                  primary: true,
                  note: 'The confident answer without ...d5 played: offer b2! If Qxb2, Nb5! nearly traps the queen — Nc7+ forks king and rook, and Rb1 comes with tempo. (Qc1 here would drop d4 to ...cxd4 and ...Qxd4.)',
                }, [
                  n('Qxb2', { weight: 1, name: 'The poisoned pawn' }, [
                    n('Nb5', { primary: true, note: 'Both threats at once: Nc7+ forking, and Rb1 hitting the queen. Best play still costs Black material or the queen spends five moves escaping while you develop everything.' }),
                  ]),
                  n('cxd4', { weight: 1 }, [
                    n('exd4', { primary: true, note: 'Center intact, knight already out. If Qxb2 now, Nb5 still lands.' }),
                  ]),
                ]),
              ]),
              n('cxd4', { weight: 1 }, [
                n('exd4', { primary: true }),
              ]),
            ]),
          ]),
          n('d5', { weight: 3 }, [
            n('e3', { primary: true, note: 'Transposes to the main line London — same setup, same plans.' }, [
              n('c5', { weight: 1 }, [
                n('c3', { primary: true }),
              ]),
              n('e6', { weight: 1 }, [
                n('Nf3', { primary: true }),
              ]),
            ]),
          ]),
        ]),
      ]),
      n('g6', { weight: 1 }, [
        n('Bf4', { primary: true, note: 'Same anti-KID recipe: e3, h3, Nf3, Be2, c3, O-O. Order barely matters; the shape does.' }, [
          n('Bg7', { weight: 1 }, [
            n('e3', { primary: true }, [
              n('Nf6', { weight: 1 }, [
                n('h3', { primary: true }),
              ]),
              n('d6', { weight: 1 }, [
                n('Nf3', { primary: true }),
              ]),
            ]),
          ]),
        ]),
      ]),
      n('e6', { weight: 1 }, [
        n('Bf4', { primary: true, note: 'Bishop out first, always. Expect ...c5 and ...Qb6 ideas — your answers are ready.' }, [
          n('d5', { weight: 1 }, [
            n('e3', { primary: true }),
          ]),
          n('Nf6', { weight: 1 }, [
            n('e3', { primary: true }),
          ]),
        ]),
      ]),
      n('f5', { weight: 1, name: 'Dutch' }, [
        n('Bf4', { primary: true, note: 'No special theory needed: your normal setup blunts the Dutch. Control e5 forever.' }, [
          n('Nf6', { weight: 1 }, [
            n('e3', { primary: true }, [
              n('e6', { weight: 1 }, [
                n('Nf3', { primary: true, note: 'Be2, O-O, c4 later. Black attacked nothing; you own e5.' }),
              ]),
            ]),
          ]),
        ]),
      ]),
      n('d6', { weight: 1 }, [
        n('Bf4', { primary: true, note: 'Likely a KID in disguise. Same recipe: e3, h3 if ...g6, Nf3, Be2, O-O.' }, [
          n('Nf6', { weight: 1 }, [
            n('e3', { primary: true }),
          ]),
          n('g6', { weight: 1 }, [
            n('e3', { primary: true }),
          ]),
        ]),
      ]),
      n('e5', { weight: 1, name: 'Englund Gambit' }, [
        n('dxe5', { primary: true, note: 'Take it. The gambit is unsound — but it is a TRAP opening aimed at d4 players, so the next few moves must be exact.' }, [
          n('Nc6', { weight: 2 }, [
            n('Nf3', { primary: true, note: 'Guard the extra pawn. Expect ...Qe7 next — that is the trap being set.' }, [
              n('Qe7', { weight: 2, name: 'The Englund trap' }, [
                n('Bf4', { primary: true, note: 'Fine — but ONLY with the follow-up memorized: after ...Qb4+, block with Bd2, and when the queen eats b2, Nc3! The famous trap needs you to play Bc3?? instead; never put the bishop there.' }, [
                  n('Qb4+', { weight: 2 }, [
                    n('Bd2', { primary: true, note: 'Block with the bishop, hitting the queen.' }, [
                      n('Qxb2', { weight: 2 }, [
                        n('Nc3', {
                          primary: true,
                          note: 'The move that defuses everything. (Bc3?? loses the queen to ...Bb4! — that is their whole plan.) Now Rb1 comes with tempo, Nb5/Nd5 chase the queen, and you are simply a pawn up with a huge lead.',
                        }),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
      n('c5', { weight: 1 }, [
        n('e3', {
          primary: true,
          note: 'Keep it simple against the wing strike: e3 holds d4. If ...cxd4 then exd4 with easy development and an open e-file coming.',
        }, [
          n('cxd4', { weight: 1 }, [
            n('exd4', { primary: true }, [
              n('d5', { weight: 1 }, [
                n('Bf4', { primary: true, note: 'A normal London where Black spent two tempi trading c-pawn for e-pawn. Thanks.' }),
              ]),
            ]),
          ]),
          n('Nc6', { weight: 1 }, [
            n('Nf3', { primary: true, note: 'With e3 already played the bishop stays home this one time: Nf3, c3, Bd3 — a solid Colle shape. A fair trade for neutralizing 1...c5.' }),
          ]),
        ]),
      ]),
    ]),
  ],
}
