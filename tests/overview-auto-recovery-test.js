const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'admin.js'), 'utf8');
const start = source.indexOf('  let overviewSnapshotRefreshPromise =');
const end = source.indexOf('\n\t  const loadDaily =', start);
let now = 1800000000000, sharedAttempt = 0, reads = 0, syncs = 0, online = true;
let readGate = null, syncSucceeds = true;
const healthy = () => ({ generated_at: new Date(now).toISOString(), sync_status: { fresh: true, status: 'ok' } });
const scope = {
  Date: { now: () => now }, document: { hidden: false },
  state: { activeView: 'overview', overview: { data: healthy() }, marketplaceRefresh: { loading: false, error: '', lastAutoAttemptAt: 0 } },
  AUTO_MARKETPLACE_REFRESH_RETRY_MS: 60000, AUTO_MARKETPLACE_REFRESH_MIN_MS: 300000,
  isBrowserOnline: () => online, renderOverviewFreshness() {},
  overviewSnapshotTime: data => Date.parse(data?.generated_at || '') || 0,
  readAutoMarketplaceRefreshAt: () => sharedAttempt,
  writeAutoMarketplaceRefreshAt: time => { sharedAttempt = time; scope.state.marketplaceRefresh.lastAutoAttemptAt = time; },
  loadOverviewSafely: async options => {
    reads++;
    assert.equal(options.forceRefresh, true);
    if (readGate) await readGate;
    return true; // HTTP 200 may return the same stale server fallback.
  },
  runMarketplaceRefresh: async () => {
    syncs++;
    if (syncSucceeds) {
      scope.state.overview.data = healthy();
      scope.state.marketplaceRefresh.error = '';
    } else scope.state.marketplaceRefresh.error = 'Upstream unavailable';
    return syncSucceeds;
  },
};
vm.createContext(scope);
vm.runInContext(source.slice(start, end) + '\nthis.poll = refreshOverviewSnapshot; this.auto = runAutomaticMarketplaceRefresh;', scope);
(async () => {
  sharedAttempt = now - 1000;
  scope.state.overview.data.generated_at = new Date(now - 180000).toISOString();
  await scope.poll();
  assert.equal(syncs, 0, 'Stale data must obey the cross-tab retry floor.');
  now += 60000;
  await scope.poll();
  assert.equal(syncs, 1, 'A successful but stale summary must trigger source recovery without a click.');
  await scope.poll();
  assert.equal(syncs, 1, 'A healthy summary must not cause another immediate sync.');
  scope.state.overview.data.sync_status.status = 'partial';
  now += 60000;
  await scope.poll();
  assert.equal(syncs, 2, 'A recent partial sync needs recovery even when fresh=true.');
  syncSucceeds = false;
  scope.state.marketplaceRefresh.error = 'Network failure';
  now += 60000;
  await scope.poll();
  assert.equal(syncs, 3);
  await scope.auto({ force: true });
  assert.equal(syncs, 3, 'Forced recovery must not bypass the retry floor.');
  syncSucceeds = true;
  now += 60000;
  await scope.poll();
  assert.equal(syncs, 4, 'Failures must recover automatically on a later tick.');
  let release;
  readGate = new Promise(resolve => { release = resolve; });
  const beforeReads = reads;
  const first = scope.poll(), second = scope.poll();
  assert.equal(first, second, 'Simultaneous focus, visibility, and timer events must share a request.');
  release(); await first; readGate = null;
  assert.equal(reads, beforeReads + 1);
  const beforeSyncs = syncs;
  online = false; now += 300000;
  await scope.poll(); await scope.auto();
  assert.equal(reads, beforeReads + 1);
  assert.equal(syncs, beforeSyncs, 'Offline events must not consume the recovery cooldown.');
  online = true;
  await scope.poll();
  assert.equal(syncs, beforeSyncs + 1, 'Reconnect must recover immediately when due.');
  scope.document.hidden = true; now += 300000;
  await scope.poll(); await scope.auto();
  assert.equal(syncs, beforeSyncs + 1, 'Hidden tabs must not sync.');
  scope.document.hidden = false;
  scope.state.marketplaceRefresh.loading = true;
  await scope.poll(); await scope.auto();
  assert.equal(syncs, beforeSyncs + 1, 'An active manual refresh must not be duplicated.');
  scope.state.marketplaceRefresh.loading = false;
  sharedAttempt = now + 3600000;
  await scope.auto();
  assert.equal(syncs, beforeSyncs + 2, 'A future stored timestamp must not suspend recovery.');
  const initialFinally = source.indexOf('      finishLoader();\n      connectLiveStream();');
  const initialStart = source.indexOf('      if (!DASHBOARD_FORCE_FRESH_LOAD) {', initialFinally);
  const initialEnd = source.indexOf('\n    });', initialStart);
  for (const reload of [false, true]) {
    const callbacks = [];
    let startupSyncs = 0;
    vm.runInNewContext(source.slice(initialStart, initialEnd), {
      DASHBOARD_FORCE_FRESH_LOAD: reload,
      scheduleWalletBackgroundRefresh() {},
      window: { setTimeout: callback => callbacks.push(callback) },
      runAutomaticMarketplaceRefresh: async () => { startupSyncs++; },
    });
    for (const callback of callbacks) await callback();
    assert.equal(startupSyncs, 1, `Startup must check automatic sync when reload=${reload}.`);
  }
  console.log('Overview automatic recovery: stale fallback, partial sync, retry, deduplication, reconnect, and clock correction passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
