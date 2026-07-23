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
expect(html.includes('<th>Date</th>') && html.includes('<th>Reason</th>'), 'Cash history must label date and reason columns.');
expect(html.includes('>Amount</th>'), 'Cash history must use one signed amount column.');
expect(!html.includes('>Added</th>') && !html.includes('>Subtracted</th>'), 'Cash history must not split movements across two columns.');
expect(script.includes("buildUrl('cash_history'"), 'Cash history must load the reconciled API endpoint.');
expect(script.includes('data-accounting-cash-history-search'), 'Cash history must support searching.');
expect(script.includes("direction === 'added'") && script.includes("direction === 'subtracted'"), 'Cash history must support movement filters.');
expect(script.includes("isAddition ? '+' : '−'"), 'Cash movements must show an explicit signed amount.');
expect(styles.includes('td.is-added') && styles.includes('rgb(0, 250, 0)'), 'Dark-mode additions must be fully saturated green.');
expect(styles.includes('td.is-subtracted') && styles.includes('#ff1744'), 'Subtracted amounts must be neon red.');
expect(styles.includes('#16794a') && styles.includes('#b42318'), 'Light-mode movements must use restrained dark green and red.');
expect(styles.includes('font-weight: 400'), 'Colored movement amounts must use regular font weight.');

console.log('accounting-cash-history-ui-test: ok');
