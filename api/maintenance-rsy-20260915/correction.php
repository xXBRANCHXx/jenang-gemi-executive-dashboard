<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/partner-billing-bootstrap.php';

const RSY_ORDER = 'PO26091560AC7D27';
const RSY_DISPLAY = 'PARTNER-PO26091560AC7D27';
const RSY_PARTNER = 'JGP-Z2FC-MG7P-3ZDL';
const RSY_ACCOUNT = 'partner-jgp-z2fc-mg7p-3zdl';
const RSY_SKU = '010155000006';
const RSY_BILL = 'PB-CW-20260914-10EDA9208578';

function rsy_check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

function rsy_rows(PDO $pdo, string $sql, array $args = []): array
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($args);
    return $stmt->fetchAll();
}

function rsy_write(PDO $pdo, string $sql, array $args, ?int $expected = null): void
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($args);
    if ($expected !== null) rsy_check($stmt->rowCount() === $expected, 'Affected row count changed; correction stopped.');
}

function rsy_journal_save(string $path, array $journal): void
{
    $temp = $path . '.tmp';
    $json = json_encode($journal, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    rsy_check(file_put_contents($temp, $json, LOCK_EX) === strlen($json), 'Unable to save correction backup.');
    chmod($temp, 0600);
    rsy_check(rename($temp, $path), 'Unable to finalize correction backup.');
}

function rsy_xid(string $branch): string
{
    return "'jg_rsy_20260915_PO26091560AC7D27','" . $branch . "'";
}

function rsy_finish_commit(array $connections, string $path, array &$journal): array
{
    $journal['state'] = 'committing';
    rsy_journal_save($path, $journal);
    foreach ($connections as $branch => $pdo) {
        if (in_array($branch, $journal['committed'] ?? [], true)) continue;
        try {
            $pdo->exec('XA COMMIT ' . rsy_xid($branch));
        } catch (PDOException $e) {
            // A response can be lost after COMMIT succeeds. Prove completion
            // before accepting XAER_NOTA; otherwise leave the journal recoverable.
            if ((int) ($e->errorInfo[1] ?? 0) !== 1397) throw $e;
            $complete = match ($branch) {
                'partner' => rsy_rows($pdo, 'SELECT id FROM partner_orders WHERE id = ?', [RSY_ORDER]) === [],
                'inventory' => count(rsy_rows($pdo, 'SELECT id FROM direct_order_inventory_restorations WHERE order_id = ? AND sku = ? AND quantity = 20', [RSY_DISPLAY, RSY_SKU])) === 1,
                'analytics' => true, // Read-only branch, no changes to commit.
                default => false,
            };
            rsy_check($complete, 'Unable to verify committed correction branch.');
        }
        $journal['committed'][] = $branch;
        rsy_journal_save($path, $journal);
    }
    $journal['state'] = 'complete';
    $journal['completed_at'] = gmdate(DATE_ATOM);
    rsy_journal_save($path, $journal);
    return ['ok' => true, 'applied' => true, 'plan' => $journal['plan'], 'completed_at' => $journal['completed_at']];
}

function rsy_correct(array $body): array
{
    rsy_check(($body['order_id'] ?? '') === RSY_ORDER, 'This correction is restricted to the second RSY order.');
    $mode = (string) ($body['mode'] ?? '');
    rsy_check(in_array($mode, ['dry_run', 'apply'], true), 'Choose dry_run or apply.');
    $directory = sys_get_temp_dir() . '/jg-rsy-order-correction-20260915-second-20';
    if (!is_dir($directory)) rsy_check(mkdir($directory, 0700, true), 'Unable to create private backup directory.');
    $lock = fopen($directory . '/correction.lock', 'c');
    rsy_check(is_resource($lock) && flock($lock, LOCK_EX | LOCK_NB), 'Correction already running.');
    $path = $directory . '/correction.json';
    $connections = ['partner' => rsy_db('partner_'), 'inventory' => rsy_db('sku_'), 'analytics' => rsy_db('')];
    $journal = is_file($path) ? json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR) : [];
    if (($journal['state'] ?? '') === 'complete') {
        return ['ok' => true, 'applied' => true, 'already_applied' => true, 'plan' => $journal['plan']];
    }
    if (in_array($journal['state'] ?? '', ['prepared', 'committing'], true)) {
        rsy_check($mode === 'apply', 'A prepared correction requires apply to finish.');
        rsy_check(hash_equals((string) $journal['plan_hash'], (string) ($body['plan_hash'] ?? '')), 'Correction plan does not match.');
        return rsy_finish_commit($connections, $path, $journal);
    }
    $states = [];
    try {
        foreach ($connections as $branch => $pdo) {
            $pdo->exec('SET SESSION innodb_lock_wait_timeout = 10');
            $pdo->exec('XA START ' . rsy_xid($branch));
            $states[$branch] = 'active';
        }
        $p = $connections['partner']; $s = $connections['inventory']; $a = $connections['analytics'];
        $snapshot = [];
        $snapshot['order'] = rsy_rows($p, 'SELECT * FROM partner_orders WHERE id = ? FOR UPDATE', [RSY_ORDER]);
        rsy_check(count($snapshot['order']) === 1, 'Original order is missing; stock has not been changed.');
        $order = $snapshot['order'][0];
        $items = json_decode((string) $order['items_json'], true, 512, JSON_THROW_ON_ERROR);
        rsy_check($order['partner_code'] === RSY_PARTNER && $order['customer_name'] === 'RSY'
            && $order['status'] === 'FULFILLED' && (int) $order['quantity'] === 20
            && $order['sku_code'] === RSY_SKU && (float) $order['revenue_total'] === 1908000.0
            && str_starts_with($order['created_at'], '2026-09-15')
            && $order['billing_paid_at'] === null && (float) $order['balance_amount'] === 0.0
            && count($items) === 1 && $items[0]['sku_code'] === RSY_SKU && (int) $items[0]['quantity'] === 20,
            'Order details changed; correction stopped.');
        $snapshot['bill'] = rsy_rows($p, 'SELECT * FROM partner_weekly_bills WHERE bill_id = ? FOR UPDATE', [RSY_BILL]);
        $snapshot['bill_items'] = rsy_rows($p, 'SELECT * FROM partner_weekly_bill_items WHERE bill_id = ? ORDER BY id FOR UPDATE', [RSY_BILL]);
        $targetItems = array_values(array_filter($snapshot['bill_items'], static fn(array $row): bool => $row['order_id'] === RSY_ORDER));
        rsy_check(count($snapshot['bill']) === 1 && count($targetItems) === 1, 'Billing link changed.');
        $billItem = $targetItems[0];
        rsy_check($billItem['status'] === 'included' && $billItem['dispute_id'] === null && $billItem['paid_at'] === null
            && (int) $billItem['units'] === 20 && (int) $billItem['amount'] === 1908000, 'Billing item changed.');
        foreach (['partner_weekly_bill_payments', 'partner_weekly_bill_disputes', 'partner_weekly_bill_files', 'partner_return_adjustments'] as $table) {
            rsy_check(rsy_rows($p, 'SELECT id FROM `' . $table . '` WHERE bill_id = ? FOR UPDATE', [RSY_BILL]) === [], 'Bill has payment, dispute, file or return dependencies.');
        }
        rsy_check(rsy_rows($p, 'SELECT id FROM partner_wallet_transactions WHERE reference_id IN (?, ?) FOR UPDATE', [RSY_ORDER, RSY_DISPLAY]) === [], 'Order has wallet transactions.');
        rsy_check(rsy_rows($a, 'SELECT id FROM partner_order_payments WHERE order_id IN (?, ?) FOR UPDATE', [RSY_ORDER, RSY_DISPLAY]) === [], 'Order has payments.');
        rsy_check(rsy_rows($a, 'SELECT id FROM accounting_transactions WHERE order_no IN (?, ?) OR invoice_no IN (?, ?) OR reference_no IN (?, ?) FOR UPDATE', [RSY_ORDER, RSY_DISPLAY, RSY_ORDER, RSY_DISPLAY, RSY_ORDER, RSY_DISPLAY]) === [], 'Order has accounting transactions.');
        rsy_check(rsy_rows($a, 'SELECT id FROM dashboard_order_mirror WHERE order_id IN (?, ?) FOR UPDATE', [RSY_ORDER, RSY_DISPLAY]) === [], 'Order has additional sales mirror entries.');
        $snapshot['labels'] = rsy_rows($p, 'SELECT * FROM partner_order_labels WHERE order_id = ? FOR UPDATE', [RSY_ORDER]);
        $key = ['partner', RSY_ACCOUNT, RSY_DISPLAY];
        $where = 'source_platform = ? AND source_account = ? AND order_id = ?';
        foreach (['store_ops_inventory_order_deductions', 'store_ops_order_fulfillment_v2', 'store_ops_order_events_v2'] as $table) {
            $snapshot[$table] = rsy_rows($s, 'SELECT * FROM `' . $table . '` WHERE ' . $where . ' FOR UPDATE', $key);
        }
        $deductions = $snapshot['store_ops_inventory_order_deductions'];
        rsy_check(count($deductions) === 1 && $deductions[0]['status'] === 'deducted', 'Stock deduction is missing or changed.');
        $lines = json_decode($deductions[0]['deductions_json'], true, 512, JSON_THROW_ON_ERROR);
        rsy_check(count($lines) === 1 && $lines[0]['stock_sku'] === RSY_SKU && $lines[0]['selling_sku'] === RSY_SKU
            && (int) $lines[0]['base_deducted_quantity'] === 20 && (int) $lines[0]['selling_quantity'] === 20
            && (float) $lines[0]['stock_ratio'] === 1.0 && (int) $lines[0]['shortage_base_quantity'] === 0,
            'Recorded stock deduction differs from the expected 20 bottles.');
        rsy_check(count($snapshot['store_ops_order_fulfillment_v2']) === 1
            && $snapshot['store_ops_order_fulfillment_v2'][0]['status'] === 'FULFILLED', 'Fulfillment state changed.');
        foreach (['direct_order_inventory_restorations', 'store_ops_returns', 'store_ops_order_stock_deductions', 'store_ops_order_events', 'store_ops_order_fulfillment'] as $table) {
            rsy_check(rsy_rows($s, 'SELECT * FROM `' . $table . '` WHERE order_id IN (?, ?) FOR UPDATE', [RSY_ORDER, RSY_DISPLAY]) === [], 'Order has other inventory or fulfillment records.');
        }
        $snapshot['sku'] = rsy_rows($s, 'SELECT * FROM sku_skus WHERE sku = ? FOR UPDATE', [RSY_SKU])[0];
        $sku = $snapshot['sku'];
        $group = rsy_rows($s, 'SELECT sku FROM sku_skus WHERE brand_id = ? AND unit_id = ? AND product_id = ? AND flavor_id = ? AND astra = ? FOR UPDATE', [$sku['brand_id'], $sku['unit_id'], $sku['product_id'], $sku['flavor_id'], $sku['astra']]);
        rsy_check(count($group) === 1 && (float) $sku['volume'] === 550.0 && (float) $sku['astra'] === 550.0, 'Inventory unit mapping changed.');
        $plan = ['order_id' => RSY_ORDER, 'partner_code' => RSY_PARTNER, 'sku' => RSY_SKU,
            'restore_quantity' => 20, 'stock_before' => (int) $sku['current_stock'], 'stock_after' => (int) $sku['current_stock'] + 20,
            'remove_revenue' => 1908000, 'remove_sales_units' => 20, 'remove_fulfilled_orders' => 1,
            'remove_events' => count($snapshot['store_ops_order_events_v2']), 'remove_labels' => count($snapshot['labels']),
            'bill_id' => RSY_BILL, 'remaining_bill_orders' => array_values(array_map(static fn(array $row): string => $row['order_id'], array_filter($snapshot['bill_items'], static fn(array $row): bool => $row['order_id'] !== RSY_ORDER)))];
        $plan['remove_empty_bill'] = count($plan['remaining_bill_orders']) === 0;
        $hash = hash('sha256', json_encode($plan, JSON_THROW_ON_ERROR));
        if ($mode === 'apply') rsy_check(hash_equals($hash, (string) ($body['plan_hash'] ?? '')), 'Plan changed; run dry_run again.');
        $journal = ['state' => 'staged', 'plan' => $plan, 'plan_hash' => $hash, 'snapshot' => $snapshot, 'committed' => [], 'started_at' => gmdate(DATE_ATOM)];
        if ($mode === 'apply') rsy_journal_save($path, $journal);
        rsy_write($p, 'DELETE FROM partner_weekly_bill_items WHERE id = ? AND order_id = ?', [$billItem['id'], RSY_ORDER], 1);
        rsy_write($p, 'DELETE FROM partner_orders WHERE id = ? AND partner_code = ?', [RSY_ORDER, RSY_PARTNER], 1);
        jg_admin_partner_billing_recalculate($p, RSY_BILL);
        rsy_write($s, 'UPDATE sku_skus SET current_stock = current_stock + 20, updated_at = UTC_TIMESTAMP() WHERE sku = ?', [RSY_SKU], 1);
        rsy_write($s, 'INSERT INTO direct_order_inventory_restorations (order_id, sku, quantity, restored_at) VALUES (?, ?, 20, UTC_TIMESTAMP())', [RSY_DISPLAY, RSY_SKU], 1);
        foreach (['store_ops_order_events_v2', 'store_ops_order_fulfillment_v2', 'store_ops_inventory_order_deductions'] as $table) {
            rsy_write($s, 'DELETE FROM `' . $table . '` WHERE ' . $where, $key, count($snapshot[$table]));
        }
        rsy_write($s, 'UPDATE sku_meta SET updated_at = UTC_TIMESTAMP() WHERE meta_key = "version"', []);
        $afterBill = rsy_rows($p, 'SELECT * FROM partner_weekly_bills WHERE bill_id = ?', [RSY_BILL])[0];
        $afterSku = rsy_rows($s, 'SELECT current_stock FROM sku_skus WHERE sku = ?', [RSY_SKU])[0];
        rsy_check((int) $afterSku['current_stock'] === $plan['stock_after'], 'Inventory verification failed.');
        rsy_check((int) $afterBill['total_amount'] === (int) $snapshot['bill'][0]['total_amount'] - 1908000, 'Billing total verification failed.');
        if ($plan['remove_empty_bill']) {
            rsy_check((int) $afterBill['total_amount'] === 0, 'Empty bill still has a balance.');
            rsy_write($p, 'DELETE FROM partner_weekly_bills WHERE bill_id = ? AND total_amount = 0', [RSY_BILL], 1);
        }
        foreach ($connections as $branch => $pdo) {
            $pdo->exec('XA END ' . rsy_xid($branch)); $states[$branch] = 'ended';
            $pdo->exec('XA PREPARE ' . rsy_xid($branch)); $states[$branch] = 'prepared';
        }
        if ($mode === 'dry_run') {
            foreach ($connections as $branch => $pdo) { $pdo->exec('XA ROLLBACK ' . rsy_xid($branch)); $states[$branch] = 'rolled_back'; }
            return ['ok' => true, 'applied' => false, 'rollback_verified' => true, 'plan' => $plan, 'plan_hash' => $hash, 'bill_total_after' => (int) $afterBill['total_amount']];
        }
        $journal['state'] = 'prepared';
        rsy_journal_save($path, $journal);
        return rsy_finish_commit($connections, $path, $journal);
    } catch (Throwable $e) {
        if (!in_array($journal['state'] ?? '', ['prepared', 'committing', 'complete'], true)) {
            foreach ($states as $branch => $state) {
                if ($state === 'rolled_back') continue;
                try {
                    if ($state === 'active') $connections[$branch]->exec('XA END ' . rsy_xid($branch));
                    $connections[$branch]->exec('XA ROLLBACK ' . rsy_xid($branch));
                } catch (Throwable $cleanup) { error_log('RSY rollback failed: ' . $branch . ': ' . $cleanup->getMessage()); }
            }
        }
        throw $e;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
