<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/pnl.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Profit &amp; Loss | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('profit-loss'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Space+Grotesk:wght@500;700&amp;display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-profit-and-loss">
<div class="admin-app admin-app-suite" data-pnl-page data-sales-endpoint="../api/sales/" data-accounting-endpoint="../api/accounting/" data-profit-loss-endpoint="../api/profit-loss/">
    <div class="admin-shell">
        <?php render_admin_sidebar('profit-loss'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar profit-loss-topbar admin-finance-page-head">
                <div class="admin-topbar-brand">
                    <span class="admin-admin-mark">Executive finance</span>
                    <h1>Profit &amp; Loss</h1>
                    <p>Revenue, actual Accounting product and packing costs, operating expenses, and net profit.</p>
                </div>
                <?php render_admin_topbar_actions('profit-loss'); ?>
            </header>

            <main class="pnl-layout" data-pnl-view>
                <section class="pnl-controls" aria-label="Profit and loss period">
                    <label><span>Year</span><select data-pnl-year></select></label>
                    <label><span>Period</span><select data-pnl-period></select></label>
                    <button type="button" class="admin-ghost-btn" data-pnl-refresh>Refresh</button>
                    <p data-pnl-status>Loading financial report…</p>
                </section>

                <section class="pnl-kpis" aria-label="Profit and loss summary">
                    <article><span>Net Revenue</span><strong data-pnl-kpi="revenue">Rp0</strong><small>All operating revenue received</small></article>
                    <article><span>PO / Product Cost</span><strong data-pnl-kpi="cogs">Rp0</strong><small>Recorded partial + full PO payments only</small></article>
                    <article><span>Actual Packing Cost</span><strong data-pnl-kpi="packing">Rp0</strong><small>Included packing payments from Accounting</small></article>
                    <article><span>Gross Profit</span><strong data-pnl-kpi="gross-profit">Rp0</strong><small data-pnl-margin>0% margin</small></article>
                    <article><span>Ad Cost</span><strong data-pnl-kpi="ad-cost">Rp0</strong><small>Posted marketing payments</small></article>
                    <article><span>Operating Expenses</span><strong data-pnl-kpi="opex">Rp0</strong><small>After product and packing costs</small></article>
                    <article class="pnl-net-card" data-pnl-net-card><span>Net Profit</span><strong data-pnl-kpi="net-profit">Rp0</strong><small data-pnl-net-margin>0% margin</small></article>
                </section>

                <section class="pnl-grid">
                    <article class="pnl-panel pnl-bridge-panel">
                        <div class="pnl-panel-head"><div><span>Statement</span><h2 data-pnl-period-title>Profit bridge</h2></div><a href="../profit-loss/">Open Accounting</a></div>
                        <div class="pnl-bridge" data-pnl-bridge></div>
                    </article>

                    <article class="pnl-panel">
                        <div class="pnl-panel-head"><div><span>Operating spend</span><h2>Expense mix</h2></div><a class="admin-ghost-btn pnl-settings-button" href="./expense-settings/">Expense settings</a></div>
                        <div class="pnl-expense-mix" data-pnl-expense-mix></div>
                    </article>
                </section>

                <section class="pnl-panel pnl-allocation-panel" aria-labelledby="pnl-allocation-title">
                    <div class="pnl-panel-head">
                        <div><span>After net profit</span><h2 id="pnl-allocation-title">Profit allocation</h2></div>
                        <button type="button" class="admin-ghost-btn pnl-settings-button" data-pnl-edit-allocation>Allocation settings</button>
                    </div>
                    <p class="pnl-allocation-intro" data-pnl-allocation-intro>Positive net profit is distributed through the configured sharing levels.</p>
                    <div class="pnl-allocation-tree" data-pnl-allocation-tree></div>
                </section>

                <section class="pnl-panel pnl-monthly-panel">
                    <div class="pnl-panel-head"><div><span>Year at a glance</span><h2>Monthly performance</h2></div><small>Tap a month to focus the report</small></div>
                    <div class="pnl-trend" data-pnl-trend aria-label="Monthly net profit trend"></div>
                    <div class="admin-table-wrap pnl-table-wrap">
                        <table class="admin-table pnl-table">
                            <thead><tr><th>Month</th><th>Revenue</th><th>PO / Product</th><th>Actual Packing</th><th>Gross Profit</th><th>Ad Cost</th><th>Other OpEx</th><th>Net Profit</th><th>Margin</th></tr></thead>
                            <tbody data-pnl-months><tr><td colspan="9" class="admin-empty">Loading monthly statement.</td></tr></tbody>
                        </table>
                    </div>
                </section>

                <section class="pnl-assurance" data-pnl-assurance>
                    <div><strong>Calculation basis</strong><span>Net revenue minus recorded partial/full PO payments, actual included packing payments, and included operating expenses from posted cash-basis Accounting entries. Unpaid PO balances are excluded.</span></div>
                    <div><strong>Direct net-profit formula</strong><span>Net Profit is calculated directly from revenue and actual Accounting costs. It does not use an imported or estimated Gross Profit value.</span></div>
                    <div><strong>Review status</strong><span data-pnl-review-status>Checking Accounting review items…</span></div>
                </section>
            </main>
        </div>
    </div>
    <dialog class="pnl-allocation-dialog" data-pnl-allocation-dialog aria-labelledby="pnl-allocation-settings-title">
        <form class="pnl-allocation-form" data-pnl-allocation-form>
            <div class="pnl-allocation-dialog-head">
                <div><span>Selected year: <b data-pnl-allocation-year>—</b></span><h2 id="pnl-allocation-settings-title">Profit allocation settings</h2><p>Rename items, change percentages, or add sub-splits. Every level must total 100%.</p></div>
                <button type="button" class="pnl-dialog-close" data-pnl-close-allocation aria-label="Close allocation settings">×</button>
            </div>
            <div class="pnl-allocation-editor" data-pnl-allocation-editor></div>
            <button type="button" class="admin-ghost-btn" data-pnl-add-allocation>Add profit allocation</button>
            <p class="pnl-allocation-error" data-pnl-allocation-error hidden></p>
            <div class="pnl-allocation-actions">
                <button type="button" class="admin-ghost-btn" data-pnl-cancel-allocation>Cancel</button>
                <button type="submit" class="admin-primary-btn" data-pnl-save-allocation>Save allocation</button>
            </div>
        </form>
    </dialog>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
<script type="module" src="./pnl.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
