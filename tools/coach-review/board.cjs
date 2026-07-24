// FEN -> inline SVG board diagrams. Pieces come from react-chessboard's own
// SVG set (built into .cache/pieces.cjs by setup.js) so review boards match
// the app. Boards reference per-page <symbol> defs emitted once by pieceDefs().
const path = require('path');
const { defaultPieces } = require(path.join(__dirname, '.cache', 'pieces.cjs'));

function pieceDefs() {
  return '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    Object.entries(defaultPieces).map(([k, f]) => {
      const svg = f({}).__svg;
      const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      return `<symbol id="pc-${k}" viewBox="0 0 45 45">${inner}</symbol>`;
    }).join('') + '</defs></svg>';
}

const SQ = 44, M = 16;
function sqXY(file, rank, flip) {
  const x = flip ? 7 - file : file;
  const y = flip ? rank : 7 - rank;
  return [M + x * SQ, M / 2 + y * SQ];
}

/**
 * opts: { flip, lastMove: ['e2','e4'], arrows: [{from,to,kind:'best'|'bad'|'threat'|'good2'}],
 *         marks: [{sq, kind:'bad'|'good'}], caption }
 */
function boardSvg(fen, opts = {}) {
  const { flip = false, lastMove = null, arrows = [], marks = [], caption = null } = opts;
  const rows = fen.split(' ')[0].split('/');
  const W = SQ * 8 + M * 1.5, H = SQ * 8 + M * 2.5;
  let s = `<svg class="board" viewBox="0 0 ${W} ${H}" role="img" aria-label="${caption || 'chess position'}">`;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const [x, y] = sqXY(f, r, flip);
    s += `<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" class="${(f + r) % 2 === 1 ? 'sq-l' : 'sq-d'}"/>`;
  }
  if (lastMove) for (const sq of lastMove) {
    const [x, y] = sqXY(sq.charCodeAt(0) - 97, +sq[1] - 1, flip);
    s += `<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" class="sq-last"/>`;
  }
  for (const m of marks) {
    const [x, y] = sqXY(m.sq.charCodeAt(0) - 97, +m.sq[1] - 1, flip);
    s += `<circle cx="${x + SQ / 2}" cy="${y + SQ / 2}" r="${SQ / 2 - 3}" class="mark-${m.kind || 'bad'}"/>`;
  }
  for (let f = 0; f < 8; f++) {
    const [x] = sqXY(f, 0, flip);
    s += `<text x="${x + SQ / 2}" y="${H - 11}" class="coord">${'abcdefgh'[f]}</text>`;
  }
  for (let r = 0; r < 8; r++) {
    const [, y] = sqXY(0, r, flip);
    s += `<text x="${M / 2 - 1}" y="${y + SQ / 2 + 5}" class="coord">${r + 1}</text>`;
  }
  s += '<g data-layer="pieces">';
  for (let ri = 0; ri < 8; ri++) {
    let f = 0;
    for (const ch of rows[ri]) {
      if (/\d/.test(ch)) { f += +ch; continue; }
      const code = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      const [x, y] = sqXY(f, 7 - ri, flip);
      s += `<use href="#pc-${code}" x="${x}" y="${y}" width="${SQ}" height="${SQ}"/>`;
      f += 1;
    }
  }
  s += '</g><g data-layer="overlay">';
  for (const a of arrows) {
    const [x1, y1] = sqXY(a.from.charCodeAt(0) - 97, +a.from[1] - 1, flip);
    const [x2, y2] = sqXY(a.to.charCodeAt(0) - 97, +a.to[1] - 1, flip);
    const cx1 = x1 + SQ / 2, cy1 = y1 + SQ / 2, cx2 = x2 + SQ / 2, cy2 = y2 + SQ / 2;
    const ang = Math.atan2(cy2 - cy1, cx2 - cx1);
    const tx = cx2 - Math.cos(ang) * (SQ * 0.32), ty = cy2 - Math.sin(ang) * (SQ * 0.32);
    const hw = 7.5;
    s += `<g class="arrow-${a.kind || 'best'}"><line x1="${cx1}" y1="${cy1}" x2="${tx}" y2="${ty}"/>` +
      `<polygon points="${cx2},${cy2} ${tx - Math.sin(ang) * hw},${ty + Math.cos(ang) * hw} ${tx + Math.sin(ang) * hw},${ty - Math.cos(ang) * hw}"/></g>`;
  }
  s += '</g></svg>';
  return s;
}

module.exports = { boardSvg, pieceDefs };
