<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function pnl_default_expect(array $expected, array $category, string $message): void
{
    $actual = jg_accounting_default_pnl_category_setting($category);
    if ($actual === $expected) return;
    fwrite(STDERR, $message . PHP_EOL . 'Expected: ' . var_export($expected, true) . PHP_EOL . 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

pnl_default_expect(
    ['include_in_net_profit' => true, 'pnl_bucket' => 'product_cost'],
    ['name' => 'Persediaan Bahan Baku', 'account_code' => '1200', 'type' => 'asset', 'flow' => 'expense'],
    'Actual raw-material purchases must initially reduce profit as product cost.'
);
pnl_default_expect(
    ['include_in_net_profit' => true, 'pnl_bucket' => 'packing_cost'],
    ['name' => 'Persediaan Bahan Kemasan', 'account_code' => '1210', 'type' => 'asset', 'flow' => 'expense'],
    'Actual packaging purchases must initially reduce profit as packing cost.'
);
pnl_default_expect(
    ['include_in_net_profit' => true, 'pnl_bucket' => 'packing_cost'],
    ['category_key' => 'shipping-supplies', 'name' => 'Shipping Supplies', 'type' => 'operations', 'flow' => 'expense'],
    'Shipping and packing supplies must initially map to actual packing cost.'
);
pnl_default_expect(
    ['include_in_net_profit' => true, 'pnl_bucket' => 'product_cost'],
    ['category_key' => 'production-labor', 'name' => 'Production Labor', 'type' => 'payroll', 'flow' => 'expense'],
    'Direct production labor must initially map to actual product cost.'
);
pnl_default_expect(
    ['include_in_net_profit' => true, 'pnl_bucket' => 'ad_cost'],
    ['name' => 'Beban Iklan', 'account_code' => '6100', 'type' => 'operations', 'flow' => 'expense'],
    'Advertising must initially map to platform ad cost.'
);
pnl_default_expect(
    ['include_in_net_profit' => true, 'pnl_bucket' => 'payroll'],
    ['name' => 'Gaji Karyawan', 'account_code' => '7101-JG', 'type' => 'payroll', 'flow' => 'expense'],
    'Payroll account codes must initially map to payroll.'
);
pnl_default_expect(
    ['include_in_net_profit' => false, 'pnl_bucket' => 'exclude'],
    ['name' => 'Kas Operasional', 'account_code' => '11102', 'type' => 'asset', 'flow' => 'expense'],
    'Internal cash and bank movements must initially be excluded from profit.'
);
pnl_default_expect(
    ['include_in_net_profit' => false, 'pnl_bucket' => 'exclude'],
    ['name' => 'Equipment', 'account_code' => '1300', 'type' => 'asset', 'flow' => 'expense'],
    'Fixed-asset purchases must initially be excluded from Net Profit.'
);

echo "accounting-pnl-category-defaults-test: ok\n";
