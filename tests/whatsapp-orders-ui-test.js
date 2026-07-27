const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'whatsapp-orders', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'whatsapp-orders.js'), 'utf8');
const dashboardScript = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'whatsapp-orders-bootstrap.php'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');

assert.match(nav, /'overview' => \['whatsapp-orders'/, 'The homepage hamburger menu must lead with WhatsApp Orders.');
assert.match(dashboardScript, /overview: \['whatsapp-orders'/, 'The dashboard client must preserve WhatsApp Orders when rebuilding the hamburger menu.');
assert.match(page, /name="shipping_cost"[\s\S]*?Saved for Executive metrics only/, 'The builder must capture shipping cost with its metric-only scope.');
assert.match(page, /name="label"[\s\S]*?deadline_hours/, 'The order must follow the Partner label and deadline flow.');
assert.match(page, /data-company-filter[\s\S]*?data-product-filter[\s\S]*?data-flavor-filter[\s\S]*?Order preview/, 'Product entry must separate products by company before flavor filtering.');
assert.match(script, /items: \[\.\.\.state\.cart\.values\(\)\][\s\S]*?action=create/, 'The builder must submit constructed SKU lines.');
assert.match(script, /data-cart-delta[\s\S]*?renderFilters/, 'The order preview must provide quantity steppers and filtered SKU entry.');
assert.match(script, /sku\.brand_name === company[\s\S]*?whatsapp-product-company-group/, 'Product options must be grouped by company.');
assert.match(script, /class="whatsapp-sku-add"[\s\S]*?\+<\/span> Add/, 'SKU actions must use an inline + Add control.');
assert.match(script, /class="whatsapp-remove-sku"[\s\S]*?<svg/, 'Cart removal must use a bare trash icon.');

const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const whatsappStyles = styles.slice(styles.indexOf('/* WhatsApp order builder */'));
assert.ok(!whatsappStyles.includes('gradient'), 'The WhatsApp order builder must not use gradients.');
assert.match(whatsappStyles, /\.whatsapp-order-hero[\s\S]*?background: var\(--admin-surface\)/, 'The builder hero must use the active dashboard theme surface.');
assert.match(whatsappStyles, /\.whatsapp-order-field-grid input[\s\S]*?background: var\(--admin-surface-soft\)/, 'Form fields must follow the active light or dark theme.');
assert.match(whatsappStyles, /\.whatsapp-range-field,[\s\S]*?border: 0;[\s\S]*?background: transparent;/, 'Deadline and shipping cost controls must not be nested in cards.');
assert.match(whatsappStyles, /\.is-whatsapp-orders-page \.whatsapp-money-field > div,[\s\S]*?background: #fff !important;/, 'The entire shipping cost input must use one solid white surface.');
assert.match(whatsappStyles, /\.whatsapp-sku-card \.whatsapp-sku-add:hover[\s\S]*?color: #2563eb;/, 'The inline Add action must turn blue on hover.');
assert.match(whatsappStyles, /\.whatsapp-cart-row-controls > \.whatsapp-remove-sku:hover[\s\S]*?color: #dc2626;/, 'The bare trash action must turn red on hover.');

const payloadStart = bootstrap.indexOf('function jg_whatsapp_store_ops_payload');
const payloadEnd = bootstrap.indexOf('function jg_whatsapp_publish_order', payloadStart);
const outboundPayload = bootstrap.slice(payloadStart, payloadEnd);
assert.ok(outboundPayload.includes("'status' => 'IS_LISTED'"), 'Store Ops must receive a listed order.');
assert.ok(!outboundPayload.includes("'shipping_cost'"), 'Shipping cost must never be included in the Store Ops payload.');
assert.ok(!outboundPayload.includes("'unit_price'"), 'Executive sale prices must stay out of the Store Ops fulfillment payload.');
assert.match(bootstrap, /current_stock[\s\S]*?only has %d unit/, 'Submission must reject quantities above current SKU stock.');
assert.match(bootstrap, /function jg_whatsapp_merge_sales_summary[\s\S]*?whatsapp_orders_merged/, 'Listed WhatsApp orders must merge into Executive metrics.');

const salesApi = fs.readFileSync(path.join(root, 'api', 'sales', 'index.php'), 'utf8');
const ordersApi = fs.readFileSync(path.join(root, 'api', 'orders', 'index.php'), 'utf8');
assert.match(salesApi, /jg_sales_apply_executive_context[\s\S]*?jg_whatsapp_merge_sales_summary/, 'WhatsApp metrics must be added after historical Executive context so they are not overwritten.');
assert.match(ordersApi, /jg_whatsapp_metric_order_rows/, 'WhatsApp order facts must feed the Executive Orders and hourly metrics path.');

console.log('whatsapp-orders-ui-test: ok');
