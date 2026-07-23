# Deep loss review — window 2026-07-22 16:00 UTC → 2026-07-23 (20 games, engine-checked)

Requested by Aneesh: per-loss turning points, opening adaptation, middlegame/endgame focus.
Method: full Stockfish 18 sweep (depth 12) of every game, depth-20 multipv at critical moments,
every opening walked against the repertoire trees. Full illustrated review with boards lives in
the Claude artifact "Loss Review — July 22–23"; this file is the coach-memory digest.

## Headline findings

- 12 losses in the window (incl. 2026-07-23 evening: aadityanandrekar L, Matstreet W).
- **7/12 losses: equal or better at move 10.** 10/12 healthy at move 7. The openings are not
  losing the games — the first 6 moves after contact are (first decisive mistake: median move 13,
  range 6–25).
- **5 losses ended in an allowed mate-in-1** (keroRoma, callmetaide, unknowngirl181910, Tuco00,
  sindovald) — with 2:08–6:53 left. It is not clock *shortage*; the fatal moves each took seconds.
- Four repeating mistake types across all 12 losses:
  1. **Pawn lash in a quiet position** — the same 6...e5?/7...e5? in Caro Exchange structures
     twice in one day (callmetaide, keroRoma); 12.g3? opening own king (sri456chess).
  2. **One-piece attack / unsafe landing square** — 10.Qh5+? (sindovald), 17.Ng5?+19.Qxh7+??
     queen for defended pawn (TempestumEffector), 13.Nh4?? free knight (aadityanandrekar),
     12.Ng5?? (Jonat5957).
  3. **Uncounted capture/recapture** — 11.Nxe4? where dxe4 pawn-forks Bd3+Nf3 (Jonat5957),
     24.Qxc7?? mated where 24.Rxc7! wins because it clears c1 for the king (unknowngirl —
     the day's signature position), 38...Kxa6?? into Ra1# (Tuco00).
  4. **Ignored passed pawn / endgame filter** — 40...Kg4?? instead of the only move 40...Nxb6!
     turned +4.4 into −7.4 (Triss83); 41.b5? racing instead of 41.Rd7 blockading (PRO_Poro,
     the one true clock loss, mated at 0:28).

## Opening review vs the repertoire trees

**London (White): 2W–8L this window.**
- vs early **...Nc6** shapes: 1W–4L (sri456chess, unknowngirl, aadityanandrekar, HicoshOP; won
  kELANASTASIA). The tree's own patch (c3 immediately vs ...Nc6; Be2 if ...Nb4 already hits Bd3)
  was skipped every time — HicoshOP played the exact ...Nb4 position from watchFor and 8.c3??
  lost a piece where the note says Be2. **Rule, not line: any ...Nc6 before castling → c3 that
  move, in any move order.**
- vs **2...Bf5**: 0W–2L (Jonat5957, sindovald). TREE GAP — no coverage of 1.d4 d5 2.Bf4 Bf5.
  Both losses were middlegame accidents, but repertoire should add: 3.c4 (b7 is loose once the
  bishop leaves) with Qb3 to follow. Candidate for a repertoire addition + course unit.
- vs ...c6 Slav-style (TempestumEffector) and KID setup (PRO_Poro, skipped the drilled 4.h3):
  openings fine, losses came later.

**Caro-Kann (Black): 3W–4L vs 1.e4.** All four losses in anti-Caro sidelines (2.Nc3 exchange,
Exchange+5.Bb5, 4.Bb5+, Two Knights) — but the sidelines didn't win; middlegame lashes did.
Exchange-structure rule established with Aneesh: **...e5 is banned until castled + developed;
meet Bb5 with ...a6 or ignore the pin; one-square pawn moves.** Two Knights: drilled 3...Bg4
works — played it vs Matstreet (W) the same night he improvised 3...Nf6?! vs Triss83 (L).

**King's Indian (Black): 3W–0L** incl. anti-lines (2.Nc3, 3.f3, Fianchetto). The shape-based
play ports; use it as the model for the other two openings.

## Rules issued to the player (see artifact chapter IV)

R1 any ...Nc6 → c3 now / ...Nb4 hits Bd3 → Be2. R2 no ...e5 in Caro Exchange until developed.
R3 attacks need attackers ≥ defenders+1; a check must do something. R4 a capture ends after
their recapture — ask what the recapturing unit attacks. R5 two-question scan on every king
move and capture. R6 after each game, convert the almost-appeared line into a rule.

## Notes for future briefings

- Weakness weights this supports: mateThreats and conversion stay high; consider a new emphasis
  on "quiet-position pawn moves" via boardVision/calculation tasks rather than a new key.
- Positive to reinforce: KID 3W–0L; Two Knights Bg4 recall; Triss83 comeback (+4.6 from lost);
  the losses cluster at first contact — coach tasks should target moves 8–20 decision quality
  (board math + exchange counting drills tied to real captures).
- aadityanandrekar (evening 07-23) and Matstreet (W) not yet in any daily briefing — tomorrow's
  routine should treat them as covered by this review for analysis purposes but count them in
  the daily record.
