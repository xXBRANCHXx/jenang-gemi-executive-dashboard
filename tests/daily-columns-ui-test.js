const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const platformHelperStart = admin.indexOf('const dailyPlatformOptionsFromData');
const platformHelperEnd = admin.indexOf('const renderDailyPlatformOptions', platformHelperStart);
const { dailyPlatformOptionsFromData } = new Function(
  `${admin.slice(platformHelperStart, platformHelperEnd)}\nreturn { dailyPlatformOptionsFromData };`
)();

assert.deepEqual(
  dailyPlatformOptionsFromData({ accounts: [
    { key: 'baggos:first', platform: 'Baggos' },
    { key: 'shopee:main', platform: 'Shopee' },
    { key: 'baggos:second', platform: 'Baggos' }
  ] }),
  [{ key: 'baggos', label: 'Baggos' }, { key: 'shopee', label: 'Shopee' }],
  'Platform options must be deduplicated from the loaded account data.'
);

assert(
  dashboard.includes('data-daily-platform-options')
    && !dashboard.includes('name="platforms[]"')
    && !admin.includes('DAILY_PLATFORM_LABELS')
    && /const dailyPlatformOptionsFromData = \(dailyData\)[\s\S]*?dailyData\?\.accounts[\s\S]*?account\?\.key[\s\S]*?platforms\.set/.test(admin),
  'Adding Daily columns must derive every platform option from existing loaded Daily accounts without hardcoded choices.'
);
assert(
  dashboard.includes('data-daily-platform-name name="column_name"')
    && dashboard.includes('data-daily-column-remove-dialog')
    && dashboard.includes('Are you sure?')
    && dashboard.includes('data-daily-column-remove-pin')
    && dashboard.includes('data-daily-column-edit-dialog')
    && dashboard.includes('Edit column name'),
  'The Daily UI must collect a column name, support later renaming, and show a PIN-protected removal confirmation.'
);
assert(
  admin.includes("new FormData(form).getAll('platforms[]')")
    && admin.includes('const candidate = `${platform} / ${name}`;')
    && admin.includes("body: JSON.stringify({ action: 'verify_remove', pin })")
    && admin.includes('data-daily-edit-platform')
    && admin.includes('state.daily.customPlatforms = state.daily.customPlatforms.map'),
  'The Daily handlers must add named columns, rename them afterward, and verify the PIN before removal.'
);
assert(
  /await requestJson\(dailyColumnsEndpoint,[\s\S]*?const removalKey = dailyAccountFromCustomName\(name\)\.key;[\s\S]*?persistDailyCustomPlatforms\(\)/.test(admin),
  'A manual column must remain in local storage unless server-side PIN verification succeeds.'
);
assert(
  styles.includes('.daily-platform-options input:checked + span')
    && styles.includes('.daily-column-remove-dialog')
    && styles.includes('.daily-platform-chip-actions button'),
  'The dynamic multi-select, edit controls, and protected removal dialog must be styled.'
);

console.log('daily-columns-ui-test: ok');
