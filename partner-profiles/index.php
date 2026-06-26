<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$partnerAccessCssVersion = (string) @filemtime(dirname(__DIR__) . '/partner-access.css');
$profilesJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-profiles.js');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="minimal-black">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Profiles | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="../partner-access.css?v=<?php echo urlencode($partnerAccessCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-suite" data-partner-profiles data-partners-endpoint="../api/partners/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('partner'); ?>

            <div class="admin-shell-main">
                <main class="admin-layout partner-profiles-page">
                    <section class="partner-directory-toolbar">
                        <div class="partner-directory-title">
                            <span>Partner Profiles</span>
                            <strong data-partner-count>0</strong>
                        </div>
                        <label class="partner-directory-search">
                            <span>Search</span>
                            <input type="search" placeholder="Name, code, brand, SKU" data-partner-search>
                        </label>
                        <div class="partner-directory-actions">
                            <a class="admin-ghost-btn admin-link-btn" href="../partner-program/">Partner Program</a>
                            <button type="button" class="admin-primary-btn" data-open-partner-modal>Add Partner</button>
                        </div>
                    </section>

                    <section class="partner-directory-metrics">
                        <div>
                            <strong data-partner-brand-total>0</strong>
                            <span>Brands</span>
                        </div>
                        <div>
                            <strong data-partner-product-total>0</strong>
                            <span>Products</span>
                        </div>
                        <div>
                            <strong data-partner-sku-total>0</strong>
                            <span>SKU links</span>
                        </div>
                    </section>

                    <section class="partner-directory-shell">
                        <div class="partner-directory-list-head">
                            <span>Partner</span>
                            <span>Access</span>
                            <span>Brands</span>
                            <span></span>
                        </div>
                        <div class="partner-directory-list" data-partner-list>
                            <div class="admin-empty">No partners.</div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    </div>

    <div class="admin-modal-shell" data-partner-modal hidden>
        <div class="admin-modal-backdrop" data-close-partner-modal></div>
        <div class="admin-modal-card admin-modal-card-partner" role="dialog" aria-modal="true" aria-labelledby="partner-modal-title">
            <div class="admin-modal-head partner-create-head">
                <span id="partner-modal-title">Create partner</span>
                <button type="button" class="admin-ghost-btn" data-close-partner-modal>Close</button>
            </div>
            <form class="admin-affiliate-form" data-partner-form>
                <section class="partner-create-identity">
                    <label>
                        <span>Name</span>
                        <input type="text" name="name" maxlength="160" placeholder="Baggos" required>
                    </label>
                    <label>
                        <span>Slug</span>
                        <input type="text" name="partner_slug" maxlength="160" placeholder="baggosmedia">
                    </label>
                    <label>
                        <span>Password</span>
                        <div class="admin-inline-input">
                            <input type="text" name="portal_password" maxlength="160" placeholder="Portal login password" autocomplete="new-password" required>
                            <button type="button" class="admin-ghost-btn" data-generate-portal-password>Generate</button>
                        </div>
                    </label>
                    <label>
                        <span>Notes</span>
                        <input type="text" name="notes" maxlength="300" placeholder="Optional">
                    </label>
                </section>
                <section class="partner-access-shell" data-partner-access-shell>
                    <div class="partner-access-steps" data-partner-steps>
                        <article class="partner-access-step is-active" data-partner-step-indicator="brands">
                            <span class="partner-access-step-index">01</span>
                            <strong>Brand</strong>
                        </article>
                        <article class="partner-access-step" data-partner-step-indicator="products">
                            <span class="partner-access-step-index">02</span>
                            <strong>Access</strong>
                        </article>
                    </div>

                    <section class="partner-access-card" data-partner-step-panel="brands">
                        <div class="partner-access-card-head">
                            <div>
                                <span class="partner-access-question-index">Brands</span>
                            </div>
                        </div>
                        <label class="partner-access-search">
                            <span>Search brands</span>
                            <input type="search" placeholder="Filter brands" data-brand-search>
                        </label>
                        <div class="partner-access-choice-grid" data-brand-choice-grid>
                            <div class="partner-access-empty">Loading brands.</div>
                        </div>
                        <div class="partner-access-actions">
                            <button type="button" class="admin-primary-btn" data-partner-next-step="products">Continue</button>
                        </div>
                    </section>

                    <section class="partner-access-card" data-partner-step-panel="products" hidden>
                        <div class="partner-access-card-head">
                            <div>
                                <span class="partner-access-question-index">Products / SKUs</span>
                            </div>
                        </div>
                        <label class="partner-access-search">
                            <span>Search products</span>
                            <input type="search" placeholder="Filter products" data-product-search>
                        </label>
                        <div class="partner-access-choice-grid" data-product-choice-grid>
                            <div class="partner-access-empty">Select a brand.</div>
                        </div>
                        <div class="partner-access-actions">
                            <button type="button" class="admin-ghost-btn" data-partner-prev-step="brands">Back</button>
                        </div>
                    </section>

                    <section class="partner-access-summary">
                        <div class="partner-access-summary-grid">
                            <article class="partner-access-summary-card">
                                <span>Brands</span>
                                <strong data-partner-brand-summary>0</strong>
                            </article>
                            <article class="partner-access-summary-card">
                                <span>Products</span>
                                <strong data-partner-product-summary>0</strong>
                            </article>
                            <article class="partner-access-summary-card">
                                <span>SKU links</span>
                                <strong data-partner-sku-summary>0</strong>
                            </article>
                        </div>
                        <div class="partner-access-tag-list" data-partner-selected-skus>
                            <div class="partner-access-empty">No SKU links.</div>
                        </div>
                    </section>

                    <section class="partner-pricing-editor">
                        <div class="partner-access-card-head">
                            <div>
                                <span class="partner-access-question-index">Pricing</span>
                            </div>
                        </div>
                        <div class="partner-pricing-list" data-partner-pricing-list>
                            <div class="partner-access-empty">No prices.</div>
                        </div>
                    </section>
                </section>
                <p class="admin-form-error" data-partner-form-error hidden></p>
                <div class="admin-modal-actions">
                    <button type="button" class="admin-ghost-btn" data-close-partner-modal>Cancel</button>
                    <button type="submit" class="admin-primary-btn" data-partner-gated-action>Create Partner</button>
                </div>
            </form>
        </div>
    </div>

    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
    <script type="module" src="../partner-profiles.js?v=<?php echo urlencode($profilesJsVersion ?: '1'); ?>"></script>
</body>
</html>
