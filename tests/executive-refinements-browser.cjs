const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const map = require('../navigation-map.json');
const base = 'http://127.0.0.1:4180';
// Illustrative report served only inside this browser test. No live API writes.
const transactions = [
  { date: '2026-09-01', flow: 'income', amount: 12800000, transaction: 'Marketplace settlement', category: 'Sales', source_label: 'Shopee', account: 'Bank', reference: 'SET-001' },
  { date: '2026-09-02', flow: 'cost', amount: 4200000, transaction: 'Inventory purchase', category: 'Inventory', source_label: 'Accounting', account: 'Bank', reference: 'BILL-002' },
  { date: '2026-09-05', flow: 'income', amount: 6400000, transaction: 'Partner payment', category: 'Sales', source_label: 'Partners', account: 'Bank', reference: 'PAY-003' },
  { date: '2026-09-08', flow: 'cost', amount: 1800000, transaction: 'Packaging supplies', category: 'Operating costs', source_label: 'Accounting', account: 'Bank', reference: 'BILL-004' }
];
const report = {
  totals: { income: 19200000, cost: 6000000, net_cash_flow: 13200000, income_count: 2, cost_count: 2, transaction_count: 4 },
  daily: Array.from({ length: 30 }, (_, i) => { const day = i + 1, date = `2026-09-${String(day).padStart(2, '0')}`;
    const income = transactions.filter(t => t.date === date && t.flow === 'income').reduce((s,t) => s+t.amount,0);
    const cost = transactions.filter(t => t.date === date && t.flow === 'cost').reduce((s,t) => s+t.amount,0);
    return { day, date, income, cost, net: income-cost }; }),
  source_summary: transactions.map(t => ({ label: t.source_label, flow: t.flow, amount: t.amount, transaction_count: 1 })),
  category_summary: transactions.map(t => ({ label: t.category, flow: t.flow, amount: t.amount, transaction_count: 1 })),
  transactions, methodology: ['Includes confirmed receipts and paid expenses.']
};
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const cashRequests = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.abort();
    if (url.pathname === '/api/accounting/' && url.searchParams.get('action') === 'cash_flow') {
      cashRequests.push(url.searchParams.get('month'));
      return route.fulfill({ json: { ok: true, data: { cash_flow: report } } });
    }
    return route.continue();
  });
  for (const area of map.areas) {
    await page.goto(base + '/cash-flow/?month=2026-09');
    const landing = map.pages.find(p => p.id === area.landing);
    const icon = page.locator(`[data-ed-area="${area.id}"]`);
    assert.equal(await icon.getAttribute('href'), landing.href);
    await icon.click();
    await page.waitForURL(base + landing.href);
    await page.locator(`[data-ed-page="${landing.id}"][aria-current="page"]`).waitFor({ state: 'visible' });
  }
  await page.goto(base + '/dashboard/?view=overview');
  await page.waitForFunction(() => document.querySelector('[data-admin-dashboard]').dataset.activeView === 'overview');
  await page.evaluate(() => window.navigationDocumentMarker = 'same document');
  await page.locator('[data-ed-area="sales"]').click();
  await page.waitForFunction(() => document.querySelector('[data-admin-dashboard]').dataset.activeView === 'orders');
  assert.equal(await page.evaluate(() => window.navigationDocumentMarker), 'same document', 'Existing fast view switching retained');
  const create = page.locator('[data-ed-page="direct-new"]');
  assert(await create.locator('svg').count() === 1);
  assert.match(await create.getAttribute('class'), /is-action/);
  await page.locator('.ed-nav').screenshot({ path: path.join(__dirname, '../verification/ui/sales-sidebar-actions.png') });
  await create.click(); await page.waitForURL('**/whatsapp-orders/');
  await page.locator('[data-ed-area="overview"]').click();
  const toggle = page.locator('[aria-label="Order volume chart metric"]');
  const items = toggle.locator('[data-overview-volume-metric="item_count"]');
  await items.click();
  await page.waitForFunction(() => document.querySelector('[data-overview-volume-metric="item_count"]').getAttribute('aria-pressed') === 'true');
  await items.focus(); await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-overview-volume-metric="average_order_value"]').getAttribute('aria-pressed') === 'true');
  for (const theme of ['dark', 'light']) {
    await page.evaluate(t => document.documentElement.dataset.adminTheme = t, theme);
    await page.waitForTimeout(700);
    const active = await toggle.locator('.is-active').boundingBox();
    const indicator = await toggle.locator('.admin-sliding-toggle-indicator').boundingBox();
    assert(indicator && Math.abs(active.x-indicator.x) < 3 && Math.abs(active.width-indicator.width) < 3, 'Slider tracks selected control');
    await page.screenshot({ path: path.join(__dirname, `../verification/ui/chart-toggles-${theme}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await toggle.scrollIntoViewIfNeeded();
  await toggle.locator('[data-overview-volume-metric="orders"]').click();
  await page.waitForTimeout(700);
  assert(await toggle.locator('.admin-sliding-toggle-indicator').isVisible(), 'Mobile sliding control visible');
  const mobileActive = await toggle.locator('.is-active').boundingBox();
  const mobileIndicator = await toggle.locator('.admin-sliding-toggle-indicator').boundingBox();
  assert(Math.abs(mobileActive.x-mobileIndicator.x) < 3, 'Mobile slider follows selected metric');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Charts do not widen mobile page');
  await page.screenshot({ path: path.join(__dirname, '../verification/ui/chart-toggles-mobile.png') });
  await page.locator('[data-mobile-nav-more]').click();
  await page.locator('[data-ed-area="finance"]').click();
  await page.waitForURL('**/profit-loss/');
  assert(await page.locator('.ed-nav').evaluate(e => e.inert), 'Area navigation closes mobile sidebar');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(base + '/cash-flow/?month=2026-09');
  await page.locator('.cash-flow-day').first().waitFor();
  assert.equal(await page.locator('.cash-flow-day').count(), 30);
  assert.match(await page.locator('[data-cash-flow-total="net"]').textContent(), /13\.200\.000/);
  for (const theme of ['dark', 'light']) {
    await page.evaluate(t => document.documentElement.dataset.adminTheme = t, theme);
    await page.waitForTimeout(700);
    const box = await page.locator('.cash-flow-chart-section').boundingBox();
    const header = await page.locator('#cash-flow-chart-title').boundingBox();
    assert(header.x - box.x >= 20, 'Chart header padded');
    const kpis = await page.locator('.cash-flow-kpis').boundingBox();
    assert(box.y - kpis.y - kpis.height >= 19, 'Report sections separated');
    await page.screenshot({ path: path.join(__dirname, `../verification/ui/cash-flow-${theme}.png`) });
  }
  await page.locator('.cash-flow-day').first().focus();
  assert.match(await page.locator('.cash-flow-day').first().getAttribute('data-tooltip'), /Income Rp12\.800\.000/);
  await page.locator('[data-cash-flow-filter]').selectOption('cost');
  assert.equal(await page.locator('[data-cash-flow-transactions] tr').count(), 2);
  await page.locator('[data-cash-flow-search]').fill('Packaging');
  assert.equal(await page.locator('[data-cash-flow-transactions] tr').count(), 1);
  await page.locator('[data-cash-flow-month]').selectOption('8');
  await page.waitForFunction(() => document.querySelector('[data-cash-flow-period]').textContent === 'August 2026');
  assert(cashRequests.includes('2026-08'), 'Month selector retains original API parameters');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Cash flow fits mobile');
  await page.screenshot({ path: path.join(__dirname, '../verification/ui/cash-flow-mobile.png') });
  console.log('PASS: seven area landing links; native fast navigation; chart toggle pointer/keyboard/slider in both themes and mobile; populated cash-flow bars, filters, period API and responsive spacing.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
