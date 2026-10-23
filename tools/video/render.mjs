/**
 * Rendu de la vidéo image par image (Playwright + Chromium), sur le serveur de dev Vite :
 *   npx vite --port 5190 &   puis   node tools/video/render.mjs <dossier> [fps] [début] [fin] [pas]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [out = 'frames', fpsArg = '30', fromArg = '0', toArg = '60', stepArg = ''] = process.argv.slice(2);
const fps = Number(fpsArg), from = Number(fromArg), to = Number(toArg), step = stepArg ? Number(stepArg) : 1 / fps;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VERT = !!process.env.VERT;
const p = await b.newPage({ viewport: VERT ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${process.env.PORT || 5190}/tools/video/index.html${VERT ? '?v' : ''}`);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await p.waitForTimeout(1500);
const t0 = Date.now();
let i = Math.round(from * fps);
for (let t = from; t < to - 1e-6; t += step, i++) {
  await p.evaluate((t) => window.__render(t), t);
  const name = stepArg ? `t${t.toFixed(1)}` : String(i).padStart(5, '0');
  await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 92 });
  if (i % 60 === 0) console.log(`t=${t.toFixed(2)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await b.close();
