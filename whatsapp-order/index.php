<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';
require_once dirname(__DIR__) . '/config.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$historyCssVersion = (string) @filemtime(dirname(__DIR__) . '/whatsapp-order-history.css');
$detailJsVersion = (string) @filemtime(dirname(__DIR__) . '/whatsapp-order-detail.js');
$storeOpsBaseUrl = rtrim(
    jg_dashboard_env_value('JG_STORE_OPS_BASE_URL')
        ?: (string) (jg_dashboard_load_local_config()['store_ops_base_url'] ?? 'https://store.jenanggemi.com'),
    '/'
);
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>WhatsApp Order | Jenang Gemi Executive Dashboard</title>
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
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.92.7</div>
    <div class="admin-app admin-app-suite" data-whatsapp-order-detail data-endpoint="../api/whatsapp-orders/" data-invoice-printer-url="<?php echo htmlspecialchars($storeOpsBaseUrl . '/invoice-printer/', ENT_QUOTES, 'UTF-8'); ?>">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar(''); ?>

            <div class="admin-shell-main whatsapp-history-page">
                <header class="admin-topbar whatsapp-history-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand">
                            <span class="admin-panel-kicker">WhatsApp order record</span>
                            <h1 data-detail-topbar-title>Order details</h1>
                        </div>
                    </div>
                    <?php render_admin_topbar_actions('whatsapp-history'); ?>
                </header>

                <main class="whatsapp-detail-layout">
                    <p class="admin-form-error" data-detail-error hidden></p>
                    <section class="whatsapp-detail-loading" data-detail-loading>
                        <span class="admin-panel-kicker">Loading record</span>
                        <h2>Preparing order breakdown…</h2>
                    </section>

                    <div data-detail-content hidden>
                        <section class="whatsapp-detail-hero">
                            <div>
                                <a href="../whatsapp-order-history/" class="whatsapp-detail-back">← All WhatsApp orders</a>
                                <span data-detail-order-id>Order</span>
                                <h2 data-detail-customer-name>Customer</h2>
                                <p data-detail-created>Created date</p>
                            </div>
                            <div class="whatsapp-detail-hero-actions">
                                <span class="whatsapp-history-status" data-detail-status>Status</span>
                                <a class="admin-primary-btn" data-detail-invoice-link target="_blank" rel="noopener" hidden>Print invoice</a>
                                <a class="admin-ghost-btn" data-detail-label-link target="_blank" rel="noopener">Open shipping label</a>
                            </div>
                        </section>

                        <section class="whatsapp-detail-metrics" aria-label="Order financial summary">
                            <article><span>Subtotal</span><strong data-detail-metric="subtotal">Rp0</strong><small>Before discounts</small></article>
                            <article><span>Discount</span><strong data-detail-metric="discount">Rp0</strong><small data-detail-discount-kind>No discount</small></article>
                            <article><span>Merchandise</span><strong data-detail-metric="merchandise">Rp0</strong><small>After discounts</small></article>
                            <article><span>Shipping</span><strong data-detail-metric="shipping">Rp0</strong><small>Executive metric</small></article>
                            <article class="is-total"><span>Customer total</span><strong data-detail-metric="customer_total">Rp0</strong><small>Final amount</small></article>
                        </section>

                        <div class="whatsapp-detail-grid">
                            <section class="whatsapp-detail-panel whatsapp-detail-items-panel">
                                <div class="whatsapp-detail-panel-head">
                                    <div><span class="admin-panel-kicker">Products</span><h3>Ordered items</h3></div>
                                    <span data-detail-item-count>0 items</span>
                                </div>
                                <div class="whatsapp-detail-table-wrap">
                                    <table class="whatsapp-detail-items-table">
                                        <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Gross</th><th>Discount</th><th>Net</th></tr></thead>
                                        <tbody data-detail-items></tbody>
                                    </table>
                                </div>
                            </section>

                            <aside class="whatsapp-detail-side">
                                <section class="whatsapp-detail-panel">
                                    <div class="whatsapp-detail-panel-head"><div><span class="admin-panel-kicker">Customer</span><h3>Delivery details</h3></div></div>
                                    <dl class="whatsapp-detail-facts">
                                        <div><dt>Name</dt><dd data-detail-customer="name">—</dd></div>
                                        <div><dt>WhatsApp phone</dt><dd data-detail-customer="phone">—</dd></div>
                                        <div><dt>Delivery address</dt><dd data-detail-customer="address">—</dd></div>
                                        <div><dt>Notes</dt><dd data-detail-notes>—</dd></div>
                                    </dl>
                                </section>

                                <section class="whatsapp-detail-panel">
                                    <div class="whatsapp-detail-panel-head"><div><span class="admin-panel-kicker">Internal economics</span><h3>Cost and margin</h3></div></div>
                                    <dl class="whatsapp-detail-facts is-financial">
                                        <div><dt>COGS snapshot</dt><dd data-detail-economics="cogs">Rp0</dd></div>
                                        <div><dt>Gross profit</dt><dd data-detail-economics="profit">Rp0</dd></div>
                                        <div><dt>Margin</dt><dd data-detail-economics="margin">0%</dd></div>
                                    </dl>
                                </section>

                                <section class="whatsapp-detail-panel">
                                    <div class="whatsapp-detail-panel-head"><div><span class="admin-panel-kicker">Lifecycle</span><h3>Order timing</h3></div></div>
                                    <dl class="whatsapp-detail-facts">
                                        <div><dt>Created</dt><dd data-detail-time="created">—</dd></div>
                                        <div><dt>Listed</dt><dd data-detail-time="listed">—</dd></div>
                                        <div><dt>Deadline</dt><dd data-detail-time="deadline">—</dd></div>
                                        <div><dt>Fulfilled</dt><dd data-detail-time="fulfilled">—</dd></div>
                                    </dl>
                                </section>
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    </div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../whatsapp-order-detail.js?v=<?php echo urlencode($detailJsVersion ?: '1'); ?>"></script>
</body>
</html>
