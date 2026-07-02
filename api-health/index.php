<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$apiHealthJsVersion = (string) @filemtime(dirname(__DIR__) . '/api-health.js');
$dashboardPrefetchYear = (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>API Health | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_favicons('api'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="prefetch" href="../api/sales/?year=<?php echo urlencode($dashboardPrefetchYear); ?>" as="fetch">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard">
    <div class="admin-app admin-app-suite" data-api-health data-api-health-endpoint="../api/api-health/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('api'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">API Health</span>
                        <h1>API Health</h1>
                        <p data-api-health-updated>Waiting for first check</p>
                    </div>
                    <div class="admin-topbar-actions admin-topbar-actions-status" data-admin-home-chrome>
                        <div class="admin-view-indicator" data-api-health-status>Checking</div>
                        <button type="button" class="admin-primary-btn" data-api-health-refresh>Run Checks</button>
                        <?php render_admin_topbar_action_buttons(); ?>
                    </div>
                </header>

                <main class="admin-layout">
                    <section class="admin-hero-panel">
                        <div class="admin-hero-copy">
                            <span class="admin-chip admin-chip-accent">Operational Visibility</span>
                            <h2>Live checks for Shopee ingest, Store Ops, and dashboard databases.</h2>
                            <p>Failures are logged with HTTP status, redacted URL, and response excerpts so API breakage is visible from the executive admin surface.</p>
                        </div>
                        <div class="admin-hero-actions">
                            <div class="admin-status-pill">
                                <span class="admin-status-dot" data-api-health-dot></span>
                                <span data-api-health-summary>Running checks</span>
                            </div>
                        </div>
                    </section>

                    <section class="admin-metric-grid">
                        <article class="admin-metric-card"><span>Checks</span><strong data-health-total>0</strong><small>Configured probes</small></article>
                        <article class="admin-metric-card"><span>Failing</span><strong data-health-failing>0</strong><small>Current failed checks</small></article>
                        <article class="admin-metric-card"><span>Logged Failures</span><strong data-health-logged>0</strong><small>Persisted recent incidents</small></article>
                        <article class="admin-metric-card"><span>Last Failure</span><strong data-health-last>None</strong><small>Most recent error log</small></article>
                    </section>

                    <section class="admin-main-grid admin-api-health-grid">
                        <article class="admin-panel admin-panel-wide">
                            <div class="admin-panel-head">
                                <div>
                                    <span class="admin-panel-kicker">Current Checks</span>
                                    <h3>API call status</h3>
                                </div>
                                <span class="admin-panel-meta">Auto-refreshes every 60 seconds</span>
                            </div>
                            <div class="admin-table-wrap">
                                <table class="admin-table admin-health-table">
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>Check</th>
                                            <th>HTTP</th>
                                            <th>Latency</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody data-api-health-checks>
                                        <tr><td colspan="5" class="admin-empty">Loading checks...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </article>

                        <article class="admin-panel admin-panel-wide">
                            <div class="admin-panel-head">
                                <div>
                                    <span class="admin-panel-kicker">Failure Log</span>
                                    <h3>Failed calls and responses</h3>
                                </div>
                                <span class="admin-panel-meta">Newest first</span>
                            </div>
                            <div class="admin-api-log" data-api-health-failures>
                                <p class="admin-empty">No failures logged.</p>
                            </div>
                        </article>
                    </section>
                </main>
            </div>
        </div>
    </div>
    <script>
        window.addEventListener('load', () => {
            window.fetch('../api/sales/?year=<?php echo urlencode($dashboardPrefetchYear); ?>', {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            }).catch(() => {});
        }, { once: true });
    </script>
    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../api-health.js?v=<?php echo urlencode($apiHealthJsVersion ?: '1'); ?>"></script>
</body>
</html>
