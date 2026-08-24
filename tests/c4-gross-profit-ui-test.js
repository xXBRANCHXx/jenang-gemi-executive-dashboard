const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const clockHelpersStart = js.indexOf('const parseOrderTimestamp');
const clockHelpersEnd = js.indexOf('const formatOrderTimestamp', clockHelpersStart);
const { partnerOrderWallClockParts, orderHourlyClock } = new Function(
  `${js.slice(clockHelpersStart, clockHelpersEnd)}\nreturn { partnerOrderWallClockParts, orderHourlyClock };`
)();

const now = new Date('2026-08-24T06:53:00Z');
assert.deepEqual(
  partnerOrderWallClockParts({ platform: 'partner', order_create_time: '2026-08-24 13:30:00' }),
  { date: '2026-08-24', hour: 13, minute: 30 },
  'Timezone-free partner timestamps must retain their actual WIB wall-clock hour.'
);
assert.deepEqual(
  orderHourlyClock({ platform: 'partner', order_create_time: '2026-08-24 13:30:00' }, now, 'Asia/Jakarta', '2026-08-24'),
  { date: '2026-08-24', hour: 13, minute: 30 },
  'C4 must include a current partner order in the hour entered by the partner.'
);
assert.equal(
  orderHourlyClock({ platform: 'partner', order_create_time: '2026-08-24 14:30:00' }, now, 'Asia/Jakarta', '2026-08-24'),
  null,
  'C4 must still reject a genuinely future partner wall-clock time.'
);
assert.deepEqual(
  orderHourlyClock({ platform: 'shopee', order_create_time: '2026-08-24T06:30:00Z' }, now, 'Asia/Jakarta', '2026-08-24'),
  { date: '2026-08-24', hour: 13, minute: 30 },
  'Marketplace UTC timestamps must keep using the dashboard timezone conversion.'
);

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
assert(
  /const clock = orderHourlyClock\(order, now, state\.timezone, localToday\);[\s\S]*?addOrderMetrics\(row, order\)/.test(js),
  'C4 must classify each order through the source-aware clock before totaling its net revenue.'
);

console.log('C4 gross-profit UI tests passed.');
