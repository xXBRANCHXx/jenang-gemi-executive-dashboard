<?php
declare(strict_types=1);

putenv('JG_ZERO_COMMERCE_MODE=sandbox');
putenv('JG_ZERO_COMMERCE_SIGNING_SECRET=zero-commerce-test-secret-that-is-long-enough');
putenv('JG_ZERO_SHIPPING_WEIGHTS_JSON={"250ml":480,"550ml":900}');
putenv('JG_BITESHIP_WEBHOOK_HEADER=X-Zero-Webhook-Secret');
putenv('JG_BITESHIP_WEBHOOK_SECRET=zero-test-secret');

require_once dirname(__DIR__) . '/zero-commerce-bootstrap.php';

function zero_commerce_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message . ' Expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

$items = [
    [
        'item_key' => 'syrup:plain:250ml',
        'sku' => 'ZEROSYRP001',
        'product_name' => 'ZERO Syrup',
        'option_name' => 'Plain',
        'size_label' => '250ml',
        'quantity' => 2,
        'unit_net_price' => 39000.0,
    ],
    [
        'item_key' => 'maple:classic:550ml',
        'sku' => 'ZEROMAPL001',
        'product_name' => 'ZERO Maple Topping',
        'option_name' => 'Classic',
        'size_label' => '550ml',
        'quantity' => 1,
        'unit_net_price' => 149000.0,
    ],
];

zero_commerce_expect(227000, jg_zero_items_total($items), 'Product subtotal must use server item prices.');
zero_commerce_expect(1860, jg_zero_items_weight($items), 'Cart weight must use configured packed weights and quantity.');
zero_commerce_expect(480, jg_zero_shipping_weight($items[0]), 'Size weight lookup must be deterministic.');
zero_commerce_expect(64, strlen(jg_zero_cart_fingerprint($items)), 'Cart fingerprint must be SHA-256.');

$duitkuItems = jg_zero_duitku_item_details($items, [
    'payment_total' => 245000,
    'courier_name' => 'JNE',
    'courier_service_name' => 'REG',
]);
$duitkuTotal = array_reduce(
    $duitkuItems,
    static fn (int $sum, array $item): int => $sum + $item['price'],
    0
);
zero_commerce_expect(245000, $duitkuTotal, 'Duitku item details must exactly equal paymentAmount.');
zero_commerce_expect(true, jg_zero_duitku_callback_ip_allowed('182.23.85.11'), 'Sandbox callback IP must be accepted.');
zero_commerce_expect(false, jg_zero_duitku_callback_ip_allowed('127.0.0.1'), 'Unknown callback IP must be rejected.');
zero_commerce_expect(true, jg_zero_biteship_webhook_authorized([
    'HTTP_X_ZERO_WEBHOOK_SECRET' => 'zero-test-secret',
]), 'Matching Biteship webhook headers must be accepted.');
zero_commerce_expect(false, jg_zero_biteship_webhook_authorized([
    'HTTP_X_ZERO_WEBHOOK_SECRET' => 'wrong',
]), 'Incorrect Biteship webhook secret must be rejected.');

$quote = [
    'version' => 1,
    'expires_at' => 2000,
    'cart_fingerprint' => jg_zero_cart_fingerprint($items),
    'shipping_price' => 18000,
    'payment_total' => 245000,
];
$token = jg_zero_quote_token($quote);
zero_commerce_expect($quote, jg_zero_verify_quote($token, 1999), 'A signed, fresh quote must verify.');

$tamperedRejected = false;
try {
    jg_zero_verify_quote($token . 'x', 1999);
} catch (InvalidArgumentException) {
    $tamperedRejected = true;
}
zero_commerce_expect(true, $tamperedRejected, 'A modified quote token must be rejected.');

$expiredRejected = false;
try {
    jg_zero_verify_quote($token, 2001);
} catch (InvalidArgumentException) {
    $expiredRejected = true;
}
zero_commerce_expect(true, $expiredRejected, 'An expired quote must be rejected.');

$barcode = jg_zero_code128_svg('WYB-1112223333443');
zero_commerce_expect(true, str_contains($barcode, '<svg'), 'A5 label barcode must render SVG.');
zero_commerce_expect(true, str_contains($barcode, 'WYB-1112223333443'), 'Barcode human-readable text must preserve the waybill.');

echo "ZERO commerce tests passed\n";
