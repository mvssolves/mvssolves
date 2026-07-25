import {webkit, devices} from 'playwright';
// catch the loader mid-progress on both a phone and a desktop viewport
for (const [name, opts] of [['mobile', {...devices['iPhone 13']}], ['desktop', {viewport:{width:1440,height:900}}]]) {
  const b = await webkit.launch();
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  await page.goto('http://localhost:8940/redesign/', {waitUntil:'commit'});
  await page.waitForTimeout(900);
  await page.screenshot({path:`/tmp/mobile/loader-${name}.png`});
  const st = await page.evaluate(() => {
    const w = document.getElementById('plWord');
    if (!w) return 'gone';
    const cs = getComputedStyle(w);
    return {rx: cs.getPropertyValue('--rx').trim(), sc: cs.getPropertyValue('--sc').trim(),
            pct: document.getElementById('plNum')?.textContent};
  });
  console.log(name, JSON.stringify(st));
  await b.close();
}
