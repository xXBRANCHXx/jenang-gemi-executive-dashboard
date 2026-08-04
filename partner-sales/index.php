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
$salesJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-sales.js');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Sales | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('partner-profile'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="../partner-access.css?v=<?php echo urlencode($partnerAccessCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-suite" data-partner-sales data-sales-endpoint="../api/partner-sales/" data-disputes-endpoint="../api/partner-billing/" data-partner-code="<?php echo htmlspecialchars($partnerCode, ENT_QUOTES); ?>">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('partner'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <h1>Partner Sales</h1>
                    </div>
                    <?php render_admin_topbar_actions(); ?>
                </header>

                <main class="admin-layout partner-sales-page">
                    <p class="admin-form-error partner-sales-error" data-sales-error hidden></p>

                    <section class="partner-sales-loading" data-sales-loading>
                        <span></span>
                        <p>Loading partner sales ledger…</p>
                    </section>

                    <div data-sales-content hidden>
                        <header class="partner-sales-header">
                            <div class="partner-sales-identity">
                                <a class="partner-sales-back" href="../partner-profiles/" aria-label="Back to partner profiles" title="Back to partner profiles">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                                </a>
                                <div>
                                    <span>Partner performance</span>
                                    <h2 data-sales-partner-name>Partner</h2>
                                    <p data-sales-partner-code>—</p>
                                </div>
                            </div>
                            <div class="partner-sales-header-actions">
                                <a class="admin-ghost-btn admin-link-btn" href="../partner-profile/" data-sales-settings-link>Profile settings</a>
                                <a class="admin-primary-btn admin-link-btn" href="https://partner.jenanggemi.com" target="_blank" rel="noopener" data-sales-portal-link>Open portal</a>
                            </div>
                        </header>

                        <section class="partner-sales-toolbar" aria-label="Sales period controls">
                            <div class="partner-sales-periods" data-sales-periods>
                                <button type="button" data-sales-period="30">30 days</button>
                                <button type="button" data-sales-period="90">90 days</button>
                                <button type="button" data-sales-period="ytd">This year</button>
                                <button type="button" class="is-active" data-sales-period="all">All time</button>
                            </div>
                            <div class="partner-sales-date-range">
                                <label><span>From</span><input type="date" data-sales-from></label>
                                <label><span>To</span><input type="date" data-sales-to></label>
                                <button type="button" class="admin-ghost-btn" data-sales-apply>Apply</button>
                            </div>
                            <span class="partner-sales-updated" data-sales-updated>Live ledger</span>
                        </section>

                        <section class="partner-sales-stat-grid">
                            <article><span>Sales value</span><strong data-sales-total>Rp 0</strong><small data-sales-order-count>0 orders</small></article>
                            <article><span>Paid</span><strong data-sales-paid>Rp 0</strong><small data-sales-collection-rate>0% collected</small></article>
                            <article><span>Outstanding</span><strong data-sales-outstanding>Rp 0</strong><small data-sales-unpaid-count>0 open balances</small></article>
                            <article><span>Units sold</span><strong data-sales-units>0</strong><small>excluding cancelled</small></article>
                            <article><span>Average order</span><strong data-sales-average>Rp 0</strong><small data-sales-cancelled-count>0 cancelled</small></article>
                        </section>

                        <section class="partner-sales-analysis-grid">
                            <article class="partner-sales-panel partner-sales-trend-panel">
                                <header class="partner-sales-panel-head">
                                    <div><span>Sales trend</span><h3>Order value over time</h3></div>
                                    <small data-sales-trend-caption>All recorded orders</small>
                                </header>
                                <div class="partner-sales-chart" data-sales-chart></div>
                            </article>

                            <article class="partner-sales-panel partner-sales-collection-panel">
                                <header class="partner-sales-panel-head">
                                    <div><span>Collections</span><h3>Payment position</h3></div>
                                    <strong data-sales-rate>0%</strong>
                                </header>
                                <div class="partner-sales-progress" aria-label="Collection rate"><span data-sales-progress></span></div>
                                <div class="partner-sales-status-list" data-sales-status-list></div>
                            </article>
                        </section>

                        <section class="partner-sales-breakdown-grid">
                            <article class="partner-sales-panel">
                                <header class="partner-sales-panel-head"><div><span>Channels</span><h3>Sales by platform</h3></div></header>
                                <div class="partner-sales-ranking" data-sales-channels></div>
                            </article>
                            <article class="partner-sales-panel">
                                <header class="partner-sales-panel-head"><div><span>Products</span><h3>Top products and SKUs</h3></div></header>
                                <div class="partner-sales-ranking" data-sales-products></div>
                            </article>
                            <article class="partner-sales-panel">
                                <header class="partner-sales-panel-head"><div><span>Payment history</span><h3>Recent settlements</h3></div></header>
                                <div class="partner-sales-payment-history" data-sales-payments></div>
                            </article>
                        </section>

                        <section class="partner-sales-panel partner-sales-ledger-panel">
                            <header class="partner-sales-ledger-head">
                                <div><span>Order ledger</span><h3>Sales, items and settlement status</h3></div>
                                <div class="partner-sales-ledger-controls">
                                    <button type="button" class="admin-ghost-btn partner-sales-disputes-button" data-open-disputes>
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H8l-4 3v-14Z"></path><path d="M8 9h8M8 13h5"></path></svg>
                                        See disputes
                                    </button>
                                    <label class="partner-sales-search"><span>Search</span><input type="search" placeholder="Order, customer, channel, SKU" data-sales-search></label>
                                    <label class="partner-sales-filter"><span>Status</span><select data-sales-status-filter><option value="all">All payments</option><option value="unpaid">Unpaid</option><option value="partial">Partially paid</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></label>
                                </div>
                            </header>
                            <div class="partner-sales-ledger-table">
                                <div class="partner-sales-ledger-columns"><span>Order</span><span>Channel / customer</span><span>Items</span><span>Order value</span><span>Paid</span><span>Outstanding</span><span>Status</span><span></span></div>
                                <div data-sales-orders></div>
                            </div>
                            <footer class="partner-sales-ledger-footer"><span data-sales-ledger-count>0 orders</span><span data-sales-limit-note hidden>Showing the latest 2,500 orders.</span></footer>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    </div>

    <div class="admin-modal-shell" data-payment-modal hidden>
        <div class="admin-modal-backdrop" data-close-payment-modal></div>
        <div class="admin-modal-card partner-payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
            <header>
                <div><span>Record settlement</span><h3 id="payment-modal-title" data-payment-order-title>Order payment</h3></div>
                <button type="button" class="partner-sales-modal-close" data-close-payment-modal aria-label="Close payment form">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
                </button>
            </header>
            <form data-payment-form>
                <input type="hidden" name="order_id">
                <div class="partner-payment-balance"><span>Outstanding balance</span><strong data-payment-balance>Rp 0</strong></div>
                <div class="partner-payment-fields">
                    <label><span>Amount</span><input type="number" name="amount" min="1" step="1" inputmode="numeric" required></label>
                    <label><span>Payment date</span><input type="date" name="payment_date" required></label>
                    <label><span>Method</span><select name="payment_method"><option value="Bank transfer">Bank transfer</option><option value="Cash">Cash</option><option value="QRIS">QRIS</option><option value="Marketplace settlement">Marketplace settlement</option><option value="Other">Other</option></select></label>
                    <label><span>Reference</span><input type="text" name="reference_no" maxlength="120" placeholder="Transfer or receipt reference"></label>
                    <label class="partner-payment-notes"><span>Notes</span><textarea name="notes" maxlength="300" rows="3" placeholder="Optional internal note"></textarea></label>
                </div>
                <p class="admin-form-error" data-payment-error hidden></p>
                <footer>
                    <button type="button" class="admin-ghost-btn" data-close-payment-modal>Cancel</button>
                    <button type="submit" class="admin-primary-btn">Record payment</button>
                </footer>
            </form>
        </div>
    </div>

    <div class="admin-modal-shell partner-disputes-modal-shell" data-disputes-modal hidden>
        <div class="admin-modal-backdrop" data-close-disputes></div>
        <div class="admin-modal-card partner-disputes-modal" role="dialog" aria-modal="true" aria-labelledby="disputes-modal-title">
            <header class="partner-disputes-modal-head">
                <div>
                    <span>Partner billing archive</span>
                    <h3 id="disputes-modal-title">Dispute history</h3>
                    <p>Messages, affected orders, outcomes, and finance evidence in one place.</p>
                </div>
                <button type="button" class="partner-sales-modal-close" data-close-disputes aria-label="Close dispute history">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
                </button>
            </header>

            <div class="partner-disputes-body">
                <section class="partner-disputes-picker" data-disputes-picker>
                    <div class="partner-disputes-picker-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6"></path></svg>
                    </div>
                    <span>Weekly review</span>
                    <h4>Choose a weekly window</h4>
                    <p>Select one billing week to see every dispute conversation and screenshot from that period.</p>
                    <form data-disputes-window-form>
                        <label><span>Billing week</span><select data-disputes-week required disabled><option value="">Loading weekly windows…</option></select></label>
                        <button type="submit" class="admin-primary-btn" data-view-disputes disabled>View dispute history</button>
                    </form>
                    <p class="admin-form-error partner-disputes-error" data-disputes-error hidden></p>
                </section>

                <section class="partner-disputes-history" data-disputes-history hidden>
                    <div class="partner-disputes-history-toolbar">
                        <button type="button" class="partner-disputes-change-week" data-change-dispute-week>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                            Change week
                        </button>
                        <span data-disputes-window-label>Weekly window</span>
                    </div>
                    <div class="partner-disputes-summary" data-disputes-summary></div>
                    <div class="partner-disputes-list" data-disputes-list></div>
                </section>
            </div>
        </div>
    </div>

    <div class="partner-profile-toast" data-sales-toast hidden><strong>Payment recorded</strong><span>The order balance is up to date.</span></div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
    <script type="module" src="../partner-sales.js?v=<?php echo urlencode($salesJsVersion ?: '1'); ?>"></script>
</body>
</html>
