<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$partnerCode = trim((string) ($_GET['code'] ?? ''));
$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$partnerAccessCssVersion = (string) @filemtime(dirname(__DIR__) . '/partner-access.css');
$profileJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-profile.js');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Profile | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-light.svg" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-dark.svg" media="(prefers-color-scheme: dark)">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="../partner-access.css?v=<?php echo urlencode($partnerAccessCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-suite" data-partner-profile data-partners-endpoint="../api/partners/" data-partner-code="<?php echo htmlspecialchars($partnerCode, ENT_QUOTES); ?>">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('partner'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Partner Profile</span>
                        <h1>Partner Profile</h1>
                    </div>
                    <?php render_admin_topbar_actions(); ?>
                </header>
                <main class="admin-layout partner-profile-page">
                    <p class="admin-form-error partner-profile-error" data-profile-error hidden></p>

                    <form class="partner-profile-editor" data-profile-form hidden>
                        <input type="hidden" name="code">

                        <header class="partner-profile-editor-header">
                            <div>
                                <span class="partner-profile-kicker">Partner profile</span>
                                <h2 data-partner-name>Edit partner</h2>
                                <p data-partner-code-badge>Partner</p>
                            </div>
                            <div class="partner-profile-actions">
                                <a class="admin-ghost-btn admin-link-btn" href="../partner-profiles/">Back</a>
                                <a class="admin-ghost-btn admin-link-btn" href="https://partner.jenanggemi.com" target="_blank" rel="noopener" data-partner-portal-link>Open portal</a>
                                <button type="submit" class="admin-primary-btn" data-save-profile>Save profile</button>
                            </div>
                        </header>

                        <section class="partner-profile-stat-grid">
                            <article class="partner-profile-stat partner-profile-code-card">
                                <span>Partner code</span>
                                <div class="partner-profile-code-row">
                                    <input type="text" name="partner_code" maxlength="64" required>
                                    <button type="button" class="partner-profile-icon-btn" data-copy-partner-code aria-label="Copy partner code">Copy</button>
                                    <button type="button" class="partner-profile-icon-btn" data-regenerate-partner-code aria-label="Generate new partner code">New</button>
                                </div>
                            </article>
                            <article class="partner-profile-stat">
                                <span>Access</span>
                                <strong data-partner-access-count>0</strong>
                                <small>backend SKU links selected</small>
                            </article>
                            <article class="partner-profile-stat">
                                <span>Products</span>
                                <strong data-partner-product-count>0</strong>
                                <small data-partner-brand-count>across 0 brands</small>
                            </article>
                        </section>

                        <section class="partner-profile-workspace">
                            <aside class="partner-profile-panel partner-profile-left-rail">
                                <section class="partner-profile-section">
                                    <div class="partner-profile-panel-head">
                                        <span>Profile settings</span>
                                    </div>
                                    <div class="partner-profile-field-stack">
                                        <label>
                                            <span>Partner name</span>
                                            <input type="text" name="name" maxlength="160" required>
                                        </label>
                                        <label>
                                            <span>Partner page slug</span>
                                            <input type="text" name="partner_slug" maxlength="160">
                                        </label>
                                        <label>
                                            <span>Portal password</span>
                                            <div class="partner-profile-password-row">
                                                <input type="text" name="portal_password" maxlength="160" placeholder="Configured" autocomplete="new-password">
                                                <button type="button" class="partner-profile-icon-btn" data-generate-portal-password aria-label="Generate portal password">Key</button>
                                            </div>
                                            <button type="button" class="admin-ghost-btn" data-create-password-reset-key>Create one-time reset key</button>
                                            <small data-note-password>Not configured</small>
                                        </label>
                                        <label>
                                            <span>Notes</span>
                                            <input type="text" name="notes" maxlength="300" placeholder="Internal note">
                                        </label>
                                    </div>
                                </section>

                                <section class="partner-profile-section">
                                    <div class="partner-profile-panel-head">
                                        <span>Brand filter</span>
                                    </div>
                                    <div class="partner-profile-filter-list" data-brand-filter-list>
                                        <div class="partner-access-empty">Loading brands.</div>
                                    </div>
                                </section>
                            </aside>

                            <section class="partner-profile-panel partner-profile-sku-editor">
                                <div class="partner-profile-sku-head">
                                    <div>
                                        <span>Approved SKU access</span>
                                        <h3>Select what this partner can order</h3>
                                    </div>
                                    <label class="partner-profile-search">
                                        <span>Search SKU access</span>
                                        <input type="search" placeholder="Search SKU, product, flavor" data-sku-search>
                                    </label>
                                </div>

                                <div class="partner-profile-sku-layout">
                                    <nav class="partner-profile-product-list" data-product-filter-list>
                                        <div class="partner-access-empty">Select a brand filter.</div>
                                    </nav>
                                    <div class="partner-profile-sku-table-shell">
                                        <div class="partner-profile-sku-table-head">
                                            <span></span>
                                            <span>SKU</span>
                                            <span>Variant</span>
                                            <span>Unit</span>
                                            <span>Partner price</span>
                                        </div>
                                        <div class="partner-profile-sku-list" data-sku-list>
                                            <div class="partner-access-empty">Loading SKU records.</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="partner-profile-editor-footer">
                                    <span data-partner-selected-summary>Product toggles select all matching SKUs.</span>
                                    <button type="button" class="admin-ghost-btn" data-clear-selection>Clear selection</button>
                                </div>
                            </section>

                            <aside class="partner-profile-panel partner-profile-selected-rail">
                                <div class="partner-profile-panel-head partner-profile-selected-head">
                                    <div>
                                        <span>Selected access</span>
                                        <strong data-partner-selected-count>0</strong>
                                    </div>
                                    <small>backend SKU links</small>
                                </div>

                                <div class="partner-profile-selected-list" data-partner-selected-skus>
                                    <div class="partner-access-empty">Selected SKU links will show here.</div>
                                </div>

                                <div class="partner-profile-selected-footer">
                                    <div class="partner-profile-summary-lines">
                                        <span>Brands <strong data-partner-brand-summary>0</strong></span>
                                        <span>Products <strong data-partner-product-summary>0</strong></span>
                                        <span>Selected SKUs <strong data-partner-sku-summary>0</strong></span>
                                    </div>
                                    <span class="partner-profile-portal-note" data-note-url>Partner URL pending</span>
                                    <button type="submit" class="admin-primary-btn" data-save-profile>Save profile</button>
                                    <a class="admin-ghost-btn admin-link-btn" href="https://partner.jenanggemi.com" target="_blank" rel="noopener" data-partner-portal-link>Open partner portal</a>
                                    <button type="button" class="admin-danger-btn" data-delete-profile hidden>Delete partner</button>
                                </div>
                            </aside>
                        </section>

                        <div class="partner-profile-toast" data-profile-toast hidden>
                            <strong>Profile saved</strong>
                            <span>Partner access and pricing updated.</span>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    </div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
    <script type="module" src="../partner-profile.js?v=<?php echo urlencode($profileJsVersion ?: '1'); ?>"></script>
</body>
</html>
