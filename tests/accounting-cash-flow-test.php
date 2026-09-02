<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function cash_flow_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE accounting_accounts (
    id INTEGER PRIMARY KEY, account_key TEXT, name TEXT, type TEXT, platform TEXT, brand TEXT,
    opening_balance REAL, current_balance_manual REAL NULL, is_spendable INTEGER, is_active INTEGER,
    balance_class TEXT, can_pay INTEGER, can_receive INTEGER, receives_automatic INTEGER,
    sort_order INTEGER, created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_categories (
    id INTEGER PRIMARY KEY, category_key TEXT, name TEXT, type TEXT, parent_id INTEGER NULL
)');
$pdo->exec('CREATE TABLE accounting_counterparties (id INTEGER PRIMARY KEY, name TEXT)');
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, transaction_key TEXT, transaction_date TEXT, business_month TEXT,
    type TEXT, direction TEXT, status TEXT, account_id INTEGER NULL, to_account_id INTEGER NULL,
    counterparty_id INTEGER NULL, category_id INTEGER NULL, bill_id INTEGER NULL, brand TEXT,
    channel TEXT, amount REAL, transfer_fee_amount REAL, payment_method TEXT, reference_no TEXT,
    invoice_no TEXT, order_no TEXT, receipt_url TEXT, receipt_status TEXT, review_status TEXT,
    review_reason TEXT, description TEXT, notes TEXT, created_by INTEGER NULL, created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_bills (
    id INTEGER PRIMARY KEY, bill_key TEXT, bill_no TEXT, vendor_id INTEGER, issue_date TEXT,
    due_date TEXT, business_month TEXT, category_id INTEGER NULL, brand TEXT, channel TEXT,
    total_amount REAL, paid_amount REAL, outstanding_amount REAL, status TEXT,
    expected_account_id INTEGER NULL, attachment_url TEXT, receipt_status TEXT, notes TEXT,
    created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_bill_payments (
    id INTEGER PRIMARY KEY, bill_id INTEGER, transaction_id INTEGER, payment_date TEXT,
    amount REAL, account_id INTEGER, payment_method TEXT, reference_no TEXT, notes TEXT
)');
$pdo->exec('CREATE TABLE dashboard_wallet_releases (
    id INTEGER PRIMARY KEY, platform TEXT, account_key TEXT, amount REAL, release_note TEXT,
    released_by TEXT, withdrawn_at TEXT NULL, created_at TEXT, undone_at TEXT NULL
)');
$pdo->exec('CREATE TABLE dashboard_wallet_platform_transactions (
    id INTEGER PRIMARY KEY, platform TEXT, account_key TEXT, transaction_id TEXT, order_id TEXT,
    transaction_type TEXT, money_flow TEXT, amount REAL, current_balance REAL NULL,
    transaction_at TEXT, raw_json TEXT NULL
)');
$pdo->exec('CREATE TABLE website_orders (
    id INTEGER PRIMARY KEY, platform TEXT, order_id TEXT, status TEXT, customer_name TEXT,
    gross_revenue REAL, net_revenue REAL, paid_at TEXT NULL, created_at TEXT
)');
$pdo->exec('CREATE TABLE whatsapp_orders (
    id INTEGER PRIMARY KEY, order_id TEXT, sales_channel TEXT, customer_name TEXT,
    merchandise_total REAL, shipping_cost REAL, status TEXT, payment_status TEXT,
    payment_method TEXT, payment_account_key TEXT, paid_at TEXT NULL,
    fulfilled_at TEXT NULL, created_at TEXT, archive_hide_financials INTEGER DEFAULT 0
)');

$pdo->exec("INSERT INTO accounting_accounts VALUES
    (1, 'bca-main', 'BCA Main', 'bank', '', '', 0, NULL, 1, 1, 'bank', 1, 1, 1, 10, '2026-01-01 00:00:00')");
$pdo->exec("INSERT INTO accounting_categories VALUES
    (1, 'partner-bill-collections', 'Partner bill collections', 'income', NULL),
    (2, 'other-income', 'Other income', 'income', NULL),
    (3, 'operations', 'Operations', 'expense', NULL),
    (4, 'supplier', 'Raw materials', 'expense', NULL)");
$pdo->exec("INSERT INTO accounting_counterparties VALUES
    (1, 'Partner Rina'), (2, 'Office supplier'), (3, 'Raw material supplier')");
$pdo->exec("INSERT INTO accounting_transactions VALUES
    (1, 'PARTNER', '2026-08-02', '2026-08', 'manual_income', 'money_in', 'posted', 1, NULL, 1, 1, NULL, '', 'Partner', 60000, 0, 'Bank Transfer', 'PB-1', '', '', '', 'not_required', 'clean', '', 'Partner payment', '', NULL, '2026-08-02 03:00:00'),
    (2, 'OTHER-IN', '2026-08-03', '2026-08', 'manual_income', 'money_in', 'posted', 1, NULL, NULL, 2, NULL, '', 'Offline', 40000, 0, 'Cash', 'INC-1', '', '', '', 'not_required', 'clean', '', 'Recorded other income', '', NULL, '2026-08-03 03:00:00'),
    (3, 'EXPENSE', '2026-08-04', '2026-08', 'expense', 'money_out', 'posted', 1, NULL, 2, 3, NULL, '', 'Internal', 30000, 0, 'Bank Transfer', 'EXP-1', '', '', '', 'attached', 'clean', '', 'Office expense', '', NULL, '2026-08-04 03:00:00'),
    (4, 'BILL-PAY', '2026-08-05', '2026-08', 'bill_payment', 'money_out', 'posted', 1, NULL, 3, NULL, 1, '', 'Internal', 20000, 0, 'Bank Transfer', 'BILL-1', '', '', '', 'attached', 'clean', '', 'Supplier bill payment', '', NULL, '2026-08-05 03:00:00'),
    (5, 'PO-PAY', '2026-08-06', '2026-08', 'expense', 'money_out', 'posted', 1, NULL, 3, 4, NULL, '', 'Production', 70000, 0, 'Bank Transfer', 'JG-PO-1', '', 'JG-PO-1', '', 'attached', 'clean', '', 'PO payment', '', NULL, '2026-08-06 03:00:00'),
    (6, 'TRANSFER', '2026-08-07', '2026-08', 'transfer', 'internal_transfer', 'posted', 1, 1, NULL, NULL, NULL, '', 'Internal', 10000, 1000, 'Bank Transfer', 'MOVE-1', '', '', '', 'not_required', 'clean', '', 'Internal move', '', NULL, '2026-08-07 03:00:00'),
    (7, 'DRAFT-COST', '2026-08-08', '2026-08', 'expense', 'money_out', 'draft', 1, NULL, 2, 3, NULL, '', 'Internal', 999000, 0, 'Bank Transfer', '', '', '', '', 'missing', 'clean', '', 'Not paid', '', NULL, '2026-08-08 03:00:00'),
    (8, 'OWNER-IN', '2026-08-09', '2026-08', 'owner_injection', 'money_in', 'posted', 1, NULL, NULL, NULL, NULL, '', 'Internal', 500000, 0, 'Bank Transfer', '', '', '', '', 'not_required', 'clean', '', 'Owner funding', '', NULL, '2026-08-09 03:00:00')");
$pdo->exec("INSERT INTO accounting_bills VALUES
    (1, 'bill-1', 'BILL-1', 3, '2026-07-20', '2026-08-10', '2026-07', 4, '', '', 20000, 20000, 0, 'paid', 1, '', 'attached', '', '2026-07-20 00:00:00'),
    (2, 'scheduled', 'SCHEDULED-ONLY', 3, '2026-08-01', '2026-08-20', '2026-08', 4, '', '', 800000, 0, 800000, 'unpaid', 1, '', 'missing', '', '2026-08-01 00:00:00')");
$pdo->exec("INSERT INTO accounting_bill_payments VALUES
    (1, 1, 4, '2026-08-05', 20000, 1, 'Bank Transfer', 'BILL-1', '')");
$pdo->exec("INSERT INTO dashboard_wallet_releases VALUES
    (1, 'shopee', 'jenang-gemi-shopee', 100000, 'Confirmed withdrawal', 'Test', '2026-08-01 02:00:00', '2026-08-01 02:00:00', NULL)");
$pdo->exec("INSERT INTO website_orders VALUES
    (1, 'jenang_gemi_website', 'WEB-PAID', 'PAID', 'Website customer', 80000, 80000, '2026-08-02 02:00:00', '2026-08-02 01:00:00'),
    (2, 'jenang_gemi_website', 'WEB-UNPAID', 'PENDING', 'Waiting customer', 900000, 900000, NULL, '2026-08-03 01:00:00')");
$pdo->exec("INSERT INTO whatsapp_orders VALUES
    (1, 'WA-PAID', 'whatsapp', 'Direct customer', 45000, 5000, 'FULFILLED', 'paid', 'qris', 'bca-main', '2026-08-03 02:00:00', '2026-08-03 04:00:00', '2026-08-03 01:00:00', 0),
    (2, 'WA-UNPAID', 'whatsapp', 'Waiting customer', 800000, 0, 'NEW', 'unpaid', '', '', NULL, NULL, '2026-08-04 01:00:00', 0)");

$poPdo = new PDO('sqlite::memory:');
$poPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$poPdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
jg_purchase_orders_ensure_schema($poPdo);
$poPdo->exec("INSERT INTO purchase_orders
    (id, po_number, request_key, status, order_type, tag, note, line_count, ordered_qty,
     received_qty, estimated_total, placed_by, placed_at, confirmed_at, updated_at, completed_at)
    VALUES
    (1, 'JG-PO-1', 'po-1', 'pending', 'reorder', 'Supplier', 'Paid production stock', 1, 5, 0, 70000, 'Test', '2026-08-01 00:00:00', '2026-08-01 00:00:00', '2026-08-01 00:00:00', NULL)");
$poPdo->exec("INSERT INTO purchase_order_payments
    (purchase_order_id, request_key, accounting_transaction_id, account_id, account_name,
     amount, payment_mode, item_ids_json, paid_by, paid_at)
    VALUES (1, 'po-payment-1', 5, 1, 'BCA Main', 70000, 'amount', '[]', 'Test', '2026-08-06 03:00:00')");

$report = jg_accounting_cash_flow_report($pdo, '2026-08', $poPdo);
cash_flow_expect(330000, $report['totals']['income'], 'Cash-flow income must include wallet, partner, website, direct-order, and other recorded receipts.');
cash_flow_expect(121000, $report['totals']['cost'], 'Cash-flow cost must include paid expenses, paid bills, paid POs, and transfer fees exactly once.');
cash_flow_expect(209000, $report['totals']['net_cash_flow'], 'Net cash flow must equal actual income minus actual paid cost.');
cash_flow_expect(9, $report['totals']['transaction_count'], 'Only confirmed cash movements and the real transfer fee should appear.');
cash_flow_expect(5, $report['totals']['income_count'], 'All five allowed income sources must remain individually visible.');
cash_flow_expect(4, $report['totals']['cost_count'], 'All four paid-cost records must remain individually visible.');
cash_flow_expect(31, count($report['daily']), 'The daily chart must expose every day in the selected month.');

$sourceTotals = [];
foreach ($report['source_summary'] as $row) $sourceTotals[$row['key']] = (int) $row['amount'];
cash_flow_expect(100000, $sourceTotals['wallet_withdrawal'] ?? null, 'Wallet withdrawals must have their own source breakdown.');
cash_flow_expect(60000, $sourceTotals['partner_payment'] ?? null, 'Partner payments must have their own source breakdown.');
cash_flow_expect(70000, $sourceTotals['paid_purchase_order'] ?? null, 'Paid POs must use the real payment record and date.');
cash_flow_expect(20000, $sourceTotals['paid_bill'] ?? null, 'Paid bill allocations must be classified by their actual payment.');

$references = array_column($report['transactions'], 'reference');
cash_flow_expect(false, in_array('SCHEDULED-ONLY', $references, true), 'Scheduled unpaid bills must never appear in cash flow.');
cash_flow_expect(1, count(array_filter($references, static fn (string $reference): bool => $reference === 'JG-PO-1')), 'A linked paid PO must never be counted twice.');

echo "accounting-cash-flow-test: ok\n";
