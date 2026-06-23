<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$storeOpsJsVersion = (string) @filemtime(dirname(__DIR__) . '/store-ops.js');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Store Ops | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec-store-ops.1</div>
    <div class="admin-app admin-app-suite" data-store-ops-dashboard data-store-ops-endpoint="../api/store-ops/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('store-ops'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Store Ops</span>
                        <h1>Fulfillment Activity</h1>
                        <p>Search live order ownership, scan progress, label printing, and employee throughput.</p>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-view-indicator" data-store-ops-status>Loading</div>
                        <a class="admin-ghost-btn admin-link-btn" href="../dashboard/">Dashboard</a>
                        <a class="admin-primary-btn admin-link-btn" href="../logout/">Lock</a>
                    </div>
                </header>

                <main class="admin-layout admin-store-ops-layout">
                    <section class="admin-metric-grid admin-store-ops-metrics">
                        <article class="admin-metric-card"><span>Fulfilled Today</span><strong data-store-ops-metric="fulfilled_today">0</strong><small>Completed fulfillment rows</small></article>
                        <article class="admin-metric-card"><span>Active Claims</span><strong data-store-ops-metric="active_claims">0</strong><small>Currently owned orders</small></article>
                        <article class="admin-metric-card"><span>Avg Fulfillment</span><strong data-store-ops-metric="average_fulfillment_label">0s</strong><small>Claim to fulfilled</small></article>
                        <article class="admin-metric-card"><span>Scan Errors</span><strong data-store-ops-metric="scan_errors">0</strong><small>Rejected or wrong scans</small></article>
                        <article class="admin-metric-card"><span>Throughput</span><strong data-store-ops-throughput>0</strong><small data-store-ops-throughput-detail>No fulfilled orders yet</small></article>
                    </section>

                    <section class="admin-panel admin-panel-wide admin-store-ops-filter-panel">
                        <form class="admin-store-ops-filter-grid" data-store-ops-filters>
                            <label>
                                <span>Date From</span>
                                <input type="date" name="date_from" data-store-ops-date-from>
                            </label>
                            <label>
                                <span>Date To</span>
                                <input type="date" name="date_to" data-store-ops-date-to>
                            </label>
                            <label>
                                <span>Employee</span>
                                <select name="employees" multiple data-store-ops-employees></select>
                            </label>
                            <label>
                                <span>Source</span>
                                <input type="search" name="source" placeholder="shopee, tiktok, partner" data-store-ops-source>
                            </label>
                            <label>
                                <span>Order ID</span>
                                <input type="search" name="q" placeholder="SPX, PARTNER..." data-store-ops-query>
                            </label>
                            <div class="admin-store-ops-status-controls" data-store-ops-status-controls>
                                <span>Status</span>
                                <button type="button" class="admin-toggle-pill is-active" data-status-value="">All</button>
                                <button type="button" class="admin-toggle-pill" data-status-value="CLAIMED">Claimed</button>
                                <button type="button" class="admin-toggle-pill" data-status-value="SCAN_IN_PROGRESS">Scanning</button>
                                <button type="button" class="admin-toggle-pill" data-status-value="SCAN_COMPLETED">Scan Done</button>
                                <button type="button" class="admin-toggle-pill" data-status-value="LABEL_PRINTED">Printed</button>
                                <button type="button" class="admin-toggle-pill" data-status-value="FULFILLED">Fulfilled</button>
                            </div>
                            <div class="admin-store-ops-filter-actions">
                                <button type="submit" class="admin-primary-btn">Apply</button>
                                <button type="button" class="admin-ghost-btn" data-store-ops-reset>Reset</button>
                            </div>
                        </form>
                    </section>

                    <section class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Orders</span>
                                <h3>Fulfillment log</h3>
                                <span class="admin-panel-meta" data-store-ops-table-meta>Newest activity first</span>
                            </div>
                        </div>
                        <div class="admin-table-wrap admin-store-ops-table-wrap">
                            <table class="admin-table admin-store-ops-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Source</th>
                                        <th>Status</th>
                                        <th>Employee</th>
                                        <th>Claimed</th>
                                        <th>Scan Complete</th>
                                        <th>Label Print</th>
                                        <th>Fulfilled</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody data-store-ops-table-body>
                                    <tr><td colspan="9" class="admin-empty">Loading Store Ops activity.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
        </div>

        <div class="admin-modal-shell admin-store-ops-drawer" data-store-ops-drawer hidden>
            <div class="admin-modal-backdrop" data-store-ops-drawer-close></div>
            <aside class="admin-modal-card admin-store-ops-drawer-card" role="dialog" aria-modal="true" aria-labelledby="store-ops-drawer-title">
                <div class="admin-modal-head">
                    <div>
                        <span class="admin-panel-kicker">Timeline</span>
                        <h3 id="store-ops-drawer-title" data-store-ops-drawer-title>Order</h3>
                    </div>
                    <button type="button" class="admin-ghost-btn" data-store-ops-drawer-close>Close</button>
                </div>
                <div class="admin-event-feed admin-store-ops-events" data-store-ops-events>
                    <p class="admin-empty">Select an order.</p>
                </div>
            </aside>
        </div>
    </div>

    <script src="../store-ops.js?v=<?php echo urlencode($storeOpsJsVersion ?: '1'); ?>" defer></script>
</body>
</html>
