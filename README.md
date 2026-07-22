# Chess Coach — pots1125 edition

A personal chess training app built around one player's actual games. It plays against you at your
level, coaches every move in real time, drills your exact repertoire (London System as White,
Caro-Kann vs 1.e4, King's Indian vs everything else), and evolves its training plan as you play.

Built from a data audit of 162 rapid games (chess.com: pots1125, rapid ~713, puzzles 1427). The
program attacks the three measured leaks, in order:

1. **Converting won games** — 62% of endgame-decided games lost; whole-queen leads thrown away
2. **Loose pieces & the f7 complex** — 129 hung pieces; two losses to the same Nxf7 trick
3. **The 1.d4 black hole** — 26% score as Black vs 1.d4

## Running it

**Hosted:** https://aneesh-pothuru.github.io/chess/ — deployed automatically from `main` by
GitHub Actions (including every daily coach-briefing commit). Progress lives in each browser's
localStorage; the **Cloud sync** panel in *My games* pushes it to `progress/profile.json` in this
repo (via a fine-grained PAT you keep in the browser), so the daily routine can read your
training data and any device can load your progress.

**Local:**

```bash
npm install     # also copies the Stockfish WASM into public/ (postinstall)
npm run dev     # open http://localhost:5173
npm test        # 40 unit tests: repertoire legality, coach detectors, puzzle data, drills
```

Requires Node 20+. Everything runs in the browser — no backend, no accounts. Progress lives in
localStorage.

## What's inside

| Mode | What it does |
|---|---|
| **Today** | Auto-generated daily session from your weakness profile + metrics vs the plan's targets |
| **Play the coach** | Rapid game vs strength-limited Stockfish (~550 to ~1150 presets). Live coaching: blunder checks with take-back-and-retry, hanging-piece and mate-in-1 alerts (both directions), threat-check gate before you move, Won-Game Protocol banner, castle-by-8 and spend-the-clock nudges, repertoire hints, annotated scoresheet, end-of-game report card |
| **Opening lab** | 126 hand-authored repertoire lines with coach notes: London (with the Qb6/b2 patch and early-c3 prophylaxis), Caro-Kann (Advance/Exchange/Classical/Panov/Fantasy/Two Knights + sidelines), King's Indian (Classical/Sämisch/Four Pawns/Fianchetto + the anti-London ...c5+...Qb6 raid). Learn mode, weighted drills, spaced repetition (4h → 6mo ladder) |
| **Tactics** | 2,810 real Lichess puzzles (CC0) filtered to the miss profile: forks, hanging pieces, mate-in-1/2/3, back-rank, f7/f2 strikes, endgames — plus puzzles that arose in real London/Caro-Kann/KID games. Daily rotation weighted by weakness |
| **Conversion gym** | The endgame curriculum in teaching order (ladder mate → K+Q → K+R → square rule → opposition → key squares → practical technique) vs perfect engine defense, with stalemate-trap tests — plus seven "you are winning, now WIN" conversion drills vs real resistance |
| **Calculation** | The puzzle-rating-vs-game-rating bridge: visualization drills with a Short/Deep line ladder (long-term vision), timed threat scans, board math (capture-exchange and attacker counting), and 30-second coordinate sprints from both sides |
| **My games** | Imports rapid games from the chess.com public API, scans them with Stockfish, tags blunders by motif, and updates the weakness profile — this is how the program evolves |

A daily Claude Code routine can also coach remotely: it analyzes new chess.com games and commits
`public/coach/briefing.json` + a `coach-log/` entry to this repo; the dashboard picks the briefing
up automatically (local copy or GitHub raw) and adjusts the day's plan. The contract lives in
[docs/coach-routine.md](docs/coach-routine.md).

## Architecture

Vite + React 19 + TypeScript. chess.js for rules, react-chessboard for the board, Stockfish 18
(lite single-threaded WASM, no special headers needed) in two web workers: a strength-limited
opponent (skill caps + plausible-blunder injection to reach sub-1320 play) and a full-strength
analyst for evals, drills defense, and game scanning.

Design doc: [docs/superpowers/specs/2026-07-21-chess-coach-design.md](docs/superpowers/specs/2026-07-21-chess-coach-design.md)

## Licenses

- Stockfish (GPL-3.0) is fetched from npm at install time and copied to `public/stockfish/` — not vendored in this repo
- Puzzle data derives from the [lichess puzzle database](https://database.lichess.org/#puzzles) (CC0)
- Coaching methodology draws on Dan Heisman's published thought-process principles and standard endgame theory
