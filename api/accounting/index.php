<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require_once dirname(__DIR__, 2) . '/accounting-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function jg_accounting_endpoint_payload(array $data, string $month = ''): array
{
    return [
        'ok' => true,
        'data' => $data,
        'meta' => [
            'generated_at' => gmdate(DATE_ATOM),
            'month' => $month !== '' ? $month : jg_accounting_month($_GET['month'] ?? null),
        ],
    ];
}

function jg_accounting_export_csv(PDO $pdo): void
{
    $month = jg_accounting_month($_GET['month'] ?? null);
    $rows = jg_accounting_transactions($pdo, [
        ...$_GET,
        '_export' => '1',
        'month' => $month,
        'include_voided' => $_GET['include_voided'] ?? '0',
        'limit' => '5000',
    ]);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="accounting-' . $month . '.csv"');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    $out = fopen('php://output', 'w');
    if ($out === false) {
        exit;
    }
    fputcsv($out, [
        'Date',
        'Type',
        'Direction',
        'Status',
        'Account',
        'To Account',
        'Vendor/Payee',
        'Category',
        'Brand',
        'Channel',
        'Amount',
        'Receipt',
        'Related Bill',
        'Reference',
        'Notes',
    ]);
    foreach ($rows as $row) {
        fputcsv($out, [
            $row['transaction_date'] ?? '',
            $row['type'] ?? '',
            $row['direction'] ?? '',
            $row['status'] ?? '',
            $row['account_name'] ?? '',
            $row['to_account_name'] ?? '',
            $row['counterparty_name'] ?? '',
            $row['category_name'] ?? '',
            $row['brand'] ?? '',
            $row['channel'] ?? '',
            $row['amount'] ?? 0,
            $row['receipt_status'] ?? '',
            $row['bill_no'] ?? '',
            $row['reference_no'] ?? '',
            $row['notes'] ?? '',
        ]);
    }
    fclose($out);
    exit;
}

function jg_accounting_export_cash_records_csv(PDO $pdo): void
{
    $month = jg_accounting_month($_GET['month'] ?? null);
    $records = jg_accounting_automatic_cash_records($pdo, [
        ...$_GET,
        'month' => $month,
    ]);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="accounting-cash-records-' . $month . '.csv"');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    $out = fopen('php://output', 'w');
    if ($out === false) {
        exit;
    }
    fputcsv($out, [
        'Date',
        'Month',
        'Source Type',
        'Source Key',
        'Source Table',
        'Source ID',
        'Platform',
        'Account Key',
        'Order ID',
        'Counterparty',
        'Source Cash Amount',
        'Manual Offset Amount',
        'Usable Cash Amount',
        'Currency',
        'Record Status',
        'Cash Basis',
        'Notes',
    ]);
    foreach ($records as $record) {
        fputcsv($out, [
            $record['record_date'] ?? '',
            $record['business_month'] ?? '',
            $record['source_type'] ?? '',
            $record['source_key'] ?? '',
            $record['source_table'] ?? '',
            $record['source_id'] ?? '',
            $record['platform'] ?? '',
            $record['account_key'] ?? '',
            $record['order_id'] ?? '',
            $record['counterparty'] ?? '',
            $record['gross_amount'] ?? 0,
            $record['manual_offset_amount'] ?? 0,
            $record['usable_cash_amount'] ?? 0,
            $record['currency'] ?? 'IDR',
            $record['record_status'] ?? '',
            $record['cash_basis'] ?? '',
            $record['notes'] ?? '',
        ]);
    }
    fclose($out);
    exit;
}

try {
    $pdo = analyticsDb();
    jg_accounting_ensure_schema($pdo);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $body = $method === 'GET' ? [] : jg_accounting_body();
    $action = strtolower(jg_accounting_text($body['action'] ?? $_GET['action'] ?? 'summary', 80));
    $month = jg_accounting_month($body['month'] ?? $_GET['month'] ?? null);

    if ($method === 'GET') {
        if ($action === 'summary') {
            jg_accounting_json(jg_accounting_endpoint_payload(jg_accounting_summary($pdo, $month), $month));
        }
        if ($action === 'pnl_summary') {
            $year = max(2025, (int) ($_GET['year'] ?? substr($month, 0, 4)));
            jg_accounting_json(jg_accounting_endpoint_payload(jg_accounting_pnl_summary($pdo, $year), $month));
        }
        if ($action === 'transactions') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'transactions' => jg_accounting_transactions($pdo, $_GET),
            ], $month));
        }
        if ($action === 'transaction') {
            $rows = jg_accounting_transactions($pdo, [...$_GET, 'include_voided' => true]);
            jg_accounting_json(jg_accounting_endpoint_payload(['transaction' => $rows[0] ?? null], $month));
        }
        if ($action === 'bills') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'bills' => jg_accounting_bills($pdo, $_GET),
            ], $month));
        }
        if ($action === 'bill') {
            $rows = jg_accounting_bills($pdo, $_GET);
            jg_accounting_json(jg_accounting_endpoint_payload(['bill' => $rows[0] ?? null], $month));
        }
        if ($action === 'accounts') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'accounts' => jg_accounting_accounts($pdo),
            ], $month));
        }
        if ($action === 'categories') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'categories' => jg_accounting_categories($pdo),
            ], $month));
        }
        if ($action === 'counterparties') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'counterparties' => jg_accounting_counterparties($pdo, (string) ($_GET['q'] ?? $_GET['search'] ?? '')),
            ], $month));
        }
        if ($action === 'review_queue') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'review_queue' => jg_accounting_review_queue($pdo),
            ], $month));
        }
        if ($action === 'cash_records') {
            $cashFilters = [
                ...$_GET,
                'month' => $month,
            ];
            jg_accounting_json(jg_accounting_endpoint_payload([
                'cash_records' => jg_accounting_automatic_cash_records($pdo, $cashFilters),
                'cash_context' => jg_accounting_automatic_usable_cash_context($pdo, $cashFilters),
            ], $month));
        }
        if ($action === 'export_csv') {
            jg_accounting_export_csv($pdo);
        }
        if ($action === 'export_cash_records_csv') {
            jg_accounting_export_cash_records_csv($pdo);
        }
        jg_accounting_error('Unknown Accounting action.', 404);
    }

    if ($method !== 'POST') {
        jg_accounting_error('Method not allowed.', 405);
    }

    $result = match ($action) {
        'create_transaction' => jg_accounting_create_transaction($pdo, $body),
        'create_bill' => jg_accounting_create_bill($pdo, $body),
        'mark_bill_paid' => jg_accounting_mark_bill_paid($pdo, $body),
        'update_transaction' => jg_accounting_update_transaction($pdo, $body),
        'update_bill' => jg_accounting_update_bill($pdo, $body),
        'void_transaction' => jg_accounting_void_transaction($pdo, $body),
        'void_bill' => jg_accounting_void_bill($pdo, $body),
        'create_counterparty' => (function () use ($pdo, $body): array {
            $name = trim((string) ($body['name'] ?? $body['counterparty_name'] ?? ''));
            if ($name === '') {
                jg_accounting_error('Counterparty name is required.', 422, 'name');
            }
            return [
                'id' => jg_accounting_get_counterparty($pdo, null, $name, (string) ($body['type'] ?? 'other')),
            ];
        })(),
        'create_category' => jg_accounting_create_category($pdo, $body),
        'mark_review_resolved' => jg_accounting_mark_review_resolved($pdo, $body),
        default => null,
    };

    if ($result === null) {
        jg_accounting_error('Unknown Accounting action.', 404);
    }

    jg_accounting_json(jg_accounting_endpoint_payload(['result' => $result], $month), 201);
} catch (Throwable $error) {
    jg_accounting_json([
        'ok' => false,
        'error' => 'Unable to load Accounting data.',
        'errors' => [[
            'message' => 'Unable to load Accounting data.',
        ]],
    ], 500);
}
