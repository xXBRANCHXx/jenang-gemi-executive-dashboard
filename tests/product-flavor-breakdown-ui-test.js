const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const detail = fs.readFileSync(path.join(root, 'dashboard', 'product-flavors', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'dashboard', 'product-flavors', 'product-flavors.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'dashboard', 'product-flavors', 'product-flavors.css'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

['syrup', 'drops', 'bubur'].forEach((product) => {
  expect(
    dashboard.includes(`href="./product-flavors/?product=${product}"`),
    `${product} flavor share must link to its product breakdown.`
  );
});
expect(detail.includes('data-close-detail'), 'The breakdown must expose an icon close action.');
expect(detail.includes('data-scope="year"') && detail.includes('data-scope="all"') && detail.includes('data-scope="custom"'), 'The breakdown must expose year, all-time, and custom scopes.');
expect(detail.includes('data-grain="day"') && detail.includes('data-grain="week"') && detail.includes('data-grain="month"'), 'The breakdown must expose day, week, and month grouping.');
expect(detail.includes('data-sheet-head') && detail.includes('data-sheet-body') && detail.includes('data-sheet-foot'), 'The breakdown must render as a spreadsheet with header, body, and totals.');
expect(!detail.includes('product-flavor-summary'), 'The breakdown must not use a summary-stat card strip.');
expect(script.includes("url.searchParams.set('action', 'product_flavor_breakdown')"), 'The detail page must load the dedicated aggregate endpoint.');
expect(script.includes("url.searchParams.set('action', 'status')"), 'All-time mode must discover the complete mirrored sales range.');
expect(script.includes("'up'") && script.includes("'down'") && script.includes('previousValue'), 'Cell bars must classify period-over-period performance.');
expect(styles.includes('position: sticky') && styles.includes('.is-period') && styles.includes('.is-flavor'), 'Period and flavor spreadsheet columns must stay readable while scrolling.');
expect(styles.includes('border-radius: 999px'), 'Breakdown toggles must use the fully rounded site control shape.');
expect(styles.includes('--flavor-sheet-up') && styles.includes('--flavor-sheet-down'), 'Performance bars must expose increase and decrease colors.');
expect(styles.includes('overflow-y: hidden') && !styles.includes('max-height: calc(100vh'), 'The sheet must expand vertically with the page instead of using a restricted inner scroller.');
expect(styles.includes('font-family: "Inter"'), 'The breakdown must use the revised neutral interface typeface.');
expect(!detail.includes('admin-panel') && !detail.includes('admin-card'), 'The dedicated breakdown must avoid a card-based layout.');

console.log('product-flavor-breakdown-ui-test: ok');
