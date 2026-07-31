<?php
declare(strict_types=1);

require dirname(__DIR__) . '/sku-db-bootstrap.php';

function moq_expect(int $expected, int $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . "\nExpected {$expected}, got {$actual}\n");
        exit(1);
    }
}

moq_expect(9, jg_sku_default_purchase_moq('ZERO', 'Syrup', 550), 'ZERO 550ml syrup MOQ');
moq_expect(11, jg_sku_default_purchase_moq('ZERO', 'Syrup', 250), 'ZERO 250ml syrup MOQ');
moq_expect(20, jg_sku_default_purchase_moq('ZERO', 'Syrup', 50), 'ZERO 50ml syrup MOQ');
moq_expect(10, jg_sku_default_purchase_moq('ZERO', 'Drops', 30), 'ZERO 30ml drops MOQ');
moq_expect(20, jg_sku_default_purchase_moq('ZERO', 'Drops', 10), 'ZERO 10ml drops MOQ');
moq_expect(20, jg_sku_default_purchase_moq('ZERO', 'Drops', 5), 'ZERO 5ml drops MOQ');
moq_expect(7, jg_sku_default_purchase_moq('ZFit', 'Fiber Syrup', 250), 'ZFit Fiber Syrup 250ml MOQ');
moq_expect(7, jg_sku_default_purchase_moq('', 'ACVS', 250), 'ACVS 250ml MOQ');
moq_expect(9, jg_sku_default_purchase_moq('', 'ACVS', 100), 'ACVS 100ml MOQ');
moq_expect(2, jg_sku_default_purchase_moq("Pedro's", 'Cookies', 100), "Pedro's product MOQ");
moq_expect(1, jg_sku_default_purchase_moq('Jenang Gemi', 'Biscuit', 220), 'All other products default to unit MOQ');

echo "sku-moq-test: ok\n";
