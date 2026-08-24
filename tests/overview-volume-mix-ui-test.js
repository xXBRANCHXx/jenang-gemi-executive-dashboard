const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const salesApi = fs.readFileSync(path.join(root, 'api', 'sales', 'index.php'), 'utf8');

assert.match(
  salesApi,
  /'syrup'\s*=>\s*\[[\s\S]*?'volumes'\s*=>\s*\[550\.0, 250\.0, 60\.0, 50\.0\]/,
  'The sales API must aggregate 60ml as a dedicated syrup volume.'
);
assert.match(
  page,
  /Syrup volume mix[\s\S]*?550ml, 250ml, 60ml, 50ml[\s\S]*?data-overview-syrup-volume-chart/,
  'C14 must disclose all four syrup volumes.'
);
assert.match(
  script,
  /syrupVolumeCanvas[\s\S]*?syrupVolumeRows[\s\S]*?limit: 4/,
  'C14 must render all four syrup volume slices and legend entries.'
);

console.log('overview-volume-mix-ui-test: ok');
