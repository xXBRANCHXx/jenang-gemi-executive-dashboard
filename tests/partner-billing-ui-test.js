const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'partner-billing-notifications.js'), 'utf8');
const billingApi = fs.readFileSync(path.join(root, 'api', 'partner-billing', 'index.php'), 'utf8');
const accounting = fs.readFileSync(path.join(root, 'accounting-bootstrap.php'), 'utf8');
const accountingPage = fs.readFileSync(path.join(root, 'profit-loss', 'index.php'), 'utf8');
const accountingUi = fs.readFileSync(path.join(root, 'profit-loss', 'accounting.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

for (const source of [nav, dashboard]) {
  assert.match(source, /data-billing-notification-toggle/, 'Every admin chrome variant should use the unified notification feed.');
  assert.match(source, />Notifications</, 'The visible review drawer must be called Notifications.');
  assert.doesNotMatch(source, />Partner billing</, 'Notification chrome must not be presented as Partner billing.');
  assert.doesNotMatch(source, /data-notification-toggle/, 'The visible notification trigger should no longer activate website-order verification.');
}
assert.match(notifications, /period_type === 'calendar_month'[\s\S]*'monthly'[\s\S]*'calendar-week'/, 'Payment notifications should name the partner-specific billing period.');
assert.match(notifications, /Check proof of payment/, 'Payment notification helper copy should be explicit.');
assert.match(notifications, /accept_dispute[\s\S]*Investigate/, 'Dispute notifications should offer Accept and Investigate.');
assert.match(notifications, /data-billing-adjust-price[\s\S]*Apply adjusted prices/, 'Investigation should expose every product price as an editable value.');
assert.match(notifications, /Accept proposed prices[\s\S]*Reject dispute/, 'Price disputes should support accepting the proposal or rejecting it after investigation.');
assert.match(billingApi, /adjust_dispute[\s\S]*jg_admin_partner_billing_adjust_dispute/, 'Admin price adjustments should flow through the authenticated billing API.');
assert.match(notifications, /application\/pdf[\s\S]*<object/, 'PDF payment proof should render in an inline preview.');
assert.match(notifications, /partner-billing:confirmed/, 'Accounting should be notified immediately after confirmation.');
assert.match(notifications, /reconcileList[\s\S]*data-billing-event-id/, 'Background billing refreshes should reconcile notification rows by stable event ID.');
assert.match(notifications, /eventVersion\(previousSelected\)[\s\S]*eventVersion\(nextSelected\)/, 'An open proof must stay mounted when polling returns unchanged data.');
assert.match(billingApi, /dispute_history[\s\S]*jg_admin_partner_billing_dispute_history/, 'The billing API should expose authenticated dispute history to Partner Sales.');
assert.match(accounting, /expectedTotal = \$walletReady \+ \$marketplaceOutstandingAmount \+ \$partnerBillsDue/, 'Unpaid partner bills should count toward expected liquid assets.');
assert.match(accounting, /billsDueSoon = \$accountingBillsDueSoon;/, 'Partner receivables must stay out of supplier bills due.');
assert.match(accounting, /safeCash = \$realCash - \$accountingBillsDueSoon - \$overdueBills/, 'Partner receivables should not be subtracted from Safe Cash as liabilities.');
assert.match(accounting, /accounting_partner_bill_receipts/, 'Confirmed partner cash should be idempotently mapped to Accounting.');
assert.match(accounting, /DATE_SUB\(:transaction_date_start[\s\S]*DATE_ADD\(:transaction_date_end/, 'Transaction duplicate review must use unique native-MySQL placeholders during payment confirmation.');
assert.doesNotMatch(accounting, /DATE_SUB\(:transaction_date,[\s\S]{0,80}DATE_ADD\(:transaction_date,/, 'Payment confirmation must not reuse one named placeholder twice.');
assert.match(accountingPage, /Expected[\s\S]*unpaid partner bills/, 'Accounting should present unpaid partner bills as expected money.');
assert.match(accountingUi, /kpis\?\.partner_bills_due[\s\S]*kpis\?\.partner_bills_in_progress/, 'The expected-money overview should keep issued and accruing partner totals separate.');
assert.match(accountingUi, /period_type === 'calendar_month'[\s\S]*'Calendar month'[\s\S]*'Calendar week'/, 'Accounting must label each receivable using its partner-specific billing period.');
assert.match(accountingUi, /scope === 'in_progress'[\s\S]*status === 'accruing'/, 'The bill list should filter accruing periods from bills that are due.');
assert.match(accountingUi, /action[^\n]*partner_bills|buildUrl\('partner_bills'/, 'Opening Partner Bills should request the partner bill records.');
assert.match(accountingUi, /data-accounting-partner-bill[\s\S]*data-accounting-partner-order/, 'A partner bill should drill down to its order-level breakdown.');
assert.match(styles, /\.admin-accounting-partner-bill-summary[\s\S]*\.admin-accounting-partner-order/, 'Partner bill totals and order rows should have dedicated responsive styling.');
assert.match(styles, /\.admin-billing-proof-close\s*\{[\s\S]*border:\s*0[\s\S]*background:\s*transparent/, 'Proof preview close should be a real icon without a pill.');
assert.match(styles, /\.admin-billing-avatar[\s\S]*\.admin-billing-avatar > img/, 'Partner favicons should have a styled notification slot and fallback.');

console.log('Admin partner billing UI checks passed.');
