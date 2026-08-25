<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/', true, 302);
    exit;
}
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$orderId = trim((string) ($_GET['order_id'] ?? $_GET['order'] ?? ''));
$assetVersion = (string) max(
    (int) @filemtime(__DIR__ . '/order-breakdown.css'),
    (int) @filemtime(__DIR__ . '/order-breakdown.js')
);
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo htmlspecialchars($orderId !== '' ? $orderId . ' · Order breakdown' : 'Order breakdown', ENT_QUOTES); ?></title>
    <meta name="robots" content="noindex,nofollow">
    <?php render_admin_initial_theme_script(); ?>
    <?php render_admin_favicons('orders'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($assetVersion ?: '1'); ?>">
    <link rel="stylesheet" href="./order-breakdown.css?v=<?php echo urlencode($assetVersion ?: '1'); ?>">
</head>
<body class="admin-body admin-order-breakdown-body">
    <main class="admin-order-breakdown-shell" data-order-breakdown data-endpoint="../api/orders/" data-order-id="<?php echo htmlspecialchars($orderId, ENT_QUOTES); ?>">
        <header class="admin-order-breakdown-hero">
            <div>
                <span class="admin-panel-kicker">Executive order breakdown</span>
                <h1 data-order-title><?php echo htmlspecialchars($orderId !== '' ? $orderId : 'Order not selected', ENT_QUOTES); ?></h1>
                <p data-order-subtitle>Loading status, products, and order economics…</p>
            </div>
            <span class="admin-order-breakdown-status" data-order-status>Loading</span>
        </header>

        <section class="admin-order-breakdown-loading" data-order-loading aria-live="polite">
            <span></span><span></span><span></span><span></span>
        </section>

        <section class="admin-order-breakdown-error" data-order-error hidden>
            <span class="admin-panel-kicker">Order unavailable</span>
            <h2>The order breakdown could not be loaded</h2>
            <p data-order-error-message>Please retry after the order source finishes syncing.</p>
            <button type="button" class="admin-primary-btn" data-order-retry>Retry</button>
        </section>

        <div data-order-content hidden>
            <section class="admin-order-economics" aria-label="Order economics">
                <article class="is-net"><span>Net revenue</span><strong data-order-net>Rp0</strong><small>Seller-received order revenue</small></article>
                <article><span>COGS</span><strong data-order-cogs>Rp0</strong><small>Effective SKU cost at order date</small></article>
                <article><span>Packing cost</span><strong data-order-packing>Rp0</strong><small>Monthly packing cost × physical units</small></article>
                <article class="is-profit"><span>Estimated GP</span><strong data-order-gp>Rp0</strong><small data-order-margin>Net revenue − COGS − packing</small></article>
            </section>

            <section class="admin-order-cost-quality" data-order-coverage></section>

            <div class="admin-order-breakdown-columns">
                <section class="admin-order-breakdown-card">
                    <header><div><span class="admin-panel-kicker">Contents</span><h2>Products processed</h2></div><strong data-order-item-count>0 units</strong></header>
                    <div class="admin-order-product-list" data-order-items></div>
                </section>

                <section class="admin-order-breakdown-card">
                    <header><div><span class="admin-panel-kicker">Processing</span><h2>Order timeline</h2></div></header>
                    <ol class="admin-order-timeline" data-order-timeline></ol>
                </section>
            </div>

            <section class="admin-order-breakdown-card admin-order-facts-card">
                <header><div><span class="admin-panel-kicker">Order facts</span><h2>Source and fulfillment</h2></div></header>
                <dl class="admin-order-facts" data-order-facts></dl>
            </section>
        </div>
    </main>
    <script type="module" src="./order-breakdown.js?v=<?php echo urlencode($assetVersion ?: '1'); ?>"></script>
</body>
</html>
