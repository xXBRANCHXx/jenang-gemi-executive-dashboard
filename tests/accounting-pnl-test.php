<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function pnl_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_categories (id INTEGER PRIMARY KEY, type TEXT, category_key TEXT)');
$pdo->exec('CREATE TABLE accounting_pnl_category_settings (
    category_id INTEGER PRIMARY KEY, include_in_net_profit INTEGER NOT NULL, pnl_bucket TEXT NOT NULL, updated_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, business_month TEXT, status TEXT, direction TEXT,
    type TEXT, category_id INTEGER NULL, amount REAL, transfer_fee_amount REAL
)');
$pdo->exec('CREATE TABLE accounting_review_queue (id INTEGER PRIMARY KEY, status TEXT)');
$pdo->exec("INSERT INTO accounting_categories VALUES
    (1, 'marketing', 'meta-ads'), (2, 'cogs_support', 'raw-materials'), (3, 'payroll', 'salary'),
    (4, 'operations', 'rent'), (5, 'asset', 'equipment'), (6, 'marketing', 'content-production'),
    (7, 'income', 'partner-bill-collections'), (8, 'cogs_support', 'packaging')");
$pdo->exec("INSERT INTO accounting_transactions VALUES
    (1, '2026-07', 'posted', 'money_out', 'expense', 1, 100, 0),
    (2, '2026-07', 'posted', 'money_out', 'expense', 2, 500, 0),
    (3, '2026-07', 'posted', 'money_out', 'expense', 3, 200, 0),
    (4, '2026-07', 'posted', 'money_out', 'expense', 4, 150, 0),
    (5, '2026-07', 'posted', 'money_out', 'expense', 5, 300, 0),
    (6, '2026-07', 'posted', 'money_out', 'refund', 4, 50, 0),
    (7, '2026-07', 'posted', 'money_in', 'manual_income', 4, 40, 0),
    (8, '2026-07', 'posted', 'money_in', 'loan_received', 4, 1000, 0),
    (9, '2026-07', 'posted', 'internal_transfer', 'transfer', NULL, 200, 10),
    (10, '2026-07', 'void', 'money_out', 'expense', 1, 999, 0),
    (11, '2026-07', 'posted', 'money_out', 'expense', 6, 75, 0),
    (12, '2026-07', 'posted', 'money_in', 'manual_income', 7, 60, 0),
    (13, '2026-07', 'posted', 'money_out', 'expense', 8, 80, 0),
    (14, '2026-07', 'posted', 'money_out', 'expense', 2, 300, 0),
    (15, '2026-07', 'void', 'money_out', 'expense', 2, 999, 0)");
$pdo->exec("INSERT INTO accounting_review_queue VALUES (1, 'open'), (2, 'open'), (3, 'resolved')");
$summary = jg_accounting_pnl_summary($pdo, 2026);
$july = $summary['months'][6];
pnl_expect(100, $july['ad_cost'], 'Only platform-ad categories must become ad cost.');
pnl_expect(75, $july['marketing_other'], 'Non-ad marketing must remain visible without inflating ad cost.');
pnl_expect(175, $july['marketing'], 'Total marketing must include platform ads and other marketing.');
pnl_expect(200, $july['payroll'], 'Payroll must remain a separate operating expense.');
pnl_expect(150, $july['operations'], 'Operations must exclude refunds, assets, and voided rows.');
pnl_expect(10, $july['transfer_fees'], 'Transfer fees must be treated as operating cost.');
pnl_expect(535, $july['operating_expenses'], 'Operating expense must combine ads, other marketing, payroll, operations, and fees.');
pnl_expect(800, $july['product_purchases'], 'Accounting product purchases must remain available for reconciliation without reading PO payments.');
pnl_expect(800, $july['product_costs'], 'Accounting product category totals must not be replaced by PO payment rows.');
pnl_expect(false, array_key_exists('po_payment_count', $summary), 'The P&L summary must not depend on PO payment counts.');
pnl_expect('sales_service_sold_unit_cogs', $summary['product_cost_basis'], 'The P&L must disclose sold-product COGS as its product-cost basis.');
pnl_expect('sold_units_x_1500', $summary['packing_cost_basis'], 'The P&L must disclose the fixed packing assumption.');
pnl_expect(80, $july['packing_costs'], 'Accounting packaging payments must remain available for reconciliation only.');
pnl_expect(50, $july['manual_refunds'], 'Manual customer refunds must reduce report revenue separately.');
pnl_expect(60, $july['partner_payments'], 'Confirmed partner payments must be identified as revenue.');
pnl_expect(40, $july['other_income'], 'Non-partner manual operating income must remain separate.');
pnl_expect(300, $july['asset_purchases'], 'Asset purchases must be disclosed but excluded from profit expense.');
pnl_expect(2, $summary['open_review_items'], 'Open Accounting review items must be disclosed on the P&L.');

$settings = array_column($summary['category_settings'], null, 'category_id');
pnl_expect(true, $settings[2]['include_in_net_profit'], 'Product categories must initially be included using the best default.');
pnl_expect('product_cost', $settings[2]['pnl_bucket'], 'Raw materials must initially map to PO / product cost.');
pnl_expect('packing_cost', $settings[8]['pnl_bucket'], 'Packaging must initially map to actual packing cost.');
pnl_expect(false, $settings[5]['include_in_net_profit'], 'Asset purchases must initially be excluded from Net Profit.');

jg_accounting_save_pnl_category_settings($pdo, ['settings' => [
    ['category_id' => 4, 'include_in_net_profit' => false, 'pnl_bucket' => 'operations'],
    ['category_id' => 5, 'include_in_net_profit' => true, 'pnl_bucket' => 'operations'],
]]);
$customSummary = jg_accounting_pnl_summary($pdo, 2026);
$customJuly = $customSummary['months'][6];
pnl_expect(300, $customJuly['operations'], 'Saved toggles must exclude rent and allow an explicitly included asset category.');
pnl_expect(685, $customJuly['operating_expenses'], 'Net-profit expenses must immediately reflect saved category settings.');

echo "accounting-pnl-test: ok\n";
