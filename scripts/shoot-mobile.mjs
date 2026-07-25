/* Mobile screenshots on WebKit -- Safari's engine, an iPhone viewport, real touch scrolling.
   Replaces the iframe harness, which could not scroll (Lenis overrode scrollTo), could not render
   WebGL, and reported a different layout width than the page actually used.
     node scripts/shoot-mobile.mjs 0 1600 2400 ...           */
import {webkit, devices} from 'playwright';

const base = process.env.BASE || 'http://localhost:8940/redesign/';
const shots = process.argv.slice(2).map(Number);
const out = process.env.OUT || '/tmp/mobile';
const fs = await import('node:fs');
fs.mkdirSync(out, {recursive: true});

const browser = await webkit.launch();
const ctx = await browser.newContext({...devices['iPhone 13'], reducedMotion: 'no-preference'});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(base, {waitUntil: 'load'});
await page.waitForTimeout(5200);            // let the preloader finish and the hero settle

for (const y of shots) {
  /* stepped scrollTo: mobile WebKit has no wheel, and stepping rather than jumping gives sticky,
     ScrollTrigger and the IntersectionObserver reveals the same sequence of positions a finger
     produces. Now that Lenis is gone, scrollTo is authoritative and the position stays put. */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  let cur = 0;
  while (cur < y) {
    cur = Math.min(cur + 300, y);
    await page.evaluate(v => window.scrollTo(0, v), cur);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1500);
  const at = await page.evaluate(() => Math.round(window.scrollY));
  await page.screenshot({path: `${out}/m-${y}.png`});
  console.log(`asked ${y}  landed ${at}  -> ${out}/m-${y}.png`);
}

const info = await page.evaluate(() => ({
  vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio,
  hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  canvas: !!document.querySelector('#hero3d canvas'),
  docH: document.documentElement.scrollHeight
}));
console.log('viewport', JSON.stringify(info));
console.log(errors.length ? 'JS ERRORS: ' + errors.slice(0, 5).join(' | ') : 'no JS errors');
await browser.close();
