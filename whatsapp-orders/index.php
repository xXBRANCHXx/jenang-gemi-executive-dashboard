<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageJsVersion = (string) @filemtime(dirname(__DIR__) . '/whatsapp-orders.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>WhatsApp Orders | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('whatsapp'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-whatsapp-orders-page">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.92.7</div>
    <div class="admin-app admin-app-suite" data-whatsapp-orders data-endpoint="../api/whatsapp-orders/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('whatsapp'); ?>

            <div class="admin-shell-main whatsapp-orders-page">
                <header class="admin-topbar whatsapp-orders-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand">
                            <span class="admin-panel-kicker">Executive order entry</span>
                            <h1>WhatsApp Orders</h1>
                        </div>
                    </div>
                    <?php render_admin_topbar_actions('whatsapp-orders'); ?>
                </header>

                <main class="whatsapp-orders-layout">
                    <section class="whatsapp-order-builder" aria-labelledby="whatsapp-builder-title">
                        <div class="whatsapp-order-hero">
                            <div>
                                <span class="admin-panel-kicker">Direct order</span>
                                <h2 id="whatsapp-builder-title">Create WhatsApp order</h2>
                                <p>Enter the customer, choose products, and upload the shipping label. Saved prices sync to Store Ops for customer invoice printing.</p>
                            </div>
                            <div class="whatsapp-order-flow" aria-label="Order workflow">
                                <span class="is-active">1 · Construct</span>
                                <span>2 · List</span>
                                <span>3 · Fulfill</span>
                            </div>
                        </div>

                        <form class="whatsapp-order-form" data-order-form>
                            <section class="whatsapp-order-panel">
                                <div class="whatsapp-order-panel-head">
                                    <div><span>Customer</span><h3>Delivery details</h3></div>
                                    <small>Only fulfillment details go to Store Ops</small>
                                </div>
                                <div class="whatsapp-order-field-grid">
                                    <label><span>Customer name</span><input name="customer_name" type="text" maxlength="160" autocomplete="name" required></label>
                                    <label><span>WhatsApp phone</span><input name="customer_phone" type="tel" maxlength="50" autocomplete="tel" placeholder="08…"></label>
                                    <label class="is-wide"><span>Delivery address</span><textarea name="customer_address" maxlength="1000" rows="3" autocomplete="street-address"></textarea></label>
                                    <label class="is-wide"><span>Internal / packing notes</span><textarea name="notes" maxlength="500" rows="2" placeholder="Optional"></textarea></label>
                                </div>
                            </section>

                            <section class="whatsapp-order-panel">
                                <div class="whatsapp-order-panel-head">
                                    <div><span>Products</span><h3>Choose SKU quantities</h3></div>
                                    <label class="whatsapp-sku-search"><span>Search</span><input type="search" data-sku-search placeholder="SKU, product, flavor, tag"></label>
                                </div>
                                <div class="whatsapp-order-product-grid">
                                    <div class="whatsapp-product-browser">
                                        <div class="whatsapp-filter-block">
                                            <span>Company</span>
                                            <div class="whatsapp-filter-pills" data-company-filter><button type="button" class="is-active" data-company-value="">All companies</button></div>
                                        </div>
                                        <div class="whatsapp-filter-block">
                                            <span>Product</span>
                                            <div class="whatsapp-filter-pills whatsapp-product-filter" data-product-filter><button type="button" class="is-active" data-product-value="">All products</button></div>
                                        </div>
                                        <div class="whatsapp-filter-block">
                                            <span>Flavor</span>
                                            <div class="whatsapp-filter-pills" data-flavor-filter><button type="button" class="is-active" data-flavor-value="">All</button></div>
                                        </div>
                                        <div class="whatsapp-sku-list" data-sku-list><p class="admin-empty">Loading SKU catalog…</p></div>
                                    </div>
                                    <aside class="whatsapp-order-cart">
                                        <div class="whatsapp-order-cart-head"><span>Order preview</span><strong data-cart-count>0 SKU</strong></div>
                                        <div data-cart-list><p class="admin-empty">Select at least one SKU.</p></div>
                                    </aside>
                                </div>
                            </section>

                            <section class="whatsapp-order-panel">
                                <div class="whatsapp-order-panel-head">
                                    <div><span>Fulfillment</span><h3>Label, deadline, and metrics</h3></div>
                                    <small>PDF · maximum 10 MB</small>
                                </div>
                                <div class="whatsapp-fulfillment-grid">
                                    <label class="whatsapp-label-drop" data-label-drop>
                                        <input type="file" name="label" accept=".pdf,application/pdf" data-label-input required>
                                        <span class="whatsapp-label-icon" aria-hidden="true">PDF</span>
                                        <strong data-label-name>Choose shipping label</strong>
                                        <small>Required, following the Partner order flow</small>
                                    </label>
                                    <label class="whatsapp-range-field">
                                        <span>Store Ops deadline <strong data-deadline-value>24h</strong></span>
                                        <input type="range" name="deadline_hours" min="12" max="48" value="24" data-deadline-input>
                                        <small>12 hours <i></i> 48 hours</small>
                                    </label>
                                    <label class="whatsapp-money-field">
                                        <span>Shipping cost</span>
                                        <div><b>Rp</b><input type="number" name="shipping_cost" min="0" max="99999999999999" step="1" value="0" inputmode="numeric" required></div>
                                        <small>Saved for metrics and the customer invoice total</small>
                                    </label>
                                    <div class="whatsapp-discount-field">
                                        <span>Order discount</span>
                                        <div class="whatsapp-discount-modes" role="group" aria-label="Discount type">
                                            <button type="button" data-discount-mode="sale_price">Sale price</button>
                                            <button type="button" class="is-active" data-discount-mode="percentage">Percentage</button>
                                        </div>
                                        <label>
                                            <b data-discount-prefix>%</b>
                                            <input type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="0" data-discount-value>
                                        </label>
                                        <small data-discount-help>Percentage off the merchandise total after item discounts.</small>
                                    </div>
                                </div>
                            </section>

                            <section class="whatsapp-order-submit-panel">
                                <div class="whatsapp-order-totals">
                                    <span>Merchandise subtotal <strong data-merchandise-subtotal>Rp0</strong></span>
                                    <span>Discount <strong data-discount-total>Rp0</strong></span>
                                    <span>Merchandise total <strong data-merchandise-total>Rp0</strong></span>
                                    <span>Shipping <strong data-shipping-total>Rp0</strong></span>
                                    <span class="is-total">Customer total <strong data-customer-total>Rp0</strong></span>
                                </div>
                                <p class="admin-form-error" data-form-error hidden></p>
                                <button type="submit" class="admin-primary-btn" data-submit-order disabled>Send listed order to Store Ops</button>
                            </section>
                        </form>
                    </section>

                    <section class="whatsapp-order-history" aria-labelledby="whatsapp-history-title">
                        <div class="whatsapp-order-history-head">
                            <div><span>Live lifecycle</span><h2 id="whatsapp-history-title">Recent WhatsApp orders</h2></div>
                            <div class="whatsapp-order-history-actions">
                                <a class="admin-ghost-btn" href="../whatsapp-order-history/">View all history</a>
                                <button type="button" class="admin-ghost-btn" data-refresh-orders>Refresh</button>
                            </div>
                        </div>
                        <div class="whatsapp-order-history-list" data-order-list><p class="admin-empty">Loading orders…</p></div>
                    </section>
                </main>
            </div>
        </div>
    </div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../whatsapp-orders.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
