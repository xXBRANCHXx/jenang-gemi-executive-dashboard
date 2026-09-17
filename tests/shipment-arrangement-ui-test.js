const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const script = fs.readFileSync(path.join(root, 'shipment-arrangement.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const endpoint = fs.readFileSync(path.join(root, 'api', 'shipment-arrangement', 'index.php'), 'utf8');
const shipmentStyles = styles.slice(
  styles.indexOf('/* Shipment arrangement */'),
  styles.indexOf('/* WhatsApp order builder */')
);
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
const model = fs.readFileSync(path.join(root, 'shipment-schedule.js'), 'utf8');
const boardStyles = fs.readFileSync(path.join(root, 'shipment-arrangement.css'), 'utf8');
assert(
  dashboard.includes('data-arrangement-tab="schedule"')
    && dashboard.includes('data-arrangement-tab="rules"')
    && dashboard.includes('shipment-schedule.js')
    && dashboard.includes('shipment-arrangement.css')
    && dashboard.includes('data-shipment-date')
    && dashboard.includes('data-shipment-search')
    && dashboard.includes('data-shipment-notice')
    && script.includes('payload.pagination?.has_more')
    && model.includes('const prepared =')
    && model.includes('const confirmed ='),
  'Shipment board must expose date/search/status controls, explicit stale state, and complete pagination with separate preparation/collection facts.'
);
assert(
  dashboard.includes('Branch-tier credentials')
    && endpoint.includes('jg_sku_is_branch()')
    && endpoint.includes('/fulfillment/pickup-options')
    && endpoint.includes('/fulfillment/pickup-reschedule')
    && endpoint.includes("'updated_by' => 'Branch tier: '"),
  'Only a Branch-tier session may save live worker rules.'
);
assert(
  shipmentMarkup.includes('data-arrangement-event-overlay')
    && shipmentMarkup.includes('data-arrangement-event-orders')
    && shipmentMarkup.includes('data-arrangement-order-detail')
    && shipmentMarkup.includes('<nav aria-label="Orders in this pickup"')
    && script.includes('data-shipment-group')
    && script.includes('data-shipment-order')
    && script.includes("openPickupInspector('window'")
    && script.includes("openPickupInspector('order'")
    && script.includes('loadPickupEventOrder(0)')
    && script.includes('state.orderDetailCache')
    && script.includes('document.body.append(refs.eventOverlay)')
    && script.includes('data-retry-pickup-order')
    && script.includes("action: 'order-detail'")
    && endpoint.includes('/fulfillment/order-detail'),
  'Every window and individual shipment must open the shared inspector with order details, preparation and retry.'
);
assert(
  dashboard.includes('See the complete decision path')
    && dashboard.includes('Editing these rules never un-pauses Hard Set')
    && dashboard.includes('Instant orders remain manual only')
    && script.includes('pickup_days[key]'),
  'The editor must expose the pickup-day mapping and explain its permanent safety boundary.'
);
assert(
  script.includes('data-zero-decision-preview')
    && script.includes('renderZeroDecisionPreview')
    && script.includes('zero-selection-priority')
    && script.includes('zero-weekday-only')
    && script.includes('weekday-retry-days')
    && script.includes('package-retry-minutes')
    && script.includes('zero-deadline-dropoff')
    && script.includes('zero-weekend-automatic')
    && script.includes('zero-weekend-cutoff')
    && script.includes('zero-weekend-pickup')
    && script.includes("weekend.cutoff || '12:00'")
    && script.includes('due Saturday or Sunday as urgent')
    && script.includes("classList.toggle('is-read-only', !branch)")
    && endpoint.includes("'expected_revision' => (int)"),
  'ZERO Shopee retry, deadline, drop-off, and Weekend Dependent behavior must be visual, interactive, revisioned, and visible before unlock.'
);
assert(
  boardStyles.includes('.shipment-lane')
    && boardStyles.includes('.shipment-now')
    && boardStyles.includes('.shipment-window')
    && boardStyles.includes('.shipment-deadline')
    && boardStyles.includes('@media (max-width: 680px)')
    && boardStyles.includes("html[data-admin-theme='light']")
    && styles.includes('.admin-arrangement-event-dialog')
    && styles.includes('.admin-arrangement-rule-card-grid'),
  'The pickup board must keep responsive themed timeline lanes and the existing inspector and rule editor.'
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
  'Shipment Arrangement must avoid scrolling modals, icon-only pills, and irrelevant attention panels.'
);
assert(
  !shipmentStyles.includes('gradient(') && !boardStyles.includes('gradient('),
  'Shipment Arrangement must use flat fills without gradients.'
);

console.log('shipment-arrangement-ui-test: ok');
