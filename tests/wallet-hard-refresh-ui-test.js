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

expect(
  /walletRefs\.refresh\?\.addEventListener\('click',[\s\S]*?startWalletReleaseSync\(\{ force: true, interactive: true \}\)/.test(adminSource),
  'Hard Refresh must start the bounded background wallet synchronization.'
);
expect(adminSource.includes("phase: 'wallet_account'"), 'Wallet ledgers must refresh through account-bounded requests.');
expect(adminSource.includes("'sync_tiktok_withdrawals'"), 'TikTok withdrawals must refresh through a separate action.');
expect(adminSource.includes("responseKey: 'tiktok_withdrawal_sync'"), 'TikTok withdrawal responses must remain separate from Shopee wallet sync.');
expect(adminSource.includes("phase: 'orders'"), 'Hard Refresh must still repair released order finance.');
expect(adminSource.includes('Promise.allSettled(tasks)'), 'Order and account wallet refreshes must run concurrently.');
expect(
  /handleLiveChange[\s\S]*?startWalletReleaseSync\(\{ force: true, skipRemote: true \}\)/.test(adminSource),
  'Marketplace live events must refresh released wallet funds in the background.'
);
expect(
  /runWalletBackgroundRefresh[\s\S]*?startWalletReleaseSync\(\{ skipRemote: true \}\)/.test(adminSource),
  'Periodic wallet refreshes must also update marketplace wallet ledgers.'
);
expect(dashboardSource.includes('data-wallet-refresh>Hard Refresh</button>'), 'Wallet must expose a visible Hard Refresh button.');

console.log('wallet-hard-refresh-ui-test: ok');
