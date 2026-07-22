const { Chess } = require('chess.js');
const fs = require('fs');

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function legalAttackers(game, square, byColor) {
  const raw = game.attackers(square, byColor);
  if (raw.length === 0) return raw;
  let probe = game;
  if (game.turn() !== byColor) {
    const parts = game.fen().split(' ');
    parts[1] = byColor; parts[3] = '-';
    try { probe = new Chess(parts.join(' ')); } catch { return raw; }
  }
  return raw.filter((from) => {
    try { probe.move({ from, to: square, promotion: 'q' }); probe.undo(); return true; }
    catch { return false; }
  });
}
function hangingPieces(fen, color) {
  const game = new Chess(fen);
  const enemy = color === 'w' ? 'b' : 'w';
  const out = [];
  for (const row of game.board()) for (const cell of row) {
    if (!cell || cell.color !== color || cell.type === 'k') continue;
    const attackers = legalAttackers(game, cell.square, enemy);
    if (attackers.length === 0) continue;
    const defenders = game.attackers(cell.square, color);
    if (defenders.length === 0) { out.push({ square: cell.square, piece: cell.type, kind: 'free' }); continue; }
    const cheapest = Math.min(...attackers.map((sq) => PIECE_VALUE[game.get(sq)?.type ?? 'q']));
    if (cheapest < PIECE_VALUE[cell.type]) out.push({ square: cell.square, piece: cell.type, kind: 'underDefended' });
  }
  return out;
}
function mateInOneMoves(fen) {
  const game = new Chess(fen);
  const mates = [];
  for (const m of game.moves()) { game.move(m); if (game.isCheckmate()) mates.push(m); game.undo(); }
  return mates;
}
function moveAllowsMateInOne(fen, san) {
  const game = new Chess(fen);
  try { game.move(san); } catch { return null; }
  const replies = mateInOneMoves(game.fen());
  return replies.length > 0 ? replies[0] : null;
}
function materialDiff(fen) {
  const g = new Chess(fen); let w = 0, b = 0;
  for (const row of g.board()) for (const sq of row) { if (!sq) continue; if (sq.color === 'w') w += PIECE_VALUE[sq.type]; else b += PIECE_VALUE[sq.type]; }
  return w - b;
}

function analyze(pgn, meta) {
  const g = new Chess();
  g.loadPgn(pgn);
  const header = g.header();
  const moves = g.history({ verbose: true });
  const me = meta.color; // 'w' or 'b'
  // replay
  const rep = new Chess();
  let castleMove = null;
  let myHang = [];        // times I left a piece hanging AFTER my move
  let missedMate = [];    // I had mate-in-1 but didn't play it
  let allowedMate = [];   // my move allowed opponent mate-in-1
  let maxMyLead = -99, minMyLead = 99;
  let leadTimeline = [];
  const clkTags = [];
  // parse clocks from pgn comments
  const clkRe = /\[%clk\s+([0-9:.]+)\]/g; let cm;
  while ((cm = clkRe.exec(pgn)) !== null) clkTags.push(cm[1]);

  for (let i = 0; i < moves.length; i++) {
    const fenBefore = rep.fen();
    const mover = rep.turn();
    // before my move, check if I (to move) had mate in one but will not play it
    if (mover === me) {
      const mates = mateInOneMoves(fenBefore);
      const sanPlayed = moves[i].san;
      if (mates.length && !mates.includes(sanPlayed)) missedMate.push({ ply: i + 1, best: mates[0], played: sanPlayed });
      const allow = moveAllowsMateInOne(fenBefore, sanPlayed);
      if (allow) allowedMate.push({ ply: i + 1, played: sanPlayed, mate: allow });
    }
    rep.move(moves[i].san);
    const fenAfter = rep.fen();
    // after my move, did I leave something hanging (free)?
    if (mover === me) {
      const hp = hangingPieces(fenAfter, me).filter(h => h.kind === 'free' && h.piece !== 'p');
      if (hp.length) myHang.push({ ply: i + 1, after: moves[i].san, squares: hp.map(h => h.piece + '@' + h.square) });
    }
    const diff = materialDiff(fenAfter);
    const myLead = me === 'w' ? diff : -diff;
    maxMyLead = Math.max(maxMyLead, myLead);
    minMyLead = Math.min(minMyLead, myLead);
    leadTimeline.push(myLead);
  }
  // castle detection
  const rep2 = new Chess();
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].color === me && (moves[i].san === 'O-O' || moves[i].san === 'O-O-O')) { castleMove = Math.floor(i / 2) + 1; break; }
    rep2.move(moves[i].san);
  }
  // final clock for me
  let finalClk = null;
  // clocks alternate w,b,w,b... starting with white's first move
  const myClocks = [];
  for (let i = 0; i < clkTags.length; i++) {
    const moverColor = i % 2 === 0 ? 'w' : 'b';
    if (moverColor === me) myClocks.push(clkTags[i]);
  }
  if (myClocks.length) finalClk = myClocks[myClocks.length - 1];

  const result = meta.result;
  // conversion failure: had big lead (>=5) at some point but did not win
  const wasWinning = maxMyLead >= 5;
  const convFail = wasWinning && result !== 'win';

  return {
    url: meta.url, color: me, result, opening: header.ECO ? header.ECOUrl : (header.Opening || ''),
    ecoUrl: header.ECOUrl || '', termWhite: header.Termination || '',
    totalPlies: moves.length, castleMove, finalClk,
    maxMyLead, minMyLead, endLead: leadTimeline[leadTimeline.length - 1],
    myHangCount: myHang.length, myHang: myHang.slice(0, 8),
    missedMate, allowedMate,
    wasWinning, convFail,
  };
}

const raw = JSON.parse(fs.readFileSync('./scratch_games_202607.json'));
const cut = Date.parse('2026-07-21T00:00:00Z') / 1000;
const games = raw.games.filter(g => g.end_time >= cut && g.rules === 'chess');
const out = [];
for (const g of games) {
  const iAmWhite = g.white.username.toLowerCase() === 'pots1125';
  const me = iAmWhite ? 'w' : 'b';
  const myRes = iAmWhite ? g.white.result : g.black.result;
  const result = myRes === 'win' ? 'win' : (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(myRes) ? 'draw' : 'loss');
  const oppName = iAmWhite ? g.black.username : g.white.username;
  try {
    const a = analyze(g.pgn, { color: me, result, url: g.url });
    a.opponent = oppName; a.end = new Date(g.end_time * 1000).toISOString();
    a.rawResult = myRes;
    out.push(a);
  } catch (e) { out.push({ url: g.url, error: String(e), opponent: oppName }); }
}
fs.writeFileSync('./scratch_analysis.json', JSON.stringify(out, null, 2));
// print summary
let W = 0, L = 0, D = 0, totalHang = 0, totalMissedMate = 0, totalAllowedMate = 0, convFails = [];
for (const a of out) {
  if (a.error) { console.log('ERR', a.url, a.error); continue; }
  if (a.result === 'win') W++; else if (a.result === 'loss') L++; else D++;
  totalHang += a.myHangCount; totalMissedMate += a.missedMate.length; totalAllowedMate += a.allowedMate.length;
  if (a.convFail) convFails.push(a);
  console.log(`${a.end.slice(5,16)} ${a.color} ${a.result.toUpperCase().padEnd(4)} vs ${a.opponent.padEnd(16)} | castle:${a.castleMove ?? '-'} clk:${a.finalClk ?? '-'} maxLead:${a.maxMyLead} end:${a.endLead} hang:${a.myHangCount} missMate:${a.missedMate.length} allowMate:${a.allowedMate.length} | ${a.ecoUrl.split('/').pop()}`);
}
console.log(`\nRECORD ${W}W-${L}L-${D}D over ${out.length} games`);
console.log(`Totals: hangs=${totalHang} missedMateIn1=${totalMissedMate} allowedMateIn1=${totalAllowedMate}`);
console.log(`Conversion failures (lead>=5 but not win): ${convFails.length}`);
convFails.forEach(a => console.log(`  - vs ${a.opponent} (${a.color}) maxLead +${a.maxMyLead} -> ${a.result}, ${a.url}`));
