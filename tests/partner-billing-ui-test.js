const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'partner-billing-notifications.js'), 'utf8');
const billingApi = fs.readFileSync(path.join(root, 'api', 'partner-billing', 'index.php'), 'utf8');
const accounting = fs.readFileSync(path.join(root, 'accounting-bootstrap.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

for (const source of [nav, dashboard]) {
  assert.match(source, /data-billing-notification-toggle/, 'Every admin chrome variant should use partner billing notifications.');
  assert.doesNotMatch(source, /data-notification-toggle/, 'The visible notification trigger should no longer activate website-order verification.');
}
assert.match(notifications, /paid their weekly bill/, 'Payment notifications should name the partner and weekly period.');
assert.match(notifications, /Check proof of payment/, 'Payment notification helper copy should be explicit.');
assert.match(notifications, /accept_dispute[\s\S]*Investigate/, 'Dispute notifications should offer Accept and Investigate.');
assert.match(notifications, /data-billing-adjust-price[\s\S]*Apply adjusted prices/, 'Investigation should expose every product price as an editable value.');
assert.match(notifications, /Accept proposed prices[\s\S]*Reject dispute/, 'Price disputes should support accepting the proposal or rejecting it after investigation.');
assert.match(billingApi, /adjust_dispute[\s\S]*jg_admin_partner_billing_adjust_dispute/, 'Admin price adjustments should flow through the authenticated billing API.');
assert.match(notifications, /application\/pdf[\s\S]*<object/, 'PDF payment proof should render in an inline preview.');
assert.match(notifications, /partner-billing:confirmed/, 'Accounting should be notified immediately after confirmation.');
assert.match(billingApi, /dispute_history[\s\S]*jg_admin_partner_billing_dispute_history/, 'The billing API should expose authenticated dispute history to Partner Sales.');
assert.match(accounting, /billsDueSoon = \$accountingBillsDueSoon \+ \$partnerBillsDue/, 'Unpaid partner bills should count toward Bills Due.');
assert.match(accounting, /safeCash = \$realCash - \$accountingBillsDueSoon - \$overdueBills/, 'Partner receivables should not be subtracted from Safe Cash as liabilities.');
assert.match(accounting, /accounting_partner_bill_receipts/, 'Confirmed partner cash should be idempotently mapped to Accounting.');
assert.match(styles, /\.admin-billing-proof-close\s*\{[\s\S]*border:\s*0[\s\S]*background:\s*transparent/, 'Proof preview close should be a real icon without a pill.');
assert.match(styles, /\.admin-billing-avatar[\s\S]*\.admin-billing-avatar > img/, 'Partner favicons should have a styled notification slot and fallback.');

console.log('Admin partner billing UI checks passed.');
