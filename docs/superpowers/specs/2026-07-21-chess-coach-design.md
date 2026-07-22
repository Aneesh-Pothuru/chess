# Chess Coach — Design

**Date:** 2026-07-21 · **Player:** pots1125 (chess.com, Rapid ~713, best 841, puzzle rating 1427)
**Goal:** A personal chess coach app: play against a level-appropriate engine with live coaching, drill a specific opening repertoire (London / Caro-Kann / King's Indian), train the exact tactical and endgame weaknesses found in the player's 162 rapid games, and evolve the program as new games are imported.

## 1. The player profile this app is built around

From the improvement report plus a fresh analysis of all 170 chess.com games (162 rapid):

| Fact | Value | App response |
|---|---|---|
| Puzzle rating vs game rating | 1427 vs 713 | The gap is *transfer*, not pattern knowledge → calculation trainer + in-game thought-process enforcement |
| vs 1.d4 as Black | 4W–12L–1D (26%) | King's Indian trainer with full response coverage |
| vs 1.e4 as Black | 21W–28L–3D (44%) | Caro-Kann trainer (new repertoire, only 4 prior games) |
| Checkmated in | 45 of 88 losses | Mate-threat awareness: allowed-mate-in-1 alerts, back-rank drills |
| Never castled | 50 of 162 games | Castle-by-8 nudge in play mode; tracked metric |
| Castled by move 8 | 31% | Same |
| Avg unused clock at game end | 4.6 of 10 min | 10-second-floor nudge; "spend the clock" coaching |
| Endgame-decided games lost | 62% (report) | Won-Game Protocol + conversion drills |
| Missed mate-in-1s | 8 (report) | mateIn1/mateIn2 drill rotation, in-game mate scan |
| Signature loss motif | Ng5/Nxf7 tricks, loose pieces, queen raids | attackingF2F7 + hangingPiece + fork puzzle buckets; queen-raid coach rule |

Target repertoire (player's explicit choice): **White = London System**; **Black = Caro-Kann vs 1.e4, King's Indian vs everything else**. The player has almost no prior games in any of these — the opening trainer must teach every common reply, not just main lines.

## 2. Architecture

**Pure client-side SPA. No backend, no accounts.**

- **Vite + React 19 + TypeScript**, react-chessboard@5 (board UI: declarative `arrows` + `squareStyles` — exactly the coach-annotation workflow), chess.js@1.4 (rules, SAN, legality; note: `.move()` throws on illegal input).
- **Engine:** `stockfish@18.0.8`, the **lite-single** flavor (7.3 MB WASM, single-threaded, embedded NNUE). Runs in classic Web Workers from `public/stockfish/` (copied from node_modules postinstall; GPL-3.0, not vendored into the repo). No COOP/COEP headers needed → works on any static host (GitHub Pages later).
  - Two workers: **opponent** (strength-limited) and **analyst** (full skill, capped depth/movetime — used for blunder checks, eval bar, drills defense, and game-import scanning).
- **Data in the bundle:** opening repertoire trees (hand-authored TS, legality-verified by unit tests), 2,810 curated Lichess puzzles (CC0, filtered from the 6.06M-puzzle July 2026 export by theme/rating/popularity), endgame + conversion drill positions.
- **Persistence:** localStorage (profile, SRS states, metrics, game history), with JSON export/import for backup.
- **chess.com integration:** direct browser fetch of the public API (CORS `*` verified). Serial month-by-month fetch per API etiquette; `accuracies`/`eco` treated as optional; ECO parsed from PGN headers.

**Trade-offs considered:**
- *Backend (Node/Python) + DB* — rejected: nothing here needs a server; a static app is simpler to run (`npm run dev`), deployable anywhere, and the engine is strongest as WASM in-browser anyway.
- *Training an ML model (e.g., Maia-style human-move model)* — rejected for v1: Stockfish skill-limiting + app-side blunder injection reaches ~700-level play without an Lc0 runtime (research: lichess's own weak levels are Stockfish with skill −9..−1 + 50–150 ms movetime). Revisit Maia-2 ONNX if the bot ever feels inhuman.
- *chessground (lichess board)* — rejected: no official React wrapper; react-chessboard v5 has first-class declarative annotations.

## 3. Engine strength model (the ~700 problem)

Stockfish's own floor (Skill 0 / UCI_Elo 1320) is far above the player. Verified approach:

- Skill Level 0–20 + `go depth D movetime T` caps, **plus app-side blunder injection**: with probability *p*, play a sampled non-best legal move (biased toward "plausible" blunders: captures/pushes near the action) instead of the engine move.
- Presets: Rookie (~550: skill 0, depth 1, p=0.28) · Sparring (~750: skill 0, depth 2, p=0.16) · Challenger (~950: skill 2, depth 3, p=0.07) · Tough (~1150: skill 5, depth 5, p=0.02) · Full (drill defense: skill 20, movetime 300).
- Elo labels are estimates, tuned by feel; the dashboard nudges the preset up when the player's win rate vs a preset exceeds 65% over the last 10 games.

Analyst evals parse `score cp|mate` from the deepest `info … multipv 1` line (side-to-move perspective — negate for Black). Skill Level stays 20 on the analyst.

## 4. The coach layer (play mode)

Implements Dan Heisman's published thought process for sub-1000 players, enforced by software:

1. **Pre-move (optional "strict mode"):** after the opponent moves, the coach asks "what did that move just threaten?" — the player must click the key square before moving (skippable, on by default in training games).
2. **Post-move blunder check:** analyst evaluates before/after. Classification: blunder ≥ 250 cp swing, mistake ≥ 120, inaccuracy ≥ 60. On blunder: coach explains *what was missed* (in plain language from motif detectors below), offers **take back & retry** (teaching game) or logs it (honest game).
3. **Pure-TS motif detectors** (instant, no engine): hanging-piece scan (attackers vs defenders per square), **mate-in-1 available / mate-in-1 allowed** (enumerate legal moves, `isCheckmate()`), fork detection (moved piece attacks ≥ 2 undefended/higher-value targets), f7/f2 strike warnings (Ng5+Bc4 geometry), queen-raid rule (own queen beyond rank 4 grabbing pawns before development done → warning), back-rank weakness.
4. **Won-Game Protocol:** activates at eval ≥ +3 (or material ≥ +5): persistent banner with the 3 rules (scan mate-in-1 both ways · trade pieces not pawns · slow down), simplification praise ("good trade — 2 pieces left each"), stalemate alarm when opponent mobility gets low.
5. **Habit nudges:** castle-by-8 reminder, 10-second floor ("you moved in 3s — sharp position, look again"), clock-usage summary at game end.
6. **Repertoire adherence:** while in book, the coach shows the repertoire move on request (hint arrow) and flags off-book moves with the book line's idea text.

Every coached game ends with a **report card**: accuracy proxy, blunders with retry links, castle move, time usage, motif tags → feeds the weakness profile.

## 5. Opening trainer

Hand-authored repertoire trees (TS data, one file per opening) with per-node explanations:

- **Node format:** `{ san, note?, primary?, weight?, children }` — at player-to-move nodes exactly one child is `primary` (alternates may be `alsoOk`); at opponent nodes children carry frequency `weight` for realistic drill sampling.
- **London (White):** vs …d5 setups, …c5/…Qb6 (the b2 problem: Qb3/Qc1 answers), …Nc6 Chigorin (early c3), vs KID/g6 setups (h3, c3, Be2, O-O), vs Dutch/e6/d6; Greek-gift awareness note; "e4-break only after CCT scan" discipline note.
- **Caro-Kann (Black):** Advance (…Bf5, …e6, …c5; the 4.g4 lunge), Exchange, Classical (full …Bf5–Bg6–h6 sequence), Panov (…e6 + …Be7 + O-O), Fantasy (3.f3 e6), Two Knights (…Bg4×f3), 2.Nc3/KIA/2.c4 sidelines, Hillbilly 2.Bc4 punish.
- **King's Indian (Black):** universal setup (Nf6–g6–Bg7–d6–O-O) then plans vs Classical (…e5, Mar del Plata …f5 idea), the dxe5/Qxd8 endgame trick (…Nxe4!), Sämisch, Four Pawns (…c5), Fianchetto, **vs London as Black** (…c5+…Qb6 raid — the exact plan that beat him), Colle/e3 systems, 1.c4/1.Nf3 transpositions.
- **Drill modes:** *Learn* (guided walk with notes) · *Drill* (opponent replies sampled by weight; SRS per line — the industry ladder: 4h → 1d → 3d → 1w → 2w → 1mo → 3mo → 6mo, reset on fail) · *Sparring* (play the opening vs engine from move 1; coach grades the first 10 moves against book).
- Format is opening-agnostic → new openings = new data file (future: Italian, etc.).

**Every line in every tree is validated by a unit test that walks all paths through chess.js.**

## 6. Puzzle trainer

- 2,810 curated Lichess puzzles in 19 buckets: mateIn1 (300), mateIn2 (300), mateIn3 (100), fork (300), hangingPiece (300), discoveredAttack (150), pin (150), attackingF2F7 (150), skewer/backRank/trappedPiece/promotion/defensiveMove (100 ea), rook/pawn/queen endgames (260), and **opening-specific buckets** — puzzles that arose from real London/Caro-Kann/KID games (100 ea). Ratings 400–1500, stratified so sets get harder as accuracy rises.
- **Semantics (verified):** puzzle FEN is *before* the opponent's setup move — the app auto-plays `Moves[0]`, player answers from the other side. UCI moves; on mate puzzles **any checkmating move is accepted** (lichess behavior).
- **Daily set:** 12 puzzles weighted by weakness profile (default rotation mirrors the report: fork / hangingPiece / mateIn1–2 / attackingF2F7). Wrong answers enter the SRS review queue.
- **Woodpecker-lite mode:** a fixed 150-puzzle easy set; repeat cycles, each targeting half the previous total time — with cycle history tracked.

## 7. Endgame & conversion trainer

Research-verified curriculum order, drilled vs full-strength defense:

1. K+2R ladder mate → 2. **K+Q mate** (fails if stalemate; the knight's-move stalemate trap positions are explicit test cases) → 3. **K+R mate** (box method) → 4. Rule of the square → 5. Opposition → 6. K+P key squares ("push to 7th without check"; rook-pawn draw exception) → 7. Basic R endgames, Q vs 7th-pawn.
- Each mate drill has a **move-count target** (e.g., K+Q mate in ≤ 10) and a 30-second-per-drill speed goal at mastery.
- **Conversion drills** (the #1 leak): curated winning positions (piece up / exchange up / queen up with counterplay) played out vs Challenger-strength defense until mate. Trading pieces praised, pawn-grabbing flagged, stalemate = instant fail with explanation.

## 8. Calculation trainer (the puzzle→game transfer gap)

Two drill types, auto-generated with chess.js so content never runs out:

- **Visualization ladder:** a position is shown, then a 2–5-ply line is given in SAN *without the pieces moving*. The player answers a generated question ("where does the knight end up?", "is Nxf7 then legal?", "what's the material count after the line?", "is the resulting position check?"). Ladder depth grows with accuracy. Positions sampled from the player's own imported games and the puzzle set.
- **Threat scan:** a position from a real ~700-level game; 10 seconds on the clock; the player must click every hanging piece / mate threat. Trains the pre-move scan as a reflex, decoupled from "puzzle mode" mindset.

## 9. Adaptive program (dashboard + chess.com sync)

- **Weakness profile:** weights per category (conversion, hangingPiece, fork, mateThreats, f7f2, openingD4, openingE4, endgameTechnique, timeUsage, castling), seeded from the report + the 162-game analysis, updated by every drill result and imported game.
- **Today's Training generator:** builds a 20–40 min session: warm-up puzzles (weighted by profile) → one focus block (rotates: conversion week / opening-patch week per the report's schedule) → one coached game with strict mode on. Streaks and weekly metrics on the dashboard.
- **Game import:** fetch new chess.com games (serial), analyst worker scans each at capped depth (~8–10, async with progress), tags blunders by phase + motif, updates profile and the metrics the report defined: blunders/game (target < 2.0), castle-by-8 % (target 70%), vs-1.d4 score (target > 40%), endgame-loss rate (target < 50%), avg clock remaining (target < 2:30).
- Report-card history is kept so the program visibly evolves; every metric shows trend vs the 162-game baseline.

## 10. Module boundaries

```
src/
  engine/    uci.ts (worker protocol) · engine.ts (Engine: init/bestMove/evaluate) · presets.ts
  chess/     coach.ts (motif detectors, classification) · phases.ts · material.ts · wonGame.ts
  data/      openings/{types,london,caroKann,kingsIndian}.ts · puzzles.json · endgames.ts · conversion.ts
  store/     profile.ts (localStorage persist) · srs.ts (interval ladder) · planner.ts (Today's Training)
  lib/       chesscom.ts (API client) · pgn.ts (import parsing)
  features/  dashboard/ play/ openings/ puzzles/ endgame/ calculation/ review/
```
Every module in `engine/`, `chess/`, `store/`, `data/`, `lib/` is pure TS with unit tests (vitest); `features/` are React views wired to those modules. The engine workers are the only async boundary; a single `useEngine` hook owns lifecycle.

## 11. Error handling & testing

- Engine worker failure → banner + retry; app remains usable for openings/puzzles (no engine needed there).
- chess.com fetch: 429 → exponential backoff; per-month progress UI; abortable.
- All repertoire lines, all 2,810 puzzles, all drill FENs validated by tests (legality walk / FEN parse / solution playthrough).
- Coach heuristics tested against crafted FENs (hanging piece, mate-in-1 both ways, fork, f7 strike, stalemate traps).
- Manual browser verification of each mode before ship.

## 12. Out of scope (v1)

Multiplayer, accounts/cloud sync, opening books beyond the three (format supports adding them), Maia/ML opponent, mobile app packaging, chess.com *private* data (Diamond insights aren't in the public API; the app computes its own equivalents from PGNs).
