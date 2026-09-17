const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const output = process.env.SHIPMENT_SCREENSHOTS || '/tmp/shipment-board-review';
fs.mkdirSync(output, { recursive: true });
const html = execFileSync(process.env.PHP_BIN || 'php', [path.join(__dirname, 'fixtures/shipment-dashboard.php')], { encoding: 'utf8' });
assert(html.includes('data-shipment-search'));
const at = (h, d = '17') => `2026-09-${d}T${String(h).padStart(2, '0')}:00:00+07:00`;
const order = (id, x = {}) => ({ platform: 'shopee', account_key: 'zero-shopee', order_id: id, package_id: `PKG-${id}`, marketplace_status: 'PROCESSED', workflow_status: 'LABEL_READY', shipping_provider_name: 'J&T Express', handover_method: 'PICKUP', pickup_start_at: at(11), pickup_end_at: at(14), ship_by_at: at(23, '19'), label_ready: true, is_processed: false, ...x });
const days = Object.fromEntries(Array.from({length: 7}, (_, i) => [String(i+1), 'EARLIEST_WEEKDAY']));
const policy = { platforms: Object.fromEntries(['shopee', 'tiktok'].map(platform => [platform, { regular: {
  pickup_days: {...days}, windows: Object.fromEntries(Object.keys(days).map(key => [key, {enabled:true,start:'08:00',end:'16:00'}])),
  methods: Object.fromEntries(Object.keys(days).map(key => [key, 'PICKUP'])),
  carriers: Object.fromEntries(['pos_indonesia','jnt_express','jnt_cargo'].map(key => [key, {methods: Object.fromEntries(Object.keys(days).map(day => [day, 'PICKUP']))}]))
} }])) };
const initial = [
 order('260917-READY', { is_processed: true }), order('260917-PREPARE'), order('260917-COLLECTED', { pickup_confirmed: true, pickup_confirmed_at: at(9) }),
 order('260917-MISSED', { account_key: 'jenang-gemi-shopee', shipping_provider_name: 'SPX Express', pickup_start_at: at(7), pickup_end_at: at(9), ship_by_at: at(17) }),
 order('260917-OPEN', { account_key: 'jenang-gemi-shopee', shipping_provider_name: 'J&T Cargo', pickup_start_at: at(9), pickup_end_at: at(12), ship_by_at: at(20), label_ready: false }),
 order('260917-LATER', { shipping_provider_name: 'POS Indonesia', pickup_start_at: at(15), pickup_end_at: at(18), ship_by_at: at(22) }),
 order('260915-OVERDUE', { pickup_start_at: at(9, '15'), pickup_end_at: at(11, '15'), ship_by_at: at(18, '16') }),
 order('260917-UNBOOKED', { pickup_start_at: null, pickup_end_at: null, shipment_arranged: false, ship_by_at: at(14) }),
 order('260917-DROPOFF', { handover_method: 'DROP_OFF', pickup_start_at: null, pickup_end_at: null, ship_by_at: at(18) }),
 order('260918-TOMORROW', { pickup_start_at: at(10, '18'), pickup_end_at: at(12, '18') }),
 order('260917-CANCELLED', { marketplace_status: 'CANCELLED' }),
];
const server = http.createServer((req, res) => {
 const url = new URL(req.url, 'http://localhost');
 if (url.pathname === '/dashboard/') { res.setHeader('Content-Type', 'text/html'); return res.end(html); }
 const file = path.join(root, url.pathname);
 if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; return res.end(); }
 res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'application/octet-stream');
 res.end(fs.readFileSync(file));
});
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const base = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
 try {
 const context = await browser.newContext({ viewport: { width: 1440, height: 1120 }, timezoneId: 'America/Los_Angeles' });
 const page = await context.newPage();
 await page.clock.install({ time: new Date('2026-09-17T03:00:00Z') });
 let orders = [...initial], failure = false, detailFailure = true, failSecond = false, legacy = false, branch = false;
 let mapReads = 0, detailReads = 0, posts = 0;
 const errors = [], cursors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
   document.body.classList.remove('is-loading');
   document.querySelector('[data-admin-loader]')?.remove();
   document.querySelectorAll('[data-view-panel]').forEach(el => el.classList.toggle('is-active', el.dataset.viewPanel === 'shipment-arrangement'));
 }));
 await page.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.origin !== base) return route.abort();
   if (url.pathname.endsWith('/shipment-arrangement/')) {
     const action = url.searchParams.get('action');
     if (route.request().method() === 'POST') { posts++; return route.fulfill({ json: { ok: true, orders: [] } }); }
     if (action === 'order-detail') {
       detailReads++;
       if (detailFailure) return route.fulfill({ status: 502, json: { ok: false, error: 'Temporary detail failure' } });
       const found = orders.find(o => o.order_id === url.searchParams.get('order_id')) || orders[0];
       return route.fulfill({ json: { ok: true, order: { ...found, shipping_provider: found.shipping_provider_name }, items: [], timeline: [], financials: { available: false } } });
     }
     if (action === 'pickup-options') return route.fulfill({ json: { ok: true, options: [{ label: 'Friday 09:00–12:00', address_id: 'fixture', pickup_time_id: 'fixture' }] } });
     mapReads++;
     const after = Number(url.searchParams.get('after_id') || 0); cursors.push(after);
     if (failure || (failSecond && after)) return route.fulfill({ status: 502, json: { ok: false, error: 'Temporary fixture outage' } });
     const next = Math.min(after + 4, orders.length);
     return route.fulfill({ json: { ok: true, generated_at: at(10), hard_set: { enabled: true }, access: { branch }, policy: { revision: 1, policy }, orders: legacy ? orders : orders.slice(after, next), ...(legacy ? {} : { pagination: { has_more: next < orders.length, next_after_id: next < orders.length ? next : null, through_id: orders.length } }) } });
   }
   // Isolate the shipment controller; the full production HTML/CSS/nav is rendered.
   if (/\/(admin|admin-chrome|store-ops)\.js$/.test(url.pathname)) return route.fulfill({ body: '', contentType: 'application/javascript' });
   if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, accounts: [], data: [] } });
   return route.continue();
 });
 const waitLoaded = () => page.waitForFunction(() => document.querySelector('[data-arrangement-map]').getAttribute('aria-busy') === 'false' && document.querySelector('[data-arrangement-metric="pending"]').textContent !== '—');
 const refresh = async () => { await page.locator('[data-arrangement-refresh]').click(); await page.waitForFunction(() => !document.querySelector('[data-arrangement-refresh]').disabled); };
 await page.goto(base + '/dashboard/?view=shipment-arrangement'); await waitLoaded();
 assert.deepEqual(cursors.slice(0, 3), [0, 4, 8], 'The browser must retrieve every page before publishing counts.');
 assert.equal(await page.locator('[data-arrangement-metric="pending"]').textContent(), '9');
 assert.equal(await page.locator('.shipment-lane').count(), 4);
 assert.match(await page.locator('.shipment-lane').filter({ hasText: 'J&T Express' }).innerText(), /1\/3 picked up/);
 assert.match(await page.locator('.shipment-lane').filter({ hasText: 'J&T Express' }).innerText(), /2 awaiting · 1\/2 prepared/);
 assert(await page.getByText('260915-OVERDUE', { exact: true }).isVisible());
 assert.equal(await page.getByText('260917-CANCELLED', { exact: true }).count(), 0);
 assert.equal(await page.locator('.shipment-metrics .is-red strong').evaluate(el => getComputedStyle(el).color), 'rgb(251, 113, 133)', 'Missed-handovers metric must keep its warning color under the shared theme.');
 await page.clock.runFor(500);

 await page.screenshot({ path: path.join(output, 'desktop-dark.png'), fullPage: true });
 await page.evaluate(() => { document.documentElement.dataset.adminTheme = 'light'; });
 await page.screenshot({ path: path.join(output, 'desktop-light.png'), fullPage: true });
 await page.evaluate(() => { document.documentElement.dataset.adminTheme = 'dark'; });
 // Details remain useful while the detail endpoint is unavailable.
 const firstLane = page.locator('.shipment-lane').filter({ hasText: 'J&T Express' });
 await firstLane.click();
 await page.locator('[data-retry-pickup-order]').waitFor();
 assert.match(await page.locator('.shipment-inspector-facts').innerText(), /Preparation/);
 assert.equal(await page.locator('[data-pickup-event-order]').count(), 3);
 detailFailure = false; await page.locator('[data-retry-pickup-order]').click();
 await page.locator('.admin-arrangement-order-breakdown').waitFor();
 await page.screenshot({ path: path.join(output, 'inspector-dark.png'), fullPage: true });
 await page.keyboard.press('Escape');
 assert(await firstLane.evaluate(el => el === document.activeElement), 'Closing returns keyboard focus to the source row.');
 await page.locator('[data-shipment-filter="attention"]').click();
 assert.equal(await page.locator('.shipment-lane').count(), 1);
 assert(await page.getByText('260915-OVERDUE', { exact: true }).isVisible());
 await page.locator('[data-shipment-filter="all"]').click();
 await page.locator('[data-shipment-search]').fill('TOMORROW');
 assert.equal(await page.locator('.shipment-order').count(), 1);
 await page.locator('[data-shipment-search]').fill('');
 await page.locator('[data-shipment-day="1"]').click();
 assert.equal(await page.locator('.shipment-lane').count(), 1);
 assert.match(await page.locator('[data-arrangement-window-label]').textContent(), /18 Sept/);
 await page.locator('[data-shipment-today]').click();
 await page.locator('[data-shipment-account]').selectOption('shopee|jenang-gemi-shopee');
 assert.equal(await page.locator('.shipment-lane').count(), 2);
 await page.locator('[data-shipment-account]').selectOption('');
 // Failed refreshes retain the complete last snapshot, including second-page failure.
 failure = true; await refresh();
 assert.match(await page.locator('[data-shipment-notice]').innerText(), /last successful snapshot/);
 assert.equal(await page.locator('.shipment-lane').count(), 4);
 failure = false; failSecond = true; await refresh();
 assert.equal(await page.locator('[data-arrangement-metric="pending"]').textContent(), '9');
 failSecond = false; await refresh(); assert(await page.locator('[data-shipment-notice]').isHidden());
 // No collection action or arrangement is ever triggered by reading or filtering.
 assert.equal(posts, 0);
 // Unknown/old windows are readable on mobile without widening the document.
 await page.setViewportSize({ width: 390, height: 844 });
 assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'The document must fit mobile.');
 assert(await page.locator('.shipment-lane-result').evaluateAll(nodes => nodes.every(el => el.getBoundingClientRect().right <= innerWidth)), 'Mobile must display status without horizontal scrolling.');
 await page.screenshot({ path: path.join(output, 'mobile-dark.png'), fullPage: true });
 await page.evaluate(() => { document.documentElement.dataset.adminTheme = 'light'; });
 await page.screenshot({ path: path.join(output, 'mobile-light.png'), fullPage: true });
 await page.evaluate(() => { document.documentElement.dataset.adminTheme = 'dark'; });
 await page.setViewportSize({ width: 1440, height: 1120 });
 orders = [order('only-collected', { pickup_confirmed: true, pickup_confirmed_at: at(9), pickup_start_at: null, pickup_end_at: null })];
 await refresh(); assert.equal(await page.locator('[data-arrangement-metric="pending"]').textContent(), '0');
 assert.match(await page.locator('[data-arrangement-map]').innerText(), /Pickups on this day are complete/);
 await page.screenshot({ path: path.join(output, 'complete.png'), fullPage: true });
 orders = []; await refresh(); assert.match(await page.locator('[data-arrangement-map]').innerText(), /No shipments to show/);
 failure = true; await page.reload();
 await page.locator('.shipment-empty').waitFor();
 assert.equal(await page.locator('[data-arrangement-metric="pending"]').textContent(), '—', 'A failed first load is unknown, never zero.');
 failure = false; orders = initial; await refresh();
 // While rules are open, automatic polling must preserve unsaved inputs.
 branch = true; await refresh(); await page.locator('[data-arrangement-tab="rules"]').click();
 const rule = page.locator('[name="shopee-pickup-1"]'); await rule.selectOption('5');
 await refresh(); assert.equal(await rule.inputValue(), '5');
 await page.locator('[data-arrangement-tab="schedule"]').click();
 // Larger lists: search and Show more retain every shipment.
 orders = Array.from({ length: 25 }, (_, i) => order(`many-${i}`, { pickup_start_at: null, pickup_end_at: null }));
 await refresh(); assert.equal(await page.locator('.shipment-order').count(), 8);
 await page.locator('[data-shipment-more]').click(); assert.equal(await page.locator('.shipment-order').count(), 25);
 await page.locator('[data-shipment-search]').fill('many-24'); assert.equal(await page.locator('.shipment-order').count(), 1);
 await page.locator('[data-shipment-search]').fill('');
 // A legacy 500-row response must never imply that all shipments were loaded.
 legacy = true; orders = Array.from({length: 500}, (_, i) => order(`legacy-${i}`, {pickup_start_at:null,pickup_end_at:null}));
 await refresh(); assert.match(await page.locator('[data-shipment-notice]').innerText(), /Counts may be incomplete/);
 legacy = false; orders = [...initial]; await refresh();
 // Courier confirmation updates progress and the inspector without losing focus.
 await page.locator('.shipment-lane').filter({hasText:'J&T Express'}).click();
 await page.locator('.admin-arrangement-order-breakdown').waitFor();
 orders = orders.map(o => o.shipping_provider_name === 'J&T Express' && ['260917-PREPARE','260917-READY'].includes(o.order_id) ? {...o,pickup_confirmed:true,pickup_confirmed_at:at(10)} : o);
 await page.evaluate(() => window.dispatchEvent(new Event('jg-shipment-arrangement-refresh')));
 await page.waitForFunction(() => document.querySelector('.admin-arrangement-event-summary strong').textContent === '3/3');
 await page.keyboard.press('Escape');
 const collectedLane = page.locator('.shipment-lane').filter({hasText:'J&T Express'});
 assert.match(await collectedLane.innerText(), /All shipments collected/);
 assert(await collectedLane.evaluate(el => el === document.activeElement));
 assert.equal(await page.locator('[data-arrangement-metric="pending"]').textContent(), '7');
 // Clock movement changes urgency even when the network is down.
 failure = true;
 await page.clock.setSystemTime(new Date('2026-09-17T06:30:00Z')); // 13:30 WIB
 await page.clock.runFor(31000);
 assert.match(await page.locator('.shipment-lane').filter({hasText:'J&T Cargo'}).innerText(), /Pickup window missed/);
 await page.clock.setSystemTime(new Date('2026-09-17T03:00:00Z'));
 failure = false; orders = initial; await refresh();
 // HTML-looking carrier/order values are rendered as text.
 orders = [order('<img src=x onerror=alert(1)>', {shipping_provider_name:'<svg onload=alert(1)>',pickup_start_at:null,pickup_end_at:null})];
 await refresh(); assert.equal(await page.locator('[data-arrangement-map] img, [data-arrangement-map] svg').count(), 0);
 assert.match(await page.locator('.shipment-order').innerText(), /<img src=x/);
 orders = [order('overnight', {pickup_start_at:at(23,'16'),pickup_end_at:at(11)})];
 await refresh(); assert.match(await page.locator('.shipment-window-time').innerText(), /Wed 23:00–11:00/);
 await page.locator('.shipment-lane').click();
 assert.match(await page.locator('[data-arrangement-event-title]').innerText(), /Wed 16 Sept.*Thu 17 Sept/);
 await page.keyboard.press('Escape');
 assert(detailReads >= 2); assert.deepEqual(errors, []);
 console.log(`Shipment browser: pagination, 4 courier lanes, partial pickup, inspector/retry/focus, filters, day navigation, stale/error recovery, preparation, mobile/light/dark and unsaved rules passed. ${mapReads} fixture map requests, ${posts} shipment writes.`);
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
