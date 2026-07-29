const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const historyPage = fs.readFileSync(path.join(root, 'whatsapp-order-history', 'index.php'), 'utf8');
const detailPage = fs.readFileSync(path.join(root, 'whatsapp-order', 'index.php'), 'utf8');
const historyScript = fs.readFileSync(path.join(root, 'whatsapp-order-history.js'), 'utf8');
const detailScript = fs.readFileSync(path.join(root, 'whatsapp-order-detail.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'whatsapp-order-history.css'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'whatsapp-orders', 'index.php'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'whatsapp-orders-bootstrap.php'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const builderPage = fs.readFileSync(path.join(root, 'whatsapp-orders', 'index.php'), 'utf8');
const builderScript = fs.readFileSync(path.join(root, 'whatsapp-orders.js'), 'utf8');

assert.match(historyPage, /All direct-order records[\s\S]*?data-history-summary="orders"[\s\S]*?data-history-body/, 'History page must expose a complete ledger and summary.');
assert.match(historyPage, /data-history-search[\s\S]*?data-history-status-filter[\s\S]*?data-history-previous[\s\S]*?data-history-next/, 'History ledger must support search, status filters, and pagination.');
assert.match(historyScript, /action: 'history'/, 'History rows must load the paginated history API.');
assert.match(historyScript, /whatsapp-order\/\?order=[\s\S]*?data-order-url/, 'History rows must open dedicated detail pages.');
assert.match(detailPage, /Ordered items[\s\S]*?Unit price[\s\S]*?Gross[\s\S]*?Discount[\s\S]*?Net/, 'Detail page must show the complete item price breakdown.');
assert.match(detailPage, /Delivery details[\s\S]*?Cost and margin[\s\S]*?Order timing/, 'Detail page must include customer, economics, and lifecycle context.');
assert.match(detailPage, /data-detail-invoice-link[^>]*>Print invoice/, 'Detail page must provide the Store Ops invoice action.');
assert.match(detailPage, /data-detail-cancel[^>]*>Cancel order/, 'Detail page must provide cancellation for listed WhatsApp orders.');
assert.match(detailScript, /invoicePrinterUrl[\s\S]*?order_id[\s\S]*?print[\s\S]*?refs\.invoice\.href/, 'Invoice action must pass the order ID into the auto-print route.');
assert.match(detailScript, /order\.status !== 'IS_LISTED'[\s\S]*?action=cancel[\s\S]*?order_id: orderId/, 'Cancellation must be offered only while listed and submitted to the protected API.');
assert.match(detailScript, /unit_cogs[\s\S]*?discount_total[\s\S]*?line_total[\s\S]*?action: 'order'/, 'Detail client must calculate from saved line economics.');
assert.match(api, /action === 'history'[\s\S]*?jg_whatsapp_order_history[\s\S]*?action === 'order'/, 'WhatsApp API must expose history and single-order reads.');
assert.match(api, /action === 'cancel'[\s\S]*?jg_whatsapp_cancel_order/, 'WhatsApp API must expose authenticated order cancellation.');
assert.match(bootstrap, /function jg_whatsapp_order_history[\s\S]*?COUNT\(\*\)[\s\S]*?LIMIT/, 'History backend must paginate over all matching orders.');
assert.match(bootstrap, /function jg_whatsapp_cancel_order[\s\S]*?action=cancel[\s\S]*?SET status = "CANCELLED"/, 'Executive cancellation must be authorized atomically by Store Ops before changing the order record.');
assert.match(nav, /'whatsapp-history'[\s\S]*?Full direct-order ledger and details/, 'Executive quick navigation must expose WhatsApp History.');
assert.match(builderPage, /href="\.\.\/whatsapp-order-history\/"[^>]*>View all history/, 'The order builder must link to the full history page.');
assert.match(builderScript, /href="\.\.\/whatsapp-order\/\?order=/, 'Recent order cards must link to the dedicated detail page.');
assert.match(styles, /\.whatsapp-history-row:hover[\s\S]*?\.whatsapp-detail-items-table/, 'History and detail views must share a polished responsive visual system.');

console.log('whatsapp-order-history-ui-test: ok');
