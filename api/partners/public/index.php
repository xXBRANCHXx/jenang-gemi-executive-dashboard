<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$path = dirname(__DIR__, 3) . '/data/partners.json';

if (!is_file($path)) {
    echo json_encode([
        'meta' => [
            'version' => '1.00.00',
            'updated_at' => '',
        ],
        'partners' => [],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$raw = @file_get_contents($path);
if (!is_string($raw) || trim($raw) === '') {
    http_response_code(500);
    echo json_encode(['error' => 'Partner registry is unreadable.'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$database = json_decode($raw, true);
if (!is_array($database)) {
    http_response_code(500);
    echo json_encode(['error' => 'Partner registry is invalid.'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$partners = [];
foreach ((array) ($database['partners'] ?? []) as $partner) {
    if (!is_array($partner)) {
        continue;
    }

    $partners[] = [
        'code' => (string) ($partner['code'] ?? ''),
        'name' => (string) ($partner['name'] ?? ''),
        'partner_slug' => (string) ($partner['partner_slug'] ?? ''),
        'store_path' => (string) ($partner['store_path'] ?? '/'),
        'selected_skus' => array_values(array_filter(array_map(
            static fn ($value): string => trim((string) $value),
            (array) ($partner['selected_skus'] ?? [])
        ))),
        'updated_at' => (string) ($partner['updated_at'] ?? ''),
    ];
}

echo json_encode([
    'meta' => [
        'version' => (string) (($database['meta']['version'] ?? '1.00.00')),
        'updated_at' => (string) (($database['meta']['updated_at'] ?? '')),
    ],
    'partners' => $partners,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
