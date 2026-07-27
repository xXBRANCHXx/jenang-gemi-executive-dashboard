const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'whatsapp-orders', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'whatsapp-orders.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'whatsapp-orders-bootstrap.php'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');

assert.match(nav, /'overview' => \['whatsapp-orders'/, 'The homepage hamburger menu must lead with WhatsApp Orders.');
assert.match(page, /name="shipping_cost"[\s\S]*?Saved for Executive metrics only/, 'The builder must capture shipping cost with its metric-only scope.');
assert.match(page, /name="label"[\s\S]*?deadline_hours/, 'The order must follow the Partner label and deadline flow.');
assert.match(script, /items: \[\.\.\.state\.cart\.values\(\)\][\s\S]*?action=create/, 'The builder must submit constructed SKU lines.');

const payloadStart = bootstrap.indexOf('function jg_whatsapp_store_ops_payload');
const payloadEnd = bootstrap.indexOf('function jg_whatsapp_publish_order', payloadStart);
const outboundPayload = bootstrap.slice(payloadStart, payloadEnd);
assert.ok(outboundPayload.includes("'status' => 'IS_LISTED'"), 'Store Ops must receive a listed order.');
assert.ok(!outboundPayload.includes("'shipping_cost'"), 'Shipping cost must never be included in the Store Ops payload.');
assert.ok(!outboundPayload.includes("'unit_price'"), 'Executive sale prices must stay out of the Store Ops fulfillment payload.');

console.log('whatsapp-orders-ui-test: ok');
