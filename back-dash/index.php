<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
jg_admin_require_auth();

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$whatsappWebhookUrl = 'https://jenanggemi.com/whatsapp-webhook.php';
$conversionWebhookUrl = 'https://jenanggemi.com/conversion-webhook.php';
$configPath = '/public_html/whatsapp-config.local.php';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Jenang Gemi Back-dash</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-suite admin-app-lab">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <aside class="admin-rail" aria-label="Admin navigation">
                <a class="admin-rail-brand" href="../dashboard/" aria-label="Executive Dashboard home"><span class="admin-rail-brand-mark" aria-hidden="true"><span class="admin-rail-brand-core"></span></span><span class="admin-rail-brand-wordmark">ADMIN</span></a>
                <nav class="admin-rail-nav">
                    <a class="admin-rail-link" href="../dashboard/" aria-label="Open home dashboard"><span class="admin-rail-icon admin-rail-icon-home" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Home</span></a>
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="website" aria-label="Open website dashboard"><span class="admin-rail-icon admin-rail-icon-rocket" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Website</span></a>
                    <a class="admin-rail-link" href="../affiliate-program/" aria-label="Open affiliate program dashboard"><span class="admin-rail-icon admin-rail-icon-affiliate" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Affiliate</span></a>
                    <a class="admin-rail-link" href="../partner-program/" aria-label="Open partner program dashboard"><span class="admin-rail-icon admin-rail-icon-partner" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Partner</span></a>
                    <a class="admin-rail-link" href="../sku-db/" aria-label="Open SKU database"><span class="admin-rail-icon admin-rail-icon-sku" aria-hidden="true"><span>SKU</span></span><span class="admin-rail-link-text">SKU DB</span></a>
                </nav>
                <div class="admin-rail-footer">
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="settings" aria-label="Open admin settings"><span class="admin-rail-icon admin-rail-icon-settings" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Settings</span></a>
                </div>
            </aside>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip admin-chip-accent">Experimental Sandbox</span>
                        <h1>Jenang Gemi Back-dash</h1>
                        <p>Isolated workspace for WhatsApp/API conversion tracking tests without disturbing the main executive dashboard.</p>
                    </div>
                    <div class="admin-topbar-actions">
                        <a class="admin-ghost-btn admin-link-btn" href="../dashboard/">Back to Dashboard</a>
                        <a class="admin-primary-btn admin-link-btn" href="../logout/">Lock Dashboard</a>
                    </div>
                </header>

                <main class="admin-layout">
            <section class="admin-hero-panel admin-lab-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip">Safe for Experiments</span>
                    <h2>Use this page for trial integrations, webhook ideas, and WhatsApp conversion concepts.</h2>
                    <p>Nothing here needs to affect the production dashboard unless you decide it is worth keeping. Treat this as the quarantine zone for abandoned ideas, rough API tests, and temporary tracking prototypes.</p>
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
