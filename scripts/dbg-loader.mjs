import {webkit} from 'playwright';
const b = await webkit.launch();
const ctx = await b.newContext({viewport:{width:1440,height:900}, reducedMotion:'no-preference'});
const page = await ctx.newPage();
page.on('pageerror', e=>console.log('PAGEERROR', String(e).slice(0,160)));
// watch removal
await page.addInitScript(() => {
  window.__log = [];
  const mo = new MutationObserver(ms => ms.forEach(m => m.removedNodes.forEach(n => {
    if (n.id === 'preloader') window.__log.push('removed@' + Math.round(performance.now()));
  })));
  document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, {childList:true}));
});
await page.goto('http://localhost:8940/redesign/', {waitUntil:'commit'});
for (const t of [60,150,400,900]) {
  await page.waitForTimeout(t===60?60:t/2);
  const st = await page.evaluate(()=>({pre:!!document.getElementById('preloader'),
    log:window.__log, reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,
    cls:document.body.className}));
  console.log(t+'ms', JSON.stringify(st));
  if(!st.pre) break;
}
await b.close();
