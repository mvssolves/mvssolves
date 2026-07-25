import {webkit, devices} from 'playwright';
const pages = ['faq','privacy-policy','terms-of-service','contact','join-the-team','security'];
const b = await webkit.launch();
const ctx = await b.newContext({...devices['iPhone 13']});
for (const p of pages) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0,80)));
  const r = await page.goto(`http://localhost:8940/redesign/${p}/`, {waitUntil:'load'});
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    title: document.title.slice(0,40),
    theme: document.querySelector('meta[name=theme-color]')?.content || 'NONE',
    h1: document.querySelector('h1')?.textContent.trim().slice(0,34) || 'NO H1'
  }));
  console.log(`${p.padEnd(26)} ${r.status()}  hOver:${m.over}  theme:${m.theme}  h1:"${m.h1}"  ${errs.length?'ERR '+errs[0]:'ok'}`);
  await page.close();
}
await b.close();
