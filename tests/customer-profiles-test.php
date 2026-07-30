<?php
declare(strict_types=1);

require dirname(__DIR__) . '/customer-profiles-bootstrap.php';

function customer_profile_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

customer_profile_expect('6281234567890', jg_customer_profiles_normalize_phone('0812-3456-7890'), 'Indonesian local phones must normalize to country-code form.');
customer_profile_expect('walk_in', jg_customer_profiles_channel('walk-in'), 'Walk-in variants must share one channel key.');
customer_profile_expect('', jg_customer_profiles_identity(['channel' => 'walk_in', 'customer_name' => 'Walk-in customer'])['key'], 'Generic counter labels must not collapse unrelated customers.');

$rows = [
    ['channel' => 'shopee', 'order_id' => 'S-1', 'occurred_at' => '2026-01-02 08:00:00', 'customer_name' => 'Ayu', 'phone' => '0812 3456 7890', 'revenue' => 30000, 'quantity' => 1, 'product_name' => 'Lemon Drops'],
    ['channel' => 'shopee', 'order_id' => 'S-1', 'occurred_at' => '2026-01-02 08:00:00', 'customer_name' => 'Ayu', 'phone' => '0812 3456 7890', 'revenue' => 20000, 'quantity' => 1, 'product_name' => 'Mint Drops'],
    ['channel' => 'whatsapp', 'order_id' => 'W-1', 'occurred_at' => '2026-03-03 08:00:00', 'customer_name' => 'Ayu W.', 'phone' => '+62 812-3456-7890', 'revenue' => 60000, 'quantity' => 2, 'product_name' => 'Lemon Drops'],
    ['channel' => 'walk-in', 'order_id' => 'C-1', 'occurred_at' => '2026-07-01 08:00:00', 'customer_name' => 'Budi', 'phone' => '', 'revenue' => 25000, 'quantity' => 1, 'product_name' => 'Jamu'],
    ['channel' => 'walk_in', 'order_id' => 'C-2', 'occurred_at' => '2026-07-20 08:00:00', 'customer_name' => 'Budi', 'phone' => '', 'revenue' => 25000, 'quantity' => 1, 'product_name' => 'Jamu'],
    ['channel' => 'whatsapp', 'order_id' => 'W-2', 'occurred_at' => '2026-07-21 08:00:00', 'customer_name' => 'Budi', 'phone' => '', 'revenue' => 25000, 'quantity' => 1, 'product_name' => 'Jamu'],
    ['channel' => 'tiktok', 'order_id' => 'T-1', 'occurred_at' => '2026-07-22 08:00:00', 'customer_name' => '', 'phone' => '', 'revenue' => 12000, 'quantity' => 1, 'product_name' => 'Drops'],
];

$payload = jg_customer_profiles_build($rows, new DateTimeImmutable('2026-07-30 00:00:00 UTC'));
customer_profile_expect(3, $payload['summary']['customers'], 'Phone-linked Ayu plus channel-scoped Budi profiles should create three customers.');
customer_profile_expect(2, $payload['summary']['repeat_customers'], 'Ayu and walk-in Budi should be repeat customers.');
customer_profile_expect(1, $payload['summary']['cross_channel_customers'], 'Only Ayu should link across channels.');
customer_profile_expect(1, $payload['summary']['unattributed_orders'], 'The order without a phone or name should remain unattributed.');

$ayu = array_values(array_filter($payload['profiles'], static fn (array $profile): bool => $profile['phone'] === '6281234567890'))[0] ?? [];
customer_profile_expect(2, $ayu['orders'] ?? 0, 'Two line items from the same Shopee order must collapse before counting repeat orders.');
customer_profile_expect(110000.0, $ayu['revenue'] ?? 0, 'Cross-channel profile revenue must sum order-line revenue once.');
customer_profile_expect('returning', $ayu['segment'] ?? '', 'Two orders must be classified as Returning.');
customer_profile_expect(2, count($ayu['channels'] ?? []), 'Phone matching must preserve both contributing channels.');

echo "customer profiles tests passed\n";
