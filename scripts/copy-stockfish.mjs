// Copies the Stockfish lite single-threaded build (GPL-3.0) from node_modules
// into public/ so it loads as a classic Web Worker in dev and production.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/stockfish/bin')
const dst = join(root, 'public/stockfish')
mkdirSync(dst, { recursive: true })
for (const f of ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm']) {
  copyFileSync(join(src, f), join(dst, f))
}
console.log('stockfish assets copied to public/stockfish/')
