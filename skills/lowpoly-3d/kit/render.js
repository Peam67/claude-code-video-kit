// node render.js            -> out/video_noaudio.mp4 (whole timeline, window.DURATION seconds)
// node render.js 1,3.5      -> out/still_<t>.png for quick review
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const FPS = 30, ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

// Chrome if installed, otherwise Edge (always on Windows); BROWSER_PATH overrides
const BROWSERS = [process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const exe = BROWSERS.find(p => p && fs.existsSync(p));
if (!exe) { console.error('No Chrome or Edge found. Set BROWSER_PATH to a Chromium browser.'); process.exit(1); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await puppeteer.launch({
    executablePath: exe, headless: true,
    args: ['--force-color-profile=srgb', '--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.ready, { timeout: 60000 }); await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DURATION);
  fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify({ duration: dur, cues: await page.evaluate(() => window.CUES || []) }));

  const stills = process.argv[2];
  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate(t => window.seek(t), t);
      await page.screenshot({ path: path.join(OUT, `still_${t.toFixed(2)}.png`) });
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
      path.join(OUT, `video_noaudio.mp4`)], { stdio: ['pipe', 'ignore', 'inherit'] });
    const N = Math.round(dur * FPS), F0 = Math.round((+process.env.FROM || 0) * FPS);
    for (let f = F0; f < N; f++) {
      await page.evaluate(t => window.seek(t), f / FPS);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${N}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close(); server.close();
})();
