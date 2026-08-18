const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'profit-and-loss', 'pnl.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'profit-and-loss', 'index.php'), 'utf8');

assert.match(
  script,
  /const partnerPayments = numeric\(books, \['partner_payments'\]\);[\s\S]*?const otherIncome = numeric\(books, \['other_income'\]\);[\s\S]*?const revenue = sourceRevenue \+ partnerPayments \+ otherIncome - refunds;/,
  'Partner payments and all other operating income must increase revenue before profit is calculated.'
);
assert.match(
  script,
  /bridgeRow\('Seller-received sales'[\s\S]*?bridgeRow\('Partner payments'[\s\S]*?bridgeRow\('Net revenue'/,
  'The statement must identify partner payments inside the revenue section.'
);
assert.match(script, /netProfit: grossProfit - opex/, 'Income must not be added to profit below gross profit.');
assert.doesNotMatch(script, /bridgeRow\('Other operating income'/, 'Income must not appear below gross profit.');
assert.match(page, /All operating revenue received/, 'The revenue KPI must describe its complete operating-income basis.');

console.log('Profit and loss partner revenue UI checks passed.');
