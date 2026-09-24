const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const accounts = [
  ['partner', 'other'], ['shopee', 'jenang-gemi-shopee'], ['shopee', 'zero-shopee'],
  ['tiktok', 'jenang-gemi-tiktok'], ['tiktok', 'zero-tiktok'], ['whatsapp', 'other']
].map(([platform, account]) => ({ platform, account }));
let requests = 0;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    if (url.searchParams.get('action') === 'daily_summary') {
      requests++;
      const month = url.searchParams.get('start_date').slice(0, 7);
      return res.end(JSON.stringify({ ok: true, month, accounts, days: Array.from({ length: 28 }, (_, i) => ({
        date: `${month}-${String(i + 1).padStart(2, '0')}`,
        accounts: accounts.map((account, j) => ({ ...account, qty: j ? 20 + i + j : 0, revenue: j ? (20 + i + j) * 17500 : 0, orders: 10 + i }))
      })) }));
    }
    return res.end(JSON.stringify({ ok: true, accounts: [], columns: [], items: [], settings: {} }));
  }
  if (url.pathname === '/dashboard/') {
    // Authenticate only this local PHP process; API calls use fixture data above.
    const code = 'session_start(); $_SESSION["jg_admin_authenticated"] = true; $_SERVER["REQUEST_METHOD"] = "GET"; $_SERVER["REQUEST_URI"] = $argv[1]; $_GET = json_decode($argv[2], true); include $argv[3];';
    const html = execFileSync(process.env.PHP_BINARY || 'php', ['-r', code, req.url, JSON.stringify(Object.fromEntries(url.searchParams)), path.join(root, 'dashboard/index.php')]);
    res.setHeader('Content-Type', 'text/html');
    return res.end(html);
  }
  const file = path.join(root, url.pathname);
  if (file.startsWith(`${root}/`) && /\.(css|js|json|svg)$/.test(file) && fs.existsSync(file)) {
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/json');
    return res.end(fs.readFileSync(file));
  }
  res.statusCode = 404;
  res.end();
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Los_Angeles' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.EventSource = class extends EventTarget {
        constructor() { super(); window.dailyLive = this; }
        close() {}
      };
    });
    await page.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await page.clock.setFixedTime(new Date('2026-09-23T18:00:00Z')); // Sep 24 in Jakarta, Sep 23 in the browser.
    await page.goto(`${base}/dashboard/?view=daily`);
    const today = page.locator('[data-daily-sheet-body] .is-today');
    const scroll = page.locator('[data-daily-sheet-scroll]');
    const settled = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const assertTodayVisible = async (date) => {
      await page.waitForFunction((value) => document.querySelector('.daily-day-cell[aria-current="date"]')?.textContent.includes(value), date);
      await today.waitFor({ state: 'visible' });
      await settled();
      assert.equal(await today.count(), 1);
      const bounds = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
        return { row: rect('[data-daily-sheet-body] .is-today').toJSON(), head: rect('[data-daily-sheet-head] th').toJSON(), foot: rect('[data-daily-sheet-foot] th').toJSON() };
      });
      assert(bounds.row.top >= bounds.head.bottom - 1, 'Today clears the sticky header');
      assert(bounds.row.bottom <= bounds.foot.top + 1, 'Today clears the sticky totals');
    };
    await assertTodayVisible('2026-09-24');
    assert.match(await today.innerText(), /Today/);
    assert(await scroll.evaluate((el) => el.scrollTop > 0));
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'Automatic table positioning does not move the page');

    // A render/refresh must preserve both scroll axes once the user starts browsing.
    await scroll.evaluate((el) => { el.scrollTop = 250; el.scrollLeft = 240; });
    const position = () => scroll.evaluate((el) => [el.scrollTop, el.scrollLeft]);
    const before = await position();
    await page.locator('[data-daily-metric="qty"]').click();
    await settled();
    assert.deepEqual(await position(), before, 'Changing chart metric preserves the table position');
    const refreshed = page.waitForResponse((response) => response.url().includes('action=daily_summary'));
    await page.evaluate(() => window.dailyLive.dispatchEvent(new MessageEvent('change', { data: JSON.stringify({ sequence: 1, reason: 'sales' }) })));
    await refreshed;
    await page.waitForFunction(() => !document.querySelector('[data-daily-status]').textContent.startsWith('Refreshing'));
    await settled();
    // Theme/resize also redraw the real controller.
    await page.setViewportSize({ width: 1280, height: 1000 });
    await settled();
    assert.deepEqual(await position(), before, 'Refresh and resize preserve table position');

    await page.locator('[data-view-switch="orders"]').first().evaluate((el) => el.click());
    await page.locator('[data-view-switch="daily"]').first().evaluate((el) => el.click());
    await assertTodayVisible('2026-09-24');
    assert((await position())[0] > before[0], 'Reopening Daily returns to today');
    assert.equal((await position())[1], before[1], 'Finding today keeps the horizontal position');

    // Historical/future months open at the top; returning to this month finds today.
    for (const month of ['2026-08', '2026-10', '2026-09']) {
      await page.locator('[data-daily-month]').fill(month);
      await page.locator('[data-daily-month]').dispatchEvent('change');
      await page.waitForFunction((value) => document.querySelector('[data-daily-sheet-body] tr small')?.textContent.startsWith(value), month);
      await settled();
      if (month === '2026-09') await assertTodayVisible('2026-09-24');
      else { assert.equal(await today.count(), 0); assert.equal((await position())[0], 0); }
    }

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['dark', 'light']) {
        await page.evaluate((value) => { localStorage.setItem('jg-admin-theme', value); }, theme);
        await page.reload();
        await assertTodayVisible('2026-09-24');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page fits the viewport');
        const styles = await today.evaluate((row) => [...row.children].map((cell) => ({ bg: getComputedStyle(cell).backgroundColor, text: getComputedStyle(cell.querySelector('strong,span')).color })));
        assert(styles.every((style) => style.bg === styles[0].bg && style.text === styles[0].text), 'Highlight covers the sticky date, zeros, quantities, revenue and totals');
        assert.notEqual(styles[0].bg, await page.locator('[data-daily-sheet-body] tr:not(.is-today) td').first().evaluate((el) => getComputedStyle(el).backgroundColor));
        await today.locator('th').hover();
        assert.equal(await today.locator('th').evaluate((el) => getComputedStyle(el).backgroundColor), styles[0].bg, 'Hover keeps the highlight');
        if (process.env.DAILY_REVIEW_DIR) {
          fs.mkdirSync(process.env.DAILY_REVIEW_DIR, { recursive: true });
          await scroll.screenshot({ path: path.join(process.env.DAILY_REVIEW_DIR, `today-${theme}-${width}.png`) });
        }
      }
    }

    for (const date of ['2026-09-01', '2026-09-30']) {
      await page.clock.setFixedTime(new Date(`${date}T05:00:00Z`));
      await page.reload();
      await assertTodayVisible(date);
    }
    assert.deepEqual(errors, []);
    console.log(`Daily today: timezone, scrolling, month changes, live refresh, reopening, first/last day, dark/light and mobile passed (${requests} fixture requests).`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
