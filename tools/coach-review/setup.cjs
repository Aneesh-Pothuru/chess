// Builds the runtime bundles the analyzer/builder need into .cache/:
//  - rep.cjs: the repertoire trees + walkers (TS sources bundled for Node)
//  - pieces.cjs: react-chessboard's piece SVGs, rendered to strings via a jsx shim
// Bundled with rolldown, which ships with this repo's vite. Rerun after npm ci.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(__dirname, '.cache');
fs.mkdirSync(CACHE, { recursive: true });

const repEntry = path.join(CACHE, 'rep-entry.ts');
fs.writeFileSync(repEntry, `
export { REPERTOIRES, blackRepertoireFor, london, caroKann, kingsIndian } from '${ROOT}/src/data/openings/index'
export { childrenAt, nodeAt, primaryMove, isAcceptable, fenAfter } from '${ROOT}/src/chess/repertoire'
`);

const piecesEntry = path.join(CACHE, 'pieces-entry.js');
fs.writeFileSync(piecesEntry, `
import { defaultPieces } from '${ROOT}/node_modules/react-chessboard/dist/index.esm.js';
export { defaultPieces };
`);

const shim = path.join(__dirname, 'jsx-shim.cjs');

(async () => {
  const { rolldown } = await import('rolldown');

  const repBundle = await rolldown({ input: repEntry, platform: 'node' });
  await repBundle.write({ format: 'cjs', file: path.join(CACHE, 'rep.cjs') });

  const piecesBundle = await rolldown({
    input: piecesEntry,
    platform: 'node',
    resolve: { alias: { 'react/jsx-runtime': shim, 'react-dom': shim, react: shim } },
  });
  await piecesBundle.write({ format: 'cjs', file: path.join(CACHE, 'pieces.cjs') });

  const rep = require(path.join(CACHE, 'rep.cjs'));
  const { defaultPieces } = require(path.join(CACHE, 'pieces.cjs'));
  if (rep.REPERTOIRES.length !== 3 || Object.keys(defaultPieces).length !== 12) {
    throw new Error('setup smoke check failed');
  }
  console.log('coach-review setup OK:', rep.REPERTOIRES.map(r => r.id).join(', '), '+ 12 piece SVGs');
})().catch(e => { console.error(e); process.exit(1); });
