import {webkit, devices} from 'playwright';
for (const [name, opts] of [['mobile', {...devices['iPhone 13']}], ['desktop', {viewport:{width:1440,height:900}}]]) {
  const b = await webkit.launch();
  const ctx = await b.newContext({...opts, reducedMotion:'no-preference'});
  const page = await ctx.newPage();
  // domcontentloaded, not commit: commit returns before the document is parsed and every probe
  // then reads a document with no body at all
  await page.goto('http://localhost:8940/redesign/', {waitUntil:'domcontentloaded'});
  for (const ms of [900, 1800, 2800, 3600]) {
    await page.waitForTimeout(ms === 900 ? 900 : 900);
    const st = await page.evaluate(() => {
      const c = document.getElementById('plCanvas');
      return c ? {pct: document.getElementById('plNum')?.textContent} : 'finished';
    });
    if (st === 'finished') { console.log(`${name} ${ms}ms  loader gone`); break; }
    await page.screenshot({path:`/tmp/mobile/water-${name}-${ms}.png`});
    console.log(`${name} ${ms}ms  ${JSON.stringify(st)}`);
  }
  await b.close();
}
