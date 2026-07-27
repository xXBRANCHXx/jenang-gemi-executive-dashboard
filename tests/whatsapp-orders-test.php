<?php
declare(strict_types=1);

require dirname(__DIR__) . '/whatsapp-orders-bootstrap.php';

function whatsapp_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

whatsapp_expect(0.0, jg_whatsapp_money(0, 'Shipping cost'), 'Zero shipping must be retained for metrics.');
whatsapp_expect(25000.0, jg_whatsapp_money('25000', 'Shipping cost'), 'Shipping cost must normalize as money.');
whatsapp_expect('Customer One', jg_whatsapp_text(" Customer\nOne ", 'Customer name', 160, true), 'Customer text must normalize whitespace.');
whatsapp_expect(true, str_starts_with(jg_whatsapp_generate_order_id(), 'WAEXEC-'), 'Executive WhatsApp orders need a distinct Store Ops prefix.');

$negativeRejected = false;
try {
    jg_whatsapp_money(-1, 'Shipping cost');
} catch (InvalidArgumentException) {
    $negativeRejected = true;
}
whatsapp_expect(true, $negativeRejected, 'Negative shipping cost must be rejected.');

echo "whatsapp-orders-test: ok\n";
