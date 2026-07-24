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
  dashboard.includes('Arranged on → pickup on')
    && script.includes('admin-arrangement-rule-card')
    && script.includes('admin-arrangement-pickup-card')
    && script.includes('admin-arrangement-deadline-card'),
  'The primary view must show arranged-day to pickup-day rules and the actual marketplace schedule.'
);
assert(
  script.includes("state.platform = button.dataset.arrangementPlatform")
    && script.includes('state.weekStart = addDays'),
  'The visual planner must support platform and week navigation.'
);
assert(
  dashboard.includes('Branch-tier credentials')
    && endpoint.includes('jg_sku_is_branch()')
    && endpoint.includes("'updated_by' => 'Branch tier: '"),
  'Only a Branch-tier session may save live worker rules.'
);
assert(
  dashboard.includes('If the selected day is unavailable, the worker stops safely')
    && dashboard.includes('Manual arrangement only')
    && script.includes('pickup_days[key]'),
  'The editor must expose the pickup-day mapping and explain its fail-closed behavior.'
);
assert(
  styles.includes('.admin-arrangement-rule-summary')
    && styles.includes('.admin-arrangement-schedule-day')
    && styles.includes('.admin-arrangement-pickup-editor')
    && styles.includes('@media (max-width: 680px)'),
  'The minimal rule planner, weekly schedule, and editor must have responsive visual styling.'
);
assert(
  !shipmentStyles.includes('gradient('),
  'Shipment Arrangement must use flat fills without gradients.'
);

console.log('shipment-arrangement-ui-test: ok');
