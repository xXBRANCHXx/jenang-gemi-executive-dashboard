const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'admin.js'), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const scope = { window: { setTimeout, clearTimeout, AbortController }, AbortController, DOMException, fetch: async () => ({ ok: true, json: async () => ({ ok: true }) }) };
  vm.createContext(scope);
  vm.runInContext(extract('  const runDashboardRequest =', '  const websiteOrderActionUrl =') + '\nthis.run = runDashboardRequest; this.request = requestJson;', scope);
  let active = 0, maximum = 0;
  const gates = Array.from({ length: 6 }, deferred);
  const tasks = gates.map(gate => scope.run(async () => { active++; maximum = Math.max(maximum, active); try { return await gate.promise; } finally { active--; } }));
  const settled = Promise.allSettled(tasks);
  await tick(); assert.equal(active, 2, 'Only two requests may start at once.');
  gates[0].reject(new Error('database unavailable')); await tick(); assert.equal(active, 2, 'A failed request must release its slot.');
  for (const gate of gates) { gate.resolve(true); await tick(); }
  const results = await settled; assert.equal(results.filter(r => r.status === 'fulfilled').length, 5); assert.equal(maximum, 2);
  scope.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('HTML or truncated JSON'); } });
  await assert.rejects(scope.request('/api/sales/'), /invalid response/, 'Malformed responses must never become a successful empty dashboard.');
  scope.fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) });
  await assert.rejects(scope.request('/api/sales/'), error => error.status === 503);
  let attempts = 0;
  scope.fetch = async () => ++attempts === 1
    ? { ok: false, status: 503, json: async () => ({ error: 'Database temporarily unavailable' }) }
    : { ok: true, status: 200, json: async () => ({ recovered: true }) };
  assert.equal((await scope.request('/api/sales/')).recovered, true);
  assert.equal(attempts, 2, 'A read should recover from a temporary database failure.');
  attempts = 0;
  scope.fetch = async () => { attempts++; return { ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) }; };
  await assert.rejects(scope.request('/api/wallet/', { method: 'POST' }), error => error.status === 503);
  assert.equal(attempts, 1, 'Payment and sync writes must never be retried automatically.');
  attempts = 0;
  await assert.rejects(scope.request('/api/sales/'), error => error.status === 503);
  assert.equal(attempts, 2, 'A persistent outage must stop after one retry.');
  scope.fetch = async () => ({ ok: true, status: 200, json: async () => ({ loaded: true }) });
  assert.equal((await scope.request('/api/sales/')).loaded, true, 'The queue must recover after failures.');

  for (const reload of [false, true]) {
    const calls = [];
    const activation = { DASHBOARD_FORCE_FRESH_LOAD: reload, state: { activeView: 'overview', overview: { year: 2026 }, home: {} }, isBrowserOnline: () => true,
      readOverviewCache: () => null, restoreViewClientCache: async () => false, overviewClientCacheKey: () => 'overview',
      restoreHomeFromCache: () => false, homeClientCacheKey: () => 'home', homeRefs: {},
      loadOverviewSafely: async options => { calls.push(['overview', options]); return true; },
      loadHomeSafely: async options => { calls.push(['home', options]); return true; } };
    vm.createContext(activation);
    vm.runInContext(extract('  const activateOverviewViewInstantly =', '  const restoreHomeFromCache =') + extract('  const activateHomeViewInstantly =', '\t  const activateDailyViewInstantly =') + '\nthis.overview = activateOverviewViewInstantly; this.home = activateHomeViewInstantly;', activation);
    await activation.overview().refreshPromise; await activation.home().refreshPromise;
    assert.equal(calls.length, 2, `Overview and Campaign must fetch data when reload=${reload}.`);
    assert.equal(calls[0][1].forceRefresh, reload);
  }
  console.log('Dashboard loading: bounded requests, recovery, malformed JSON, and reload checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
