const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const navigation = read('admin-nav.php');
const dashboard = read('dashboard/index.php');
const accounting = read('profit-loss/index.php');
const styles = read('admin.css');
const dashboardScript = read('admin.js');
const chromeScript = read('admin-chrome.js');
const sidebar = navigation.slice(
  navigation.indexOf('function render_admin_sidebar('),
  navigation.indexOf('function render_admin_mobile_sidebar_script(')
);
const settings = dashboard.slice(
  dashboard.indexOf('data-view-panel="settings"'),
  dashboard.indexOf('</main>', dashboard.indexOf('data-view-panel="settings"'))
);

expect(!sidebar.includes("'key' => 'wallet'"), 'Wallet must not appear in the global sidebar.');
expect(!sidebar.includes("'key' => 'api'"), 'API must not appear in the global sidebar.');
expect(settings.includes('href="../api-health/"'), 'Settings must provide the API Health destination.');
expect(settings.includes('Open API health'), 'Settings must label the API Health action clearly.');
expect(accounting.includes('href="../dashboard/?view=wallet"'), 'Accounting must provide the Wallet destination.');
expect(
  accounting.indexOf('admin-accounting-wallet-destination') > accounting.indexOf('admin-accounting-workspace'),
  'The Wallet destination must sit after the Accounting workspace.'
);
expect(!dashboard.includes('data-view-switch="wallet" aria-label="Open wallet"'), 'Wallet must not remain in the mobile primary navigation.');
expect(!dashboardScript.includes("title: 'API Health'"), 'Dashboard search must not bypass the Settings API destination.');
expect(!chromeScript.includes("title: 'API Health'"), 'Shared search must not bypass the Settings API destination.');
expect(styles.includes('.admin-destination-button'), 'Nested destinations must use the polished shared button style.');
expect(styles.includes('.admin-accounting-wallet-destination'), 'The Accounting Wallet destination must have dedicated layout styling.');

console.log('Navigation destination UI checks passed.');
