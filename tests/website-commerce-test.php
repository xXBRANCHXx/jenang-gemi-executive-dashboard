<?php
declare(strict_types=1);

require dirname(__DIR__) . '/website-commerce-bootstrap.php';

function commerce_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$activation = '2026-06-23 01:02:03.500000';
commerce_expect(JG_WEBSITE_ORDER_MANUAL_ERA, jg_website_classify_order('2026-06-23 01:02:03.499999', true, $activation), 'Pre-cutover orders must remain manual-era.');
commerce_expect(JG_WEBSITE_ORDER_MANUAL_ERA, jg_website_classify_order($activation, true, $activation), 'The exact cutover instant is not post-cutover.');
commerce_expect(JG_WEBSITE_ORDER_STORE_OPS_ELIGIBLE, jg_website_classify_order('2026-06-23 01:02:03.500001', true, $activation), 'Only post-cutover orders are eligible.');
commerce_expect(JG_WEBSITE_ORDER_MANUAL_ERA, jg_website_classify_order('2027-01-01 00:00:00', false, null), 'Hard Set OFF must always create manual-era orders.');
commerce_expect('2026-06-23T01:02:03.500001Z', jg_website_atom('2026-06-23 01:02:03.500001'), 'Cross-service timestamps must preserve microseconds.');

$hardSet = ['enabled' => true, 'activated_at' => $activation];
commerce_expect(false, jg_website_order_is_store_ops_eligible([
    'era' => JG_WEBSITE_ORDER_MANUAL_ERA,
    'created_at' => '2026-06-23 01:02:04',
], $hardSet), 'A stored manual-era flag can never be backfilled after activation.');
commerce_expect(false, jg_website_order_is_store_ops_eligible([
    'era' => JG_WEBSITE_ORDER_STORE_OPS_ELIGIBLE,
    'created_at' => '2026-06-23 01:02:03',
], $hardSet), 'An inconsistent pre-cutover eligible flag must still be rejected server-side.');
commerce_expect(true, jg_website_order_is_store_ops_eligible([
    'era' => JG_WEBSITE_ORDER_STORE_OPS_ELIGIBLE,
    'created_at' => '2026-06-23 01:02:04',
], $hardSet), 'A consistent post-cutover order must be eligible.');
commerce_expect(true, jg_hard_set_activation_requires_readiness(['enabled' => false]), 'The first Executive activation must require readiness.');
commerce_expect(false, jg_hard_set_activation_requires_readiness(['enabled' => true]), 'An idempotent Executive activation retry must not reopen the readiness gate.');
$activationPayload = jg_website_activation_payload(
    ['enabled' => true, 'activated_at_iso' => '2026-06-23T01:02:03.500000Z', 'activated_by' => 'test'],
    ['tiktok:jenang-gemi-tiktok', 'shopee:jenang-gemi-shopee']
);
commerce_expect(
    ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok'],
    $activationPayload['automatic_sources'],
    'The durable activation payload must preserve the verified account-level source scope.'
);
$scopedDeliveryPayload = jg_hard_set_delivery_payload_with_api_scope(
    $activationPayload,
    ['state' => [
        'enabled' => true,
        'activated_at' => '2026-06-23T01:02:03.500000Z',
        'sources' => ['tiktok:jenang-gemi-tiktok', 'shopee:jenang-gemi-shopee'],
    ]]
);
commerce_expect(
    ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok'],
    $scopedDeliveryPayload['automatic_sources'],
    'Store Ops activation delivery must carry API Ingest\'s exact frozen account scope.'
);
$missingDeliveryScopeRejected = false;
try {
    jg_hard_set_delivery_payload_with_api_scope(['enabled' => true], ['state' => ['sources' => []]]);
} catch (RuntimeException) {
    $missingDeliveryScopeRejected = true;
}
commerce_expect(true, $missingDeliveryScopeRejected, 'Activation delivery must stop if API Ingest omits its frozen account scope.');

$deliveryOrder = [];
jg_hard_set_project_activation(
    $activationPayload,
    static function (array $payload) use (&$deliveryOrder): array {
        $deliveryOrder[] = 'store_ops';
        return ['state' => [
            'enabled' => true,
            'activated_at' => $payload['activated_at'],
            'automatic_sources' => $payload['automatic_sources'],
        ]];
    },
    static function (array $payload) use (&$deliveryOrder): array {
        $deliveryOrder[] = 'api_ingest';
        return ['state' => [
            'enabled' => true,
            'activated_at' => $payload['activated_at'],
            'sources' => $payload['automatic_sources'],
        ]];
    }
);
commerce_expect(
    ['store_ops', 'api_ingest'],
    $deliveryOrder,
    'Activation must be delivered to Store Ops before API Ingest can enable marketplace mutations.'
);

$apiDeliveryAttempted = false;
$storeOpsRejectionPropagated = false;
try {
    jg_hard_set_project_activation(
        $activationPayload,
        static function (array $payload): array {
            throw new RuntimeException('Store Ops rejected the frozen source scope.');
        },
        static function (array $payload) use (&$apiDeliveryAttempted): array {
            $apiDeliveryAttempted = true;
            return ['state' => ['sources' => $payload['automatic_sources']]];
        }
    );
} catch (RuntimeException $error) {
    $storeOpsRejectionPropagated = str_contains($error->getMessage(), 'Store Ops rejected');
}
commerce_expect(true, $storeOpsRejectionPropagated, 'A Store Ops activation rejection must stop delivery.');
commerce_expect(false, $apiDeliveryAttempted, 'API Ingest must remain OFF when Store Ops activation fails.');

$apiDeliveryAfterFalseStoreOpsAck = false;
$falseStoreOpsAckRejected = false;
try {
    jg_hard_set_project_activation(
        $activationPayload,
        static fn (array $payload): array => ['state' => [
            'enabled' => false,
            'activated_at' => null,
            'automatic_sources' => $payload['automatic_sources'],
        ]],
        static function (array $payload) use (&$apiDeliveryAfterFalseStoreOpsAck): array {
            $apiDeliveryAfterFalseStoreOpsAck = true;
            return ['state' => [
                'enabled' => true,
                'activated_at' => $payload['activated_at'],
                'sources' => $payload['automatic_sources'],
            ]];
        }
    );
} catch (RuntimeException) {
    $falseStoreOpsAckRejected = true;
}
commerce_expect(true, $falseStoreOpsAckRejected, 'A nominal Store Ops response that does not acknowledge ON must fail closed.');
commerce_expect(false, $apiDeliveryAfterFalseStoreOpsAck, 'API Ingest must not be contacted after an incomplete Store Ops acknowledgement.');

$mismatchedApiAckRejected = false;
try {
    jg_hard_set_delivery_payload_with_api_scope(
        $activationPayload,
        ['state' => [
            'enabled' => true,
            'activated_at' => '2026-06-23T01:02:03.500001Z',
            'sources' => $activationPayload['automatic_sources'],
        ]]
    );
} catch (RuntimeException) {
    $mismatchedApiAckRejected = true;
}
commerce_expect(true, $mismatchedApiAckRejected, 'Synchronization must reject an API Ingest acknowledgement with a different permanent timestamp.');

$legacyMarketplaceState = jg_hard_set_marketplace_readiness_response(['ok' => true, 'state' => ['enabled' => false]]);
commerce_expect(false, $legacyMarketplaceState['ready'], 'A legacy API Ingest endpoint without readiness evidence must block activation.');
$failedMarketplaceState = jg_hard_set_marketplace_readiness_response([
    'ok' => true,
    'readiness' => [
        'ready' => false,
        'checks' => [['label' => 'Fulfillment cron heartbeat', 'ready' => false, 'detail' => 'No recent run']],
    ],
]);
commerce_expect(false, $failedMarketplaceState['ready'], 'A failed API Ingest readiness check must block activation.');
commerce_expect(true, str_contains($failedMarketplaceState['detail'], 'No recent run'), 'The dashboard must expose the upstream readiness reason.');
commerce_expect(true, jg_hard_set_marketplace_readiness_response(['ok' => true, 'readiness' => ['ready' => true]])['ready'], 'Only explicit upstream readiness may pass activation.');
$legacyStoreOpsState = jg_hard_set_store_ops_readiness_response(['ok' => true, 'state' => ['enabled' => false]]);
commerce_expect(false, $legacyStoreOpsState['ready'], 'A legacy Store Ops endpoint without readiness evidence must block activation.');
$storeOpsState = jg_hard_set_store_ops_readiness_response([
    'ok' => true,
    'readiness' => ['ready' => true, 'sources' => ['tiktok:jenang-gemi-tiktok', 'shopee:jenang-gemi-shopee']],
]);
commerce_expect(
    ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok'],
    $storeOpsState['sources'],
    'Dashboard readiness must normalize Store Ops source coverage.'
);
commerce_expect(
    true,
    jg_hard_set_marketplace_source_alignment(
        ['tiktok:jenang-gemi-tiktok', 'shopee:jenang-gemi-shopee'],
        ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok']
    )['ready'],
    'Equivalent source sets must pass regardless of input ordering.'
);
commerce_expect(
    true,
    jg_hard_set_marketplace_source_alignment(
        ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok', 'shopee:zero-shopee'],
        ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok']
    )['ready'],
    'Additional manual Store Ops sources must not widen or block the automatic API Ingest scope.'
);
commerce_expect(
    false,
    jg_hard_set_marketplace_source_alignment(
        ['shopee:jenang-gemi-shopee'],
        ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok']
    )['ready'],
    'Big Set activation must fail when Store Ops and API Ingest cover different sources.'
);

$downstreamOff = jg_hard_set_downstream_state_alignment(['enabled' => false], ['enabled' => false]);
commerce_expect(true, $downstreamOff['ready'], 'Matching OFF downstream projections must pass state alignment.');
$downstreamPartial = jg_hard_set_downstream_state_alignment(
    ['enabled' => true, 'activated_at' => '2026-06-23T01:02:03.500000Z'],
    ['enabled' => false]
);
commerce_expect(false, $downstreamPartial['ready'], 'A partial irreversible cutover must fail downstream state alignment.');
$downstreamActive = jg_hard_set_downstream_state_alignment(
    ['enabled' => true, 'activated_at_iso' => '2026-06-23T01:02:03.500000Z'],
    ['enabled' => true, 'activated_at' => '2026-06-23 01:02:03.500000']
);
commerce_expect(true, $downstreamActive['ready'], 'Equivalent active UTC cutover timestamps must pass state alignment.');
$downstreamMismatch = jg_hard_set_downstream_state_alignment(
    ['enabled' => true, 'activated_at' => '2026-06-23T01:02:03.500000Z'],
    ['enabled' => true, 'activated_at' => '2026-06-23T01:02:03.500001Z']
);
commerce_expect(false, $downstreamMismatch['ready'], 'Different active cutover timestamps must fail downstream state alignment.');
$ambiguousDownstreamTimestamp = jg_hard_set_downstream_state_alignment(
    ['enabled' => true, 'activated_at' => 'tomorrow'],
    ['enabled' => true, 'activated_at' => 'tomorrow']
);
commerce_expect(false, $ambiguousDownstreamTimestamp['ready'], 'Ambiguous timestamp text must never satisfy irreversible state alignment.');

$allOffProjection = jg_hard_set_projection_state_alignment(
    ['enabled' => false],
    ['enabled' => false],
    ['enabled' => false]
);
commerce_expect(true, $allOffProjection['ready'], 'Activation may be offered only when all three projections agree that Big Set is OFF.');
$rogueDownstreamProjection = jg_hard_set_projection_state_alignment(
    ['enabled' => false],
    ['enabled' => true, 'activated_at' => '2026-06-23T01:02:03.500000Z'],
    ['enabled' => true, 'activated_at' => '2026-06-23T01:02:03.500000Z']
);
commerce_expect(false, $rogueDownstreamProjection['ready'], 'A downstream cutover while the Executive Dashboard is OFF must block a conflicting activation.');
$activeProjection = jg_hard_set_projection_state_alignment(
    ['enabled' => true, 'activated_at_iso' => '2026-06-23T01:02:03.500000Z'],
    ['enabled' => true, 'activated_at' => '2026-06-23 01:02:03.500000'],
    ['enabled' => true, 'activated_at' => '2026-06-23T01:02:03.500000Z']
);
commerce_expect(true, $activeProjection['ready'], 'All active projections must acknowledge the exact same permanent cutover.');
$executiveTimestampMismatch = jg_hard_set_projection_state_alignment(
    ['enabled' => true, 'activated_at_iso' => '2026-06-23T01:02:03.500001Z'],
    ['enabled' => true, 'activated_at' => '2026-06-23 01:02:03.500000'],
    ['enabled' => true, 'activated_at' => '2026-06-23T01:02:03.500000Z']
);
commerce_expect(false, $executiveTimestampMismatch['ready'], 'A conflicting Executive cutover timestamp must remain visibly degraded.');

$readyPreflight = jg_hard_set_preflight_result(
    ['enabled' => false],
    ['ready' => true, 'checks' => []],
    ['required' => false, 'delivered' => true]
);
commerce_expect(true, $readyPreflight['ok'], 'A fully green OFF state must pass the read-only deployment preflight.');
commerce_expect('ready_for_activation', $readyPreflight['status'], 'A fully green OFF state must be classified as ready for activation.');
$blockedPreflight = jg_hard_set_preflight_result(
    ['enabled' => false],
    ['ready' => false, 'checks' => [['key' => 'worker_heartbeat', 'ready' => false]]],
    ['required' => false, 'delivered' => true]
);
commerce_expect(false, $blockedPreflight['ok'], 'A failed readiness check must fail the deployment preflight.');
commerce_expect(1, count($blockedPreflight['failed_checks']), 'The deployment preflight must preserve its actionable failed checks.');
$pendingPreflight = jg_hard_set_preflight_result(
    ['enabled' => true],
    ['ready' => true, 'checks' => []],
    ['required' => true, 'delivered' => false]
);
commerce_expect('synchronization_pending', $pendingPreflight['status'], 'A partial irreversible cutover must be reported as synchronization pending.');
commerce_expect(false, $pendingPreflight['ok'], 'A partial irreversible cutover must never report healthy.');
$degradedPreflight = jg_hard_set_preflight_result(
    ['enabled' => true],
    ['ready' => false, 'checks' => [['key' => 'manual_review_queue', 'ready' => false]]],
    ['required' => true, 'delivered' => true]
);
commerce_expect('active_degraded', $degradedPreflight['status'], 'A synchronized cutover with an operational exception must report degraded.');
$healthyPreflight = jg_hard_set_preflight_result(
    ['enabled' => true],
    ['ready' => true, 'checks' => []],
    ['required' => true, 'delivered' => true]
);
commerce_expect(true, $healthyPreflight['ok'], 'A synchronized and healthy active cutover must pass operational verification.');
commerce_expect('active_healthy', $healthyPreflight['status'], 'A synchronized and healthy cutover must be classified explicitly.');

commerce_expect('ZEROWEB', jg_website_order_prefix('zero_website'), 'ZERO order IDs need their independent prefix.');
commerce_expect('JGWEB', jg_website_order_prefix('jenang_gemi_website'), 'Jenang Gemi order IDs need their independent prefix.');
commerce_expect(['zero_website', 'jenang_gemi_website'], array_keys(JG_WEBSITE_PLATFORMS), 'Website platform identifiers must remain separate.');
commerce_expect(
    hash_hmac('sha256', 'jenang-gemi-website-orders-v1', 'shared-seed'),
    jg_website_derive_store_ops_token('shared-seed'),
    'The deployed Store Ops token fallback must be deterministic.'
);
commerce_expect('', jg_website_derive_store_ops_token(''), 'An empty shared seed must not create a bearer token.');
commerce_expect(false, jg_website_customer_address_has_content(''), 'Empty checkout addresses must still be rejected.');
commerce_expect(false, jg_website_customer_address_has_content('   --   '), 'Punctuation-only checkout addresses must still be rejected.');
commerce_expect(true, jg_website_customer_address_has_content('A'), 'A one-letter checkout address must be accepted.');
commerce_expect(true, jg_website_customer_address_has_content('1'), 'A one-number checkout address must be accepted.');

echo "website-commerce-test: ok\n";
