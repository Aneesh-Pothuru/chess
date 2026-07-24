// Builds the daily deep-review page from .cache/analysis.json plus optional
// hand-written coaching annotations, and writes it into the app's static files:
//
//   node tools/coach-review/build.js [--date 2026-07-23]
//
// Annotations (written by the coach session) live at
// coach-log/review-annotations/<date>.json — see README.md for the schema and
// coach-log/review-annotations/2026-07-23.json for a full worked example.
// Every loss gets a card either way: without annotations the builder features
// the engine's top moments automatically; annotations replace/enrich them.
//
// Output: public/coach/review/<date>.html (served by the app at
// <site>/coach/review/<date>.html once deployed).
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { boardSvg, pieceDefs } = require('./board.cjs');

const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(__dirname, '.cache');

const args = process.argv.slice(2);
const argVal = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const DATE = argVal('date', new Date().toISOString().slice(0, 10));

const all = JSON.parse(fs.readFileSync(path.join(CACHE, 'analysis.json'), 'utf8'));
const annPath = path.join(ROOT, 'coach-log', 'review-annotations', `${DATE}.json`);
const ann = fs.existsSync(annPath) ? JSON.parse(fs.readFileSync(annPath, 'utf8')) : {};
const annGames = ann.games || {};

const b64 = p => fs.readFileSync(p).toString('base64');
const F = path.join(ROOT, 'node_modules', '@fontsource');
const fonts = {
  spectral400: b64(`${F}/spectral/files/spectral-latin-400-normal.woff2`),
  spectral600: b64(`${F}/spectral/files/spectral-latin-600-normal.woff2`),
  spectralItal: b64(`${F}/spectral/files/spectral-latin-400-italic.woff2`),
  mono400: b64(`${F}/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2`),
  mono500: b64(`${F}/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2`),
};

const fmt = v => v == null ? '?' : v > 9000 ? '#' : v < -9000 ? '−#' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v / 100).toFixed(1);
const clk = s => s == null ? '?' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function evalStrip(g, featuredPlies = []) {
  const W = 640, H = 72, PAD = 2;
  const n = g.evals.length;
  const cl = v => Math.max(-600, Math.min(600, v));
  const x = i => PAD + (i / Math.max(1, n - 1)) * (W - 2 * PAD);
  const y = v => H / 2 - (cl(v) / 600) * (H / 2 - 4);
  let up = `M ${x(0)} ${H / 2}`, dn = `M ${x(0)} ${H / 2}`, line = '';
  for (let i = 0; i < n; i++) {
    const v = g.evals[i]; if (v == null) continue;
    up += ` L ${x(i).toFixed(1)} ${Math.min(H / 2, y(v)).toFixed(1)}`;
    dn += ` L ${x(i).toFixed(1)} ${Math.max(H / 2, y(v)).toFixed(1)}`;
    line += (line ? ' L' : 'M') + ` ${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
  }
  up += ` L ${x(n - 1)} ${H / 2} Z`; dn += ` L ${x(n - 1)} ${H / 2} Z`;
  const dots = featuredPlies.map(p => {
    const v = g.evals[p]; if (v == null) return '';
    return `<circle cx="${x(p).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" class="dot"/>`;
  }).join('');
  return `<svg class="strip" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="engine evaluation across the game">
<path d="${up}" class="fill-pos"/><path d="${dn}" class="fill-neg"/>
<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" class="zero"/>
<path d="${line}" class="curve" vector-effect="non-scaling-stroke"/>${dots}</svg>`;
}

/**
 * Annotation FENs may be placement-only (enough to draw). For replay, fill in
 * side to move (the annotated player = flip side), castling inferred from
 * home squares, and default counters.
 */
function normalizeFen(fen, flip) {
  const fields = String(fen).trim().split(/\s+/);
  if (fields.length >= 6) return fields.slice(0, 6).join(' ');
  const placement = fields[0];
  const rows = placement.split('/');
  const expand = r => r.replace(/\d/g, d => ' '.repeat(+d));
  const r1 = expand(rows[7] || ''), r8 = expand(rows[0] || '');
  let castle = '';
  if (r1[4] === 'K') { if (r1[7] === 'R') castle += 'K'; if (r1[0] === 'R') castle += 'Q'; }
  if (r8[4] === 'k') { if (r8[7] === 'r') castle += 'k'; if (r8[0] === 'r') castle += 'q'; }
  const side = fields[1] || (flip ? 'b' : 'w');
  return `${placement} ${side} ${castle || '-'} - 0 1`;
}

/** Replay the SAN tokens of an annotation line into animation steps. */
function lineSteps(fen, flip, lineStr, max = 10) {
  const text = String(lineStr).split('\u2014')[0]; // stop at the em-dash prose
  const tokens = text.trim().split(/\s+/)
    .map(t => t.replace(/^\d+\.+/, '').replace(/[?!]+$/, ''))
    .filter(t => t && t !== '...' && !/^[0-9.]+$/.test(t));
  let c;
  try { c = new Chess(normalizeFen(fen, flip)); } catch { return []; }
  const steps = [];
  for (const tok of tokens.slice(0, max)) {
    try {
      const mv = c.move(tok);
      steps.push({ fen: c.fen(), from: mv.from, to: mv.to, san: mv.san });
    } catch { break; }
  }
  return steps;
}

function moveFromTo(fen, san) {
  try {
    const mv = new Chess(fen).move(san.replace(/^\d+\.+/, ''));
    return { from: mv.from, to: mv.to };
  } catch { return null; }
}

function firstSanOfLine(line) {
  return (line.split(' ')[0] || '').replace(/^\d+\.+/, '').replace(/^\.+/, '');
}

/** Auto-generate a featured moment from an analysis `deep` entry. */
function autoMoment(g, d) {
  const arrows = [];
  const played = moveFromTo(d.fen, d.san);
  if (played) arrows.push({ ...played, kind: 'bad' });
  const bestAlt = d.alts && d.alts[0];
  if (bestAlt) {
    const best = moveFromTo(d.fen, firstSanOfLine(bestAlt.line));
    if (best && (!played || best.from !== played.from || best.to !== played.to)) arrows.push({ ...best, kind: 'best' });
  }
  const prefix = g.meIsWhite ? `${d.moveNo}.` : `${d.moveNo}...`;
  const lines = [
    { tag: 'Played', eval: fmt(d.after), line: `${prefix}${d.san}` + (d.punish ? ` — met by ${d.punish}` : '') },
    ...(d.alts || []).slice(0, 2).map((a, i) => ({ tag: i === 0 ? 'Better' : 'Or', eval: fmt(a.eval), line: a.line })),
  ];
  return {
    ply: d.ply,
    title: `Move ${d.moveNo}: ${d.san} let ${fmt(d.before)} become ${fmt(d.after)} (${clk(d.clock)} on the clock)`,
    board: { fen: d.fen, flip: !g.meIsWhite, arrows, caption: `Before ${prefix}${d.san}` },
    prose: null, lines, fix: null,
  };
}

function lineRows(lines) {
  return lines.map(l => `<div class="ln"><span class="ln-tag ${/^played$/i.test(l.tag) ? 'bad' : /rule|scan|only/i.test(l.tag) ? 'rule' : 'good'}">${esc(l.tag)}</span><span class="ln-ev">${esc(l.eval ?? '')}</span><span class="ln-moves">${esc(l.line)}</span></div>`).join('');
}

function momentBlock(t) {
  const b = t.board;
  const playable = (t.lines || [])
    .map(l => ({ tag: l.tag, steps: lineSteps(b.fen, !!b.flip, l.line) }))
    .filter(l => l.steps.length > 0);
  const player = playable.length > 0 ? {
    fen: b.fen, flip: !!b.flip,
    lines: playable.map(l => ({ tag: l.tag, steps: l.steps })),
  } : null;
  const playerControls = player ? `<div class="player" data-player='${JSON.stringify(player).replace(/'/g, '&#39;')}'>
      <div class="pl-lines">${player.lines.map((l, i) =>
        `<button class="pl-line" data-line="${i}"><span class="pl-tag">\u25b6 ${esc(l.tag)}</span> ${esc(l.steps[0].san)}\u2026</button>`).join('')}</div>
      <div class="pl-ctrl"><button class="pl-reset" title="back to the diagram">\u27f2</button><button class="pl-prev">\u25c0</button><button class="pl-next">\u25b6</button><span class="pl-status">tap a line to watch it play out</span></div>
    </div>` : '';
  return `<div class="moment">
  <h4>${esc(t.title)}</h4>
  <div class="moment-grid">
    <figure>${boardSvg(b.fen, { flip: b.flip, arrows: b.arrows || [], marks: b.marks || [], caption: b.caption })}${playerControls}<figcaption>${esc(b.caption || '')}</figcaption></figure>
    <div class="moment-notes">
      ${t.prose ? `<p>${t.prose}</p>` : ''}
      <div class="lines">${lineRows(t.lines || [])}</div>
      ${t.fix ? `<p class="fix"><span class="fix-label">Carry this</span> ${t.fix}</p>` : ''}
    </div>
  </div></div>`;
}

function gameCard(g, idx) {
  const a = annGames[g.opp] || {};
  let moments = a.moments;
  if (!moments || moments.length === 0) {
    const picks = (g.deep || []).slice(0, 2);
    moments = picks.map(d => autoMoment(g, d));
  }
  const featuredPlies = moments.map(m => m.ply).filter(p => p != null);
  return `<article class="game" id="g-${idx + 1}">
  <header class="game-head">
    <div class="game-title"><span class="chip ${g.result === 'L' ? 'chip-l' : 'chip-w'}">${g.result}</span><h3>vs ${esc(g.opp)} <span class="rat">(${g.oppRating})</span></h3></div>
    <div class="game-meta">${g.meIsWhite ? 'White' : 'Black'} · ${g.nMoves} moves · ${esc(g.termination)} · ${clk(g.myFinalClock)} left · <a href="${g.url}" target="_blank" rel="noopener">game ↗</a></div>
  </header>
  ${a.tagline ? `<p class="tagline">${esc(a.tagline)}</p>` : ''}
  ${a.opening ? `<p class="opening-note"><span class="ob">Opening</span> ${esc(a.opening)}</p>` : ''}
  ${evalStrip(g, featuredPlies)}
  <div class="strip-caption">Engine eval, your point of view — above the line you're better. Dots mark the moments below.</div>
  ${moments.map(momentBlock).join('\n')}
  ${a.also ? `<p class="also">${a.also}</p>` : ''}
</article>`;
}

function openingsChapter() {
  const groups = {};
  for (const g of all) (groups[g.book.repId] ??= []).push(g);
  const names = { london: 'London System (White)', 'caro-kann': 'Caro-Kann (Black)', 'kings-indian': "King's Indian (Black)" };
  const annOpen = ann.openings || {};
  return Object.entries(groups).map(([repId, games]) => {
    const w = games.filter(g => g.result === 'W').length, l = games.filter(g => g.result === 'L').length;
    const rows = games.map(g => `<tr><td>${g.result === 'L' ? '<b>L</b>' : 'W'} vs ${esc(g.opp)}</td><td class="mono">${esc(g.ecoUrl.split('/').pop() || '').slice(0, 46)}</td><td class="rec">${g.book.deviator === 'none' ? 'in book' : g.book.deviator === 'end-of-book' ? `book ended ply ${g.book.deviationPly}` : `${g.book.deviator === 'me' ? 'YOU left book' : 'opponent left book'} ply ${g.book.deviationPly}` + (g.book.expected ? ` (${g.book.deviator === 'me' ? 'drilled' : 'tree has'}: ${esc(g.book.expected)}, saw: ${esc(g.book.seen)})` : '')}</td></tr>`).join('');
    return `<h4 style="margin-top:26px">${names[repId] || repId} — ${w}W–${l}L</h4>
    ${annOpen[repId] ? `<p class="lede">${annOpen[repId]}</p>` : ''}
    <table><thead><tr><th>Game</th><th>Opening</th><th>Repertoire</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join('\n');
}

// auto stats
const losses = all.filter(g => g.result === 'L');
const okAt10 = losses.filter(g => (g.evals[Math.min(20, g.evals.length - 1)] ?? -999) >= -80).length;
const mates = losses.filter(g => g.moments.some(m => m.allowedMateIn1)).length;
const firstBigs = losses.map(g => (g.moments.find(m => m.drop >= 150) || {}).moveNo).filter(Boolean).sort((a, b) => a - b);
const median = firstBigs.length ? firstBigs[Math.floor(firstBigs.length / 2)] : null;
const record = `${all.length - losses.length}W–${losses.length}L`;
const stats = ann.stats || [
  { n: record, l: `record in this window (${all.length} games, engine-checked)` },
  losses.length ? { n: `${okAt10}/${losses.length}`, l: 'losses where you stood equal or better at move 10' } : null,
  median ? { n: `~${median}`, l: 'median move number of the first decisive mistake' } : null,
  mates ? { n: String(mates), l: 'losses ending in an allowed mate-in-one' } : null,
].filter(Boolean);

const rules = (ann.rules || []).map(r => `<li><span class="rn">${esc(r.rn)}</span>${r.html}</li>`).join('');

const videoFile = path.join(ROOT, 'public', 'coach', 'review', `${DATE}.mp4`);
const hasVideo = fs.existsSync(videoFile);

const html = `<title>Deep Review — ${DATE}</title>
<style>
@font-face{font-family:'Spectral';font-weight:400;font-style:normal;src:url(data:font/woff2;base64,${fonts.spectral400}) format('woff2')}
@font-face{font-family:'Spectral';font-weight:600;font-style:normal;src:url(data:font/woff2;base64,${fonts.spectral600}) format('woff2')}
@font-face{font-family:'Spectral';font-weight:400;font-style:italic;src:url(data:font/woff2;base64,${fonts.spectralItal}) format('woff2')}
@font-face{font-family:'Plex Mono';font-weight:400;src:url(data:font/woff2;base64,${fonts.mono400}) format('woff2')}
@font-face{font-family:'Plex Mono';font-weight:500;src:url(data:font/woff2;base64,${fonts.mono500}) format('woff2')}
:root{
  --paper:#f5f1e8;--card:#fbf8f1;--ink:#241e14;--ink2:#6d6355;--line:rgba(36,30,20,.16);
  --accent:#7a4a21;--pos:#2a78d6;--neg:#d95926;--good:#1e7d43;--bad:#c2331f;--rule:#7a4a21;
  --sq-l:#e9dcbe;--sq-d:#ae8a62;--last:rgba(201,162,39,.35);
}
@media (prefers-color-scheme: dark){:root:where(:not([data-theme=light])){
  --paper:#171410;--card:#1f1b15;--ink:#efe8da;--ink2:#a2988a;--line:rgba(239,232,218,.16);
  --accent:#cf9257;--pos:#3987e5;--neg:#eb6834;--good:#3fa06a;--bad:#e05a44;--rule:#cf9257;
  --sq-l:#cdbd97;--sq-d:#8c6f4e;--last:rgba(201,162,39,.4);
}}
:root[data-theme=dark]{
  --paper:#171410;--card:#1f1b15;--ink:#efe8da;--ink2:#a2988a;--line:rgba(239,232,218,.16);
  --accent:#cf9257;--pos:#3987e5;--neg:#eb6834;--good:#3fa06a;--bad:#e05a44;--rule:#cf9257;
  --sq-l:#cdbd97;--sq-d:#8c6f4e;--last:rgba(201,162,39,.4);
}
:root[data-theme=light]{
  --paper:#f5f1e8;--card:#fbf8f1;--ink:#241e14;--ink2:#6d6355;--line:rgba(36,30,20,.16);
  --accent:#7a4a21;--pos:#2a78d6;--neg:#d95926;--good:#1e7d43;--bad:#c2331f;--rule:#7a4a21;
  --sq-l:#e9dcbe;--sq-d:#ae8a62;--last:rgba(201,162,39,.35);
}
html{background:var(--paper)}
body{margin:0;background:var(--paper);color:var(--ink);font:400 17px/1.65 'Spectral',Georgia,serif}
.wrap{max-width:920px;margin:0 auto;padding:40px 20px 80px}
.eyebrow{font:500 12px/1 'Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
h1{font:600 clamp(30px,5vw,44px)/1.15 'Spectral',serif;margin:.3em 0 .2em;text-wrap:balance}
.dek{font-size:19px;color:var(--ink2);max-width:62ch;margin:0 0 8px}
h2{font:600 27px/1.2 'Spectral',serif;margin:0 0 4px;text-wrap:balance}
h3{font:600 21px/1.25 'Spectral',serif;margin:0}
h4{font:600 18px/1.3 'Spectral',serif;margin:0 0 10px}
.chapter{margin-top:64px;border-top:2px solid var(--ink);padding-top:14px}
.chapter>.eyebrow{display:block;margin-bottom:8px}
.lede{color:var(--ink2);max-width:66ch;margin-top:6px}
a{color:var(--accent)}
b,strong{font-weight:600}
.statrow{display:flex;gap:14px;flex-wrap:wrap;margin:26px 0 4px}
.stat{flex:1 1 160px;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:14px 16px}
.stat .n{font:500 30px/1.1 'Plex Mono',monospace;font-variant-numeric:tabular-nums}
.stat .l{font-size:14px;color:var(--ink2);line-height:1.4;margin-top:4px}
.game{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:22px 24px;margin-top:26px}
.game-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline}
.game-title{display:flex;align-items:center;gap:10px}
.chip{font:500 13px/1 'Plex Mono',monospace;padding:5px 8px;border-radius:4px}
.chip-l{background:var(--bad);color:#fff}
.chip-w{background:var(--good);color:#fff}
.rat{color:var(--ink2);font-weight:400;font-size:16px}
.game-meta{font:400 12.5px/1.6 'Plex Mono',monospace;color:var(--ink2)}
.tagline{font-style:italic;font-size:18.5px;margin:10px 0 2px}
.opening-note{font-size:15.5px;color:var(--ink2);margin:4px 0 12px}
.ob{font:500 11px/1 'Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-right:8px}
.strip{width:100%;height:72px;display:block;border:1px solid var(--line);border-radius:4px;background:var(--paper)}
.fill-pos{fill:var(--pos);opacity:.28}.fill-neg{fill:var(--neg);opacity:.3}
.zero{stroke:var(--ink2);stroke-width:1;opacity:.55}
.curve{stroke:var(--ink);stroke-width:1.4;fill:none;opacity:.75}
.dot{fill:var(--bad);stroke:var(--paper);stroke-width:1.5}
.strip-caption{font:400 12px/1.5 'Plex Mono',monospace;color:var(--ink2);margin:6px 0 4px}
.moment{margin-top:22px;border-top:1px solid var(--line);padding-top:18px}
.moment-grid{display:flex;gap:24px;flex-wrap:wrap}
.moment-grid figure{flex:0 1 330px;margin:0;min-width:270px}
.moment-grid figcaption{font:400 12.5px/1.5 'Plex Mono',monospace;color:var(--ink2);margin-top:6px}
.moment-notes{flex:1 1 320px;min-width:280px}
.moment-notes>p{margin:0 0 14px;max-width:58ch}
.board{width:100%;height:auto;display:block;border-radius:4px}
.sq-l{fill:var(--sq-l)}.sq-d{fill:var(--sq-d)}
.sq-last{fill:var(--last)}
.coord{font:600 12.5px 'Plex Mono',monospace;fill:var(--ink2);text-anchor:middle}
.mark-bad{fill:none;stroke:var(--bad);stroke-width:2.5;opacity:.9}
.mark-good{fill:none;stroke:var(--good);stroke-width:2.5;opacity:.9}
.arrow-best line{stroke:var(--good);stroke-width:7;opacity:.85;stroke-linecap:round}
.arrow-best polygon{fill:var(--good);opacity:.85}
.arrow-good2 line{stroke:var(--good);stroke-width:5;opacity:.5;stroke-linecap:round}
.arrow-good2 polygon{fill:var(--good);opacity:.5}
.arrow-bad line{stroke:var(--bad);stroke-width:7;opacity:.8;stroke-linecap:round}
.arrow-bad polygon{fill:var(--bad);opacity:.8}
.arrow-threat line{stroke:var(--ink);stroke-width:4.5;opacity:.55;stroke-dasharray:7 5}
.arrow-threat polygon{fill:var(--ink);opacity:.55}
.arrow-play line{stroke:var(--accent);stroke-width:7;opacity:.9;stroke-linecap:round}
.arrow-play polygon{fill:var(--accent);opacity:.9}
svg.playing .mark-bad,svg.playing .mark-good{display:none}
.player{margin-top:8px}
.pl-lines{display:flex;flex-wrap:wrap;gap:6px}
.pl-line{font:400 12px/1.4 'Plex Mono',monospace;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:5px 9px;cursor:pointer;text-align:left}
.pl-line .pl-tag{color:var(--accent);font-weight:500}
.pl-line.active{border-color:var(--accent);background:var(--card);box-shadow:inset 0 0 0 1px var(--accent)}
.pl-ctrl{display:flex;align-items:center;gap:6px;margin-top:6px}
.pl-ctrl button{font:500 13px/1 'Plex Mono',monospace;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:6px 10px;cursor:pointer}
.pl-ctrl button:disabled{opacity:.4;cursor:default}
.pl-status{font:400 12px/1.4 'Plex Mono',monospace;color:var(--ink2)}
.video-hero{margin-top:34px}
.lines{display:grid;gap:6px;margin:0 0 14px}
.ln{display:grid;grid-template-columns:76px 44px 1fr;gap:10px;align-items:baseline;font:400 13.5px/1.5 'Plex Mono',monospace}
.ln-tag{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:500}
.ln-tag.bad{color:var(--bad)}.ln-tag.good{color:var(--good)}.ln-tag.rule{color:var(--rule)}
.ln-ev{font-variant-numeric:tabular-nums;color:var(--ink2)}
.ln-moves{overflow-wrap:anywhere}
.fix{background:var(--paper);border-left:3px solid var(--accent);padding:10px 14px;border-radius:0 4px 4px 0;font-size:15.5px;max-width:60ch;margin:0}
.fix-label{display:block;font:500 11px/1 'Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
.also{font-size:15.5px;color:var(--ink2);border-top:1px dashed var(--line);padding-top:12px;margin-top:18px;max-width:64ch}
table{border-collapse:collapse;width:100%;margin:16px 0;font-size:15px}
th{font:500 11.5px/1.4 'Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);text-align:left;padding:6px 12px 6px 0;border-bottom:1px solid var(--ink)}
td{padding:8px 12px 8px 0;border-bottom:1px solid var(--line);vertical-align:top}
td.mono{font:400 13px/1.5 'Plex Mono',monospace}
.rec{color:var(--ink2);font-size:14px}
.rules{margin:14px 0 0;padding:0;list-style:none;display:grid;gap:12px}
.rules li{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px 16px;max-width:74ch}
.rules .rn{font:500 12px/1 'Plex Mono',monospace;color:var(--accent);letter-spacing:.1em;margin-right:10px}
@media (max-width:640px){.ln{grid-template-columns:64px 40px 1fr;gap:7px;font-size:12.5px}.game{padding:16px}}
</style>
${pieceDefs()}
<div class="wrap">
<header>
<span class="eyebrow">pots1125 · rapid · ${DATE} · ${all.length} games, engine-checked</span>
<h1>${esc(ann.headline || `Deep review — ${DATE}`)}</h1>
${ann.dek ? `<p class="dek">${ann.dek}</p>` : ''}
<div class="statrow">${stats.map(s => `<div class="stat"><div class="n">${esc(s.n)}</div><div class="l">${esc(s.l)}</div></div>`).join('')}</div>
</header>
${hasVideo ? `<section class="video-hero">
<span class="eyebrow">Morning summary \u00b7 watch or just listen</span>
<video controls preload="metadata" playsinline src="${DATE}.mp4" style="width:100%;border-radius:8px;display:block;margin-top:10px;background:#000"></video>
</section>` : ''}

<section class="chapter" id="openings">
<span class="eyebrow">Chapter I</span>
<h2>Openings vs the repertoire</h2>
${openingsChapter()}
</section>

<section class="chapter" id="losses">
<span class="eyebrow">Chapter II</span>
<h2>The ${losses.length ? losses.length + ' losses' : 'games'}, turning point by turning point</h2>
${(losses.length ? losses : all).map((g, i) => gameCard(g, i)).join('\n')}
</section>

${rules ? `<section class="chapter" id="rules">
<span class="eyebrow">Chapter III</span>
<h2>The rules to play by</h2>
<ul class="rules">${rules}</ul>
${ann.closing ? `<p class="lede" style="margin-top:20px">${ann.closing}</p>` : ''}
</section>` : ''}
</div>
<script>
(function () {
  var SQ = 44, M = 16;
  function xy(file, rank, flip) { var x = flip ? 7 - file : file, y = flip ? rank : 7 - rank; return [M + x * SQ, M / 2 + y * SQ]; }
  function sqXY(sq, flip) { return xy(sq.charCodeAt(0) - 97, +sq[1] - 1, flip); }
  function piecesFromFen(fen) {
    var rows = fen.split(' ')[0].split('/'), out = [];
    for (var ri = 0; ri < 8; ri++) {
      var f = 0;
      for (var ci = 0; ci < rows[ri].length; ci++) {
        var ch = rows[ri][ci];
        if (/\d/.test(ch)) { f += +ch; continue; }
        out.push({ code: (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase(), file: f, rank: 7 - ri });
        f++;
      }
    }
    return out;
  }
  function renderPieces(g, fen, flip) {
    var h = '';
    piecesFromFen(fen).forEach(function (p) {
      var c = xy(p.file, p.rank, flip);
      h += '<use href="#pc-' + p.code + '" x="' + c[0] + '" y="' + c[1] + '" width="' + SQ + '" height="' + SQ + '"/>';
    });
    g.innerHTML = h;
  }
  function arrowMarkup(from, to, flip) {
    var a = sqXY(from, flip), b = sqXY(to, flip);
    var x1 = a[0] + SQ / 2, y1 = a[1] + SQ / 2, x2 = b[0] + SQ / 2, y2 = b[1] + SQ / 2;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var tx = x2 - Math.cos(ang) * (SQ * 0.32), ty = y2 - Math.sin(ang) * (SQ * 0.32), hw = 7.5;
    return '<g class="arrow-play"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + tx + '" y2="' + ty + '"/><polygon points="' + x2 + ',' + y2 + ' ' + (tx - Math.sin(ang) * hw) + ',' + (ty + Math.cos(ang) * hw) + ' ' + (tx + Math.sin(ang) * hw) + ',' + (ty - Math.cos(ang) * hw) + '"/></g>';
  }
  document.querySelectorAll('.player').forEach(function (pl) {
    var data = JSON.parse(pl.getAttribute('data-player'));
    var fig = pl.closest('figure');
    var svg = fig.querySelector('svg.board');
    var piecesG = svg.querySelector('[data-layer=pieces]');
    var overlayG = svg.querySelector('[data-layer=overlay]');
    var home = { pieces: piecesG.innerHTML, overlay: overlayG.innerHTML };
    var status = pl.querySelector('.pl-status');
    var cur = null, idx = 0, timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function show() {
      if (cur === null || idx === 0) {
        piecesG.innerHTML = home.pieces; overlayG.innerHTML = home.overlay; svg.classList.remove('playing');
        status.textContent = cur === null ? 'tap a line to watch it play out' : 'start position — step with ▶';
      } else {
        var st = data.lines[cur].steps[idx - 1];
        svg.classList.add('playing');
        renderPieces(piecesG, st.fen, data.flip);
        overlayG.innerHTML = arrowMarkup(st.from, st.to, data.flip);
        status.textContent = st.san + '  (' + idx + '/' + data.lines[cur].steps.length + ')';
      }
      pl.querySelectorAll('.pl-line').forEach(function (b, i) { b.classList.toggle('active', i === cur); });
    }
    function play() {
      stop();
      timer = setInterval(function () {
        if (cur === null || idx >= data.lines[cur].steps.length) { stop(); return; }
        idx++; show();
      }, 950);
    }
    pl.querySelectorAll('.pl-line').forEach(function (btn, i) {
      btn.addEventListener('click', function () { stop(); cur = i; idx = 1; show(); play(); });
    });
    pl.querySelector('.pl-reset').addEventListener('click', function () { stop(); cur = null; idx = 0; show(); });
    pl.querySelector('.pl-prev').addEventListener('click', function () { stop(); if (cur === null) return; if (idx > 0) idx--; show(); });
    pl.querySelector('.pl-next').addEventListener('click', function () { stop(); if (cur === null) { cur = 0; } if (idx < data.lines[cur].steps.length) idx++; show(); });
  });
})();
</script>`;

const outDir = path.join(ROOT, 'public', 'coach', 'review');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${DATE}.html`);
fs.writeFileSync(outPath, html);
console.log(`written ${outPath} (${(html.length / 1024).toFixed(0)}KB, ${losses.length} loss cards, annotations: ${fs.existsSync(annPath) ? 'yes' : 'auto'})`);
