<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="minimal-black">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Program | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.48.9</div>
    <div class="admin-app admin-app-suite" data-partner-dashboard>
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('partner'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Partner Program</span>
                        <h1>Jenang Gemi Partner Program</h1>
                        <p>Manage partner profiles, pricing agreements, company access, and the live registry used by `partner.jenanggemi.com`.</p>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-view-indicator">Partner Program</div>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                            <div class="admin-menu-panel" data-menu-panel hidden>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=overview" data-dashboard-view-link="overview">Executive Sales Overview</a>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=campaigns" data-dashboard-view-link="home">Campaigns Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=website" data-dashboard-view-link="website">Official Website Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../back-dash/">API Ingest Workspace</a>
                                <a class="admin-menu-item admin-link-btn" href="../partner-program/">Partner Program Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../partner-profiles/">Partner Profiles</a>
                                <button type="button" class="admin-menu-item" data-theme-toggle>Toggle Theme</button>
                                <a class="admin-menu-item admin-link-btn" href="../logout/">Lock Dashboard</a>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="admin-layout">
            <section class="admin-hero-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip admin-chip-accent">Dropshipper Control Layer</span>
                    <h2>Keep partner management inside the executive dashboard while the partner-facing dashboard runs on its own subdomain.</h2>
                    <p>Profiles created here are exposed to the partner portal through the live partner registry API, and partner-created orders now flow into Store Ops as live listed orders.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Registry Enabled</span>
                    </div>
                    <a class="admin-primary-btn admin-link-btn" href="../partner-profiles/">Open Partner Profiles</a>
                </div>
            </section>

            <section class="admin-metric-grid">
                <article class="admin-metric-card"><span>Profiles</span><strong>Live</strong><small>Create and edit partner records</small></article>
                <article class="admin-metric-card"><span>Companies</span><strong>Live</strong><small>Jenang Gemi, ZERO, ZFIT assignment</small></article>
                <article class="admin-metric-card"><span>Pricing</span><strong>Live</strong><small>Per-partner agreement fields</small></article>
                <article class="admin-metric-card"><span>Store Ops Feed</span><strong>Live</strong><small>Partner orders enter fulfillment as IS_LISTED</small></article>
            </section>

            <section class="admin-main-grid">
                <article class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Profiles</span>
                            <h3>Partner management</h3>
                        </div>
                    </div>
                    <div class="admin-bottom-actions">
                        <a class="admin-primary-btn admin-link-btn" href="../partner-profiles/">Open Profiles</a>
                    </div>
                </article>

                <article class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Portal</span>
                            <h3>Partner-facing environment</h3>
                        </div>
                    </div>
                    <p class="admin-table-note">The partner portal uses these profiles for login and catalog restrictions; submitted partner orders are picked up by Store Ops from the shared partner data database.</p>
                    <div class="admin-bottom-actions">
                        <a class="admin-ghost-btn admin-link-btn" href="https://partner.jenanggemi.com" target="_blank" rel="noopener">Open Partner Portal</a>
                    </div>
                </article>
            </section>
                </main>
            </div>
        </div>
    </div>

    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
</body>
</html>
