<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-bootstrap.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sku-db-bootstrap.php';

const JG_AD_VIEW_ACCOUNTS = [
    'jenang-gemi-shopee' => 'Jenang Gemi',
    'zero-shopee' => 'ZERO',
    'zfit-shopee' => 'ZFIT',
];

function jgAdViewEnsureSchema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ad_view_campaigns (
            account_key VARCHAR(80) NOT NULL,
            campaign_id BIGINT UNSIGNED NOT NULL,
            alias_name VARCHAR(180) NOT NULL DEFAULT "",
            tags_json JSON NULL,
            is_tracked TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (account_key, campaign_id),
            KEY idx_ad_view_tracked (account_key, is_tracked)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ad_view_events (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            account_key VARCHAR(80) NOT NULL,
            campaign_id BIGINT UNSIGNED NOT NULL,
            event_at DATETIME NOT NULL,
            event_type VARCHAR(60) NOT NULL DEFAULT "note",
            title VARCHAR(180) NOT NULL,
            note TEXT NULL,
            before_value VARCHAR(120) NOT NULL DEFAULT "",
            after_value VARCHAR(120) NOT NULL DEFAULT "",
            tags_json JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_ad_view_event_campaign (account_key, campaign_id, event_at),
            KEY idx_ad_view_event_at (event_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ad_view_budgets (
            account_key VARCHAR(80) NOT NULL,
            budget_month CHAR(7) NOT NULL,
            monthly_budget DECIMAL(18,2) NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (account_key, budget_month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    analyticsEnsureTableColumn($pdo, 'ad_view_campaigns', 'unit_cogs_override', 'DECIMAL(18,2) NULL DEFAULT NULL AFTER `tags_json`');
}

function jgAdViewJsonBody(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : [];
}

function jgAdViewAccount(mixed $value, bool $allowAll = true): string
{
    $account = strtolower(trim((string) $value));
    if ($allowAll && ($account === '' || $account === 'all')) {
        return 'all';
    }
    if (!isset(JG_AD_VIEW_ACCOUNTS[$account])) {
        analyticsJsonResponse(['ok' => false, 'error' => 'unknown_shopee_account'], 422);
    }
    return $account;
}

function jgAdViewDate(mixed $value, string $fallback): string
{
    $date = trim((string) $value) ?: $fallback;
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone('Asia/Jakarta'));
    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        analyticsJsonResponse(['ok' => false, 'error' => 'invalid_ad_view_date'], 422);
    }
    return $date;
}

/** @return array<string, mixed> */
function jgAdViewUpstream(string $path, array $query): array
{
    $token = jg_dashboard_marketplace_api_setup_token();
    if ($token === '') {
        analyticsJsonResponse(['ok' => false, 'error' => 'missing_marketplace_api_setup_token'], 503);
    }
    $query['setup_token'] = $token;
    $url = jg_dashboard_marketplace_api_base_url() . $path . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => $path === '/ads/sync' ? 90 : 20,
            'header' => "Accept: application/json\r\n",
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);
    if (!is_string($response) || $response === '') {
        analyticsJsonResponse(['ok' => false, 'error' => 'shopee_ads_upstream_unreachable'], 502);
    }
    $status = 200;
    foreach (($http_response_header ?? []) as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $line, $match)) {
            $status = (int) $match[1];
            break;
        }
    }
    $payload = json_decode($response, true);
    if (!is_array($payload)) {
        analyticsJsonResponse(['ok' => false, 'error' => 'invalid_shopee_ads_response'], 502);
    }
    if ($status >= 400 || empty($payload['ok'])) {
        analyticsJsonResponse([
            'ok' => false,
            'error' => (string) ($payload['error'] ?? 'shopee_ads_request_failed'),
            'message' => (string) ($payload['message'] ?? ''),
            'sync_results' => $payload['sync_results'] ?? [],
        ], $status >= 400 ? $status : 502);
    }
    return $payload;
}

function jgAdViewSkuKey(mixed $value): string
{
    return strtoupper(trim((string) $value));
}

function jgAdViewSkuCompactKey(mixed $value): string
{
    $key = preg_replace('/[^A-Z0-9]+/', '', jgAdViewSkuKey($value)) ?? '';
    return str_replace(
        ['SALTEDCARAMEL', 'SACHETS', 'CAPSULES', 'CAPSULE'],
        ['SALTCARAMEL', 'SACHET', 'CAPS', 'CAPS'],
        $key
    );
}

function jgAdViewSkuInitials(mixed $value): string
{
    $words = preg_split('/[^A-Z0-9]+/', jgAdViewSkuKey($value), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    return implode('', array_map(static fn (string $word): string => substr($word, 0, 1), $words));
}

/** @return array<int, string> */
function jgAdViewSellerSkuKeys(mixed $value): array
{
    $full = jgAdViewSkuCompactKey($value);
    if ($full === '') {
        return [];
    }
    $withoutPackSize = preg_replace(
        '/\d+(?:ML|L|MG|G|GR|GRAM|KG|SACHET|CAPS|PCS|PC|TABLET|TAB|BOTTLE|BOTOL)$/',
        '',
        $full
    ) ?? $full;
    $withoutTrailingNumber = preg_replace('/\d+$/', '', $full) ?? $full;
    return array_values(array_unique(array_filter([$full, $withoutPackSize, $withoutTrailingNumber])));
}

/** @return array<int, array<string, mixed>> */
function jgAdViewSkuCatalog(PDO $pdo): array
{
    static $cache = [];
    $cacheKey = spl_object_id($pdo);
    if (isset($cache[$cacheKey])) {
        return $cache[$cacheKey];
    }
    $statement = $pdo->query(
        'SELECT s.sku, s.tag, s.cogs, s.volume, s.product_id,
                b.name AS brand_name, u.name AS unit_name,
                p.name AS product_name, f.name AS flavor_name
         FROM sku_skus s
         LEFT JOIN sku_brands b ON b.id = s.brand_id
         LEFT JOIN sku_units u ON u.id = s.unit_id
         LEFT JOIN sku_products p ON p.id = s.product_id
         LEFT JOIN sku_flavors f ON f.id = s.flavor_id'
    );
    $cache[$cacheKey] = array_values(array_filter($statement->fetchAll(), 'is_array'));
    return $cache[$cacheKey];
}

/** @param array<string, mixed> $row @return array<int, string> */
function jgAdViewSkuSemanticAliases(array $row): array
{
    $brand = jgAdViewSkuCompactKey($row['brand_name'] ?? '');
    $brandInitials = jgAdViewSkuCompactKey(jgAdViewSkuInitials($row['brand_name'] ?? ''));
    $product = jgAdViewSkuCompactKey($row['product_name'] ?? '');
    $productInitials = jgAdViewSkuCompactKey(jgAdViewSkuInitials($row['product_name'] ?? ''));
    $productWords = array_map(
        'jgAdViewSkuCompactKey',
        preg_split('/[^A-Z0-9]+/', jgAdViewSkuKey($row['product_name'] ?? ''), -1, PREG_SPLIT_NO_EMPTY) ?: []
    );
    $flavor = jgAdViewSkuCompactKey($row['flavor_name'] ?? '');
    $flavorInitials = jgAdViewSkuCompactKey(jgAdViewSkuInitials($row['flavor_name'] ?? ''));
    $flavorWords = array_map(
        'jgAdViewSkuCompactKey',
        preg_split('/[^A-Z0-9]+/', jgAdViewSkuKey($row['flavor_name'] ?? ''), -1, PREG_SPLIT_NO_EMPTY) ?: []
    );
    $unit = jgAdViewSkuCompactKey($row['unit_name'] ?? '');
    $volume = (float) ($row['volume'] ?? 0);
    $volumeText = $volume > 0 ? rtrim(rtrim(number_format($volume, 2, '.', ''), '0'), '.') : '';

    $brands = array_values(array_unique(array_filter([
        $brand,
        $brandInitials,
        $brandInitials !== '' ? substr($brandInitials, 0, 1) : '',
        '',
    ], static fn (string $value): bool => $value !== '' || $value === '')));
    $products = array_values(array_unique(array_filter(array_merge([
        $product,
        $productInitials,
        strlen($product) >= 3 ? substr($product, 0, 3) : '',
        strlen($product) >= 4 ? substr($product, 0, 4) : '',
    ], $productWords))));
    $flavors = array_values(array_unique(array_filter(array_merge([
        $flavor,
        $flavorInitials,
        strlen($flavor) >= 2 ? substr($flavor, 0, 2) : '',
        strlen($flavor) >= 3 ? substr($flavor, 0, 3) : '',
        strlen($flavor) >= 4 ? substr($flavor, 0, 4) : '',
        '',
    ], $flavorWords), static fn (string $value): bool => $value !== '' || $value === '')));
    $sizes = array_values(array_unique(array_filter([
        $volumeText !== '' ? jgAdViewSkuCompactKey($volumeText . $unit) : '',
        $volumeText,
        '',
    ], static fn (string $value): bool => $value !== '' || $value === '')));

    $aliases = [];
    foreach ($brands as $brandKey) {
        foreach ($products as $productKey) {
            foreach ($flavors as $flavorKey) {
                foreach ($sizes as $sizeKey) {
                    $aliases[] = $brandKey . $productKey . $flavorKey . $sizeKey;
                    if ($flavorKey !== '' && $sizeKey !== '') {
                        $aliases[] = $brandKey . $productKey . $sizeKey . $flavorKey;
                    }
                }
            }
        }
    }
    return array_values(array_unique(array_filter($aliases, static fn (string $alias): bool => strlen($alias) >= 5)));
}

/** @param array<int, array<string, mixed>> $candidates @return array<string, mixed>|null */
function jgAdViewUniqueSkuCandidate(array $candidates): ?array
{
    $bySku = [];
    foreach ($candidates as $candidate) {
        $sku = jgAdViewSkuKey($candidate['sku'] ?? '');
        if ($sku !== '') {
            $bySku[$sku] = $candidate;
        }
    }
    return count($bySku) === 1 ? array_values($bySku)[0] : null;
}

/** @param array<int, string> $sellerSkus @return array<string, array{sku:string,cogs:float,source_key:string,matched_by:string}> */
function jgAdViewSkuCostMap(PDO $pdo, array $sellerSkus): array
{
    $sellerSkus = array_values(array_unique(array_filter(array_map(
        'jgAdViewSkuKey',
        $sellerSkus
    ))));
    if ($sellerSkus === []) {
        return [];
    }
    try {
        $directIndex = [];
        $semanticIndex = [];
        foreach (jgAdViewSkuCatalog($pdo) as $row) {
            foreach (['sku', 'tag'] as $field) {
                $alias = jgAdViewSkuCompactKey($row[$field] ?? '');
                if ($alias !== '') {
                    $directIndex[$alias][] = $row + ['matched_by' => $field];
                }
            }
            foreach (jgAdViewSkuSemanticAliases($row) as $alias) {
                $semanticIndex[$alias][] = $row + ['matched_by' => 'attributes'];
            }
        }
        $result = [];
        foreach ($sellerSkus as $sellerSku) {
            $candidate = null;
            foreach (jgAdViewSellerSkuKeys($sellerSku) as $sellerKey) {
                $candidate = jgAdViewUniqueSkuCandidate($directIndex[$sellerKey] ?? []);
                if ($candidate === null) {
                    $candidate = jgAdViewUniqueSkuCandidate($semanticIndex[$sellerKey] ?? []);
                }
                if ($candidate !== null) {
                    break;
                }
            }
            if ($candidate !== null) {
                $result[$sellerSku] = [
                    'sku' => jgAdViewSkuKey($candidate['sku'] ?? ''),
                    'cogs' => (float) ($candidate['cogs'] ?? 0),
                    'source_key' => $sellerSku,
                    'matched_by' => (string) ($candidate['matched_by'] ?? 'attributes'),
                ];
            }
        }
        return $result;
    } catch (Throwable $error) {
        error_log('Ad View SKU economics unavailable: ' . $error->getMessage());
        return [];
    }
}

/** @param array<string, mixed> $campaign @return array<int, array{sku:string,cogs:float,source_key:string,matched_by:string}> */
function jgAdViewProductFamilyCosts(PDO $pdo, array $campaign): array
{
    try {
        $catalog = jgAdViewSkuCatalog($pdo);
    } catch (Throwable $error) {
        error_log('Ad View SKU product-family fallback unavailable: ' . $error->getMessage());
        return [];
    }
    $campaignText = jgAdViewSkuCompactKey(implode(' ', array_filter([
        (string) ($campaign['product_name'] ?? ''),
        (string) ($campaign['source_ad_name'] ?? ''),
        (string) (($campaign['settings']['common_info']['ad_name'] ?? '')),
    ])));
    if ($campaignText === '') {
        return [];
    }

    $families = [];
    foreach ($catalog as $row) {
        $productId = jgAdViewSkuKey($row['product_id'] ?? '');
        $productName = trim((string) ($row['product_name'] ?? ''));
        $productKey = jgAdViewSkuCompactKey($productName);
        if ($productId === '' || $productKey === '' || (float) ($row['cogs'] ?? 0) <= 0) {
            continue;
        }
        if (!isset($families[$productId])) {
            $productWords = preg_split('/[^A-Z0-9]+/', jgAdViewSkuKey($productName), -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $families[$productId] = [
                'score' => 0,
                'rows' => [],
                'product_key' => $productKey,
                'product_words' => array_values(array_unique(array_filter(array_map(
                    'jgAdViewSkuCompactKey',
                    $productWords
                ), static fn (string $word): bool => strlen($word) >= 4))),
                'brand_key' => jgAdViewSkuCompactKey($row['brand_name'] ?? ''),
            ];
        }
        $families[$productId]['rows'][] = $row;
    }

    foreach ($families as &$family) {
        $score = str_contains($campaignText, (string) $family['product_key']) ? 100 : 0;
        foreach ($family['product_words'] as $word) {
            if (str_contains($campaignText, $word)) {
                $score += 18;
            }
        }
        if ($family['brand_key'] !== '' && str_contains($campaignText, (string) $family['brand_key'])) {
            $score += 12;
        }
        $family['score'] = $score;
    }
    unset($family);
    uasort($families, static fn (array $a, array $b): int => (int) $b['score'] <=> (int) $a['score']);
    $ranked = array_values($families);
    $best = $ranked[0] ?? null;
    $runnerUp = $ranked[1] ?? null;
    if (!is_array($best) || (int) $best['score'] < 100 || (is_array($runnerUp) && (int) $best['score'] === (int) $runnerUp['score'])) {
        return [];
    }
    return array_values(array_map(static fn (array $row): array => [
        'sku' => jgAdViewSkuKey($row['sku'] ?? ''),
        'cogs' => (float) ($row['cogs'] ?? 0),
        'source_key' => jgAdViewSkuKey($row['sku'] ?? ''),
        'matched_by' => 'product_family',
    ], $best['rows']));
}

/** @param array<int, string> $sellerSkus @return array<string, float> */
function jgAdViewPurchasedSkuQuantities(PDO $pdo, string $accountKey, string $startDate, string $endDate, array $sellerSkus): array
{
    $sellerSkus = array_values(array_unique(array_filter(array_map(
        static fn (mixed $sku): string => strtoupper(trim((string) $sku)),
        $sellerSkus
    ))));
    if ($sellerSkus === []) {
        return [];
    }
    $params = [
        ':account_key' => $accountKey,
        ':start_date' => $startDate,
        ':end_date' => $endDate,
    ];
    try {
        $statement = $pdo->prepare(
            'SELECT UPPER(TRIM(sku)) AS normalized_sku, COALESCE(SUM(quantity), 0) AS quantity
             FROM dashboard_order_mirror
             WHERE platform = "shopee" AND account_key = :account_key AND deleted_at IS NULL
               AND order_create_date BETWEEN :start_date AND :end_date
             GROUP BY UPPER(TRIM(sku))'
        );
        $statement->execute($params);
        $result = [];
        foreach ($statement->fetchAll() as $row) {
            $purchasedSku = jgAdViewSkuKey($row['normalized_sku'] ?? '');
            $purchasedCompact = jgAdViewSkuCompactKey($purchasedSku);
            foreach ($sellerSkus as $sellerSku) {
                if ($sellerSku === $purchasedSku || ($purchasedCompact !== '' && $purchasedCompact === jgAdViewSkuCompactKey($sellerSku))) {
                    $result[$sellerSku] = (float) ($result[$sellerSku] ?? 0) + max(0, (float) ($row['quantity'] ?? 0));
                }
            }
        }
        return $result;
    } catch (Throwable $error) {
        error_log('Ad View purchased SKU mix unavailable: ' . $error->getMessage());
        return [];
    }
}

function jgAdViewMarketplaceFeeRate(PDO $pdo, string $accountKey, string $startDate, string $endDate): float
{
    try {
        $statement = $pdo->prepare(
            'SELECT COALESCE(SUM(marketplace_fees), 0) AS fees, COALESCE(SUM(gross_revenue), 0) AS gross
             FROM dashboard_order_mirror
             WHERE platform = "shopee" AND account_key = :account_key AND deleted_at IS NULL
               AND order_create_date BETWEEN :start_date AND :end_date'
        );
        $statement->execute([
            ':account_key' => $accountKey,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ]);
        $row = $statement->fetch();
        $gross = (float) ($row['gross'] ?? 0);
        return $gross > 0 ? max(0, min(0.5, (float) ($row['fees'] ?? 0) / $gross)) : 0;
    } catch (Throwable $error) {
        error_log('Ad View marketplace fee rate unavailable: ' . $error->getMessage());
        return 0;
    }
}

/** @param array<string, mixed> $payload @return array<string, mixed> */
function jgAdViewEnrich(PDO $pdo, array $payload, string $startDate, string $endDate): array
{
    $campaignRows = $pdo->query('SELECT account_key, campaign_id, alias_name, tags_json, unit_cogs_override, is_tracked FROM ad_view_campaigns')->fetchAll();
    $campaignLocal = [];
    foreach ($campaignRows as $row) {
        $key = (string) $row['account_key'] . ':' . (string) $row['campaign_id'];
        $campaignLocal[$key] = [
            'alias_name' => (string) $row['alias_name'],
            'tags' => json_decode((string) ($row['tags_json'] ?? '[]'), true) ?: [],
            'unit_cogs_override' => $row['unit_cogs_override'] === null ? null : (float) $row['unit_cogs_override'],
            'is_tracked' => (bool) $row['is_tracked'],
        ];
    }

    $eventStatement = $pdo->prepare(
        'SELECT id, account_key, campaign_id, event_at, event_type, title, note, before_value, after_value, tags_json
         FROM ad_view_events
         WHERE DATE(event_at) BETWEEN :start_date AND :end_date
         ORDER BY event_at DESC, id DESC'
    );
    $eventStatement->execute([':start_date' => $startDate, ':end_date' => $endDate]);
    $events = $eventStatement->fetchAll();
    foreach ($events as &$event) {
        $event['id'] = (int) $event['id'];
        $event['campaign_id'] = (string) $event['campaign_id'];
        $event['tags'] = json_decode((string) ($event['tags_json'] ?? '[]'), true) ?: [];
        unset($event['tags_json']);
    }
    unset($event);

    $accounts = is_array($payload['accounts'] ?? null) ? $payload['accounts'] : [];
    $allSellerSkus = [];
    foreach ($accounts as $account) {
        foreach (($account['campaigns'] ?? []) as $campaign) {
            $allSellerSkus = array_merge($allSellerSkus, is_array($campaign['seller_skus'] ?? null) ? $campaign['seller_skus'] : []);
        }
    }
    $skuPdo = null;
    try {
        $skuPdo = jg_sku_db();
    } catch (Throwable $error) {
        error_log('Ad View could not connect to SKU DB: ' . $error->getMessage());
    }
    $skuCostMap = $skuPdo instanceof PDO ? jgAdViewSkuCostMap($skuPdo, $allSellerSkus) : [];
    foreach ($accounts as &$account) {
        $accountKey = (string) ($account['account_key'] ?? '');
        $account['campaigns'] = array_values(array_filter(
            is_array($account['campaigns'] ?? null) ? $account['campaigns'] : [],
            static fn (array $campaign): bool => strtolower((string) ($campaign['campaign_status'] ?? '')) === 'ongoing'
        ));
        $liveCampaignIds = array_fill_keys(array_map(
            static fn (array $campaign): string => (string) ($campaign['campaign_id'] ?? ''),
            $account['campaigns']
        ), true);
        $account['metrics'] = array_values(array_filter(
            is_array($account['metrics'] ?? null) ? $account['metrics'] : [],
            static fn (array $metric): bool => isset($liveCampaignIds[(string) ($metric['campaign_id'] ?? '')])
        ));
        $accountSellerSkus = [];
        foreach ($account['campaigns'] as $campaign) {
            $accountSellerSkus = array_merge(
                $accountSellerSkus,
                is_array($campaign['seller_skus'] ?? null) ? $campaign['seller_skus'] : []
            );
        }
        $accountQuantitySkus = $accountSellerSkus;
        foreach ($accountSellerSkus as $sellerSku) {
            $normalizedSellerSku = jgAdViewSkuKey($sellerSku);
            if (isset($skuCostMap[$normalizedSellerSku]['sku'])) {
                $accountQuantitySkus[] = (string) $skuCostMap[$normalizedSellerSku]['sku'];
            }
        }
        $accountPurchasedQuantities = jgAdViewPurchasedSkuQuantities(
            $pdo,
            $accountKey,
            $startDate,
            $endDate,
            $accountQuantitySkus
        );
        foreach ($account['campaigns'] as &$campaign) {
            $local = $campaignLocal[$accountKey . ':' . (string) ($campaign['campaign_id'] ?? '')] ?? [];
            $campaign['alias_name'] = (string) ($local['alias_name'] ?? '');
            $campaign['tags'] = $local['tags'] ?? [];
            $campaign['is_tracked'] = (bool) ($local['is_tracked'] ?? false);
            $settings = is_array($campaign['settings'] ?? null) ? $campaign['settings'] : [];
            $common = is_array($settings['common_info'] ?? null) ? $settings['common_info'] : [];
            $sourceName = '';
            foreach ([$campaign['source_ad_name'] ?? '', $campaign['product_name'] ?? '', $common['ad_name'] ?? ''] as $candidate) {
                if (trim((string) $candidate) !== '') {
                    $sourceName = trim((string) $candidate);
                    break;
                }
            }
            $campaign['display_name'] = $campaign['alias_name'] ?: ($sourceName ?: 'Shopee Ad #' . (string) ($campaign['campaign_id'] ?? ''));

            $sellerSkus = array_values(array_unique(array_filter(array_map(
                static fn (mixed $sku): string => strtoupper(trim((string) $sku)),
                is_array($campaign['seller_skus'] ?? null) ? $campaign['seller_skus'] : []
            ))));
            $matched = [];
            foreach ($sellerSkus as $sellerSku) {
                if (isset($skuCostMap[$sellerSku])) {
                    $matched[] = $skuCostMap[$sellerSku];
                }
            }
            if ($skuPdo instanceof PDO && ($matched === [] || count($matched) < count($sellerSkus))) {
                $familyMatched = jgAdViewProductFamilyCosts($skuPdo, $campaign);
                $matchedBySku = [];
                foreach ($matched as $matchedRow) {
                    $matchedBySku[jgAdViewSkuKey($matchedRow['sku'] ?? '')] = $matchedRow;
                }
                foreach ($familyMatched as $matchedRow) {
                    $canonicalSku = jgAdViewSkuKey($matchedRow['sku'] ?? '');
                    if ($canonicalSku !== '' && !isset($matchedBySku[$canonicalSku])) {
                        $matchedBySku[$canonicalSku] = $matchedRow;
                    }
                }
                $matched = array_values($matchedBySku);
            }
            $override = $local['unit_cogs_override'] ?? null;
            $matchedCogs = array_values(array_filter(array_map(
                static fn (array $row): float => (float) ($row['cogs'] ?? 0),
                $matched
            ), static fn (float $value): bool => $value > 0));
            $weightedCost = 0.0;
            $weightedQuantity = 0.0;
            foreach ($matched as $matchedSku) {
                $sourceKey = jgAdViewSkuKey($matchedSku['source_key'] ?? $matchedSku['sku'] ?? '');
                $canonicalKey = jgAdViewSkuKey($matchedSku['sku'] ?? '');
                $quantity = (float) ($accountPurchasedQuantities[$sourceKey]
                    ?? $accountPurchasedQuantities[$canonicalKey]
                    ?? 0);
                if ($quantity <= 0 || (float) ($matchedSku['cogs'] ?? 0) <= 0) {
                    continue;
                }
                $weightedCost += (float) $matchedSku['cogs'] * $quantity;
                $weightedQuantity += $quantity;
            }
            $unitCogs = $override !== null
                ? (float) $override
                : ($weightedQuantity > 0
                    ? $weightedCost / $weightedQuantity
                    : ($matchedCogs !== [] ? array_sum($matchedCogs) / count($matchedCogs) : null));
            $matchedBy = array_values(array_unique(array_map(
                static fn (array $row): string => (string) ($row['matched_by'] ?? 'sku'),
                $matched
            )));
            $campaign['economics'] = [
                'unit_cogs' => $unitCogs,
                'unit_cogs_source' => $override !== null
                    ? 'manual_override'
                    : ($weightedQuantity > 0
                        ? 'sku_db_purchased_mix'
                        : ($matchedCogs !== []
                            ? (in_array('product_family', $matchedBy, true) ? 'sku_db_product_family' : 'sku_db_average')
                            : 'unlinked')),
                'unit_cogs_override' => $override,
                'matched_skus' => array_values(array_unique(array_map(static fn (array $row): string => (string) $row['sku'], $matched))),
                'matched_by' => $matchedBy,
                'seller_skus' => $sellerSkus,
                'sku_coverage' => $sellerSkus !== [] ? min(1, count($matched) / count($sellerSkus)) : 0,
                'purchased_mix_quantity' => $weightedQuantity,
            ];
        }
        unset($campaign);
        $account['company'] = JG_AD_VIEW_ACCOUNTS[$accountKey] ?? $accountKey;
        $account['marketplace_fee_rate'] = jgAdViewMarketplaceFeeRate($pdo, $accountKey, $startDate, $endDate);
        $budgetMonth = substr($endDate, 0, 7);
        $budgetStatement = $pdo->prepare('SELECT monthly_budget FROM ad_view_budgets WHERE account_key = :account_key AND budget_month = :budget_month');
        $budgetStatement->execute([':account_key' => $accountKey, ':budget_month' => $budgetMonth]);
        $account['internal_monthly_budget'] = (float) ($budgetStatement->fetchColumn() ?: 0);
    }
    unset($account);

    $payload['accounts'] = $accounts;
    $payload['events'] = $events;
    $payload['account_options'] = array_map(
        static fn (string $label, string $key): array => ['key' => $key, 'label' => $label],
        JG_AD_VIEW_ACCOUNTS,
        array_keys(JG_AD_VIEW_ACCOUNTS)
    );
    return $payload;
}

function jgAdViewHandle(): void
{
    $pdo = analyticsDb();
    jgAdViewEnsureSchema($pdo);
    $timezone = new DateTimeZone('Asia/Jakarta');
    $today = new DateTimeImmutable('today', $timezone);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

    if ($method === 'POST') {
        $body = jgAdViewJsonBody();
        $action = strtolower(trim((string) ($body['action'] ?? '')));
        if ($action === 'track_campaign') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $campaignId = (int) ($body['campaign_id'] ?? 0);
            $alias = trim((string) ($body['alias_name'] ?? ''));
            if ($campaignId <= 0) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_campaign_id'], 422);
            }
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_campaigns (account_key, campaign_id, alias_name, is_tracked)
                 VALUES (:account_key, :campaign_id, :alias_name, 1)
                 ON DUPLICATE KEY UPDATE alias_name = VALUES(alias_name), is_tracked = 1, updated_at = UTC_TIMESTAMP()'
            );
            $statement->execute([':account_key' => $account, ':campaign_id' => $campaignId, ':alias_name' => substr($alias, 0, 180)]);
            $startDate = jgAdViewDate($body['start_date'] ?? '', $today->format('Y-m-d'));
            $endDate = jgAdViewDate($body['end_date'] ?? '', $today->format('Y-m-d'));
            $payload = jgAdViewUpstream('/ads/sync', [
                'account' => $account,
                'campaign_ids' => (string) $campaignId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
            analyticsJsonResponse(jgAdViewEnrich($pdo, $payload, $startDate, $endDate));
        }
        if ($action === 'save_campaign') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $campaignId = (int) ($body['campaign_id'] ?? 0);
            if ($campaignId <= 0) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_campaign_id'], 422);
            }
            $tags = array_values(array_unique(array_filter(array_map('strval', is_array($body['tags'] ?? null) ? $body['tags'] : []))));
            $cogsInput = $body['unit_cogs_override'] ?? null;
            $unitCogsOverride = $cogsInput === null || $cogsInput === '' ? null : max(0, (float) $cogsInput);
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_campaigns (account_key, campaign_id, alias_name, tags_json, unit_cogs_override, is_tracked)
                 VALUES (:account_key, :campaign_id, :alias_name, :tags_json, :unit_cogs_override, 1)
                 ON DUPLICATE KEY UPDATE alias_name = VALUES(alias_name), tags_json = VALUES(tags_json),
                    unit_cogs_override = VALUES(unit_cogs_override), is_tracked = 1, updated_at = UTC_TIMESTAMP()'
            );
            $statement->execute([
                ':account_key' => $account,
                ':campaign_id' => $campaignId,
                ':alias_name' => substr(trim((string) ($body['alias_name'] ?? '')), 0, 180),
                ':tags_json' => json_encode(array_slice($tags, 0, 20), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                ':unit_cogs_override' => $unitCogsOverride,
            ]);
            analyticsJsonResponse(['ok' => true]);
        }
        if ($action === 'add_event') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $campaignId = (int) ($body['campaign_id'] ?? 0);
            $title = trim((string) ($body['title'] ?? ''));
            $eventAt = trim((string) ($body['event_at'] ?? ''));
            $eventDate = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $eventAt, $timezone);
            if ($campaignId <= 0 || $title === '' || !$eventDate) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_ad_event'], 422);
            }
            $tags = array_values(array_unique(array_filter(array_map('strval', is_array($body['tags'] ?? null) ? $body['tags'] : []))));
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_events (account_key, campaign_id, event_at, event_type, title, note, before_value, after_value, tags_json)
                 VALUES (:account_key, :campaign_id, :event_at, :event_type, :title, :note, :before_value, :after_value, :tags_json)'
            );
            $statement->execute([
                ':account_key' => $account,
                ':campaign_id' => $campaignId,
                ':event_at' => $eventDate->format('Y-m-d H:i:s'),
                ':event_type' => substr(trim((string) ($body['event_type'] ?? 'note')), 0, 60),
                ':title' => substr($title, 0, 180),
                ':note' => trim((string) ($body['note'] ?? '')),
                ':before_value' => substr(trim((string) ($body['before_value'] ?? '')), 0, 120),
                ':after_value' => substr(trim((string) ($body['after_value'] ?? '')), 0, 120),
                ':tags_json' => json_encode(array_slice($tags, 0, 20), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
            analyticsJsonResponse(['ok' => true, 'event_id' => (int) $pdo->lastInsertId()]);
        }
        if ($action === 'delete_event') {
            $statement = $pdo->prepare('DELETE FROM ad_view_events WHERE id = :id');
            $statement->execute([':id' => max(0, (int) ($body['event_id'] ?? 0))]);
            analyticsJsonResponse(['ok' => true]);
        }
        if ($action === 'set_budget') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $month = trim((string) ($body['budget_month'] ?? ''));
            if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_budget_month'], 422);
            }
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_budgets (account_key, budget_month, monthly_budget)
                 VALUES (:account_key, :budget_month, :monthly_budget)
                 ON DUPLICATE KEY UPDATE monthly_budget = VALUES(monthly_budget), updated_at = UTC_TIMESTAMP()'
            );
            $statement->execute([
                ':account_key' => $account,
                ':budget_month' => $month,
                ':monthly_budget' => max(0, (float) ($body['monthly_budget'] ?? 0)),
            ]);
            analyticsJsonResponse(['ok' => true]);
        }
        if ($action !== 'sync') {
            analyticsJsonResponse(['ok' => false, 'error' => 'unknown_ad_view_action'], 422);
        }
        $account = jgAdViewAccount($body['account_key'] ?? 'all');
        $startDate = jgAdViewDate($body['start_date'] ?? '', $today->format('Y-m-d'));
        $endDate = jgAdViewDate($body['end_date'] ?? '', $today->format('Y-m-d'));
        $payload = jgAdViewUpstream('/ads/sync', ['account' => $account, 'start_date' => $startDate, 'end_date' => $endDate]);
        analyticsJsonResponse(jgAdViewEnrich($pdo, $payload, $startDate, $endDate));
    }

    $account = jgAdViewAccount($_GET['account'] ?? 'all');
    $startDate = jgAdViewDate($_GET['start_date'] ?? '', $today->format('Y-m-d'));
    $endDate = jgAdViewDate($_GET['end_date'] ?? '', $today->format('Y-m-d'));
    $payload = jgAdViewUpstream('/ads/summary', ['account' => $account, 'start_date' => $startDate, 'end_date' => $endDate]);
    analyticsJsonResponse(jgAdViewEnrich($pdo, $payload, $startDate, $endDate));
}
