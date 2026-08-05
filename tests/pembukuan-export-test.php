<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-export.php';

function pembukuan_expect(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

function pembukuan_source(): array
{
    $period = jg_pembukuan_period(['month' => '2026-07']);
    $profile = jg_pembukuan_entity_profile([
        'accounting_entity_id' => 'entity-1',
        'accounting_entity_name' => 'PT Contoh Pangan Indonesia',
        'accounting_trade_name' => 'Jenang Gemi',
        'accounting_currency' => 'IDR',
        'application_version' => 'test-commit',
    ]);
    $accounts = [
        1 => ['id' => 1, 'type' => 'bank', 'name' => 'BCA Main'],
        2 => ['id' => 2, 'type' => 'cash', 'name' => 'Cash Office'],
        3 => ['id' => 3, 'type' => 'marketplace_wallet', 'name' => 'Shopee Wallet'],
    ];
    $categories = [
        1 => ['id' => 1, 'category_key' => 'meta-ads', 'name' => 'Meta Ads', 'type' => 'marketing'],
        2 => ['id' => 2, 'category_key' => 'reimbursement', 'name' => 'Reimbursement', 'type' => 'income'],
        3 => ['id' => 3, 'category_key' => 'utilities', 'name' => 'Utilities', 'type' => 'operations'],
        4 => ['id' => 4, 'category_key' => 'refund-paid', 'name' => 'Refund Paid', 'type' => 'expense'],
    ];
    $base = [
        'status' => 'posted', 'currency' => 'IDR', 'brand' => 'Jenang Gemi', 'channel' => 'Internal',
        'counterparty_name' => '', 'category_name' => '', 'reference_no' => '', 'invoice_no' => '',
        'order_no' => '', 'notes' => '', 'created_at' => '2026-07-15 12:00:00',
    ];
    $transactions = [
        [...$base, 'id' => 1, 'transaction_key' => 'txn-transfer', 'transaction_date' => '2026-07-02', 'type' => 'transfer', 'direction' => 'internal_transfer', 'account_id' => 3, 'to_account_id' => 1, 'category_id' => null, 'amount' => 1000, 'transfer_fee_amount' => 10],
        [...$base, 'id' => 2, 'transaction_key' => 'txn-capital', 'transaction_date' => '2026-07-03', 'type' => 'owner_injection', 'direction' => 'money_in', 'account_id' => 1, 'to_account_id' => null, 'category_id' => 2, 'amount' => 2000, 'transfer_fee_amount' => 0],
        [...$base, 'id' => 3, 'transaction_key' => 'txn-draw', 'transaction_date' => '2026-07-04', 'type' => 'owner_draw', 'direction' => 'money_out', 'account_id' => 1, 'to_account_id' => null, 'category_id' => 2, 'amount' => 300, 'transfer_fee_amount' => 0],
        [...$base, 'id' => 4, 'transaction_key' => 'txn-sale', 'transaction_date' => '2026-07-05', 'type' => 'manual_income', 'direction' => 'money_in', 'account_id' => 1, 'to_account_id' => null, 'category_id' => null, 'amount' => 5000, 'transfer_fee_amount' => 0, 'order_no' => 'ORDER-1'],
        [...$base, 'id' => 5, 'transaction_key' => 'txn-ad', 'transaction_date' => '2026-07-06', 'type' => 'expense', 'direction' => 'money_out', 'account_id' => 1, 'to_account_id' => null, 'category_id' => 1, 'category_name' => 'Meta Ads', 'amount' => 1000, 'transfer_fee_amount' => 0],
        [...$base, 'id' => 6, 'transaction_key' => 'txn-refund', 'transaction_date' => '2026-07-07', 'type' => 'refund', 'direction' => 'money_out', 'account_id' => 1, 'to_account_id' => null, 'category_id' => 4, 'category_name' => 'Refund Paid', 'amount' => 200, 'transfer_fee_amount' => 0],
        [...$base, 'id' => 7, 'transaction_key' => 'txn-bill-pay', 'transaction_date' => '2026-07-12', 'type' => 'bill_payment', 'direction' => 'money_out', 'account_id' => 1, 'to_account_id' => null, 'category_id' => 3, 'bill_id' => 1, 'amount' => 300, 'transfer_fee_amount' => 0],
    ];
    $automatic = [
        ['source_key' => 'wallet_release:9', 'source_id' => 9, 'source_type' => 'wallet_withdrawal', 'source_table' => 'dashboard_wallet_releases', 'record_date' => '2026-07-08', 'occurred_at' => '2026-07-08 08:00:00', 'destination_account_id' => 1, 'usable_cash_amount' => 400, 'platform' => 'shopee', 'account_key' => 'jenang-gemi-shopee', 'currency' => 'IDR'],
        ['source_key' => 'website_order:zero:10', 'source_id' => 10, 'source_type' => 'website_payment', 'source_table' => 'website_orders', 'record_date' => '2026-07-09', 'occurred_at' => '2026-07-09 08:00:00', 'destination_account_id' => 1, 'usable_cash_amount' => 600, 'platform' => 'zero', 'account_key' => 'zero', 'currency' => 'IDR', 'order_id' => 'ORDER-2'],
    ];
    $bills = [[
        'id' => 1, 'bill_key' => 'bill-1', 'bill_no' => 'INV-1', 'issue_date' => '2026-07-10',
        'category_id' => 3, 'category_name' => 'Utilities', 'vendor_name' => 'PLN', 'total_amount' => 700,
        'paid_amount' => 300, 'outstanding_amount' => 400, 'status' => 'partially_paid', 'receipt_status' => 'attached',
    ]];
    return compact('period', 'profile', 'accounts', 'categories', 'transactions', 'automatic', 'bills') + ['audit' => []];
}

$report = jg_pembukuan_build(pembukuan_source());
pembukuan_expect($report['validation']['status'] === 'valid', 'A complete mapped export must validate.');
pembukuan_expect($report['validation']['total_debit'] === $report['validation']['total_credit'], 'Total journal debit must equal credit.');

$sheetNames = array_keys($report['sheets']);
$expectedSheets = ['Profil Entitas', 'Bagan Akun', 'Jurnal Umum', 'Buku Besar', 'Neraca Saldo', 'Laporan Posisi Keuangan', 'Laporan Laba Rugi', 'Laporan Arus Kas', 'Laporan Perubahan Ekuitas', 'Buku Pembantu Utang', 'Indeks Dokumen Pendukung'];
pembukuan_expect($sheetNames === $expectedSheets, 'Supported Indonesian sheets must be emitted in the specified order.');
$journalLabels = array_column($report['sheets']['Jurnal Umum']['columns'], 'label');
foreach (['Nomor Jurnal', 'Tanggal Transaksi', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit', 'Sumber Transaksi', 'Referensi Data Internal'] as $label) {
    pembukuan_expect(in_array($label, $journalLabels, true), 'Jurnal Umum must include ' . $label . '.');
}

$bySource = [];
foreach ($report['journal'] as $line) $bySource[$line['source_key']][] = $line;
$sumAccount = static function (array $lines, string $code, string $side): int {
    return array_sum(array_map(static fn (array $line): int => $line['account_code'] === $code ? (int) $line[$side] : 0, $lines));
};
pembukuan_expect($sumAccount($bySource['transaction:1'], '4100', 'credit') === 0, 'A transfer must not be revenue.');
pembukuan_expect($sumAccount($bySource['transaction:1'], '1110', 'debit') === 1000, 'A transfer must debit its destination asset.');
pembukuan_expect($sumAccount($bySource['automatic:wallet_release:9'], '4100', 'credit') === 0, 'Marketplace settlement must not duplicate sales revenue.');
pembukuan_expect($sumAccount($bySource['automatic:wallet_release:9'], '1120', 'credit') === 400, 'Marketplace settlement must credit marketplace balance.');
pembukuan_expect($sumAccount($bySource['transaction:2'], '3100', 'credit') === 2000, 'Owner deposit must be equity.');
pembukuan_expect($sumAccount($bySource['transaction:3'], '3400', 'debit') === 300, 'Owner withdrawal must be contra-equity.');
pembukuan_expect($sumAccount($bySource['transaction:3'], '6290', 'debit') === 0, 'Owner withdrawal must not be operating expense.');

$trialRows = $report['sheets']['Neraca Saldo']['rows'];
pembukuan_expect(array_sum(array_column($trialRows, 'ending_debit')) === array_sum(array_column($trialRows, 'ending_credit')), 'Trial balance ending debit and credit must balance.');
$position = array_column($report['financials']['position'], 'amount', 'label');
pembukuan_expect($position['Total Aset'] === $position['Total Liabilitas dan Ekuitas'], 'Statement of financial position must balance.');

$duplicate = pembukuan_source();
$duplicate['transactions'][] = $duplicate['transactions'][0];
$duplicateReport = jg_pembukuan_build($duplicate);
pembukuan_expect($duplicateReport['validation']['status'] === 'invalid', 'Duplicate source records must invalidate the export.');
pembukuan_expect(in_array('duplicate_source_record', array_column($duplicateReport['validation']['errors'], 'mapping'), true), 'Duplicate validation must be actionable.');

$outside = pembukuan_source();
$outside['transactions'][0]['transaction_date'] = '2026-08-01';
$outsideReport = jg_pembukuan_build($outside);
pembukuan_expect(in_array('reporting_period', array_column($outsideReport['validation']['errors'], 'mapping'), true), 'Out-of-period records must be rejected.');

$unmapped = pembukuan_source();
$unmapped['transactions'][] = [...$unmapped['transactions'][0], 'id' => 99, 'transaction_key' => 'txn-unknown', 'transaction_date' => '2026-07-20', 'type' => 'adjustment'];
$unmappedReport = jg_pembukuan_build($unmapped);
pembukuan_expect(in_array('transaction_type:adjustment', array_column($unmappedReport['validation']['errors'], 'mapping'), true), 'Missing mappings must identify the affected transaction type.');

pembukuan_expect(jg_pembukuan_filename('workbook', '../../PT Contoh / Pangan', '2026-07-01', '2026-07-31', 'xlsx') === 'pembukuan-pt-contoh-pangan-2026-07-01-2026-07-31.xlsx', 'Export filenames must be sanitized.');

$empty = pembukuan_source();
$empty['transactions'] = $empty['automatic'] = $empty['bills'] = [];
$emptyReport = jg_pembukuan_build($empty);
pembukuan_expect($emptyReport['validation']['status'] === 'valid', 'Empty reporting periods must produce a valid zero-value export.');

$xlsx = jg_pembukuan_write_xlsx($report);
$xlsxZip = new ZipArchive();
pembukuan_expect($xlsxZip->open($xlsx) === true, 'Generated XLSX must be a readable ZIP container.');
$workbookXml = (string) $xlsxZip->getFromName('xl/workbook.xml');
$journalXml = (string) $xlsxZip->getFromName('xl/worksheets/sheet3.xml');
$xlsxZip->close();
pembukuan_expect(str_contains($workbookXml, 'Jurnal Umum') && str_contains($workbookXml, 'Laporan Posisi Keuangan'), 'XLSX must contain the supported Indonesian sheet names.');
pembukuan_expect(str_contains($journalXml, 'Nomor Jurnal') && str_contains($journalXml, 'Referensi Data Internal'), 'XLSX must contain Indonesian and traceability columns.');
pembukuan_expect(str_contains($journalXml, '<v>1000</v>'), 'Monetary values must be stored as numeric XLSX cells.');

$pdf = jg_pembukuan_write_pdf($report);
$pdfContent = (string) file_get_contents($pdf);
pembukuan_expect(str_starts_with($pdfContent, '%PDF-1.4'), 'Generated financial report must be a PDF.');
preg_match_all('/1 0 0 1 40 ([0-9]+) Tm/', $pdfContent, $pdfPositions);
pembukuan_expect(count($pdfPositions[1]) > 40, 'Every financial report line must use an explicit PDF text matrix.');
pembukuan_expect(min(array_map('intval', $pdfPositions[1])) >= 42 && max(array_map('intval', $pdfPositions[1])) <= 800, 'Every PDF line must remain inside the printable A4 page.');
pembukuan_expect(!str_contains($pdfContent, ' Td'), 'PDF lines must not accidentally accumulate relative text offsets.');
pembukuan_expect(str_contains($pdfContent, 'Laporan Posisi Keuangan') && str_contains($pdfContent, 'Catatan Ekspor'), 'The visible PDF content must include its financial sections and notes.');
$package = jg_pembukuan_write_package($report, $xlsx, $pdf);
$packageZip = new ZipArchive();
pembukuan_expect($packageZip->open($package) === true, 'Complete Package must be a readable ZIP.');
foreach (['pembukuan.xlsx', 'laporan-keuangan.pdf', 'metadata.json'] as $file) pembukuan_expect($packageZip->locateName($file) !== false, 'Complete Package must contain ' . $file . '.');
$metadata = json_decode((string) $packageZip->getFromName('metadata.json'), true);
$packageZip->close();
pembukuan_expect(($metadata['validation_status'] ?? '') === 'valid', 'Package metadata must report validation status.');
pembukuan_expect(($metadata['total_journal_count'] ?? 0) > 0, 'Package metadata must report journal count.');

@unlink($xlsx); @unlink($pdf); @unlink($package);

$large = pembukuan_source();
$large['automatic'] = $large['bills'] = [];
$large['transactions'] = [];
for ($index = 1; $index <= 2500; $index++) {
    $large['transactions'][] = [
        'id' => $index, 'transaction_key' => 'large-' . $index, 'transaction_date' => '2026-07-' . str_pad((string) (($index % 28) + 1), 2, '0', STR_PAD_LEFT),
        'status' => 'posted', 'type' => 'manual_income', 'direction' => 'money_in', 'account_id' => 1, 'to_account_id' => null,
        'category_id' => null, 'amount' => 1, 'transfer_fee_amount' => 0, 'currency' => 'IDR',
        'created_at' => '2026-07-01 00:00:00',
    ];
}
$largeReport = jg_pembukuan_build($large);
pembukuan_expect($largeReport['validation']['status'] === 'valid' && $largeReport['validation']['journal_count'] === 2500, 'Large reporting periods must remain balanced and complete.');

echo "pembukuan-export-test: ok\n";
