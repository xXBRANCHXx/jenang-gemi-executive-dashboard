const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const ordersActivation = admin.slice(
  admin.indexOf('const activateOrdersViewInstantly'),
  admin.indexOf('const activateWalletViewInstantly')
);

assert(
  admin.includes('formatCellCurrency(orderDisplayedRevenue(row))'),
  'The Orders table must display the recalculated item-level revenue.'
);
assert(
  /const orderDisplayedRevenue = \(row\) => \{[\s\S]*?Number\(row\?\.revenue \?\? row\?\.net_revenue\)[\s\S]*?Number\(row\?\.gross_revenue \|\| 0\);/.test(admin),
  'Orders must prefer recalculated proceeds and only fall back to gross revenue when necessary.'
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
assert(
  dashboard.includes('data-orders-export') && dashboard.includes('Export CSV'),
  'Orders must expose a CSV export action.'
);
assert(
  admin.includes('if (!filters.startDate || !filters.endDate || state.orders.exporting) return;'),
  'CSV export must require an explicit custom start and end date.'
);
assert(
  admin.includes('limit: 2000') && admin.includes('data.next_offset'),
  'CSV export must page through the complete custom range instead of exporting only visible rows.'
);
assert(
  admin.includes("'Gross Revenue'") && admin.includes('orderDisplayedRevenue(row)'),
  'CSV exports must include the recalculated item-level revenue.'
);
assert(
  /\.admin-orders-table th:nth-child\(7\),[\s\S]*?width: 132px;[\s\S]*?padding-right: 24px;[\s\S]*?nth-child\(8\)[\s\S]*?padding-left: 18px;/.test(styles),
  'Gross Revenue and COGS columns must have independent width and spacing.'
);
console.log('orders-ui-test: ok');
