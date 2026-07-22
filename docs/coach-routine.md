# Daily coach routine — contract

This file is the contract between the Chess Coach app and the daily Claude Code routine that
analyzes pots1125's chess.com games and adjusts the training plan. The routine's job every day:

1. **Fetch** recent rapid games for `pots1125` from the chess.com public API
   (`https://api.chess.com/pub/player/pots1125/games/YYYY/MM` — fetch serially, never in
   parallel; months are zero-padded). Analyze games newer than the last briefing date.
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
3. **Write** two things and commit them to `main`:
   - `coach-log/YYYY-MM-DD.md` — the full analysis: per-game notes, patterns, honest coaching
     commentary. This is the long-term memory; read the last few entries before writing so
     advice builds instead of repeating.
   - `public/coach/briefing.json` — REPLACE with today's briefing. The app fetches this from
     GitHub raw and shows it on the dashboard. Schema (all four top fields required):

```json
{
  "id": "2026-07-23",
  "date": "2026-07-23",
  "headline": "One-line theme for today",
  "note": "2-6 sentences. Reference the actual games by opponent/opening. Name the leak, name the fix. Plain, direct coaching voice.",
  "focus": {
    "route": "play | openings | puzzles | endgame | calculation | review",
    "target": "optional: puzzle bucket id, repertoire id (london/caro-kann/kings-indian), or 'conversion'",
    "title": "Button label",
    "detail": "One sentence",
    "minutes": 12
  },
  "adjustments": { "<weaknessKey>": 0.03 },
  "stats": { "gamesAnalyzed": 3, "record": "1W-2L", "blunders": 5 }
}
```

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
  `coach-log/` and `public/coach/briefing.json`.
- If tests exist and you touched anything beyond the write surface by mistake, run `npm test`
  and revert whatever broke.
- Commit message format: `Coach briefing YYYY-MM-DD (N games analyzed)`.
- Tone: the coach is direct, specific, and references real moves — never generic pep talk.
