const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'partner-profile/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'partner-profile.js'), 'utf8');

assert.match(page, /data-partner-discount-toggle[\s\S]*data-partner-discount-percent/, 'Partner profiles must expose a discount toggle and percentage input.');
assert.match(page, /data-toggle-all-visible>Toggle All</, 'The bulk editor must expose the requested Toggle All action.');
assert.match(page, /data-partner-bulk-price[\s\S]*data-apply-bulk-price/, 'The bulk editor must expose a price input and apply action.');
assert.match(script, /const toggleAllVisible = \(\) =>[\s\S]*visibleSkus\(\)[\s\S]*rows\.every/, 'Toggle All must operate on the current filtered SKU view.');
assert.match(script, /const applyBulkPrice = \(\) =>[\s\S]*state\.selections\.skus\.forEach[\s\S]*state\.pricing\[skuCode\] = price/, 'Bulk pricing must update every selected SKU.');
assert.match(script, /discount_enabled: state\.discount\.enabled[\s\S]*discount_percent: state\.discount\.percent/, 'Saved profiles must include the discount rule.');

console.log('partner-profile-pricing-ui-test: ok');
