const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/inventory-recap/index.php'), 'utf8');

assert.match(dashboard, /data-view-panel="inventory-recap"[\s\S]*Reorder triggers[\s\S]*data-inventory-filter="triggered"[\s\S]*Needs purchase/);
assert.match(dashboard, /Automatic triggers learn from 90 days of demand/);
assert.match(dashboard, /data-inventory-recap-manual/);
assert.match(dashboard, /75% order 19 ÷ MOQ 11 → buy 22/);
assert.match(dashboard, /data-view-panel="purchase-order"[\s\S]*MOQ-ready purchase plan[\s\S]*data-purchase-plan-download/);

assert.match(script, /data-inventory-automatic/);
assert.match(script, /data-inventory-manual-trigger/);
assert.match(script, /data-inventory-moq/);
assert.match(dashboard, /data-inventory-global-days-form[\s\S]*Order days · all products/);
assert.match(script, /data-inventory-global-days/);
assert.match(script, /Math\.ceil\(entered \/ moq\) \* moq/);
assert.match(script, /saveInventorySettings/);
assert.match(script, /Trigger model: 25% of the flat monthly average/);
assert.match(script, /buildSimplePdf\('Jenang Gemi - Recommended Stock Purchase'/);
assert.doesNotMatch(script, /inventoryRecapDays|current_days_remaining/);

assert.match(api, /update_settings/);
assert.match(api, /purchase_moq = :purchase_moq/);
assert.match(api, /update_purchase_days/);
assert.doesNotMatch(api, /sku_skus[\s\S]{0,300}purchase_days\s*=/);

assert.match(navigation, /'purchase-order'\s*=>\s*\[[\s\S]*'label'\s*=>\s*'Purchase Plan'/);

const inventoryStyles = styles.slice(
  styles.indexOf('/* Inventory coverage and editable purchase plan */'),
  styles.indexOf(":root[data-admin-theme='light'] .admin-wallet-command")
);
assert.ok(inventoryStyles.length > 1000, 'Inventory overhaul styles should exist.');
assert.doesNotMatch(inventoryStyles, /gradient\s*\(/i);
assert.match(inventoryStyles, /\.admin-inventory-trigger-row/);
assert.match(inventoryStyles, /\.admin-inventory-auto-switch/);
assert.match(inventoryStyles, /@media \(max-width: 560px\)/);

console.log('inventory-recap-ui-test: ok');
