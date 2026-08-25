const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'profit-and-loss', 'pnl.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'profit-and-loss', 'index.php'), 'utf8');
const settingsPage = fs.readFileSync(path.join(root, 'profit-and-loss', 'expense-settings', 'index.php'), 'utf8');
const settingsScript = fs.readFileSync(path.join(root, 'profit-and-loss', 'expense-settings', 'expense-settings.js'), 'utf8');
const settingsStyles = fs.readFileSync(path.join(root, 'profit-and-loss', 'expense-settings', 'expense-settings.css'), 'utf8');
const accountingApi = fs.readFileSync(path.join(root, 'api', 'accounting', 'index.php'), 'utf8');

assert.match(page, /href="\.\/expense-settings\/"/, 'Expense mix must link to a dedicated settings page.');
assert.doesNotMatch(page, /data-pnl-expense-dialog/, 'Hundreds of Accounting categories must not be forced into a popup dialog.');
assert.match(settingsPage, /data-pnl-expense-page/, 'P&L must provide a full-page Accounting-category editor.');
assert.match(settingsPage, /data-expense-search/, 'The category settings page must be searchable by name or account code.');
assert.match(settingsPage, /data-expense-inclusion-filter/, 'The category settings page must filter included and excluded categories.');
assert.match(settingsScript, /action=pnl_category_settings/, 'The page must load all Accounting category settings directly.');
assert.match(accountingApi, /\$action === 'pnl_category_settings'/, 'Accounting must expose the dedicated category-settings read endpoint.');
assert.match(settingsScript, /const categoryDisplay = \(category\)/, 'Long imported Accounting labels must be reduced to a compact primary title.');
assert.match(settingsScript, /document\.createElement\('article'\)/, 'Category rows must be built as visible DOM nodes instead of one huge popup HTML string.');
assert.match(settingsScript, /data\.categoryInclude|dataset\.categoryInclude/, 'Every category must expose an include/exclude toggle.');
assert.match(settingsScript, /dataset\.categoryBucket/, 'Every category must expose an editable P&L treatment.');
assert.match(settingsScript, /action: 'save_pnl_category_settings'/, 'Category settings must persist through Accounting.');
assert.match(settingsStyles, /\.pnl-expense-page-toggle input:checked \+ span[\s\S]*?#4ade80/, 'Included category toggles must display in green.');
assert.match(script, /shopee: 'Shopee Ads'/, 'Built-in and imported Shopee advertising categories must share one report title.');
assert.match(script, /key: `platform-ads:/, 'Platform advertising categories must roll up to one expense row instead of rendering separately.');
assert.match(script, /existing\.amount \+= category\.amount/, 'A rolled-up expense must sum every matching Accounting category amount.');

assert.match(script, /const productCosts = numeric\(books, \['product_costs', 'product_purchases'\]\);/, 'PO/product costs must come from Accounting.');
assert.match(page, /Recorded partial \+ full PO payments only/, 'The PO cost card must disclose that only actual recorded payments are counted.');
assert.match(page, /Unpaid PO balances are excluded\./, 'The P&L must explicitly disclose that unpaid PO balances are excluded.');
assert.match(script, /const packingCosts = numeric\(books, \['packing_costs'\]\);/, 'Actual packing cost must come from Accounting.');
assert.doesNotMatch(script, /const cogs = numeric\(sale, \['cogs'\]\)/, 'P&L must not use sales-service estimated SKU COGS.');
assert.doesNotMatch(script, /const packing = numeric\(sale, \['packing_cost'\]\)/, 'P&L must not use sales-service per-item packing estimates.');
assert.match(script, /netProfit: revenue - productCosts - packingCosts - opex/, 'Net Profit must use the direct revenue-minus-actual-costs formula.');
assert.doesNotMatch(script, /netProfit: grossProfit - opex/, 'Net Profit must never be derived from Gross Profit.');
assert.match(page, /It does not use an imported or estimated Gross Profit value\./, 'The page must disclose the direct Net Profit basis.');

console.log('Profit and loss expense category settings UI checks passed.');
