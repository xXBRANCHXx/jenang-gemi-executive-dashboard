<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require_once dirname(__DIR__, 2) . '/accounting-bootstrap.php';
require_once dirname(__DIR__, 2) . '/accounting-export.php';

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

function jg_accounting_require_removal_intent(array $body, string $kind): array
{
    $kind = $kind === 'bill' ? 'bill' : 'transaction';
    $idField = $kind . '_id';
    $id = (int) ($body[$idField] ?? $body['id'] ?? 0);
    if ($id < 1) {
        jg_accounting_error(ucfirst($kind) . ' is required.', 422, $idField);
    }
    $adminKey = trim((string) ($body['admin_key'] ?? ''));
    if ($adminKey === '' || !jg_admin_code_matches($adminKey)) {
        jg_accounting_error('The admin login key is incorrect.', 403, 'admin_key');
    }
    $expected = 'REMOVE ' . strtoupper($kind) . ' ' . $id;
    $confirmation = trim(preg_replace('/\s+/', ' ', (string) ($body['confirmation'] ?? '')) ?? '');
    if (!hash_equals($expected, $confirmation)) {
        jg_accounting_error('Type “' . $expected . '” exactly to confirm removal.', 422, 'confirmation');
    }
    $reason = jg_accounting_long_text($body['removal_reason'] ?? $body['void_reason'] ?? '', 1000);
    if (mb_strlen($reason) < 10) {
        jg_accounting_error('Explain why this should be removed in at least 10 characters.', 422, 'removal_reason');
    }
    return [$idField => $id, 'void_reason' => 'Admin removal: ' . $reason];
}

/** @return array{receipt_id:int,transaction_id:int} */
function jg_accounting_require_receipt_admin_key(array $body): array
{
    $receiptId = (int) ($body['receipt_id'] ?? $body['id'] ?? 0);
    $transactionId = (int) ($body['transaction_id'] ?? 0);
    if ($receiptId < 1 && $transactionId < 1) {
        jg_accounting_error('Receipt is required.', 422, 'receipt_id');
    }
    $adminKey = trim((string) ($body['admin_key'] ?? ''));
    if ($adminKey === '' || !jg_admin_code_matches($adminKey)) {
        jg_accounting_error('The admin login key is incorrect.', 403, 'admin_key');
    }
    return ['receipt_id' => $receiptId, 'transaction_id' => $transactionId];
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
    $multipart = $method === 'POST'
        && str_contains(strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')), 'multipart/form-data');
    $body = $method === 'GET' ? [] : ($multipart ? $_POST : jg_accounting_body());
    $action = strtolower(jg_accounting_text($body['action'] ?? $_GET['action'] ?? 'summary', 80));
    $month = jg_accounting_month($body['month'] ?? $_GET['month'] ?? null);

    if ($method === 'GET') {
        if ($action === 'receipt') {
            $receiptId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            if ($receiptId === false || $receiptId < 1) {
                throw new InvalidArgumentException('Receipt not found.');
            }
            jg_accounting_stream_receipt($pdo, $receiptId);
        }
        if ($action === 'summary') {
            jg_accounting_json(jg_accounting_endpoint_payload(jg_accounting_summary($pdo, $month), $month));
        }
        if ($action === 'pnl_summary') {
            $year = max(2025, (int) ($_GET['year'] ?? substr($month, 0, 4)));
            jg_accounting_json(jg_accounting_endpoint_payload(jg_accounting_pnl_summary($pdo, $year), $month));
        }
        if ($action === 'pnl_category_settings') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'category_settings' => jg_accounting_pnl_category_settings($pdo),
                'pnl_buckets' => jg_accounting_pnl_buckets(),
            ], $month));
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
        if ($action === 'partner_bills') {
            jg_accounting_json(jg_accounting_endpoint_payload(jg_admin_partner_billing_breakdown(), $month));
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
                'categories' => jg_accounting_categories($pdo, true),
            ], $month));
        }
        if ($action === 'category_guidance') {
            $categoryId = filter_var($_GET['category_id'] ?? $_GET['id'] ?? null, FILTER_VALIDATE_INT);
            $guidance = $categoryId === false ? null : jg_accounting_category_guidance($pdo, (int) $categoryId);
            if ($guidance === null) jg_accounting_error('Category was not found.', 404, 'category_id');
            jg_accounting_json(jg_accounting_endpoint_payload($guidance, $month));
        }
        if ($action === 'ui_preferences') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'preferences' => jg_accounting_ui_preferences($pdo),
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
        if ($action === 'cash_history') {
            jg_accounting_json(jg_accounting_endpoint_payload(jg_accounting_cash_history($pdo), $month));
        }
        if ($action === 'activity_ledger') {
            jg_accounting_json(jg_accounting_endpoint_payload([
                'ledger' => jg_accounting_activity_ledger($pdo, $_GET),
            ], $month));
        }
        if ($action === 'export_csv') {
            jg_accounting_export_csv($pdo);
        }
        if ($action === 'export_cash_records_csv') {
            jg_accounting_export_cash_records_csv($pdo);
        }
        if ($action === 'export_pembukuan') {
            jg_pembukuan_export_response($pdo, (string) ($_GET['format'] ?? 'xlsx'), $_GET);
        }
        jg_accounting_error('Unknown Accounting action.', 404);
    }

    if ($method !== 'POST') {
        jg_accounting_error('Method not allowed.', 405);
    }

    $receiptFileInput = $multipart
        ? ($_FILES['receipt_files'] ?? $_FILES['receipt_file'] ?? null)
        : null;
    $receiptUploads = [];
    if (is_array($receiptFileInput)) {
        foreach (jg_accounting_normalize_receipt_uploads($receiptFileInput) as $receiptFile) {
            $receiptUploads[] = jg_accounting_validate_receipt_upload($receiptFile);
        }
    }

    if (in_array($action, ['delete_receipt', 'replace_receipt'], true)) {
        $receiptTarget = jg_accounting_require_receipt_admin_key($body);
        $receiptId = (int) $receiptTarget['receipt_id'];
        if ($action === 'delete_receipt' && $receiptUploads !== []) {
            throw new InvalidArgumentException('Deleting a receipt does not accept a new file.');
        }
        if ($action === 'replace_receipt' && count($receiptUploads) !== 1) {
            throw new InvalidArgumentException('Choose exactly one replacement receipt.');
        }
        $pdo->beginTransaction();
        try {
            $result = $receiptId > 0
                ? jg_accounting_delete_receipt($pdo, $receiptId, true)
                : jg_accounting_clear_transaction_receipt($pdo, (int) $receiptTarget['transaction_id'], true);
            if ($action === 'replace_receipt') {
                $transactionId = (int) ($result['transaction_id'] ?? 0);
                $receipts = jg_accounting_store_receipts($pdo, 'transaction', $transactionId, $receiptUploads);
                $result['receipts'] = $receipts;
                $result['receipt'] = $receipts[array_key_last($receipts)];
                jg_accounting_insert_audit($pdo, 'transaction', $transactionId, 'replace_receipt', ['receipt_id' => $receiptId], $result['receipt']);
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    } elseif ($receiptUploads !== [] && !in_array($action, ['create_transaction', 'update_transaction', 'mark_bill_paid'], true)) {
        throw new InvalidArgumentException('Receipt uploads are supported for payment transactions.');
    } elseif (in_array($action, ['create_transaction', 'update_transaction'], true) && $receiptUploads !== []) {
        $body['receipt_status'] = 'attached';
        $body['receipt_url'] = 'pending-secure-upload';
        $pdo->beginTransaction();
        try {
            $result = $action === 'create_transaction'
                ? jg_accounting_create_transaction($pdo, $body)
                : jg_accounting_update_transaction($pdo, $body);
            $transactionId = $action === 'create_transaction'
                ? (int) ($result['id'] ?? 0)
                : (int) ($result['transaction_id'] ?? 0);
            $result['receipts'] = jg_accounting_store_receipts($pdo, 'transaction', $transactionId, $receiptUploads);
            $result['receipt'] = $result['receipts'][array_key_last($result['receipts'])];
            jg_accounting_insert_audit($pdo, 'transaction', $transactionId, 'attach_receipts', null, $result['receipts']);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
    } elseif ($action === 'mark_bill_paid' && $receiptUploads !== []) {
        $body['receipt_status'] = 'attached';
        $body['receipt_url'] = 'pending-secure-upload';
        $result = jg_accounting_mark_bill_paid($pdo, $body);
        $transactionId = (int) ($result['transaction_id'] ?? 0);
        $pdo->beginTransaction();
        try {
            $result['receipts'] = jg_accounting_store_receipts($pdo, 'transaction', $transactionId, $receiptUploads);
            $result['receipt'] = $result['receipts'][array_key_last($result['receipts'])];
            jg_accounting_insert_audit($pdo, 'transaction', $transactionId, 'attach_receipts', null, $result['receipts']);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    } else {
        if ($action === 'update_transaction') {
            // Stored receipt URLs can only be changed through the admin-key-protected receipt actions.
            unset($body['receipt_url']);
        }
        $result = match ($action) {
            'create_transaction' => jg_accounting_create_transaction($pdo, $body),
            'create_bill' => jg_accounting_create_bill($pdo, $body),
            'mark_bill_paid' => jg_accounting_mark_bill_paid($pdo, $body),
            'update_transaction' => jg_accounting_update_transaction($pdo, $body),
            'update_bill' => jg_accounting_update_bill($pdo, $body),
            'void_transaction', 'remove_transaction' => (function () use ($pdo, $body): array {
                $result = jg_accounting_void_transaction($pdo, [...$body, ...jg_accounting_require_removal_intent($body, 'transaction')]);
                return [...$result, 'removed' => true];
            })(),
            'void_bill', 'remove_bill' => (function () use ($pdo, $body): array {
                $result = jg_accounting_void_bill($pdo, [...$body, ...jg_accounting_require_removal_intent($body, 'bill')]);
                return [...$result, 'removed' => true];
            })(),
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
            'save_category' => jg_accounting_save_category($pdo, $body),
            'save_category_guidance' => jg_accounting_save_category_guidance($pdo, $body),
            'save_pnl_category_settings' => jg_accounting_save_pnl_category_settings($pdo, $body),
            'save_category_with_guidance' => (function () use ($pdo, $body): array {
                $pdo->beginTransaction();
                try {
                    $categoryResult = jg_accounting_save_category($pdo, $body);
                    $guidanceResult = jg_accounting_save_category_guidance($pdo, [
                        ...$body,
                        'category_id' => (int) ($categoryResult['category_id'] ?? 0),
                    ]);
                    $savedCategory = jg_accounting_category_by_id($pdo, (int) ($categoryResult['category_id'] ?? 0));
                    $pdo->commit();
                    return [
                        ...$categoryResult,
                        'category' => $savedCategory,
                        'guidance' => $guidanceResult['guidance'] ?? null,
                    ];
                } catch (Throwable $error) {
                    if ($pdo->inTransaction()) $pdo->rollBack();
                    throw $error;
                }
            })(),
            'move_category' => jg_accounting_move_category($pdo, $body),
            'save_account' => jg_accounting_save_account($pdo, $body),
            'save_ui_preferences' => jg_accounting_save_ui_preferences($pdo, $body),
            'mark_review_resolved' => jg_accounting_mark_review_resolved($pdo, $body),
            'reconcile_cash' => jg_accounting_create_cash_reconciliation($pdo, $body),
            default => null,
        };
    }

    if ($result === null) {
        jg_accounting_error('Unknown Accounting action.', 404);
    }

    jg_accounting_json(jg_accounting_endpoint_payload(['result' => $result], $month), 201);
} catch (JgPembukuanValidationException $error) {
    jg_accounting_json([
        'ok' => false,
        'error' => $error->getMessage(),
        'errors' => $error->details,
    ], 422);
} catch (InvalidArgumentException $error) {
    jg_accounting_json([
        'ok' => false,
        'error' => $error->getMessage(),
        'errors' => [['message' => $error->getMessage()]],
    ], 422);
} catch (Throwable $error) {
    jg_accounting_json([
        'ok' => false,
        'error' => 'Unable to load Accounting data.',
        'errors' => [[
            'message' => 'Unable to load Accounting data.',
        ]],
    ], 500);
}
