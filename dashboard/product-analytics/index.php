<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../', true, 302);
    exit;
}

$slug = static function (mixed $value): string {
    $clean = strtolower(trim((string) preg_replace('/[^a-z0-9]+/i', '-', (string) $value), '-'));
    return substr($clean, 0, 80);
};
$product = $slug($_GET['product'] ?? 'syrup') ?: 'syrup';
$dimension = strtolower(trim((string) ($_GET['dimension'] ?? 'product')));
if (!in_array($dimension, ['product', 'flavor', 'volume', 'sku'], true)) {
    $dimension = 'product';
}
$flavor = $slug($_GET['flavor'] ?? '');
$volume = $slug($_GET['volume'] ?? '');
$productLabel = ucwords(str_replace('-', ' ', $product));
$buildVersion = 'product-analytics-1.0.0';
$cssVersion = $buildVersion . '-' . (string) @filemtime(__DIR__ . '/product-analytics.css');
$jsVersion = $buildVersion . '-' . (string) @filemtime(__DIR__ . '/product-analytics.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?> sales analytics</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('home'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="../../admin.css">
    <link rel="stylesheet" href="./product-analytics.css?v=<?php echo urlencode($cssVersion); ?>">
</head>
<body class="product-analytics-body">
    <main
        class="product-analytics-page"
        data-product-analytics
        data-product="<?php echo htmlspecialchars($product, ENT_QUOTES); ?>"
        data-dimension="<?php echo htmlspecialchars($dimension, ENT_QUOTES); ?>"
        data-flavor="<?php echo htmlspecialchars($flavor, ENT_QUOTES); ?>"
        data-volume="<?php echo htmlspecialchars($volume, ENT_QUOTES); ?>"
        data-endpoint="../../api/orders/"
    >
        <header class="product-analytics-topbar">
            <a class="admin-back-icon-link product-analytics-back" href="../product-flavors/?product=<?php echo urlencode($product); ?>" data-back aria-label="Back to <?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?> breakdown" title="Back to breakdown">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>
            </a>
            <div class="product-analytics-heading">
                <nav aria-label="Breadcrumb"><a href="../product-flavors/?product=<?php echo urlencode($product); ?>"><?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?></a><span>/</span><span data-dimension-label>Sales intelligence</span></nav>
                <h1 data-page-title><?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?> analytics</h1>
                <p data-page-subtitle>Loading the complete product history and sales mix…</p>
            </div>
            <div class="product-analytics-actions">
                <span class="product-analytics-status" data-load-status aria-live="polite"><i aria-hidden="true"></i><span>Loading…</span></span>
                <button type="button" class="product-analytics-icon-button" data-theme-toggle aria-label="Switch color mode" title="Switch color mode">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6.5 6.5 0 1 0 9 9 8 8 0 1 1-9-9z"/></svg>
                </button>
                <button type="button" class="product-analytics-export" data-export>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/></svg>
                    Export
                </button>
            </div>
        </header>

        <section class="product-analytics-controls" aria-label="Analytics controls">
            <div class="product-analytics-control">
                <span>History</span>
                <div class="product-analytics-segment" data-scope-controls>
                    <button type="button" data-scope="year">This year</button>
                    <button type="button" class="is-active" data-scope="all">All time</button>
                    <button type="button" data-scope="custom">Custom</button>
                </div>
            </div>
            <form class="product-analytics-date-form" data-date-form hidden>
                <label>From <input type="date" data-start-date required></label>
                <span aria-hidden="true">→</span>
                <label>To <input type="date" data-end-date required></label>
                <button type="submit">Apply</button>
            </form>
            <div class="product-analytics-control is-metric">
                <span>Chart metric</span>
                <div class="product-analytics-segment" data-metric-controls>
                    <button type="button" class="is-active" data-metric="quantity">Units</button>
                    <button type="button" data-metric="revenue">Revenue</button>
                </div>
            </div>
        </section>

        <div class="product-analytics-content" data-content hidden>
            <section class="product-analytics-kpis" aria-label="Performance summary" data-kpis></section>

            <section class="product-analytics-hero" aria-labelledby="sales-history-title">
                <div class="product-analytics-section-heading">
                    <div><span>Actual + run rate</span><h2 id="sales-history-title">Monthly sales pace</h2></div>
                    <div class="product-analytics-chart-legend" aria-label="Chart legend"><span class="is-actual"><i></i>Actual to date</span><span class="is-forecast"><i></i>Projected month-end</span></div>
                </div>
                <div class="product-analytics-chart-wrap">
                    <canvas data-history-chart role="img" aria-label="Monthly actual and predicted sales chart"></canvas>
                    <div class="product-analytics-tooltip" data-chart-tooltip hidden></div>
                </div>
                <p class="product-analytics-method" data-forecast-method></p>
            </section>

            <section class="product-analytics-grid" aria-label="Sales mix breakdowns">
                <article class="product-analytics-panel">
                    <div class="product-analytics-section-heading"><div><span>Product mix</span><h2>Flavor breakdown</h2></div></div>
                    <div class="product-analytics-ranking" data-flavor-breakdown></div>
                </article>
                <article class="product-analytics-panel">
                    <div class="product-analytics-section-heading"><div><span>Pack size</span><h2>Volume breakdown</h2></div></div>
                    <div class="product-analytics-ranking" data-volume-breakdown></div>
                </article>
                <article class="product-analytics-panel">
                    <div class="product-analytics-section-heading"><div><span>Where it sells</span><h2>Platform breakdown</h2></div></div>
                    <div class="product-analytics-ranking" data-platform-breakdown></div>
                </article>
                <article class="product-analytics-panel">
                    <div class="product-analytics-section-heading"><div><span>Who sells it</span><h2>Partner breakdown</h2></div></div>
                    <div class="product-analytics-ranking" data-partner-breakdown></div>
                </article>
                <article class="product-analytics-panel is-wide">
                    <div class="product-analytics-section-heading"><div><span>Marketplace identities</span><h2>Shopee &amp; TikTok by account</h2></div><p>Tokopedia sales are grouped under the TikTok platform family.</p></div>
                    <div class="product-analytics-ranking is-account-grid" data-account-breakdown></div>
                </article>
            </section>

            <section class="product-analytics-history" aria-labelledby="monthly-change-title">
                <div class="product-analytics-section-heading">
                    <div><span>Every period</span><h2 id="monthly-change-title">Monthly increase &amp; decrease</h2></div>
                    <p>The current month projection is separated from recorded sales.</p>
                </div>
                <div class="product-analytics-table-scroll">
                    <table>
                        <thead><tr><th>Month</th><th>Units</th><th>Unit change</th><th>Revenue</th><th>Revenue change</th><th>Status</th></tr></thead>
                        <tbody data-history-body></tbody>
                    </table>
                </div>
            </section>
        </div>

        <section class="product-analytics-empty" data-empty hidden>
            <strong>No sales found for this selection</strong>
            <p>Try All time, choose another flavor or volume, or return to the product sheet.</p>
            <a href="../product-flavors/?product=<?php echo urlencode($product); ?>">Return to <?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?> breakdown</a>
        </section>
    </main>
    <script src="./product-analytics.js?v=<?php echo urlencode($jsVersion); ?>" defer></script>
</body>
</html>
