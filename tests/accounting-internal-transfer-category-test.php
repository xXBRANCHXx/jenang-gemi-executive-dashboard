<?php
declare(strict_types=1);

require_once __DIR__ . '/../accounting-bootstrap.php';

function internal_transfer_category_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_categories (
    id INTEGER PRIMARY KEY, category_key TEXT NULL, parent_id INTEGER NULL, name TEXT NOT NULL
)');
$pdo->exec('CREATE TABLE accounting_category_guidance (
    category_id INTEGER PRIMARY KEY, account_code TEXT NOT NULL
)');
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, type TEXT NOT NULL, direction TEXT NOT NULL, status TEXT NOT NULL, category_id INTEGER NULL
)');

$pdo->exec("INSERT INTO accounting_categories (id, category_key, parent_id, name) VALUES
    (1, 'wrong-group', NULL, 'Wrong group'),
    (2, 'wrong-category', 1, 'Wrong category'),
    (10, 'cash-bank-settlement', NULL, 'Kas, Bank & Settlement (Cash, Bank & Settlement)'),
    (11, 'operating-cash', 10, 'Kas Operasional (Operating Cash)')");
$pdo->exec("INSERT INTO accounting_category_guidance (category_id, account_code) VALUES
    (2, '99999'),
    (11, '11102')");
$pdo->exec("INSERT INTO accounting_transactions (id, type, direction, status, category_id) VALUES
    (1, 'transfer', 'internal_transfer', 'posted', NULL),
    (2, 'transfer', 'internal_transfer', 'posted', 2),
    (3, 'expense', 'money_out', 'posted', 2),
    (4, 'transfer', 'internal_transfer', 'void', 2)");

internal_transfer_category_expect(11, jg_accounting_internal_transfer_category_id($pdo), 'Code 11102 must identify Operating Cash.');
internal_transfer_category_expect(11, jg_accounting_transaction_category_id($pdo, 'transfer', 'internal_transfer', 2), 'A hidden or submitted category must not override the internal-transfer category.');
internal_transfer_category_expect(2, jg_accounting_transaction_category_id($pdo, 'expense', 'money_out', 2), 'Other transaction categories must remain unchanged.');
internal_transfer_category_expect(2, jg_accounting_apply_internal_transfer_category($pdo), 'Both uncategorized and incorrectly categorized posted transfers must be repaired.');

$categories = $pdo->query('SELECT category_id FROM accounting_transactions ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
internal_transfer_category_expect([11, 11, 2, 2], array_map('intval', $categories), 'Only active internal transfers must be assigned to Operating Cash.');

$pdo->exec('DELETE FROM accounting_category_guidance');
internal_transfer_category_expect(11, jg_accounting_internal_transfer_category_id($pdo), 'The bilingual category hierarchy must remain a safe fallback when guidance is unavailable.');

$pdo->exec("UPDATE accounting_categories SET name = 'Renamed system category', parent_id = NULL WHERE id = 11");
internal_transfer_category_expect(11, jg_accounting_internal_transfer_category_id($pdo), 'The stable system category key must survive display-name and hierarchy changes.');

$source = file_get_contents(__DIR__ . '/../accounting-bootstrap.php');
internal_transfer_category_expect(true, str_contains($source, "['cash-bank-settlement', 'Kas, Bank & Settlement (Cash, Bank & Settlement)', 'asset']"), 'The cash and bank category group must be seeded.');
internal_transfer_category_expect(true, str_contains($source, "['cash-bank-settlement', 'operating-cash', 'Kas Operasional (Operating Cash) - 11102', 'asset', 0]"), 'Operating Cash 11102 must be seeded as a non-billable child category.');

echo "Accounting internal transfer category tests passed.\n";
