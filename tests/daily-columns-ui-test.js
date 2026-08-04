const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

assert(
  dashboard.includes('name="platforms[]" value="whatsapp"')
    && dashboard.includes('name="platforms[]" value="baggos"')
    && (dashboard.match(/name="platforms\[\]"/g) || []).length >= 8,
  'Adding Daily columns must offer multi-select platform choices including WhatsApp and Baggos.'
);
assert(
  dashboard.includes('data-daily-platform-name name="column_name"')
    && dashboard.includes('data-daily-column-remove-dialog')
    && dashboard.includes('Are you sure?')
    && dashboard.includes('data-daily-column-remove-pin'),
  'The Daily UI must collect a column name and show a PIN-protected removal confirmation.'
);
assert(
  admin.includes("new FormData(form).getAll('platforms[]')")
    && admin.includes('const candidate = `${platform} / ${name}`;')
    && admin.includes("body: JSON.stringify({ action: 'verify_remove', pin })"),
  'The Daily handlers must add the named column for every selected platform and verify the PIN before removal.'
);
assert(
  /await requestJson\(dailyColumnsEndpoint,[\s\S]*?const removalKey = dailyAccountFromCustomName\(name\)\.key;[\s\S]*?persistDailyCustomPlatforms\(\)/.test(admin),
  'A manual column must remain in local storage unless server-side PIN verification succeeds.'
);
assert(
  styles.includes('.daily-platform-options input:checked + span')
    && styles.includes('.daily-column-remove-dialog'),
  'The multi-select controls and protected removal dialog must be styled.'
);

console.log('daily-columns-ui-test: ok');
