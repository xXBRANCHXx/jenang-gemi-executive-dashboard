<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__, 2) . '/admin.css');
$pageCssVersion = (string) @filemtime(__DIR__ . '/expense-settings.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/expense-settings.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base href="/">
    <title>P&amp;L Expense Settings | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('profit-loss'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Space+Grotesk:wght@500;700&amp;display=swap">
    <link rel="stylesheet" href="/admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="/profit-and-loss/expense-settings/expense-settings.css?v=<?php echo urlencode($pageCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-profit-and-loss">
<div class="admin-app admin-app-suite" data-pnl-expense-page data-accounting-endpoint="/api/accounting/">
    <div class="admin-shell">
        <?php render_admin_sidebar('profit-loss'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar admin-finance-page-head">
                <div class="admin-topbar-brand">
                    <span class="admin-admin-mark">Profit &amp; Loss controls</span>
                    <h1>Expense settings</h1>
                    <p>Choose which Accounting operating expenses reduce Net Profit. Product and packing purchases stay reconciliation-only because Gross Profit uses sold-product COGS and fixed packing.</p>
                </div>
                <?php render_admin_topbar_actions('profit-loss'); ?>
            </header>

            <main class="pnl-expense-page">
                <nav class="pnl-expense-page-nav" aria-label="Profit and loss navigation">
                    <a href="/profit-and-loss/">← Back to Profit &amp; Loss</a>
                    <p data-expense-status>Loading Accounting categories…</p>
                </nav>

                <section class="pnl-expense-page-summary" aria-label="Category setting totals">
                    <article><span>Accounting categories</span><strong data-expense-total>0</strong></article>
                    <article class="is-included"><span>Included in Net Profit</span><strong data-expense-included>0</strong></article>
                    <article><span>Excluded</span><strong data-expense-excluded>0</strong></article>
                    <button type="button" data-expense-save disabled>Save changes</button>
                </section>

                <section class="pnl-expense-page-controls" aria-label="Find and filter categories">
                    <label class="pnl-expense-page-search">
                        <span>Find a category</span>
                        <input type="search" autocomplete="off" placeholder="Search name, English title, parent, or account code…" data-expense-search>
                    </label>
                    <label>
                        <span>Included?</span>
                        <select data-expense-inclusion-filter>
                            <option value="all">All categories</option>
                            <option value="included">Yes — included</option>
                            <option value="excluded">No — excluded</option>
                        </select>
                    </label>
                    <label>
                        <span>P&amp;L treatment</span>
                        <select data-expense-bucket-filter>
                            <option value="all">All treatments</option>
                        </select>
                    </label>
                    <strong data-expense-visible-count>0 shown</strong>
                </section>

                <section class="pnl-expense-page-list" aria-labelledby="expense-category-list-title">
                    <header>
                        <div><span>Accounting source</span><h2 id="expense-category-list-title">Category treatment</h2></div>
                        <p>Green Yes reduces Net Profit when the category uses an operating-expense treatment. Product and packing purchase treatments are reconciliation-only.</p>
                    </header>
                    <div class="pnl-expense-page-columns" aria-hidden="true"><span>Category</span><span>Accounting group</span><span>Include?</span><span>P&amp;L treatment</span></div>
                    <div data-expense-rows><p class="pnl-expense-page-empty">Loading categories…</p></div>
                </section>
            </main>
        </div>
    </div>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../../'); ?>
<script type="module" src="/profit-and-loss/expense-settings/expense-settings.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
