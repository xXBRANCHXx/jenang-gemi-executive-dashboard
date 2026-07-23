const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'profit-loss', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'profit-loss', 'accounting.js'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

expect(html.includes('data-accounting-cash-history-open'), 'Cash Available must expose a history trigger.');
expect(html.includes('data-accounting-cash-history-body'), 'Cash history must include the spreadsheet body.');
expect(html.includes('<th>Date</th>') && html.includes('<th>Reason</th>'), 'Cash history must label date and reason columns.');
expect(html.includes('>Added</th>') && html.includes('>Subtracted</th>'), 'Cash history must separate additions and subtractions.');
expect(script.includes("buildUrl('cash_history'"), 'Cash history must load the reconciled API endpoint.');
expect(script.includes('data-accounting-cash-history-search'), 'Cash history must support searching.');
expect(script.includes("direction === 'added'") && script.includes("direction === 'subtracted'"), 'Cash history must support movement filters.');

console.log('accounting-cash-history-ui-test: ok');
