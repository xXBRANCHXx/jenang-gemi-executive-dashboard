const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'profit-loss', 'index.php'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'profit-loss', 'accounting.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'accounting', 'index.php'), 'utf8');

assert.match(page, /<summary class="admin-ghost-btn">Download Pembukuan<\/summary>/, 'Accounting must expose the requested Download Pembukuan action.');
for (const format of ['xlsx', 'pdf', 'zip']) assert.match(page, new RegExp(`data-accounting-pembukuan-export="${format}"`), `Accounting must expose ${format}.`);
assert.match(ui, /buildUrl\('export_pembukuan',[\s\S]*format/, 'The existing Accounting script must route Pembukuan downloads through the authenticated API.');
assert.match(ui, /'bill_id',\s*'format'/, 'The selected Pembukuan format must be preserved in the API URL.');
assert.match(ui, /response\.ok[\s\S]*expected_correction[\s\S]*showToast/, 'Actionable export validation errors must stay inside the Accounting UI.');
assert.match(api, /jg_pembukuan_export_response/, 'The authenticated Accounting endpoint must own export generation.');
assert.match(page, /<h1>Accounting<\/h1>/, 'The normal Accounting heading must remain unchanged.');
assert.match(page, /<option value="expense_paid">Expense paid<\/option>/, 'Normal admin-facing transaction labels must remain unchanged.');

console.log('pembukuan-export-ui-test: ok');
