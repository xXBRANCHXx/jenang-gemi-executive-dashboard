const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const node = () => ({ textContent: '', title: '', dataset: {}, disabled: false, classList: { toggle() {} }, setAttribute() {} });
const scope = {
  state: { activeView: 'overview', overview: { year: 2026, verifiedAt: 0, data: null }, marketplaceRefresh: { loading: false, error: '' } },
  overviewRefs: Object.fromEntries(['freshness', 'freshnessLabel', 'refreshButton', 'refreshLabel', 'lastUpdated'].map(key => [key, node()])),
  isBrowserOnline: () => true,
  setLastUpdated: (target, iso) => { target.textContent = `Updated ${iso}`; },
  resetOrderWindowsFromOverview() {},
  renderOverview(data) { scope.state.overview.data = data; scope.draw(); },
};
vm.createContext(scope);
vm.runInContext(extract('  const overviewSnapshotTime =', '  const setLastUpdated =') + extract('\t  const applyOverviewData =', '\t  const applyHomeData =') + '\nthis.apply = applyOverviewData; this.draw = renderOverviewFreshness; this.freshness = overviewFreshnessStatus;', scope);
const now = Date.now();
const snapshot = (offset, total) => ({ year: 2026, generated_at: new Date(now + offset).toISOString(), sync_status: { status: 'ok', fresh: true }, totals: { orders: total } });
const old = snapshot(-30000, 10), newest = snapshot(0, 12);
scope.apply(old);
assert.equal(scope.overviewRefs.freshnessLabel.textContent, 'Cached', 'A cached snapshot must not claim to be live.');
scope.apply(old, { verified: true });
assert.equal(scope.overviewRefs.freshnessLabel.textContent, 'Live');
scope.state.marketplaceRefresh.loading = true;
scope.draw();
assert.equal(scope.overviewRefs.refreshButton.disabled, true, 'Automatic and manual syncs must both show their busy state.');
assert.equal(scope.apply(old, { verified: true }), false, 'A cached poll arriving during refresh must be ignored.');
assert.equal(scope.overviewRefs.lastUpdated.textContent, 'Refreshing dashboard data…');
assert.equal(scope.apply(newest, { verified: true, marketplaceRefresh: true }), true);
scope.state.marketplaceRefresh.loading = false; scope.draw();
assert.equal(scope.overviewRefs.lastUpdated.textContent, `Updated ${newest.generated_at}`);
assert.equal(scope.overviewRefs.refreshButton.disabled, false);
assert.equal(scope.apply(old, { verified: true }), false, 'A late older response must never roll back totals or the displayed timestamp.');
assert.equal(scope.state.overview.data.totals.orders, 12);
assert.equal(scope.overviewRefs.lastUpdated.textContent, `Updated ${newest.generated_at}`);
scope.state.marketplaceRefresh.error = 'Database temporarily unavailable'; scope.draw();
assert.equal(scope.overviewRefs.freshnessLabel.textContent, 'Cached');
assert.equal(scope.overviewRefs.refreshLabel.textContent, 'Try again');
assert.match(scope.overviewRefs.lastUpdated.textContent, /^Refresh failed/);
assert.equal(scope.state.overview.data.totals.orders, 12, 'A failed refresh must preserve the last verified data.');
assert.equal(scope.freshness(newest, { loading: false, error: '' }, now, false, now), 'offline');
assert.equal(scope.freshness(newest, { loading: false, error: '' }, now, true, now + 121000), 'cached');
assert.notEqual(scope.freshness({ ...newest, sync_status: { fresh: false, status: 'failed' } }, { loading: false, error: '' }, now, true, now), 'live');
console.log('Overview refresh: pending feedback, cache races, data/timestamp consistency, and honest live status passed.');

(async () => {
  const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
  const pollReply = deferred(), refreshReply = deferred();
  const writes = []; let generation = 0;
  Object.assign(scope, {
    isDashboardMemoryPressure: () => false,
    releaseInactiveViewsForMemory: async () => {},
    beginRequest: () => ++generation,
    isLatestRequest: (_, token) => token === generation,
    buildSalesUrl: year => `/sales?year=${year}`,
    requestJson: (_, options = {}) => options.method === 'POST' ? refreshReply.promise : pollReply.promise,
    writeOverviewCache: (year, data) => writes.push({ year, data }),
    refreshOverviewHourlyRows: async () => {},
    loadOverviewLocationRows: async () => {},
    syncActiveOrderViewsAfterRepair: async () => {},
  });
  scope.state.overview.data = null;
  scope.state.overview.customRange = { active: false };
  scope.state.marketplaceRefresh.error = '';
  scope.apply(old, { verified: true });
  vm.runInContext(extract('\t  const loadOverview =', '  const readAutoMarketplaceRefreshAt =') + extract('  const runMarketplaceRefresh =', '  const refreshMarketplaceData =') + '\nthis.poll = loadOverview; this.refresh = runMarketplaceRefresh;', scope);
  const poll = scope.poll({ force: true, skipHourly: true });
  const refresh = scope.refresh({ interactive: false });
  assert.equal(scope.overviewRefs.refreshLabel.textContent, 'Refreshing…', 'An automatic sync must not leave a deceptively idle refresh button.');
  pollReply.resolve(old); await poll;
  assert.equal(writes.length, 0, 'The pre-refresh poll must not write stale data to either cache.');
  assert.equal(scope.overviewRefs.lastUpdated.textContent, 'Refreshing dashboard data…');
  refreshReply.resolve({ ...newest, ok: true });
  assert.equal(await refresh, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].data.totals.orders, 12);
  assert.equal(scope.overviewRefs.lastUpdated.textContent, `Updated ${newest.generated_at}`);
  assert.equal(scope.overviewRefs.refreshButton.disabled, false);
  const memoryRelease = deferred();
  let memorySyncs = 0;
  scope.isDashboardMemoryPressure = () => true;
  scope.releaseInactiveViewsForMemory = () => memoryRelease.promise;
  scope.requestJson = async () => { memorySyncs++; return { ...newest, ok: true }; };
  const automatic = scope.refresh({ interactive: false });
  const simultaneous = scope.refresh({ interactive: true });
  memoryRelease.resolve();
  assert.equal(await automatic, true, 'Memory pressure must not silently disable sync of the visible Overview.');
  assert.equal(await simultaneous, false, 'Memory cleanup must not allow simultaneous syncs to pass the loading guard.');
  assert.equal(memorySyncs, 1);
  console.log('Overview in-flight poll, automatic refresh, and memory cleanup races: passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
