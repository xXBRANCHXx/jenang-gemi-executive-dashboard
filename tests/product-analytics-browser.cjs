const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const php = process.env.PHP_BINARY || 'php';
const requests = [];
let failCompare = false, failPrimary = false, failCatalog = false, slowToday = false;
const products = [
  { key: 'drops-4x', label: 'Drops 4x', flavors: [{ key: 'vanilla', label: 'Vanilla' }], volumes: [{ key: '10-ml', label: '10 ML' }], variants: [{ flavor_key: 'vanilla', volume_key: '10-ml' }] },
  { key: 'syrup', label: 'Syrup', flavors: [{ key: 'vanilla', label: 'Vanilla' }, { key: 'mint', label: 'Mint' }], volumes: [{ key: '250-ml', label: '250 ML' }, { key: '550-ml', label: '550 ML' }], variants: [{ flavor_key: 'vanilla', volume_key: '250-ml' }, { flavor_key: 'mint', volume_key: '550-ml' }] },
  { key: 'empty', label: 'Empty product', flavors: [], volumes: [], variants: [] }
];
const analytics = (params) => {
  const product = params.get('product');
  const selected = products.find((item) => item.key === product);
  const start = params.get('start_date'), end = params.get('end_date'), grain = params.get('grain');
  const quantity = product === 'empty' ? 0 : product === 'syrup' ? 9 : 3;
  const flavor = params.get('flavor') || '', volume = params.get('volume') || '';
  const title = [selected.flavors.find((row) => row.key === flavor)?.label, selected.volumes.find((row) => row.key === volume)?.label, selected.label].filter(Boolean).join(' ');
  const history = [];
  const current = new Date(`${start}T00:00:00Z`);
  if (grain === 'month') current.setUTCDate(1);
  while (current.toISOString().slice(0, 10) <= end) {
    const date = current.toISOString().slice(0, 10);
    history.push({ key: grain === 'day' ? date : date.slice(0, 7), start_date: date, label: grain === 'day' ? date : date.slice(0, 7), quantity: 0, revenue: 0 });
    if (grain === 'day') current.setUTCDate(current.getUTCDate() + 1);
    else current.setUTCMonth(current.getUTCMonth() + 1);
  }
  Object.assign(history.at(-1), { quantity, revenue: quantity * 60000 });
  return { ok: true, grain, start_date: start, end_date: end, selection: { product, product_label: selected.label, title, dimension: params.get('dimension'), flavor, volume }, totals: { quantity, revenue: quantity * 60000 }, history, forecast: [], breakdowns: { flavors: [{ key: 'vanilla', label: 'Vanilla', quantity, revenue: quantity * 60000 }], volumes: [], accounts: [] } };
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/orders/') {
    const params = url.searchParams, action = params.get('action');
    requests.push(Object.fromEntries(params));
    res.setHeader('Content-Type', 'application/json');
    if (action === 'status') return res.end(JSON.stringify({ ok: true, mirror: { oldest_order_at: '2026-05-03', newest_order_at: '2026-09-24' } }));
    if (action === 'product_breakdown_catalog') {
      res.statusCode = failCatalog ? 503 : 200;
      return res.end(JSON.stringify(failCatalog ? { ok: false } : { ok: true, products }));
    }
    if (action === 'product_analytics') {
      if (failPrimary && params.get('product') === 'drops-4x' || failCompare && params.get('product') === 'syrup') { res.statusCode = 503; return res.end(JSON.stringify({ ok: false })); }
      const payload = analytics(params);
      return setTimeout(() => res.end(JSON.stringify(payload)), slowToday && params.get('start_date') === params.get('end_date') ? 350 : 0);
    }
    if (action === 'product_flavor_breakdown') return res.end(JSON.stringify({ ok: true, start_date: params.get('start_date'), end_date: params.get('end_date'), periods: [], volumes: [] }));
  }
  if (['/dashboard/product-analytics/', '/dashboard/product-flavors/'].includes(url.pathname)) {
    // Render the actual PHP page and navigation; authentication exists only in this local CLI process.
    const code = 'session_start(); $_SESSION["jg_admin_authenticated"] = true; $_GET = json_decode($argv[1], true); $_SERVER["REQUEST_URI"] = $argv[2]; include $argv[3];';
    const html = execFileSync(php, ['-r', code, JSON.stringify(Object.fromEntries(url.searchParams)), req.url, path.join(root, url.pathname, 'index.php')]);
    res.setHeader('Content-Type', 'text/html'); return res.end(html);
  }
  const file = path.join(root, url.pathname);
  if (file.startsWith(`${root}/`) && /\.(css|js|json|svg)$/.test(file) && fs.existsSync(file)) {
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/json');
    return res.end(fs.readFileSync(file));
  }
  res.statusCode = 404; res.end();
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, timezoneId: 'America/Los_Angeles' });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-23T18:30:00Z')); // Sep 24 in Jakarta, Sep 23 in the browser.
    await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ body: '' }));
    const base = `http://127.0.0.1:${server.address().port}`;
    const ready = () => page.waitForFunction(() => document.querySelector('[data-load-status] span')?.textContent.startsWith('Updated'));
    const lastRequest = (product = 'drops-4x') => requests.findLast((request) => request.action === 'product_analytics' && request.product === product);
    await page.goto(`${base}/dashboard/product-analytics/?product=drops-4x`); await ready();
    await page.waitForFunction(() => !document.querySelector('[data-compare-product]').disabled);
    assert.equal(lastRequest().start_date, '2026-05-03');
    for (const [scope, start, grain] of [['today', '2026-09-24', 'day'], ['month', '2026-09-01', 'day'], ['year', '2026-01-01', 'month']]) {
      await page.locator(`[data-scope="${scope}"]`).click(); await ready();
      assert.equal(lastRequest().start_date, start); assert.equal(lastRequest().end_date, '2026-09-24'); assert.equal(lastRequest().grain, grain);
      assert.equal(await page.locator(`[data-scope="${scope}"]`).getAttribute('aria-pressed'), 'true');
    }
    await page.locator('[data-scope="month"]').click(); await ready();
    await page.locator('[data-compare-product]').selectOption('syrup'); await ready();
    assert.equal(await page.locator('[data-comparison]').isVisible(), true);
    assert.equal(await page.locator('[data-kpis]').isVisible(), false);
    assert.equal(lastRequest('syrup').start_date, lastRequest().start_date);
    assert.equal(lastRequest('syrup').end_date, lastRequest().end_date);
    assert.equal(await page.locator('[data-history-head] th').count(), 5);
    assert.match(await page.locator('[data-comparison]').innerText(), /Syrup has 6 units more/);
    assert.match(await page.locator('[data-chart-legend]').innerText(), /Drops 4x[\s\S]*Syrup/i);
    await page.locator('[data-metric="revenue"]').click();
    assert.match(await page.locator('[data-comparison]').innerText(), /Rp 360.000 more/);
    await page.locator('[data-compare-flavor]').selectOption('vanilla'); await ready();
    assert.equal(lastRequest('syrup').dimension, 'flavor');
    assert.equal(await page.locator('[data-compare-volume] option[value="550-ml"]').count(), 0);
    await page.locator('[data-compare-volume]').selectOption('250-ml'); await ready();
    assert.equal(lastRequest('syrup').dimension, 'sku');
    await page.reload(); await ready();
    assert.equal(await page.locator('[data-compare-volume]').inputValue(), '250-ml');
    assert.equal(await page.locator('[data-scope="month"]').getAttribute('aria-pressed'), 'true');
    const downloadPromise = page.waitForEvent('download'); await page.locator('[data-export]').click();
    const download = await downloadPromise;
    const csv = fs.readFileSync(await download.path(), 'utf8');
    assert.match(csv, /Drops 4x/); assert.match(csv, /Vanilla 250 ML Syrup/); assert.match(csv, /2026-09-01/); assert.doesNotMatch(csv, /Projected/);
    await page.locator('[data-scope="custom"]').click();
    await page.locator('[data-start-date]').fill('2026-06-10'); await page.locator('[data-end-date]').fill('2026-07-15');
    await page.locator('[data-date-form] button').click(); await ready();
    assert.equal(lastRequest().start_date, '2026-06-10'); assert.equal(lastRequest('syrup').end_date, '2026-07-15');
    await page.locator('[data-start-date]').fill('2026-08-10'); await page.locator('[data-date-form] button').click();
    assert.equal(await page.locator('[data-start-date]').evaluate((el) => el.validity.valid), false);
    await page.locator('[data-end-date]').fill('2026-08-15'); await page.locator('[data-date-form] button').click(); await ready();
    assert.equal(lastRequest().end_date, '2026-08-15');
    slowToday = true;
    await page.locator('[data-scope="today"]').click(); await page.locator('[data-scope="month"]').click(); await ready();
    await page.waitForTimeout(450); assert.match(await page.locator('[data-page-subtitle]').innerText(), /Sep 1, 2026/); slowToday = false;
    failCompare = true; await page.locator('[data-scope="today"]').click(); await ready();
    assert.match(await page.locator('[data-compare-message]').innerText(), /Could not load the comparison/);
    assert.equal(await page.locator('[data-kpis]').isVisible(), true); assert.equal(await page.locator('[data-comparison]').isVisible(), false);
    failCompare = false; await page.locator('[data-compare-retry]').click(); await ready();
    assert.equal(await page.locator('[data-comparison]').isVisible(), true);
    await page.locator('[data-compare-product]').selectOption('empty'); await ready();
    assert.match(await page.locator('[data-comparison]').innerText(), /No sales in this period/);
    assert.doesNotMatch(await page.locator('[data-comparison]').innerText(), /Infinity|NaN/);
    await page.locator('[data-compare-product]').selectOption('drops-4x'); await ready();
    assert.match(await page.locator('[data-compare-message]').innerText(), /Choose a different/);
    await page.locator('[data-compare-product]').selectOption('syrup'); await ready();
    await page.locator('[data-scope="month"]').click(); await ready();
    for (const width of [1280, 940, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `page overflow at ${width}`);
      for (const selector of ['[data-scope-controls]', '[data-compare-product]', '[data-comparison]']) {
        const box = await page.locator(selector).boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `${selector} clipped at ${width}`);
      }
      if (process.env.ANALYTICS_REVIEW_DIR) { fs.mkdirSync(process.env.ANALYTICS_REVIEW_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.ANALYTICS_REVIEW_DIR, `compare-${width}.png`), fullPage: true }); }
    }
    await page.locator('[data-theme-toggle]').click();
    assert.equal(await page.locator('html').getAttribute('data-admin-theme'), 'light');
    if (process.env.ANALYTICS_REVIEW_DIR) await page.screenshot({ path: path.join(process.env.ANALYTICS_REVIEW_DIR, 'compare-light-320.png'), fullPage: true });
    await page.locator('[data-compare-clear]').click(); await ready();
    assert.equal(await page.locator('[data-comparison]').isVisible(), false);
    assert.equal(new URL(page.url()).searchParams.has('compare'), false);
    failPrimary = true; await page.locator('[data-scope="today"]').click();
    await page.waitForFunction(() => document.querySelector('[data-load-status]').classList.contains('is-error'));
    assert.equal(await page.locator('[data-export]').isDisabled(), true);
    failPrimary = false; await page.locator('[data-scope="month"]').click(); await ready();
    assert.equal(await page.locator('[data-export]').isDisabled(), false);
    failCatalog = true; await page.goto(`${base}/dashboard/product-analytics/?product=drops-4x&scope=today`); await ready();
    assert.match(await page.locator('[data-compare-message]').innerText(), /Could not load the product list/);
    failCatalog = false; await page.locator('[data-compare-retry]').click(); await ready();
    assert.equal(await page.locator('[data-compare-product]').isDisabled(), false);
    for (const dimension of ['product', 'flavor', 'volume', 'sku']) {
      await page.goto(`${base}/dashboard/product-analytics/?product=drops-4x&dimension=${dimension}&flavor=vanilla&volume=10-ml&scope=today`); await ready();
      assert.equal(lastRequest().dimension, dimension); assert.equal(lastRequest().start_date, '2026-09-24');
    }
    await page.goto(`${base}/dashboard/product-analytics/?product=empty&scope=today&compare=syrup`); await ready();
    assert.equal(await page.locator('[data-comparison]').isVisible(), true); assert.equal(await page.locator('[data-empty]').isVisible(), false);
    await page.goto(`${base}/dashboard/product-flavors/?product=drops-4x`);
    await page.locator('[data-scope="today"]').click();
    await page.waitForFunction(() => document.querySelector('[data-load-status]').textContent.startsWith('Updated'));
    let flavorRequest = requests.findLast((request) => request.action === 'product_flavor_breakdown');
    assert.equal(flavorRequest.start_date, '2026-09-24'); assert.equal(flavorRequest.grain, 'day');
    await page.locator('[data-scope="month"]').click();
    await page.waitForFunction(() => document.querySelector('[data-load-status]').textContent.startsWith('Updated'));
    flavorRequest = requests.findLast((request) => request.action === 'product_flavor_breakdown');
    assert.equal(flavorRequest.start_date, '2026-09-01');
    assert.deepEqual(errors, []);
    console.log('product-analytics-browser: passed date presets, Jakarta boundary, dimensions, comparisons, filters, URL restore, CSV, custom dates, request races, empty data, failures/retries, themes, responsive layout and flavor sheets.');
  } finally { await browser.close(); server.close(); }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
