const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'profit-loss', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'profit-loss', 'accounting.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

const expect = (condition, message) => {
  if (condition) return;
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

expect(html.includes('data-accounting-reconcile-form'), 'Accounting must expose the cash reconciliation form.');
expect(html.includes('data-accounting-marketplace-open'), 'Marketplace outstanding must open a visual breakdown.');
expect(html.includes('data-accounting-bills-open="due"'), 'Bills Due must be an interactive drill-down.');
expect(html.includes('data-accounting-bills-open="overdue"'), 'Overdue must be an interactive drill-down.');
expect(html.includes('data-accounting-wallet-breakdown'), 'Accounting must show a compact wallet balance strip.');
expect(html.includes('data-accounting-ledger-body'), 'Accounting must expose the unified activity ledger.');
expect(html.includes('class="admin-accounting-more'), 'Secondary entry details must stay collapsed by default.');

expect(script.includes('let resettingForm = false'), 'Form reset must be guarded against recursive dropdown clearing.');
expect(script.includes('if (resettingForm) return;'), 'The reset event must ignore programmatic resets.');
expect(script.includes('restorePendingEntry()'), 'Refreshes must preserve an entry already being typed.');
expect(script.includes("buildUrl('activity_ledger'"), 'The UI must load manual and automatic ledger rows together.');
expect(script.includes("action: 'reconcile_cash'"), 'The reconciliation UI must post an auditable baseline.');

expect(css.includes('.admin-accounting-pulse'), 'The cash-first visual hierarchy must be styled.');
expect(css.includes('.admin-accounting-wallet-strip'), 'Compact wallet balances must be styled.');
expect(css.includes('.admin-accounting-ledger-row'), 'Visual ledger rows must be styled.');

process.stdout.write('accounting-overhaul-ui-test: ok\n');
