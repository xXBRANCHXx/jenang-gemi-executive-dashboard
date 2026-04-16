<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$partnerCode = trim((string) ($_GET['code'] ?? ''));
$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$profileJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-profile.js');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Profile | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app" data-partner-profile data-partners-endpoint="../api/partners/" data-partner-code="<?php echo htmlspecialchars($partnerCode, ENT_QUOTES); ?>">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <header class="admin-topbar">
            <div class="admin-topbar-brand">
                <span class="admin-chip">Partner Profile</span>
                <h1>Edit Partner Profile</h1>
                <p>Update company assignment, product access, pricing agreements, and partner portal path here.</p>
            </div>
            <div class="admin-topbar-actions">
                <div class="admin-view-indicator">Partner Profile</div>
                <div class="admin-menu-shell" data-menu-shell>
                    <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                    <div class="admin-menu-panel" data-menu-panel hidden>
                        <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="home">Home Dashboard</a>
                        <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="website">Official Website Dashboard</a>
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
                    <span class="admin-chip admin-chip-accent" data-partner-code-badge>Partner</span>
                    <h2 data-partner-name>Loading partner profile</h2>
                    <p>Companies are the brands. Product access and pricing here decide exactly which Jenang Gemi products and sizes the partner can sell.</p>
                </div>
            </section>

            <section class="admin-panel admin-panel-affiliates">
                <div class="admin-panel-head">
                    <div>
                        <span class="admin-panel-kicker">Profile Settings</span>
                        <h3>Edit partner profile</h3>
                    </div>
                </div>
                <form class="admin-affiliate-editor" data-profile-form hidden>
                    <input type="hidden" name="code">
                    <label class="admin-affiliate-field">
                        <span class="admin-control-label">Partner name</span>
                        <input type="text" name="name" maxlength="160" required>
                    </label>
                    <label class="admin-affiliate-field">
                        <span class="admin-control-label">Partner page slug</span>
                        <input type="text" name="partner_slug" maxlength="160">
                    </label>
                    <fieldset class="admin-affiliate-platforms" data-company-section="Jenang Gemi">
                        <legend>Companies</legend>
                        <div class="admin-affiliate-platform-grid">
                            <label><input type="checkbox" name="companies[]" value="Jenang Gemi"> <span>Jenang Gemi</span></label>
                            <label><input type="checkbox" name="companies[]" value="ZERO"> <span>ZERO</span></label>
                            <label><input type="checkbox" name="companies[]" value="ZFIT"> <span>ZFIT</span></label>
                        </div>
                    </fieldset>
                    <fieldset class="admin-affiliate-platforms" data-company-section="Jenang Gemi">
                        <legend>Jenang Gemi product access</legend>
                        <div class="admin-affiliate-platform-grid">
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][enabled]" value="1"> <span>Enable Bubur</span></label>
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][sizes][]" value="15 Sachet"> <span>15 Sachet</span></label>
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][sizes][]" value="30 Sachet"> <span>30 Sachet</span></label>
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][sizes][]" value="60 Sachet"> <span>60 Sachet</span></label>
                        </div>
                        <div class="admin-affiliate-platform-grid">
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][enabled]" value="1"> <span>Enable Jamu</span></label>
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][sizes][]" value="15 Sachet"> <span>15 Sachet</span></label>
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][sizes][]" value="30 Sachet"> <span>30 Sachet</span></label>
                            <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][sizes][]" value="60 Sachet"> <span>60 Sachet</span></label>
                        </div>
                    </fieldset>
                    <fieldset class="admin-affiliate-platforms">
                        <legend>Jenang Gemi pricing agreement</legend>
                        <div class="admin-sku-form-grid">
                            <label><span>Bubur 15 Sachet</span><input type="number" name="pricing[Jenang Gemi][Bubur][15 Sachet]" min="0" step="0.01"></label>
                            <label><span>Bubur 30 Sachet</span><input type="number" name="pricing[Jenang Gemi][Bubur][30 Sachet]" min="0" step="0.01"></label>
                            <label><span>Bubur 60 Sachet</span><input type="number" name="pricing[Jenang Gemi][Bubur][60 Sachet]" min="0" step="0.01"></label>
                            <label><span>Jamu 15 Sachet</span><input type="number" name="pricing[Jenang Gemi][Jamu][15 Sachet]" min="0" step="0.01"></label>
                            <label><span>Jamu 30 Sachet</span><input type="number" name="pricing[Jenang Gemi][Jamu][30 Sachet]" min="0" step="0.01"></label>
                            <label><span>Jamu 60 Sachet</span><input type="number" name="pricing[Jenang Gemi][Jamu][60 Sachet]" min="0" step="0.01"></label>
                        </div>
                    </fieldset>
                    <p class="admin-table-note" data-company-empty-state hidden>Select a company above to configure product access and pricing for that company.</p>
                    <label class="admin-affiliate-field">
                        <span class="admin-control-label">Notes</span>
                        <input type="text" name="notes" maxlength="300">
                    </label>
                    <p class="admin-form-error" data-profile-error hidden></p>
                    <div class="admin-affiliate-actions">
                        <button type="submit" class="admin-primary-btn">Save Profile</button>
                    </div>
                </form>
            </section>

            <section class="admin-panel admin-panel-affiliates">
                <div class="admin-panel-head">
                    <div>
                        <span class="admin-panel-kicker">Portal Details</span>
                        <h3>Partner login and destination</h3>
                    </div>
                </div>
                <div class="admin-note-stack">
                    <div class="admin-note-card"><strong>Partner Code</strong><span data-note-code>Pending</span></div>
                    <div class="admin-note-card"><strong>Partner URL</strong><span data-note-url>Pending</span></div>
                    <div class="admin-note-card"><strong>Login Hint</strong><span>The partner can use the profile code and their registered name to sign in on `partner.jenanggemi.com`.</span></div>
                </div>
            </section>

            <div class="admin-bottom-actions">
                <a class="admin-ghost-btn admin-link-btn" href="../partner-profiles/">Return To Partner Profiles</a>
                <a class="admin-primary-btn admin-link-btn" href="https://partner.jenanggemi.com" target="_blank" rel="noopener">Open Partner Portal</a>
            </div>
        </main>
    </div>

    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
    <script type="module" src="../partner-profile.js?v=<?php echo urlencode($profileJsVersion ?: '1'); ?>"></script>
</body>
</html>
