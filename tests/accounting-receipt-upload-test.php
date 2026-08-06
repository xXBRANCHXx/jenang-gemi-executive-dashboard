<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function receipt_upload_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
if (!is_string($png)) {
    fwrite(STDERR, "Unable to prepare receipt fixture.\n");
    exit(1);
}
$path = tempnam(sys_get_temp_dir(), 'jg-receipt-');
if (!is_string($path)) {
    fwrite(STDERR, "Unable to create receipt fixture.\n");
    exit(1);
}
file_put_contents($path, $png);

try {
    $validated = jg_accounting_validate_receipt_upload([
        'error' => UPLOAD_ERR_OK,
        'tmp_name' => $path,
        'size' => strlen($png),
        'name' => '../August receipt.png',
    ]);
    receipt_upload_expect('image/png', $validated['mime_type'], 'Receipt uploads must verify file signatures.');
    receipt_upload_expect('August receipt.png', $validated['original_name'], 'Receipt filenames must be reduced to a safe basename.');

    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('CREATE TABLE accounting_transactions (
        id INTEGER PRIMARY KEY, receipt_url TEXT, receipt_status TEXT
    )');
    $pdo->exec('CREATE TABLE accounting_receipt_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT, entity_id INTEGER,
        original_name TEXT, mime_type TEXT, size_bytes INTEGER, file_data BLOB,
        uploaded_by INTEGER NULL, created_at TEXT
    )');
    $pdo->exec("INSERT INTO accounting_transactions VALUES (7, '', 'missing')");

    $stored = jg_accounting_store_receipt($pdo, 'transaction', 7, $validated);
    receipt_upload_expect('/api/accounting/?action=receipt&id=1', $stored['url'], 'Stored receipts must use the authenticated preview endpoint.');
    $transaction = $pdo->query('SELECT receipt_url, receipt_status FROM accounting_transactions WHERE id = 7')->fetch();
    receipt_upload_expect('attached', $transaction['receipt_status'] ?? '', 'Uploading a receipt must mark the transaction receipt as attached.');
    receipt_upload_expect(strlen($png), (int) $pdo->query('SELECT size_bytes FROM accounting_receipt_files')->fetchColumn(), 'Stored receipt bytes must be retained exactly.');
} finally {
    @unlink($path);
}

echo "accounting-receipt-upload-test: ok\n";
