const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const navigation = read('admin-nav.php');
const dashboard = read('dashboard/index.php');
const styles = read('admin.css');
const script = read('admin.js');
const affiliateProgram = read('affiliate-program/index.php');
const ecosystemStyles = styles.slice(
  styles.indexOf('/* Website ecosystem hub:'),
  styles.indexOf('/* Sliding metric selectors', styles.indexOf('/* Website ecosystem hub:'))
);
const campaignPanel = dashboard.slice(
  dashboard.indexOf('data-view-panel="home"'),
  dashboard.indexOf('data-view-panel="ad-view"')
);
const sidebarSource = navigation.slice(
  navigation.indexOf('function render_admin_sidebar('),
  navigation.indexOf('function render_admin_mobile_sidebar_script(')
);
const websitePanel = dashboard.slice(
  dashboard.indexOf('data-view-panel="website"'),
  dashboard.indexOf('data-website-detail')
);

expect(!sidebarSource.includes("'key' => 'campaigns'"), 'Campaigns must not appear in the left sidebar.');
expect(!sidebarSource.includes("'key' => 'affiliate'"), 'Affiliate must not appear in the left sidebar.');
expect(script.includes("home: 'website'"), 'Campaigns must keep Website selected as their parent rail section.');
expect(affiliateProgram.includes("render_admin_sidebar('website')"), 'Affiliate workspace must keep Website selected as its parent rail section.');
expect(websitePanel.includes('admin-website-ecosystem-map'), 'Website landing view must render the ecosystem map.');
expect(!websitePanel.includes('Live web operations'), 'Website ecosystem must not show a redundant live status.');
expect(websitePanel.includes('href="../dashboard/?view=campaigns"'), 'Website ecosystem must link to Campaigns.');
expect(websitePanel.includes('data-dashboard-view-link="home"'), 'Campaigns must retain same-page dashboard navigation.');
expect(websitePanel.includes('href="../affiliate-program/"'), 'Website ecosystem must link to Affiliates.');
expect(websitePanel.includes('data-website-open="jenang_gemi"'), 'Jenang Gemi website analytics destination must remain available.');
expect(websitePanel.includes('data-website-open="zero"'), 'ZERO website analytics destination must remain available.');
expect(styles.includes('.admin-website-growth-node'), 'Website growth destinations must have dedicated visual styling.');
expect(!ecosystemStyles.includes('#78e09a'), 'Website ecosystem must not use the previous green status accent.');
expect(!ecosystemStyles.includes('rgba(9, 12, 17'), 'Website ecosystem cards must use neutral grayscale surfaces.');
expect(campaignPanel.includes('data-view-switch="website"'), 'Campaigns must provide a back button to Website.');
expect(affiliateProgram.includes('href="../dashboard/?view=website"'), 'Affiliates must provide a back button to Website.');
expect(styles.includes('@media (max-width: 720px)'), 'Website ecosystem must include a compact mobile layout.');
expect(script.includes("websiteRefs.heroTitle.textContent = 'Your web ecosystem.'"), 'Selector title must survive client-side view resets.');

console.log('Website ecosystem UI checks passed.');
