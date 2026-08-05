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
expect(html.includes('data-accounting-marketplace-open'), 'Expected receivables must open a visual breakdown.');
expect(html.includes('data-accounting-liquidity-assets-bar'), 'Accounting must expose a liquid-assets composition bar.');
expect(!html.includes('data-accounting-liquidity-outflow-bar'), 'Going Out must not be rendered as a misleading full-width second bar.');
expect(html.includes('data-accounting-kpi="liquid-assets"'), 'Accounting must lead with total liquid assets.');
expect(html.includes('unpaid partner bills'), 'Accounting must explain that unpaid partner bills are expected money.');
expect(html.includes('data-accounting-ledger-body'), 'Accounting must expose the unified activity ledger.');
expect(html.includes('class="admin-accounting-more'), 'Secondary entry details must stay collapsed by default.');
expect(html.includes('data-accounting-kpi="available-now"'), 'Accounting must group bank and physical cash as available now.');
expect(html.includes('data-accounting-kpi="expected-total"'), 'Accounting must group expected marketplace and partner receivables.');
expect((html.match(/admin-liquidity-metric-icon/g) || []).length === 3, 'Each liquid asset overview card must have a category icon.');
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
expect(script.includes('<small>Ready to withdraw</small>'), 'Expected-money breakdowns must distinguish withdrawable cash from outstanding orders.');
expect(script.includes('data-accounting-receivable-partner="due"'), 'Unpaid partner bills must drill down from expected receivables.');
expect(script.includes("openBillsBreakdown('scheduled')"), 'Scheduled outflow must open supplier bill details.');
expect(script.includes('purchase_order_outflow?.orders'), 'Going Out must render existing purchase-order balances.');
expect(script.includes('POs left to pay'), 'The red bar must label remaining PO payments clearly.');
expect(script.includes('admin-liquidity-commitment-overlay'), 'Going Out must occupy a proportional section of the liquid-assets bar.');
expect(script.includes('reservedOutflow / total'), 'The Going Out overlay must be scaled against total liquid assets.');
expect(script.includes('../dashboard/?view=po-detail&amp;po='), 'Purchase-order outflow rows must open the matching PO breakdown.');
expect(script.includes("searchInput.matches('[data-accounting-category-search]')"), 'Category results must filter live as the user types.');
expect(script.includes('categoryComboboxMarkup(item.category_id)'), 'Correction forms must use the same searchable category dropdown.');

expect(css.includes('.admin-liquidity-overview'), 'The liquid-assets visual hierarchy must be styled.');
expect(css.includes('.admin-liquidity-tooltip'), 'Hover and keyboard-focus chart breakdowns must be styled.');
expect(css.includes(':has(.admin-liquidity-segment:hover)'), 'Hovering the liquid-assets bar must de-emphasize the other segments.');
expect(/filter:\s*grayscale\(1\)/.test(css), 'Inactive chart segments must fade to gray during inspection.');
expect(!/\.admin-liquidity-bar\s*\{[^}]*border:[^;]*#eab308/.test(css), 'The liquid-assets bar must not use a yellow outer stroke.');
expect(css.includes('.admin-accounting-ledger-row'), 'Visual ledger rows must be styled.');
expect(css.includes('.admin-accounting-category-menu'), 'The in-dropdown category search menu must be styled.');
expect(/\.admin-accounting-breakdown-body\s*\{[^}]*overflow-y:\s*auto/.test(css), 'Long Accounting breakdowns must scroll inside the modal.');

process.stdout.write('accounting-overhaul-ui-test: ok\n');
