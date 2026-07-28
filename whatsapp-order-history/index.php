<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$historyCssVersion = (string) @filemtime(dirname(__DIR__) . '/whatsapp-order-history.css');
$historyJsVersion = (string) @filemtime(dirname(__DIR__) . '/whatsapp-order-history.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>WhatsApp Order History | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('whatsapp'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="../whatsapp-order-history.css?v=<?php echo urlencode($historyCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-whatsapp-history-page">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.92.6</div>
    <div class="admin-app admin-app-suite" data-whatsapp-order-history data-endpoint="../api/whatsapp-orders/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar(''); ?>

            <div class="admin-shell-main whatsapp-history-page">
                <header class="admin-topbar whatsapp-history-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand">
                            <span class="admin-panel-kicker">Direct order ledger</span>
                            <h1>WhatsApp History</h1>
                        </div>
                    </div>
                    <?php render_admin_topbar_actions('whatsapp-history'); ?>
                </header>

                <main class="whatsapp-history-layout">
                    <section class="whatsapp-history-hero">
                        <div>
                            <span class="admin-panel-kicker">WhatsApp orders</span>
                            <h2>All direct-order records</h2>
                            <p>Review every WhatsApp order, its customer total, discounts, fulfillment state, and complete product breakdown.</p>
                        </div>
                        <a class="admin-primary-btn" href="../whatsapp-orders/">Create new order</a>
                    </section>

                    <section class="whatsapp-history-metrics" aria-label="WhatsApp order history summary">
                        <article><span>Orders</span><strong data-history-summary="orders">0</strong><small>Matching records</small></article>
                        <article><span>Customer total</span><strong data-history-summary="customer_total">Rp0</strong><small>Merchandise plus shipping</small></article>
                        <article><span>Items</span><strong data-history-summary="item_count">0</strong><small>Units ordered</small></article>
                        <article><span>Discounts</span><strong data-history-summary="discount_total">Rp0</strong><small>Item and order layers</small></article>
                    </section>

                    <section class="whatsapp-history-ledger">
                        <div class="whatsapp-history-ledger-head">
                            <div>
                                <span class="admin-panel-kicker">Order ledger</span>
                                <h3>WhatsApp order history</h3>
                            </div>
                            <span data-history-status>Loading orders…</span>
                        </div>

                        <div class="whatsapp-history-filters">
                            <label>
                                <span>Search</span>
                                <input type="search" data-history-search placeholder="Order, customer, phone, SKU, product">
                            </label>
                            <label>
                                <span>Status</span>
                                <select data-history-status-filter>
                                    <option value="">All statuses</option>
                                    <option value="PENDING_PUBLISH">Sending</option>
                                    <option value="PUBLISH_FAILED">Needs retry</option>
                                    <option value="IS_LISTED">Listed</option>
                                    <option value="IS_BEING_FULFILLED">Being fulfilled</option>
                                    <option value="FULFILLED">Fulfilled</option>
                                </select>
                            </label>
                        </div>

                        <p class="admin-form-error" data-history-error hidden></p>
                        <div class="whatsapp-history-table-wrap">
                            <table class="whatsapp-history-table">
                                <thead>
                                    <tr>
                                        <th>Order</th>
                                        <th>Customer</th>
                                        <th>Status</th>
                                        <th>Items</th>
                                        <th>Merchandise</th>
                                        <th>Shipping</th>
                                        <th>Customer total</th>
                                        <th>Created</th>
                                        <th aria-label="Open order"></th>
                                    </tr>
                                </thead>
                                <tbody data-history-body>
                                    <tr><td colspan="9" class="admin-empty">Loading WhatsApp orders…</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="whatsapp-history-pagination">
                            <button type="button" class="admin-ghost-btn" data-history-previous disabled>Previous</button>
                            <span data-history-page>Page 1 of 1</span>
                            <button type="button" class="admin-ghost-btn" data-history-next disabled>Next</button>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    </div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../whatsapp-order-history.js?v=<?php echo urlencode($historyJsVersion ?: '1'); ?>"></script>
</body>
</html>
