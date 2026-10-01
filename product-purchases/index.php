<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';
if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}
jg_admin_release_session();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>Purchases by product | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('inventory-recap'); ?>
    <link rel="stylesheet" href="../admin.css?v=<?php echo filemtime(dirname(__DIR__) . '/admin.css'); ?>">
    <link rel="stylesheet" href="./product-purchases.css?v=<?php echo filemtime(__DIR__ . '/product-purchases.css'); ?>">
</head>
<body class="admin-body is-dashboard is-product-purchases">
<div class="admin-app admin-app-suite" data-product-purchases data-api-endpoint="../api/product-purchases/">
    <div class="admin-shell">
        <?php render_admin_sidebar('inventory-recap'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar">
                <div class="admin-topbar-brand">
                    <h1>Purchases by product</h1>
                    <p>See how much you ordered, what has arrived, and the value of each product’s purchases.</p>
                </div>
                <?php render_admin_topbar_actions('inventory-recap'); ?>
            </header>
            <main class="product-purchases-layout">
                <form class="product-purchases-filters" data-purchases-form aria-label="Purchase history filters">
                    <label class="product-purchases-picker"><span>Product</span><select data-purchases-product aria-label="Product"><option value="">All products</option></select></label>
                    <label><span>Period</span><select data-purchases-period><option value="last30">Last 30 days</option><option value="month">This month</option><option value="lastmonth">Last month</option><option value="year">This year</option><option value="all">All time</option><option value="custom">Custom dates</option></select></label>
                    <label><span>From</span><input type="date" data-purchases-start required></label>
                    <label><span>To</span><input type="date" data-purchases-end required></label>
                    <button type="submit" class="admin-ghost-btn" data-purchases-apply>Apply</button>
                </form>
                <p class="product-purchases-status" data-purchases-status role="status" aria-live="polite">Loading purchase history…</p>
                <section class="product-purchases-results" data-purchases-results hidden aria-label="Purchase report">
                    <div class="product-purchases-report-head">
                        <div><span class="admin-panel-kicker">Purchasing · product history</span><h2 data-purchases-title>All products</h2><p data-purchases-caption></p></div>
                        <a class="admin-ghost-btn" data-purchases-all href="./" hidden>All products →</a>
                    </div>
                    <div class="product-purchases-metrics">
                        <article><span>Units ordered</span><strong data-purchases-ordered>0</strong><small data-purchases-order-count></small></article>
                        <article><span>Units received</span><strong data-purchases-received>0</strong><small>Received to date from these POs</small></article>
                        <article><span>Still to arrive</span><strong data-purchases-remaining>0</strong><small>Ordered units less received units</small></article>
                        <article><span>Purchase value</span><strong data-purchases-value>Rp0</strong><small>Ordered units × PO unit cost</small></article>
                    </div>
                    <section class="product-purchases-panel">
                        <header><h3 data-purchases-table-title>Products purchased</h3><label class="product-purchases-search" data-purchases-search-label><span class="admin-sr-only">Search purchased products</span><input type="search" data-purchases-search aria-label="Search purchased products" placeholder="Search product or SKU"></label></header>
                        <div class="product-purchases-table-wrap" tabindex="0" role="region" aria-label="Purchase history table">
                            <table class="product-purchases-table"><thead data-purchases-table-head></thead><tbody data-purchases-rows></tbody></table>
                        </div>
                    </section>
                </section>
                <p class="product-purchases-note">Date range includes both days in Jakarta time and uses the PO confirmation date (creation date for older POs). Drafts and cancelled POs are excluded. Received units reflect receipts to date for those orders; purchase value is the order value, independent of payment status.</p>
                <a class="product-purchases-history-link" href="../dashboard/?view=po-history">← Back to PO History</a>
            </main>
        </div>
    </div>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
<script type="module" src="./product-purchases.js?v=<?php echo filemtime(__DIR__ . '/product-purchases.js'); ?>"></script>
</body>
</html>
