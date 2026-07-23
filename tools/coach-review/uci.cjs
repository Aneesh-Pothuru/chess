// Serial UCI driver around the stockfish lite-single build, spawned as a child
// process (the build exposes a readline CLI when run as a main module).
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const ENGINE = path.join(__dirname, '..', '..', 'node_modules', 'stockfish', 'bin', 'stockfish-18-lite-single.js');

function startEngine() {
  const proc = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'ignore'] });
  const rl = readline.createInterface({ input: proc.stdout });
  const listeners = [];
  rl.on('line', l => { for (const fn of [...listeners]) fn(l); });
  const send = c => proc.stdin.write(c + '\n');
  const until = (re, timeoutMs = 120000) => new Promise((res, rej) => {
    const lines = [];
    const fn = l => { lines.push(l); if (re.test(l)) { clearTimeout(t); listeners.splice(listeners.indexOf(fn), 1); res(lines); } };
    const t = setTimeout(() => { listeners.splice(listeners.indexOf(fn), 1); rej(new Error('uci timeout: ' + re)); }, timeoutMs);
    listeners.push(fn);
  });
  return {
    send, until,
    async init() {
      const p = this.until(/^uciok/);
      send('uci');
      await p;
      send('setoption name Threads value 1');
      send('setoption name Hash value 128');
      const r = this.until(/^readyok/);
      send('isready');
      await r;
    },
    async analyze(fen, depth, multipv = 1) {
      send('setoption name MultiPV value ' + multipv);
      const p = this.until(/^bestmove/);
      send('position fen ' + fen);
      send('go depth ' + depth);
      const lines = await p;
      const best = {};
      for (const l of lines) {
        const m = l.match(/^info depth (\d+) .*?multipv (\d+) score (cp|mate) (-?\d+)(?: [a-z]+ \S+)* pv (.+)$/) ||
                  l.match(/^info depth (\d+) .*?score (cp|mate) (-?\d+)(?: [a-z]+ \S+)* pv (.+)$/);
        if (!m) continue;
        let depth_, mpv, kind, val, pv;
        if (m.length === 6) { [, depth_, mpv, kind, val, pv] = m; } else { [, depth_, kind, val, pv] = m; mpv = '1'; }
        best[mpv] = { depth: +depth_, kind, val: +val, pv: pv.split(' ') };
      }
      const bm = lines[lines.length - 1].match(/^bestmove (\S+)/);
      return { bestmove: bm ? bm[1] : null, lines: best };
    },
    quit() { try { send('quit'); } catch { /* already dead */ } setTimeout(() => proc.kill(), 500); },
  };
}

module.exports = { startEngine };
