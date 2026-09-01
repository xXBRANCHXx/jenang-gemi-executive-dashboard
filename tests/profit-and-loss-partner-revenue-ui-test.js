const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'profit-and-loss', 'pnl.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'profit-and-loss', 'index.php'), 'utf8');

assert.match(
  script,
  /const \{ allChannelSales, partnerOrders, sellerReceivedSales \} = separatePnlSalesRevenue\(sale\);/,
  'Seller-received sales must remove Partner order revenue from the all-channel Sales total.'
);
assert.match(
  script,
  /const partnerPayments = numeric\(books, \['partner_payments'\]\);[\s\S]*?const otherIncome = numeric\(books, \['other_income'\]\);[\s\S]*?const revenue = sellerReceivedSales \+ partnerPayments \+ otherIncome - refunds;/,
  'Confirmed Partner payments and genuinely separate other revenue must be added once.'
);
assert.match(
  script,
  /bridgeRow\('Seller-received sales'[\s\S]*?bridgeRow\('Partner payments'[\s\S]*?bridgeRow\('Net revenue'/,
  'The statement must identify partner payments inside the revenue section.'
);
assert.match(
  script,
  /netProfit: revenue - productCosts - packingCosts - opex/,
  'Net Profit must be calculated directly from revenue, sold-product COGS, assumed packing, and operating expenses.'
);
assert.doesNotMatch(script, /netProfit: grossProfit - opex/, 'Net Profit must not use Gross Profit as its calculation input.');
assert.doesNotMatch(script, /bridgeRow\('Other operating income'/, 'Income must not appear below gross profit.');
assert.doesNotMatch(script, /sourceRevenue \+ partnerPayments/, 'P&L must never add Partner payments to an all-channel total that still includes Partner orders.');
assert.match(page, /walk-ins, WhatsApp, and online platforms \(Partner excluded\)/, 'The revenue definition must make the channel boundary explicit.');

(async () => {
  const { separatePnlSalesRevenue } = await import(pathToFileURL(path.join(root, 'profit-and-loss', 'pnl.js')).href);
  assert.deepEqual(
    separatePnlSalesRevenue({ revenue: 158174730, revenue_breakdown: { partner_orders: 7314400 } }),
    { allChannelSales: 158174730, partnerOrders: 7314400, sellerReceivedSales: 150860330 },
    'The explicit Partner-order portion must be removed from seller-received sales exactly once.'
  );
  assert.deepEqual(
    separatePnlSalesRevenue({ revenue: 1000, platforms: { partner: { revenue: 250 } } }),
    { allChannelSales: 1000, partnerOrders: 250, sellerReceivedSales: 750 },
    'A keyed Partner platform must protect the P&L while old cached responses drain.'
  );
  assert.deepEqual(
    separatePnlSalesRevenue({ revenue: 1000, platforms: [{ key: 'shopee', revenue: 1000 }] }),
    { allChannelSales: 1000, partnerOrders: 0, sellerReceivedSales: 1000 },
    'Sales without Partner orders must remain unchanged.'
  );
  console.log('Profit and loss partner revenue UI checks passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
