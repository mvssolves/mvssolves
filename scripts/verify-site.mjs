import {webkit, devices} from 'playwright';
const routes = ['/', '/contact/', '/faq/', '/join-the-team/', '/privacy-policy/',
  '/terms-of-service/', '/acceptable-use-policy/', '/data-processing-agreement/',
  '/security/', '/accessibility-statement/'];
const b = await webkit.launch();
const ctx = await b.newContext({...devices['iPhone 13'], reducedMotion:'no-preference'});
let bad = 0;
for (const r of routes) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0,70)));
  const res = await page.goto('http://localhost:8940' + r, {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(r === '/' ? 4200 : 1200);
  const m = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href'));
    return {over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            title: document.title.slice(0,32), links: [...new Set(links)]};
  });
  const stale = m.links.filter(l => l.startsWith('/redesign'));
  const ok = res.status() === 200 && m.over === 0 && !errs.length && !stale.length;
  if (!ok) bad++;
  console.log(`${ok?'ok  ':'FAIL'} ${r.padEnd(30)} ${res.status()} over:${m.over} ${errs[0]||''}${stale.length?' STALE:'+stale[0]:''}`);
  await page.close();
}
// every internal link on the homepage must resolve
const page = await ctx.newPage();
await page.goto('http://localhost:8940/', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(3000);
const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href')))]);
for (const l of links) {
  const r = await page.request.get('http://localhost:8940' + l);
  if (r.status() !== 200) { console.log(`FAIL link ${l} -> ${r.status()}`); bad++; }
}
console.log(`\n${links.length} internal links checked — ${bad ? bad+' FAILURES' : 'all good'}`);
await b.close();
process.exit(bad ? 1 : 0);
