const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const js = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');

const kpiIndex = html.indexOf('class="admin-ad-view-kpis"');
const chartIndex = html.indexOf('class="admin-panel admin-ad-view-trend-panel"');
const workspaceIndex = html.indexOf('class="admin-ad-view-workspace"');
const liveAdsIndex = html.indexOf('class="admin-panel admin-ad-view-live-panel"');
const detailIndex = html.indexOf('class="admin-panel admin-ad-view-detail-panel"');
const chartSurfaceIndex = html.indexOf('class="admin-chart-surface"', chartIndex);
assert(liveAdsIndex > workspaceIndex && chartIndex > liveAdsIndex, 'The selected-ad chart must sit beside the Live Ads list.');
assert(kpiIndex > chartIndex && chartSurfaceIndex > kpiIndex, 'The seven KPI controls must sit inside and on top of the chart.');
assert(detailIndex > chartSurfaceIndex, 'Profitability must follow the Live Ads and chart workspace.');

for (const metric of ['impressions', 'clicks', 'broad_orders', 'broad_items', 'expense', 'net_revenue', 'net_roas']) {
  assert(html.includes(`data-ad-view-summary-metric="${metric}"`), `Missing selectable ${metric} KPI card.`);
}
assert(!html.includes('Find a live ad'), 'The obsolete live-ad search must stay removed.');
assert(!html.includes('Setup tools'), 'The obsolete setup tools must stay removed.');
assert(html.includes('data-ad-view-timeframe="today"'), 'Today must be an explicit Ad View timeframe.');
assert(js.includes("startDate: getDateKeyForTimezone()"), 'Ad View must initialize on today.');
assert(js.includes("selectedMetrics.length >= 4"), 'The chart must enforce its four-metric limit.');
assert(js.includes("row.campaign_key === state.adView.selectedCampaignKey"), 'KPIs and chart data must follow the selected campaign.');
assert(js.includes('admin-ad-view-credit-breakdown'), 'Ad balances must share one compact breakdown card.');
assert(!js.includes('<section class="admin-ad-view-shopee-metrics">'), 'Selected-ad details must not repeat the seven Shopee metrics.');
assert(js.includes('AD_VIEW_AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000'), 'Ad View must automatically sync every five minutes.');
assert(js.includes('AD_VIEW_ATTRIBUTION_REFRESH_DAYS = 8'), 'Ad View must refresh Shopee’s trailing attribution window.');
assert(js.includes('state.adView.startDate < trailingAttributionStart'), 'Background sync must include visible prior days that Shopee can re-attribute.');
assert(!js.includes('const syncStartDate = background ? today : state.adView.startDate'), 'Background sync must not refresh only today.');
assert(js.includes('scheduleAdViewAutoSync();'), 'Loading Ad View must schedule a background Shopee sync.');
assert(js.includes("AD_VIEW_PREFERENCES_STORAGE_KEY = 'jg-dashboard-ad-view-preferences-v1'"), 'Ad View must use a versioned browser-local preference record.');
assert(js.includes('const adViewPreferences = readAdViewPreferences();'), 'Ad View must restore saved preferences before initializing state.');
for (const preference of ['account', 'timeframe', 'startDate', 'endDate', 'selectedMetrics', 'compareA', 'compareB', 'selectedCampaignKey']) {
  assert(js.includes(`${preference}: state.adView.${preference}`), `Ad View must persist ${preference}.`);
}
assert(js.includes('persistAdViewPreferences();'), 'Ad View control changes must save their state for hard refreshes.');
assert(js.includes('estimateAdViewQuarterHourMetrics'), 'Hourly Shopee data must be presented in quarter-hour hover intervals.');
assert(js.includes('Math.round(hourlyTotal * (factorBefore + factor))'), 'Quarter-hour count estimates must use cumulative allocation.');
assert(js.includes('- Math.round(hourlyTotal * factorBefore)'), 'Quarter-hour count buckets must not duplicate an hourly integer total.');
for (let hourlyTotal = 0; hourlyTotal <= 25; hourlyTotal += 1) {
  const buckets = [0, 1, 2, 3].map((quarter) => (
    Math.round(hourlyTotal * ((quarter + 1) / 4))
    - Math.round(hourlyTotal * (quarter / 4))
  ));
  assert.equal(buckets.reduce((sum, value) => sum + value, 0), hourlyTotal, `Quarter-hour buckets must preserve an hourly total of ${hourlyTotal}.`);
}
assert(js.includes('point.value === 0 && next.value === 0'), 'Adjacent zero-count buckets must remain on the baseline without curve overshoot.');
assert(js.includes("'<small>15 min estimate</small>'"), 'Estimated 15-minute values must disclose their hourly source without a verbose tooltip.');
assert(js.includes('ctx.bezierCurveTo('), 'Ad View trends must use smooth curved paths.');
assert(js.includes('currentHourBlockMinutes / elapsedHourMinutes'), 'The active quarter-hour block must use its share of the elapsed hour.');
assert(js.includes('minute / elapsedHourMinutes'), 'Quarter-hour count allocation must track the preceding share of the hour.');
assert(!js.includes('Number.isFinite(row.startPosition)'), 'Quarter-hour resets must not be drawn as separate spike curves.');
const adChartStart = js.indexOf('const drawAdViewMetricChart');
const adChartEnd = js.indexOf('const renderAdViewKpis', adChartStart);
assert(adChartStart >= 0 && adChartEnd > adChartStart, 'The Ad View chart renderer must exist.');
assert(js.slice(adChartStart, adChartEnd).includes('refreshedActiveHover?.metricPoints?.length'), 'The Ad View chart must draw markers only for the hovered interval.');
assert(js.slice(adChartStart, adChartEnd).includes('point.hoverKey === activeHover.hoverKey'), 'Hover markers must be refreshed from the latest chart rows.');
assert(js.slice(adChartStart, adChartEnd).includes('ctx.arc(refreshedActiveHover.x, point.y'), 'The hovered interval must be marked directly on each current curve.');
assert(!js.includes('tooltipLabel: `${state.adView.startDate}'), 'Quarter-hour tooltips must not repeat the already-selected date.');
assert(js.includes("result.cac = result.broad_items > 0 ? result.expense / result.broad_items : 0"), 'CAC must use attributed units sold.');
assert(js.includes('Ad cost ÷ attributed units sold'), 'The CAC card must explain its unit-based calculation.');
assert(js.includes("net_revenue: 'Net revenue received'"), 'Ad View must use seller-received net revenue.');
assert(js.includes('result.net_roas = result.net_revenue_available'), 'Ad View ROAS must use seller-received net revenue.');
assert(!html.includes('data-ad-view-summary-metric="broad_gmv"'), 'Shopee sale value must not be a headline Ad View metric.');
assert(html.includes('Shopee-attributed sales × the actual seller net-to-gross ratio'), 'Ad View must explain its order-backed net revenue estimate.');

console.log('Ad View UI tests passed.');
