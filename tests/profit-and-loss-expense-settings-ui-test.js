const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'profit-and-loss', 'pnl.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'profit-and-loss', 'index.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

assert.match(page, /data-pnl-edit-expenses/, 'Expense mix must expose category settings.');
assert.match(page, /data-pnl-expense-dialog/, 'P&L must provide an Accounting-category settings dialog.');
assert.match(script, /state\.categorySettings = Array\.isArray\(accounting\.category_settings\)/, 'Every Accounting category returned by the API must populate the settings editor.');
assert.match(script, /data-pnl-category-include/, 'Every category must expose an include/exclude toggle.');
assert.match(script, /data-pnl-category-bucket/, 'Every category must expose an editable P&L treatment.');
assert.match(script, /action: 'save_pnl_category_settings'/, 'Category settings must persist through Accounting.');
assert.match(styles, /\.pnl-category-toggle input:checked \+ span[\s\S]*?#4ade80/, 'Included category toggles must display in green.');

assert.match(script, /const productCosts = numeric\(books, \['product_costs', 'product_purchases'\]\);/, 'PO/product costs must come from Accounting.');
assert.match(script, /const packingCosts = numeric\(books, \['packing_costs'\]\);/, 'Actual packing cost must come from Accounting.');
assert.doesNotMatch(script, /const cogs = numeric\(sale, \['cogs'\]\)/, 'P&L must not use sales-service estimated SKU COGS.');
assert.doesNotMatch(script, /const packing = numeric\(sale, \['packing_cost'\]\)/, 'P&L must not use sales-service per-item packing estimates.');
assert.match(script, /netProfit: revenue - productCosts - packingCosts - opex/, 'Net Profit must use the direct revenue-minus-actual-costs formula.');
assert.doesNotMatch(script, /netProfit: grossProfit - opex/, 'Net Profit must never be derived from Gross Profit.');
assert.match(page, /It does not use an imported or estimated Gross Profit value\./, 'The page must disclose the direct Net Profit basis.');

console.log('Profit and loss expense category settings UI checks passed.');
