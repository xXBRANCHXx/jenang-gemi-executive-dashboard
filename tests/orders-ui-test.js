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
  dashboard.includes('<th>Paid</th>')
    && dashboard.includes('data-toggle-order-payment="unpaid"')
    && dashboard.includes('data-order-payment-dialog'),
  'Orders must expose payment status, paid/unpaid filtering, and the direct-order payment confirmation dialog.'
);
assert(
  admin.includes('data-confirm-order-payment')
    && admin.includes("payment_status: 'paid'")
    && admin.includes("method === 'cash' ? 'cash-office' : 'bca-main'"),
  'Unpaid direct-order dots must confirm and route payments to Cash Office or Bank Balance.'
);
assert(
  /\['shopee', 'tiktok', 'tokopedia'\]\.includes\(platform\)[\s\S]*?funds_released[\s\S]*?ordersPaymentHistoryVerified\(\) \? 'unpaid' : 'unknown'/.test(admin),
  'Marketplace payment dots must follow verified seller-wallet release history instead of defaulting every order to paid.'
);
assert(
  admin.includes("const ORDER_PAYMENT_AUDIT_START_DATE = '2026-05-20'")
    && admin.includes('ensureOrdersPaymentHistoryAudit().catch')
    && dashboard.includes('data-orders-payment-audit')
    && dashboard.includes('data-toggle-order-payment="unknown"'),
  'Orders must automatically verify the May 20 marketplace history and identify unverified payment states.'
);
assert(
  admin.includes("marketplaceOrder ? 'Funds not released' : 'Payment outstanding'"),
  'Partner and other non-marketplace unpaid orders must be labeled as payment outstanding, not as unreleased wallet funds.'
);
assert(
  /const orderIdAccent = \(value\) => \{[\s\S]*?Math\.imul\(hash, 16777619\)[\s\S]*?getOverviewAccountColor\(hash >>> 0\)/.test(admin)
    && admin.includes('class="admin-order-id"')
    && admin.includes('const orderAccent = orderIdAccent(orderId);')
    && admin.includes('--admin-order-id-rgb: ${hexToRgbParts(orderAccent)}')
    && styles.includes('.admin-orders-table .admin-order-id'),
  'Each order ID must receive a stable, high-visibility accent badge so every line from the same order is easy to identify.'
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
  dashboard.includes('Loading marketplace, partner, WhatsApp, website, and walk-in orders')
    && dashboard.includes('Filter by marketplace, partner, website, WhatsApp, walk-in, or a specific shop.'),
  'The Orders view must state that partner orders are part of its all-channel scope.'
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
  admin.includes('accountSources: []')
    && admin.includes('mergeOrderSources(data.order_sources)')
    && admin.includes('state.orders.accountSources.forEach((source)')
    && admin.includes('account.label || orderAccountLabel')
    && admin.includes('<strong>All sales accounts</strong>'),
  'Orders must keep every configured source, including Partner DB accounts with zero loaded orders, visible in the source filter.'
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
  /\.admin-modal-card\.admin-orders-filter-card \{[\s\S]*?width: min\(1520px,[\s\S]*?height: min\(960px,[\s\S]*?backdrop-filter: none;[\s\S]*?\.admin-orders-filter-head \{[\s\S]*?background: #0b0b0b;[\s\S]*?grid-template-columns: minmax\(480px, 0\.9fr\) minmax\(600px, 1\.1fr\)[\s\S]*?overflow: hidden;/.test(styles)
    && /@media \(max-width: 720px\)[\s\S]*?width: 100vw;[\s\S]*?height: 100svh;/.test(styles),
  'The filter workspace must be large, flat, monochrome, and full-screen on mobile without a whole-dialog scroll.'
);
console.log('orders-ui-test: ok');
