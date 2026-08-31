const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

['syrup', 'drops', 'bubur', 'sku-product'].forEach((key) => {
  expect(page.includes(`data-overview-chart-legend="${key}"`), `${key} must expose an expandable HTML legend.`);
  expect(script.includes(`'${key}': false`) || script.includes(`${key}: false`), `${key} must start collapsed.`);
});

expect(script.includes('const OVERVIEW_LEGEND_PREVIEW_LIMIT = 5;'), 'Overview legends must preview exactly five entries.');
expect(script.includes('renderOverviewExpandableLegend'), 'Overview charts must share the expandable legend renderer.');
expect(script.includes('data-overview-legend-toggle'), 'Expanded legends must expose a delegated toggle action.');
expect(script.includes('Show all ${rows.length}') && script.includes('Show top ${OVERVIEW_LEGEND_PREVIEW_LIMIT}'), 'Legend controls must describe expand and collapse actions.');
expect((script.match(/showLegend: false/g) || []).length >= 4, 'The four migrated charts must use their HTML legends instead of canvas legends.');
expect(styles.includes('.admin-expandable-chart-legend-list') && styles.includes('.admin-expandable-chart-legend-toggle'), 'Expandable legends must include responsive list and button styles.');

console.log('overview-expandable-legends-ui-test: ok');
