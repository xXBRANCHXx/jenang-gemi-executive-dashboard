const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sheet = fs.readFileSync(path.join(root, 'dashboard', 'product-flavors', 'product-flavors.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'dashboard', 'product-analytics', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'dashboard', 'product-analytics', 'product-analytics.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'dashboard', 'product-analytics', 'product-analytics.css'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'orders', 'index.php'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

expect(sheet.includes("analyticsHref('flavor'") && sheet.includes("analyticsHref('volume'") && sheet.includes("analyticsHref('sku'"), 'Flavor names, volume headers, and exact cells must all open analytics.');
expect(page.includes('data-history-chart') && page.includes('data-history-body'), 'Analytics must expose a trend chart and complete monthly history table.');
expect(page.includes('data-flavor-breakdown') && page.includes('data-volume-breakdown'), 'Analytics must show both flavor and volume breakdowns.');
expect(page.includes('data-platform-breakdown') && page.includes('data-partner-breakdown'), 'Analytics must show platform and partner rankings.');
expect(page.includes('data-account-breakdown') && page.includes('Shopee &amp; TikTok by account'), 'Analytics must compare the individual Shopee and TikTok accounts.');
expect(script.includes('Account ranking ·') && script.includes('rankedByMetric'), 'The KPI strip must show a metric-aware best-to-worst account leaderboard.');
expect(page.includes('data-theme-toggle') && styles.includes(":root[data-admin-theme='light']"), 'Analytics must support deliberate light and dark modes.');
expect(script.includes("url.searchParams.set('action', 'product_analytics')"), 'Analytics must use the dedicated aggregate endpoint.');
expect(script.includes('Projected month-end') && script.includes('quantity_change') && script.includes('revenue_change'), 'The monthly view must distinguish the current run-rate projection and increases/decreases.');
expect(script.includes('const previousMonthIndex = actualCount - 2') && script.includes('context.moveTo(x(previousMonthIndex), y(values[previousMonthIndex]))') && script.includes('context.lineTo(forecastX, forecastY)'), 'The projected current-month dot must branch from the previous completed month to show its predicted increase or decrease.');
expect(script.includes("url.searchParams.set('action', 'status')"), 'All-time analytics must discover the full mirrored history.');
expect(api.includes('Current-month run rate') && api.includes('days_elapsed') && api.includes('No future months are predicted'), 'The API forecast must project only the current month from elapsed days.');
expect(api.includes("'accounts' => jg_orders_analytics_ranked_groups") && api.includes("['tiktok', 'tiktok-shop', 'tokopedia']"), 'The API must retain platform accounts while grouping Tokopedia into TikTok.');
expect(styles.includes('--pa-actual') && styles.includes('--pa-forecast') && styles.includes('--pa-up') && styles.includes('--pa-down'), 'Charts and performance signals must use a controlled color vocabulary.');
expect(styles.includes('@media (max-width: 700px)'), 'The analytics layout must adapt for small screens.');

console.log('product-analytics-ui-test: ok');
