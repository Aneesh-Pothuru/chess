# Daily coach routine — contract

This file is the contract between the Chess Coach app and the daily Claude Code routine that
analyzes pots1125's chess.com games and adjusts the training plan. The routine's job every day:

1. **Fetch** recent rapid games for `pots1125` from the chess.com public API
   (`https://api.chess.com/pub/player/pots1125/games/YYYY/MM` — fetch serially, never in
   parallel; months are zero-padded). Analyze games newer than the last briefing date.

1b. **Read the training data** at `progress/profile.json` (pushed by the app; may be absent if
   sync is not set up yet — proceed without it). It contains: weakness weights, coached-game
   report cards (`games`: blunders, castle move, time usage, motifs, won-game conversion),
   drill progress (`drills`: endgame/conversion attempts, coordinate-sprint best, board-math
   accuracy), puzzle stats per bucket, spaced-repetition state (`srs`), and streak. Use it:
   praise real improvements, call out avoided training ("three days since any conversion
   drill — and you just lost another won endgame"), and weigh adjustments with BOTH sources.
   This file is app-owned: NEVER write to it.
1c. **Run the deep-review pipeline** (added 2026-07-23 — Aneesh wants this every morning):
   ```bash
   node tools/coach-review/setup.cjs
   node tools/coach-review/analyze.cjs --since <last briefing date, ISO>
   ```
   `analyze.cjs` engine-checks every game (Stockfish sweep + depth-20 lines at each loss's
   turning points + repertoire-tree comparison) and prints a digest. Read the digest, then
   write `coach-log/review-annotations/YYYY-MM-DD.json` — per-loss coaching: the turning-point
   board, played-vs-better lines, and the portable rule. Schema + quality bar:
   `tools/coach-review/README.md`; reference example: `review-annotations/2026-07-23.json`.
   Then build the page and link it from the briefing:
   ```bash
   node tools/coach-review/build.cjs --date YYYY-MM-DD
   ```
   This writes `public/coach/review/YYYY-MM-DD.html`. Set `"review": "coach/review/YYYY-MM-DD.html"`
   in the briefing so the dashboard links to it. The builder works even with a minimal
   annotations file — never skip the page. On a no-games day, skip this step entirely.
   The digest also feeds your own analysis for the coach log — trust its engine lines over
   hand analysis.

   **Also render the narrated morning-summary video** (Aneesh listens to it each morning).
   Install deps (`apt-get update && apt-get install -y ffmpeg && pip3 install piper-tts`),
   write the video script `coach-log/review-annotations/YYYY-MM-DD.video.json` (schema and
   quality bar in `tools/coach-review/README.md`; `2026-07-23.video.json` is the reference:
   overview scene → one scene per recurring mistake with the board MOVING through the lines
   as the voice explains → closing rules), then run, IN THIS ORDER:
   ```bash
   node tools/coach-review/video.cjs --date YYYY-MM-DD    # -> public/coach/review/YYYY-MM-DD.mp4
   node tools/coach-review/build.cjs --date YYYY-MM-DD    # embeds the video at the top of the page
   ```
   Commit the mp4 with the page. If the video deps cannot be installed that morning, ship the
   page without the video rather than shipping nothing — but say so in the coach log.

2. **Analyze** each new game (PGN is embedded in the API response):
   - Result, color, opening (parse `[ECOUrl]` from the PGN) and whether it matches the
     repertoire: London as White; Caro-Kann vs 1.e4 and King's Indian otherwise as Black.
   - Castle move number (target: by move 8) and final clock (`[%clk]` tags; target: under 2:30
     remaining).
   - Blunder scan: replay moves with chess.js (installed in this repo). Use the pure detectors in
     `src/chess/coach.ts` (`mateInOneMoves`, `moveAllowsMateInOne`, `hangingPieces`) for
     motif tagging. Optionally run Stockfish (`node_modules/stockfish`, lite-single build works in
     Node) at depth 8 for eval-swing blunder counts — skip if it is slow or flaky; the detector
     tags alone are valuable.
   - Was a won position (material +5 or clearly winning) lost or drawn? That is a conversion
     failure — the #1 leak.
3. **Write** the day's outputs and commit + push them on whatever branch the session is on.
   Pushing to `main` directly is fine when allowed, but cloud routine sessions can only push to
   their own `claude/...` session branch — that is expected: the `promote-coach` GitHub workflow
   watches those branches and ferries the coach write surface (`coach-log/**` + `public/coach/**`)
   onto `main` (and triggers the Pages deploy). It keys on the `Coach briefing ...`
   commit-message prefix, so keep the commit format below.
   - `coach-log/YYYY-MM-DD.md` — the full analysis: per-game notes, patterns, honest coaching
     commentary. This is the long-term memory; read the last few entries before writing so
     advice builds instead of repeating. **Include one fully annotated game**: pick the most
     instructive game of the day (a lost won-position beats a clean win; a repertoire game
     beats an offbeat one) and annotate it move by move in prose — not every move needs a
     paragraph, but every critical moment does: name the moment the game turned, what the
     right plan was, what the player was probably thinking, and the one lesson to carry into
     tomorrow. Use evals sparingly; use ideas generously. Write at the level of a coach
     talking to a ~750 player: concrete squares and pieces, no engine jargon. If no games
     were played, annotate one instructive position from a previous game instead.
   - `public/coach/briefing.json` — REPLACE with today's briefing. The app fetches this from
     GitHub raw and shows it on the dashboard. Schema (all four top fields required):

```json
{
  "id": "2026-07-23",
  "date": "2026-07-23",
  "headline": "One-line theme for today",
  "note": "2-6 sentences. Reference the actual games by opponent/opening. Name the leak, name the fix. Plain, direct coaching voice.",
  "tasks": [
    {
      "route": "play | openings | puzzles | endgame | calculation | review",
      "target": "optional: puzzle bucket id, repertoire id (london/caro-kann/kings-indian), or 'conversion'",
      "title": "Button label",
      "detail": "One sentence tying the assignment to something that happened in the games",
      "minutes": 10
    }
  ],
  "adjustments": { "<weaknessKey>": 0.03 },
  "stats": { "gamesAnalyzed": 3, "record": "1W-2L", "blunders": 5 },
  "review": "coach/review/2026-07-23.html"
}
```

   `review` is the site-relative path of the day's deep-review page (step 1c); the dashboard
   renders it as a "read the full review" link. Omit it only on no-games days.

   `tasks` is the day's assignment list: give **2-4 items, ordered by priority**, each tied to a
   specific finding from the games (never generic filler). A good day mixes one repair drill for
   yesterday's worst leak, one puzzle set for a recurring motif, and one opening-course unit when
   an opening cost points. Useful targets: puzzle bucket ids (`mateIn1`, `hangingPiece`,
   `attackingF2F7`, ...), `conversion`, repertoire ids (the openings page opens on its guided
   Course tab). The legacy single `focus` field still works but `tasks` is preferred.

   Valid weakness keys: `conversion`, `hangingPiece`, `fork`, `mateThreats`, `f7f2`,
   `openingD4`, `openingE4`, `endgameTechnique`, `timeUsage`, `castling`, `boardVision`,
   `coordinates`. Deltas are clamped to ±0.1 and applied once per briefing `id`. Raise a key
   when the leak showed up; lower it slightly (−0.01/−0.02) when the games show clear
   improvement. No games played since the last briefing → still write a briefing (headline a
   drill-focused theme; `gamesAnalyzed: 0`); rotate the focus between conversion, the 1.d4
   repertoire, and calculation/vision work.

## Rules

- JSON must validate against the schema above — the app silently ignores malformed briefings.
- `id` must be unique per briefing (use the date; suffix `-2` if re-running the same day).
- Do not modify app source code, tests, or puzzle data. The routine's write surface is exactly
  `coach-log/` (logs + `review-annotations/`) and `public/coach/` (briefing + `review/` pages).
  `progress/profile.json` is read-only for the routine (the app owns it).
- If tests exist and you touched anything beyond the write surface by mistake, run `npm test`
  and revert whatever broke.
- Commit message format: `Coach briefing YYYY-MM-DD (N games analyzed)`. This exact prefix is
  load-bearing: the `promote-coach` workflow only ferries pushes whose commits carry it — that
  includes any follow-up correction to a coach log or briefing (use the same prefix, or the fix
  never reaches `main`).
- Tone: the coach is direct, specific, and references real moves — never generic pep talk.
