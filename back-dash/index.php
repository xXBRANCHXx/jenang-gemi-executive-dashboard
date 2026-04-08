<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
jg_admin_require_auth();

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Jenang Gemi Back-dash</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-lab">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <header class="admin-topbar">
            <div class="admin-topbar-brand">
                <span class="admin-chip admin-chip-accent">Experimental Sandbox</span>
                <h1>Jenang Gemi Back-dash</h1>
                <p>Isolated workspace for WhatsApp/API conversion tracking tests without disturbing the main executive dashboard.</p>
            </div>
            <div class="admin-topbar-actions">
                <a class="admin-ghost-btn admin-link-btn" href="../dashboard/">Back to Dashboard</a>
                <a class="admin-primary-btn admin-link-btn" href="../logout/">Lock Dashboard</a>
            </div>
        </header>

        <main class="admin-layout">
            <section class="admin-hero-panel admin-lab-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip">Safe for Experiments</span>
                    <h2>Use this page for trial integrations, webhook ideas, and WhatsApp conversion concepts.</h2>
                    <p>Nothing here needs to affect the production dashboard unless you decide it is worth keeping. Treat this as the quarantine zone for abandoned ideas, rough API tests, and temporary tracking prototypes.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Main dashboard remains separate</span>
                    </div>
                </div>
            </section>

            <section class="admin-main-grid">
                <article class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Sandbox Notes</span>
                            <h3>What this page is for</h3>
                        </div>
                    </div>
                    <div class="admin-note-stack">
                        <div class="admin-note-card"><strong>WhatsApp tests</strong><span>Try webhook flows, event reconciliation, message ID mapping, or post-checkout verification ideas here first.</span></div>
                        <div class="admin-note-card"><strong>Safe isolation</strong><span>If the experiment goes nowhere, this page can be left alone or removed later without touching the production dashboard flow.</span></div>
                        <div class="admin-note-card"><strong>Next step</strong><span>When you are ready, we can add dedicated panels, secret fields, API forms, log viewers, or webhook diagnostics here.</span></div>
                    </div>
                </article>
            </section>
        </main>
    </div>
</body>
</html>
