<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/profit-loss-bootstrap.php';

function expect_profit_allocation(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$tree = jg_profit_loss_default_allocation_tree();
expect_profit_allocation(count($tree) === 4, 'The default net-profit split must have four allocations.');
expect_profit_allocation(array_sum(array_column($tree, 'percentage')) === 100.0, 'The default net-profit split must total 100%.');
expect_profit_allocation($tree[0]['name'] === 'Re-invested' && $tree[0]['percentage'] === 20.0, 'Re-investment must default to 20%.');
expect_profit_allocation($tree[1]['name'] === 'Tithe' && $tree[1]['percentage'] === 10.0, 'Tithe must default to 10%.');
expect_profit_allocation($tree[2]['name'] === 'Owners' && $tree[2]['percentage'] === 65.0, 'Owners must default to 65%.');
expect_profit_allocation($tree[3]['name'] === 'Employee profit sharing' && $tree[3]['percentage'] === 5.0, 'Employee profit sharing must default to 5%.');

$owners = $tree[2]['children'];
expect_profit_allocation($owners[0]['name'] === 'Ren (Director)' && $owners[0]['percentage'] === 30.0, 'Ren must receive 30% of Owners.');
expect_profit_allocation($owners[1]['name'] === 'BNG' && $owners[1]['percentage'] === 70.0, 'BNG must receive 70% of Owners.');

$bng = $owners[1]['children'];
expect_profit_allocation(array_column($bng, 'percentage') === [50.0, 25.0, 25.0], 'BNG must split 50/25/25.');
expect_profit_allocation(array_column($bng, 'name') === ['Loan to BNG', 'Commissioner (Giri Gusman)', 'Advisor (Brent Vincent)'], 'BNG recipients must use the requested names.');
expect_profit_allocation(jg_profit_loss_normalize_allocation_tree($tree) === $tree, 'The default allocation tree must pass normalization unchanged.');

$invalid = $tree;
$invalid[0]['percentage'] = 19;
try {
    jg_profit_loss_normalize_allocation_tree($invalid);
    throw new RuntimeException('An allocation level below 100% must be rejected.');
} catch (InvalidArgumentException $error) {
    expect_profit_allocation(str_contains($error->getMessage(), '100%'), 'The validation error must explain the 100% requirement.');
}

$custom = [
    [
        'id' => 'custom-parent',
        'name' => 'Custom parent',
        'percentage' => 100,
        'children' => [
            ['id' => 'custom-a', 'name' => 'Custom A', 'percentage' => 40, 'children' => []],
            ['id' => 'custom-b', 'name' => 'Custom B', 'percentage' => 60, 'children' => []],
        ],
    ],
];
$normalized = jg_profit_loss_normalize_allocation_tree($custom);
expect_profit_allocation($normalized[0]['children'][1]['name'] === 'Custom B', 'Custom names and nested allocations must be preserved.');

$thirds = [[
    'id' => 'three-way-parent',
    'name' => 'Three-way parent',
    'percentage' => 100,
    'children' => [
        ['id' => 'third-a', 'name' => 'Third A', 'percentage' => 33.33, 'children' => []],
        ['id' => 'third-b', 'name' => 'Third B', 'percentage' => 33.33, 'children' => []],
        ['id' => 'third-c', 'name' => 'Third C', 'percentage' => 33.33, 'children' => []],
    ],
]];
$normalizedThirds = jg_profit_loss_normalize_allocation_tree($thirds);
expect_profit_allocation(
    array_column($normalizedThirds[0]['children'], 'percentage') === [33.33, 33.33, 33.34],
    'A three-way 33.33% split must apply the missing 0.01% to the final allocation.'
);
expect_profit_allocation(
    array_sum(array_column($normalizedThirds[0]['children'], 'percentage')) === 100.0,
    'A rounded three-way split must be stored as exactly 100%.'
);

echo "Profit allocation checks passed.\n";
