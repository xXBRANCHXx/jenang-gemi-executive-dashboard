const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');

assert(
  /if \(value === null \|\| value === undefined\) return null;/.test(js),
  'Charts must preserve unavailable gross-profit points instead of coercing them to zero.'
);
assert(
  !js.includes('_grossProfitComplete'),
  'C4 must keep plotting known hourly profit instead of blanking a bucket when cost coverage is incomplete.'
);
assert(
  /overviewRefs\.hourlyMeta\.textContent = formatFullMetricValue\([\s\S]*?state\.overview\.hourlyMetric,[\s\S]*?hourlyTotal,[\s\S]*?OVERVIEW_METRIC_UNITS[\s\S]*?\);/.test(js),
  'C4 subheader must contain only the selected metric total for today.'
);
assert(
  !js.includes('COGS missing for ${missingCogsItems.toLocaleString')
    && !js.includes('Packing missing for ${missingPackingItems.toLocaleString')
    && !js.includes("'Live today, 0-23'"),
  'C4 must not crowd its subheader with coverage and live-status copy.'
);
assert(
  page.includes('data-overview-hourly-meta>0 orders</span>'),
  'C4 initial markup must use the same total-only subheader.'
);

console.log('C4 gross-profit UI tests passed.');
