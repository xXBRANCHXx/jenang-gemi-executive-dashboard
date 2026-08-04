const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const directory = fs.readFileSync(path.join(root, 'partner-profiles.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'partner-sales', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'partner-sales.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'partner-access.css'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'partner-sales', 'index.php'), 'utf8');

assert.match(directory, /data-partner-sales-url="\.\.\/partner-sales\/\?code=/, 'Partner directory rows should link to the sales breakdown.');
assert.match(directory, /openPartnerSalesFromRow/, 'Clickable rows should support pointer and keyboard navigation.');
assert.match(page, /data-sales-total[\s\S]*data-sales-paid[\s\S]*data-sales-outstanding/, 'The page should show reconciled sales and collection totals.');
assert.match(page, /data-sales-channels[\s\S]*data-sales-products[\s\S]*data-sales-payments/, 'The page should include channel, product, and payment breakdowns.');
assert.match(page, /data-sales-status-filter[\s\S]*Partially paid/, 'The order ledger should support settlement filtering.');
assert.match(page, /data-open-disputes[\s\S]*See disputes/, 'The order ledger should expose dispute history.');
assert.match(page, /Choose a weekly window[\s\S]*data-disputes-window-form[\s\S]*data-disputes-list/, 'Dispute history should ask for a weekly window before showing the archive.');
assert.match(script, /record_payment[\s\S]*payment_method[\s\S]*reference_no/, 'Admins should be able to record auditable order payments.');
assert.match(script, /renderChart[\s\S]*renderBreakdowns[\s\S]*renderPayments[\s\S]*renderOrders/, 'The sales page should render all analytical sections.');
assert.match(script, /dispute_history[\s\S]*Screenshot evidence[\s\S]*renderDisputeHistory/, 'The sales page should render weekly dispute messages and screenshots.');
assert.match(api, /partner_order_payments[\s\S]*outstanding_amount/, 'The API should reconcile order values against settlement records.');
assert.match(api, /jg_partner_sales_profile\(\?PDO[\s\S]*partners\.runtime\.json/, 'Partner profiles should retain the production JSON fallback.');
assert.match(api, /jg_partner_sales_store_ops_orders[\s\S]*Authorization: Bearer/, 'Partner orders should use the secure Store Ops service connection when no Partner DB is configured.');
assert.match(api, /\$paymentPdo = analyticsDb\(\)[\s\S]*jg_partner_sales_ensure_schema\(\$paymentPdo\)/, 'Settlements should use the dashboard database that is already configured in production.');
assert.match(styles, /\.partner-sales-back,[\s\S]*border: 0;[\s\S]*background: transparent;/, 'Sales icon controls should be bare, without icon pills.');
assert.match(styles, /\.partner-sales-stat-grid[\s\S]*grid-template-columns: repeat\(5/, 'The desktop summary should use a dense metric grid.');
assert.match(styles, /\.partner-sales-order\.is-cancelled[\s\S]*#ef4444/, 'Cancelled order rows should receive a full-width red treatment.');
assert.match(styles, /\.partner-disputes-card-grid[\s\S]*\.partner-disputes-message[\s\S]*\.partner-disputes-evidence-link/, 'Dispute history should have polished order, conversation, and evidence layouts.');

console.log('Partner Sales UI tests passed.');
