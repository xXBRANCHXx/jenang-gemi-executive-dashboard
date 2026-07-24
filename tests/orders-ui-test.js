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
  admin.includes('formatCellCurrency(orderNetRevenue(row))'),
  'The Orders table must display the recalculated item-level revenue.'
);
assert(
  /const orderNetRevenue = \(row\) => \{[\s\S]*?Number\(row\?\.revenue \?\? row\?\.net_revenue\)[\s\S]*?: 0;/.test(admin)
    && !admin.includes('Number(row?.gross_revenue || 0)'),
  'Orders must use recalculated net proceeds without falling back to gross revenue.'
);
assert(
  dashboard.includes('<th>Net Revenue</th>'),
  'The Orders revenue column must identify the displayed amount as net revenue.'
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
  admin.includes("'Net Revenue'") && admin.includes('orderNetRevenue(row)'),
  'CSV exports must include the recalculated item-level revenue.'
);
assert(
  /\.admin-orders-table th:nth-child\(7\),[\s\S]*?width: 132px;[\s\S]*?padding-right: 24px;[\s\S]*?nth-child\(8\)[\s\S]*?padding-left: 18px;/.test(styles),
  'Net Revenue and COGS columns must have independent width and spacing.'
);
assert(
  dashboard.includes('Find the exact orders you need')
    && dashboard.includes('data-orders-filter-open-label>Filters')
    && dashboard.includes('data-orders-catalog-search')
    && dashboard.includes('data-orders-quick-range="30-days"'),
  'The Orders filter must expose a discoverable, searchable workspace with quick date ranges.'
);
assert(
  admin.includes('accounts: []')
    && admin.includes('accounts: new Set(filters.accounts')
    && admin.includes('data-toggle-order-account')
    && admin.includes('orderAccountLabel(account.platform, account.account, account.company)')
    && admin.includes('filters.accounts.has(row._accountFilterKey'),
  'Orders must support friendly account-level filters in addition to marketplace filters.'
);
assert(
  admin.includes('state.orders.filters.platforms = [];')
    && admin.includes("addOrderFilter('accounts', account)")
    && admin.includes('state.orders.filters.accounts = [];'),
  'Marketplace and account choices must remain mutually exclusive to avoid contradictory filters.'
);
assert(
  /const orderQuickRangeDates = \(range\)[\s\S]*?'7-days'[\s\S]*?'30-days'[\s\S]*?'month'/.test(admin),
  'Quick date choices must resolve to real custom ranges.'
);
assert(
  /const selected = Array\.isArray\(state\.orders\.filters\[kind\]\)[\s\S]*?state\.orders\.filters\[kind\] = state\.orders\.filters\[kind\]\.filter/.test(admin),
  'Selected catalog filters must be removable from the same control.'
);
assert(
  /\.admin-orders-filter-card \{[\s\S]*?width: min\(1120px,[\s\S]*?height: min\(880px,[\s\S]*?grid-template-columns: minmax\(360px, 0\.92fr\) minmax\(420px, 1\.08fr\)/.test(styles)
    && /@media \(max-width: 720px\)[\s\S]*?width: 100vw;[\s\S]*?height: 100svh;/.test(styles),
  'The filter workspace must be substantially larger on desktop and full-screen on mobile.'
);
console.log('orders-ui-test: ok');
