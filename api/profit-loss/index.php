<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require_once dirname(__DIR__, 2) . '/profit-loss-bootstrap.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

function jg_profit_loss_body(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode(is_string($raw) ? $raw : '', true);
    return is_array($decoded) ? $decoded : [];
}

function jg_profit_loss_year(mixed $value): int
{
    $year = (int) $value;
    if ($year < 2024 || $year > 2100) {
        jg_profit_loss_json(['ok' => false, 'error' => 'invalid_year'], 422);
    }
    return $year;
}

function jg_profit_loss_month(mixed $value): int
{
    $month = (int) $value;
    if ($month < 1 || $month > 12) {
        jg_profit_loss_json(['ok' => false, 'error' => 'invalid_month'], 422);
    }
    return $month;
}

function jg_profit_loss_amount(mixed $value, bool $nullable = false): ?float
{
    if ($nullable && ($value === null || $value === '')) {
        return null;
    }
    if (!is_numeric($value)) {
        jg_profit_loss_json(['ok' => false, 'error' => 'invalid_amount'], 422);
    }
    return round((float) $value, 2);
}

function jg_profit_loss_bool(mixed $value): bool
{
    return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
}

function jg_profit_loss_volume(mixed $value): ?float
{
    if ($value === null || $value === '') {
        return null;
    }
    if (!is_numeric($value)) {
        jg_profit_loss_json(['ok' => false, 'error' => 'invalid_volume'], 422);
    }
    $volume = round((float) $value, 1);
    if ($volume < 0 || $volume > 9999.9) {
        jg_profit_loss_json(['ok' => false, 'error' => 'invalid_volume'], 422);
    }
    return $volume;
}

function jg_profit_loss_text(mixed $value, int $max): string
{
    return mb_substr(trim(preg_replace('/\s+/', ' ', (string) $value) ?? ''), 0, $max);
}

function jg_profit_loss_sku_codes(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $codes = [];
    foreach ($value as $item) {
        $sku = strtoupper(jg_profit_loss_text($item, 160));
        if ($sku !== '') {
            $codes[$sku] = true;
        }
    }
    return array_keys($codes);
}

function jg_profit_loss_metric_key(string $label, int $index): string
{
    $slug = strtolower(trim($label));
    $slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? '';
    $slug = trim($slug, '_');
    if ($slug === '') {
        $slug = 'metric';
    }
    return mb_substr('custom_' . $slug . '_' . $index . '_' . bin2hex(random_bytes(3)), 0, 64);
}

function jg_profit_loss_card_key(mixed $value, string $label, int $index): string
{
    $key = strtolower(trim((string) $value));
    $key = preg_replace('/[^a-z0-9_:-]+/', '_', $key) ?? '';
    $key = trim($key, '_:-');
    if ($key === '') {
        $slug = strtolower(trim($label));
        $slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? '';
        $slug = trim($slug, '_');
        $key = ($slug !== '' ? $slug : 'card') . '_' . $index . '_' . bin2hex(random_bytes(3));
    }
    return mb_substr($key, 0, 120);
}

function jg_profit_loss_allowed_metric_value_keys(): array
{
    return [
        'units', 'netRevenue', 'grossRevenue', 'marketplaceFees', 'income', 'revenue',
        'averagePrice', 'cogs', 'averageCogs', 'grossProfit', 'grossProfitPerUnit',
        'grossMargin', 'administration', 'administrationPerUnit', 'administrationRate',
        'marketing', 'marketingPerUnit', 'marketingRate',
        'other', 'netProfit', 'netProfitPerUnit', 'netMargin',
    ];
}

try {
    $pdo = analyticsDb();
    jg_profit_loss_ensure_schema($pdo);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $body = $method === 'GET' ? [] : jg_profit_loss_body();
    $year = jg_profit_loss_year($body['year'] ?? $_GET['year'] ?? gmdate('Y'));

    if ($method === 'GET') {
        $skuStmt = $pdo->prepare(
            'SELECT year, month, sku, cogs_override, packaging_per_unit, labor_per_unit,
                    other_per_unit, notes, updated_at
             FROM profit_loss_sku_inputs WHERE year = :year
             ORDER BY sku, month'
        );
        $skuStmt->execute([':year' => $year]);

        $entryStmt = $pdo->prepare(
            'SELECT id, year, month, section, label, amount, notes, created_at, updated_at
             FROM profit_loss_entries WHERE year = :year
             ORDER BY month, section, label, id'
        );
        $entryStmt->execute([':year' => $year]);

        $skus = [];
        try {
            $skuPdo = jg_sku_db();
            $productNames = [];
            $namePath = dirname(__DIR__, 2) . '/sku-product-names.json';
            if (is_file($namePath)) {
                $decodedNames = json_decode((string) file_get_contents($namePath), true);
                $productNames = is_array($decodedNames) ? $decodedNames : [];
            }
            $catalogStmt = $skuPdo->query(
                'SELECT s.sku, s.tag, s.cogs, s.brand_id, b.name AS brand_name,
                        p.name AS product_name, f.name AS flavor_name,
                        u.name AS unit_name, s.volume
                 FROM sku_skus s
                 INNER JOIN sku_brands b ON b.id = s.brand_id
                 INNER JOIN sku_products p ON p.id = s.product_id
                 INNER JOIN sku_flavors f ON f.id = s.flavor_id
                 INNER JOIN sku_units u ON u.id = s.unit_id
                 ORDER BY b.name, p.name, f.name, s.volume'
            );
            $historyStmt = $skuPdo->query(
                'SELECT sku, old_price, new_price, takes_place, recorded_at
                 FROM sku_cogs_history
                 ORDER BY sku, recorded_at, id'
            );
            $historyBySku = [];
            foreach ($historyStmt->fetchAll() as $historyRow) {
                $historyBySku[(string) ($historyRow['sku'] ?? '')][] = [
                    'old_price' => $historyRow['old_price'] === null ? null : (float) $historyRow['old_price'],
                    'new_price' => (float) ($historyRow['new_price'] ?? 0),
                    'takes_place' => (string) ($historyRow['takes_place'] ?? ''),
                    'recorded_at' => (string) ($historyRow['recorded_at'] ?? ''),
                ];
            }
            foreach ($catalogStmt->fetchAll() as $row) {
                $sku = (string) ($row['sku'] ?? '');
                $row['product_name'] = trim((string) ($productNames[$sku] ?? '')) ?: (string) ($row['product_name'] ?? '');
                $row['cogs'] = (float) ($row['cogs'] ?? 0);
                $row['volume'] = (float) ($row['volume'] ?? 0);
                $row['cogs_history'] = $historyBySku[$sku] ?? [];
                $skus[] = $row;
            }
        } catch (Throwable $error) {
            $catalogError = $error->getMessage();
        }

        jg_profit_loss_json([
            'ok' => true,
            'year' => $year,
            'sku_catalog' => $skus,
            'sku_catalog_error' => $catalogError ?? '',
            'sku_inputs' => $skuStmt->fetchAll(),
            'entries' => $entryStmt->fetchAll(),
            'settings' => jg_profit_loss_settings($pdo, $year),
            'syrup_groups' => jg_profit_loss_syrup_groups($pdo),
            'product_cards' => jg_profit_loss_product_cards($pdo),
            'statement_metrics' => jg_profit_loss_statement_metrics($pdo),
            'default_entries' => jg_profit_loss_default_entries(),
            'legacy' => jg_profit_loss_legacy_year($year),
        ]);
    }

    $action = strtolower((string) ($body['action'] ?? ''));
    if ($action === 'save_sku_input') {
        $month = jg_profit_loss_month($body['month'] ?? 0);
        $sku = strtoupper(jg_profit_loss_text($body['sku'] ?? '', 160));
        if ($sku === '') {
            jg_profit_loss_json(['ok' => false, 'error' => 'missing_sku'], 422);
        }
        $stmt = $pdo->prepare(
            'INSERT INTO profit_loss_sku_inputs
                (year, month, sku, cogs_override, packaging_per_unit, labor_per_unit,
                 other_per_unit, notes, updated_at)
             VALUES
                (:year, :month, :sku, :cogs_override, :packaging, :labor, :other, :notes, UTC_TIMESTAMP(6))
             ON DUPLICATE KEY UPDATE
                cogs_override = VALUES(cogs_override),
                packaging_per_unit = VALUES(packaging_per_unit),
                labor_per_unit = VALUES(labor_per_unit),
                other_per_unit = VALUES(other_per_unit),
                notes = VALUES(notes),
                updated_at = VALUES(updated_at)'
        );
        $stmt->execute([
            ':year' => $year,
            ':month' => $month,
            ':sku' => $sku,
            ':cogs_override' => jg_profit_loss_amount($body['cogs_override'] ?? null, true),
            ':packaging' => jg_profit_loss_amount($body['packaging_per_unit'] ?? 0),
            ':labor' => jg_profit_loss_amount($body['labor_per_unit'] ?? 0),
            ':other' => jg_profit_loss_amount($body['other_per_unit'] ?? 0),
            ':notes' => jg_profit_loss_text($body['notes'] ?? '', 500),
        ]);
        jg_profit_loss_json(['ok' => true]);
    }

    if ($action === 'save_entry') {
        $month = jg_profit_loss_month($body['month'] ?? 0);
        $section = strtolower(jg_profit_loss_text($body['section'] ?? '', 24));
        if (!in_array($section, ['income', 'administration', 'marketing', 'other'], true)) {
            jg_profit_loss_json(['ok' => false, 'error' => 'invalid_section'], 422);
        }
        $label = jg_profit_loss_text($body['label'] ?? '', 120);
        if ($label === '') {
            jg_profit_loss_json(['ok' => false, 'error' => 'missing_label'], 422);
        }
        $id = max(0, (int) ($body['id'] ?? 0));
        if ($id > 0) {
            $stmt = $pdo->prepare(
                'UPDATE profit_loss_entries
                 SET month = :month, section = :section, label = :label,
                     amount = :amount, notes = :notes, updated_at = UTC_TIMESTAMP(6)
                 WHERE id = :id AND year = :year'
            );
            $stmt->execute([
                ':month' => $month, ':section' => $section, ':label' => $label,
                ':amount' => jg_profit_loss_amount($body['amount'] ?? 0),
                ':notes' => jg_profit_loss_text($body['notes'] ?? '', 500),
                ':id' => $id, ':year' => $year,
            ]);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO profit_loss_entries
                    (year, month, section, label, amount, notes, created_at, updated_at)
                 VALUES
                    (:year, :month, :section, :label, :amount, :notes, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))'
            );
            $stmt->execute([
                ':year' => $year, ':month' => $month, ':section' => $section, ':label' => $label,
                ':amount' => jg_profit_loss_amount($body['amount'] ?? 0),
                ':notes' => jg_profit_loss_text($body['notes'] ?? '', 500),
            ]);
            $id = (int) $pdo->lastInsertId();
        }
        jg_profit_loss_json(['ok' => true, 'id' => $id]);
    }

    if ($action === 'delete_entry') {
        $stmt = $pdo->prepare('DELETE FROM profit_loss_entries WHERE id = :id AND year = :year');
        $stmt->execute([':id' => max(0, (int) ($body['id'] ?? 0)), ':year' => $year]);
        jg_profit_loss_json(['ok' => true]);
    }

    if ($action === 'save_settings') {
        $fields = [
            'reinvest_pct', 'offering_pct', 'ownership_pct', 'director_pct',
            'bng_loan_pct', 'commissioner_pct', 'advisor_pct',
        ];
        $values = [];
        foreach ($fields as $field) {
            $values[$field] = max(0, min(100, (float) jg_profit_loss_amount($body[$field] ?? 0)));
        }
        $stmt = $pdo->prepare(
            'INSERT INTO profit_loss_settings
                (year, reinvest_pct, offering_pct, ownership_pct, director_pct,
                 bng_loan_pct, commissioner_pct, advisor_pct, updated_at)
             VALUES
                (:year, :reinvest_pct, :offering_pct, :ownership_pct, :director_pct,
                 :bng_loan_pct, :commissioner_pct, :advisor_pct, UTC_TIMESTAMP(6))
             ON DUPLICATE KEY UPDATE
                reinvest_pct = VALUES(reinvest_pct), offering_pct = VALUES(offering_pct),
                ownership_pct = VALUES(ownership_pct), director_pct = VALUES(director_pct),
                bng_loan_pct = VALUES(bng_loan_pct), commissioner_pct = VALUES(commissioner_pct),
                advisor_pct = VALUES(advisor_pct), updated_at = VALUES(updated_at)'
        );
        $stmt->execute([':year' => $year] + array_combine(
            array_map(static fn (string $field): string => ':' . $field, $fields),
            array_values($values)
        ));
        jg_profit_loss_json(['ok' => true, 'settings' => jg_profit_loss_settings($pdo, $year)]);
    }

    if ($action === 'save_syrup_groups') {
        $groups = $body['groups'] ?? [];
        if (!is_array($groups)) {
            jg_profit_loss_json(['ok' => false, 'error' => 'invalid_syrup_groups'], 422);
        }

        $pdo->beginTransaction();
        try {
            $insertStmt = $pdo->prepare(
                'INSERT INTO profit_loss_syrup_groups
                    (label, volume_ml, assignment_mode, sku_codes_json, is_visible, sort_order, created_at, updated_at)
                 VALUES
                    (:label, :volume_ml, :assignment_mode, :sku_codes_json, :is_visible, :sort_order, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))'
            );
            $updateStmt = $pdo->prepare(
                'UPDATE profit_loss_syrup_groups
                 SET label = :label, volume_ml = :volume_ml, assignment_mode = :assignment_mode,
                     sku_codes_json = :sku_codes_json, is_visible = :is_visible,
                     sort_order = :sort_order, updated_at = UTC_TIMESTAMP(6)
                 WHERE id = :id'
            );
            foreach (array_values($groups) as $index => $group) {
                if (!is_array($group)) {
                    continue;
                }
                $label = jg_profit_loss_text($group['label'] ?? '', 80);
                if ($label === '') {
                    jg_profit_loss_json(['ok' => false, 'error' => 'missing_syrup_group_label'], 422);
                }
                $assignmentMode = strtolower(jg_profit_loss_text($group['assignment_mode'] ?? 'auto', 16));
                if (!in_array($assignmentMode, ['auto', 'manual'], true)) {
                    $assignmentMode = 'auto';
                }
                $values = [
                    ':label' => $label,
                    ':volume_ml' => jg_profit_loss_volume($group['volume_ml'] ?? null),
                    ':assignment_mode' => $assignmentMode,
                    ':sku_codes_json' => json_encode(jg_profit_loss_sku_codes($group['sku_codes'] ?? []), JSON_UNESCAPED_SLASHES),
                    ':is_visible' => jg_profit_loss_bool($group['is_visible'] ?? null) ? 1 : 0,
                    ':sort_order' => ($index + 1) * 10,
                ];
                $id = max(0, (int) ($group['id'] ?? 0));
                if ($id > 0) {
                    $updateStmt->execute($values + [':id' => $id]);
                } else {
                    $insertStmt->execute($values);
                }
            }
            $pdo->commit();
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }

        jg_profit_loss_json(['ok' => true, 'syrup_groups' => jg_profit_loss_syrup_groups($pdo)]);
    }

    if ($action === 'save_product_cards') {
        $cards = $body['cards'] ?? [];
        if (!is_array($cards)) {
            jg_profit_loss_json(['ok' => false, 'error' => 'invalid_product_cards'], 422);
        }
        $allowedMatchModes = ['auto_syrup', 'auto_product', 'manual', 'legacy'];
        $allowedVariantModes = ['auto', 'volume', 'flavor', 'sku'];

        $pdo->beginTransaction();
        try {
            $insertStmt = $pdo->prepare(
                'INSERT INTO profit_loss_product_cards
                    (card_key, label, match_mode, match_value, variant_mode, sku_codes_json,
                     is_visible, sort_order, created_at, updated_at)
                 VALUES
                    (:card_key, :label, :match_mode, :match_value, :variant_mode, :sku_codes_json,
                     :is_visible, :sort_order, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
                 ON DUPLICATE KEY UPDATE
                    label = VALUES(label), match_mode = VALUES(match_mode),
                    match_value = VALUES(match_value), variant_mode = VALUES(variant_mode),
                    sku_codes_json = VALUES(sku_codes_json), is_visible = VALUES(is_visible),
                    sort_order = VALUES(sort_order), updated_at = VALUES(updated_at)'
            );
            $updateStmt = $pdo->prepare(
                'UPDATE profit_loss_product_cards
                 SET card_key = :card_key, label = :label, match_mode = :match_mode,
                     match_value = :match_value, variant_mode = :variant_mode,
                     sku_codes_json = :sku_codes_json, is_visible = :is_visible,
                     sort_order = :sort_order, updated_at = UTC_TIMESTAMP(6)
                 WHERE id = :id'
            );
            foreach (array_values($cards) as $index => $card) {
                if (!is_array($card)) {
                    continue;
                }
                $label = jg_profit_loss_text($card['label'] ?? '', 120);
                if ($label === '') {
                    jg_profit_loss_json(['ok' => false, 'error' => 'missing_product_card_label'], 422);
                }
                $matchMode = strtolower(jg_profit_loss_text($card['match_mode'] ?? 'manual', 24));
                if (!in_array($matchMode, $allowedMatchModes, true)) {
                    $matchMode = 'manual';
                }
                $variantMode = strtolower(jg_profit_loss_text($card['variant_mode'] ?? 'auto', 24));
                if (!in_array($variantMode, $allowedVariantModes, true)) {
                    $variantMode = 'auto';
                }
                $values = [
                    ':card_key' => jg_profit_loss_card_key($card['card_key'] ?? '', $label, $index + 1),
                    ':label' => $label,
                    ':match_mode' => $matchMode,
                    ':match_value' => jg_profit_loss_text($card['match_value'] ?? '', 180),
                    ':variant_mode' => $variantMode,
                    ':sku_codes_json' => json_encode(jg_profit_loss_sku_codes($card['sku_codes'] ?? []), JSON_UNESCAPED_SLASHES),
                    ':is_visible' => jg_profit_loss_bool($card['is_visible'] ?? null) ? 1 : 0,
                    ':sort_order' => ($index + 1) * 10,
                ];
                $id = max(0, (int) ($card['id'] ?? 0));
                if ($id > 0) {
                    $updateStmt->execute($values + [':id' => $id]);
                } else {
                    $insertStmt->execute($values);
                }
            }
            $pdo->commit();
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }

        jg_profit_loss_json(['ok' => true, 'product_cards' => jg_profit_loss_product_cards($pdo)]);
    }

    if ($action === 'save_statement_metrics') {
        $metrics = $body['metrics'] ?? [];
        if (!is_array($metrics)) {
            jg_profit_loss_json(['ok' => false, 'error' => 'invalid_statement_metrics'], 422);
        }
        $allowedValueKeys = jg_profit_loss_allowed_metric_value_keys();
        $allowedFormats = ['money', 'integer', 'percent'];

        $pdo->beginTransaction();
        try {
            $insertStmt = $pdo->prepare(
                'INSERT INTO profit_loss_statement_metrics
                    (metric_key, label, value_key, display_format, is_visible, sort_order, created_at, updated_at)
                 VALUES
                    (:metric_key, :label, :value_key, :display_format, :is_visible, :sort_order, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))'
            );
            $updateStmt = $pdo->prepare(
                'UPDATE profit_loss_statement_metrics
                 SET label = :label, value_key = :value_key, display_format = :display_format,
                     is_visible = :is_visible, sort_order = :sort_order, updated_at = UTC_TIMESTAMP(6)
                 WHERE id = :id'
            );
            foreach (array_values($metrics) as $index => $metric) {
                if (!is_array($metric)) {
                    continue;
                }
                $label = jg_profit_loss_text($metric['label'] ?? '', 120);
                if ($label === '') {
                    jg_profit_loss_json(['ok' => false, 'error' => 'missing_metric_label'], 422);
                }
                $valueKey = jg_profit_loss_text($metric['value_key'] ?? '', 64);
                if (!in_array($valueKey, $allowedValueKeys, true)) {
                    jg_profit_loss_json(['ok' => false, 'error' => 'invalid_metric_value'], 422);
                }
                $format = strtolower(jg_profit_loss_text($metric['display_format'] ?? 'money', 16));
                if (!in_array($format, $allowedFormats, true)) {
                    $format = 'money';
                }
                $values = [
                    ':label' => $label,
                    ':value_key' => $valueKey,
                    ':display_format' => $format,
                    ':is_visible' => jg_profit_loss_bool($metric['is_visible'] ?? null) ? 1 : 0,
                    ':sort_order' => ($index + 1) * 10,
                ];
                $id = max(0, (int) ($metric['id'] ?? 0));
                if ($id > 0) {
                    $updateStmt->execute($values + [':id' => $id]);
                } else {
                    $insertStmt->execute($values + [
                        ':metric_key' => jg_profit_loss_metric_key($label, $index + 1),
                    ]);
                }
            }
            $pdo->commit();
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }

        jg_profit_loss_json(['ok' => true, 'statement_metrics' => jg_profit_loss_statement_metrics($pdo)]);
    }

    jg_profit_loss_json(['ok' => false, 'error' => 'unknown_action'], 400);
} catch (Throwable $error) {
    jg_profit_loss_json([
        'ok' => false,
        'error' => 'profit_loss_unavailable',
        'details' => $error->getMessage(),
    ], 500);
}
