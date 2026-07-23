# Daily deep review pipeline

Produces the morning "Deep Review" page — engine-checked turning points for every loss,
opening-vs-repertoire tables, and coaching rules — published into the app at
`public/coach/review/<date>.html` (live at `<site>/coach/review/<date>.html`).

First shipped 2026-07-23; `coach-log/review-annotations/2026-07-23.json` is the reference
example for annotation quality and format.

## How the daily routine runs it

```bash
node tools/coach-review/setup.cjs                       # bundles repertoire trees + piece SVGs
node tools/coach-review/analyze.cjs --since <ISO>       # engine sweep; prints a digest, writes .cache/analysis.json
# ...write coach-log/review-annotations/<date>.json based on the digest (see schema below)...
node tools/coach-review/build.cjs --date <date>         # writes public/coach/review/<date>.html
```

- `--since` should be the previous briefing's date/time (default: 26 hours back).
- `analyze.cjs` fetches the chess.com archives itself (serially) and runs 4 Stockfish
  workers; a typical 5-game day takes ~2 minutes. Its stdout digest — per-game moments,
  deep engine lines with FENs, repertoire deviations — is the raw material for annotations.
- `build.cjs` works with **no annotations file at all**: every loss still gets a card with
  the eval graph and auto-selected engine moments (played move red, best move green).
  Annotations replace the auto content wherever provided. Never skip the page because
  writing annotations feels like too much — a partial annotations file is fine.
- After building, set `"review": "coach/review/<date>.html"` in `public/coach/briefing.json`
  so the dashboard links to it, and commit the review page + annotations with the briefing.

## Annotations schema (`coach-log/review-annotations/<date>.json`)

```jsonc
{
  "date": "2026-07-23",
  "headline": "...",                  // page h1
  "dek": "...",                       // subtitle, plain text
  "stats": [{ "n": "7/12", "l": "..." }],   // optional; auto-computed if omitted
  "openings": {                       // optional per-repertoire lede, HTML allowed
    "london": "...", "caro-kann": "...", "kings-indian": "..."
  },
  "games": {                          // keyed by opponent username
    "<opp>": {
      "tagline": "one italic line",
      "opening": "one line on the opening vs the repertoire",
      "moments": [{
        "ply": 46,                    // half-move index (dots the eval graph)
        "title": "Move 24: ...",
        "board": {
          "fen": "...",               // position BEFORE the move (from the digest)
          "flip": false,              // true when the player was Black
          "arrows": [{ "from": "c8", "to": "c7", "kind": "bad|best|threat|good2" }],
          "marks": [{ "sq": "d3", "kind": "bad|good" }],
          "caption": "Before 24.Qxc7?? — ..."
        },
        "prose": "HTML allowed — the coaching paragraph",
        "lines": [{ "tag": "Played|Better|Or|The rule", "eval": "+4.8", "line": "24.Rxc7! ..." }],
        "fix": "the habit to carry, HTML allowed"
      }],
      "also": "optional closing note, HTML allowed"
    }
  },
  "rules": [{ "rn": "R1", "html": "..." }],   // optional chapter III
  "closing": "optional closing paragraph, HTML allowed"
}
```

Annotation quality bar (match the 2026-07-23 example):
- The board shows the position **before** the mistake; played move = red arrow,
  engine move = green arrow, opponent's threat = dashed arrow.
- Name the state, not just the move: what should the player have *noticed*?
- Every "fix" is a portable rule, phrased for a ~700 player, tied to an app drill
  where one exists (board math, exchange counting, mate-in-one scan, conversion).
- Engine claims come from the digest's depth-20 lines — never invent evals or lines.

## Files

- `setup.cjs` — builds `.cache/rep.cjs` (repertoire trees for Node) and `.cache/pieces.cjs`
  (react-chessboard piece SVGs) via rolldown. Rerun after `npm ci` (cheap, idempotent).
- `analyze.cjs` — fetch + engine sweep → `.cache/analysis.json` + stdout digest.
- `build.cjs` — analysis + annotations → the static review page.
- `uci.cjs`, `board.cjs`, `jsx-shim.cjs` — engine driver, SVG boards, piece extraction shim.
- `.cache/` — build products, gitignored.
