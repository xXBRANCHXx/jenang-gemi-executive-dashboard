const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'customer-profiles/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'customer-profiles/customer-profiles.js'), 'utf8');
const directPage = fs.readFileSync(path.join(root, 'whatsapp-orders/index.php'), 'utf8');
const directScript = fs.readFileSync(path.join(root, 'whatsapp-orders.js'), 'utf8');
const ordersPage = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');

const expect = (condition, message) => { if (!condition) throw new Error(message); };

expect(page.includes('data-profile-kpi="repeat_rate"') && page.includes('data-profile-kpi="repeat_revenue_share"'), 'Customer Profiles must expose repeat rate and repeat revenue share.');
expect(page.includes('data-profile-search') && page.includes('data-profile-segment-filter') && page.includes('data-profile-channel-filter'), 'Customer directory must be searchable and filterable.');
expect(script.includes('filteredProfiles') && script.includes('repeatOnly'), 'Customer profile filters must drive the directory.');
expect(directPage.includes('name="sales_channel"') && directPage.includes('value="walk_in"'), 'Direct Orders must expose WhatsApp and walk-in channel selection.');
expect(directScript.includes("state.salesChannel === 'walk_in'") && directScript.includes('Complete walk-in sale'), 'Walk-in order entry must remove shipping requirements and expose a completion action.');
expect(ordersPage.includes('All-channel order facts'), 'Orders must clearly describe its unified all-channel scope.');

console.log('customer profiles UI tests passed');
