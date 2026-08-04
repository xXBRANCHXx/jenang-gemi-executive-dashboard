<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/accounting.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Accounting | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('accounting'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-accounting">
<div class="admin-app admin-app-suite" data-accounting-page data-accounting-endpoint="../api/accounting/">
    <div class="admin-shell">
        <?php render_admin_sidebar('accounting'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar admin-accounting-topbar admin-finance-page-head">
                <div class="admin-topbar-brand">
                    <span class="admin-admin-mark">Finance operations</span>
                    <h1>Accounting</h1>
                    <p>Record exceptions, control cash, and correct the books.</p>
                </div>
                <?php render_admin_topbar_actions('accounting'); ?>
            </header>

            <main class="admin-accounting-view" data-accounting-view>
                <section class="admin-accounting-command" aria-label="Accounting controls">
                    <div class="admin-accounting-command-fields">
                        <button type="button" class="admin-ghost-btn admin-accounting-month-step" data-accounting-previous-month aria-label="Previous month">Previous</button>
                        <label class="admin-accounting-field">
                            <span>Working month</span>
                            <input type="month" data-accounting-month-select>
                        </label>
                        <button type="button" class="admin-soft-btn admin-accounting-month-step" data-accounting-current-month>Current month</button>
                    </div>
                    <div class="admin-accounting-command-actions">
                        <button type="button" class="admin-ghost-btn" data-accounting-refresh>Refresh</button>
                        <button type="button" class="admin-ghost-btn" data-accounting-settings>Accounts</button>
                        <details class="admin-accounting-export-menu">
                            <summary class="admin-ghost-btn">Export</summary>
                            <div>
                                <button type="button" data-accounting-export>Manual ledger CSV</button>
                                <button type="button" data-accounting-cash-records-export>Automatic cash CSV</button>
                            </div>
                        </details>
                    </div>
                    <p class="admin-accounting-status" data-accounting-status>Accounting updated just now</p>
                    <div class="admin-accounting-alert-strip" data-accounting-alerts>
                        <div class="admin-accounting-alert"><strong>No alerts</strong><span>Checks appear after data loads.</span></div>
                    </div>
                </section>

                <section class="admin-accounting-pulse" aria-label="Cash position">
                    <div class="admin-accounting-pulse-main">
                        <span class="admin-panel-kicker">Bank balance</span>
                        <strong data-accounting-pulse-bank>Rp0</strong>
                        <p data-accounting-reconciliation-copy>Money already deposited and available in business bank accounts.</p>
                        <div>
                            <button type="button" class="admin-primary-btn" data-accounting-reconcile-open="bank">Reconcile bank</button>
                            <button type="button" class="admin-ghost-btn" data-accounting-cash-history-open="bank">View bank ledger</button>
                        </div>
                        <div class="admin-accounting-cash-pocket">
                            <span>Available cash · Cash Office</span>
                            <strong data-accounting-pulse-cash>Rp0</strong>
                            <div>
                                <button type="button" data-accounting-reconcile-open="cash">Reconcile cash</button>
                                <button type="button" data-accounting-cash-history-open="cash">View cash ledger</button>
                            </div>
                        </div>
                    </div>
                    <div class="admin-accounting-wallets">
                        <div class="admin-accounting-wallets-head">
                            <div><span class="admin-panel-kicker">Wallets</span><h2>Current balances</h2></div>
                            <span data-accounting-wallets-meta>Live wallet feed</span>
                        </div>
                        <div class="admin-accounting-wallet-strip" data-accounting-wallet-breakdown>
                            <div class="admin-accounting-wallet"><span>Loading wallets</span><strong>—</strong></div>
                        </div>
                    </div>
                </section>

                <section class="admin-accounting-metrics" aria-label="Accounting metrics">
                    <button type="button" class="admin-accounting-metric admin-accounting-cash-card" data-accounting-cash-history-open="bank" aria-haspopup="dialog" aria-controls="accounting-cash-history" aria-label="View Bank Balance history">
                        <span>Bank Balance</span>
                        <strong data-accounting-kpi="bank-balance">Rp0</strong>
                        <small>Deposited funds <b aria-hidden="true">→</b></small>
                    </button>
                    <button type="button" class="admin-accounting-metric admin-accounting-cash-card" data-accounting-cash-history-open="cash" aria-haspopup="dialog" aria-controls="accounting-cash-history" aria-label="View Available Cash history">
                        <span>Available Cash</span>
                        <strong data-accounting-kpi="cash-available">Rp0</strong>
                        <small>Physical cash on hand <b aria-hidden="true">→</b></small>
                    </button>
                    <button type="button" class="admin-accounting-metric admin-accounting-cash-card" data-accounting-marketplace-open aria-haspopup="dialog">
                        <span>Marketplace</span>
                        <strong data-accounting-kpi="marketplace-outstanding">Rp0</strong>
                        <small>See outstanding by wallet <b aria-hidden="true">→</b></small>
                    </button>
                    <button type="button" class="admin-accounting-metric admin-accounting-cash-card" data-accounting-partner-bills-open="in_progress" aria-haspopup="dialog" aria-controls="accounting-breakdown">
                        <span>Partner Bills In Progress</span>
                        <strong data-accounting-kpi="partner-bills-in-progress">Rp0</strong>
                        <small>Current billing periods <b aria-hidden="true">→</b></small>
                    </button>
                    <button type="button" class="admin-accounting-metric admin-accounting-cash-card" data-accounting-partner-bills-open="due" aria-haspopup="dialog" aria-controls="accounting-breakdown">
                        <span>Partner Bills Due</span>
                        <strong data-accounting-kpi="partner-bills-due">Rp0</strong>
                        <small>Awaiting partner payment <b aria-hidden="true">→</b></small>
                    </button>
                </section>

                <section class="admin-accounting-workspace">
                    <article class="admin-accounting-panel admin-accounting-entry" id="accounting-entry">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Accounting</span><h3>Daily entry</h3></div>
                            <span class="admin-panel-meta" data-accounting-form-status>Ready</span>
                        </div>
                        <label class="admin-accounting-mode-picker">
                            <span>What happened?</span>
                            <select data-accounting-mode-select>
                                <option value="expense_paid">Expense paid</option>
                                <option value="bill_received">Bill received</option>
                                <option value="pay_bill">Bill paid</option>
                                <option value="customer_refund">Customer refund paid</option>
                                <option value="transfer">Money transferred</option>
                                <option value="manual_income">Other money received</option>
                            </select>
                        </label>
                        <div class="admin-accounting-helper" data-accounting-mode-helper>Money already paid from the business.</div>
                        <form class="admin-accounting-form" data-accounting-form>
                            <input type="hidden" name="mode" data-accounting-mode-field value="expense_paid">
                            <div class="admin-accounting-warning" data-accounting-marketplace-warning hidden>Marketplace payouts are added automatically when they reach the bank. Do not enter them again.</div>
                            <label data-accounting-field="transaction_date">
                                <span>Date</span>
                                <input type="date" name="transaction_date" data-accounting-date>
                            </label>
                            <label data-accounting-field="issue_date" hidden>
                                <span>Bill Date</span>
                                <input type="date" name="issue_date" data-accounting-issue-date>
                            </label>
                            <label data-accounting-field="due_date" hidden>
                                <span>Due Date</span>
                                <input type="date" name="due_date">
                            </label>
                            <label data-accounting-field="bill_id" hidden>
                                <span>Bill</span>
                                <select name="bill_id" data-accounting-bill-select></select>
                            </label>
                            <label>
                                <span>Amount</span>
                                <input type="text" inputmode="numeric" name="amount" data-accounting-amount placeholder="Rp0" required>
                            </label>
                            <label data-accounting-field="account_id">
                                <span>Paid From Account</span>
                                <select name="account_id" data-accounting-account-select required></select>
                            </label>
                            <label data-accounting-field="to_account_id" hidden>
                                <span>To Account</span>
                                <select name="to_account_id" data-accounting-to-account-select></select>
                            </label>
                            <label data-accounting-field="category_id">
                                <span>Category</span>
                                <div class="admin-accounting-category-combobox" data-accounting-category-combobox>
                                    <input type="hidden" name="category_id" data-accounting-category-value>
                                    <button type="button" class="admin-accounting-category-trigger" data-accounting-category-trigger aria-haspopup="listbox" aria-expanded="false">
                                        <span data-accounting-category-label>Choose category</span>
                                        <b aria-hidden="true">⌄</b>
                                    </button>
                                    <div class="admin-accounting-category-menu" data-accounting-category-menu hidden>
                                        <div class="admin-accounting-category-search">
                                            <span aria-hidden="true">⌕</span>
                                            <input type="search" data-accounting-category-search placeholder="Search categories…" autocomplete="off" aria-label="Search categories">
                                        </div>
                                        <div class="admin-accounting-category-results" data-accounting-category-results role="listbox"></div>
                                    </div>
                                </div>
                            </label>
                            <label data-accounting-field="counterparty">
                                <span>Vendor / Source</span>
                                <input type="text" name="counterparty_name" data-accounting-counterparty-input list="accounting-counterparties" placeholder="Search or quick-create" required>
                                <datalist id="accounting-counterparties" data-accounting-counterparty-options></datalist>
                            </label>
                            <label data-accounting-field="bill_no" hidden>
                                <span>Bill / Invoice No.</span>
                                <input type="text" name="bill_no" maxlength="120">
                            </label>
                            <label data-accounting-field="income_type" hidden>
                                <span>Income Type</span>
                                <select name="income_type" data-accounting-income-type>
                                    <option value="manual_income">Offline customer payment</option>
                                    <option value="manual_income">Website/manual invoice payment</option>
                                    <option value="owner_injection">Owner injection</option>
                                    <option value="loan_received">Loan received</option>
                                    <option value="refund">Refund/reimbursement received</option>
                                    <option value="manual_income">Other income</option>
                                </select>
                            </label>
                            <label data-accounting-field="transfer_fee_amount" hidden>
                                <span>Transfer Fee</span>
                                <input type="text" inputmode="numeric" name="transfer_fee_amount" placeholder="Rp0">
                            </label>
                            <details class="admin-accounting-more admin-accounting-form-wide">
                                <summary>More details <span>Brand, channel, receipt, reference, notes</span></summary>
                                <div>
                                    <label>
                                        <span>Brand</span>
                                        <select name="brand" data-accounting-brand-select>
                                            <option>General / Shared</option>
                                            <option>ZERO</option>
                                            <option>Jenang Gemi</option>
                                            <option>ZFit</option>
                                            <option>Superfoods</option>
                                            <option>Other</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Channel</span>
                                        <select name="channel" data-accounting-channel-select>
                                            <option>Internal</option>
                                            <option>Shopee</option>
                                            <option>TikTok</option>
                                            <option>Tokopedia</option>
                                            <option>Website</option>
                                            <option>WhatsApp</option>
                                            <option>Offline</option>
                                            <option>Partner</option>
                                            <option>Distributor</option>
                                            <option>Reseller</option>
                                            <option>Dropship</option>
                                            <option>Ads</option>
                                            <option>Production</option>
                                            <option>Fulfillment</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Payment Method</span>
                                        <select name="payment_method">
                                            <option>Bank Transfer</option>
                                            <option>Cash</option>
                                            <option>QRIS</option>
                                            <option>E-wallet</option>
                                            <option>Card</option>
                                            <option>Other</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Receipt URL</span>
                                        <input type="url" name="receipt_url" placeholder="https://...">
                                    </label>
                                    <label>
                                        <span>Receipt Status</span>
                                        <select name="receipt_status">
                                            <option value="missing">Missing</option>
                                            <option value="attached">Attached</option>
                                            <option value="not_required">Not required</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Reference No.</span>
                                        <input type="text" name="reference_no" maxlength="160">
                                    </label>
                                    <label>
                                        <span>Order / SKU</span>
                                        <input type="text" name="order_no" maxlength="160">
                                    </label>
                                    <label>
                                        <span>Notes</span>
                                        <textarea name="notes" rows="3"></textarea>
                                    </label>
                                </div>
                            </details>
                            <p class="admin-form-error" data-accounting-form-error hidden></p>
                            <div class="admin-accounting-form-actions">
                                <button type="reset" class="admin-ghost-btn">Clear</button>
                                <button type="submit" class="admin-primary-btn" data-accounting-save>Save entry</button>
                            </div>
                        </form>
                    </article>
                </section>

                <section class="admin-accounting-panel admin-accounting-panel-wide admin-accounting-ledger" id="accounting-ledger">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">One source of truth</span><h3>Activity ledger</h3></div>
                        <span class="admin-panel-meta" data-accounting-ledger-meta>Selected month</span>
                    </div>
                    <div class="admin-accounting-ledger-list" data-accounting-ledger-body>
                        <p class="admin-empty">Loading ledger.</p>
                    </div>
                </section>

                <details class="admin-accounting-review admin-accounting-panel" id="accounting-review">
                    <summary>
                        <span><b data-accounting-review-count>0</b> items need review</span>
                        <small>Missing receipts, categories, or possible duplicates</small>
                    </summary>
                    <div>
                        <div class="admin-table-wrap admin-accounting-table-wrap admin-accounting-review-wrap">
                            <table class="admin-table admin-accounting-table">
                                <thead>
                                    <tr>
                                        <th>Issue</th>
                                        <th>Severity</th>
                                        <th>Transaction / Bill</th>
                                        <th>Suggested Fix</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody data-accounting-review-body>
                                    <tr><td colspan="5" class="admin-empty">Loading review queue.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </details>

                <div class="admin-modal-shell admin-accounting-drawer" data-accounting-drawer hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-drawer-close aria-label="Close accounting details"></button>
                    <aside class="admin-modal-card admin-accounting-drawer-card" role="dialog" aria-modal="true" aria-labelledby="accounting-drawer-title">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker" data-accounting-drawer-kicker>Accounting</span>
                                <h3 id="accounting-drawer-title" data-accounting-drawer-title>Details</h3>
                            </div>
                            <button type="button" class="admin-ghost-btn" data-accounting-drawer-close>Close</button>
                        </div>
                        <div class="admin-accounting-drawer-body" data-accounting-drawer-body>
                            <p class="admin-empty">Select a bill or transaction.</p>
                        </div>
                    </aside>
                </div>

                <div class="admin-modal-shell admin-accounting-breakdown" id="accounting-breakdown" data-accounting-breakdown hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-breakdown-close aria-label="Close breakdown"></button>
                    <section class="admin-modal-card admin-accounting-breakdown-card" role="dialog" aria-modal="true" aria-labelledby="accounting-breakdown-title" tabindex="-1">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker" data-accounting-breakdown-kicker>Accounting</span>
                                <h3 id="accounting-breakdown-title" data-accounting-breakdown-title>Breakdown</h3>
                                <p data-accounting-breakdown-copy></p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-breakdown-close aria-label="Close breakdown">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                            </button>
                        </div>
                        <div class="admin-accounting-breakdown-body" data-accounting-breakdown-body tabindex="0"></div>
                    </section>
                </div>

                <div class="admin-modal-shell admin-accounting-reconcile" data-accounting-reconcile hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-reconcile-close aria-label="Close reconciliation"></button>
                    <section class="admin-modal-card admin-accounting-reconcile-card" role="dialog" aria-modal="true" aria-labelledby="accounting-reconcile-title" tabindex="-1">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker">Cash count</span>
                                <h3 id="accounting-reconcile-title" data-accounting-reconcile-title>Reconcile balance</h3>
                                <p data-accounting-reconcile-copy>Use the amount you can verify now. Future entries move from this account baseline.</p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-reconcile-close aria-label="Close reconciliation">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                            </button>
                        </div>
                        <form data-accounting-reconcile-form>
                            <label>
                                <span>Account</span>
                                <select name="account_id" data-accounting-reconcile-account required></select>
                            </label>
                            <label>
                                <span>Verified balance</span>
                                <input type="text" inputmode="numeric" name="available_cash_amount" data-accounting-reconcile-amount placeholder="Rp0" required>
                            </label>
                            <label>
                                <span>Count note</span>
                                <input type="text" name="note" maxlength="500" placeholder="e.g. Counted at close">
                            </label>
                            <p>Reconciliation is permanent and appears in the ledger. It does not delete earlier records.</p>
                            <p class="admin-form-error" data-accounting-reconcile-error hidden></p>
                            <div>
                                <button type="button" class="admin-ghost-btn" data-accounting-reconcile-close>Cancel</button>
                                <button type="submit" class="admin-primary-btn">Set new baseline</button>
                            </div>
                        </form>
                    </section>
                </div>

                <div class="admin-modal-shell admin-accounting-account-settings" data-accounting-account-settings hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-account-settings-close aria-label="Close account settings"></button>
                    <section class="admin-modal-card admin-accounting-account-settings-card" role="dialog" aria-modal="true" aria-labelledby="accounting-account-settings-title" tabindex="-1">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker">Payment controls</span>
                                <h3 id="accounting-account-settings-title">Accounts</h3>
                                <p>Choose which real accounts can pay, receive, and collect automatic online deposits. Marketplace wallets always remain read-only.</p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-account-settings-close aria-label="Close account settings">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                            </button>
                        </div>
                        <div class="admin-accounting-account-settings-grid">
                            <div data-accounting-account-list></div>
                            <form data-accounting-account-form>
                                <input type="hidden" name="account_id" value="">
                                <label><span>Account name</span><input type="text" name="name" maxlength="160" placeholder="e.g. BRI Operations" required></label>
                                <label>
                                    <span>Balance group</span>
                                    <select name="balance_class" required>
                                        <option value="bank">Bank balance</option>
                                        <option value="cash">Available cash</option>
                                    </select>
                                </label>
                                <label class="admin-accounting-account-toggle"><input type="checkbox" name="can_pay" value="1"><span>Show in Paid From</span></label>
                                <label class="admin-accounting-account-toggle"><input type="checkbox" name="can_receive" value="1"><span>Show in Received Into / transfers</span></label>
                                <label class="admin-accounting-account-toggle"><input type="checkbox" name="receives_automatic" value="1"><span>Automatic online deposits land here</span></label>
                                <p class="admin-form-error" data-accounting-account-error hidden></p>
                                <div>
                                    <button type="button" class="admin-ghost-btn" data-accounting-account-new>New account</button>
                                    <button type="submit" class="admin-primary-btn">Save account</button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>

                <div class="admin-modal-shell admin-accounting-cash-history" id="accounting-cash-history" data-accounting-cash-history hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-cash-history-close aria-label="Close cash history"></button>
                    <section class="admin-modal-card admin-accounting-cash-history-card" role="dialog" aria-modal="true" aria-labelledby="accounting-cash-history-title" tabindex="-1">
                        <div class="admin-modal-head admin-accounting-cash-history-head">
                            <div>
                                <span class="admin-panel-kicker">All-time balance ledger</span>
                                <h3 id="accounting-cash-history-title" data-accounting-cash-history-title>Balance history</h3>
                                <p data-accounting-cash-history-copy>Every addition and subtraction for the selected balance.</p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-cash-history-close aria-label="Close cash history" title="Close">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6 6 18"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="admin-accounting-cash-history-summary" aria-label="Cash history totals">
                            <div><span data-accounting-cash-history-current-label>Current cash</span><strong data-accounting-cash-history-current>Rp0</strong></div>
                            <div><span>Total added</span><strong class="is-added" data-accounting-cash-history-added>Rp0</strong></div>
                            <div><span>Total subtracted</span><strong class="is-subtracted" data-accounting-cash-history-subtracted>Rp0</strong></div>
                        </div>
                        <div class="admin-accounting-cash-history-tools">
                            <label>
                                <span>Balance type</span>
                                <select data-accounting-cash-history-balance-class aria-label="Filter balance history by type">
                                    <option value="all">Bank + cash</option>
                                    <option value="bank">Bank balance</option>
                                    <option value="cash">Available cash</option>
                                </select>
                            </label>
                            <label>
                                <span>Account</span>
                                <select data-accounting-cash-history-account aria-label="Filter cash history by account">
                                    <option value="all">All accounts</option>
                                </select>
                            </label>
                            <label>
                                <span>Movement</span>
                                <select data-accounting-cash-history-direction>
                                    <option value="all">All movements</option>
                                    <option value="added">Additions only</option>
                                    <option value="subtracted">Subtractions only</option>
                                </select>
                            </label>
                            <p data-accounting-cash-history-count>Loading history…</p>
                        </div>
                        <div class="admin-table-wrap admin-accounting-cash-history-table-wrap">
                            <table class="admin-table admin-accounting-cash-history-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Reason</th>
                                        <th>Source</th>
                                        <th class="is-numeric">Amount</th>
                                        <th class="is-numeric">Balance</th>
                                    </tr>
                                </thead>
                                <tbody data-accounting-cash-history-body>
                                    <tr><td colspan="5" class="admin-empty">Loading cash history.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p class="admin-accounting-cash-history-note" data-accounting-cash-history-note>Cash history includes the latest reconciliation, posted entries, wallet withdrawals, confirmed website payments, and completed direct orders.</p>
                    </section>
                </div>
            </main>
        </div>
    </div>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
<script type="module" src="./accounting.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
