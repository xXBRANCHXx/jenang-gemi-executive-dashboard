<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/admin-nav.php';
jg_admin_require_auth();

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$whatsappWebhookUrl = 'https://jenanggemi.com/whatsapp-webhook.php';
$conversionWebhookUrl = 'https://jenanggemi.com/conversion-webhook.php';
$configPath = '/public_html/whatsapp-config.local.php';
$ingestBaseUrl = jg_dashboard_marketplace_api_base_url();
$storeOpsBaseUrl = rtrim(jg_dashboard_env_value('JG_STORE_OPS_BASE_URL') ?: (string) (jg_dashboard_load_local_config()['store_ops_base_url'] ?? 'https://store.jenanggemi.com'), '/');
$apiDocs = [
    ['API Ingest', 'GET', $ingestBaseUrl . '/', 'Root service identity and reachability.', 'ok, service'],
    ['API Ingest', 'GET', $ingestBaseUrl . '/health', 'Health probe for the ingest deployment.', 'ok, service'],
    ['Sales', 'GET', $ingestBaseUrl . '/sales/summary?year=YYYY&setup_token=[redacted]', 'Yearly marketplace rollup used by the executive overview.', 'months, months[].accounts, months[].platforms, accounts, platforms, products, totals'],
    ['Sales', 'GET', $ingestBaseUrl . '/sales/orders?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&setup_token=[redacted]', 'Item-level marketplace orders for the Orders page.', 'timestamp, order_id, sku, quantity, net seller revenue, marketplace fees, contact fields'],
    ['Sales', 'GET', $ingestBaseUrl . '/sales/sync?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&setup_token=[redacted]', 'Date-range backfill for all configured marketplace APIs.', 'sync.accounts[], stored order count, refreshed sales summary'],
    ['Shopee', 'GET', $ingestBaseUrl . '/shopee/auth/status?account=ACCOUNT&setup_token=[redacted]', 'Shopee authorization status for a marketplace account.', 'status.shop_id, token flags, token expiry'],
    ['Shopee', 'GET', $ingestBaseUrl . '/shopee/orders/listed?account=ACCOUNT&setup_token=[redacted]', 'Listed Shopee orders currently used as order feed health.', 'orders[]'],
    ['Store Ops', 'GET', $storeOpsBaseUrl . '/api/orders/', 'Protected Store Ops orders route. A 401 still means the route exists.', 'Authenticated order payload'],
    ['Store Ops', 'GET', $storeOpsBaseUrl . '/store-home.js', 'Store Ops deployed frontend asset checked for live-order marker.', 'deployment marker only'],
    ['Dashboard Proxy', 'GET', '../api/sales/?year=YYYY', 'Authenticated dashboard proxy for sales summary plus SKU enrichment.', 'sales summary + products.syrup_flavors'],
    ['Dashboard Proxy', 'GET', '../api/api-health/?run=1', 'Runs all configured API and database probes.', 'summary, checks, failures'],
];
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="minimal-black">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>API Ingest Workspace | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard.svg">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-suite admin-app-lab">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('api'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip admin-chip-accent">API Ingest Workspace</span>
                        <h1>Marketplace + Webhook Lab</h1>
                        <p>Workspace for API ingest experiments, webhook diagnostics, conversion parsing, and other isolated integrations that should not crowd the executive homepage.</p>
                    </div>
                    <div class="admin-topbar-actions">
                        <a class="admin-ghost-btn admin-link-btn" href="../dashboard/?view=overview">Back to Homepage</a>
                        <a class="admin-primary-btn admin-link-btn" href="../logout/">Lock Dashboard</a>
                    </div>
                </header>

                <main class="admin-layout">
            <section class="admin-hero-panel admin-lab-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip">Safe for Experiments</span>
                    <h2>Use this page for trial integrations, ingest diagnostics, and WhatsApp conversion concepts.</h2>
                    <p>Nothing here needs to affect the production dashboard unless you decide it is worth keeping. Treat this as the quarantine zone for marketplace API work, webhook tracing, and temporary prototypes.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Main dashboard remains separate</span>
                    </div>
                </div>
            </section>

            <section class="admin-main-grid">
                <article class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Sandbox Notes</span>
                            <h3>What this page is for</h3>
                        </div>
                    </div>
                    <div class="admin-note-stack">
                        <div class="admin-note-card"><strong>WhatsApp tests</strong><span>Try webhook flows, event reconciliation, message ID mapping, or post-checkout verification ideas here first.</span></div>
                        <div class="admin-note-card"><strong>Safe isolation</strong><span>If the experiment goes nowhere, this page can be left alone or removed later without touching the production dashboard flow.</span></div>
                        <div class="admin-note-card"><strong>Next step</strong><span>When you are ready, we can add dedicated panels, secret fields, API forms, log viewers, or webhook diagnostics here.</span></div>
                    </div>
                </article>

                <article class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">API Catalog</span>
                            <h3>Known ingest and proxy APIs</h3>
                        </div>
                        <span class="admin-panel-meta">Also tracked by API Health where safe</span>
                    </div>
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Area</th>
                                    <th>Method</th>
                                    <th>Endpoint</th>
                                    <th>Meaning</th>
                                    <th>Chart fields</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($apiDocs as $apiDoc): ?>
                                    <tr>
                                        <td><strong><?php echo htmlspecialchars($apiDoc[0], ENT_QUOTES, 'UTF-8'); ?></strong></td>
                                        <td><?php echo htmlspecialchars($apiDoc[1], ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><span class="admin-code-block"><?php echo htmlspecialchars($apiDoc[2], ENT_QUOTES, 'UTF-8'); ?></span></td>
                                        <td><?php echo htmlspecialchars($apiDoc[3], ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars($apiDoc[4], ENT_QUOTES, 'UTF-8'); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <p class="admin-table-note">The ingest service currently returns 404 for OpenAPI, Swagger, and route-list probes, so this catalog is built from the endpoints this dashboard can discover from configuration and code.</p>
                </article>

                <article class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Marketplace Backfill</span>
                            <h3>Pull exact seller revenue by date range</h3>
                        </div>
                        <span class="admin-panel-meta" data-backfill-status>Ready</span>
                    </div>
                    <div class="admin-sandbox-stack">
                        <div class="admin-sandbox-actions">
                            <label class="admin-sandbox-label" for="backfill-start-date">Start date</label>
                            <input id="backfill-start-date" class="admin-date-input" type="date" data-backfill-start-date>
                            <label class="admin-sandbox-label" for="backfill-end-date">End date</label>
                            <input id="backfill-end-date" class="admin-date-input" type="date" data-backfill-end-date>
                            <button type="button" class="admin-primary-btn" data-backfill-run>Run Backfill</button>
                        </div>
                        <div class="admin-note-stack" data-backfill-output>
                            <div class="admin-note-card">
                                <strong>Scope</strong>
                                <span>Runs the ingest service for Shopee and TikTok over the selected dates, then refreshes dashboard order rows and FIFO COGS allocations.</span>
                            </div>
                        </div>
                    </div>
                </article>

                <article class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Meta Setup</span>
                            <h3>WhatsApp webhook target</h3>
                        </div>
                    </div>
                    <div class="admin-note-stack">
                        <div class="admin-note-card">
                            <strong>Callback URL</strong>
                            <span class="admin-code-block"><?php echo htmlspecialchars($whatsappWebhookUrl, ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                        <div class="admin-note-card">
                            <strong>Config file path</strong>
                            <span class="admin-code-block"><?php echo htmlspecialchars($configPath, ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                        <div class="admin-note-card">
                            <strong>Config keys</strong>
                            <span class="admin-code-block">whatsapp_verify_token • whatsapp_app_secret • conversion_webhook_secret</span>
                        </div>
                        <div class="admin-note-card">
                            <strong>Fallback internal webhook</strong>
                            <span class="admin-code-block"><?php echo htmlspecialchars($conversionWebhookUrl, ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                    </div>
                </article>

                <article class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Message Code</span>
                            <h3>Expected order format</h3>
                        </div>
                    </div>
                    <div class="admin-note-stack">
                        <div class="admin-note-card">
                            <strong>Pattern</strong>
                            <span class="admin-code-block">(FB|YT|TK|IG)(JGB|JGJ)(15|30|60)(OR|KL|VA|GU)</span>
                        </div>
                        <div class="admin-note-card">
                            <strong>Example</strong>
                            <span class="admin-code-block">YTJGB30GU</span>
                        </div>
                        <div class="admin-note-card">
                            <strong>Recommendation</strong>
                            <span>Keep the code on the first line of the WhatsApp message so the webhook can match it reliably even if the customer adds extra text underneath.</span>
                        </div>
                    </div>
                </article>

                <article class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Parser Playground</span>
                            <h3>Test a WhatsApp message before you connect Meta</h3>
                        </div>
                    </div>
                    <div class="admin-sandbox-stack">
                        <label class="admin-sandbox-label" for="message-test-input">Paste the incoming WhatsApp text here</label>
                        <textarea id="message-test-input" class="admin-sandbox-textarea" spellcheck="false">YTJGB30GU

Halo Admin Jenang Gemi, saya ingin order Jenang Gemi Bubur.
Rasa yang dipilih: Gula Aren
Paket yang dipilih: 30 Sachet</textarea>
                        <div class="admin-sandbox-actions">
                            <button type="button" class="admin-primary-btn" data-parser-run>Test Parser</button>
                            <button type="button" class="admin-ghost-btn" data-parser-fill>Load Example</button>
                        </div>
                        <div class="admin-note-stack" data-parser-output>
                            <div class="admin-note-card">
                                <strong>Status</strong>
                                <span>Waiting for test input.</span>
                            </div>
                        </div>
                    </div>
                </article>
            </section>
                </main>
            </div>
        </div>
    </div>
    <script>
        (() => {
            const startDate = document.querySelector('[data-backfill-start-date]');
            const endDate = document.querySelector('[data-backfill-end-date]');
            const backfillButton = document.querySelector('[data-backfill-run]');
            const backfillStatus = document.querySelector('[data-backfill-status]');
            const backfillOutput = document.querySelector('[data-backfill-output]');
            const formatDate = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
            if (startDate && endDate && backfillButton && backfillStatus && backfillOutput) {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                if (!startDate.value) startDate.value = formatDate(yesterday);
                if (!endDate.value) endDate.value = formatDate(today);

                const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[char]));

                backfillButton.addEventListener('click', async () => {
                    const payload = {
                        start_date: startDate.value,
                        end_date: endDate.value
                    };
                    backfillButton.disabled = true;
                    backfillStatus.textContent = 'Running';
                    backfillOutput.innerHTML = '<div class="admin-note-card"><strong>Status</strong><span>Backfill is running. Shopee escrow detail can take a while.</span></div>';

                    try {
                        const response = await fetch('../api/orders/', {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const data = await response.json();
                        if (!response.ok || data.ok === false) {
                            throw new Error(data.message || data.error || 'Backfill failed.');
                        }
                        const orders = Array.isArray(data.orders) ? data.orders : [];
                        backfillStatus.textContent = 'Complete';
                        backfillOutput.innerHTML = `
                            <div class="admin-note-card">
                                <strong>Backfilled</strong>
                                <span>${orders.length} order item rows from ${escapeHtml(data.start_date)} to ${escapeHtml(data.end_date)}.</span>
                            </div>
                            <div class="admin-note-card">
                                <strong>Next</strong>
                                <span>Open the Executive Dashboard Orders page to inspect revenue, COGS, and FIFO PO allocations.</span>
                            </div>
                        `;
                    } catch (error) {
                        backfillStatus.textContent = 'Failed';
                        backfillOutput.innerHTML = `
                            <div class="admin-note-card">
                                <strong>Error</strong>
                                <span>${escapeHtml(error.message || 'Backfill failed.')}</span>
                            </div>
                        `;
                    } finally {
                        backfillButton.disabled = false;
                    }
                });
            }
        })();

        (() => {
            const textarea = document.getElementById('message-test-input');
            const output = document.querySelector('[data-parser-output]');
            const runButton = document.querySelector('[data-parser-run]');
            const fillButton = document.querySelector('[data-parser-fill]');
            if (!textarea || !output || !runButton || !fillButton) return;

            const exampleMessage = `YTJGB30GU

Halo Admin Jenang Gemi, saya ingin order Jenang Gemi Bubur.
Rasa yang dipilih: Gula Aren
Paket yang dipilih: 30 Sachet`;

            const maps = {
                source: { FB: 'Facebook', YT: 'YouTube', TK: 'TikTok', IG: 'Instagram' },
                product: { JGB: 'Jenang Gemi Bubur', JGJ: 'Jenang Gemi Jamu' },
                flavor: { OR: 'Original', KL: 'Klepon', VA: 'Vanilla', GU: 'Gula Aren' }
            };

            const render = (html) => {
                output.innerHTML = html;
            };

            const testParser = () => {
                const text = textarea.value.trim();
                const match = text.match(/\b(FB|YT|TK|IG)(JGB|JGJ)(15|30|60)(OR|KL|VA|GU)\b/i);

                if (!match) {
                    render(`
                        <div class="admin-note-card">
                            <strong>Status</strong>
                            <span>Code not found. The webhook would ignore this message until one of the expected order codes appears inside it.</span>
                        </div>
                    `);
                    return;
                }

                const sourceCode = match[1].toUpperCase();
                const productCode = match[2].toUpperCase();
                const packSize = match[3];
                const flavorCode = match[4].toUpperCase();
                const orderCode = match[0].toUpperCase();

                render(`
                    <div class="admin-note-card">
                        <strong>Status</strong>
                        <span>Matched successfully. This message would be stored as a real conversion.</span>
                    </div>
                    <div class="admin-note-card">
                        <strong>Order code</strong>
                        <span class="admin-code-block">${orderCode}</span>
                    </div>
                    <div class="admin-note-card">
                        <strong>Decoded</strong>
                        <span>${maps.source[sourceCode]} • ${maps.product[productCode]} • ${packSize} Sachet • ${maps.flavor[flavorCode]}</span>
                    </div>
                `);
            };

            runButton.addEventListener('click', testParser);
            fillButton.addEventListener('click', () => {
                textarea.value = exampleMessage;
                testParser();
            });
        })();
    </script>
</body>
</html>
