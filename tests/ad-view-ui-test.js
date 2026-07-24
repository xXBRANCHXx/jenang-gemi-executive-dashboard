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
assert(js.includes("result.cac = result.broad_items > 0 ? result.expense / result.broad_items : 0"), 'CAC must use attributed units sold.');
assert(js.includes('Ad cost ÷ attributed units sold'), 'The CAC card must explain its unit-based calculation.');
assert(js.includes("net_revenue: 'Net revenue received'"), 'Ad View must use seller-received net revenue.');
assert(js.includes('result.net_roas = result.net_revenue_available'), 'Ad View ROAS must use seller-received net revenue.');
assert(!html.includes('data-ad-view-summary-metric="broad_gmv"'), 'Shopee sale value must not be a headline Ad View metric.');
assert(html.includes('Shopee-attributed sales × the actual seller net-to-gross ratio'), 'Ad View must explain its order-backed net revenue estimate.');

console.log('Ad View UI tests passed.');
