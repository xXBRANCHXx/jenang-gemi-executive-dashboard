<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$cssVersion = (string) @filemtime(__DIR__ . '/flow.css');
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>How Accounting Works | Jenang Gemi</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap">
    <link rel="stylesheet" href="./flow.css?v=<?php echo urlencode($cssVersion ?: '1'); ?>">
</head>
<body>
<main>
    <header class="flow-hero">
        <p>Accounting system map</p>
        <h1>How money becomes one trustworthy number</h1>
        <span>Every source enters the same ledger, receives the same checks, and then feeds the pages your team uses.</span>
    </header>

    <section class="flow-stage" aria-labelledby="sources-title">
        <div class="stage-title"><b>1</b><div><p>Money starts here</p><h2 id="sources-title">Source systems and human entries</h2></div></div>
        <div class="source-grid">
            <article><i>MP</i><h3>Marketplace orders</h3><p>Shopee, TikTok, and Tokopedia order facts record sales, fees, payment status, and expected wallet value.</p></article>
            <article><i>WA</i><h3>Direct sales</h3><p>WhatsApp, walk-in, website, reseller, and partner orders supply revenue and payment details.</p></article>
            <article><i>WL</i><h3>Wallet deposits</h3><p>Marketplace withdrawals and bank deposits turn expected money into confirmed available money.</p></article>
            <article><i>BI</i><h3>Bills and purchases</h3><p>Supplier bills, purchase orders, payroll, ads, and operating costs create obligations before or when cash leaves.</p></article>
            <article><i>+</i><h3>Daily entries</h3><p>Staff record exceptional expenses, income, transfers, refunds, loans, owner money, and supporting receipts.</p></article>
            <article><i>✓</i><h3>Cash checks</h3><p>Bank and physical cash reconciliations establish a verified balance without deleting earlier history.</p></article>
        </div>
    </section>

    <div class="flow-arrow" aria-hidden="true"><span>↓</span><small>Normalize and identify</small></div>

    <section class="flow-stage flow-core" aria-labelledby="core-title">
        <div class="stage-title"><b>2</b><div><p>One source of truth</p><h2 id="core-title">The Accounting ledger</h2></div></div>
        <div class="core-grid">
            <article><span>A</span><h3>Account</h3><p>Where money is now or expected: bank, cash, marketplace wallet, receivable, or payable.</p></article>
            <article><span>C</span><h3>Category</h3><p>Why it moved: Money in/out → big group → exact category.</p></article>
            <article><span>W</span><h3>Who</h3><p>Vendor, customer, partner, marketplace, employee, owner, or other counterparty.</p></article>
            <article><span>P</span><h3>Proof</h3><p>Order reference, invoice, receipt, payment reference, notes, and audit history.</p></article>
        </div>
        <div class="rule-row">
            <article><h3>Bills are obligations</h3><p>A bill records what is owed. It affects projected cash and stays outstanding until allocated payments cover it.</p></article>
            <div class="mini-arrow">→</div>
            <article><h3>Bill payments are cash movements</h3><p>One payment transaction can allocate money across several bills. Each allocation reduces that bill once; reports exclude the duplicate obligation/payment path.</p></article>
            <div class="mini-arrow">→</div>
            <article><h3>Paid means zero left</h3><p>When allocations equal the bill total, the bill is marked paid, visually retired, and its amount-to-pay becomes Rp0.</p></article>
        </div>
    </section>

    <div class="flow-arrow" aria-hidden="true"><span>↓</span><small>Validate before publishing</small></div>

    <section class="flow-stage" aria-labelledby="checks-title">
        <div class="stage-title"><b>3</b><div><p>Protection layer</p><h2 id="checks-title">Checks that keep totals honest</h2></div></div>
        <div class="check-list">
            <article><b>01</b><div><h3>Stable identity</h3><p>External IDs, references, and transaction keys prevent the same event from being imported twice.</p></div></article>
            <article><b>02</b><div><h3>Payment documentation</h3><p>Paid-status history and backfills convert undocumented order payments into recorded receipts, reducing false outstanding value.</p></div></article>
            <article><b>03</b><div><h3>Receipt and category review</h3><p>Missing proof, missing categories, overdue bills, and suspected duplicates enter the review queue.</p></div></article>
            <article><b>04</b><div><h3>Permanent audit trail</h3><p>Edits, reconciliations, voids, bill allocations, and category moves retain who/what changed and never silently erase history.</p></div></article>
        </div>
    </section>

    <div class="flow-arrow" aria-hidden="true"><span>↓</span><small>Reuse the same facts everywhere</small></div>

    <section class="flow-stage" aria-labelledby="outputs-title">
        <div class="stage-title"><b>4</b><div><p>Where the numbers go</p><h2 id="outputs-title">Pages affected by Accounting</h2></div></div>
        <div class="output-grid">
            <article><h3>Accounting tab</h3><p>Liquidity, daily entry, bills, activity ledger, review queue, cash history, and reconciliation.</p><strong>Reads accounts, transactions, bills, allocations, and reviews.</strong></article>
            <article><h3>Profit &amp; Loss</h3><p>Income and expenses by month, big group, exact category, brand, channel, and SKU COGS.</p><strong>Category moves change classification, never the amount.</strong></article>
            <article><h3>Executive Dashboard</h3><p>Revenue, paid/outstanding orders, cash position, obligations, and operating performance.</p><strong>Order payments and ledger facts drive the KPIs.</strong></article>
            <article><h3>Orders &amp; profiles</h3><p>Payment status, customer/order history, and links from activity back to the originating record.</p><strong>Uses the same order and payment identities.</strong></article>
            <article><h3>Wallet operations</h3><p>Ready-to-withdraw balances, withdrawals, deposits, and marketplace settlement details.</p><strong>Expected wallet money becomes available after confirmation.</strong></article>
            <article><h3>Purchasing &amp; inventory</h3><p>Supplier obligations, purchase orders, receiving, and the cost context used for inventory and COGS.</p><strong>Bills connect purchasing to cash and reports.</strong></article>
            <article><h3>Pembukuan export</h3><p>Structured transactions, bills, accounts, categories, and supporting references for bookkeeping.</p><strong>Exports the same ledger rather than rebuilding totals.</strong></article>
            <article><h3>Reviews &amp; alerts</h3><p>Exceptions that need a person: overdue, undocumented, missing receipt/category, or suspicious duplication.</p><strong>Resolution updates the shared record.</strong></article>
        </div>
    </section>

    <section class="flow-stage category-map" aria-labelledby="categories-title">
        <div class="stage-title"><b>5</b><div><p>Category rules</p><h2 id="categories-title">A category should make sense in three taps</h2></div></div>
        <div class="category-path">
            <article><small>First</small><h3>Money in or Money out</h3><p>The supreme direction. This keeps income and expense choices separate.</p></article><span>→</span>
            <article><small>Then</small><h3>Big group</h3><p>Marketing, Operations, Product/COGS, Payroll, Tax, or a group you add.</p></article><span>→</span>
            <article><small>Finally</small><h3>Exact category</h3><p>Shopee Ads, Packaging, Rent, Salary, or another clear team choice.</p></article>
        </div>
        <div class="category-notes">
            <p><b>Active + shown:</b> appears on new bills and entries and remains in reports.</p>
            <p><b>Active + hidden:</b> stays in history/reports but disappears from new-entry dropdowns.</p>
            <p><b>Not active:</b> retired from normal use; old records remain intact.</p>
            <p><b>Date-range move:</b> only transactions and bills dated inside the chosen period are reclassified.</p>
            <p><b>Fully retroactive move:</b> moves the category itself, so past and future uses follow the new group.</p>
        </div>
    </section>

    <footer>Accounting flow · Internal reference · Values are classified once and reused everywhere.</footer>
</main>
</body>
</html>
