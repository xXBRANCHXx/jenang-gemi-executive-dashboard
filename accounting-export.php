<?php
declare(strict_types=1);

/**
 * Formal Indonesian accounting export for the Accounting workspace.
 *
 * This module intentionally does not alter the labels or behavior used by the
 * day-to-day admin interface. It translates existing records only while an
 * authenticated export request is being built.
 */

final class JgPembukuanValidationException extends RuntimeException
{
    /** @param array<int,array<string,mixed>> $details */
    public function __construct(string $message, public readonly array $details = [])
    {
        parent::__construct($message);
    }
}

const JG_PEMBUKUAN_EXPORT_VERSION = '1.0.0';

/** @return array<string,array<string,string>> */
function jg_pembukuan_account_catalog(): array
{
    return [
        '1100' => ['name' => 'Kas', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1110' => ['name' => 'Bank', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1115' => ['name' => 'Dompet Elektronik', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1120' => ['name' => 'Saldo Marketplace', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1140' => ['name' => 'Piutang Usaha', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1200' => ['name' => 'Persediaan Bahan Baku', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1210' => ['name' => 'Persediaan Bahan Kemasan', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1230' => ['name' => 'Persediaan Barang Jadi', 'group' => 'Aset', 'type' => 'Aset Lancar', 'normal' => 'Debit'],
        '1300' => ['name' => 'Aset Tetap', 'group' => 'Aset', 'type' => 'Aset Tidak Lancar', 'normal' => 'Debit'],
        '2100' => ['name' => 'Utang Usaha', 'group' => 'Liabilitas', 'type' => 'Liabilitas Jangka Pendek', 'normal' => 'Kredit'],
        '2400' => ['name' => 'Utang Pinjaman', 'group' => 'Liabilitas', 'type' => 'Liabilitas Jangka Panjang', 'normal' => 'Kredit'],
        '3100' => ['name' => 'Modal Disetor', 'group' => 'Ekuitas', 'type' => 'Ekuitas', 'normal' => 'Kredit'],
        '3200' => ['name' => 'Laba Ditahan', 'group' => 'Ekuitas', 'type' => 'Ekuitas', 'normal' => 'Kredit'],
        '3300' => ['name' => 'Laba Tahun Berjalan', 'group' => 'Ekuitas', 'type' => 'Ekuitas', 'normal' => 'Kredit'],
        '3400' => ['name' => 'Penarikan Pemilik', 'group' => 'Ekuitas', 'type' => 'Kontra Ekuitas', 'normal' => 'Debit'],
        '4100' => ['name' => 'Pendapatan Penjualan', 'group' => 'Pendapatan', 'type' => 'Pendapatan Usaha', 'normal' => 'Kredit'],
        '4200' => ['name' => 'Pendapatan Jasa', 'group' => 'Pendapatan', 'type' => 'Pendapatan Usaha', 'normal' => 'Kredit'],
        '4300' => ['name' => 'Retur dan Potongan Penjualan', 'group' => 'Pendapatan', 'type' => 'Kontra Pendapatan', 'normal' => 'Debit'],
        '4900' => ['name' => 'Pendapatan Lain-lain', 'group' => 'Pendapatan Lain-lain', 'type' => 'Pendapatan Lain-lain', 'normal' => 'Kredit'],
        '5100' => ['name' => 'Harga Pokok Penjualan', 'group' => 'Harga Pokok Penjualan', 'type' => 'Harga Pokok Penjualan', 'normal' => 'Debit'],
        '6100' => ['name' => 'Beban Iklan', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6110' => ['name' => 'Beban Marketplace', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6120' => ['name' => 'Beban Promosi', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6130' => ['name' => 'Beban Pegawai', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6140' => ['name' => 'Beban Sewa', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6150' => ['name' => 'Beban Utilitas', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6160' => ['name' => 'Beban Internet', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6170' => ['name' => 'Beban Perlengkapan', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6180' => ['name' => 'Beban Pengiriman dan Fulfillment', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6190' => ['name' => 'Beban Pemrosesan Pembayaran', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6200' => ['name' => 'Beban Jasa Profesional', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6210' => ['name' => 'Beban Perbaikan dan Transportasi', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
        '6290' => ['name' => 'Beban Operasional Lainnya', 'group' => 'Beban', 'type' => 'Beban Operasional', 'normal' => 'Debit'],
    ];
}

/** @return array<string,string> */
function jg_pembukuan_category_mappings(): array
{
    return [
        'meta-ads' => '6100', 'google-ads' => '6100', 'shopee-ads' => '6100', 'tiktok-ads' => '6100',
        'affiliate-influencer' => '6120', 'giveaway-samples' => '6120', 'content-production' => '6120',
        'raw-materials' => '1200', 'packaging' => '1210', 'labels-stickers' => '1210',
        'finished-goods-purchase' => '1230', 'production-labor' => '5100', 'product-testing' => '5100',
        'rent' => '6140', 'utilities' => '6150', 'internet' => '6160', 'office-supplies' => '6170',
        'equipment' => '1300', 'repairs' => '6210', 'fuel-transport' => '6210',
        'shipping-supplies' => '6180', 'courier-adjustment' => '6180', 'packing-labor' => '6130',
        'return-handling' => '6180', 'hosting' => '6160', 'domain' => '6160',
        'software-subscription' => '6290', 'bank-fees' => '6190', 'marketplace-admin-fees' => '6110',
        'legal-permit-tax-admin' => '6200', 'salary' => '6130', 'bonus' => '6130',
        'contractor' => '6130', 'commission' => '6130', 'refund-paid' => '4300',
        'reimbursement' => '4900', 'miscellaneous' => '6290',
    ];
}

/** @return array{code:string,name:string,group:string,type:string,normal:string} */
function jg_pembukuan_account(string $code): array
{
    $catalog = jg_pembukuan_account_catalog();
    if (!isset($catalog[$code])) {
        throw new InvalidArgumentException('Unknown formal account code ' . $code . '.');
    }
    return ['code' => $code, ...$catalog[$code]];
}

/** @param array<string,mixed> $account */
function jg_pembukuan_source_account(array $account): ?array
{
    $code = match ((string) ($account['type'] ?? '')) {
        'cash' => '1100', 'bank' => '1110', 'ewallet' => '1115',
        'marketplace_wallet' => '1120', 'receivable' => '1140',
        'payable' => '2100', 'owner_equity' => '3100',
        default => null,
    };
    return $code === null ? null : jg_pembukuan_account($code);
}

/** @param array<string,mixed> $category */
function jg_pembukuan_category_account(array $category): ?array
{
    $key = strtolower(trim((string) ($category['category_key'] ?? '')));
    $explicit = jg_pembukuan_category_mappings();
    if (isset($explicit[$key])) {
        return jg_pembukuan_account($explicit[$key]);
    }
    $code = match ((string) ($category['type'] ?? '')) {
        'marketing' => '6120', 'operations' => '6290', 'payroll' => '6130',
        'expense' => '6290', 'tax' => '6200', 'income' => '4900',
        default => null,
    };
    return $code === null ? null : jg_pembukuan_account($code);
}

function jg_pembukuan_sanitize_slug(string $value, string $fallback = 'entitas'): string
{
    $value = trim($value);
    if (function_exists('transliterator_transliterate')) {
        $value = (string) transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $value);
    } else {
        $value = strtolower($value);
    }
    $value = trim((string) preg_replace('/[^a-z0-9]+/', '-', $value), '-');
    return substr($value !== '' ? $value : $fallback, 0, 80);
}

function jg_pembukuan_filename(string $kind, string $entitySlug, string $start, string $end, string $extension): string
{
    $prefix = match ($kind) {
        'financial' => 'laporan-keuangan',
        'package' => 'paket-pembukuan',
        default => 'pembukuan',
    };
    $parts = [$prefix, jg_pembukuan_sanitize_slug($entitySlug), $kind === 'financial' ? $end : $start];
    if ($kind !== 'financial') {
        $parts[] = $end;
    }
    return implode('-', array_map(static fn (string $part): string => jg_pembukuan_sanitize_slug($part, 'periode'), $parts))
        . '.' . preg_replace('/[^a-z0-9]/', '', strtolower($extension));
}

/** @return array{start:string,end:string,month:string,label:string} */
function jg_pembukuan_period(array $input): array
{
    $month = trim((string) ($input['month'] ?? ''));
    $start = trim((string) ($input['date_from'] ?? ''));
    $end = trim((string) ($input['date_to'] ?? ''));
    if ($start === '' && $end === '' && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
        $start = $month . '-01';
        $end = (new DateTimeImmutable($start))->modify('last day of this month')->format('Y-m-d');
    }
    $valid = static fn (string $date): bool => preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1
        && DateTimeImmutable::createFromFormat('!Y-m-d', $date)?->format('Y-m-d') === $date;
    if (!$valid($start) || !$valid($end) || $start > $end) {
        throw new JgPembukuanValidationException('Periode Pembukuan tidak valid.', [[
            'record' => 'reporting_period',
            'mapping' => 'Tanggal Awal dan Tanggal Akhir',
            'expected_correction' => 'Pilih rentang tanggal yang valid dan pastikan tanggal awal tidak melebihi tanggal akhir.',
            'draft_available' => false,
        ]]);
    }
    return [
        'start' => $start,
        'end' => $end,
        'month' => substr($start, 0, 7),
        'label' => $start . ' s.d. ' . $end,
    ];
}

/** @return array<string,string> */
function jg_pembukuan_entity_profile(array $overrides = []): array
{
    $config = function_exists('jg_dashboard_load_local_config') ? jg_dashboard_load_local_config() : [];
    $read = static function (string $env, string $configKey, string $default = '') use ($config, $overrides): string {
        if (array_key_exists($configKey, $overrides)) {
            return trim((string) $overrides[$configKey]);
        }
        $envValue = function_exists('jg_dashboard_env_value') ? jg_dashboard_env_value($env) : trim((string) getenv($env));
        return $envValue !== '' ? $envValue : (trim((string) ($config[$configKey] ?? '')) ?: $default);
    };
    return [
        'entity_id' => $read('JG_ACCOUNTING_ENTITY_ID', 'accounting_entity_id', 'jenang-gemi'),
        'entity_name' => $read('JG_ACCOUNTING_ENTITY_NAME', 'accounting_entity_name'),
        'trade_name' => $read('JG_ACCOUNTING_TRADE_NAME', 'accounting_trade_name', 'Jenang Gemi'),
        'npwp' => $read('JG_ACCOUNTING_NPWP', 'accounting_npwp'),
        'nitku' => $read('JG_ACCOUNTING_NITKU', 'accounting_nitku'),
        'address' => $read('JG_ACCOUNTING_ADDRESS', 'accounting_address'),
        'currency' => $read('JG_ACCOUNTING_CURRENCY', 'accounting_currency', 'IDR'),
        'application_version' => $read('JG_APP_VERSION', 'application_version', 'unknown'),
    ];
}

/** @return array<string,mixed> */
function jg_pembukuan_source_data(PDO $pdo, array $period, array $profile): array
{
    $transactions = [];
    for ($page = 1; $page <= 200; $page++) {
        $batch = jg_accounting_transactions($pdo, [
            '_export' => '1', 'date_from' => $period['start'], 'date_to' => $period['end'],
            'include_voided' => '0', 'limit' => '5000', 'page' => (string) $page,
        ]);
        $transactions = array_merge($transactions, $batch);
        if (count($batch) < 5000) break;
    }

    $accounts = [];
    foreach ($pdo->query('SELECT * FROM accounting_accounts WHERE is_active = 1')->fetchAll() as $row) {
        $accounts[(int) $row['id']] = $row;
    }
    $categories = [];
    foreach ($pdo->query('SELECT * FROM accounting_categories WHERE is_active = 1')->fetchAll() as $row) {
        $categories[(int) $row['id']] = $row;
    }
    $billStmt = $pdo->prepare(
        'SELECT b.*, cp.name AS vendor_name, c.name AS category_name
         FROM accounting_bills b
         LEFT JOIN accounting_counterparties cp ON cp.id = b.vendor_id
         LEFT JOIN accounting_categories c ON c.id = b.category_id
         WHERE b.issue_date BETWEEN :start_date AND :end_date AND b.status <> "void"
         ORDER BY b.issue_date ASC, b.id ASC'
    );
    $billStmt->execute([':start_date' => $period['start'], ':end_date' => $period['end']]);
    $bills = $billStmt->fetchAll();
    $automatic = jg_accounting_automatic_cash_records($pdo, [
        'date_from' => $period['start'], 'date_to' => $period['end'], 'month' => $period['month'],
    ]);
    $routes = jg_accounting_automatic_deposit_routes($pdo);
    foreach ($automatic as &$record) {
        $record['destination_account_id'] = jg_accounting_automatic_account_at($pdo, (string) ($record['occurred_at'] ?? ''), $routes);
    }
    unset($record);

    $audit = [];
    try {
        $stmt = $pdo->prepare(
            'SELECT l.id, l.entity_type, l.entity_id, l.action, l.created_at
             FROM accounting_audit_log l
             LEFT JOIN accounting_transactions t ON l.entity_type = "transaction" AND t.id = l.entity_id
             LEFT JOIN accounting_bills b ON l.entity_type = "bill" AND b.id = l.entity_id
             WHERE (t.transaction_date BETWEEN :start_tx AND :end_tx)
                OR (b.issue_date BETWEEN :start_bill AND :end_bill)
             ORDER BY l.created_at ASC, l.id ASC'
        );
        $stmt->execute([
            ':start_tx' => $period['start'], ':end_tx' => $period['end'],
            ':start_bill' => $period['start'], ':end_bill' => $period['end'],
        ]);
        $audit = $stmt->fetchAll();
    } catch (Throwable) {
        $audit = [];
    }

    return compact('transactions', 'accounts', 'categories', 'bills', 'automatic', 'audit', 'period', 'profile');
}

/** @param array<string,mixed> $context @param array<string,mixed> $account */
function jg_pembukuan_line(array $context, array $account, int $debit = 0, int $credit = 0): array
{
    return [
        ...$context,
        'account_code' => $account['code'], 'account_name' => $account['name'],
        'account_group' => $account['group'], 'account_type' => $account['type'],
        'normal_balance' => $account['normal'], 'debit' => $debit, 'credit' => $credit,
    ];
}

/** @param array<int,array<string,mixed>> $lines */
function jg_pembukuan_add_journal(array &$lines, array $context, array $entries): void
{
    foreach ($entries as [$account, $debit, $credit]) {
        if ($debit === 0 && $credit === 0) continue;
        $lines[] = jg_pembukuan_line($context, $account, $debit, $credit);
    }
}

/** @return array<string,mixed> */
function jg_pembukuan_build(array $source): array
{
    $period = $source['period'];
    $profile = $source['profile'];
    $accounts = (array) ($source['accounts'] ?? []);
    $categories = (array) ($source['categories'] ?? []);
    $journal = [];
    $errors = [];
    $seen = [];
    $journalSequence = 0;

    $contextFor = static function (string $sourceKey, array $row, string $kind, string $description) use (&$journalSequence, $profile): array {
        $journalSequence++;
        return [
            'journal_no' => 'JU-' . str_pad((string) $journalSequence, 6, '0', STR_PAD_LEFT),
            'transaction_date' => (string) ($row['transaction_date'] ?? $row['record_date'] ?? $row['issue_date'] ?? ''),
            'posting_date' => (string) ($row['transaction_date'] ?? $row['record_date'] ?? $row['issue_date'] ?? ''),
            'reference_no' => (string) ($row['reference_no'] ?? $row['order_no'] ?? $row['bill_no'] ?? $sourceKey),
            'document_no' => (string) ($row['invoice_no'] ?? $row['bill_no'] ?? ''),
            'transaction_type' => $kind,
            'description' => $description,
            'currency' => (string) ($row['currency'] ?? $profile['currency'] ?? 'IDR'),
            'exchange_rate' => 1,
            'source' => (string) ($row['source_table'] ?? 'accounting_transactions'),
            'sales_channel' => (string) ($row['channel'] ?? $row['platform'] ?? ''),
            'store' => (string) ($row['brand'] ?? $row['account_key'] ?? ''),
            'counterparty' => (string) ($row['counterparty_name'] ?? $row['counterparty'] ?? $row['vendor_name'] ?? ''),
            'internal_category' => (string) ($row['category_name'] ?? ''),
            'created_by' => (string) ($row['created_by'] ?? 'Sistem'),
            'created_at' => (string) ($row['created_at'] ?? $row['occurred_at'] ?? ''),
            'source_key' => $sourceKey,
            'source_id' => (string) ($row['id'] ?? $row['source_id'] ?? ''),
            'entity_id' => (string) ($profile['entity_id'] ?? ''),
            'cash_flow' => 'operating',
        ];
    };
    $recordError = static function (string $sourceKey, string $mapping, string $correction, bool $draft = true) use (&$errors): void {
        $errors[] = [
            'record' => $sourceKey, 'mapping' => $mapping,
            'expected_correction' => $correction, 'draft_available' => $draft,
        ];
    };
    $claim = static function (string $key) use (&$seen, $recordError): bool {
        if (isset($seen[$key])) {
            $recordError($key, 'duplicate_source_record', 'Hapus atau gabungkan catatan sumber yang terduplikasi sebelum ekspor.', false);
            return false;
        }
        $seen[$key] = true;
        return true;
    };

    foreach ((array) ($source['bills'] ?? []) as $bill) {
        $key = 'bill:' . (string) ($bill['id'] ?? $bill['bill_key'] ?? '');
        if (!$claim($key)) continue;
        if (!in_array((string) ($bill['status'] ?? ''), ['unpaid','partially_paid','paid','overdue'], true)) {
            $recordError($key, 'bill_status:' . (string) ($bill['status'] ?? 'missing'), 'Selesaikan atau keluarkan draf tagihan sebelum membuat Pembukuan.');
            continue;
        }
        $category = $categories[(int) ($bill['category_id'] ?? 0)] ?? [];
        $debitAccount = jg_pembukuan_category_account((array) $category);
        if ($debitAccount === null || $debitAccount['normal'] !== 'Debit') {
            $recordError($key, 'category:' . (string) ($category['category_key'] ?? $bill['category_id'] ?? 'missing'), 'Tetapkan kategori biaya yang memiliki pemetaan akun formal.');
            continue;
        }
        $amount = max(0, (int) ($bill['total_amount'] ?? 0));
        $context = $contextFor($key, $bill, 'Tagihan Pemasok', trim((string) ($bill['vendor_name'] ?? 'Tagihan pemasok')));
        $context['cash_flow'] = in_array($debitAccount['code'], ['1200','1210','1230','1300'], true) ? 'investing' : 'operating';
        jg_pembukuan_add_journal($journal, $context, [
            [$debitAccount, $amount, 0], [jg_pembukuan_account('2100'), 0, $amount],
        ]);
    }

    foreach ((array) ($source['transactions'] ?? []) as $transaction) {
        $key = 'transaction:' . (string) ($transaction['id'] ?? $transaction['transaction_key'] ?? '');
        if (!$claim($key)) continue;
        if ((string) ($transaction['status'] ?? '') !== 'posted') {
            $recordError($key, 'transaction_status:' . (string) ($transaction['status'] ?? 'missing'), 'Posting atau keluarkan transaksi draf dari periode sebelum membuat Pembukuan.');
            continue;
        }
        $date = (string) ($transaction['transaction_date'] ?? '');
        if ($date < $period['start'] || $date > $period['end']) {
            $recordError($key, 'reporting_period', 'Perbaiki tanggal transaksi atau pilih periode ekspor yang mencakup catatan ini.', false);
            continue;
        }
        $sourceAccount = jg_pembukuan_source_account((array) ($accounts[(int) ($transaction['account_id'] ?? 0)] ?? []));
        if ($sourceAccount === null) {
            $recordError($key, 'source_account:' . (string) ($transaction['account_id'] ?? 'missing'), 'Tetapkan jenis akun sumber (bank, kas, e-wallet, marketplace, piutang, utang, atau ekuitas).');
            continue;
        }
        $amount = max(0, (int) ($transaction['amount'] ?? 0));
        $fee = max(0, (int) ($transaction['transfer_fee_amount'] ?? 0));
        $type = (string) ($transaction['type'] ?? '');
        $description = '';
        foreach (['description', 'notes', 'counterparty_name', 'category_name'] as $descriptionField) {
            $description = trim((string) ($transaction[$descriptionField] ?? ''));
            if ($description !== '') break;
        }
        if ($description === '') $description = $type;
        $context = $contextFor($key, $transaction, ucwords(str_replace('_', ' ', $type)), $description);
        $entries = [];

        if ($type === 'transfer') {
            $destination = jg_pembukuan_source_account((array) ($accounts[(int) ($transaction['to_account_id'] ?? 0)] ?? []));
            if ($destination === null) {
                $recordError($key, 'destination_account:' . (string) ($transaction['to_account_id'] ?? 'missing'), 'Tetapkan akun tujuan transfer yang valid.');
                continue;
            }
            $entries = [[$destination, $amount, 0], [$sourceAccount, 0, $amount + $fee]];
            if ($fee > 0) $entries[] = [jg_pembukuan_account('6190'), $fee, 0];
            $context['cash_flow'] = 'transfer';
        } elseif ($type === 'bill_payment') {
            $entries = [[jg_pembukuan_account('2100'), $amount, 0], [$sourceAccount, 0, $amount + $fee]];
            if ($fee > 0) $entries[] = [jg_pembukuan_account('6190'), $fee, 0];
        } elseif (in_array($type, ['expense', 'refund'], true)) {
            $category = $categories[(int) ($transaction['category_id'] ?? 0)] ?? [];
            $debitAccount = $type === 'refund' ? jg_pembukuan_account('4300') : jg_pembukuan_category_account((array) $category);
            if ($debitAccount === null || $debitAccount['normal'] !== 'Debit') {
                $recordError($key, 'category:' . (string) ($category['category_key'] ?? $transaction['category_id'] ?? 'missing'), 'Tetapkan kategori transaksi yang memiliki pemetaan akun formal.');
                continue;
            }
            $entries = [[$debitAccount, $amount, 0], [$sourceAccount, 0, $amount + $fee]];
            if ($fee > 0) $entries[] = [jg_pembukuan_account('6190'), $fee, 0];
            $context['cash_flow'] = in_array($debitAccount['code'], ['1200','1210','1230','1300'], true) ? 'investing' : 'operating';
        } elseif ($type === 'manual_income') {
            $category = $categories[(int) ($transaction['category_id'] ?? 0)] ?? [];
            $creditAccount = jg_pembukuan_category_account((array) $category);
            if ($creditAccount === null || $creditAccount['normal'] !== 'Kredit') {
                $creditAccount = jg_pembukuan_account('4100');
            }
            $entries = [[$sourceAccount, $amount, 0], [$creditAccount, 0, $amount]];
        } elseif ($type === 'owner_injection') {
            $entries = [[$sourceAccount, $amount, 0], [jg_pembukuan_account('3100'), 0, $amount]];
            $context['cash_flow'] = 'financing';
        } elseif ($type === 'owner_draw') {
            $entries = [[jg_pembukuan_account('3400'), $amount, 0], [$sourceAccount, 0, $amount + $fee]];
            if ($fee > 0) $entries[] = [jg_pembukuan_account('6190'), $fee, 0];
            $context['cash_flow'] = 'financing';
        } elseif ($type === 'loan_received') {
            $entries = [[$sourceAccount, $amount, 0], [jg_pembukuan_account('2400'), 0, $amount]];
            $context['cash_flow'] = 'financing';
        } elseif ($type === 'opening_balance') {
            $entries = [[$sourceAccount, $amount, 0], [jg_pembukuan_account('3200'), 0, $amount]];
            $context['cash_flow'] = 'opening';
        } else {
            $recordError($key, 'transaction_type:' . $type, 'Gunakan jenis transaksi yang didukung atau tambahkan pemetaan debit/kredit formal untuk jenis ini.');
            continue;
        }
        jg_pembukuan_add_journal($journal, $context, $entries);
    }

    foreach ((array) ($source['automatic'] ?? []) as $record) {
        $key = 'automatic:' . (string) ($record['source_key'] ?? $record['source_id'] ?? '');
        if (!$claim($key)) continue;
        $date = (string) ($record['record_date'] ?? '');
        if ($date < $period['start'] || $date > $period['end']) {
            $recordError($key, 'reporting_period', 'Periksa waktu sumber otomatis dan zona waktu periode.', false);
            continue;
        }
        $destination = jg_pembukuan_source_account((array) ($accounts[(int) ($record['destination_account_id'] ?? 0)] ?? []));
        if ($destination === null) {
            $recordError($key, 'automatic_destination_account', 'Tetapkan akun penerima otomatis yang aktif.');
            continue;
        }
        $amount = max(0, (int) ($record['usable_cash_amount'] ?? $record['amount'] ?? 0));
        if ($amount === 0) continue;
        $sourceType = (string) ($record['source_type'] ?? '');
        $creditAccount = match ($sourceType) {
            'website_payment', 'direct_order_payment' => jg_pembukuan_account('4100'),
            'wallet_withdrawal' => jg_pembukuan_account('1120'),
            default => null,
        };
        if ($creditAccount === null) {
            $recordError($key, 'automatic_source_type:' . $sourceType, 'Tambahkan pemetaan formal untuk jenis sumber otomatis ini.');
            continue;
        }
        $kind = $sourceType === 'wallet_withdrawal' ? 'Penyelesaian Marketplace' : 'Penjualan Otomatis';
        $context = $contextFor($key, $record, $kind, (string) ($record['source_label'] ?? $kind));
        $context['cash_flow'] = $sourceType === 'wallet_withdrawal' ? 'transfer' : 'operating';
        jg_pembukuan_add_journal($journal, $context, [[$destination, $amount, 0], [$creditAccount, 0, $amount]]);
    }

    $validation = jg_pembukuan_validate($journal, $errors, $period, (string) ($profile['entity_id'] ?? ''));
    return jg_pembukuan_reports($source, $journal, $validation);
}

/** @param array<int,array<string,mixed>> $journal @param array<int,array<string,mixed>> $errors */
function jg_pembukuan_validate(array $journal, array $errors, array $period, string $entityId): array
{
    $byJournal = [];
    foreach ($journal as $line) {
        $number = (string) ($line['journal_no'] ?? '');
        $byJournal[$number]['debit'] = (int) ($byJournal[$number]['debit'] ?? 0) + (int) ($line['debit'] ?? 0);
        $byJournal[$number]['credit'] = (int) ($byJournal[$number]['credit'] ?? 0) + (int) ($line['credit'] ?? 0);
        if ((string) ($line['transaction_date'] ?? '') < $period['start'] || (string) ($line['transaction_date'] ?? '') > $period['end']) {
            $errors[] = ['record' => $line['source_key'], 'mapping' => 'reporting_period', 'expected_correction' => 'Perbaiki tanggal sumber.', 'draft_available' => false];
        }
        if ((string) ($line['entity_id'] ?? '') !== $entityId) {
            $errors[] = ['record' => $line['source_key'], 'mapping' => 'entity_id', 'expected_correction' => 'Ekspor hanya catatan milik entitas terpilih.', 'draft_available' => false];
        }
    }
    foreach ($byJournal as $number => $totals) {
        if ($totals['debit'] !== $totals['credit']) {
            $errors[] = ['record' => $number, 'mapping' => 'unbalanced_journal', 'expected_correction' => 'Perbaiki pemetaan agar total debit sama dengan total kredit.', 'draft_available' => false];
        }
    }
    $debit = array_sum(array_column($journal, 'debit'));
    $credit = array_sum(array_column($journal, 'credit'));
    if ($debit !== $credit) {
        $errors[] = ['record' => 'export_total', 'mapping' => 'unbalanced_export', 'expected_correction' => 'Total debit ekspor harus sama dengan total kredit.', 'draft_available' => false];
    }
    return [
        'status' => $errors === [] ? 'valid' : 'invalid', 'errors' => $errors,
        'warnings' => [], 'total_debit' => $debit, 'total_credit' => $credit,
        'journal_count' => count($byJournal), 'transaction_count' => count(array_unique(array_column($journal, 'source_key'))),
    ];
}

/** @return array<string,mixed> */
function jg_pembukuan_reports(array $source, array $journal, array $validation): array
{
    $period = (array) $source['period'];
    $profile = (array) $source['profile'];
    $createdAt = gmdate(DATE_ATOM);
    $catalog = jg_pembukuan_account_catalog();
    $totals = [];
    foreach ($journal as $line) {
        $code = (string) $line['account_code'];
        $totals[$code]['debit'] = (int) ($totals[$code]['debit'] ?? 0) + (int) $line['debit'];
        $totals[$code]['credit'] = (int) ($totals[$code]['credit'] ?? 0) + (int) $line['credit'];
    }
    ksort($totals, SORT_STRING);

    $profileRows = [];
    $profileLabels = [
        'entity_name' => 'Nama Entitas', 'trade_name' => 'Nama Dagang', 'npwp' => 'NPWP',
        'nitku' => 'NITKU', 'address' => 'Alamat', 'currency' => 'Mata Uang Pembukuan',
    ];
    foreach ($profileLabels as $key => $label) {
        if (trim((string) ($profile[$key] ?? '')) !== '') {
            $profileRows[] = ['label' => $label, 'value' => (string) $profile[$key]];
        }
    }
    $profileRows = array_merge($profileRows, [
        ['label' => 'Periode Laporan', 'value' => (string) $period['label']],
        ['label' => 'Tanggal Awal', 'value' => (string) $period['start']],
        ['label' => 'Tanggal Akhir', 'value' => (string) $period['end']],
        ['label' => 'Tanggal Pembuatan', 'value' => $createdAt],
        ['label' => 'Versi Ekspor', 'value' => JG_PEMBUKUAN_EXPORT_VERSION],
        ['label' => 'Dibuat oleh Sistem', 'value' => 'Executive Dashboard'],
    ]);

    $chartRows = [];
    foreach ($catalog as $code => $account) {
        $code = (string) $code;
        if (!isset($totals[$code]) && !in_array($code, ['1100','1110','1120','2100','3100','3300','4100'], true)) continue;
        $chartRows[] = [
            'code' => $code, 'name' => $account['name'], 'group' => $account['group'],
            'type' => $account['type'], 'normal' => $account['normal'], 'status' => 'Aktif',
        ];
    }

    usort($journal, static function (array $left, array $right): int {
        return [$left['transaction_date'], $left['journal_no'], $left['account_code']]
            <=> [$right['transaction_date'], $right['journal_no'], $right['account_code']];
    });
    $journalRows = array_map(static fn (array $line): array => [
        'journal_no' => $line['journal_no'], 'transaction_date' => $line['transaction_date'],
        'posting_date' => $line['posting_date'], 'reference_no' => $line['reference_no'],
        'document_no' => $line['document_no'], 'transaction_type' => $line['transaction_type'],
        'description' => $line['description'], 'account_code' => $line['account_code'],
        'account_name' => $line['account_name'], 'debit' => $line['debit'], 'credit' => $line['credit'],
        'currency' => $line['currency'], 'exchange_rate' => $line['exchange_rate'], 'source' => $line['source'],
        'sales_channel' => $line['sales_channel'], 'store' => $line['store'], 'counterparty' => $line['counterparty'],
        'internal_category' => $line['internal_category'], 'created_by' => $line['created_by'],
        'created_at' => $line['created_at'], 'source_key' => $line['source_key'], 'source_id' => $line['source_id'],
    ], $journal);

    $ledgerRows = [];
    $running = [];
    foreach ($journal as $line) {
        $code = (string) $line['account_code'];
        $normalDebit = (string) $line['normal_balance'] === 'Debit';
        $movement = $normalDebit
            ? (int) $line['debit'] - (int) $line['credit']
            : (int) $line['credit'] - (int) $line['debit'];
        $running[$code] = (int) ($running[$code] ?? 0) + $movement;
        $ledgerRows[] = [
            'account_code' => $code, 'account_name' => $line['account_name'],
            'date' => $line['transaction_date'], 'journal_no' => $line['journal_no'],
            'reference_no' => $line['reference_no'], 'description' => $line['description'],
            'debit' => $line['debit'], 'credit' => $line['credit'], 'balance' => $running[$code],
        ];
    }

    $trialRows = [];
    foreach ($totals as $code => $amounts) {
        $account = $catalog[$code];
        $net = (int) $amounts['debit'] - (int) $amounts['credit'];
        $trialRows[] = [
            'code' => $code, 'name' => $account['name'], 'opening_debit' => 0, 'opening_credit' => 0,
            'movement_debit' => $amounts['debit'], 'movement_credit' => $amounts['credit'],
            'ending_debit' => max(0, $net), 'ending_credit' => max(0, -$net),
        ];
    }

    $accountValue = static function (string $code, bool $creditNormal = false) use ($totals): int {
        $debit = (int) ($totals[$code]['debit'] ?? 0);
        $credit = (int) ($totals[$code]['credit'] ?? 0);
        return $creditNormal ? $credit - $debit : $debit - $credit;
    };
    $sales = $accountValue('4100', true) + $accountValue('4200', true);
    $returns = $accountValue('4300');
    $netRevenue = $sales - $returns;
    $cogs = $accountValue('5100');
    $grossProfit = $netRevenue - $cogs;
    $operatingExpense = 0;
    foreach ($catalog as $code => $account) {
        if ($account['group'] === 'Beban') $operatingExpense += $accountValue((string) $code);
    }
    $operatingProfit = $grossProfit - $operatingExpense;
    $otherIncome = $accountValue('4900', true);
    $otherExpense = 0;
    $netProfit = $operatingProfit + $otherIncome - $otherExpense;

    $pnlRows = [
        ['label' => 'Pendapatan Penjualan', 'code' => '4100/4200', 'amount' => $sales],
        ['label' => 'Retur dan Potongan Penjualan', 'code' => '4300', 'amount' => -$returns],
        ['label' => 'Pendapatan Neto', 'code' => '', 'amount' => $netRevenue],
        ['label' => 'Harga Pokok Penjualan', 'code' => '5100', 'amount' => -$cogs],
        ['label' => 'Laba Kotor', 'code' => '', 'amount' => $grossProfit],
        ['label' => 'Beban Operasional', 'code' => '6100-6290', 'amount' => -$operatingExpense],
        ['label' => 'Laba Usaha', 'code' => '', 'amount' => $operatingProfit],
        ['label' => 'Pendapatan Lain-lain', 'code' => '4900', 'amount' => $otherIncome],
        ['label' => 'Beban Lain-lain', 'code' => '', 'amount' => -$otherExpense],
        ['label' => 'Laba Sebelum Pajak', 'code' => '', 'amount' => $netProfit],
        ['label' => $netProfit >= 0 ? 'Laba Neto' : 'Rugi Neto', 'code' => '', 'amount' => $netProfit],
    ];

    $currentAssets = 0;
    $nonCurrentAssets = 0;
    $liabilitiesShort = 0;
    $liabilitiesLong = 0;
    $directEquity = 0;
    foreach ($catalog as $code => $account) {
        if ($account['group'] === 'Aset') {
            $value = $accountValue((string) $code);
            if ($account['type'] === 'Aset Tidak Lancar') $nonCurrentAssets += $value; else $currentAssets += $value;
        } elseif ($account['group'] === 'Liabilitas') {
            $value = $accountValue((string) $code, true);
            if ($account['type'] === 'Liabilitas Jangka Panjang') $liabilitiesLong += $value; else $liabilitiesShort += $value;
        } elseif ($account['group'] === 'Ekuitas' && $code !== '3300') {
            $directEquity += $accountValue((string) $code, true);
        }
    }
    $totalAssets = $currentAssets + $nonCurrentAssets;
    $totalLiabilities = $liabilitiesShort + $liabilitiesLong;
    $totalEquity = $directEquity + $netProfit;
    $positionRows = [
        ['label' => 'Aset Lancar', 'code' => '', 'amount' => $currentAssets],
        ['label' => 'Aset Tidak Lancar', 'code' => '', 'amount' => $nonCurrentAssets],
        ['label' => 'Total Aset', 'code' => '', 'amount' => $totalAssets],
        ['label' => 'Liabilitas Jangka Pendek', 'code' => '', 'amount' => $liabilitiesShort],
        ['label' => 'Liabilitas Jangka Panjang', 'code' => '', 'amount' => $liabilitiesLong],
        ['label' => 'Total Liabilitas', 'code' => '', 'amount' => $totalLiabilities],
        ['label' => 'Modal dan Ekuitas Lainnya', 'code' => '3100/3200/3400', 'amount' => $directEquity],
        ['label' => 'Laba/Rugi Tahun Berjalan', 'code' => '3300', 'amount' => $netProfit],
        ['label' => 'Total Ekuitas', 'code' => '', 'amount' => $totalEquity],
        ['label' => 'Total Liabilitas dan Ekuitas', 'code' => '', 'amount' => $totalLiabilities + $totalEquity],
    ];

    $cashCodes = ['1100' => true, '1110' => true, '1115' => true];
    $cashFlow = ['operating' => 0, 'investing' => 0, 'financing' => 0];
    foreach ($journal as $line) {
        if (!isset($cashCodes[(string) $line['account_code']])) continue;
        $classification = (string) ($line['cash_flow'] ?? 'operating');
        if ($classification === 'transfer' || $classification === 'opening') continue;
        $cashFlow[$classification] = (int) ($cashFlow[$classification] ?? 0)
            + (int) $line['debit'] - (int) $line['credit'];
    }
    $netCash = array_sum($cashFlow);
    $cashFlowRows = [
        ['label' => 'Arus Kas dari Aktivitas Operasi', 'amount' => $cashFlow['operating']],
        ['label' => 'Arus Kas dari Aktivitas Investasi', 'amount' => $cashFlow['investing']],
        ['label' => 'Arus Kas dari Aktivitas Pendanaan', 'amount' => $cashFlow['financing']],
        ['label' => 'Kenaikan/Penurunan Neto Kas', 'amount' => $netCash],
        ['label' => 'Kas dan Setara Kas Awal Periode', 'amount' => 0],
        ['label' => 'Kas dan Setara Kas Akhir Periode', 'amount' => $netCash],
    ];

    $capital = $accountValue('3100', true);
    $retained = $accountValue('3200', true);
    $draws = $accountValue('3400');
    $equityRows = [
        ['label' => 'Saldo Awal Ekuitas', 'amount' => 0],
        ['label' => 'Modal Disetor', 'amount' => $capital],
        ['label' => 'Laba Ditahan', 'amount' => $retained],
        ['label' => 'Laba/Rugi Tahun Berjalan', 'amount' => $netProfit],
        ['label' => 'Penarikan Pemilik', 'amount' => -$draws],
        ['label' => 'Saldo Akhir Ekuitas', 'amount' => $totalEquity],
    ];

    $payableRows = [];
    foreach ((array) ($source['bills'] ?? []) as $bill) {
        $payableRows[] = [
            'date' => $bill['issue_date'] ?? '', 'reference' => $bill['bill_no'] ?? $bill['bill_key'] ?? '',
            'party' => $bill['vendor_name'] ?? '', 'type' => 'Utang Usaha', 'opening' => 0,
            'increase' => (int) ($bill['total_amount'] ?? 0), 'payment' => (int) ($bill['paid_amount'] ?? 0),
            'adjustment' => 0, 'balance' => (int) ($bill['outstanding_amount'] ?? 0),
        ];
    }
    $documentRows = [];
    foreach ((array) ($source['transactions'] ?? []) as $row) {
        $documentRows[] = [
            'source' => 'accounting_transactions', 'source_id' => $row['id'] ?? '',
            'reference' => $row['reference_no'] ?? $row['transaction_key'] ?? '',
            'document_no' => $row['invoice_no'] ?? $row['bill_no'] ?? '',
            'status' => $row['receipt_status'] ?? 'missing',
        ];
    }
    foreach ((array) ($source['bills'] ?? []) as $row) {
        $documentRows[] = [
            'source' => 'accounting_bills', 'source_id' => $row['id'] ?? '',
            'reference' => $row['bill_key'] ?? '', 'document_no' => $row['bill_no'] ?? '',
            'status' => $row['receipt_status'] ?? 'missing',
        ];
    }
    $auditRows = array_map(static fn (array $row): array => [
        'time' => $row['created_at'] ?? '', 'entity_type' => $row['entity_type'] ?? '',
        'entity_id' => $row['entity_id'] ?? '', 'action' => $row['action'] ?? '',
        'source_id' => $row['id'] ?? '',
    ], (array) ($source['audit'] ?? []));

    $warnings = [
        'Saldo awal laporan tidak tersedia sebagai snapshot historis; laporan menampilkan mutasi dalam periode terpilih.',
        'Rekonsiliasi Marketplace lengkap dihilangkan karena sumber saat ini tidak menyediakan rincian biaya, diskon, retur, dan settlement dalam satu dataset tervalidasi.',
        'Pergerakan dan penilaian persediaan, aset tetap, piutang, serta ringkasan pajak dihilangkan karena data sumber belum mendukung laporan yang akurat.',
    ];
    if (trim((string) ($profile['entity_name'] ?? '')) === '') {
        $warnings[] = 'Nama legal entitas belum dikonfigurasi; Profil Entitas hanya mencantumkan nama dagang yang tersedia.';
    }
    if (($profile['application_version'] ?? 'unknown') === 'unknown') {
        $warnings[] = 'Versi aplikasi atau referensi commit belum tersedia pada konfigurasi runtime.';
    }
    foreach ($warnings as $warning) {
        $profileRows[] = ['label' => 'Catatan Keterbatasan', 'value' => $warning];
    }

    $money = static fn (string $key, string $label): array => ['key' => $key, 'label' => $label, 'type' => 'money'];
    $text = static fn (string $key, string $label): array => ['key' => $key, 'label' => $label, 'type' => 'text'];
    $date = static fn (string $key, string $label): array => ['key' => $key, 'label' => $label, 'type' => 'date'];
    $sheets = [
        'Profil Entitas' => jg_pembukuan_sheet('Profil Entitas', [$text('label','Keterangan'), $text('value','Nilai')], $profileRows, $period),
        'Bagan Akun' => jg_pembukuan_sheet('Bagan Akun', [$text('code','Kode Akun'),$text('name','Nama Akun'),$text('group','Kelompok Akun'),$text('type','Jenis Akun'),$text('normal','Saldo Normal'),$text('status','Status')], $chartRows, $period),
        'Jurnal Umum' => jg_pembukuan_sheet('Jurnal Umum', [
            $text('journal_no','Nomor Jurnal'),$date('transaction_date','Tanggal Transaksi'),$date('posting_date','Tanggal Pembukuan'),$text('reference_no','Nomor Referensi'),$text('document_no','Nomor Dokumen'),$text('transaction_type','Jenis Transaksi'),$text('description','Uraian'),$text('account_code','Kode Akun'),$text('account_name','Nama Akun'),$money('debit','Debit'),$money('credit','Kredit'),$text('currency','Mata Uang'),$text('exchange_rate','Kurs'),$text('source','Sumber Transaksi'),$text('sales_channel','Kanal Penjualan'),$text('store','Toko'),$text('counterparty','Pihak Lawan Transaksi'),$text('internal_category','Kategori Internal'),$text('created_by','Dibuat oleh'),$text('created_at','Waktu Pembuatan'),$text('source_key','Referensi Data Internal'),$text('source_id','ID Data Internal')
        ], $journalRows, $period),
        'Buku Besar' => jg_pembukuan_sheet('Buku Besar', [$text('account_code','Kode Akun'),$text('account_name','Nama Akun'),$date('date','Tanggal'),$text('journal_no','Nomor Jurnal'),$text('reference_no','Nomor Referensi'),$text('description','Uraian'),$money('debit','Debit'),$money('credit','Kredit'),$money('balance','Saldo')], $ledgerRows, $period),
        'Neraca Saldo' => jg_pembukuan_sheet('Neraca Saldo', [$text('code','Kode Akun'),$text('name','Nama Akun'),$money('opening_debit','Saldo Awal Debit'),$money('opening_credit','Saldo Awal Kredit'),$money('movement_debit','Mutasi Debit'),$money('movement_credit','Mutasi Kredit'),$money('ending_debit','Saldo Akhir Debit'),$money('ending_credit','Saldo Akhir Kredit')], $trialRows, $period),
        'Laporan Posisi Keuangan' => jg_pembukuan_sheet('Laporan Posisi Keuangan', [$text('label','Keterangan'),$text('code','Kode Akun'),$money('amount','Nilai')], $positionRows, $period),
        'Laporan Laba Rugi' => jg_pembukuan_sheet('Laporan Laba Rugi', [$text('label','Keterangan'),$text('code','Kode Akun'),$money('amount','Nilai')], $pnlRows, $period),
        'Laporan Arus Kas' => jg_pembukuan_sheet('Laporan Arus Kas', [$text('label','Keterangan'),$money('amount','Nilai')], $cashFlowRows, $period),
        'Laporan Perubahan Ekuitas' => jg_pembukuan_sheet('Laporan Perubahan Ekuitas', [$text('label','Keterangan'),$money('amount','Nilai')], $equityRows, $period),
    ];
    if ($payableRows !== []) {
        $sheets['Buku Pembantu Utang'] = jg_pembukuan_sheet('Buku Pembantu Utang', [$date('date','Tanggal'),$text('reference','Nomor Referensi'),$text('party','Pihak Pemberi Utang'),$text('type','Jenis Utang'),$money('opening','Nilai Awal'),$money('increase','Penambahan'),$money('payment','Pembayaran'),$money('adjustment','Penyesuaian'),$money('balance','Saldo')], $payableRows, $period);
    }
    $sheets['Indeks Dokumen Pendukung'] = jg_pembukuan_sheet('Indeks Dokumen Pendukung', [$text('source','Sumber'),$text('source_id','ID Sumber'),$text('reference','Nomor Referensi'),$text('document_no','Nomor Dokumen'),$text('status','Status Dokumen')], $documentRows, $period);
    if ($auditRows !== []) {
        $sheets['Log Perubahan'] = jg_pembukuan_sheet('Log Perubahan', [$text('time','Waktu Perubahan'),$text('entity_type','Jenis Data'),$text('entity_id','ID Data'),$text('action','Tindakan'),$text('source_id','ID Log')], $auditRows, $period);
    }

    if (array_sum(array_column($trialRows, 'ending_debit')) !== array_sum(array_column($trialRows, 'ending_credit'))) {
        $validation['errors'][] = ['record' => 'trial_balance', 'mapping' => 'unbalanced_trial_balance', 'expected_correction' => 'Periksa jurnal sumber hingga saldo akhir debit dan kredit sama.', 'draft_available' => false];
    }
    if ($totalAssets !== $totalLiabilities + $totalEquity) {
        $validation['errors'][] = ['record' => 'financial_position', 'mapping' => 'unbalanced_financial_position', 'expected_correction' => 'Periksa klasifikasi aset, liabilitas, ekuitas, pendapatan, dan beban.', 'draft_available' => false];
    }
    $validation['status'] = $validation['errors'] === [] ? 'valid' : 'invalid';
    $validation['warnings'] = $warnings;

    return [
        'title' => 'Paket Pembukuan', 'period' => $period, 'profile' => $profile,
        'created_at' => $createdAt, 'version' => JG_PEMBUKUAN_EXPORT_VERSION,
        'journal' => $journal, 'sheets' => $sheets, 'validation' => $validation,
        'financials' => ['position' => $positionRows, 'profit_loss' => $pnlRows, 'cash_flow' => $cashFlowRows, 'equity' => $equityRows],
    ];
}

function jg_pembukuan_sheet(string $title, array $columns, array $rows, array $period): array
{
    return ['title' => $title, 'period' => (string) $period['label'], 'columns' => $columns, 'rows' => $rows];
}

function jg_pembukuan_xml(string $value): string
{
    $value = preg_replace('/[^\x09\x0A\x0D\x20-\x{D7FF}\x{E000}-\x{FFFD}]/u', '', $value) ?? '';
    return htmlspecialchars(mb_substr($value, 0, 32767), ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function jg_pembukuan_column_name(int $index): string
{
    $name = '';
    for ($index++; $index > 0; $index = intdiv($index - 1, 26)) {
        $name = chr(65 + (($index - 1) % 26)) . $name;
    }
    return $name;
}

function jg_pembukuan_excel_date(string $value): ?int
{
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) return null;
    try {
        $date = new DateTimeImmutable($value, new DateTimeZone('UTC'));
        $origin = new DateTimeImmutable('1899-12-30', new DateTimeZone('UTC'));
        return (int) $origin->diff($date)->format('%r%a');
    } catch (Throwable) {
        return null;
    }
}

/** @param array<string,mixed> $sheet */
function jg_pembukuan_xlsx_sheet_xml(array $sheet): string
{
    $columns = (array) $sheet['columns'];
    $rows = (array) $sheet['rows'];
    $widths = [];
    foreach ($columns as $index => $column) {
        $widths[$index] = min(48, max(12, mb_strlen((string) $column['label']) + 2));
    }
    foreach (array_slice($rows, 0, 500) as $row) {
        foreach ($columns as $index => $column) {
            $value = (string) ($row[$column['key']] ?? '');
            $widths[$index] = min(48, max($widths[$index], mb_strlen($value) + 2));
        }
    }
    $columnXml = '';
    foreach ($widths as $index => $width) {
        $columnXml .= '<col min="' . ($index + 1) . '" max="' . ($index + 1) . '" width="' . $width . '" customWidth="1"/>';
    }
    $lastColumn = jg_pembukuan_column_name(max(0, count($columns) - 1));
    $sheetRows = [];
    $sheetRows[] = '<row r="1" ht="24" customHeight="1"><c r="A1" t="inlineStr" s="1"><is><t>' . jg_pembukuan_xml((string) $sheet['title']) . '</t></is></c></row>';
    $sheetRows[] = '<row r="2"><c r="A2" t="inlineStr" s="2"><is><t>Periode: ' . jg_pembukuan_xml((string) $sheet['period']) . '</t></is></c></row>';
    $headerCells = '';
    foreach ($columns as $index => $column) {
        $cell = jg_pembukuan_column_name($index) . '3';
        $headerCells .= '<c r="' . $cell . '" t="inlineStr" s="3"><is><t>' . jg_pembukuan_xml((string) $column['label']) . '</t></is></c>';
    }
    $sheetRows[] = '<row r="3">' . $headerCells . '</row>';
    foreach ($rows as $rowIndex => $row) {
        $excelRow = $rowIndex + 4;
        $cells = '';
        foreach ($columns as $columnIndex => $column) {
            $reference = jg_pembukuan_column_name($columnIndex) . $excelRow;
            $value = $row[$column['key']] ?? '';
            $type = (string) ($column['type'] ?? 'text');
            if ($type === 'money' && is_numeric($value)) {
                $cells .= '<c r="' . $reference . '" s="4"><v>' . (0 + $value) . '</v></c>';
            } elseif ($type === 'date' && ($serial = jg_pembukuan_excel_date((string) $value)) !== null) {
                $cells .= '<c r="' . $reference . '" s="5"><v>' . $serial . '</v></c>';
            } else {
                $cells .= '<c r="' . $reference . '" t="inlineStr"><is><t xml:space="preserve">' . jg_pembukuan_xml((string) $value) . '</t></is></c>';
            }
        }
        $sheetRows[] = '<row r="' . $excelRow . '">' . $cells . '</row>';
    }
    $lastRow = max(3, count($rows) + 3);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        . '<sheetFormatPr defaultRowHeight="15"/><cols>' . $columnXml . '</cols><sheetData>' . implode('', $sheetRows) . '</sheetData>'
        . '<autoFilter ref="A3:' . $lastColumn . $lastRow . '"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>'
        . '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>';
}

function jg_pembukuan_xlsx_styles(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        . '<numFmts count="2"><numFmt numFmtId="164" formatCode="[$Rp-421] #,##0;[Red]-[$Rp-421] #,##0"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts>'
        . '<fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="16"/><name val="Arial"/></font><font><i/><color rgb="FF666666"/><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font></fonts>'
        . '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF111827"/><bgColor indexed="64"/></patternFill></fill></fills>'
        . '<borders count="2"><border/><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom></border></borders>'
        . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        . '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
        . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}

/** @return string local temporary path */
function jg_pembukuan_write_xlsx(array $report): string
{
    if (!class_exists('ZipArchive')) throw new RuntimeException('Ekstensi ZIP diperlukan untuk membuat XLSX.');
    $path = tempnam(sys_get_temp_dir(), 'jg-pembukuan-xlsx-');
    if ($path === false) throw new RuntimeException('Tidak dapat membuat file XLSX sementara.');
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($path);
        throw new RuntimeException('Tidak dapat membuka file XLSX sementara.');
    }
    $sheets = array_values((array) $report['sheets']);
    $sheetNames = array_keys((array) $report['sheets']);
    $contentOverrides = '';
    $workbookSheets = '';
    $workbookRelationships = '';
    foreach ($sheets as $index => $sheet) {
        $number = $index + 1;
        $contentOverrides .= '<Override PartName="/xl/worksheets/sheet' . $number . '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        $workbookSheets .= '<sheet name="' . jg_pembukuan_xml(substr($sheetNames[$index], 0, 31)) . '" sheetId="' . $number . '" r:id="rId' . $number . '"/>';
        $workbookRelationships .= '<Relationship Id="rId' . $number . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' . $number . '.xml"/>';
        $zip->addFromString('xl/worksheets/sheet' . $number . '.xml', jg_pembukuan_xlsx_sheet_xml($sheet));
    }
    $styleRelationshipId = count($sheets) + 1;
    $workbookRelationships .= '<Relationship Id="rId' . $styleRelationshipId . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' . $contentOverrides . '</Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><bookViews><workbookView/></bookViews><sheets>' . $workbookSheets . '</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>');
    $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' . $workbookRelationships . '</Relationships>');
    $zip->addFromString('xl/styles.xml', jg_pembukuan_xlsx_styles());
    $zip->addFromString('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Paket Pembukuan</dc:title><dc:creator>Executive Dashboard</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' . jg_pembukuan_xml((string) $report['created_at']) . '</dcterms:created></cp:coreProperties>');
    $zip->addFromString('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Executive Dashboard</Application><TitlesOfParts><vt:vector size="' . count($sheetNames) . '" baseType="lpstr">' . implode('', array_map(static fn (string $name): string => '<vt:lpstr>' . jg_pembukuan_xml($name) . '</vt:lpstr>', $sheetNames)) . '</vt:vector></TitlesOfParts></Properties>');
    $zip->close();
    return $path;
}

function jg_pembukuan_pdf_text(string $value): string
{
    $converted = iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $value);
    $converted = $converted === false ? $value : $converted;
    return str_replace(['\\', '(', ')', "\r", "\n"], ['\\\\', '\\(', '\\)', '', ' '], $converted);
}

/** @return string local temporary path */
function jg_pembukuan_write_pdf(array $report): string
{
    $profile = (array) $report['profile'];
    $period = (array) $report['period'];
    $lines = [
        ['Paket Pembukuan', 20, true],
        [(string) ($profile['entity_name'] ?: $profile['trade_name'] ?: 'Entitas'), 14, true],
        ['Periode Laporan: ' . $period['label'], 11, false],
        ['Versi Ekspor: ' . $report['version'] . ' | Dibuat: ' . $report['created_at'], 9, false],
        ['', 9, false], ['Profil Entitas', 14, true],
    ];
    foreach (['entity_name' => 'Nama Entitas', 'trade_name' => 'Nama Dagang', 'npwp' => 'NPWP', 'nitku' => 'NITKU', 'address' => 'Alamat', 'currency' => 'Mata Uang Pembukuan'] as $key => $label) {
        if (trim((string) ($profile[$key] ?? '')) !== '') $lines[] = [$label . ': ' . $profile[$key], 10, false];
    }
    $sections = [
        'Laporan Posisi Keuangan' => $report['financials']['position'],
        'Laporan Laba Rugi' => $report['financials']['profit_loss'],
        'Laporan Arus Kas' => $report['financials']['cash_flow'],
        'Laporan Perubahan Ekuitas' => $report['financials']['equity'],
    ];
    foreach ($sections as $title => $rows) {
        $lines[] = ['', 9, false]; $lines[] = [$title, 14, true];
        foreach ($rows as $row) {
            $amount = number_format((int) ($row['amount'] ?? 0), 0, ',', '.');
            $lines[] = [(string) ($row['label'] ?? '') . '    Rp' . $amount, 10, false];
        }
    }
    $lines[] = ['', 9, false]; $lines[] = ['Catatan Ekspor', 14, true];
    foreach ((array) ($report['validation']['warnings'] ?? []) as $warning) $lines[] = ['- ' . $warning, 9, false];

    $pages = [[]];
    $remaining = 53;
    foreach ($lines as [$text, $size, $bold]) {
        $wrapped = $text === '' ? [''] : explode("\n", wordwrap((string) $text, $size >= 14 ? 72 : 92, "\n", true));
        foreach ($wrapped as $part) {
            if ($remaining <= 0) { $pages[] = []; $remaining = 53; }
            $pages[array_key_last($pages)][] = [$part, $size, $bold];
            $remaining--;
        }
    }
    $objects = [];
    $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    $fontRegularId = 3;
    $fontBoldId = 4;
    $objects[$fontRegularId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    $objects[$fontBoldId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
    $pageIds = [];
    foreach ($pages as $pageIndex => $pageLines) {
        $content = "BT\n";
        $y = 800;
        foreach ($pageLines as [$text, $size, $bold]) {
            $leading = max(13, (int) $size + 4);
            $content .= '/' . ($bold ? 'F2' : 'F1') . ' ' . (int) $size . " Tf\n40 " . $y . " Td\n(" . jg_pembukuan_pdf_text((string) $text) . ") Tj\n-40 -" . $leading . " Td\n";
            $y -= $leading;
        }
        $content .= "ET\n";
        $contentId = 5 + ($pageIndex * 2);
        $pageId = $contentId + 1;
        $pageIds[] = $pageId;
        $objects[$contentId] = '<< /Length ' . strlen($content) . ">>\nstream\n" . $content . "endstream";
        $objects[$pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' . $fontRegularId . ' 0 R /F2 ' . $fontBoldId . ' 0 R >> >> /Contents ' . $contentId . ' 0 R >>';
    }
    $objects[2] = '<< /Type /Pages /Kids [' . implode(' ', array_map(static fn (int $id): string => $id . ' 0 R', $pageIds)) . '] /Count ' . count($pageIds) . ' >>';
    ksort($objects);
    $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    $offsets = [0];
    foreach ($objects as $id => $object) {
        $offsets[$id] = strlen($pdf);
        $pdf .= $id . " 0 obj\n" . $object . "\nendobj\n";
    }
    $xref = strlen($pdf);
    $maxId = max(array_keys($objects));
    $pdf .= "xref\n0 " . ($maxId + 1) . "\n0000000000 65535 f \n";
    for ($id = 1; $id <= $maxId; $id++) $pdf .= sprintf('%010d 00000 n ', $offsets[$id] ?? 0) . "\n";
    $pdf .= "trailer\n<< /Size " . ($maxId + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF\n";
    $path = tempnam(sys_get_temp_dir(), 'jg-pembukuan-pdf-');
    if ($path === false || file_put_contents($path, $pdf) === false) throw new RuntimeException('Tidak dapat membuat PDF Pembukuan.');
    return $path;
}

function jg_pembukuan_metadata(array $report, array $includedFiles): array
{
    return [
        'entity_id' => $report['profile']['entity_id'] ?? '',
        'entity_name' => $report['profile']['entity_name'] ?: ($report['profile']['trade_name'] ?? ''),
        'reporting_period_start' => $report['period']['start'], 'reporting_period_end' => $report['period']['end'],
        'export_creation_time' => $report['created_at'], 'export_version' => $report['version'],
        'application_version_or_commit' => $report['profile']['application_version'] ?? 'unknown',
        'included_files' => $includedFiles,
        'total_transaction_count' => $report['validation']['transaction_count'],
        'total_journal_count' => $report['validation']['journal_count'],
        'validation_status' => $report['validation']['status'],
        'validation_warnings' => $report['validation']['warnings'],
    ];
}

/** @return string local temporary path */
function jg_pembukuan_write_package(array $report, string $xlsxPath, string $pdfPath): string
{
    $path = tempnam(sys_get_temp_dir(), 'jg-pembukuan-zip-');
    if ($path === false) throw new RuntimeException('Tidak dapat membuat paket ZIP sementara.');
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) throw new RuntimeException('Tidak dapat membuka paket ZIP.');
    $included = ['pembukuan.xlsx', 'laporan-keuangan.pdf', 'metadata.json'];
    $zip->addFile($xlsxPath, 'pembukuan.xlsx');
    $zip->addFile($pdfPath, 'laporan-keuangan.pdf');
    $zip->addFromString('metadata.json', json_encode(jg_pembukuan_metadata($report, $included), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    $zip->close();
    return $path;
}

function jg_pembukuan_send_file(string $path, string $contentType, string $filename): never
{
    header('Content-Type: ' . $contentType);
    header('Content-Disposition: attachment; filename="' . str_replace(['"', "\r", "\n"], '', $filename) . '"');
    header('Content-Length: ' . (string) filesize($path));
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    readfile($path);
    @unlink($path);
    exit;
}

function jg_pembukuan_export_response(PDO $pdo, string $format, array $input): never
{
    $period = jg_pembukuan_period($input);
    $profile = jg_pembukuan_entity_profile();
    $requestedEntity = trim((string) ($input['entity_id'] ?? ''));
    if ($requestedEntity !== '' && $requestedEntity !== (string) $profile['entity_id']) {
        throw new JgPembukuanValidationException('Entitas ekspor tidak valid.', [[
            'record' => $requestedEntity, 'mapping' => 'entity_id',
            'expected_correction' => 'Pilih entitas yang sesuai dengan Accounting workspace ini.', 'draft_available' => false,
        ]]);
    }
    $report = jg_pembukuan_build(jg_pembukuan_source_data($pdo, $period, $profile));
    if (($report['validation']['status'] ?? 'invalid') !== 'valid') {
        throw new JgPembukuanValidationException('Pembukuan belum dapat dibuat karena validasi gagal.', (array) $report['validation']['errors']);
    }
    $slug = (string) ($profile['entity_name'] ?: $profile['trade_name'] ?: $profile['entity_id']);
    $format = strtolower($format);
    if ($format === 'xlsx' || $format === 'excel') {
        jg_pembukuan_send_file(jg_pembukuan_write_xlsx($report), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', jg_pembukuan_filename('workbook', $slug, $period['start'], $period['end'], 'xlsx'));
    }
    if ($format === 'pdf') {
        jg_pembukuan_send_file(jg_pembukuan_write_pdf($report), 'application/pdf', jg_pembukuan_filename('financial', $slug, $period['start'], $period['end'], 'pdf'));
    }
    if ($format !== 'zip' && $format !== 'package') {
        throw new JgPembukuanValidationException('Format Pembukuan tidak didukung.', [[
            'record' => $format, 'mapping' => 'export_format',
            'expected_correction' => 'Gunakan xlsx, pdf, atau zip.', 'draft_available' => false,
        ]]);
    }
    $xlsx = jg_pembukuan_write_xlsx($report);
    $pdf = jg_pembukuan_write_pdf($report);
    try {
        $package = jg_pembukuan_write_package($report, $xlsx, $pdf);
    } finally {
        @unlink($xlsx); @unlink($pdf);
    }
    jg_pembukuan_send_file($package, 'application/zip', jg_pembukuan_filename('package', $slug, $period['start'], $period['end'], 'zip'));
}
