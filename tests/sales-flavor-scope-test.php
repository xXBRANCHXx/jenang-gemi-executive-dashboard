<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/sales-flavor-scope.php';

function flavor_scope_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message . ' Expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

flavor_scope_expect('syrup', jg_sales_flavor_group_for_catalog('ZERO', 'Syrup'), 'ZERO Syrup must feed the syrup chart.');
flavor_scope_expect('drops', jg_sales_flavor_group_for_catalog(' zero ', ' DROPS '), 'ZERO Drops matching must ignore case and outer whitespace.');
flavor_scope_expect('bubur', jg_sales_flavor_group_for_catalog('Jenang   Gemi', 'Bubur'), 'Jenang Gemi Bubur must feed the Bubur chart.');
flavor_scope_expect(null, jg_sales_flavor_group_for_catalog('Jenang Gemi', 'Syrup'), 'Other brands must not feed the ZERO Syrup chart.');
flavor_scope_expect(null, jg_sales_flavor_group_for_catalog('ZERO', 'Fiber Syrup'), 'Product matching must be exact.');
flavor_scope_expect(null, jg_sales_flavor_group_for_catalog('ZERO', 'Drops Syrup'), 'A partial Drops/Syrup name must not feed either chart.');

$sold = jg_sales_sorted_sold_flavor_rows([
    'new' => ['label' => 'New flavor', 'quantity' => 0, 'revenue' => 0],
    'vanilla' => ['label' => 'Vanilla', 'quantity' => 2, 'revenue' => 20000],
    'caramel' => ['label' => 'Caramel', 'quantity' => 8, 'revenue' => 80000],
    'refund' => ['label' => 'Refunded', 'quantity' => -1, 'revenue' => -10000],
]);

flavor_scope_expect(2, count($sold), 'Only flavors with sold quantity greater than zero may be returned.');
flavor_scope_expect('Caramel', $sold[0]['label'] ?? null, 'Sold flavors must remain ordered by quantity.');
flavor_scope_expect('Vanilla', $sold[1]['label'] ?? null, 'The lower-selling positive flavor must remain present.');
flavor_scope_expect([], jg_sales_sorted_sold_flavor_rows(['zero' => ['label' => 'Zero', 'quantity' => 0]]), 'Zero-sale catalog flavors must not appear.');

$manySoldFlavors = [];
for ($index = 1; $index <= 20; $index++) {
    $manySoldFlavors['flavor-' . $index] = ['label' => 'Flavor ' . $index, 'quantity' => $index];
}
flavor_scope_expect(20, count(jg_sales_sorted_sold_flavor_rows($manySoldFlavors)), 'Sold flavors must not be silently capped at the old top-16 limit.');
flavor_scope_expect(5, count(jg_sales_sorted_sold_flavor_rows($manySoldFlavors, 5)), 'An explicit caller limit must still be honored.');

echo "sales-flavor-scope-test: ok\n";
