<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function category_management_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL . 'Expected: ' . var_export($expected, true) . PHP_EOL . 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, category_key TEXT UNIQUE, parent_id INTEGER NULL, name TEXT,
    type TEXT, flow TEXT, requires_receipt INTEGER, is_billable INTEGER, is_active INTEGER, sort_order INTEGER
)');
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, category_id INTEGER NULL, transaction_date TEXT, business_month TEXT
)');
$pdo->exec('CREATE TABLE accounting_bills (
    id INTEGER PRIMARY KEY, category_id INTEGER NULL, issue_date TEXT, business_month TEXT
)');
$pdo->exec('CREATE TABLE accounting_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT, entity_id INTEGER, action TEXT,
    old_value_json TEXT NULL, new_value_json TEXT NULL, created_by INTEGER NULL, created_at TEXT
)');

$pdo->exec("INSERT INTO accounting_categories
    (id, category_key, parent_id, name, type, flow, requires_receipt, is_billable, is_active, sort_order) VALUES
    (1, 'marketing', NULL, 'Marketing', 'marketing', 'expense', 0, 0, 1, 10),
    (2, 'operations', NULL, 'Operations', 'operations', 'expense', 0, 0, 1, 20),
    (3, 'shopee-ads', 1, 'Shopee Ads', 'marketing', 'expense', 1, 0, 1, 10),
    (4, 'retired', 1, 'Retired Ads', 'marketing', 'expense', 0, 0, 0, 20)");
$pdo->exec("INSERT INTO accounting_transactions VALUES
    (1, 3, '2026-01-05', '2026-01'), (2, 3, '2026-02-10', '2026-02'), (3, 3, '2026-03-15', '2026-03')");
$pdo->exec("INSERT INTO accounting_bills VALUES
    (1, 3, '2026-02-11', '2026-02'), (2, 3, '2026-04-01', '2026-04')");

$bulkGroup = jg_accounting_save_category($pdo, [
    'name' => 'Accountant-defined costs',
    'type' => 'expense',
    'flow' => 'expense',
    'is_billable' => false,
    'is_active' => true,
]);
$bulkGroupId = (int) ($bulkGroup['category_id'] ?? 0);
category_management_expect($bulkGroupId, (int) ($bulkGroup['category']['id'] ?? 0), 'A saved group must be returned immediately to the browser.');
for ($index = 1; $index <= 250; $index++) {
    $saved = jg_accounting_save_category($pdo, [
        'name' => 'Accountant category ' . $index,
        'parent_id' => $bulkGroupId,
        'type' => 'expense',
        'flow' => 'expense',
        'is_billable' => true,
        'is_active' => true,
    ]);
    category_management_expect((int) ($saved['category_id'] ?? 0), (int) ($saved['category']['id'] ?? 0), 'Every saved subcategory must be returned immediately to the browser.');
}
$bulkCategories = array_values(array_filter(
    jg_accounting_categories($pdo, true),
    static fn (array $row): bool => (int) ($row['parent_id'] ?? 0) === $bulkGroupId
));
category_management_expect(250, count($bulkCategories), 'Category retrieval must not impose an application-level row limit.');

$duplicateName = jg_accounting_create_category($pdo, [
    'name' => 'Accountant category 1',
    'parent_id' => 2,
    'type' => 'operations',
    'flow' => 'expense',
]);
category_management_expect(true, (int) ($duplicateName['id'] ?? 0) > 0, 'The legacy creation endpoint must create rather than overwrite a same-named category in another group.');
category_management_expect(2, (int) ($duplicateName['category']['parent_id'] ?? 0), 'The legacy creation endpoint must return the newly saved category.');

$longPrefix = str_repeat('Long category prefix ', 6);
$longNameOne = jg_accounting_save_category($pdo, [
    'name' => $longPrefix . 'one', 'parent_id' => $bulkGroupId, 'type' => 'expense', 'flow' => 'expense',
]);
$longNameTwo = jg_accounting_save_category($pdo, [
    'name' => $longPrefix . 'two', 'parent_id' => $bulkGroupId, 'type' => 'expense', 'flow' => 'expense',
]);
category_management_expect(
    false,
    ($longNameOne['category']['category_key'] ?? '') === ($longNameTwo['category']['category_key'] ?? ''),
    'Long category names with the same first 80 key characters must still receive unique storage keys.'
);

$all = jg_accounting_categories($pdo, true);
category_management_expect(258, count($all), 'Settings must receive every active, hidden, retired, and user-created category.');
$hidden = current(array_filter($all, static fn (array $row): bool => (int) $row['id'] === 3));
category_management_expect(0, $hidden['is_billable'] ?? null, 'An active category hidden from entry lists must retain that independent setting.');
category_management_expect(1, $hidden['is_active'] ?? null, 'Hidden-from-lists must not mean inactive.');
category_management_expect(0, $hidden['is_selectable'] ?? null, 'The API must explicitly prevent hidden categories from appearing on new bills and entries.');

$period = jg_accounting_move_category($pdo, [
    'category_id' => 3,
    'target_parent_id' => 2,
    'scope' => 'period',
    'date_from' => '2026-02-01',
    'date_to' => '2026-02-28',
    'flow' => 'expense',
]);
category_management_expect(1, $period['transactions_moved'], 'A period move must reclassify transactions inside the chosen dates.');
category_management_expect(1, $period['bills_moved'], 'A period move must reclassify bills using their issue dates.');
$destinationId = (int) $period['destination_category_id'];
category_management_expect([3, $destinationId, 3], array_map('intval', $pdo->query('SELECT category_id FROM accounting_transactions ORDER BY id')->fetchAll(PDO::FETCH_COLUMN)), 'Transactions outside the chosen period must remain in the original category.');
category_management_expect([$destinationId, 3], array_map('intval', $pdo->query('SELECT category_id FROM accounting_bills ORDER BY id')->fetchAll(PDO::FETCH_COLUMN)), 'Bills outside the chosen period must remain in the original category.');
$destination = $pdo->query('SELECT parent_id, type, is_billable, is_active FROM accounting_categories WHERE id = ' . $destinationId)->fetch(PDO::FETCH_ASSOC);
category_management_expect(2, (int) ($destination['parent_id'] ?? 0), 'The history-only copy must belong to the destination group.');
category_management_expect('operations', $destination['type'] ?? null, 'The history-only copy must use the destination reporting bucket.');
category_management_expect(0, (int) ($destination['is_billable'] ?? 1), 'A history-only destination must not appear in new-entry lists.');
category_management_expect(1, (int) ($destination['is_active'] ?? 0), 'A history-only destination must stay active in reports.');

$allTime = jg_accounting_move_category($pdo, [
    'category_id' => 3,
    'target_parent_id' => 2,
    'scope' => 'all',
    'flow' => 'expense',
]);
category_management_expect('all', $allTime['scope'], 'Fully retroactive moves must be explicit.');
$source = $pdo->query('SELECT parent_id, type, flow FROM accounting_categories WHERE id = 3')->fetch(PDO::FETCH_ASSOC);
category_management_expect(['parent_id' => 2, 'type' => 'operations', 'flow' => 'expense'], array_map(static fn ($value) => is_numeric($value) ? (int) $value : $value, $source), 'A fully retroactive move must move the category definition to its new reporting group.');
category_management_expect(2, (int) $pdo->query("SELECT COUNT(*) FROM accounting_audit_log WHERE action = 'move'")->fetchColumn(), 'Every historical move must be auditable.');

echo "accounting-category-management-test: ok\n";
