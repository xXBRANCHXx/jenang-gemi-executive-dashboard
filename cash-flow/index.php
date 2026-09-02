<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/cash-flow.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cash Flow | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('accounting'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-cash-flow">
<div class="admin-app admin-app-suite" data-cash-flow-page data-cash-flow-endpoint="../api/accounting/">
    <div class="admin-shell">
        <?php render_admin_sidebar('accounting'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar admin-finance-page-head cash-flow-topbar">
                <div class="admin-topbar-brand">
                    <a class="cash-flow-back" href="../profit-loss/">← Accounting</a>
                    <h1>Cash Flow</h1>
                    <p>Money actually received minus money actually paid.</p>
                </div>
                <?php render_admin_topbar_actions('cash-flow'); ?>
            </header>

            <main class="cash-flow-page">
                <section class="cash-flow-toolbar" aria-label="Cash flow period">
                    <div>
                        <span class="admin-panel-kicker">Actual cash basis</span>
                        <h2 data-cash-flow-period>Selected month</h2>
                        <p data-cash-flow-status>Loading confirmed payments…</p>
                    </div>
                    <div class="cash-flow-period-controls">
                        <label><span>Month</span><select data-cash-flow-month></select></label>
                        <label><span>Year</span><select data-cash-flow-year></select></label>
                        <button type="button" data-cash-flow-refresh aria-label="Refresh cash flow"><span aria-hidden="true">↻</span> Refresh</button>
                    </div>
                </section>

                <section class="cash-flow-kpis" aria-label="Cash flow totals">
                    <div class="cash-flow-kpi is-net"><span>Net cash flow</span><strong data-cash-flow-total="net">Rp0</strong><small>Income received − costs paid</small></div>
                    <div class="cash-flow-kpi is-income"><span>Income received</span><strong data-cash-flow-total="income">Rp0</strong><small data-cash-flow-count="income">0 received transactions</small></div>
                    <div class="cash-flow-kpi is-cost"><span>Costs paid</span><strong data-cash-flow-total="cost">Rp0</strong><small data-cash-flow-count="cost">0 paid transactions</small></div>
                </section>

                <section class="cash-flow-section cash-flow-chart-section" aria-labelledby="cash-flow-chart-title">
                    <header>
                        <div><span class="admin-panel-kicker">Daily movement</span><h2 id="cash-flow-chart-title">Income and cost by payment date</h2><p>Only days when money actually moved are plotted.</p></div>
                        <div class="cash-flow-legend"><span class="is-income">Income</span><span class="is-cost">Cost</span></div>
                    </header>
                    <div class="cash-flow-chart-stage">
                        <div class="cash-flow-chart-axis" data-cash-flow-chart-axis aria-hidden="true"></div>
                        <div class="cash-flow-chart" data-cash-flow-chart role="img" aria-label="Daily income and paid cost chart">
                            <p class="admin-empty">Loading chart…</p>
                        </div>
                    </div>
                </section>

                <section class="cash-flow-breakdowns cash-flow-section" aria-label="Cash flow breakdowns">
                    <article class="cash-flow-breakdown">
                        <header><div><span class="admin-panel-kicker">Where cash moved</span><h2>Sources</h2><p>Automatic feeds and recorded payments.</p></div></header>
                        <div class="cash-flow-summary-list" data-cash-flow-sources><p class="admin-empty">Loading sources…</p></div>
                    </article>
                    <article class="cash-flow-breakdown">
                        <header><div><span class="admin-panel-kicker">How cash was classified</span><h2>Categories</h2><p>The accounting category on each movement.</p></div></header>
                        <div class="cash-flow-summary-list" data-cash-flow-categories><p class="admin-empty">Loading categories…</p></div>
                    </article>
                </section>

                <section class="cash-flow-section cash-flow-ledger" aria-labelledby="cash-flow-ledger-title">
                    <header class="cash-flow-ledger-head">
                        <div><span class="admin-panel-kicker">Full breakdown</span><h2 id="cash-flow-ledger-title">Every confirmed cash movement</h2><p data-cash-flow-ledger-count>0 transactions</p></div>
                        <div class="cash-flow-ledger-filters">
                            <label><span>Show</span><select data-cash-flow-filter><option value="all">Income + cost</option><option value="income">Income only</option><option value="cost">Cost only</option></select></label>
                            <label><span>Find</span><input type="search" data-cash-flow-search placeholder="Transaction, category, reference…"></label>
                        </div>
                    </header>
                    <div class="cash-flow-table-wrap">
                        <table class="cash-flow-table">
                            <thead><tr><th>Date</th><th>Flow</th><th>Transaction</th><th>Category</th><th>Source / account</th><th>Reference</th><th>Notes</th><th class="is-numeric">Amount</th></tr></thead>
                            <tbody data-cash-flow-transactions><tr><td colspan="8" class="admin-empty">Loading transactions…</td></tr></tbody>
                        </table>
                    </div>
                </section>

                <details class="cash-flow-methodology cash-flow-section">
                    <summary>What is included in this report?</summary>
                    <div data-cash-flow-methodology></div>
                </details>
            </main>
        </div>
    </div>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
<script type="module" src="./cash-flow.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
