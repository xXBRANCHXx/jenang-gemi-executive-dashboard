const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'sku-db.js'), 'utf8');

assert(
  js.includes('formatCogsMoney(row.cogs ?? 0)'),
  'The SKU list must render current COGS with Rp notation.'
);
assert(
  js.includes('formatCogsMoney(queuedChange.new_price ?? 0)'),
  'The SKU list must render scheduled COGS with Rp notation.'
);
assert(
  js.includes('class="admin-sku-rupiah-input"') && js.includes('formatRupiahInput(row.sale_price ?? 0)'),
  'The editable Sale column must display an Rp-prefixed formatted value.'
);
assert(
  js.includes(".replace(/^rp\\s*/i, '')") && js.includes("raw.replace(/\\./g, '').replace(',', '.')"),
  'Sale editing must accept Rp notation and Indonesian number separators.'
);

console.log('SKU money UI tests passed.');
