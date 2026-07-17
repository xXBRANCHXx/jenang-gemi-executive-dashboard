<?php
declare(strict_types=1);

const ZERO_VOUCHER_TIMEZONE = 'Asia/Jakarta';

function zero_voucher_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS zero_store_voucher (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            code_hash CHAR(64) NOT NULL DEFAULT "",
            code_hint VARCHAR(80) NOT NULL DEFAULT "",
            discount_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
            starts_at_utc DATETIME NOT NULL,
            ends_at_utc DATETIME NOT NULL,
            stacking_mode VARCHAR(20) NOT NULL DEFAULT "compound",
            is_enabled TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function zero_voucher_normalize_code(mixed $value): string
{
    return strtoupper(trim(preg_replace('/\s+/', '', (string) $value) ?? ''));
}

function zero_voucher_code_hash(string $code): string
{
    return hash('sha256', zero_voucher_normalize_code($code));
}

function zero_voucher_code_hint(string $code): string
{
    $normalized = zero_voucher_normalize_code($code);
    $length = mb_strlen($normalized);
    if ($length <= 2) {
        return str_repeat('•', $length);
    }
    if ($length <= 6) {
        return mb_substr($normalized, 0, 1) . str_repeat('•', $length - 2) . mb_substr($normalized, -1);
    }
    return mb_substr($normalized, 0, 2) . str_repeat('•', min(8, $length - 4)) . mb_substr($normalized, -2);
}

function zero_voucher_parse_local_datetime(mixed $value, string $label): DateTimeImmutable
{
    $text = trim((string) $value);
    $timezone = new DateTimeZone(ZERO_VOUCHER_TIMEZONE);
    foreach (['Y-m-d\TH:i', 'Y-m-d\TH:i:s'] as $format) {
        $parsed = DateTimeImmutable::createFromFormat('!' . $format, $text, $timezone);
        $errors = DateTimeImmutable::getLastErrors();
        if ($parsed instanceof DateTimeImmutable && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))) {
            return $parsed;
        }
    }
    throw new InvalidArgumentException($label . ' must be a valid date and time.');
}

function zero_voucher_utc_sql(DateTimeImmutable $date): string
{
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
}

function zero_voucher_local_input(string $utcDate): string
{
    if (trim($utcDate) === '') {
        return '';
    }
    return (new DateTimeImmutable($utcDate, new DateTimeZone('UTC')))
        ->setTimezone(new DateTimeZone(ZERO_VOUCHER_TIMEZONE))
        ->format('Y-m-d\TH:i');
}

function zero_voucher_load(PDO $pdo): ?array
{
    zero_voucher_ensure_schema($pdo);
    $row = $pdo->query('SELECT * FROM zero_store_voucher WHERE id = 1')->fetch();
    if (!is_array($row)) {
        return null;
    }
    return [
        'configured' => trim((string) ($row['code_hash'] ?? '')) !== '',
        'code_hint' => (string) ($row['code_hint'] ?? ''),
        'discount_percent' => (float) ($row['discount_percent'] ?? 0),
        'starts_at' => zero_voucher_local_input((string) ($row['starts_at_utc'] ?? '')),
        'ends_at' => zero_voucher_local_input((string) ($row['ends_at_utc'] ?? '')),
        'starts_at_utc' => (string) ($row['starts_at_utc'] ?? ''),
        'ends_at_utc' => (string) ($row['ends_at_utc'] ?? ''),
        'stacking_mode' => (string) ($row['stacking_mode'] ?? 'compound'),
        'is_enabled' => (int) ($row['is_enabled'] ?? 0) === 1,
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function zero_voucher_save(PDO $pdo, array $input): array
{
    $current = zero_voucher_load($pdo);
    $code = zero_voucher_normalize_code($input['code'] ?? '');
    if ($code !== '' && (mb_strlen($code) < 4 || mb_strlen($code) > 64 || preg_match('/[\x00-\x1F\x7F]/u', $code))) {
        throw new InvalidArgumentException('Voucher code must be 4 to 64 printable characters.');
    }
    if ($code === '' && empty($current['configured'])) {
        throw new InvalidArgumentException('Voucher code is required the first time this campaign is saved.');
    }

    $percent = round((float) ($input['discount_percent'] ?? 0), 2);
    if ($percent <= 0 || $percent > 100) {
        throw new InvalidArgumentException('Voucher discount must be greater than 0 and no more than 100 percent.');
    }
    $startsAt = zero_voucher_parse_local_datetime($input['starts_at'] ?? '', 'Start time');
    $endsAt = zero_voucher_parse_local_datetime($input['ends_at'] ?? '', 'End time');
    if ($endsAt <= $startsAt) {
        throw new InvalidArgumentException('End time must be after the start time.');
    }
    $mode = strtolower(trim((string) ($input['stacking_mode'] ?? 'compound')));
    if (!in_array($mode, ['compound', 'override'], true)) {
        throw new InvalidArgumentException('Voucher behavior must be compound or override.');
    }

    $now = gmdate('Y-m-d H:i:s');
    $codeHash = $code !== '' ? zero_voucher_code_hash($code) : '';
    $codeHint = $code !== '' ? zero_voucher_code_hint($code) : '';
    $values = [
        ':discount_percent' => number_format($percent, 2, '.', ''),
        ':starts_at_utc' => zero_voucher_utc_sql($startsAt),
        ':ends_at_utc' => zero_voucher_utc_sql($endsAt),
        ':stacking_mode' => $mode,
        ':is_enabled' => !empty($input['is_enabled']) ? 1 : 0,
        ':updated_at' => $now,
    ];
    if ($current) {
        $codeAssignments = '';
        if ($codeHash !== '') {
            $codeAssignments = 'code_hash = :code_hash, code_hint = :code_hint,';
            $values[':code_hash'] = $codeHash;
            $values[':code_hint'] = $codeHint;
        }
        $stmt = $pdo->prepare(
            'UPDATE zero_store_voucher SET
                ' . $codeAssignments . '
                discount_percent = :discount_percent,
                starts_at_utc = :starts_at_utc,
                ends_at_utc = :ends_at_utc,
                stacking_mode = :stacking_mode,
                is_enabled = :is_enabled,
                updated_at = :updated_at
             WHERE id = 1'
        );
        $stmt->execute($values);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO zero_store_voucher
                (id, code_hash, code_hint, discount_percent, starts_at_utc, ends_at_utc, stacking_mode, is_enabled, created_at, updated_at)
             VALUES
                (1, :code_hash, :code_hint, :discount_percent, :starts_at_utc, :ends_at_utc, :stacking_mode, :is_enabled, :created_at, :updated_at)'
        );
        $stmt->execute([
            ':code_hash' => $codeHash,
            ':code_hint' => $codeHint,
            ':discount_percent' => $values[':discount_percent'],
            ':starts_at_utc' => $values[':starts_at_utc'],
            ':ends_at_utc' => $values[':ends_at_utc'],
            ':stacking_mode' => $values[':stacking_mode'],
            ':is_enabled' => $values[':is_enabled'],
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);
    }
    return zero_voucher_load($pdo) ?? [];
}

function zero_voucher_match_active(PDO $pdo, mixed $code, ?DateTimeImmutable $now = null): ?array
{
    $normalized = zero_voucher_normalize_code($code);
    if ($normalized === '') {
        return null;
    }
    $voucher = zero_voucher_load($pdo);
    if (!$voucher || !$voucher['configured'] || !$voucher['is_enabled']) {
        return null;
    }
    $now ??= new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $nowSql = $now->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    if ($nowSql < $voucher['starts_at_utc'] || $nowSql > $voucher['ends_at_utc']) {
        return null;
    }
    $row = $pdo->query('SELECT code_hash FROM zero_store_voucher WHERE id = 1')->fetch();
    $storedHash = is_array($row) ? (string) ($row['code_hash'] ?? '') : '';
    if ($storedHash === '' || !hash_equals($storedHash, zero_voucher_code_hash($normalized))) {
        return null;
    }
    return $voucher;
}

function zero_voucher_unit_price(float $grossPrice, float $activeDiscountPrice, array $voucher): float
{
    $sourcePrice = ($voucher['stacking_mode'] ?? 'compound') === 'override'
        ? $grossPrice
        : $activeDiscountPrice;
    $percent = max(0.0, min(100.0, (float) ($voucher['discount_percent'] ?? 0)));
    return round(max(0.0, $sourcePrice - ($sourcePrice * $percent / 100)), 2);
}
