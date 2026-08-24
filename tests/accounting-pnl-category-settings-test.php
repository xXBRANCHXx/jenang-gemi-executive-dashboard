<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function pnl_settings_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL . 'Expected: ' . var_export($expected, true) . PHP_EOL . 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_categories (
    id INTEGER PRIMARY KEY, category_key TEXT, parent_id INTEGER NULL, name TEXT,
    type TEXT, flow TEXT, is_active INTEGER, is_billable INTEGER
)');
$pdo->exec('CREATE TABLE accounting_category_guidance (category_id INTEGER PRIMARY KEY, account_code TEXT)');
$pdo->exec('CREATE TABLE accounting_pnl_category_settings (
    category_id INTEGER PRIMARY KEY, include_in_net_profit INTEGER, pnl_bucket TEXT, updated_at TEXT
)');
$pdo->exec("INSERT INTO accounting_categories VALUES
    (1, 'marketing', NULL, 'Marketing', 'marketing', 'expense', 1, 0),
    (2, 'content-production', 1, 'Produksi Konten (Content Production) - 62304', 'marketing', 'expense', 1, 1),
    (3, 'flat-rent', NULL, 'Sewa Kantor (Office Rent) - 6140', 'operations', 'expense', 1, 1)");
$pdo->exec("INSERT INTO accounting_category_guidance VALUES (2, '62304'), (3, '6140')");

$settings = array_column(jg_accounting_pnl_category_settings($pdo), null, 'category_id');
pnl_settings_expect(true, $settings[1]['is_group'], 'A category referenced as a parent must be displayed as a group.');
pnl_settings_expect(false, $settings[2]['is_group'], 'A child Accounting category must remain editable.');
pnl_settings_expect(false, $settings[3]['is_group'], 'A flat imported category must remain editable instead of disappearing as a false group.');
pnl_settings_expect(true, $settings[3]['include_in_net_profit'], 'A flat operating-expense category must receive its default P&L setting.');

echo "accounting-pnl-category-settings-test: ok\n";
