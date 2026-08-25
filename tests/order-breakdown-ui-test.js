const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'order/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'order/order-breakdown.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'order/order-breakdown.css'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/orders/index.php'), 'utf8');

assert.match(page, /data-order-breakdown[\s\S]*data-order-net[\s\S]*data-order-cogs[\s\S]*data-order-packing[\s\S]*data-order-gp/);
assert.match(page, /Net revenue − COGS − packing/);
assert.doesNotMatch(page, /Back to Inventory Recap|data-back|history\.back/, 'The new-tab order page must not create a return flow that opens more Inventory Recap tabs.');
assert.match(script, /action: 'order_detail'[\s\S]*order_id: orderId/);
assert.match(script, /coverage\.complete[\s\S]*missing COGS[\s\S]*missing packing cost/);
assert.match(script, /item\.net_revenue[\s\S]*item\.cogs[\s\S]*item\.packing_cost[\s\S]*item\.estimated_gross_profit/);
assert.match(styles, /\.admin-order-economics[\s\S]*grid-template-columns: repeat\(4/);
assert.match(styles, /\.admin-order-breakdown-loading\[hidden\][\s\S]*display: none !important/, 'The loading skeleton must disappear after the order loads.');
assert.match(script, /const timelineIcon[\s\S]*pickup_window[\s\S]*pickup_confirmed[\s\S]*funds/);
assert.match(script, /admin-order-timeline-marker[\s\S]*admin-order-timeline-copy/);
assert.match(script, /nextIndex[\s\S]*completedCount[\s\S]*Next milestone[\s\S]*milestones done/);
assert.match(script, /milestoneState === 'done' \? 'Done'[\s\S]*'Next'[\s\S]*'Current'[\s\S]*'Upcoming'/);
assert.match(styles, /\.admin-order-timeline::before[\s\S]*linear-gradient/, 'Timeline events must be connected by a visible lifecycle rail.');
assert.match(styles, /\.admin-order-current-state[\s\S]*admin-order-current-pulse[\s\S]*\.admin-order-next-state/);
assert.match(api, /function jg_orders_order_detail_from_rows[\s\S]*estimated_gross_profit'[\s\S]*\$netRevenue - \$cogs - \$packing/);
assert.match(api, /function jg_orders_optional_fulfillment_detail[\s\S]*\/fulfillment\/order-detail/);

console.log('order-breakdown-ui-test: ok');
