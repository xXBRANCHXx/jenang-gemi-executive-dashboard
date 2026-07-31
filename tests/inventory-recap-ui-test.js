const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');

assert.match(dashboard, /data-view-panel="inventory-recap"[\s\S]*data-inventory-filter="critical"[\s\S]*Urgent · under 5 days/);
assert.match(dashboard, /data-view-panel="purchase-order"[\s\S]*Recommended stock purchase[\s\S]*data-purchase-plan-download/);
assert.doesNotMatch(dashboard, /data-inventory-recap-refresh|data-inventory-recap-draft/);

assert.match(script, /Urgent: under 5 days \| Restock soon: 5-10 days/);
assert.match(script, /data-purchase-plan-qty/);
assert.match(script, /buildSimplePdf\('Jenang Gemi - Recommended Stock Purchase'/);
assert.match(script, /isInventoryView = \(view\) => view === 'inventory-recap' \|\| view === 'purchase-order'/);

assert.match(navigation, /'purchase-order'\s*=>\s*\[[\s\S]*'label'\s*=>\s*'Purchase Plan'/);
assert.match(navigation, /'icon'\s*=>\s*'purchase-order'/);

const inventoryStyles = styles.slice(
  styles.indexOf('/* Inventory coverage and editable purchase plan */'),
  styles.indexOf(':root[data-admin-theme=\'light\'] .admin-wallet-command')
);
assert.ok(inventoryStyles.length > 1000, 'Inventory overhaul styles should exist.');
assert.doesNotMatch(inventoryStyles, /gradient\s*\(/i);
assert.match(inventoryStyles, /:root\[data-admin-theme='light'\] \.admin-inventory-recap-view/);
assert.match(inventoryStyles, /@media \(max-width: 760px\)/);

console.log('inventory-recap-ui-test: ok');
