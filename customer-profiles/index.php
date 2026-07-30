<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageCssVersion = (string) @filemtime(__DIR__ . '/customer-profiles.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/customer-profiles.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <title>Repeat Customers | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('customers'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="./customer-profiles.css?v=<?php echo urlencode($pageCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-customer-profiles-page">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.93.1</div>
    <div class="admin-app admin-app-suite" data-customer-profiles data-endpoint="../api/customer-profiles/">
        <div class="admin-shell">
            <?php render_admin_sidebar('customers'); ?>
            <div class="admin-shell-main customer-profiles-page">
                <header class="admin-topbar customer-profiles-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand"><span class="admin-panel-kicker">Customer intelligence</span><h1>Repeat Customers</h1></div>
                    </div>
                    <?php render_admin_topbar_actions('customers'); ?>
                </header>

                <main class="customer-profiles-layout">
                    <section class="customer-profiles-toolbar" aria-label="Customer profile data status">
                        <p><strong>All recorded order history</strong><span>Shopee, TikTok, website, WhatsApp, and walk-in</span></p>
                        <div class="customer-profiles-freshness"><span class="customer-live-dot"></span><strong data-profile-freshness>Loading live order history…</strong><button type="button" data-profile-refresh>Refresh</button></div>
                    </section>

                    <section class="customer-kpi-grid" aria-label="Repeat customer metrics">
                        <article><span>Profiled customers</span><strong data-profile-kpi="customers">—</strong><small>Customers with a usable identity</small></article>
                        <article><span>Repeat customers</span><strong data-profile-kpi="repeat_customers">—</strong><small>At least 2 recorded orders</small></article>
                        <article class="is-accent"><span>Repeat rate</span><strong data-profile-kpi="repeat_rate">—</strong><small>Repeat customers ÷ profiled customers</small></article>
                        <article><span>Repeat revenue share</span><strong data-profile-kpi="repeat_revenue_share">—</strong><small>Revenue from returning profiles</small></article>
                        <article><span>Cross-channel</span><strong data-profile-kpi="cross_channel_customers">—</strong><small>Customers active in 2+ channels</small></article>
                    </section>

                    <section class="customer-profile-grid">
                        <article class="customer-profile-panel customer-segment-panel">
                            <div class="customer-panel-head"><div><span>Lifecycle depth</span><h3>Customer segments</h3></div><small>Based on order frequency</small></div>
                            <div class="customer-segment-list" data-profile-segments><p class="admin-empty">Loading segments…</p></div>
                        </article>
                        <article class="customer-profile-panel customer-channel-panel">
                            <div class="customer-panel-head"><div><span>Channel mix</span><h3>Where customers return</h3></div><small>Orders and repeat customers</small></div>
                            <div class="customer-channel-list" data-profile-channels><p class="admin-empty">Loading channels…</p></div>
                        </article>
                    </section>

                    <section class="customer-profile-panel customer-directory-panel">
                        <div class="customer-directory-head">
                            <div><span class="admin-panel-kicker">Profiles</span><h3>Customer directory</h3><p data-profile-table-status>Loading profiles from all recorded channels…</p></div>
                            <div class="customer-directory-controls">
                                <label><span>Search</span><input type="search" data-profile-search placeholder="Name, phone, product, channel"></label>
                                <label><span>Segment</span><select data-profile-segment-filter><option value="">All segments</option><option value="new">New</option><option value="returning">Returning</option><option value="loyal">Loyal</option><option value="champion">Champion</option></select></label>
                                <label><span>Channel</span><select data-profile-channel-filter><option value="">All channels</option></select></label>
                                <label class="customer-repeat-toggle"><input type="checkbox" data-profile-repeat-only><span>Repeat only</span></label>
                            </div>
                        </div>
                        <div class="customer-profile-table-wrap">
                            <table class="customer-profile-table">
                                <thead><tr><th>Customer</th><th>Profile</th><th>Orders</th><th>Revenue</th><th>AOV</th><th>Channels</th><th>Favorite product</th><th>Last order</th></tr></thead>
                                <tbody data-profile-table><tr><td colspan="8" class="admin-empty">Loading customer profiles…</td></tr></tbody>
                            </table>
                        </div>
                    </section>

                    <section class="customer-definition-note">
                        <strong>How matching works</strong>
                        <p data-profile-definition>Phone number links customers across channels. Without a phone, a name or marketplace username only links orders inside the same channel to avoid false matches.</p>
                        <span data-profile-unattributed></span>
                    </section>
                </main>
            </div>
        </div>
    </div>
    <script src="../admin-chrome.js?v=<?php echo urlencode((string) @filemtime(dirname(__DIR__) . '/admin-chrome.js')); ?>"></script>
    <script src="./customer-profiles.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
