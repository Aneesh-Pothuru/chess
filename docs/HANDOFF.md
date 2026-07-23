# Chess Coach — Session Handoff (2026-07-22)

Personal chess training app for Aneesh (chess.com **pots1125**, rapid ~705, best 841, puzzle 1427).
Goal: climb 705 → 850 → 900+ by fixing measured leaks. Everything below is built, tested, and live.

## Where things are

- **Live app:** https://aneesh-pothuru.github.io/chess/ (GitHub Pages, auto-deploys on every push to `main`)
- **Repo:** https://github.com/Aneesh-Pothuru/chess (public; local clone `~/Documents/Code/chess`)
- **Run local:** `npm run dev` (port 5173) · `npm test` (vitest, 114 tests) · `npm run build`
- **Design doc:** `docs/superpowers/specs/2026-07-21-chess-coach-design.md`
- **Routine contract:** `docs/coach-routine.md` (briefing JSON schema lives here)
- **Session memory:** `~/.claude/projects/-Users-apothuru-Documents-Code-chess/memory/` (auto-loads)

## Stack + load-bearing facts

- Vite + React 19 + TS. `base: '/chess/'` in prod builds only (dev stays `/`).
- **chess.js 1.4** — `.move()` THROWS on illegal moves (always try/catch).
- **react-chessboard 5** — single `options` prop API; v4 prop names silently do nothing.
- **Stockfish 18 lite-single WASM** in `public/stockfish/` (copied by postinstall, gitignored, GPL —
  never vendor into repo). Two workers via `src/engine/instances.ts`: *opponent* (skill-capped +
  app-side blunder injection — SF's floor is ~1320, presets ~550–1150) and *analyst* (skill 20).
  All UCI commands go through a serial queue (`uci.ts`) — `position`+`go` are sent atomically.
- **Puzzles:** 2,810 curated Lichess puzzles (CC0) in `src/data/puzzles.json`. FEN is *before* the
  opponent's setup move (`Moves[0]` = opponent, UCI); on mate puzzles ANY checkmating move counts.
- **Repertoire trees** (`src/data/openings/`): London / Caro-Kann / King's Indian, ~130 lines,
  every line legality-tested by `validateRepertoire`. Guided courses (`courses.ts` + `chess/course.ts`)
  generate narrated lessons from the trees — content can't drift from drills.
- **chess.com public API:** CORS-open, fetch SERIALLY only; `accuracies`/`eco` optional; ECO from PGN headers.

## The adaptive loop (the whole point)

1. **App** (any device) → pushes training progress to `progress/profile.json` via GitHub contents API
   (fine-grained PAT stored in browser localStorage only — "Cloud sync" panel in My games; auto-push
   90s after last action + catch-up push on open; cross-device restore banner on the dashboard).
2. **Daily routine** `daily-chess-coach` (local scheduled task, 7:05am, prompt at
   `~/.claude/scheduled-tasks/daily-chess-coach/SKILL.md`; runs when the Claude app is open) →
   pulls repo, fetches new chess.com games, reads `progress/profile.json` (READ-ONLY for it), writes
   `coach-log/YYYY-MM-DD.md` (with one fully annotated game in prose) + replaces
   `public/coach/briefing.json` (**`tasks` array of 2–4 assignments**, weakness `adjustments`
   applied once per briefing `id`), commits ONLY those two paths, pushes.
3. **Dashboard** fetches the briefing (local file, else GitHub raw/API) → renders "Coach's orders"
   checklist, applies adjustments once. Every push auto-deploys, so the hosted app always has the
   latest briefing. Progress-sync/coach-log-only commits skip deploys (`paths-ignore`).

## Stats philosophy (settled with the user)

**"Current you" = rolling last 50 games** (imported + coached, `src/store/stats.ts`); the **July 2026
audit of 162 games is a dated baseline** (`BASELINE` in `planner.ts`), never presented as current.
Live ratings sampled from chess.com every 6h into `profile.ratingHistory`; per-game ratings captured
on import (`ImportedGame.myRating`). Progress page: rating trend SVG chart (game-index x-axis),
recent-25-vs-previous-25 area trends, rolling metric tiles. Hardcoded coach lines are reframed as
"the July audit …" facts. Puzzle difficulty: per-bucket `workingRating` ladder (+18 solve / −25 miss,
400–1500, serves nearest-rating unseen puzzles).

## Player context (from coach logs)

- `coach-log/2026-07-21-marathon.md`: 21-game marathon, 8W-12L-1D. Core finding: **wins positions,
  loses the clock** — flagged twice while winning, +7 → insufficient-material draw, 8 allowed
  mate-in-1s, 0-for-4 as Black vs 1.d4.
- `coach-log/2026-07-22.md`: 3 games, 1W-2L — both losses to allowed mate-in-1s with 7+ min left.
- Trends already visible: castle-by-8 40% (audit 31%) improving; vs 1.d4 40% (audit 26%) improving.

## Conventions & gotchas for the next session

- **Auto-sync commits land constantly** ("Sync training progress …"). Every push needs
  `git pull --rebase origin main` first; expect benign rebases.
- Verifying deploys: authenticated GitHub API via the osxkeychain token
  (`git credential fill`) — anonymous API rate-limits fast. Pages deploy ≈ 1–2 min.
- **Lockfile trap:** npm-on-macOS can omit platform-optional entries (`@emnapi/*`) and break
  `npm ci` on Linux CI — if it recurs, delete `package-lock.json` + `node_modules`, full `npm install`.
- Browser-pane testing: DOM-click buttons via `javascript_tool` (coordinate spaces get confusing
  after resizes); board squares are `[data-square]` elements; last-move tint = inner div with
  `rgba(201,162,39,.25)`.
- All boards: fixed-height `.coach-strip` above them — never render banners that shift the board.
- Bot replies are delayed ~550ms after the player's move everywhere (animation sequencing).
- Quality bar so far: every lesson/drill/opening claim has survived tablebase/engine audits
  (mate-drill targets are calibrated to the TAUGHT method, not DTM — K+Q 15, K+R 20). Keep that bar.

## Open threads / next ideas (nothing blocking)

- Tomorrow's 7:05am routine run is the first with the multi-task prompt — sanity-check its briefing.
- Hung-piece / mate-scan area trends need "Scan for blunders" run regularly (30-game cap per run).
- Possible future: positional "why" in move verdicts (needs deeper analysis pass), Italian repertoire
  as a fourth course, PWA offline caching, richer weakness-history charting.
- User asks for phone screenshots when something looks off — they've been the fastest debug loop.
