<?php
declare(strict_types=1);

function class_b_migration_expect(bool $condition, string $message): void
{
    if ($condition) return;
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

$profiles = (string) file_get_contents(dirname(__DIR__) . '/partner-db-bootstrap.php');
class_b_migration_expect(str_contains($profiles, 'LOWER(TRIM(name)) IN ("baggos", "baggos media", "orezz")'), 'Baggos and Orezz must migrate explicitly to Class A.');
class_b_migration_expect(str_contains($profiles, 'partner_class CHAR(1) NOT NULL DEFAULT "B"'), 'Every other current partner must default to Class B.');
class_b_migration_expect(!str_contains($profiles, 'DELETE FROM partner_weekly_bills'), 'Partner classification must not delete historical bills.');
class_b_migration_expect(!str_contains($profiles, 'DELETE FROM partner_weekly_bill_items'), 'Partner classification must not delete historical bill items.');
class_b_migration_expect(!str_contains($profiles, 'DELETE FROM partner_weekly_bill_payments'), 'Partner classification must not delete historical payment proofs.');
class_b_migration_expect(!str_contains($profiles, 'DELETE FROM partner_weekly_bill_disputes'), 'Partner classification must not delete historical disputes.');

$billing = (string) file_get_contents(dirname(__DIR__) . '/partner-billing-bootstrap.php');
class_b_migration_expect(str_contains($billing, 'COALESCE(order_type, "class_a_dropship") <> "class_b_stock"'), 'Prepaid orders must be excluded from post-sale billing.');
$stock = (string) file_get_contents(dirname(__DIR__) . '/partner-stock-bootstrap.php');
class_b_migration_expect(str_contains($stock, 'UPDATE partner_orders SET status="IS_LISTED",executive_status="shipment_arranged"'), 'Store Ops handoff must occur only after shipment arrangement.');
class_b_migration_expect(str_contains($stock, 'file_data'), 'Executive shipping labels must be retained privately in shared storage.');
class_b_migration_expect(str_contains($stock, "api/label-file/?order_id="), 'Database labels must keep a Store Ops-compatible Partner Portal URL.');
class_b_migration_expect(str_contains($stock, '"executive",NULL,UTC_TIMESTAMP()'), 'Class B shipping labels must remain available in order history.');

echo "Partner Class B migration tests passed.\n";
