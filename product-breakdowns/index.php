<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/', true, 302);
    exit;
}

$buildVersion = 'product-breakdowns-1.0.0';
$cssVersion = $buildVersion . '-' . (string) @filemtime(__DIR__ . '/product-breakdowns.css');
$jsVersion = $buildVersion . '-' . (string) @filemtime(__DIR__ . '/product-breakdowns.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Product breakdowns</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('product-breakdowns'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap">
    <link rel="stylesheet" href="../admin.css">
    <link rel="stylesheet" href="./product-breakdowns.css?v=<?php echo urlencode($cssVersion); ?>">
</head>
<body class="product-catalog-body">
    <div class="admin-app admin-product-catalog-app">
        <div class="admin-shell">
            <?php render_admin_sidebar('product-breakdowns'); ?>

            <div class="admin-shell-main">
                <main
                    class="product-catalog-page"
                    data-product-catalog
                    data-endpoint="../api/orders/?action=product_breakdown_catalog"
                >
                    <header class="product-catalog-header">
                        <h1>Product breakdowns</h1>
                        <section class="product-catalog-search" aria-label="Search the product catalog">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4.5 4.5"/></svg>
                            <input
                                type="search"
                                data-catalog-search
                                placeholder="Search product, flavor, size, brand, tag, or SKU"
                                autocomplete="off"
                                aria-label="Search product, flavor, size, brand, tag, or SKU"
                            >
                            <button type="button" data-search-clear aria-label="Clear search" title="Clear search" hidden>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                            </button>
                        </section>
                        <div class="product-catalog-header-actions">
                            <span class="product-catalog-status" data-catalog-status aria-live="polite">Loading catalog</span>
                            <button type="button" class="product-catalog-icon-button" data-theme-toggle aria-label="Switch color mode" title="Switch color mode">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6.5 6.5 0 1 0 9 9 8 8 0 1 1-9-9z"/></svg>
                            </button>
                        </div>
                    </header>

                    <section class="product-catalog-summary" aria-label="Catalog totals" data-catalog-summary>
                        <div><strong>—</strong><span>Products</span></div>
                        <div><strong>—</strong><span>Flavors</span></div>
                        <div><strong>—</strong><span>Sizes</span></div>
                        <div><strong>—</strong><span>Variants</span></div>
                    </section>

                    <nav class="product-catalog-filters" aria-label="Breakdown type" data-catalog-filters>
                        <button type="button" class="is-active" data-result-type="all">All</button>
                        <button type="button" data-result-type="product">Products</button>
                        <button type="button" data-result-type="flavor">Flavors</button>
                        <button type="button" data-result-type="volume">Sizes</button>
                        <button type="button" data-result-type="variant">Exact variants</button>
                    </nav>

                    <section class="product-catalog-results-section" aria-labelledby="product-catalog-results-title">
                        <header>
                            <h2 id="product-catalog-results-title" data-results-title>All products</h2>
                            <span data-results-count>Loading</span>
                        </header>
                        <div class="product-catalog-results" data-catalog-results aria-live="polite">
                            <div class="product-catalog-loading">Loading SKU database…</div>
                        </div>
                        <button type="button" class="product-catalog-more" data-show-more hidden>Show more</button>
                    </section>

                    <section class="product-catalog-empty" data-catalog-empty hidden>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4.5 4.5"/></svg>
                        <strong>No matching breakdowns</strong>
                        <button type="button" data-empty-reset>Clear search</button>
                    </section>
                </main>
            </div>
        </div>
    </div>
    <script src="./product-breakdowns.js?v=<?php echo urlencode($jsVersion); ?>" defer></script>
</body>
</html>
