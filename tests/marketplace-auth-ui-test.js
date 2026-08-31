const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const js = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/marketplace-auth/index.php'), 'utf8');
const upstream = fs.readFileSync(path.join(root, 'marketplace-auth-bootstrap.php'), 'utf8');

assert(html.includes('data-marketplace-auth-card'), 'Settings must contain the Shopee authorization card.');
assert(html.includes('data-marketplace-auth-dialog'), 'Renewal must include a guided Shopee handoff.');
assert(html.includes('API Ingest verifies the shop before changing its connection'), 'The walkthrough must explain safe token replacement.');
assert(html.includes('data-marketplace-auth-endpoint="../api/marketplace-auth/"'), 'Dashboard must use its authenticated same-origin proxy.');
assert(js.includes("'X-JG-CSRF-Token': marketplaceAuthCsrf"), 'Starting authorization must require a dashboard CSRF token.');
assert(js.includes('window.location.assign(destination.href)'), 'The dynamic button must navigate to the freshly generated Shopee URL.');
assert(js.includes("endsWith('.shopeemobile.com')"), 'The browser must reject non-Shopee authorization destinations.');
assert(js.includes("status === 'renewal_due'"), 'The button must react to authorization renewal state.');
assert(js.includes("token?.authorization_expiry_source === 'shopee_partner_api'"), 'The Dashboard must distinguish Shopee\'s exact expiry from a local fallback estimate.');
assert(js.includes('The existing API Ingest connection was not replaced.'), 'Cancellation must communicate that current ingestion is preserved.');
assert(api.includes("jg_admin_require_csrf_json();"), 'The authenticated proxy must verify CSRF before starting a session.');
assert(upstream.includes("'Authorization: Bearer ' . $token"), 'The setup token must stay in a server-side Authorization header.');
assert(!upstream.includes('setup_token='), 'The self-service proxy must never construct a setup-token query string.');
assert(html.includes('jg_dashboard_post_login_location()'), 'Shopee results must survive a SameSite-strict login round trip.');

console.log('Marketplace authorization UI tests passed.');
