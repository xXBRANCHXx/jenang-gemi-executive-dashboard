const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const script = fs.readFileSync(path.join(root, 'shipment-arrangement.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const endpoint = fs.readFileSync(path.join(root, 'api', 'shipment-arrangement', 'index.php'), 'utf8');
const shipmentStyles = styles.slice(styles.indexOf('/* Shipment arrangement */'));
const shipmentMarkup = dashboard.slice(
  dashboard.indexOf('<section class="admin-view admin-shipment-arrangement"'),
  dashboard.indexOf('<section class="admin-view admin-store-ops-layout"')
);

assert(
  dashboard.includes('data-view-switch="shipment-arrangement"')
    && dashboard.includes('data-view-panel="shipment-arrangement"'),
  'Orders and Ops must navigate to the Shipment Arrangement view.'
);
assert(
  admin.includes("'shipment-arrangement': 'shipment-arrangement'")
    && admin.includes("CustomEvent('jg-shipment-arrangement-refresh')"),
  'The dashboard router must activate and refresh Shipment Arrangement.'
);
assert(
  dashboard.includes('data-arrangement-tab="schedule"')
    && dashboard.includes('data-arrangement-tab="rules"')
    && script.includes('admin-arrangement-deadline-event')
    && script.includes('order.order_id')
    && script.includes('order.account_key')
    && !script.includes('View orders'),
  'Schedule must show every order directly on the pickup-deadline timeline without a drill-down.'
);
assert(
  script.includes('setTab(button.dataset.arrangementTab)')
    && script.includes('WINDOW_BEFORE_HOURS = 8')
    && script.includes('WINDOW_AFTER_HOURS = 24')
    && script.includes('orderDeadline(order)')
    && script.includes('pickupConfirmed(order)')
    && script.includes('return !pickupConfirmed(order) && deadline')
    && script.includes('order.pickup_confirmed')
    && script.includes('order.marketplace_status')
    && script.includes("'SHIPPED'")
    && !script.includes('shipment_arranged || order.pickup_start_at')
    && dashboard.includes('Apply Monday to all days')
    && script.includes('admin-arrangement-rule-editor-card')
    && script.includes('data-advanced-platform-tab'),
  'The planner must use a rolling ship-by window, remove confirmed pickups, and retain visual rule cards and focused advanced settings.'
);
assert(
  dashboard.includes('Branch-tier credentials')
    && endpoint.includes('jg_sku_is_branch()')
    && endpoint.includes("'updated_by' => 'Branch tier: '"),
  'Only a Branch-tier session may save live worker rules.'
);
assert(
  dashboard.includes('If the selected day is unavailable, the order waits')
    && dashboard.includes('Instant orders are manual only')
    && script.includes('pickup_days[key]'),
  'The editor must expose the pickup-day mapping and explain its fail-closed behavior.'
);
assert(
  styles.includes('.admin-arrangement-deadline-chart')
    && styles.includes('.admin-arrangement-now-line')
    && styles.includes('.admin-arrangement-deadline-event')
    && styles.includes('grid-column: var(--event-column) / span 3')
    && styles.includes('.admin-arrangement-status-guide .is-booked')
    && styles.includes('.admin-arrangement-rule-card-grid')
    && styles.includes('.admin-arrangement-advanced-tabs')
    && styles.includes(".admin-arrangement-day-toggle input[type='checkbox']")
    && styles.includes('width: 12px')
    && styles.includes('.admin-arrangement-workspace')
    && styles.includes('@media (max-width: 680px)'),
  'The 32-hour deadline chart, rule cards, and advanced marketplace tabs must have responsive styling.'
);
assert(
  styles.includes('.admin-shipment-arrangement {\n  --arrangement-shopee: #ff8a3d;\n  --arrangement-tiktok: #42d7c5;\n  display: none;')
    && styles.includes('.admin-shipment-arrangement.is-active {\n  display: grid;'),
  'Shipment Arrangement must remain hidden unless its Orders · Ops route is active.'
);
assert(
  !shipmentMarkup.includes('admin-modal-shell')
    && !shipmentMarkup.includes('admin-icon-action')
    && !shipmentMarkup.includes('Needs attention')
    && shipmentMarkup.includes('data-arrangement-refresh>Refresh</button>'),
  'Shipment Arrangement must avoid scrolling modals, icon-only pills, and irrelevant attention panels.'
);
assert(
  !shipmentStyles.includes('gradient('),
  'Shipment Arrangement must use flat fills without gradients.'
);

console.log('shipment-arrangement-ui-test: ok');
