const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const ordersActivation = admin.slice(
  admin.indexOf('const activateOrdersViewInstantly'),
  admin.indexOf('const activateWalletViewInstantly')
);

assert(
  admin.includes('formatCellCurrency(displayedGrossRevenue)'),
  'The Orders table must display item-level gross revenue instead of seller/net revenue.'
);
assert(
  /const displayedGrossRevenue = Number\.isFinite\(grossRevenue\) && grossRevenue > 0[\s\S]*?: Number\(row\.revenue \|\| 0\);/.test(admin),
  'Historical rows without gross revenue must fall back to their existing item revenue.'
);
assert(
  dashboard.includes('<th>Gross Revenue</th>'),
  'The Orders revenue column must identify the displayed amount as gross revenue.'
);
assert(
  /const preloadOrderMemory = async[\s\S]*?state\.activeView === 'orders' \|\| !canStartBackgroundPageWork\(\)/.test(admin),
  'The active Orders view must not start the large background order preload.'
);
assert(
  ordersActivation.includes('writeOrdersClientCache();') &&
    !ordersActivation.includes('preloadOrderMemory('),
  'Orders activation must stop after filling the visible table and caching those rows.'
);

console.log('orders-ui-test: ok');
