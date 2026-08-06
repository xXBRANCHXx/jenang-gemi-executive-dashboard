<?php
declare(strict_types=1);

require dirname(__DIR__) . '/partner-billing-bootstrap.php';

function admin_partner_billing_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$period = jg_admin_partner_billing_period(new DateTimeImmutable('2026-07-01 12:00:00', new DateTimeZone('Asia/Jakarta')));
admin_partner_billing_expect('business_week', $period['type'], 'Business week must be the safe default.');
admin_partner_billing_expect('2026-06-29', $period['start'], 'A Wednesday must start in its Monday business week.');
admin_partner_billing_expect('2026-07-03', $period['end'], 'A business week must end on Friday.');
admin_partner_billing_expect('2026-07-06', $period['due'], 'A business-week PO remains due three days after Friday.');
$weekend = jg_admin_partner_billing_period(new DateTimeImmutable('2026-07-04 12:00:00', new DateTimeZone('Asia/Jakarta')));
admin_partner_billing_expect('2026-07-06', $weekend['start'], 'Weekend orders must roll into the following business week.');
$month = jg_admin_partner_billing_period(new DateTimeImmutable('2026-07-18 12:00:00', new DateTimeZone('Asia/Jakarta')), 'calendar_month');
admin_partner_billing_expect('2026-07-01', $month['start'], 'Calendar-month billing must begin on day one.');
admin_partner_billing_expect('2026-07-31', $month['end'], 'Calendar-month billing must use the actual month end.');
admin_partner_billing_expect('2026-08-03', $month['due'], 'Calendar-month POs remain due three days after month end.');
admin_partner_billing_expect('July 1–31, 2026', jg_admin_partner_billing_period_label('2026-07-01', '2026-07-31'), 'Notification copy should use the configured period dates.');
admin_partner_billing_expect('business_week', jg_admin_partner_billing_period_type('invalid'), 'Invalid profile values must fail closed to the default business week.');
admin_partner_billing_expect(false, jg_admin_partner_billing_bill_id('BAGGOS', '2026-07-01', 'business_week') === jg_admin_partner_billing_bill_id('BAGGOS', '2026-07-01', 'calendar_month'), 'PO identifiers must stay unique across billing-period types.');
admin_partner_billing_expect(['local.server', 'localhost'], jg_partner_db_host_candidates('local.server'), 'Hostinger partner DB connections should fall back to localhost.');
admin_partner_billing_expect('2026-07-30 01:52:31', jg_partner_db_legacy_datetime('2026-07-30 01:52:31', true), 'Legacy partner timestamps should remain stable during migration.');
admin_partner_billing_expect(null, jg_partner_db_legacy_datetime('', false), 'Optional empty legacy timestamps should stay null.');

$source = file_get_contents(dirname(__DIR__) . '/partner-billing-bootstrap.php');
$statusSource = file_get_contents(dirname(__DIR__) . '/api/partner-db-status/index.php');
admin_partner_billing_expect(true, str_contains($source, 'accounting_partner_bill_receipts'), 'Accounting confirmation must have an idempotency ledger.');
admin_partner_billing_expect(true, str_contains($source, 'billing_status = "dispute_accepted"'), 'Accepted disputes must mark claimed orders paid in storage.');
admin_partner_billing_expect(true, str_contains($source, 'billing_status = "bill_paid"'), 'Confirmed bills must mark included orders paid in storage.');
admin_partner_billing_expect(true, str_contains($source, 'function jg_admin_partner_billing_sync_confirmed_order_payments'), 'Confirmed bills must synchronize into the Partner Sales settlement ledger.');
admin_partner_billing_expect(true, str_contains($source, 'ON DUPLICATE KEY UPDATE') && str_contains($source, 'partner_weekly_bill'), 'Confirmed-order settlement synchronization must be idempotent.');
admin_partner_billing_expect(true, str_contains($source, "'orders_synced' => \$syncedOrders"), 'Payment confirmation should report the order-ledger synchronization result.');
admin_partner_billing_expect(true, str_contains($source, 'function jg_admin_partner_billing_dispute_history'), 'Admin billing should expose historical disputes by billing window.');
admin_partner_billing_expect(true, str_contains($source, "'messages' => \$messages") && str_contains($source, "'evidence' => \$evidenceId"), 'Dispute history must preserve the partner and finance messages plus screenshot evidence.');
admin_partner_billing_expect(true, str_contains($source, "'attachments' => \$attachmentsByBill") && str_contains($source, "'Partner payment proof'"), 'Dispute history must include bill-level partner screenshots as well as finance evidence.');
admin_partner_billing_expect(true, str_contains($statusSource, 'jg_partner_db_status_setup_token_matches') && str_contains($statusSource, 'hash_equals'), 'Deployment checks should support the existing server setup token without weakening comparison.');
admin_partner_billing_expect(true, str_contains($statusSource, 'jg_admin_partner_billing_sync') && str_contains($statusSource, 'billing_ready'), 'Deployment checks should exercise the production billing synchronization path.');
admin_partner_billing_expect(true, is_file(dirname(__DIR__) . '/data/.htaccess') && str_contains((string) file_get_contents(dirname(__DIR__) . '/data/.htaccess'), 'Require all denied'), 'Runtime partner credentials must not be web-accessible.');
admin_partner_billing_expect(true, jg_admin_partner_billing_bill_is_mutable(['status' => 'unpaid', 'has_active_payment' => 0, 'has_active_dispute' => 0]), 'An unpaid PO without an active review must be eligible for rebucketing.');
admin_partner_billing_expect(false, jg_admin_partner_billing_bill_is_mutable(['status' => 'unpaid', 'has_active_payment' => 1, 'has_active_dispute' => 0]), 'A submitted or confirmed payment must freeze its PO audit trail.');
admin_partner_billing_expect(false, jg_admin_partner_billing_bill_is_mutable(['status' => 'unpaid', 'has_active_payment' => 0, 'has_active_dispute' => 1]), 'An active dispute must freeze its PO audit trail.');

$outstanding = jg_admin_partner_billing_outstanding_totals([
    ['status' => 'unpaid', 'total_amount' => 125000],
    ['status' => 'payment_submitted', 'total_amount' => 50000],
    ['status' => 'disputed', 'total_amount' => 25000],
    ['status' => 'accruing', 'total_amount' => 40000],
    ['status' => 'paid', 'total_amount' => 90000],
    ['status' => 'unpaid', 'total_amount' => 0],
]);
admin_partner_billing_expect(['due_amount' => 200000, 'in_progress_amount' => 40000], $outstanding, 'Accounting must include every outstanding PO exactly once while excluding paid and empty obsolete POs.');
admin_partner_billing_expect(true, str_contains($source, 'i.paid_at IS NULL') && str_contains($source, 'i.status <> "removed"'), 'Rebucketing must move only unpaid, non-removed orders.');
admin_partner_billing_expect(true, strpos($source, 'jg_admin_partner_billing_recalculate($pdo, $billId);') < strpos($source, '$deleteEmpty = $pdo->prepare('), 'Old and new PO totals must recalculate before obsolete POs are deleted in the same transaction.');
admin_partner_billing_expect(true, str_contains($source, 'NOT EXISTS(SELECT 1 FROM partner_weekly_bill_payments') && str_contains($source, 'NOT EXISTS(SELECT 1 FROM partner_weekly_bill_disputes'), 'Obsolete PO deletion must preserve payment and dispute audit records.');

$resolution = jg_admin_partner_billing_price_resolution([
    'order_id' => 'PO-PRICE-1',
    'amount' => 35000,
    'units' => 3,
    'snapshot' => ['items' => [
        ['sku_code' => 'SKU-A', 'sku_label' => 'Product A', 'quantity' => 2, 'unit_revenue' => 10000],
        ['sku_code' => 'SKU-B', 'sku_label' => 'Product B', 'quantity' => 1, 'unit_revenue' => 15000],
    ]],
], ['lines' => [
    ['line_index' => 0, 'unit_price' => 12500],
    ['line_index' => 1, 'unit_price' => 9000],
]]);
admin_partner_billing_expect(34000, $resolution['amount'], 'Admin product edits must recalculate the order value by quantity.');
admin_partner_billing_expect(12500, $resolution['items'][0]['unit_revenue'], 'The edited product price must update the order snapshot.');
admin_partner_billing_expect(25000, $resolution['items'][0]['line_revenue'], 'The edited product line total must remain consistent.');

admin_partner_billing_expect(true, jg_admin_partner_billing_price_proposal_changed([
    'original_amount' => 20000,
    'proposed_amount' => 20000,
    'price_lines' => [
        ['original_unit_price' => 8000, 'proposed_unit_price' => 9000],
        ['original_unit_price' => 12000, 'proposed_unit_price' => 11000],
    ],
]), 'Product edits must remain price disputes even when their order totals offset.');
admin_partner_billing_expect(false, jg_admin_partner_billing_price_proposal_changed([
    'original_amount' => 20000,
    'proposed_amount' => 20000,
    'price_lines' => [['original_unit_price' => 20000, 'proposed_unit_price' => 20000]],
]), 'An unchanged proposal must preserve the already-paid dispute path.');
admin_partner_billing_expect(true, jg_admin_partner_billing_price_proposal_changed([
    'original_amount' => 59000,
    'proposed_amount' => 32000,
    'price_lines' => [['original_unit_price' => 32000, 'proposed_unit_price' => 32000]],
]), 'A changed bill total must remain a price proposal when its stored product snapshot already has the proposed price.');

admin_partner_billing_expect(true, str_contains($source, 'jg_admin_partner_billing_repair_misclassified_price_disputes'), 'Billing sync must repair already accepted price proposals that were mistakenly removed.');

echo "admin-partner-billing-test: ok\n";
