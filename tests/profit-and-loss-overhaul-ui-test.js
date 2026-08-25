const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'profit-and-loss/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'profit-and-loss/pnl.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'profit-and-loss/pnl.css'), 'utf8');

assert.match(page, /data-pnl-bottom-period/, 'The page must lead with the period-aware bottom line.');
assert.match(page, /data-pnl-retention-ring/, 'The bottom line must include the animated retention ring.');
assert.match(page, /data-pnl-composition/, 'The page must show how every rupiah was used.');
assert.match(page, /data-pnl-tab="statement"/, 'The statement tab must remain available.');
assert.match(page, /data-pnl-tab="monthly"/, 'Monthly performance must remain available.');
assert.match(page, /data-pnl-tab="allocation"/, 'Profit allocation must remain available.');
assert.match(page, /href="\.\/expense-settings\/"/, 'Expense category management must remain a separate page.');
assert.doesNotMatch(page, /class="pnl-kpis"/, 'The redesign must not restore the top KPI card row.');

assert.match(script, /const animateRetentionRing/, 'The profit ring must animate when data loads.');
assert.match(script, /\.animate\(/, 'The chart renderer must use motion rather than static redraws.');
assert.match(script, /const setActiveTab/, 'The redesign must provide working panel navigation.');
assert.match(script, /netProfit: revenue - productCosts - packingCosts - opex/, 'The production P&L arithmetic must remain unchanged.');
assert.match(script, /pnl_summary/, 'The existing Accounting P&L summary source must remain connected.');
assert.match(script, /scope=allocation_settings/, 'The existing allocation settings source must remain connected.');

assert.doesNotMatch(styles, /gradient\s*\(/i, 'The redesign must use flat fills without gradients.');
assert.match(styles, /\.is-profit-and-loss[^{]*\{[\s\S]*?--pnl-v2-bg:\s*#000(?:000)?;/, 'Dark mode must use true black.');
assert.match(styles, /:root\[data-admin-theme=['"]light['"]\][\s\S]*?--pnl-v2-bg:/, 'The page must define a complete light theme.');
assert.match(styles, /backdrop-filter:\s*none/, 'The allocation dialog backdrop must not use glass blur.');
assert.match(styles, /@keyframes pnl-v2-segment-in/, 'Composition segments must have an entrance animation.');
assert.match(styles, /@keyframes pnl-v2-bar-in/, 'Ranked expense bars must have an entrance animation.');
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/, 'Motion must respect reduced-motion preferences.');

console.log('Profit & Loss overhaul UI test passed.');
