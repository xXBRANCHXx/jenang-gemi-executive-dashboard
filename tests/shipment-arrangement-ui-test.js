const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const script = fs.readFileSync(path.join(root, 'shipment-arrangement.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const endpoint = fs.readFileSync(path.join(root, 'api', 'shipment-arrangement', 'index.php'), 'utf8');

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
  dashboard.includes('Ship-by deadline')
    && script.includes('admin-arrangement-deadline')
    && script.includes('admin-arrangement-pickup')
    && script.includes('admin-arrangement-policy-block'),
  'The map must distinguish deadlines, pickup slots, and automatic windows.'
);
assert(
  script.includes("state.type = button.dataset.arrangementType")
    && script.includes("state.platform = button.dataset.arrangementPlatform")
    && script.includes('state.weekStart = addDays'),
  'The visual map must support platform, order type, and week navigation.'
);
assert(
  dashboard.includes('Branch-tier credentials')
    && endpoint.includes('jg_sku_is_branch()')
    && endpoint.includes("'updated_by' => 'Branch tier: '"),
  'Only a Branch-tier session may save live worker rules.'
);
assert(
  dashboard.includes('Instant orders always remain manual')
    && dashboard.includes('Marketplace availability determines the final pickup slot'),
  'The editor must explain the immutable Instant and marketplace-slot guardrails.'
);
assert(
  styles.includes('.admin-arrangement-day-track')
    && styles.includes('.admin-arrangement-rule-grid.is-tiktok')
    && styles.includes('@media (max-width: 680px)'),
  'The timetable and policy editor must have responsive visual styling.'
);

console.log('shipment-arrangement-ui-test: ok');
