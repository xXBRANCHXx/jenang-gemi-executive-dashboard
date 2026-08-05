const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const pages = [
  ['Product Costs', read('product-costs', 'index.php')],
  ['Partner Profile', read('partner-profile', 'index.php')],
  ['Partner Sales', read('partner-sales', 'index.php')],
  ['Affiliate Profile', read('affiliate-profile', 'index.php')],
  ['WhatsApp Order', read('whatsapp-order', 'index.php')],
  ['Product Flavor Detail', read('dashboard', 'product-flavors', 'index.php')],
];

pages.forEach(([label, source]) => {
  assert.match(source, /class="[^"]*admin-back-icon-(?:link|button)[^"]*"/, `${label} must use the shared back control.`);
  assert.match(source, /aria-label="(?:Go back|Back to [^"]+)"/, `${label} must give its back control an accessible label.`);
});

const dashboard = read('dashboard', 'index.php');
assert.match(dashboard, /admin-back-icon-button admin-purchase-back/, 'Purchasing views must use the shared back control.');
assert.match(dashboard, /admin-back-icon-button admin-website-back-button/, 'Website detail views must use the shared back control.');

const styles = read('admin.css');
assert.match(styles, /\.admin-back-icon-link,[\s\S]*?width: 42px;[\s\S]*?border-radius: 50%;[\s\S]*?background: var\(--admin-surface\);/, 'The shared back control must retain its standard circular dimensions and surface.');

console.log('Back button UI tests passed.');
