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
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Program | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-light.svg" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-dark.svg" media="(prefers-color-scheme: dark)">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-partner-program-page">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.48.11</div>
    <div class="admin-app admin-app-suite" data-partner-dashboard>
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('partner'); ?>

            <div class="admin-shell-main partner-program-page">
                <div class="partner-program-tools" aria-label="Dashboard tools">
                    <?php render_admin_topbar_actions(); ?>
                </div>
                <main class="partner-program-landing" aria-labelledby="partner-program-title">
                    <section class="partner-program-intro">
                        <h1 id="partner-program-title">Jenang Gemi Partner Program</h1>
                        <p>Partners are people who sell Jenang Gemi. Use Partner Profiles to add them or change what they can sell. Use Partner Portal to see the place partners log in and make orders.</p>
                        <div class="partner-program-actions">
                            <a class="admin-primary-btn admin-link-btn" href="../partner-profiles/">Partner Profiles</a>
                            <a class="admin-ghost-btn admin-link-btn" href="https://partner.jenanggemi.com" target="_blank" rel="noopener">Partner Portal</a>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    </div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
</body>
</html>
