<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$api = file_get_contents($root . '/api/accounting/index.php');
$backend = file_get_contents($root . '/accounting-bootstrap.php');
$html = file_get_contents($root . '/profit-loss/index.php');
$script = file_get_contents($root . '/profit-loss/accounting.js');

function removal_guard_expect(bool $condition, string $message): void
{
    if ($condition) return;
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

removal_guard_expect(is_string($api) && str_contains($api, 'jg_accounting_require_removal_intent'), 'Accounting removal must use one server-side intent guard.');
removal_guard_expect(str_contains($api, 'jg_admin_code_matches($adminKey)'), 'Removal must verify the current admin login key on the server.');
removal_guard_expect(str_contains($api, "'REMOVE ' . strtoupper(\$kind) . ' ' . \$id"), 'Removal must require an exact record-specific phrase.');
removal_guard_expect(str_contains($api, 'mb_strlen($reason) < 10'), 'Removal must reject missing or meaningless reasons.');
removal_guard_expect(str_contains($api, "'void_transaction', 'remove_transaction'") && str_contains($api, "'void_bill', 'remove_bill'"), 'Legacy void endpoints must receive the same protected guard.');
removal_guard_expect(is_string($backend) && str_contains($backend, "? 'remove' : 'void'"), 'Admin removals must be distinguished from ordinary voids in the audit trail.');
removal_guard_expect(str_contains($backend, '$where[] = \'b.status <> "void"\';'), 'Removed bills must disappear from normal bill history and the Activity ledger.');
removal_guard_expect(str_contains($backend, 'reverse_payment') && str_contains($backend, 'SELECT * FROM accounting_bill_payments WHERE transaction_id'), 'Removing a bill payment must restore every allocated bill balance.');
removal_guard_expect(is_string($html) && str_contains($html, 'data-accounting-removal-form') && str_contains($html, 'Admin login key'), 'The UI must provide a guided protected-removal dialog.');
removal_guard_expect(str_contains($html, 'data-accounting-removal-phrase') && str_contains($html, 'Are you sure?'), 'The dialog must ask for explicit typed confirmation.');
removal_guard_expect(is_string($script) && str_contains($script, 'action: `remove_${kind}`'), 'The UI must call only the protected removal action.');
removal_guard_expect(str_contains($script, 'data-accounting-remove-kind') && str_contains($script, 'admin-accounting-ledger-remove'), 'Transaction history and Activity ledger must both expose protected removal.');
removal_guard_expect(!str_contains($script, "window.prompt('Void reason')"), 'The old one-prompt void path must not remain available.');

echo "accounting-removal-guard-test: ok\n";
