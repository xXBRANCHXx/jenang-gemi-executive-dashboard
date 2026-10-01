const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const php = process.env.PHP_BINARY || 'php';
const requests = [];
let failReport = false;
let slowVanilla = false;

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/product-purchases/') {
      requests.push(Object.fromEntries(url.searchParams));
      res.setHeader('Content-Type', 'application/json');
      if (failReport) { res.writeHead(503); return res.end(JSON.stringify({ ok: false, message: 'Purchase history could not be loaded. Please try again.' })); }
      // Exercise the actual report SQL with an isolated in-memory fixture.
      const code = 'require $argv[1]."/product-purchases-bootstrap.php"; require $argv[1]."/tests/fixtures/product-purchases.php"; try { echo json_encode(jg_product_purchases_payload(product_purchases_fixture(), json_decode($argv[2], true))); } catch (InvalidArgumentException $error) { echo json_encode(["ok"=>false,"message"=>$error->getMessage()]); }';
      const payload = execFileSync(php, ['-r', code, root, JSON.stringify(Object.fromEntries(url.searchParams))]);
      return setTimeout(() => res.end(payload), slowVanilla && url.searchParams.get('sku') === '010125000101' ? 350 : 0);
    }
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, events: [], unpaid: { count: 0 } }));
    }
    if (['/product-purchases/', '/dashboard/'].includes(url.pathname)) {
      const code = 'session_start(); $_SESSION["jg_admin_authenticated"]=true; $_SERVER["REQUEST_METHOD"]="GET"; $_SERVER["REQUEST_URI"]=$argv[2]; $_GET=json_decode($argv[3],true); include $argv[1].parse_url($argv[2],PHP_URL_PATH)."index.php";';
      const html = execFileSync(php, ['-d', 'display_errors=0', '-r', code, root, req.url, JSON.stringify(Object.fromEntries(url.searchParams))], { maxBuffer: 8e6 });
      res.setHeader('Content-Type', 'text/html');
      return res.end(html);
    }
    const file = path.resolve(root, '.' + url.pathname);
    if (!file.startsWith(root + path.sep) || !/\.(css|js|svg|json)$/.test(file) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/json');
    res.end(fs.readFileSync(file));
  } catch (error) { res.writeHead(500); res.end('Local rendering failed.'); console.error(error); }
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  if (process.argv.includes('--serve')) { console.log(base + '/product-purchases/?start_date=2026-09-02&end_date=2026-09-02'); return; }
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, timezoneId: 'America/Los_Angeles' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-23T21:30:00Z')); // Sep 24 in Jakarta.
    await page.route('**/*', (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const ready = () => page.locator('[data-product-purchases][aria-busy="false"]').waitFor();
    await page.goto(base + '/product-purchases/');
    await ready();
    assert.equal(requests.at(-1).end_date, '2026-09-24');
    assert.equal(requests.at(-1).start_date, '2026-08-26');
    assert.equal(await page.locator('[data-ed-page="product-purchases"]').getAttribute('aria-current'), 'page');
    assert(await page.locator('a[href="../dashboard/?view=po-history"]').isVisible());

    await page.locator('[data-purchases-start]').fill('2026-09-02');
    await page.locator('[data-purchases-end]').fill('2026-09-02');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await ready();
    assert.equal(await page.locator('[data-purchases-ordered]').innerText(), '35');
    assert.equal(await page.locator('[data-purchases-value]').innerText(), 'Rp4.070');
    assert.equal(await page.locator('[data-purchases-order-count]').innerText(), '3 purchase orders');
    assert.equal(await page.locator('[data-purchases-rows] tr').count(), 2);
    await page.locator('[data-purchases-search]').fill('mint');
    assert.equal(await page.locator('[data-purchases-rows] tr').count(), 1);
    await page.locator('[data-purchases-search]').fill('');
    await page.locator('[data-purchases-sku="010125000101"]').click();
    await ready();
    assert.equal(await page.locator('[data-purchases-title]').innerText(), '250ml VANILLA Syrup');
    assert.equal(await page.locator('[data-purchases-ordered]').innerText(), '25');
    assert.equal(await page.locator('[data-purchases-value]').innerText(), 'Rp3.500');
    assert.equal(await page.locator('[data-purchases-rows] tr').count(), 3);
    assert.equal(await page.locator('[data-purchases-rows] a').first().getAttribute('href'), '../dashboard/?view=po-detail&po=3');
    assert((await page.locator('[data-purchases-rows]').innerText()).includes('Seasonal <sample>'));
    assert.equal(await page.locator('[data-purchases-rows] sample').count(), 0);
    const bookmark = page.url();
    await page.reload();
    await ready();
    assert.equal(page.url(), bookmark);
    assert.equal(await page.locator('[data-purchases-ordered]').innerText(), '25');

    const output = process.env.PURCHASES_SCREENSHOT_DIR;
    if (output) {
      fs.mkdirSync(output, { recursive: true });
      await page.screenshot({ path: path.join(output, 'product-purchases-dark.png'), fullPage: true });
      await page.evaluate(() => document.documentElement.dataset.adminTheme = 'light');
      await page.screenshot({ path: path.join(output, 'product-purchases-light.png'), fullPage: true });
    }
    for (const width of [320, 390, 768, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert((await page.locator('[data-purchases-form]').boundingBox()).x >= 12, 'Phone controls need a page gutter.');
    assert(await page.locator('[data-purchases-ordered]').isVisible());
    if (output) await page.screenshot({ path: path.join(output, 'product-purchases-mobile.png'), fullPage: true });
    await page.locator('[data-purchases-all]').click();
    await ready();
    await page.goBack();
    await ready();
    assert.equal(await page.locator('[data-purchases-title]').innerText(), '250ml VANILLA Syrup');
    await page.locator('[data-purchases-product]').selectOption('UNBOUGHT');
    await ready();
    assert.equal(await page.locator('[data-purchases-ordered]').innerText(), '0');
    assert.match(await page.locator('[data-purchases-rows]').innerText(), /No purchases for this product/);
    await page.locator('[data-purchases-period]').selectOption('all');
    await ready();
    assert(await page.locator('[data-purchases-start]').isDisabled());
    assert(!requests.at(-1).start_date);
    await page.locator('[data-purchases-period]').selectOption('lastmonth');
    await ready();
    assert.equal(requests.at(-1).start_date, '2026-08-01');
    assert.equal(requests.at(-1).end_date, '2026-08-31');

    slowVanilla = true;
    await page.locator('[data-purchases-product]').selectOption('010125000101');
    await page.locator('[data-purchases-product]').selectOption('010125000201');
    await ready();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-purchases-title]').innerText(), '250ml MINT Syrup');
    failReport = true;
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await ready();
    assert(await page.locator('[data-purchases-results]').isHidden());
    assert.match(await page.locator('[data-purchases-status]').innerText(), /could not be loaded/);
    failReport = false;
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await ready();
    assert(await page.locator('[data-purchases-results]').isVisible());
    await page.goto(base + '/product-purchases/?start_date=2026-09-03&end_date=2026-09-02');
    await ready();
    assert.match(await page.locator('[data-purchases-status]').innerText(), /End date must be/);
    assert(await page.locator('[data-purchases-results]').isHidden());
    await page.goto(base + '/product-purchases/?start_date=bad&end_date=bad');
    await ready();
    assert.match(await page.locator('[data-purchases-status]').innerText(), /Choose a valid start and end date/);
    assert(await page.locator('[data-purchases-results]').isHidden());
    assert.deepEqual(errors, []);
    console.log('PASS: native PHP page and report SQL, product drilldowns, date presets, bookmarks/back, search, escaping, mobile/light/dark, request races and failure recovery.');
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
