const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '..');
const partner = fs.readFileSync(`${root}/partner-stock-orders.js`, 'utf8');
const page = fs.readFileSync(`${root}/partner-stock-orders/index.php`, 'utf8');
const notifications = fs.readFileSync(`${root}/partner-billing-notifications.js`, 'utf8');

assert.match(page, /Shipment orders/);
assert.match(page, /Balance requests/);
assert.match(page, /Partner balances/);
assert.match(partner, /Copy-ready shipping/);
assert.match(partner, /Status timeline/);
assert.match(partner, /Paid from balance/);
assert.match(partner, /data-label-form/);
assert.match(partner, /Upload label · Send to Store Ops/);
assert.match(partner, /ps-product-card/);
assert.match(notifications, /balance_deposit/);
assert.match(notifications, /stock_order/);
assert.match(notifications, /approve_deposit/);
assert.match(notifications, /investigate_deposit/);
assert.match(notifications, /reject_deposit/);

console.log('Partner Class B UI tests passed.');
