const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');

assert(
  /if \(value === null \|\| value === undefined\) return null;/.test(js),
  'Charts must preserve unavailable gross-profit points instead of coercing them to zero.'
);
assert(
  /gross_profit: row\._grossProfitComplete === false \? null : row\.gross_profit/.test(js),
  'C4 must mark gross profit unavailable when any item in an hourly bucket lacks COGS.'
);
assert(
  js.includes('COGS missing for ${missingCogsItems.toLocaleString'),
  'C4 must disclose incomplete COGS coverage in its status line.'
);
assert(
  js.includes("value === null ? 'COGS unavailable'"),
  'C4 tooltips must not display revenue as gross profit when COGS is unavailable.'
);

console.log('C4 gross-profit UI tests passed.');
