const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'dashboard/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/inventory-recap/index.php'), 'utf8');
const purchaseOrders = fs.readFileSync(path.join(root, 'purchase-orders-bootstrap.php'), 'utf8');
const inventoryBootstrap = fs.readFileSync(path.join(root, 'inventory-recap-bootstrap.php'), 'utf8');

assert.match(dashboard, /data-view-panel="inventory-recap"[\s\S]*Reorder triggers[\s\S]*data-inventory-filter="triggered"[^>]*>Needs purchase[\s\S]*data-inventory-filter="initial"[^>]*>Initial purchases[\s\S]*data-inventory-filter="all"[^>]*>All products/);
assert.doesNotMatch(dashboard, /data-inventory-filter="(?:partial|near|healthy|manual)"/);
assert.match(dashboard, /stock will remain after every listed Store Ops order is fulfilled/);
assert.match(dashboard, /Stock alerts[\s\S]*Projected at or below trigger/);
assert.doesNotMatch(dashboard, /Projected stock = stock now − every unit committed to listed Store Ops orders/);
assert.match(dashboard, /data-inventory-filter="triggered"[\s\S]*data-inventory-partial-alert[^>]*hidden/);
assert.match(dashboard, /data-inventory-product-search[^>]*placeholder="Search products\.\.\."/);
assert.match(dashboard, /data-inventory-product-brand[\s\S]*All brands[\s\S]*data-inventory-product-type[\s\S]*All products[\s\S]*data-inventory-product-flavor[\s\S]*All flavors/);
assert.match(dashboard, /data-inventory-product-volume[^>]*placeholder="250"/);
assert.match(dashboard, /Store Ops commitments[\s\S]*Reading listed orders/);
assert.match(dashboard, /data-inventory-recap-manual/);
assert.match(dashboard, /data-inventory-recap-stock-value>Rp0<[\s\S]*On-hand units × COGS/);
assert.match(dashboard, /75% order 19 ÷ MOQ 11 → buy 22/);
assert.match(dashboard, /data-view-panel="purchase-order"[\s\S]*MOQ-ready purchase plan[\s\S]*data-purchase-plan-place[\s\S]*data-purchase-plan-download/);
assert.match(dashboard, /admin-back-icon-button admin-purchase-back[^>]*data-view-switch="inventory-recap"[^>]*aria-label="Back to Inventory Recap"/);
assert.match(dashboard, /data-purchase-plan-toggle-all[^>]*disabled[^>]*>Select all</);
assert.match(dashboard, /data-purchase-mode-open="overflow"[\s\S]*Buy overflow/);
assert.match(dashboard, /data-purchase-plan-mode="overflow"[\s\S]*Add any product and pay for the exact extra quantity/);
assert.match(dashboard, /data-overflow-product-search[\s\S]*data-overflow-product-results/);
assert.match(dashboard, /admin-purchase-rule[\s\S]*admin-purchase-selection-bar[\s\S]*data-purchase-plan-toggle-all[\s\S]*data-purchase-plan-list/);
assert.match(dashboard, /Sent to Store Ops[\s\S]*confirmed and pending in Store Ops/);
assert.match(dashboard, /Stock already on the way[\s\S]*data-inventory-po-list/);

assert.match(script, /data-inventory-automatic/);
assert.match(script, /inventoryRecapClientCacheKey[\s\S]*trigger-v6/, 'The small-data trigger model must not restore pre-change cached values.');
assert.match(script, /data-inventory-manual-trigger/);
assert.match(script, /data-inventory-moq/);
assert.match(script, /data-inventory-moq-save[^>]*>\$\{moqSaving \? 'Saving' : 'Save MOQ'\}/);
assert.match(dashboard, /admin-inventory-order-action[\s\S]*<svg[\s\S]*Order[\s\S]*<\/header>[\s\S]*admin-inventory-utility-bar[\s\S]*>See History<[\s\S]*data-inventory-global-days-form[\s\S]*Order days/);
assert.match(dashboard, /admin-inventory-po-board-head[\s\S]*admin-inventory-po-board-tools[\s\S]*admin-inventory-utility-bar/);
assert.match(dashboard, /admin-po-payment-modes admin-sliding-chart-toggle[\s\S]*admin-toggle-pill is-active[\s\S]*data-po-payment-mode="products"/);
assert.match(script, /admin-po-pay-action[\s\S]*Pay PO[\s\S]*admin-po-payment-modes[\s\S]*syncSlidingIndicator/);
assert.match(script, /paymentModeToggle\.dataset\.activeMode = mode/);
assert.match(styles, /admin-po-pay-action:not\(\.is-paid\)[\s\S]*color:#090909 !important/);
assert.match(styles, /admin-po-payment-modes\[data-active-mode="products"\][\s\S]*translate3d\(300%/);
assert.match(script, /data-inventory-global-days/);
assert.match(script, /Math\.ceil\(entered \/ moq\) \* moq/);
const modeSaveSource = script.slice(
  script.indexOf('const saveInventoryMode'),
  script.indexOf('const saveInventoryManualTrigger')
);
assert.match(modeSaveSource, /action: 'update_inventory_mode'/);
assert.doesNotMatch(modeSaveSource, /manual_trigger:|purchase_moq:/, 'Automatic must persist without bundling trigger or MOQ values.');
assert.match(modeSaveSource, /modeSaving\[sku\][\s\S]*while \(state\.inventoryRecap\.modeDesired\[sku\] !== state\.inventoryRecap\.modePersisted\[sku\]\)/, 'Each SKU must save independently and preserve the last toggle choice.');
const moqSaveSource = script.slice(
  script.indexOf('const saveInventoryMoq'),
  script.indexOf('const saveGlobalInventoryDays')
);
assert.match(moqSaveSource, /action: 'update_purchase_moq'[\s\S]*purchase_moq: purchaseMoq/);
assert.doesNotMatch(moqSaveSource, /automatic:|manual_trigger:/, 'The MOQ button must save only MOQ.');
assert.match(script, /action: 'update_manual_trigger'/, 'Manual trigger changes must save without using the MOQ button.');
assert.match(script, /queueInventorySettingRefresh[\s\S]*settingsRevision/, 'Derived inventory figures must refresh after fast setting updates without accepting stale responses.');
assert.match(script, /Trigger model: time-based demand \+ high-order allowance \+ slow-mover allowance \+ price allowance \+ small-data allowance \(10 in week one, 5 in week two\); MOQ does not affect the trigger/);
assert.match(script, /const inventoryTriggerWhy[\s\S]*admin-inventory-trigger-why[\s\S]*See why/);
assert.match(script, /data-inventory-setting-message[\s\S]*\$\{inventoryTriggerWhy\(item\)\}/, 'Every inventory row must render its trigger explanation, including manual-mode rows.');
assert.doesNotMatch(script, /!message && \(automatic \|\| initialPurchase\)[\s\S]{0,80}inventoryTriggerWhy/, 'Saving state and manual mode must not hide the trigger explanation.');
assert.match(script, /large_order_addition[\s\S]*slow_mover_boost_units[\s\S]*price_addition[\s\S]*small_data_addition[\s\S]*automatic_trigger/);
assert.match(script, /MOQ is not included in the trigger; it only rounds a purchase quantity/);
assert.match(script, /buildPurchaseOrderPdf/);
assert.match(script, /PURCHASE ORDER/);
const purchasePdfSource = script.slice(
  script.indexOf('const buildPurchaseOrderPdf'),
  script.indexOf('const downloadInventoryPurchasePdf')
);
assert.match(purchasePdfSource, /const pageWidth = 595;[\s\S]*const pageHeight = 842;/);
assert.doesNotMatch(purchasePdfSource, /#9dff00|#d6294f|#101419|#ffffff/i);
assert.match(script, /action: 'create_draft'/);
assert.match(script, /action: 'confirm_order'/);
assert.match(script, /draftOrderId[\s\S]*action: 'confirm_order'[\s\S]*action: 'place_order'/);
assert.match(script, /purchasePlanRefs\.place\.disabled = state\.inventoryRecap\.loading \|\| state\.inventoryRecap\.placingOrder \|\| !rows\.length;/);
assert.match(script, /form\.set\('action', 'pay_order'\)/);
assert.match(script, /data-purchase-plan-search/);
assert.match(dashboard, /data-view-panel="po-history"[\s\S]*PO History/);
assert.match(dashboard, /data-view-panel="po-detail"[\s\S]*PO breakdown/);
assert.match(script, /admin-po-download-action[\s\S]*data-po-download[\s\S]*Download PO[\s\S]*PDF copy/);
assert.match(script, /closest\('\[data-po-download\]'\)[\s\S]*purchaseOrders\(\)\.find[\s\S]*downloadInventoryPurchasePdf\(order\)/);
assert.match(styles, /\.admin-po-download-action[\s\S]*min-width:164px/);
assert.match(dashboard, /data-po-payment-mode="full"[\s\S]*data-po-payment-mode="products"/);
assert.match(dashboard, /name="proofs\[\]"[\s\S]*multiple[\s\S]*data-po-payment-proof[\s\S]*up to 5 PDF, PNG, JPG, or WebP files/);
assert.match(script, /data-po-tag/);
assert.match(script, /payment\.proofs[\s\S]*proofs\.map[\s\S]*Open proof/);
assert.match(script, /new FormData\(\)[\s\S]*proofs\.forEach[\s\S]*form\.append\('proofs\[\]'/);
assert.match(script, /admin-inventory-po-card-meta[\s\S]{0,700}admin-po-card-tag/);
assert.match(script, /downloadInventoryPurchasePdf\(state\.inventoryRecap\.placedOrder\)/);
assert.match(script, /inventoryUrgencyCompare[\s\S]*\.sort\(inventoryUrgencyCompare\)/);
assert.match(script, /priority = \{ urgent: 8, partial: 7, triggered: 6, initial: 5,[\s\S]*predicted_stock/);
assert.match(script, /return trigger > 0 \? Number\(item\.predicted_stock \?\? item\.current_stock \?\? 0\) \/ trigger/);
assert.match(script, /meterTarget = initialPurchase[^;]*initial_target_qty[^;]*: trigger[\s\S]*stockPercent = [^;]*predictedStock \/ meterTarget/);
assert.match(script, /filter: 'triggered'/);
assert.match(script, /needsPurchaseRisks = \['urgent', 'triggered', 'partial', 'near'\]/);
assert.match(script, /syncInventoryProductFilters[\s\S]*inventoryDistinctValues\(rows, 'brand_name'\)[\s\S]*inventoryDistinctValues\(brandRows, 'base_product_name'\)[\s\S]*inventoryDistinctValues\(productRows, 'flavor_name'\)/);
assert.match(script, /inventoryProductMatchesSearch[\s\S]*matchesBrand[\s\S]*matchesProduct[\s\S]*matchesFlavor[\s\S]*matchesVolume/);
assert.match(script, /Math\.abs\(Number\(item\.volume \|\| 0\) - requestedVolume\) < 0\.01/);
assert.match(script, /\['urgent', 'triggered', 'partial', 'initial', 'near', 'healthy', 'quiet', 'incoming'\]/);
assert.match(script, /filter === 'initial' && Boolean\(item\.initial_purchase\)/);
assert.match(script, /summary\.alert_count \?\? summary\.triggered_count/);
assert.match(script, /Projected stock[\s\S]*committedQty[\s\S]*incoming PO[\s\S]*covered/);
assert.match(script, /const inventoryProjectedStockMarkup[\s\S]*committed_orders[\s\S]*admin-inventory-commitment-details[\s\S]*Orders reducing stock/);
assert.match(script, /href="\.\.\/order\/\?order_id=\$\{encodeURIComponent[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"/, 'Committed order IDs must open the Executive order breakdown in a new tab.');
assert.match(script, /admin-inventory-predicted-stock[\s\S]*inventoryProjectedStockMarkup\(item, predictedStock, predictionAvailable\)/);
assert.match(styles, /\.admin-inventory-commitment-details summary[\s\S]*cursor: pointer[\s\S]*\.admin-inventory-commitment-panel[\s\S]*max-height: 220px/);
assert.match(script, /partialRequiredCount[\s\S]*partialAlert\.hidden = partialRequiredCount === 0[\s\S]*Needs purchase, including/);
assert.match(script, /const syncInventoryRecapAlert[\s\S]*summary\?\.has_alert \?\? summary\?\.is_critical/);
assert.doesNotMatch(script, /const syncInventoryRecapAlert[\s\S]{0,180}state\.activeView === 'overview'/);
assert.match(script, /const purchasePlanRows[\s\S]*suggestions\.map[\s\S]*\.sort\(inventoryUrgencyCompare\)/);
assert.match(script, /admin-inventory-incoming-qty[\s\S]*units in process[\s\S]*buy \$\{formatRegionalInteger\(item\.recommended_order_qty/);
assert.match(script, /planSelected:\s*\{\}/);
assert.match(script, /purchaseMode:[\s\S]*overflowProductSearch:[\s\S]*overflowItems:/);
assert.match(script, /const purchaseCatalogRows[\s\S]*const renderOverflowProductResults/);
assert.match(inventoryBootstrap, /'purchase_catalog'\s*=>\s*array_values\(\$skus\)/);
assert.match(inventoryBootstrap, /inventory_commitments=1[\s\S]*Authorization: Bearer/);
assert.match(inventoryBootstrap, /currentStock - \$committedQty/);
assert.match(inventoryBootstrap, /jg_inventory_recap_is_initial_purchase\(\$currentStock, !empty\(\$history\['ever_stocked'\]\)\)/);
const triggerAdditionsSource = inventoryBootstrap.slice(
  inventoryBootstrap.indexOf('function jg_inventory_recap_trigger_additions'),
  inventoryBootstrap.indexOf('function jg_inventory_recap_empty_trigger_model')
);
assert.match(triggerAdditionsSource, /demandTrigger[\s\S]*slowMoverAddition[\s\S]*smallDataAddition[\s\S]*largeOrderAddition[\s\S]*priceAddition[\s\S]*automatic_trigger/);
assert.doesNotMatch(triggerAdditionsSource, /purchase_moq|purchaseMoq/, 'MOQ must not participate in automatic trigger arithmetic.');
assert.match(script, /order_type: state\.inventoryRecap\.purchaseMode/);
assert.match(script, /data-purchase-plan-select[\s\S]*planSelected\[selectionSku\] = input\.checked/);
assert.match(script, /purchasePlanRefs\.toggleAll[\s\S]*every\(\(item\) => item\.selected\)/);
assert.doesNotMatch(script, /data-purchase-plan-remove|planExcluded/);
assert.match(script, /quantitySku[\s\S]*planEdited\[quantitySku\] = true/);
assert.match(script, /data-inventory-po-cancel[\s\S]*action: 'cancel_order'/);
assert.match(script, /removed from Store Ops/);
assert.match(script, /const purchaseOrderIsPaid[\s\S]*paid_total[\s\S]*amount_due/);
assert.match(script, /filter\(\(order\) => String\(order\.status \|\| ''\) !== 'cancelled' && !purchaseOrderIsPaid\(order\)\)/);
assert.match(script, /state\.activeView === 'purchase-order' \? 'inventory-recap'/);
assert.doesNotMatch(script, /inventoryRecapDays|current_days_remaining/);

assert.match(api, /update_settings/);
assert.match(api, /purchase_moq = :purchase_moq/);
assert.match(api, /update_inventory_mode[\s\S]*inventory_mode = :inventory_mode/);
assert.match(api, /update_manual_trigger[\s\S]*stock_trigger = :stock_trigger/);
assert.match(api, /update_purchase_moq[\s\S]*purchase_moq = :purchase_moq/);
assert.match(api, /is_array\(\$fastSettingUpdate\)[\s\S]*settings_updated[\s\S]*return;/, 'Single-product settings must return before the full inventory payload is rebuilt.');
assert.match(api, /update_purchase_days/);
assert.match(api, /jg_purchase_orders_place/);
assert.match(api, /jg_purchase_orders_create_draft/);
assert.match(api, /jg_accounting_create_transaction/);
assert.match(api, /jg_accounting_cash_account_balances/);
assert.match(api, /multipart\/form-data[\s\S]*jg_purchase_orders_validate_payment_proofs/);
assert.doesNotMatch(api, /jg_accounting_account_balances/);
assert.match(api, /jg_purchase_orders_cancel/);
assert.doesNotMatch(api, /sku_skus[\s\S]{0,300}purchase_days\s*=/);
assert.match(purchaseOrders, /confirmed_at = :confirmed_at, updated_at = :updated_at/, 'Direct PO confirmation must use unique native-MySQL placeholders.');
assert.doesNotMatch(purchaseOrders, /confirmed_at = :now, updated_at = :now/, 'Direct PO confirmation must not reuse one named placeholder twice.');

assert.match(navigation, /'purchase-order'\s*=>\s*\[[\s\S]*'label'\s*=>\s*'Purchase Plan'/);
assert.match(navigation, /'key'\s*=>\s*'inventory-recap'[\s\S]*'label'\s*=>\s*'Inventory Recap'[\s\S]*'icon'\s*=>\s*'admin-rail-icon-inventory'/);
assert.match(styles, /\.admin-rail-icon-inventory/);
assert.match(styles, /admin-rail-icon-inventory[\s\S]{0,700}M9 3v3h6V3/);
assert.match(styles, /\.admin-purchase-select\s*\{[\s\S]*\.admin-purchase-select input:checked \+ span/);
assert.match(styles, /\.admin-inventory-incoming-qty\s*\{[\s\S]*color:\s*#60a5fa/);
assert.match(styles, /\.admin-inventory-trigger-row\.is-urgent[\s\S]*var\(--inventory-red\)/);
assert.match(styles, /\.admin-inventory-trigger-row\.is-triggered[\s\S]*var\(--inventory-amber\)/);
assert.match(styles, /\.admin-inventory-filter-alert\s*\{[\s\S]*background:\s*var\(--inventory-red\)/);
assert.match(styles, /\.admin-inventory-trigger-why[\s\S]*\.admin-inventory-trigger-why summary[\s\S]*text-decoration:\s*underline/);
assert.match(styles, /\.admin-inventory-trigger-row\.is-incoming,[\s\S]*\.admin-inventory-trigger-row\.is-partial[\s\S]*#3b82f6/);
assert.match(inventoryBootstrap, /\$predictedStock = \$coveredStock - \$incomingQty[\s\S]*\$predictedStock < 0[\s\S]*'key' => 'partial'[\s\S]*'label' => 'Partial required'/);
assert.match(inventoryBootstrap, /'trigger_gap' => \(int\) floor\(\$predictedStockWithoutIncoming - \$triggerQty\)/);
assert.match(styles, /\.admin-purchase-remove/);
assert.match(styles, /\.admin-overflow-product-adder/);
assert.match(purchaseOrders, /order_type[\s\S]*\['reorder', 'overflow'\]/);
assert.match(purchaseOrders, /\$orderType === 'overflow'[\s\S]*\(int\) \$request\['quantity'\]/);

const inventoryStyles = styles.slice(
  styles.indexOf('/* Inventory coverage and editable purchase plan */'),
  styles.indexOf(":root[data-admin-theme='light'] .admin-wallet-command")
);
assert.ok(inventoryStyles.length > 1000, 'Inventory overhaul styles should exist.');
assert.doesNotMatch(inventoryStyles, /gradient\s*\(/i);
assert.match(inventoryStyles, /\.admin-inventory-trigger-row/);
assert.match(inventoryStyles, /\.admin-inventory-auto-switch/);
assert.match(inventoryStyles, /@media \(max-width: 560px\)/);

console.log('inventory-recap-ui-test: ok');
