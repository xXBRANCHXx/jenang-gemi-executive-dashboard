const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'profit-loss', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'profit-loss', 'accounting.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

expect(html.includes('data-accounting-cash-history-open'), 'Cash Available must expose a history trigger.');
expect(html.includes('data-accounting-cash-history-body'), 'Cash history must include the spreadsheet body.');
expect(html.includes('class="admin-accounting-cash-history-close"'), 'Cash history must use a standalone icon close control.');
expect(!html.includes('class="admin-ghost-btn" data-accounting-cash-history-close'), 'Cash history close control must not use the pill button style.');
expect(html.includes('<th>Date</th>') && html.includes('<th>Reason</th>'), 'Cash history must label date and reason columns.');
expect(html.includes('>Amount</th>'), 'Cash history must use one signed amount column.');
expect(!html.includes('>Added</th>') && !html.includes('>Subtracted</th>'), 'Cash history must not split movements across two columns.');
expect(script.includes("buildUrl('cash_history'"), 'Cash history must load the reconciled API endpoint.');
expect(html.includes('data-accounting-cash-history-platform'), 'Cash history must expose a platform dropdown.');
expect(!html.includes('data-accounting-cash-history-search'), 'Cash history must replace free-text search with the platform dropdown.');
expect(script.includes('populateCashHistoryPlatforms'), 'Cash history must populate filters from available platform data.');
expect(script.includes("['shopee', 'Shopee']") && script.includes("['tiktok', 'TikTok']"), 'Cash history must always offer the core marketplace platforms.');
expect(script.includes('platformSummary.current_cash'), 'Cash history must recalculate platform-specific summary totals.');
expect(script.includes("'Net platform cash'"), 'Cash history must label a filtered net without presenting it as the full bank balance.');
expect(script.includes('platformRunningBalances'), 'Cash history must recalculate running balances for the selected platform.');
expect(script.includes("direction === 'added'") && script.includes("direction === 'subtracted'"), 'Cash history must support movement filters.');
expect(script.includes("isAddition ? '+' : '−'"), 'Cash movements must show an explicit signed amount.');
expect(styles.includes('td.is-added') && styles.includes('rgb(0, 250, 0)'), 'Dark-mode additions must be fully saturated green.');
expect(styles.includes('td.is-subtracted') && styles.includes('rgb(250, 0, 0)'), 'Dark-mode subtractions must be fully saturated red.');
expect(styles.includes('#16794a') && styles.includes('#b42318'), 'Light-mode movements must use restrained dark green and red.');
expect(styles.includes('font-weight: 400'), 'Colored movement amounts must use regular font weight.');

console.log('accounting-cash-history-ui-test: ok');
