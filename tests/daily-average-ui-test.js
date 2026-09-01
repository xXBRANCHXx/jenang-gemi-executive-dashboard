const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'admin.js'), 'utf8');
const helperStart = source.indexOf('const getDateKeyForTimezone');
const helperEnd = source.indexOf('const jgValidMonthKey', helperStart);

assert(
  source.includes('const DAILY_DATA_CACHE_VERSION = 3;')
    && source.includes("dashboardClientCacheKey('daily', [`v${DAILY_DATA_CACHE_VERSION}`, state.daily.month, state.timezone])"),
  'Daily data fixes must invalidate persisted summaries instead of restoring pre-fix quantities.'
);

assert(helperStart >= 0 && helperEnd > helperStart, 'Daily elapsed-day helpers must remain available.');

const helpers = new Function(`${source.slice(helperStart, helperEnd)}\nreturn { getElapsedDayCountForMonth };`)();
const jakarta = 'Asia/Jakarta';
const augustFourthInJakarta = new Date('2026-08-03T18:00:00Z');

assert.equal(
  helpers.getElapsedDayCountForMonth('2026-08', augustFourthInJakarta, jakarta),
  4,
  'The current month average must only include days through today in the dashboard timezone.'
);
assert.equal(
  helpers.getElapsedDayCountForMonth('2026-07', augustFourthInJakarta, jakarta),
  31,
  'Completed months must continue to average across every calendar day.'
);
assert.equal(
  helpers.getElapsedDayCountForMonth('2026-09', augustFourthInJakarta, jakarta),
  0,
  'Future months must not claim any elapsed averaging days.'
);
assert(
  /avgQty: averageDayCount > 0 \? account\.qty \/ averageDayCount : 0/g.test(source)
    && (source.match(/avgQty: averageDayCount > 0 \? totalQty \/ averageDayCount : 0/g) || []).length === 2,
  'Both raw and summarized daily data must divide account and total averages by elapsed days.'
);
assert(
  source.includes('${formatRegionalInteger(dailyData.averageDayCount)} days'),
  'The Avg / day footer must disclose the elapsed-day divisor.'
);

console.log('daily-average-ui-test: ok');
