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
    && script.includes('admin-arrangement-agenda-scroll')
    && script.includes('data-arrangement-order-group'),
  'Schedule and Pickup rules must be separate, readable full-page workflows.'
);
assert(
  script.includes('setTab(button.dataset.arrangementTab)')
    && script.includes('state.weekStart = addDays')
    && dashboard.includes('Apply Monday to all days'),
  'The planner must support tab, week, and bulk rule navigation.'
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
  styles.includes('.admin-arrangement-agenda')
    && styles.includes('.admin-arrangement-pickup-editor')
    && styles.includes('.admin-arrangement-workspace')
    && styles.includes('@media (max-width: 680px)'),
  'The agenda, rules table, and explanation panel must have responsive visual styling.'
);
assert(
  styles.includes('.admin-shipment-arrangement {\n  --arrangement-shopee: #ff8a3d;\n  --arrangement-tiktok: #42d7c5;\n  display: none;')
    && styles.includes('.admin-shipment-arrangement.is-active {\n  display: grid;'),
  'Shipment Arrangement must remain hidden unless its Orders · Ops route is active.'
);
assert(
  !shipmentMarkup.includes('admin-modal-shell')
    && !shipmentMarkup.includes('admin-icon-action')
    && shipmentMarkup.includes('data-arrangement-refresh>Refresh</button>'),
  'Shipment Arrangement must not use a scrolling modal or icon-only pill controls.'
);
assert(
  !shipmentStyles.includes('gradient('),
  'Shipment Arrangement must use flat fills without gradients.'
);

console.log('shipment-arrangement-ui-test: ok');
