const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'customer-profiles/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'customer-profiles/customer-profiles.js'), 'utf8');
const directPage = fs.readFileSync(path.join(root, 'whatsapp-orders/index.php'), 'utf8');
const directScript = fs.readFileSync(path.join(root, 'whatsapp-orders.js'), 'utf8');
const ordersPage = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const dashboardScript = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const sidebarSource = navigation.slice(navigation.indexOf('function render_admin_sidebar('), navigation.indexOf('function render_admin_sidebar_item('));

const expect = (condition, message) => { if (!condition) throw new Error(message); };

expect(page.includes('data-profile-kpi="repeat_rate"') && page.includes('data-profile-kpi="repeat_revenue_share"'), 'Customer Profiles must expose repeat rate and repeat revenue share.');
expect(!page.includes('customer-profiles-hero') && page.includes('customer-profiles-toolbar'), 'Customer Profiles must open as a compact internal tool without a marketing hero card.');
expect(page.includes('data-profile-search') && page.includes('data-profile-segment-filter') && page.includes('data-profile-channel-filter'), 'Customer directory must be searchable and filterable.');
expect(script.includes('filteredProfiles') && script.includes('repeatOnly'), 'Customer profile filters must drive the directory.');
expect(directPage.includes('name="sales_channel"') && directPage.includes('value="walk_in"'), 'Direct Orders must expose WhatsApp and walk-in channel selection.');
expect(directScript.includes("state.salesChannel === 'walk_in'") && directScript.includes('Complete walk-in sale'), 'Walk-in order entry must remove shipping requirements and expose a completion action.');
expect(ordersPage.includes('All-channel order facts'), 'Orders must clearly describe its unified all-channel scope.');
expect(ordersPage.includes('data-customer-lifecycle') && ordersPage.includes('href="../customer-profiles/"'), 'The homepage must expose a clickable Customer Lifecycle chart linked to Customer Profiles.');
expect(ordersPage.includes('Customers grouped by their distinct order count'), 'The homepage lifecycle chart must state that its grain is customer orders.');
expect(dashboardScript.includes('lifecycle_chart') && dashboardScript.includes('profiled_orders') && dashboardScript.includes('item rows are collapsed first'), 'The homepage chart must render the order-grain lifecycle payload and explain the denominator.');
expect(!sidebarSource.includes("'key' => 'customers'"), 'Customer Profiles must not appear in the left sidebar.');

console.log('customer profiles UI tests passed');
