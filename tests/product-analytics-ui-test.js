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
expect(page.includes('data-theme-toggle') && styles.includes(":root[data-admin-theme='light']"), 'Analytics must support deliberate light and dark modes.');
expect(script.includes("url.searchParams.set('action', 'product_analytics')"), 'Analytics must use the dedicated aggregate endpoint.');
expect(script.includes('Predicted') && script.includes('quantity_change') && script.includes('revenue_change'), 'The monthly view must distinguish predictions and increases/decreases.');
expect(script.includes("url.searchParams.set('action', 'status')"), 'All-time analytics must discover the full mirrored history.');
expect(api.includes('jg_orders_analytics_forecast') && api.includes("'partners' => jg_orders_analytics_ranked_groups"), 'The API must return forecasts and partner rankings.');
expect(styles.includes('--pa-actual') && styles.includes('--pa-forecast') && styles.includes('--pa-up') && styles.includes('--pa-down'), 'Charts and performance signals must use a controlled color vocabulary.');
expect(styles.includes('@media (max-width: 700px)'), 'The analytics layout must adapt for small screens.');

console.log('product-analytics-ui-test: ok');
