const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const base = 'file://' + path.resolve(process.argv[2] || '.') + '/app.html';
const out = process.argv[3] || './shots';
fs.mkdirSync(out, { recursive: true });
const routes = [
  ['welcome', '#/welcome'], ['signup', '#/signup'], ['login', '#/login'], ['recover', '#/recover'],
  ['discover', '#/'], ['profile', '#/profile/999896'], ['openchat', '#/profile/999906?open=chat'], ['invoice', '#/checkout/pack:p3?step=2&for=999906'], ['likes', '#/likes'], ['chats', '#/chats'], ['chat', '#/chat/c1'], ['chat-limit', '#/chat/c3'],
  ['notifications', '#/notifications'], ['search', '#/search?q=Львов'], ['me', '#/me'], ['me-edit', '#/me/edit'],
  ['store', '#/store'], ['checkout', '#/checkout/pack:p3'], ['purchases', '#/purchases'],
  ['settings', '#/settings'], ['settings-notifications', '#/settings/notifications'], ['settings-appearance', '#/settings/appearance'],
  ['support', '#/support'], ['support-new', '#/support/new'], ['support-ticket', '#/support/T-1042'], ['legal', '#/legal'], ['states', '#/states'],
];
const only = process.argv[4] ? process.argv[4].split(',') : null;
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [dev, vp] of [['m', { width: 390, height: 844, dsf: 2, mobile: true }], ['d', { width: 1440, height: 900, dsf: 1, mobile: false }]]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'ru-RU' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(dev + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(dev + ' console: ' + m.text().slice(0, 200)); });
    for (const [name, hash] of routes) {
      if (only && !only.includes(name)) continue;
      await page.goto('about:blank');
      await page.goto(base + hash, { waitUntil: 'load' });
      await page.waitForTimeout(name === 'discover' || name === 'profile' || name === 'welcome' ? 2500 : 1200);
      if (name === 'checkout' && dev) { /* step 2 preview for desktop only */ }
      await page.screenshot({ path: `${out}/${name}-${dev}.png`, fullPage: false });
      const h = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (h.sw > h.cw + 1) errors.push(dev + ' overflow on ' + name + ': ' + h.sw + '>' + h.cw);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
})();
