<?php
declare(strict_types=1);

$source = file_get_contents(dirname(__DIR__) . '/accounting-bootstrap.php');
if (!is_string($source)) {
    fwrite(STDERR, "Unable to read Accounting source.\n");
    exit(1);
}

function batch_payment_expect(bool $condition, string $message): void
{
    if ($condition) return;
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

batch_payment_expect(
    str_contains($source, '$rawAllocations = $body[\'bill_allocations\'] ?? null;'),
    'Bill payments must accept explicit invoice allocations.'
);
batch_payment_expect(
    str_contains($source, 'A combined transfer can only contain bills from one vendor.'),
    'Combined payments must reject allocations across different vendors.'
);
batch_payment_expect(
    str_contains($source, "'bill_id' => count(\$bills) === 1 ? (int) array_key_first(\$bills) : null"),
    'A batch must create one parent bank transaction instead of pretending it belongs to one invoice.'
);
batch_payment_expect(
    str_contains($source, 'foreach ($allocations as $billId => $allocationAmount)'),
    'Every invoice allocation must update its own outstanding balance.'
);
batch_payment_expect(
    str_contains($source, 'AND issue_key = "overdue_bill" AND status = "open"')
        && str_contains($source, "if (\$newStatus === 'paid')"),
    'Fully paid bills must close their overdue warnings without hiding unrelated review issues.'
);
batch_payment_expect(
    str_contains($source, 'SELECT * FROM accounting_bill_payments WHERE transaction_id = :transaction_id ORDER BY id ASC'),
    'Voiding a combined transfer must discover all of its bill allocations.'
);
batch_payment_expect(
    str_contains($source, '2026_08_06_void_mistaken_legal_expense_v1')
        && str_contains($source, 'txn-20260806164531-1dbc9200')
        && str_contains($source, "':amount' => 120500"),
    'The mistaken Legal expense must be voided once using the exact transaction identity and amount.'
);

require_once dirname(__DIR__) . '/accounting-bootstrap.php';
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, business_month TEXT, status TEXT, direction TEXT, type TEXT,
    category_id INTEGER NULL, brand TEXT, channel TEXT, amount INTEGER, transfer_fee_amount INTEGER
)');
$pdo->exec('CREATE TABLE accounting_categories (
    id INTEGER PRIMARY KEY, parent_id INTEGER NULL, category_key TEXT, name TEXT, type TEXT
)');
$pdo->exec('CREATE TABLE accounting_bills (
    id INTEGER PRIMARY KEY, category_id INTEGER, brand TEXT, channel TEXT
)');
$pdo->exec('CREATE TABLE accounting_bill_payments (
    id INTEGER PRIMARY KEY, transaction_id INTEGER, bill_id INTEGER, amount INTEGER
)');
$pdo->exec('CREATE TABLE accounting_review_queue (id INTEGER PRIMARY KEY, status TEXT)');
$pdo->exec("INSERT INTO accounting_categories VALUES
    (1, NULL, 'meta-ads', 'Meta ads', 'marketing'),
    (2, NULL, 'legal-permits', 'Legal / Permits', 'tax')");
$pdo->exec("INSERT INTO accounting_transactions VALUES
    (10, '2026-08', 'posted', 'money_out', 'bill_payment', NULL, '', '', 300, 0)");
$pdo->exec("INSERT INTO accounting_bills VALUES
    (20, 1, 'Jenang Gemi', 'Ads'),
    (21, 2, 'ZERO', 'Internal')");
$pdo->exec("INSERT INTO accounting_bill_payments VALUES
    (1, 10, 20, 100),
    (2, 10, 21, 200)");

batch_payment_expect(
    jg_accounting_category_type_total($pdo, '2026-08', 'marketing') === 100,
    'Category totals must use each invoice allocation instead of assigning the whole bank transfer to one category.'
);
$pnl = jg_accounting_pnl_summary($pdo, 2026);
$august = $pnl['months'][7] ?? [];
batch_payment_expect(
    (int) ($august['ad_cost'] ?? 0) === 100 && (int) ($august['operations'] ?? 0) === 200,
    'Cash-basis P&L must preserve mixed categories inside a combined bill payment.'
);
$categorySummary = jg_accounting_group_summary($pdo, '2026-08', 'category');
batch_payment_expect(
    array_column($categorySummary, 'this_month', 'label') === ['Legal / Permits' => 200, 'Meta ads' => 100],
    'Category insights must split a combined bank transfer back across its invoices.'
);

echo "accounting-batch-payment-test: ok\n";
