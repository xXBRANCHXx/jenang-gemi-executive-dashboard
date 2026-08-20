const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'profit-and-loss', 'pnl.js'), 'utf8');

assert.match(
  script,
  /const state = \{ year: currentYear, period: String\(currentMonth\),/,
  'The P&L must open on the current month instead of the year-to-date period.'
);
assert.match(
  script,
  /<option value="ytd">/,
  'The P&L must keep the year-to-date/full-year period available.'
);

console.log('Profit and loss period UI checks passed.');
