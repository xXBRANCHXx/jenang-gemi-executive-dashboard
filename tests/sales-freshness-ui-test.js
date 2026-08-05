const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'admin.js'), 'utf8');

assert(
  source.includes('const OVERVIEW_SNAPSHOT_REFRESH_INTERVAL_MS = 60 * 1000;'),
  'Visible dashboard data must be checked every minute.'
);
assert(
  /const refreshOverviewSnapshot[\s\S]*?forceRefresh: true[\s\S]*?skipHourly: true/.test(source),
  'The snapshot refresh must bypass stale summary caches without duplicating the hourly request.'
);
assert(
  /window\.setInterval\(\(\) => \{\s*refreshOverviewSnapshot\(\)[\s\S]*?OVERVIEW_SNAPSHOT_REFRESH_INTERVAL_MS/.test(source),
  'The visible Overview must repaint from the authoritative summary every minute.'
);
assert(
  source.includes('const gp = cogs !== null ? rev - cogs - packing : directGp;')
    && /const grossProfitFromSummaryRow[\s\S]*?revenue - cogs - packing/.test(source),
  'Gross Profit must be derived from Net Revenue minus COGS and packing in every Overview presentation.'
);

console.log('sales-freshness-ui-test: ok');
