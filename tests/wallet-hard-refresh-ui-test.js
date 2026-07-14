const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adminSource = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(root, 'dashboard', 'index.php'), 'utf8');

const expect = (condition, message) => {
  if (condition) return;
  console.error(message);
  process.exit(1);
};

const syncInvocations = adminSource.match(/syncWalletReleases\s*\(/g) || [];
expect(syncInvocations.length === 1, 'Wallet marketplace sync must only be invoked by the explicit click handler.');
expect(
  /walletRefs\.refresh\?\.addEventListener\('click',[\s\S]*?syncWalletReleases\(\)/.test(adminSource),
  'Hard Refresh must invoke the wallet marketplace sync when clicked.'
);
expect(!adminSource.includes('startWalletReleaseSync'), 'Wallet loading must not start an automatic marketplace sync.');
expect(dashboardSource.includes('data-wallet-refresh>Hard Refresh</button>'), 'Wallet must expose a visible Hard Refresh button.');

console.log('wallet-hard-refresh-ui-test: ok');
