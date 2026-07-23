// Engine analysis of recent chess.com games for the daily deep review.
//
//   node tools/coach-review/analyze.js [--since 2026-07-23T14:00:00Z] [--user pots1125]
//
// Default window: the last 26 hours. Fetches the month archive(s) covering the
// window (serially — chess.com rate-limits parallel fetches), sweeps every game
// with Stockfish (losses: every position at depth 12; wins: the first 30 plies),
// re-analyzes each loss's critical moments at depth 20 with 3 lines, and walks
// every opening against the repertoire trees. Requires `node setup.js` first.
//
// Output: .cache/analysis.json (consumed by build.js) + a human-readable digest
// on stdout — the digest is what the coach session reads to write annotations.
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { startEngine } = require('./uci.cjs');

const CACHE = path.join(__dirname, '.cache');
const rep = require(path.join(CACHE, 'rep.cjs'));

const args = process.argv.slice(2);
const argVal = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const USER = (argVal('user', 'pots1125')).toLowerCase();
const SINCE = Math.floor(new Date(argVal('since', new Date(Date.now() - 26 * 3600_000).toISOString())).getTime() / 1000);
const ENGINES = Math.max(1, Math.min(8, +argVal('engines', 4)));
const SWEEP_DEPTH = +argVal('depth', 12);

async function fetchArchives() {
  const months = new Set();
  for (const t of [SINCE * 1000, Date.now()]) {
    const d = new Date(t);
    months.add(`${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const games = [];
  for (const m of months) { // serial on purpose
    const url = `https://api.chess.com/pub/player/${USER}/games/${m}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'chess-coach-review (personal training tool)' } });
    if (!res.ok) throw new Error(`chess.com ${res.status} for ${url}`);
    const data = await res.json();
    games.push(...(data.games || []));
  }
  return games.filter(g => g.time_class === 'rapid' && g.end_time >= SINCE)
    .sort((a, b) => a.end_time - b.end_time);
}

function povCp(line, meIsWhite, sideToMove) {
  const cp = line.kind === 'mate'
    ? (line.val > 0 ? 10000 - line.val * 10 : -10000 - line.val * 10)
    : line.val;
  return ((sideToMove === 'w') === meIsWhite) ? cp : -cp;
}

function pvToSan(fen, pvUci, max = 8) {
  const c = new Chess(fen);
  const sans = [];
  for (const u of pvUci.slice(0, max)) {
    try { sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; }
  }
  return sans;
}

function numberedLine(fen, sans) {
  let num = parseInt(fen.split(' ')[5], 10);
  let turn = new Chess(fen).turn();
  const parts = [];
  for (const s of sans) {
    if (turn === 'w') parts.push(`${num}.${s}`);
    else { parts.push(parts.length === 0 ? `${num}...${s}` : s); num += 1; }
    turn = turn === 'w' ? 'b' : 'w';
  }
  return parts.join(' ');
}

function walkRepertoire(myColor, sanMoves) {
  const r = myColor === 'w' ? rep.london : rep.blackRepertoireFor(sanMoves[0]);
  const path_ = [];
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i];
    const myMove = (i % 2 === 0) === (myColor === 'w');
    const kids = rep.childrenAt(r, path_);
    if (!kids || kids.length === 0) {
      return { repId: r.id, deviator: 'end-of-book', deviationPly: i, path: [...path_], expected: null, seen: san };
    }
    const hit = kids.find(k => k.san === san);
    if (!hit) {
      const prim = kids.find(k => k.primary) || kids[0];
      return {
        repId: r.id, deviator: myMove ? 'me' : 'opponent', deviationPly: i, path: [...path_],
        expected: myMove ? (prim ? prim.san : null) : kids.map(k => k.san).join('/'), seen: san,
      };
    }
    path_.push(san);
  }
  return { repId: r.id, deviator: 'none', deviationPly: sanMoves.length, path: [...path_], expected: null, seen: null };
}

async function analyzeGame(engine, g) {
  const meIsWhite = g.white.username.toLowerCase() === USER;
  const me = meIsWhite ? g.white : g.black;
  const opp = meIsWhite ? g.black : g.white;
  const c = new Chess();
  c.loadPgn(g.pgn);
  const hist = c.history({ verbose: true });
  const clocks = [...g.pgn.matchAll(/\{\[%clk (\d+):(\d+)(?:\.\d+)?:?(\d+)?(?:\.\d+)?\]\}/g)]
    .map(m => (m[3] !== undefined ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2]));
  const ecoUrl = (g.pgn.match(/\[ECOUrl "(.*)"\]/) || [])[1] || '';
  const result = me.result === 'win' ? 'W'
    : ['checkmated', 'resigned', 'timeout', 'abandoned'].includes(me.result) ? 'L' : 'D';

  const evals = [], fens = [];
  const replay = new Chess();
  const sweepEnd = result === 'L' ? hist.length : Math.min(hist.length, 30);
  for (let i = 0; i <= sweepEnd; i++) {
    const fen = replay.fen();
    fens.push(fen);
    if (replay.isGameOver()) {
      evals.push(replay.isCheckmate() ? ((replay.turn() === 'w') === meIsWhite ? -10000 : 10000) : 0);
    } else {
      const r = await engine.analyze(fen, SWEEP_DEPTH);
      const l = r.lines['1'];
      evals.push(l ? povCp(l, meIsWhite, replay.turn()) : null);
    }
    if (i < hist.length) replay.move(hist[i].san);
  }

  const moments = [];
  for (let i = 0; i + 1 < evals.length; i++) {
    if (((i % 2 === 0) !== meIsWhite)) continue;
    const before = evals[i], after = evals[i + 1];
    if (before == null || after == null) continue;
    const drop = before - after;
    if (drop >= 80) {
      moments.push({
        ply: i, moveNo: Math.floor(i / 2) + 1, san: hist[i].san, drop, before, after,
        fen: fens[i], clock: clocks[i] ?? null, allowedMateIn1: after <= -9980,
      });
    }
  }

  const deep = [];
  const targets = result === 'L'
    ? moments.filter(m => m.drop >= 120 && m.before > -600)
        .sort((a, b) => b.drop - a.drop).slice(0, 4).sort((a, b) => a.ply - b.ply)
    : moments.sort((a, b) => b.drop - a.drop).slice(0, 1);
  for (const m of targets) {
    const r = await engine.analyze(m.fen, 20, 3);
    const alts = Object.values(r.lines).map(l => ({
      eval: povCp(l, meIsWhite, m.fen.split(' ')[1]),
      line: numberedLine(m.fen, pvToSan(m.fen, l.pv, 8)),
    }));
    const cAfter = new Chess(m.fen);
    cAfter.move(m.san);
    let punish = null;
    if (!cAfter.isGameOver()) {
      const pr = await engine.analyze(cAfter.fen(), 18, 1);
      const l = pr.lines['1'];
      if (l) punish = numberedLine(cAfter.fen(), pvToSan(cAfter.fen(), l.pv, 6));
    }
    deep.push({ ...m, alts, punish });
  }

  const sans = hist.map(h => h.san);
  return {
    opp: opp.username, oppRating: opp.rating, myRating: me.rating, meIsWhite, result,
    endTime: g.end_time, url: g.url, ecoUrl, termination: me.result,
    nMoves: Math.ceil(hist.length / 2),
    myFinalClock: (() => {
      for (let i = hist.length - 1; i >= 0; i--) if (((i % 2 === 0) === meIsWhite) && clocks[i] != null) return clocks[i];
      return null;
    })(),
    evals, sans, book: walkRepertoire(meIsWhite ? 'w' : 'b', sans.slice(0, 24)),
    moments, deep,
    peak: evals.reduce((a, b) => (b != null && b > a ? b : a), -99999),
  };
}

const fmt = v => v == null ? '?' : v > 9000 ? '#+' : v < -9000 ? '#-' : (v / 100).toFixed(1);
const clk = s => s == null ? '?' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function printDigest(out) {
  for (const g of out) {
    console.log('='.repeat(78));
    console.log(`${g.result} vs ${g.opp}(${g.oppRating}) as ${g.meIsWhite ? 'White' : 'Black'} — ${g.nMoves} moves, ${g.termination}, my final clock ${clk(g.myFinalClock)}, peak ${fmt(g.peak)}`);
    console.log(`opening: ${g.ecoUrl.split('/').pop()} | book: ${g.book.deviator}@ply${g.book.deviationPly}` +
      (g.book.expected ? ` (expected ${g.book.expected}, saw ${g.book.seen})` : ''));
    console.log('moves:', g.sans.slice(0, 30).join(' '));
    for (const m of g.moments) {
      console.log(` moment m${m.moveNo} ${m.san}: ${fmt(m.before)} -> ${fmt(m.after)} (drop ${m.drop}) clock ${clk(m.clock)}${m.allowedMateIn1 ? ' ALLOWED-MATE-1' : ''}`);
    }
    for (const d of g.deep) {
      console.log(` DEEP m${d.moveNo} ${d.san} (before ${fmt(d.before)}, clock ${clk(d.clock)}) fen: ${d.fen}`);
      for (const a of d.alts) console.log(`   alt ${fmt(a.eval)}: ${a.line}`);
      if (d.punish) console.log(`   after ${d.san} -> ${d.punish}`);
    }
  }
  const losses = out.filter(g => g.result === 'L');
  console.log('='.repeat(78));
  console.log(`window since ${new Date(SINCE * 1000).toISOString()}: ${out.length} games, ` +
    `${out.filter(g => g.result === 'W').length}W-${losses.length}L, ` +
    `${losses.filter(g => g.moments.some(m => m.allowedMateIn1)).length} losses by allowed mate-in-1`);
}

(async () => {
  const games = await fetchArchives();
  if (games.length === 0) {
    console.log('No rapid games since', new Date(SINCE * 1000).toISOString());
    fs.writeFileSync(path.join(CACHE, 'analysis.json'), '[]');
    return;
  }
  console.error(`analyzing ${games.length} games with ${ENGINES} engines...`);
  const engines = [];
  for (let i = 0; i < Math.min(ENGINES, games.length); i++) {
    const e = startEngine();
    await e.init();
    engines.push(e);
  }
  const out = new Array(games.length);
  let next = 0;
  await Promise.all(engines.map(async e => {
    for (;;) {
      const i = next++;
      if (i >= games.length) break;
      out[i] = await analyzeGame(e, games[i]);
      console.error(`done ${games[i].white.username} vs ${games[i].black.username}`);
    }
  }));
  for (const e of engines) e.quit();
  fs.writeFileSync(path.join(CACHE, 'analysis.json'), JSON.stringify(out, null, 1));
  printDigest(out);
})().catch(e => { console.error(e); process.exit(1); });
