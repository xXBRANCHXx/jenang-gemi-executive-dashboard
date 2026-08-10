const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const accounting = fs.readFileSync(path.join(root, 'accounting-bootstrap.php'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/inventory-recap/index.php'), 'utf8');

assert.match(accounting, /'returned-damaged-goods', 'Returned damaged goods'/);
assert.match(accounting, /o\.tag, o\.placed_by/);
assert.match(accounting, /jg_purchase_orders_accounting_category\(\$payment\)/);
assert.match(api, /jg_purchase_orders_accounting_category\(\$order\)/);
assert.match(api, /category_key = :category_key/);
assert.match(api, /\$poCategory\['description'\]/);

console.log('returned-damaged-goods-accounting-ui-test: ok');
