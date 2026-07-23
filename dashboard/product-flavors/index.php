<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../', true, 302);
    exit;
}

$productKey = strtolower(trim((string) ($_GET['product'] ?? 'syrup')));
$products = [
    'syrup' => 'Syrup',
    'drops' => 'Drops',
    'bubur' => 'Bubur',
];
if (!isset($products[$productKey])) {
    $productKey = 'syrup';
}
$productLabel = $products[$productKey];
$buildVersion = 'flavor-detail-1.1.0';
$cssVersion = $buildVersion . '-' . (string) @filemtime(__DIR__ . '/product-flavors.css');
$jsVersion = $buildVersion . '-' . (string) @filemtime(__DIR__ . '/product-flavors.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?> flavor breakdown</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('home'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="../../admin.css">
    <link rel="stylesheet" href="./product-flavors.css?v=<?php echo urlencode($cssVersion); ?>">
</head>
<body class="product-flavor-body">
    <main
        class="product-flavor-page"
        data-product-flavor-page
        data-product="<?php echo htmlspecialchars($productKey, ENT_QUOTES); ?>"
        data-product-label="<?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?>"
        data-endpoint="../../api/orders/"
    >
        <header class="product-flavor-topbar">
            <a class="product-flavor-close" href="../?view=overview#flavor-share" data-close-detail aria-label="Close flavor breakdown">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>
            </a>
            <div class="product-flavor-title">
                <span>Product sales detail</span>
                <h1><?php echo htmlspecialchars($productLabel, ENT_QUOTES); ?> flavor breakdown</h1>
                <p>Flavor performance across every sold volume, arranged as a clean time-based sheet.</p>
            </div>
            <div class="product-flavor-live-status" aria-live="polite">
                <i aria-hidden="true"></i>
                <span data-load-status>Loading sales…</span>
            </div>
        </header>

        <section class="product-flavor-controls" aria-label="Breakdown controls">
            <div class="product-flavor-control-group">
                <span class="product-flavor-control-label">Period</span>
                <div class="product-flavor-segment" data-scope-controls>
                    <button type="button" class="is-active" data-scope="year">This year</button>
                    <button type="button" data-scope="all">All time</button>
                    <button type="button" data-scope="custom">Custom</button>
                </div>
            </div>
            <div class="product-flavor-control-group">
                <span class="product-flavor-control-label">Show by</span>
                <div class="product-flavor-segment" data-grain-controls>
                    <button type="button" data-grain="day">Day</button>
                    <button type="button" data-grain="week">Week</button>
                    <button type="button" class="is-active" data-grain="month">Month</button>
                </div>
            </div>
            <form class="product-flavor-date-range" data-date-form hidden>
                <label>From <input type="date" data-start-date required></label>
                <span aria-hidden="true">→</span>
                <label>To <input type="date" data-end-date required></label>
                <button type="submit">Apply</button>
            </form>
            <div class="product-flavor-control-group product-flavor-metric-control">
                <span class="product-flavor-control-label">Cells</span>
                <div class="product-flavor-segment" data-metric-controls>
                    <button type="button" class="is-active" data-metric="quantity">Units</button>
                    <button type="button" data-metric="revenue">Revenue</button>
                </div>
            </div>
            <button type="button" class="product-flavor-export" data-export-csv>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/></svg>
                Export CSV
            </button>
        </section>

        <section class="product-flavor-sheet" aria-labelledby="product-flavor-sheet-title">
            <div class="product-flavor-sheet-heading">
                <div>
                    <span data-sheet-eyebrow>Showing this year · grouped by month</span>
                    <h2 id="product-flavor-sheet-title">Flavor × volume</h2>
                </div>
                <div class="product-flavor-performance-guide">
                    <div aria-label="Performance bar legend">
                        <span class="is-up"><i aria-hidden="true"></i> Increase</span>
                        <span class="is-down"><i aria-hidden="true"></i> Decrease</span>
                        <span class="is-flat"><i aria-hidden="true"></i> No comparison</span>
                    </div>
                    <p>Bar color compares each cell with the previous period.</p>
                </div>
            </div>
            <div class="product-flavor-sheet-scroll" data-sheet-scroll>
                <table class="product-flavor-table">
                    <thead data-sheet-head></thead>
                    <tbody data-sheet-body>
                        <tr><td class="product-flavor-loading-cell">Preparing the breakdown…</td></tr>
                    </tbody>
                    <tfoot data-sheet-foot></tfoot>
                </table>
            </div>
            <div class="product-flavor-empty" data-empty-state hidden>
                <strong>No matching sales in this period</strong>
                <p>Try a wider date range or switch to All time.</p>
            </div>
        </section>
    </main>
    <script src="./product-flavors.js?v=<?php echo urlencode($jsVersion); ?>" defer></script>
</body>
</html>
