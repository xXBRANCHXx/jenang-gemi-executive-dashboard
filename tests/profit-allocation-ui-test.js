const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'profit-and-loss', 'pnl.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'profit-and-loss', 'index.php'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');

assert.match(page, /data-pnl-allocation-tree/, 'The P&L must show the profit allocation tree.');
assert.match(page, /data-pnl-edit-allocation/, 'The P&L must provide allocation settings.');
assert.match(page, /data-pnl-add-allocation/, 'Allocation settings must allow new top-level items.');
assert.match(script, /data-pnl-add-child/, 'Allocation settings must allow deeper sub-splits.');
assert.match(script, /action: 'save_allocation_tree'/, 'Allocation settings must persist the hierarchy.');
assert.match(script, /validateAllocationTree/, 'Every allocation level must be validated before saving.');
assert.match(script, /Math\.max\(0, Number\(netProfit\)/, 'Only positive net profit may be distributed.');
assert.match(styles, /\.pnl-allocation-dialog::backdrop/, 'The allocation editor must have modal styling.');

(async () => {
  const { balanceAllocationRounding } = await import(pathToFileURL(path.join(root, 'profit-and-loss', 'pnl.js')).href);
  const balanced = balanceAllocationRounding([{
    id: 'parent',
    name: 'Parent',
    percentage: 100,
    children: [
      { id: 'a', name: 'A', percentage: 33.33, children: [] },
      { id: 'b', name: 'B', percentage: 33.33, children: [] },
      { id: 'c', name: 'C', percentage: 33.33, children: [] }
    ]
  }]);
  assert.deepEqual(
    balanced[0].children.map((item) => item.percentage),
    [33.33, 33.33, 33.34],
    'The browser must turn a rounded nested three-way split into exactly 100% before saving.'
  );
  console.log('Profit allocation UI checks passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
