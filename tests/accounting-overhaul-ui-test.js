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
expect(html.includes('data-accounting-partner-bills-open="in_progress"'), 'Partner Bills In Progress must be an interactive drill-down.');
expect(html.includes('data-accounting-partner-bills-open="due"'), 'Partner Bills Due must be an interactive drill-down.');
expect(html.includes('data-accounting-wallet-breakdown'), 'Accounting must show a compact wallet balance strip.');
expect(html.includes('data-accounting-ledger-body'), 'Accounting must expose the unified activity ledger.');
expect(html.includes('class="admin-accounting-more'), 'Secondary entry details must stay collapsed by default.');
expect(html.includes('data-accounting-kpi="bank-balance"'), 'Accounting must show bank balance separately.');
expect(html.includes('data-accounting-kpi="cash-available"'), 'Accounting must show physical available cash separately.');
expect(html.includes('data-accounting-account-settings'), 'Accounting must allow future payment and receipt accounts to be configured.');
expect(html.includes('data-accounting-category-search'), 'The primary category selector must have live search.');
expect(html.indexOf('data-accounting-category-menu') < html.indexOf('data-accounting-category-search'), 'Category search must live inside the dropdown menu.');
expect(!html.includes('data-accounting-category-select'), 'Category selection must not use an expanded native select.');

expect(script.includes('let resettingForm = false'), 'Form reset must be guarded against recursive dropdown clearing.');
expect(script.includes('if (resettingForm) return;'), 'The reset event must ignore programmatic resets.');
expect(script.includes('restorePendingEntry()'), 'Refreshes must preserve an entry already being typed.');
expect(script.includes("buildUrl('activity_ledger'"), 'The UI must load manual and automatic ledger rows together.');
expect(script.includes("action: 'reconcile_cash'"), 'The reconciliation UI must post an auditable baseline.');
expect(script.includes('accountOptionsForRole'), 'Paid-from and received-into options must be filtered by account role.');
expect(script.includes("String(account.type || '') !== 'marketplace_wallet'"), 'Marketplace wallets must never appear as entry accounts.');
expect(script.includes("action: 'save_account'"), 'Account role settings must persist through the Accounting API.');
expect(script.includes("searchInput.matches('[data-accounting-category-search]')"), 'Category results must filter live as the user types.');
expect(script.includes('categoryComboboxMarkup(item.category_id)'), 'Correction forms must use the same searchable category dropdown.');

expect(css.includes('.admin-accounting-pulse'), 'The cash-first visual hierarchy must be styled.');
expect(css.includes('.admin-accounting-wallet-strip'), 'Compact wallet balances must be styled.');
expect(css.includes('.admin-accounting-ledger-row'), 'Visual ledger rows must be styled.');
expect(css.includes('.admin-accounting-category-menu'), 'The in-dropdown category search menu must be styled.');
expect(/\.admin-accounting-breakdown-body\s*\{[^}]*overflow-y:\s*auto/.test(css), 'Long Accounting breakdowns must scroll inside the modal.');

process.stdout.write('accounting-overhaul-ui-test: ok\n');
