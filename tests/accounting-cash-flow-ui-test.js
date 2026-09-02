const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const accountingHtml = fs.readFileSync(path.join(root, 'profit-loss', 'index.php'), 'utf8');
const accountingScript = fs.readFileSync(path.join(root, 'profit-loss', 'accounting.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'cash-flow', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'cash-flow', 'cash-flow.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'accounting', 'index.php'), 'utf8');

const expect = (condition, message) => {
  if (condition) return;
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

expect(accountingHtml.includes('data-accounting-cash-flow-link'), 'Accounting must show a clickable cash-flow chart at the bottom of the page.');
expect(accountingHtml.includes('Income received') && accountingHtml.includes('Costs paid'), 'The Accounting preview must explain both sides of cash flow.');
expect(accountingScript.includes("buildUrl('cash_flow'"), 'The Accounting preview must use the canonical cash-flow report.');
expect(accountingScript.includes('../cash-flow/?month='), 'The Accounting chart must open the full breakdown for the selected month.');
expect(page.includes('data-cash-flow-month') && page.includes('data-cash-flow-year'), 'Cash Flow must provide explicit month and year controls.');
expect(page.includes('data-cash-flow-chart-axis'), 'The cash-flow chart must expose a readable value scale.');
expect(!page.includes('cash-flow-panel'), 'Cash Flow must read as one continuous report instead of a stack of generic cards.');
expect(page.includes('Every confirmed cash movement'), 'Cash Flow must provide a comprehensive transaction breakdown.');
expect(page.includes('data-cash-flow-filter') && page.includes('data-cash-flow-search'), 'The comprehensive ledger must be easy to filter and search.');
expect(script.includes('state.report?.transactions') && script.includes('row.category') && script.includes('row.reference'), 'The ledger must expose transaction, category, and reference details.');
expect(script.includes("['http:', 'https:'].includes(receiptUrl.protocol)"), 'Cash-flow receipt links must reject unsafe URL protocols.');
expect(api.includes("$action === 'cash_flow'") && api.includes('jg_accounting_cash_flow_report'), 'The Accounting API must expose the actual-payment cash-flow report.');
expect(css.includes('.cash-flow-chart') && css.includes('.cash-flow-table'), 'The daily chart and full cash-flow breakdown must be styled.');
expect(css.includes('--admin-bg: #000') && css.includes('background: #000 !important'), 'The cash-flow report must use true black instead of navy surfaces.');
expect(css.includes('.cash-flow-kpi + .cash-flow-kpi') && css.includes('border-left: 1px solid'), 'Cash-flow totals must use quiet dividers instead of separate cards.');
expect(css.includes('@media (max-width: 680px)') && css.includes('.cash-flow-kpis'), 'The Cash Flow page must adapt for mobile screens.');

process.stdout.write('accounting-cash-flow-ui-test: ok\n');
