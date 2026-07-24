// Renders the narrated morning-summary MP4 for the deep review:
//
//   node tools/coach-review/video.cjs [--date YYYY-MM-DD]
//
// Input:  coach-log/review-annotations/<date>.video.json  (the video script —
//         scenes with narration + board beats; schema in README.md)
// Output: public/coach/review/<date>.mp4  (1280x720 h264/aac, committed with
//         the review page; build.cjs embeds it when the file exists)
//
// Dependencies (install on a fresh container before running):
//   apt-get update && apt-get install -y ffmpeg
//   pip3 install piper-tts        # neural voice; falls back to espeak-ng
// The piper voice model (~63MB) is auto-downloaded into .cache/tts on first use.
//
// How sync works: each scene's narration is synthesized first; its duration is
// then split evenly across the scene's beats, so arrows/moves appear while the
// voice walks through them. Keep one idea per beat when writing the script.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { Chess } = require('chess.js');
const { boardSvg, pieceDefs } = require('./board.cjs');

const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(__dirname, '.cache');
const TTS_DIR = path.join(CACHE, 'tts');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const DATE = argVal('date', new Date().toISOString().slice(0, 10));
const VOICE = argVal('voice', 'en_US-lessac-medium');

const scriptPath = path.join(ROOT, 'coach-log', 'review-annotations', `${DATE}.video.json`);
if (!fs.existsSync(scriptPath)) {
  console.error(`No video script at ${scriptPath} — write it first (see README.md).`);
  process.exit(1);
}
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
const WORK = path.join(CACHE, `video-${DATE}`);
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(TTS_DIR, { recursive: true });

const CHROME = fs.existsSync('/opt/pw-browsers')
  ? fs.readdirSync('/opt/pw-browsers').filter(d => /^chromium-\d+$/.test(d))
      .map(d => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find(fs.existsSync)
  : null;
if (!CHROME) { console.error('Chromium not found under /opt/pw-browsers'); process.exit(1); }

function have(cmd) { return spawnSync('which', [cmd]).status === 0; }
if (!have('ffmpeg')) { console.error('ffmpeg missing: apt-get update && apt-get install -y ffmpeg'); process.exit(1); }

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
  return `${placement} ${fields[1] || (flip ? 'b' : 'w')} ${castle || '-'} - 0 1`;
}

// ---- TTS ----
function ttsAvailable() {
  return spawnSync('python3', ['-c', 'import piper']).status === 0;
}
function ensureVoice() {
  if (fs.existsSync(path.join(TTS_DIR, `${VOICE}.onnx`))) return;
  console.error(`downloading piper voice ${VOICE}...`);
  execFileSync('python3', ['-m', 'piper.download_voices', VOICE], { cwd: TTS_DIR, stdio: 'inherit' });
}
const usePiper = ttsAvailable();
if (usePiper) ensureVoice();
else if (!have('espeak-ng')) { console.error('No TTS: pip3 install piper-tts (preferred) or apt-get install espeak-ng'); process.exit(1); }

function tts(text, outWav) {
  if (usePiper) {
    const r = spawnSync('python3', ['-m', 'piper', '-m', VOICE, '--data-dir', TTS_DIR, '--output-file', outWav],
      { input: text, stdio: ['pipe', 'inherit', 'inherit'] });
    if (r.status !== 0) throw new Error('piper failed');
  } else {
    execFileSync('espeak-ng', ['-v', 'en-us', '-s', '160', '-w', outWav, text]);
  }
}
function wavDuration(wav) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString());
}

// ---- frame rendering ----
const b64 = p => fs.readFileSync(p).toString('base64');
const F = path.join(ROOT, 'node_modules', '@fontsource');
const fonts = {
  spectral400: b64(`${F}/spectral/files/spectral-latin-400-normal.woff2`),
  spectral600: b64(`${F}/spectral/files/spectral-latin-600-normal.woff2`),
  mono500: b64(`${F}/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2`),
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const FRAME_CSS = `
@font-face{font-family:'Spectral';font-weight:400;src:url(data:font/woff2;base64,${fonts.spectral400}) format('woff2')}
@font-face{font-family:'Spectral';font-weight:600;src:url(data:font/woff2;base64,${fonts.spectral600}) format('woff2')}
@font-face{font-family:'Plex Mono';font-weight:500;src:url(data:font/woff2;base64,${fonts.mono500}) format('woff2')}
*{margin:0;box-sizing:border-box}
html,body{width:1280px;height:720px;overflow:hidden}
body{background:#171410;color:#efe8da;font:400 24px/1.5 'Spectral',Georgia,serif;display:flex;align-items:center;padding:0 56px;gap:52px}
.eyebrow{font:500 15px/1 'Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#cf9257;margin-bottom:16px}
h1{font:600 40px/1.15 'Spectral',serif;margin-bottom:18px}
h2{font:600 34px/1.2 'Spectral',serif;margin-bottom:14px}
.caption{font-size:24px;color:#efe8da;max-width:22ch}
.movetick{font:500 20px/1.6 'Plex Mono',monospace;color:#a2988a;margin-top:20px;min-height:32px}
.movetick b{color:#cf9257;font-weight:500}
.bullets{list-style:none;font-size:23px;line-height:1.5;display:grid;gap:13px;max-width:44ch}
.bullets li{opacity:.25}
.bullets li.on{opacity:1}
.bullets li::before{content:'\\2014  ';color:#cf9257}
.boardcol{flex:0 0 560px}
.textcol{flex:1}
.board{width:560px;height:auto;display:block;border-radius:6px}
.sq-l{fill:#cdbd97}.sq-d{fill:#8c6f4e}
.sq-last{fill:rgba(201,162,39,.45)}
.coord{font:600 13.5px 'Plex Mono',monospace;fill:#b8ad9c;text-anchor:middle}
.mark-bad{fill:none;stroke:#e05a44;stroke-width:2.5}
.mark-good{fill:none;stroke:#3fa06a;stroke-width:2.5}
.arrow-best line{stroke:#3fa06a;stroke-width:7;opacity:.9;stroke-linecap:round}
.arrow-best polygon{fill:#3fa06a;opacity:.9}
.arrow-bad line{stroke:#e05a44;stroke-width:7;opacity:.85;stroke-linecap:round}
.arrow-bad polygon{fill:#e05a44;opacity:.85}
.arrow-threat line{stroke:#efe8da;stroke-width:4.5;opacity:.6;stroke-dasharray:7 5}
.arrow-threat polygon{fill:#efe8da;opacity:.6}
.arrow-play line{stroke:#cf9257;stroke-width:7;opacity:.95;stroke-linecap:round}
.arrow-play polygon{fill:#cf9257;opacity:.95}
.brand{position:fixed;bottom:22px;right:56px;font:500 14px/1 'Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#5d5346}
`;

function frameHtml(scene, beat, state) {
  const brand = `<div class="brand">chess coach · deep review · ${DATE}</div>`;
  if (!scene.board) {
    const bullets = (scene.bullets || []).map((t, i) =>
      `<li class="${i <= (beat.reveal ?? -1) ? 'on' : ''}">${t}</li>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>${FRAME_CSS}</style></head><body>
      <div class="textcol" style="max-width:1020px">
        <div class="eyebrow">${esc(scene.eyebrow || 'Morning deep review')}</div>
        <h1>${esc(scene.title || '')}</h1>
        ${bullets ? `<ul class="bullets">${bullets}</ul>` : `<p class="caption" style="max-width:34ch;font-size:28px">${esc(beat.caption || '')}</p>`}
      </div>${brand}</body></html>`;
  }
  const svg = boardSvg(state.fen, {
    flip: !!scene.board.flip,
    lastMove: state.lastMove ? [state.lastMove.from, state.lastMove.to] : null,
    arrows: beat.arrows || state.autoArrows || [],
    marks: beat.marks || [],
    caption: beat.caption || scene.title,
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FRAME_CSS}</style></head><body>
    ${pieceDefs()}
    <div class="boardcol">${svg}</div>
    <div class="textcol">
      <div class="eyebrow">${esc(scene.eyebrow || 'Pattern')}</div>
      <h2>${esc(scene.title || '')}</h2>
      <p class="caption">${esc(beat.caption || '')}</p>
      <div class="movetick">${state.tick}</div>
    </div>${brand}</body></html>`;
}

function screenshot(html, outPng) {
  const tmp = path.join(WORK, 'frame.html');
  fs.writeFileSync(tmp, html);
  execFileSync(CHROME, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--screenshot=${outPng}`, '--window-size=1280,720', `file://${tmp}`],
  { stdio: 'ignore' });
}

// ---- assemble ----
(async () => {
  const sceneFiles = [];
  for (let si = 0; si < script.scenes.length; si++) {
    const scene = script.scenes[si];
    const wav = path.join(WORK, `s${si}.wav`);
    tts(scene.narration, wav);
    const audioDur = wavDuration(wav);
    const beats = scene.beats && scene.beats.length ? scene.beats : [{}];
    const beatDur = (audioDur + 0.8) / beats.length;

    // board state evolves across beats
    let game = null, lastMove = null;
    if (scene.board) game = new Chess(normalizeFen(scene.board.fen, scene.board.flip));
    const sans = [];
    const frames = [];
    for (let bi = 0; bi < beats.length; bi++) {
      const beat = beats[bi];
      let autoArrows = null;
      if (game && beat.moves) {
        for (const san of beat.moves) {
          const mv = game.move(String(san).replace(/[?!]+$/, ''));
          sans.push(mv.san);
          lastMove = { from: mv.from, to: mv.to };
          autoArrows = [{ from: mv.from, to: mv.to, kind: 'play' }];
        }
      }
      const tick = sans.length
        ? sans.map((s, i) => (i === sans.length - 1 ? `<b>${esc(s)}</b>` : esc(s))).join(' · ')
        : '';
      const png = path.join(WORK, `s${si}b${bi}.png`);
      screenshot(frameHtml(scene, beat, { fen: game ? game.fen() : null, lastMove, autoArrows, tick }), png);
      frames.push({ png, dur: beatDur });
      console.error(`scene ${si + 1}/${script.scenes.length} beat ${bi + 1}/${beats.length}`);
    }

    const list = path.join(WORK, `s${si}.txt`);
    fs.writeFileSync(list,
      frames.map(f => `file '${f.png}'\nduration ${f.dur.toFixed(3)}`).join('\n') +
      `\nfile '${frames[frames.length - 1].png}'\n`);
    const sceneMp4 = path.join(WORK, `s${si}.mp4`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav,
      '-af', 'apad=pad_dur=0.8', '-t', String(audioDur + 0.8),
      '-c:v', 'libx264', '-r', '30', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '22050', sceneMp4]);
    sceneFiles.push(sceneMp4);
  }

  const concatList = path.join(WORK, 'all.txt');
  fs.writeFileSync(concatList, sceneFiles.map(f => `file '${f}'`).join('\n') + '\n');
  const joined = path.join(WORK, 'joined.mp4');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', joined]);

  // gentle room-tone bed under the narration, then faststart for web playback
  const outDir = path.join(ROOT, 'public', 'coach', 'review');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${DATE}.mp4`);
  const totalDur = wavDuration(joined);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', joined,
    '-f', 'lavfi', '-t', String(totalDur), '-i', 'anoisesrc=colour=brown:seed=42:amplitude=0.4:sample_rate=22050',
    '-filter_complex', '[1:a]lowpass=f=240,volume=0.05[amb];[0:a][amb]amix=inputs=2:duration=first:normalize=0[a]',
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart', out]);
  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
  console.log(`written ${out} (${size}MB, ${totalDur.toFixed(0)}s, ${script.scenes.length} scenes)`);
  console.log('Now rerun build.cjs so the page embeds the video.');
})().catch(e => { console.error(e); process.exit(1); });
