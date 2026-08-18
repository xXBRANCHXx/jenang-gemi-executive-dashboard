<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function category_guidance_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL . 'Expected: ' . var_export($expected, true) . PHP_EOL . 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_categories (
    id INTEGER PRIMARY KEY, category_key TEXT UNIQUE, parent_id INTEGER NULL, name TEXT,
    type TEXT, flow TEXT, requires_receipt INTEGER, is_billable INTEGER, is_active INTEGER, sort_order INTEGER
)');
$pdo->exec('CREATE TABLE accounting_category_guidance (
    category_id INTEGER PRIMARY KEY, account_code TEXT, hover_summary TEXT, definition TEXT,
    when_to_use TEXT, when_not_to_use TEXT, examples TEXT, documentation TEXT,
    accounting_treatment TEXT, tax_legal_notes TEXT, controls TEXT, `references` TEXT,
    created_at TEXT, updated_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT, entity_id INTEGER, action TEXT,
    old_value_json TEXT NULL, new_value_json TEXT NULL, created_by INTEGER NULL, created_at TEXT
)');
$pdo->exec("INSERT INTO accounting_categories VALUES
    (1, 'people', NULL, 'Beban Karyawan (Emp. Expenses)', 'payroll', 'expense', 0, 0, 1, 10),
    (2, 'employee-salary-7101', 1, 'Gaji Karyawan (Emp. Salaries) - 7101', 'payroll', 'expense', 0, 1, 1, 20),
    (3, 'overtime-7103', 1, 'Uang Lembur (Overtime Pay) - 7103', 'payroll', 'expense', 0, 1, 1, 30)");

$salary = jg_accounting_category_guidance($pdo, 2);
category_guidance_expect('7101', $salary['guidance']['account_code'] ?? null, 'The account code must be derived from the live category name.');
category_guidance_expect(true, str_contains((string) ($salary['guidance']['hover_summary'] ?? ''), 'Regular employee salary'), 'Code 7101 must receive a specific, useful hover explanation.');
category_guidance_expect(true, str_contains((string) ($salary['guidance']['when_not_to_use'] ?? ''), '7103'), 'Salary guidance must distinguish overtime and other nearby payroll codes.');
category_guidance_expect(true, str_contains((string) ($salary['guidance']['references'] ?? ''), 'PMK 168/2023'), 'Payroll defaults must point reviewers to the authoritative PPh 21 rule.');

$saved = jg_accounting_save_category_guidance($pdo, [
    'category_id' => 2,
    'account_code' => '7101-JG',
    'hover_summary' => 'Use only for approved monthly base salary.',
    'definition' => 'Accountant-approved Jenang Gemi definition.',
]);
category_guidance_expect('7101-JG', $saved['guidance']['account_code'] ?? null, 'Accountants must be able to edit the account code.');
category_guidance_expect('Use only for approved monthly base salary.', $saved['guidance']['hover_summary'] ?? null, 'The saved hover explanation must replace the researched default.');
category_guidance_expect(true, (bool) ($saved['guidance']['is_customized'] ?? false), 'Saved guidance must be identified as accountant-edited.');
category_guidance_expect(1, (int) $pdo->query("SELECT COUNT(*) FROM accounting_audit_log WHERE entity_type = 'category_guidance'")->fetchColumn(), 'Guidance changes must be auditable.');

$categories = jg_accounting_categories($pdo, true);
$savedCategory = current(array_filter($categories, static fn (array $row): bool => (int) $row['id'] === 2));
category_guidance_expect('Use only for approved monthly base salary.', $savedCategory['help_summary'] ?? null, 'Category lookups must include the current hover explanation.');
category_guidance_expect('Accountant-approved Jenang Gemi definition.', $savedCategory['guidance']['definition'] ?? null, 'Settings must receive all editable guidance fields.');

$script = file_get_contents(dirname(__DIR__) . '/profit-loss/accounting.js');
$page = file_get_contents(dirname(__DIR__) . '/accounting-category/index.php');
category_guidance_expect(true, str_contains((string) $script, 'class="admin-accounting-category-info"'), 'Every rendered category option must include the plain information icon.');
category_guidance_expect(true, str_contains((string) $script, 'target="_blank"'), 'The information icon must open its guide in a new tab.');
category_guidance_expect(true, str_contains((string) $script, 'name="tax_legal_notes"'), 'Tax and legal guidance must be editable in category settings.');
category_guidance_expect(true, str_contains((string) $page, 'What it is and what it means'), 'The full guide must explain the category meaning in depth.');
category_guidance_expect(true, str_contains((string) $page, 'Controls and reviewer checks'), 'The full guide must include month-end and review controls.');

echo "accounting-category-guidance-test: ok\n";
