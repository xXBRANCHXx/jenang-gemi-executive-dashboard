const root = document.querySelector('[data-profit-loss]');

if (root) {
  const apiEndpoint = root.dataset.apiEndpoint || '../api/profit-loss/';
  const salesEndpoint = root.dataset.salesEndpoint || '../api/sales/';
  const now = new Date();
  const currentYear = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(now));
  const currentMonth = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Asia/Jakarta' }).format(now));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const state = {
    year: currentYear,
    month: currentMonth,
    sales: null,
    stored: null,
    products: [],
    monthly: [],
    search: '',
    loading: false,
    draftProductCards: null,
    deletedProductCards: [],
    productCardFilters: {},
    draftSyrupGroups: null,
    draftMetrics: null
  };

  const refs = {
    year: root.querySelector('[data-pl-year]'),
    month: root.querySelector('[data-pl-month]'),
    periodLabel: root.querySelector('[data-pl-period-label]'),
    syncLabel: root.querySelector('[data-pl-sync-label]'),
    refresh: root.querySelector('[data-pl-refresh]'),
    search: root.querySelector('[data-pl-search]'),
    ledger: root.querySelector('[data-pl-ledger]'),
    productCards: root.querySelector('[data-pl-product-cards]'),
    syrupGroups: root.querySelector('[data-pl-syrup-groups]'),
    coverage: root.querySelector('[data-pl-coverage]'),
    entrySections: root.querySelector('[data-pl-entry-sections]'),
    allocationList: root.querySelector('[data-pl-allocation-list]'),
    dataQuality: root.querySelector('[data-pl-data-quality]'),
    monthlyBody: root.querySelector('[data-pl-monthly-body]'),
    skuModal: root.querySelector('[data-pl-sku-modal]'),
    skuForm: root.querySelector('[data-pl-sku-form]'),
    skuTitle: root.querySelector('[data-pl-sku-title]'),
    skuPeriod: root.querySelector('[data-pl-sku-period]'),
    skuError: root.querySelector('[data-pl-sku-error]'),
    entryModal: root.querySelector('[data-pl-entry-modal]'),
    entryForm: root.querySelector('[data-pl-entry-form]'),
    entryTitle: root.querySelector('[data-pl-entry-title]'),
    entryError: root.querySelector('[data-pl-entry-error]'),
    entryLabels: root.querySelector('[data-pl-entry-labels]'),
    deleteEntry: root.querySelector('[data-pl-delete-entry]'),
    allocationModal: root.querySelector('[data-pl-allocation-modal]'),
    allocationForm: root.querySelector('[data-pl-allocation-form]'),
    allocationError: root.querySelector('[data-pl-allocation-error]'),
    productCardModal: root.querySelector('[data-pl-product-card-modal]'),
    productCardForm: root.querySelector('[data-pl-product-card-form]'),
    productCardList: root.querySelector('[data-pl-product-card-list]'),
    productCardError: root.querySelector('[data-pl-product-card-error]'),
    productCardTitle: root.querySelector('[data-pl-product-card-title]'),
    deleteProductCard: root.querySelector('[data-pl-delete-product-card]'),
    addProductCard: root.querySelector('[data-pl-add-product-card]'),
    addProductCardDraft: root.querySelector('[data-pl-add-product-card-draft]'),
    syrupSettingsModal: root.querySelector('[data-pl-syrup-settings-modal]'),
    syrupSettingsForm: root.querySelector('[data-pl-syrup-settings-form]'),
    syrupSettingsList: root.querySelector('[data-pl-syrup-settings-list]'),
    syrupSettingsError: root.querySelector('[data-pl-syrup-settings-error]'),
    addSyrupGroup: root.querySelector('[data-pl-add-syrup-group]'),
    metricsModal: root.querySelector('[data-pl-metrics-modal]'),
    metricsForm: root.querySelector('[data-pl-metrics-form]'),
    metricsList: root.querySelector('[data-pl-metrics-list]'),
    metricsError: root.querySelector('[data-pl-metrics-error]'),
    addMetric: root.querySelector('[data-pl-add-metric]'),
    toast: root.querySelector('[data-pl-toast]')
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const firstValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return 0;
  };
  const money = (value, compact = false) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard'
  }).format(number(value));
  const integer = (value) => Math.round(number(value)).toLocaleString('id-ID');
  const percent = (value) => `${(number(value) * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
  const safeDivide = (top, bottom) => number(bottom) ? number(top) / number(bottom) : 0;
  const inputNumber = (value) => String(value ?? '').replace(/[^\d.-]/g, '');
  const helpIcon = (copy, label = 'More information') => (
    `<i class="pl-help-icon" role="button" tabindex="0" aria-label="${escapeHtml(label)}" data-pl-help="${escapeHtml(copy)}" title="${escapeHtml(copy)}">i</i>`
  );
  const legacyMarker = '<span class="pl-legacy-star" title="From the old spreadsheets.">*</span>';
  const defaultStatementMetrics = [
    { metric_key: 'units', label: 'Units sold', value_key: 'units', display_format: 'integer', is_visible: true },
    { metric_key: 'gross_revenue', label: 'Gross revenue', value_key: 'grossRevenue', display_format: 'money', is_visible: true },
    { metric_key: 'marketplace_fees', label: 'Marketplace fees', value_key: 'marketplaceFees', display_format: 'money', is_visible: true },
    { metric_key: 'other_income', label: 'Other income', value_key: 'income', display_format: 'money', is_visible: true },
    { metric_key: 'revenue', label: 'Net revenue + other income', value_key: 'revenue', display_format: 'money', is_visible: true },
    { metric_key: 'average_price', label: 'Average selling price', value_key: 'averagePrice', display_format: 'money', is_visible: true },
    { metric_key: 'cogs', label: 'COGS', value_key: 'cogs', display_format: 'money', is_visible: true },
    { metric_key: 'average_cogs', label: 'Average COGS / unit', value_key: 'averageCogs', display_format: 'money', is_visible: true },
    { metric_key: 'gross_profit', label: 'Gross profit', value_key: 'grossProfit', display_format: 'money', is_visible: true },
    { metric_key: 'gross_profit_per_unit', label: 'Gross profit / unit', value_key: 'grossProfitPerUnit', display_format: 'money', is_visible: true },
    { metric_key: 'gross_margin', label: 'Gross margin', value_key: 'grossMargin', display_format: 'percent', is_visible: true },
    { metric_key: 'administration', label: 'Administration', value_key: 'administration', display_format: 'money', is_visible: true },
    { metric_key: 'administration_per_unit', label: 'Administration / unit', value_key: 'administrationPerUnit', display_format: 'money', is_visible: true },
    { metric_key: 'administration_rate', label: 'Administration %', value_key: 'administrationRate', display_format: 'percent', is_visible: true },
    { metric_key: 'marketing', label: 'Marketing', value_key: 'marketing', display_format: 'money', is_visible: true },
    { metric_key: 'marketing_per_unit', label: 'Marketing / unit', value_key: 'marketingPerUnit', display_format: 'money', is_visible: true },
    { metric_key: 'marketing_rate', label: 'Marketing %', value_key: 'marketingRate', display_format: 'percent', is_visible: true },
    { metric_key: 'other_expenses', label: 'Other expenses', value_key: 'other', display_format: 'money', is_visible: true },
    { metric_key: 'net_profit', label: 'Net profit (loss)', value_key: 'netProfit', display_format: 'money', is_visible: true },
    { metric_key: 'net_profit_per_unit', label: 'Net profit / unit', value_key: 'netProfitPerUnit', display_format: 'money', is_visible: true },
    { metric_key: 'net_margin', label: 'Net margin', value_key: 'netMargin', display_format: 'percent', is_visible: true }
  ];
  const metricDefinitions = [
    ['units', 'Units sold', 'integer'],
    ['grossRevenue', 'Gross revenue', 'money'],
    ['netRevenue', 'Net sales revenue', 'money'],
    ['marketplaceFees', 'Marketplace fees', 'money'],
    ['income', 'Other income', 'money'],
    ['revenue', 'Net revenue + other income', 'money'],
    ['averagePrice', 'Average selling price', 'money'],
    ['cogs', 'COGS', 'money'],
    ['averageCogs', 'Average COGS / unit', 'money'],
    ['grossProfit', 'Gross profit', 'money'],
    ['grossProfitPerUnit', 'Gross profit / unit', 'money'],
    ['grossMargin', 'Gross margin', 'percent'],
    ['administration', 'Administration', 'money'],
    ['administrationPerUnit', 'Administration / unit', 'money'],
    ['administrationRate', 'Administration %', 'percent'],
    ['marketing', 'Marketing', 'money'],
    ['marketingPerUnit', 'Marketing / unit', 'money'],
    ['marketingRate', 'Marketing %', 'percent'],
    ['other', 'Other expenses', 'money'],
    ['netProfit', 'Net profit (loss)', 'money'],
    ['netProfitPerUnit', 'Net profit / unit', 'money'],
    ['netMargin', 'Net margin', 'percent']
  ].map(([key, label, format]) => ({ key, label, format }));
  const formatters = { money, integer, percent };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.details || payload.error || `HTTP ${response.status}`);
    return payload;
  };

  const showToast = (message, isError = false) => {
    if (!refs.toast) return;
    refs.toast.textContent = message;
    refs.toast.classList.toggle('is-error', isError);
    refs.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { refs.toast.hidden = true; }, 3200);
  };

  let helpPopover = null;
  let activeHelpTarget = null;
  const ensureHelpPopover = () => {
    if (helpPopover) return helpPopover;
    helpPopover = document.createElement('div');
    helpPopover.className = 'pl-help-popover';
    helpPopover.setAttribute('role', 'tooltip');
    helpPopover.hidden = true;
    document.body.appendChild(helpPopover);
    return helpPopover;
  };
  const hydrateHelpTargets = (scope = root) => {
    scope.querySelectorAll('i[title], i[data-pl-help]').forEach((target) => {
      const text = target.dataset.plHelp || target.getAttribute('title') || '';
      if (!text) return;
      target.dataset.plHelp = text;
      target.removeAttribute('title');
      target.classList.add('pl-help-icon');
      target.setAttribute('role', 'button');
      target.setAttribute('tabindex', '0');
      target.setAttribute('aria-label', 'More information');
      target.setAttribute('aria-expanded', 'false');
    });
  };
  const hideHelpPopover = () => {
    if (activeHelpTarget) activeHelpTarget.setAttribute('aria-expanded', 'false');
    activeHelpTarget = null;
    if (helpPopover) helpPopover.hidden = true;
  };
  const positionHelpPopover = (target) => {
    const popover = ensureHelpPopover();
    const rect = target.getBoundingClientRect();
    const width = Math.min(300, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    const top = rect.bottom + 9 + Math.min(0, window.innerHeight - rect.bottom - 130);
    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    popover.style.top = `${Math.max(12, top)}px`;
  };
  const showHelpPopover = (target) => {
    const text = target?.dataset?.plHelp || '';
    if (!text) return;
    const popover = ensureHelpPopover();
    if (activeHelpTarget && activeHelpTarget !== target) activeHelpTarget.setAttribute('aria-expanded', 'false');
    activeHelpTarget = target;
    target.setAttribute('aria-expanded', 'true');
    popover.textContent = text;
    popover.hidden = false;
    positionHelpPopover(target);
  };

  const initializeControls = () => {
    const startYear = 2024;
    const endYear = Math.max(currentYear + 2, startYear);
    refs.year.innerHTML = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
      .map((year) => `<option value="${year}"${year === state.year ? ' selected' : ''}>${year}</option>`).join('');
    const monthOptions = fullMonthNames.map((name, index) => `<option value="${index + 1}">${name}</option>`).join('');
    refs.month.insertAdjacentHTML('beforeend', monthOptions);
    refs.month.value = String(state.month);
    refs.entryForm.elements.month.innerHTML = monthOptions;
  };

  const skuInputMap = () => {
    const map = new Map();
    for (const row of state.stored?.sku_inputs || []) {
      map.set(`${String(row.sku || '').toUpperCase()}|${number(row.month)}`, row);
    }
    return map;
  };

  const catalogMap = () => {
    const map = new Map();
    for (const row of state.stored?.sku_catalog || []) {
      [row.sku, row.tag].forEach((code) => {
        const key = String(code || '').trim().toUpperCase();
        if (key && !map.has(key)) map.set(key, row);
      });
    }
    return map;
  };

  const catalogRows = () => Array.isArray(state.stored?.sku_catalog) ? state.stored.sku_catalog : [];
  const syrupGroups = (includeHidden = false) => {
    const rows = Array.isArray(state.stored?.syrup_groups) ? state.stored.syrup_groups : [];
    return rows
      .filter((group) => includeHidden || group.is_visible !== false)
      .map((group, index) => ({
        id: number(group.id),
        label: String(group.label || `Volume ${index + 1}`),
        volume_ml: group.volume_ml === null || group.volume_ml === '' || group.volume_ml === undefined ? null : number(group.volume_ml),
        assignment_mode: group.assignment_mode === 'manual' ? 'manual' : 'auto',
        sku_codes: Array.isArray(group.sku_codes) ? group.sku_codes.map((sku) => String(sku).toUpperCase()) : [],
        is_visible: group.is_visible !== false,
        sort_order: number(group.sort_order || index)
      }));
  };
  const statementMetrics = (includeHidden = false) => {
    const rows = Array.isArray(state.stored?.statement_metrics) && state.stored.statement_metrics.length
      ? state.stored.statement_metrics
      : defaultStatementMetrics;
    return rows
      .filter((row) => includeHidden || row.is_visible !== false)
      .map((row, index) => ({
        id: number(row.id),
        metric_key: String(row.metric_key || `metric_${index}`),
        label: String(row.label || 'Metric'),
        value_key: String(row.value_key || 'revenue'),
        display_format: ['money', 'integer', 'percent'].includes(row.display_format) ? row.display_format : 'money',
        is_visible: row.is_visible !== false,
        sort_order: number(row.sort_order || index)
      }));
  };
  const skuSearchText = (row = {}) => [
    row.sku, row.tag, row.brand_name || row.brand, row.product_name || row.label,
    row.base_product_name, row.flavor_name || row.flavor, row.unit_name || row.productType,
    row.volume
  ].filter(Boolean).join(' ').toLowerCase();
  const normalizeKey = (value) => String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
  const cleanText = (value, fallback = '') => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return normalized || fallback;
  };
  const plainVolume = (value) => {
    const rounded = Math.round(number(value) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0$/, '');
  };
  const unitLabel = (row = {}) => {
    const unit = cleanText(row.unit_name || row.unit || row.unitName, '');
    const normalized = unit.toLowerCase();
    if (!normalized || normalized === 'ml' || normalized === 'm l' || normalized.includes('milliliter')) return 'ml';
    if (normalized.includes('sachet')) return 'sachet';
    return normalized;
  };
  const volumeUnitLabel = (row = {}) => number(row.volume) ? `${plainVolume(row.volume)} ${unitLabel(row)}` : '';
  const volumeTokens = (volume) => {
    if (!number(volume)) return [];
    const integerVolume = String(Math.round(number(volume)));
    const decimalVolume = number(volume).toFixed(1).replace(/\.0$/, '');
    return [
      `${integerVolume}ml`, `${integerVolume} ml`, `${integerVolume} m l`,
      `${decimalVolume}ml`, `${decimalVolume} ml`
    ];
  };
  const volumeMatchesGroup = (row, group) => {
    if (!number(group.volume_ml)) return false;
    if (number(row.volume) && Math.abs(number(row.volume) - number(group.volume_ml)) < 0.1) return true;
    const text = skuSearchText(row).replace(/\s+/g, ' ');
    return volumeTokens(group.volume_ml).some((token) => text.includes(token));
  };
  const isSyrupCatalogRow = (row) => {
    const text = skuSearchText(row);
    const productText = [row.tag, row.product_name, row.base_product_name, row.flavor_name, row.brand_name].filter(Boolean).join(' ').toLowerCase();
    const excluded = /\b(drop|drops|we\b|water enhancer|topping|latte|caps|capsule|jamu|bubur|shake|gerd|honey|pedros|shaker|merch|sticker|sample pack|custom|bundle|affiliate)\b/.test(text);
    if (excluded) return false;
    return /\b(syrup|syrups|sirup|syurp)\b/.test(text)
      || /\bzf\s*[-_]/.test(productText)
      || /\bzero foods?\b/.test(text);
  };
  const productCardMetrics = [
    { key: 'units', label: 'QTY Sold', valueKey: 'units', format: 'integer', tone: 'qty' },
    { key: 'averagePrice', label: 'Avg Price', valueKey: 'averagePrice', format: 'money', tone: 'price' },
    { key: 'netRevenue', label: 'Revenue', valueKey: 'netRevenue', format: 'money', tone: 'revenue' },
    { key: 'cogs', label: 'COGS', valueKey: 'cogs', format: 'money', tone: 'cost' },
    { key: 'grossProfit', label: 'Gross Profit', valueKey: 'grossProfit', format: 'money', tone: 'profit' },
    { key: 'profitPerUnit', label: 'Avg Gross Profit', valueKey: 'profitPerUnit', format: 'money', tone: 'profit' }
  ];
  const productFamilyKey = (row = {}) => normalizeKey([
    row.brand_name || row.brand,
    row.product_name || row.base_product_name || row.productType || row.label
  ].filter(Boolean).join('|'));
  const productFamilyLabel = (row = {}) => {
    const product = cleanText(row.product_name || row.base_product_name || row.productType || row.label, 'Product');
    const brand = cleanText(row.brand_name || row.brand, '');
    return brand && !product.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${product}` : product;
  };
  const catalogProductFamilies = () => {
    const families = new Map();
    for (const row of catalogRows()) {
      const key = productFamilyKey(row);
      const family = families.get(key) || {
        key,
        label: productFamilyLabel(row),
        rows: []
      };
      family.rows.push(row);
      family.label = family.label || productFamilyLabel(row);
      families.set(key, family);
    }
    return Array.from(families.values()).sort((left, right) => left.label.localeCompare(right.label));
  };
  const distinctValues = (rows, selector) => new Set(rows.map(selector).filter(Boolean));
  const autoVariantModeForRows = (rows) => {
    const volumes = distinctValues(rows, (row) => number(row.volume) ? plainVolume(row.volume) : '');
    if (volumes.size > 1) return 'volume';
    const flavors = distinctValues(rows, (row) => cleanText(row.flavor_name || row.flavor, ''));
    if (flavors.size > 1) return 'flavor';
    return 'sku';
  };
  const productFlavorKey = (row = {}) => normalizeKey(row.flavor_name || row.flavor || 'Unflavored');
  const productFlavorLabel = (row = {}) => cleanText(row.flavor_name || row.flavor, 'Unflavored');
  const isBuburCatalogRow = (row = {}) => /\bbubur\b/.test(skuSearchText(row));
  const familySplitsByFlavor = (family) => Boolean(family?.rows?.some(isBuburCatalogRow));
  const familySplitsByFlavorKey = (familyKey) => {
    const family = catalogProductFamilies().find((candidate) => candidate.key === familyKey);
    return familySplitsByFlavor(family);
  };
  const flavorMatchValue = (familyKey, flavorKey) => `${familyKey}|${flavorKey}`;
  const parseFlavorMatchValue = (value) => {
    const [familyKey = '', flavorKey = ''] = String(value || '').split('|');
    return { familyKey, flavorKey };
  };
  const normalizeProductCardLayout = (layout = {}) => {
    const source = layout && typeof layout === 'object' ? layout : {};
    const rowLabels = {};
    if (source.row_labels && typeof source.row_labels === 'object') {
      Object.entries(source.row_labels).forEach(([key, label]) => {
        const rowKey = cleanText(key, '');
        const rowLabel = cleanText(label, '');
        if (rowKey && rowLabel) rowLabels[rowKey] = rowLabel;
      });
    }
    const metricKeys = new Set(productCardMetrics.map((metric) => metric.key));
    const metricLabels = {};
    if (source.metric_labels && typeof source.metric_labels === 'object') {
      Object.entries(source.metric_labels).forEach(([key, label]) => {
        const metricKey = cleanText(key, '');
        const metricLabel = cleanText(label, '');
        if (metricKeys.has(metricKey) && metricLabel) metricLabels[metricKey] = metricLabel;
      });
    }
    return {
      row_order: Array.isArray(source.row_order) ? Array.from(new Set(source.row_order.map((key) => cleanText(key, '')).filter(Boolean))) : [],
      row_labels: rowLabels,
      hidden_rows: Array.isArray(source.hidden_rows) ? Array.from(new Set(source.hidden_rows.map((key) => cleanText(key, '')).filter(Boolean))) : [],
      metric_order: Array.isArray(source.metric_order) ? Array.from(new Set(source.metric_order.map((key) => cleanText(key, '')).filter((key) => metricKeys.has(key)))) : [],
      metric_labels: metricLabels,
      hidden_metrics: Array.isArray(source.hidden_metrics) ? Array.from(new Set(source.hidden_metrics.map((key) => cleanText(key, '')).filter((key) => metricKeys.has(key)))) : []
    };
  };
  const normalizeProductCard = (card = {}, index = 0) => {
    const matchMode = ['auto_syrup', 'auto_product', 'auto_product_flavor', 'manual', 'legacy'].includes(card.match_mode) ? card.match_mode : 'manual';
    const variantMode = ['auto', 'volume', 'flavor', 'sku'].includes(card.variant_mode) ? card.variant_mode : 'auto';
    return {
      id: number(card.id),
      card_key: String(card.card_key || `${matchMode}_${index + 1}`),
      label: cleanText(card.label, `Product card ${index + 1}`),
      match_mode: matchMode,
      match_value: String(card.match_value || ''),
      variant_mode: variantMode,
      sku_codes: Array.isArray(card.sku_codes) ? card.sku_codes.map((sku) => String(sku).toUpperCase()).filter(Boolean) : [],
      layout: normalizeProductCardLayout(card.layout),
      is_visible: card.is_visible !== false,
      sort_order: number(card.sort_order || index),
      generated: Boolean(card.generated),
      touched: Boolean(card.touched)
    };
  };
  const defaultProductCards = () => {
    const cards = [];
    const syrupRows = catalogRows().filter(isSyrupCatalogRow);
    if (syrupRows.length) {
      cards.push(normalizeProductCard({
        card_key: 'auto_syrup',
        label: 'Syrup',
        match_mode: 'auto_syrup',
        variant_mode: 'volume',
        generated: true,
        sort_order: 10
      }));
    }
    return cards;
  };
  const productCardSignature = (card) => {
    if (card.card_key === 'auto_syrup') return 'auto_syrup';
    if (card.match_mode === 'auto_product') return `auto_product|${card.match_value}`;
    if (card.match_mode === 'auto_product_flavor') return `auto_product_flavor|${card.match_value}`;
    if (card.match_mode === 'manual') return `manual|${card.card_key}`;
    return card.match_mode;
  };
  const isRetiredGeneratedProductCard = (card) => {
    const key = String(card.card_key || '');
    return (card.match_mode === 'auto_product' && key.startsWith('auto_product_'))
      || (card.match_mode === 'auto_product_flavor' && key.startsWith('auto_product_flavor_'))
      || (card.match_mode === 'legacy' && key === 'legacy_spreadsheet_total');
  };
  const productCards = (includeHidden = false) => {
    const stored = Array.isArray(state.stored?.product_cards)
      ? state.stored.product_cards.map(normalizeProductCard).filter((card) => !isRetiredGeneratedProductCard(card))
      : [];
    const generated = defaultProductCards();
    const merged = stored.length ? [...stored] : [...generated];
    const seen = new Set(merged.map(productCardSignature));
    if (stored.length) {
      for (const card of generated) {
        const signature = productCardSignature(card);
        if (!seen.has(signature)) {
          merged.push(card);
          seen.add(signature);
        }
      }
    }
    return merged
      .filter((card) => !(card.generated && card.match_mode === 'auto_product' && familySplitsByFlavorKey(card.match_value)))
      .filter((card) => includeHidden || card.is_visible !== false)
      .sort((left, right) => number(left.sort_order) - number(right.sort_order));
  };
  const cardCatalogRows = (card) => {
    if (card.match_mode === 'auto_syrup') return catalogRows().filter(isSyrupCatalogRow);
    if (card.match_mode === 'auto_product') return catalogRows().filter((row) => productFamilyKey(row) === card.match_value);
    if (card.match_mode === 'auto_product_flavor') {
      const { familyKey, flavorKey } = parseFlavorMatchValue(card.match_value);
      return catalogRows().filter((row) => productFamilyKey(row) === familyKey && productFlavorKey(row) === flavorKey);
    }
    if (card.match_mode === 'manual') {
      const selected = new Set(card.sku_codes);
      return catalogRows().filter((row) => selected.has(String(row.sku || '').toUpperCase()));
    }
    return [];
  };
  const legacyProductMatchesCard = (card, product) => {
    const legacyMatch = normalizeKey(product.legacy_match || '');
    if (!legacyMatch) return false;
    const cardText = normalizeKey([
      card.label,
      card.match_value,
      card.sku_codes?.join(' '),
      cardCatalogRows(card).map(skuSearchText).join(' ')
    ].filter(Boolean).join(' '));
    return cardText.includes(legacyMatch);
  };
  const cardMatchesProduct = (card, product) => {
    if (card.match_mode === 'legacy') return Boolean(product.legacy);
    if (product.legacy) return legacyProductMatchesCard(card, product);
    const sku = String(product.sku || '').toUpperCase();
    if (card.match_mode === 'manual') return sku && card.sku_codes.includes(sku);
    if (card.match_mode === 'auto_syrup') return isSyrupCatalogRow(product);
    if (card.match_mode === 'auto_product') return productFamilyKey(product) === card.match_value;
    if (card.match_mode === 'auto_product_flavor') {
      const { familyKey, flavorKey } = parseFlavorMatchValue(card.match_value);
      return productFamilyKey(product) === familyKey && productFlavorKey(product) === flavorKey;
    }
    return false;
  };
  const effectiveVariantMode = (card) => {
    if (card.match_mode === 'auto_syrup') return 'volume';
    if (card.match_mode === 'legacy') return 'sku';
    if (card.variant_mode !== 'auto') return card.variant_mode;
    return autoVariantModeForRows(cardCatalogRows(card));
  };
  const catalogVariantLabel = (row) => [
    cleanText(row.flavor_name || row.flavor, ''),
    volumeUnitLabel(row),
    cleanText(row.tag, '')
  ].filter(Boolean).join(' · ') || cleanText(row.sku, 'SKU');
  const variantKeyForProduct = (product, mode) => {
    if (product.legacy && mode === 'sku') return 'legacy';
    if (mode === 'volume') return `volume:${number(product.volume) ? plainVolume(product.volume) : 'unknown'}`;
    if (mode === 'flavor') return `flavor:${normalizeKey(product.flavor_name || product.flavor || 'Unflavored')}`;
    return `sku:${String(product.sku || product.key || product.label).toUpperCase()}`;
  };
  const variantLabelForProduct = (product, mode) => {
    if (product.legacy && mode === 'sku') return cleanText(product.label, 'All products');
    if (mode === 'volume') return volumeUnitLabel(product) || 'Unknown volume';
    if (mode === 'flavor') return cleanText(product.flavor_name || product.flavor, 'Unflavored');
    return catalogVariantLabel(product);
  };
  const legacyVariantDefinitionsForCard = (card, mode) => {
    const definitions = new Map();
    const products = Array.isArray(state.stored?.legacy?.products) ? state.stored.legacy.products : [];
    for (const product of products) {
      if (!product?.legacy_match) continue;
      const monthly = product.monthly && typeof product.monthly === 'object' ? Object.values(product.monthly) : [];
      const hasActivity = monthly.some((row) => number(row?.units) || number(row?.netRevenue) || number(row?.cogs));
      if (!hasActivity) continue;
      const row = {
        key: String(product.key || product.label || 'LEGACY'),
        sku: String(product.sku || ''),
        label: String(product.label || 'Legacy spreadsheet category'),
        productType: String(product.productType || 'Legacy spreadsheet category'),
        brand: String(product.brand || product.label || 'Legacy spreadsheet'),
        brand_name: String(product.brand_name || product.brand || product.label || 'Legacy spreadsheet'),
        product_name: String(product.product_name || product.base_product_name || product.productType || product.label || 'Legacy spreadsheet category'),
        base_product_name: String(product.base_product_name || product.product_name || product.productType || product.label || 'Legacy spreadsheet category'),
        flavor: String(product.flavor || product.flavor_name || ''),
        flavor_name: String(product.flavor_name || product.flavor || ''),
        unit_name: String(product.unit_name || product.unit || ''),
        volume: number(product.volume),
        legacy_match: String(product.legacy_match || ''),
        legacy: true
      };
      if (!legacyProductMatchesCard(card, row)) continue;
      const key = variantKeyForProduct(row, mode);
      if (!definitions.has(key)) {
        definitions.set(key, {
          key,
          label: variantLabelForProduct(row, mode),
          sort: mode === 'volume' ? -number(row.volume) : definitions.size + 1000
        });
      }
    }
    return Array.from(definitions.values());
  };
  const baseVariantDefinitionsForCard = (card) => {
    const mode = effectiveVariantMode(card);
    if (card.match_mode === 'legacy') return [{ key: 'legacy', label: 'All products', sort: 0 }];
    const rows = cardCatalogRows(card);
    const definitions = new Map();
    if (card.match_mode === 'auto_syrup') {
      const fixedVolumes = [550, 250, 50];
      const volumes = new Set([
        ...fixedVolumes,
        ...rows.map((row) => Math.round(number(row.volume))).filter(Boolean)
      ]);
      Array.from(volumes)
        .sort((left, right) => {
          const leftFixed = fixedVolumes.indexOf(left);
          const rightFixed = fixedVolumes.indexOf(right);
          if (leftFixed !== -1 || rightFixed !== -1) return (leftFixed === -1 ? 99 : leftFixed) - (rightFixed === -1 ? 99 : rightFixed);
          return right - left;
        })
        .forEach((volume, index) => {
          definitions.set(`volume:${plainVolume(volume)}`, { key: `volume:${plainVolume(volume)}`, label: `${plainVolume(volume)} ml`, sort: index });
        });
      for (const definition of legacyVariantDefinitionsForCard(card, mode)) {
        if (!definitions.has(definition.key)) {
          definitions.set(definition.key, { ...definition, sort: definitions.size + 1000 });
        }
      }
      return Array.from(definitions.values()).sort((left, right) => left.sort === right.sort ? left.label.localeCompare(right.label) : left.sort - right.sort);
    }
    for (const row of rows) {
      const key = variantKeyForProduct(row, mode);
      if (!definitions.has(key)) {
        definitions.set(key, {
          key,
          label: variantLabelForProduct(row, mode),
          sort: mode === 'volume' ? -number(row.volume) : definitions.size
        });
      }
    }
    if (definitions.size === 0 && card.match_mode === 'manual') {
      card.sku_codes.forEach((sku, index) => definitions.set(`sku:${sku}`, { key: `sku:${sku}`, label: sku, sort: index }));
    }
    for (const definition of legacyVariantDefinitionsForCard(card, mode)) {
      if (!definitions.has(definition.key)) definitions.set(definition.key, { ...definition, sort: definitions.size + 1000 });
    }
    return Array.from(definitions.values()).sort((left, right) => left.sort === right.sort ? left.label.localeCompare(right.label) : left.sort - right.sort);
  };
  const applyProductCardLayout = (card, definitions, includeHidden = false) => {
    const layout = normalizeProductCardLayout(card.layout);
    const hidden = new Set(layout.hidden_rows);
    const order = new Map(layout.row_order.map((key, index) => [key, index]));
    return definitions
      .map((definition) => ({
        ...definition,
        originalLabel: definition.originalLabel || definition.label,
        label: layout.row_labels[definition.key] || definition.label,
        is_hidden: hidden.has(definition.key),
        layoutSort: order.has(definition.key) ? order.get(definition.key) : 100000 + number(definition.sort)
      }))
      .filter((definition) => includeHidden || !definition.is_hidden)
      .sort((left, right) => left.layoutSort === right.layoutSort ? left.label.localeCompare(right.label) : left.layoutSort - right.layoutSort);
  };
  const variantDefinitionsForCard = (card, includeHidden = false) => applyProductCardLayout(card, baseVariantDefinitionsForCard(card), includeHidden);
  const productMetricsForCard = (card, includeHidden = false) => {
    const layout = normalizeProductCardLayout(card.layout);
    const hidden = new Set(layout.hidden_metrics);
    const order = new Map(layout.metric_order.map((key, index) => [key, index]));
    return productCardMetrics
      .map((metric, index) => ({
        ...metric,
        originalLabel: metric.originalLabel || metric.label,
        label: layout.metric_labels[metric.key] || metric.label,
        is_hidden: hidden.has(metric.key),
        layoutSort: order.has(metric.key) ? order.get(metric.key) : 100000 + index
      }))
      .filter((metric) => includeHidden || !metric.is_hidden)
      .sort((left, right) => left.layoutSort === right.layoutSort ? left.label.localeCompare(right.label) : left.layoutSort - right.layoutSort);
  };
  const emptyProductAggregate = () => ({
    units: 0,
    netRevenue: 0,
    grossRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    averagePrice: 0,
    profitPerUnit: 0,
    legacy: false
  });
  const finalizeProductAggregate = (row) => ({
    ...row,
    grossProfit: number(row.netRevenue) - number(row.cogs),
    averagePrice: safeDivide(row.netRevenue, row.units),
    profitPerUnit: safeDivide(number(row.netRevenue) - number(row.cogs), row.units)
  });
  const productCardMatrix = (card) => {
    const mode = effectiveVariantMode(card);
    const variants = new Map(variantDefinitionsForCard(card).map((variant) => [variant.key, variant]));
    const hiddenVariants = new Set(normalizeProductCardLayout(card.layout).hidden_rows);
    const cells = new Map();
    for (let month = 1; month <= 12; month += 1) {
      const products = calculateProducts(month, { legacyProductMode: card.match_mode === 'legacy' ? 'summary' : 'details' })
        .filter((product) => cardMatchesProduct(card, product));
      for (const product of products) {
        const key = variantKeyForProduct(product, mode);
        if (hiddenVariants.has(key)) continue;
        if (!variants.has(key)) {
          variants.set(key, { key, label: variantLabelForProduct(product, mode), sort: variants.size + 1000 });
        }
        const cellKey = `${key}|${month}`;
        const cell = cells.get(cellKey) || emptyProductAggregate();
        cell.units += number(product.units);
        cell.netRevenue += number(product.netRevenue);
        cell.grossRevenue += number(product.grossRevenue);
        cell.cogs += number(product.cogs);
        cell.legacy ||= Boolean(product.legacy);
        cells.set(cellKey, cell);
      }
    }
    const orderedVariants = Array.from(variants.values()).sort((left, right) => left.sort === right.sort ? left.label.localeCompare(right.label) : left.sort - right.sort);
    const rowTotals = new Map();
    const cardTotal = emptyProductAggregate();
    for (const variant of orderedVariants) {
      const total = emptyProductAggregate();
      for (let month = 1; month <= 12; month += 1) {
        const cell = finalizeProductAggregate(cells.get(`${variant.key}|${month}`) || emptyProductAggregate());
        cells.set(`${variant.key}|${month}`, cell);
        total.units += cell.units;
        total.netRevenue += cell.netRevenue;
        total.grossRevenue += cell.grossRevenue;
        total.cogs += cell.cogs;
        total.legacy ||= cell.legacy;
      }
      rowTotals.set(variant.key, finalizeProductAggregate(total));
      cardTotal.units += total.units;
      cardTotal.netRevenue += total.netRevenue;
      cardTotal.grossRevenue += total.grossRevenue;
      cardTotal.cogs += total.cogs;
      cardTotal.legacy ||= total.legacy;
    }
    return {
      mode,
      variants: orderedVariants,
      cells,
      rowTotals,
      total: finalizeProductAggregate(cardTotal)
    };
  };
  const autoSyrupSkusForGroup = (group) => catalogRows()
    .filter((row) => volumeMatchesGroup(row, group) && isSyrupCatalogRow(row))
    .map((row) => String(row.sku || '').toUpperCase())
    .filter(Boolean);
  const groupMatchesProduct = (group, product) => {
    const sku = String(product.sku || '').toUpperCase();
    if (group.assignment_mode === 'manual') return sku && group.sku_codes.includes(sku);
    return volumeMatchesGroup(product, group) && isSyrupCatalogRow(product);
  };
  const syrupGroupForProduct = (product) => syrupGroups().find((group) => groupMatchesProduct(group, product)) || null;

  const rowsForPeriod = (month) => {
    const rows = Array.isArray(state.sales?.products?.by_month) ? state.sales.products.by_month : [];
    return rows.filter((row) => month === 0 || number(row.month) === month);
  };

  const isLegacyPeriod = (year, month) => year === 2025 || (year === 2026 && month >= 1 && month <= 5);
  const legacyMonth = (month) => isLegacyPeriod(state.year, month) ? (state.stored?.legacy?.months?.[String(month)] || null) : null;
  const isLegacyMonth = (month) => Boolean(month && legacyMonth(month));
  const hasLegacyYear = () => Object.keys(state.stored?.legacy?.months || {}).some((month) => isLegacyPeriod(state.year, number(month)));

  const legacyProductsForMonth = (month, mode = 'summary') => {
    const products = Array.isArray(state.stored?.legacy?.products) ? state.stored.legacy.products : [];
    const rows = products.map((product) => {
      const row = product.monthly?.[String(month)] || {};
      const units = number(row.units);
      const netRevenue = number(row.netRevenue);
      const grossRevenue = number(row.grossRevenue || row.netRevenue);
      const cogs = number(row.cogs);
      return {
        key: String(product.key || product.label || 'LEGACY'),
        sku: String(product.sku || ''),
        label: String(product.label || 'Legacy spreadsheet category'),
        productType: String(product.productType || 'Legacy spreadsheet category'),
        brand: String(product.brand || product.label || 'Legacy spreadsheet'),
        brand_name: String(product.brand_name || product.brand || product.label || 'Legacy spreadsheet'),
        product_name: String(product.product_name || product.base_product_name || product.productType || product.label || 'Legacy spreadsheet category'),
        base_product_name: String(product.base_product_name || product.product_name || product.productType || product.label || 'Legacy spreadsheet category'),
        flavor: String(product.flavor || product.flavor_name || ''),
        flavor_name: String(product.flavor_name || product.flavor || ''),
        unit_name: String(product.unit_name || product.unit || ''),
        volume: number(product.volume),
        legacy_match: String(product.legacy_match || ''),
        units,
        netRevenue,
        grossRevenue,
        orders: 0,
        cogs,
        directUnitCost: safeDivide(cogs, units),
        hasCatalog: true,
        hasCogs: true,
        source: 'legacy_spreadsheet',
        legacy: true,
        grossProfit: netRevenue - cogs,
        averagePrice: safeDivide(netRevenue, units),
        profitPerUnit: safeDivide(netRevenue - cogs, units),
        margin: safeDivide(netRevenue - cogs, netRevenue)
      };
    }).filter((product) => product.units || product.netRevenue || product.cogs);
    if (mode === 'details') return rows.filter((product) => product.legacy_match);
    if (mode === 'all') return rows;
    const summaries = rows.filter((product) => !product.legacy_match);
    return summaries.length ? summaries : rows;
  };

  const catalogCogsForMonth = (catalogRow, month) => {
    const history = Array.isArray(catalogRow?.cogs_history) ? catalogRow.cogs_history : [];
    if (!history.length || !month) return number(catalogRow?.cogs);
    const monthEnd = `${state.year}-${String(month).padStart(2, '0')}-31 23:59:59`;
    const ordered = [...history].sort((left, right) => {
      const recordedCompare = String(left.recorded_at || '').localeCompare(String(right.recorded_at || ''));
      return recordedCompare || number(left.id) - number(right.id);
    });
    let baseline = null;
    let datedChanges = [];
    for (const change of ordered) {
      const mode = String(change.change_mode || 'legacy').toLowerCase();
      if (mode === 'audit') continue;
      if (mode === 'retroactive') {
        baseline = number(change.new_price);
        datedChanges = [];
        continue;
      }
      if (mode === 'opening') {
        if (baseline === null) baseline = number(change.new_price);
        continue;
      }
      if (baseline === null && change.old_price !== null && change.old_price !== '' && change.old_price !== undefined) {
        baseline = number(change.old_price);
      }
      const effectiveAt = String(change.effective_at || change.recorded_at || '');
      if (effectiveAt) datedChanges.push({ effectiveAt, price: number(change.new_price), id: number(change.id) });
    }
    datedChanges.sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt) || left.id - right.id);
    let resolved = baseline ?? number(catalogRow?.cogs);
    for (const change of datedChanges) {
      if (change.effectiveAt <= monthEnd) resolved = change.price;
    }
    return resolved;
  };

  const calculateProducts = (month, options = {}) => {
    if (month === 0) {
      const aggregates = new Map();
      for (let index = 1; index <= 12; index += 1) {
        for (const row of calculateProducts(index, options)) {
          const item = aggregates.get(row.key) || { ...row, units: 0, netRevenue: 0, grossRevenue: 0, orders: 0, cogs: 0, legacy: false };
          item.units += row.units;
          item.netRevenue += row.netRevenue;
          item.grossRevenue += row.grossRevenue;
          item.orders += row.orders;
          item.cogs += row.cogs;
          item.legacy ||= Boolean(row.legacy);
          aggregates.set(row.key, item);
        }
      }
      return Array.from(aggregates.values()).map((item) => ({
        ...item,
        directUnitCost: safeDivide(item.cogs, item.units),
        grossProfit: item.netRevenue - item.cogs,
        averagePrice: safeDivide(item.netRevenue, item.units),
        profitPerUnit: safeDivide(item.netRevenue - item.cogs, item.units),
        margin: safeDivide(item.netRevenue - item.cogs, item.netRevenue)
      })).sort((left, right) => right.netRevenue - left.netRevenue);
    }
    if (isLegacyMonth(month)) return legacyProductsForMonth(month, options.legacyProductMode || 'summary');
    const catalog = catalogMap();
    const inputs = skuInputMap();
    const aggregates = new Map();
    for (const row of rowsForPeriod(month)) {
      const rawSku = String(row.sku || row.tag || '').trim().toUpperCase();
      const catalogRow = catalog.get(rawSku);
      const sku = String(catalogRow?.sku || rawSku).trim().toUpperCase();
      const key = sku || `UNMAPPED:${String(row.label || row.product_type || 'Unknown').trim()}`;
      const item = aggregates.get(key) || {
        key,
        sku,
        label: String(catalogRow?.product_name || catalogRow?.base_product_name || row.product_name || row.label || row.product_type || sku || 'Unmapped product'),
        productType: String(row.product_type || 'Uncategorized'),
        brand: '',
        units: 0,
        netRevenue: 0,
        grossRevenue: 0,
        orders: 0,
        cogs: 0,
        directUnitCost: 0,
        hasCatalog: false,
        hasCogs: false,
        months: new Set()
      };
      const quantity = number(firstValue(row.quantity, row.item_count, row.items_qty, row.units));
      const rowMonth = number(row.month);
      const input = inputs.get(`${sku}|${rowMonth}`) || inputs.get(`${rawSku}|${rowMonth}`) || {};
      const catalogCogs = catalogCogsForMonth(catalogRow, rowMonth);
      const extraUnitCost = number(input.packaging_per_unit) + number(input.labor_per_unit) + number(input.other_per_unit);
      const baseCogs = input.cogs_override !== null && input.cogs_override !== '' && input.cogs_override !== undefined
        ? number(input.cogs_override)
        : catalogCogs;
      const unitCost = baseCogs + extraUnitCost;
      const rowNetRevenue = number(firstValue(row.net_revenue, row.netRevenue, row.revenue, row.net_sales, row.sales, row.seller_received, row.seller_receivable, row.settlement_amount, row.payout_amount));
      const rowFees = number(row.marketplace_fees);
      const rowGrossRevenue = number(firstValue(row.gross_revenue, row.grossRevenue, row.gross_sales, row.customer_paid, row.buyer_paid, rowFees ? rowNetRevenue + rowFees : '', rowNetRevenue));
      const fallbackCogs = number(firstValue(row.cogs, row.total_cogs, row.cost_of_goods_sold));
      const rowCogs = baseCogs > 0 || extraUnitCost > 0 ? quantity * unitCost : fallbackCogs;
      item.units += quantity;
      item.netRevenue += rowNetRevenue;
      item.grossRevenue += rowGrossRevenue;
      item.orders += number(firstValue(row.orders, row.order_count, row.orders_qty));
      item.cogs += rowCogs;
      item.directUnitCost = safeDivide(item.cogs, item.units);
      item.hasCatalog ||= Boolean(catalogRow);
      item.hasCogs ||= baseCogs > 0 || rowCogs > 0;
      item.productType = String(catalogRow?.product_type || catalogRow?.productType || row.product_type || item.productType || 'Uncategorized');
      item.brand = String(catalogRow?.brand_name || catalogRow?.brand || item.brand || row.brand_name || row.brand || row.product_type || 'Uncategorized');
      item.label = String(catalogRow?.product_name || catalogRow?.base_product_name || row.product_name || row.label || item.label);
      item.base_product_name = String(catalogRow?.base_product_name || catalogRow?.product_name || row.base_product_name || row.product_name || item.label);
      item.tag = String(catalogRow?.tag || row.tag || '');
      item.flavor = String(catalogRow?.flavor_name || catalogRow?.flavor || row.flavor_name || row.flavor || '');
      item.unit_name = String(catalogRow?.unit_name || catalogRow?.unit || row.unit_name || row.unit || '');
      item.volume = catalogRow?.volume !== undefined ? number(catalogRow.volume) : number(row.volume);
      item.brand_name = item.brand;
      item.product_name = item.label;
      item.flavor_name = item.flavor;
      item.catalogCogs = catalogCogs;
      item.months.add(rowMonth);
      aggregates.set(key, item);
    }
    return Array.from(aggregates.values()).map((item) => ({
      ...item,
      grossProfit: item.netRevenue - item.cogs,
      averagePrice: safeDivide(item.netRevenue, item.units),
      profitPerUnit: safeDivide(item.netRevenue - item.cogs, item.units),
      margin: safeDivide(item.netRevenue - item.cogs, item.netRevenue)
    })).sort((left, right) => right.netRevenue - left.netRevenue);
  };

  const entriesForPeriod = (month) => {
    const saved = (state.stored?.entries || []).filter((entry) => month === 0 || number(entry.month) === month);
    const legacy = (state.stored?.legacy?.entries || []).filter((entry) => month === 0 || number(entry.month) === month);
    return [...legacy, ...saved];
  };
  const entryTotal = (month, section) => entriesForPeriod(month)
    .filter((entry) => entry.section === section)
    .reduce((sum, entry) => sum + number(entry.amount), 0);

  const calculateStatement = (month) => {
    if (month === 0) {
      return Array.from({ length: 12 }, (_, index) => calculateStatement(index + 1)).reduce((sum, row) => {
        Object.keys(sum).forEach((key) => { sum[key] += number(row[key]); });
        return {
          ...sum,
          legacy: Boolean(sum.legacy || row.legacy),
          averagePrice: safeDivide(sum.revenue, sum.units),
          averageCogs: safeDivide(sum.cogs, sum.units),
          grossProfitPerUnit: safeDivide(sum.grossProfit, sum.units),
          grossMargin: safeDivide(sum.grossProfit, sum.revenue),
          administrationPerUnit: safeDivide(sum.administration, sum.units),
          administrationRate: safeDivide(sum.administration, sum.revenue),
          marketingPerUnit: safeDivide(sum.marketing, sum.units),
          marketingRate: safeDivide(sum.marketing, sum.revenue),
          netMargin: safeDivide(sum.netProfit, sum.revenue),
          netProfitPerUnit: safeDivide(sum.netProfit, sum.units)
        };
      }, {
        units: 0, netRevenue: 0, grossRevenue: 0, cogs: 0, averageCogs: 0, marketplaceFees: 0,
        income: 0, revenue: 0, grossProfit: 0, grossProfitPerUnit: 0, grossMargin: 0,
        administration: 0, administrationPerUnit: 0, administrationRate: 0,
        marketing: 0, marketingPerUnit: 0, marketingRate: 0, other: 0,
        netProfit: 0, netMargin: 0, netProfitPerUnit: 0, averagePrice: 0, legacy: false
      });
    }
    const legacy = legacyMonth(month);
    if (legacy) {
      const units = number(legacy.units);
      const revenue = number(legacy.revenue);
      const grossRevenue = number(legacy.grossRevenue || legacy.revenue);
      const cogs = number(legacy.cogs);
      const grossProfit = number(legacy.grossProfit || revenue - cogs);
      const administration = number(legacy.administration);
      const marketing = number(legacy.marketing);
      const other = number(legacy.other);
      const netProfit = number(legacy.netProfit || grossProfit - administration - marketing - other);
      return {
        units,
        netRevenue: number(legacy.netRevenue || revenue),
        grossRevenue,
        cogs,
        marketplaceFees: number(legacy.marketplaceFees),
        income: number(legacy.income),
        revenue,
        averagePrice: safeDivide(revenue, units),
        averageCogs: safeDivide(cogs, units),
        grossProfit,
        grossProfitPerUnit: safeDivide(grossProfit, units),
        grossMargin: safeDivide(grossProfit, revenue),
        administration,
        administrationPerUnit: safeDivide(administration, units),
        administrationRate: safeDivide(administration, revenue),
        marketing,
        marketingPerUnit: safeDivide(marketing, units),
        marketingRate: safeDivide(marketing, revenue),
        other,
        netProfit,
        netMargin: safeDivide(netProfit, revenue),
        netProfitPerUnit: safeDivide(netProfit, units),
        legacy: true
      };
    }
    const products = calculateProducts(month);
    const product = products.reduce((totals, row) => {
      totals.units += row.units;
      totals.netRevenue += row.netRevenue;
      totals.grossRevenue += row.grossRevenue;
      totals.cogs += row.cogs;
      return totals;
    }, { units: 0, netRevenue: 0, grossRevenue: 0, cogs: 0 });
    const income = entryTotal(month, 'income');
    const administration = entryTotal(month, 'administration');
    const marketing = entryTotal(month, 'marketing');
    const other = entryTotal(month, 'other');
    const revenue = product.netRevenue + income;
    const grossProfit = revenue - product.cogs;
    const netProfit = grossProfit - administration - marketing - other;
    return {
      ...product,
      marketplaceFees: Math.max(0, product.grossRevenue - product.netRevenue),
      income,
      revenue,
      averagePrice: safeDivide(revenue, product.units),
      averageCogs: safeDivide(product.cogs, product.units),
      grossProfit,
      grossProfitPerUnit: safeDivide(grossProfit, product.units),
      grossMargin: safeDivide(grossProfit, revenue),
      administration,
      administrationPerUnit: safeDivide(administration, product.units),
      administrationRate: safeDivide(administration, revenue),
      marketing,
      marketingPerUnit: safeDivide(marketing, product.units),
      marketingRate: safeDivide(marketing, revenue),
      other,
      netProfit,
      netMargin: safeDivide(netProfit, revenue),
      netProfitPerUnit: safeDivide(netProfit, product.units)
    };
  };

  const renderKpis = () => {
    const totals = calculateStatement(state.month);
    const values = {
      net_revenue: money(totals.revenue),
      units: integer(totals.units),
      cogs: money(totals.cogs),
      gross_profit: money(totals.grossProfit),
      administration: money(totals.administration),
      marketing: money(totals.marketing),
      net_profit: money(totals.netProfit),
      profit_per_unit: money(totals.netProfitPerUnit)
    };
    const meta = {
      net_revenue: `${money(totals.marketplaceFees)} marketplace fees${totals.legacy ? ' · old spreadsheet' : ''}`,
      units: `${integer(state.products.length)} product lines`,
      cogs: `${money(safeDivide(totals.cogs, totals.units))} / unit`,
      gross_profit: percent(totals.grossMargin),
      administration: `${percent(totals.administrationRate)} of revenue`,
      marketing: `${percent(totals.marketingRate)} of revenue`,
      net_profit: `${percent(totals.netMargin)} margin`,
      profit_per_unit: 'After operating expenses'
    };
    Object.entries(values).forEach(([key, value]) => {
      const target = root.querySelector(`[data-pl-kpi="${key}"]`);
      if (target) {
        target.innerHTML = `${escapeHtml(value)}${totals.legacy ? legacyMarker : ''}`;
        if (key === 'net_profit') target.classList.toggle('is-negative', totals.netProfit < 0);
      }
      const metaTarget = root.querySelector(`[data-pl-kpi-meta="${key}"]`);
      if (metaTarget) metaTarget.textContent = meta[key];
    });
  };

  const formatProductCardValue = (metric, value) => {
    if (metric.format === 'integer') return integer(value);
    if (metric.format === 'percent') return percent(value);
    return money(value, true);
  };
  const productCardCellClass = (metric, value) => [
    'pl-product-cell',
    `is-${metric.tone}`,
    number(value) < 0 ? 'is-negative' : ''
  ].filter(Boolean).join(' ');
  const renderProductMetricCard = (metric, matrix) => `
    <section class="pl-product-metric-card is-${metric.tone}">
      <div class="pl-product-metric-head">
        <strong>${escapeHtml(metric.label)}</strong>
        <span>${formatProductCardValue(metric, matrix.total[metric.valueKey])}${matrix.total.legacy ? legacyMarker : ''}</span>
      </div>
      <div class="pl-product-matrix" role="table" aria-label="${escapeHtml(metric.label)} by month">
        <span class="pl-product-month is-row-label">Variant</span>
        ${monthNames.map((name) => `<span class="pl-product-month">${name}</span>`).join('')}
        <span class="pl-product-month is-ytd">YTD</span>
        ${matrix.variants.map((variant) => {
          const total = matrix.rowTotals.get(variant.key) || emptyProductAggregate();
          return `
            <span class="pl-product-variant">${escapeHtml(variant.label)}</span>
            ${Array.from({ length: 12 }, (_, index) => {
              const cell = matrix.cells.get(`${variant.key}|${index + 1}`) || emptyProductAggregate();
              const value = cell[metric.valueKey];
              return `<span class="${productCardCellClass(metric, value)}">${formatProductCardValue(metric, value)}${cell.legacy ? legacyMarker : ''}</span>`;
            }).join('')}
            <span class="${productCardCellClass(metric, total[metric.valueKey])} is-ytd">${formatProductCardValue(metric, total[metric.valueKey])}${total.legacy ? legacyMarker : ''}</span>
          `;
        }).join('')}
      </div>
    </section>`;
  const renderProductCards = () => {
    if (!refs.productCards) return;
    const cards = productCards();
    if (!cards.length) {
      refs.productCards.innerHTML = '<p class="pl-empty">No product cards yet. Use + Add card to build one from SKU DB.</p>';
      return;
    }
    refs.productCards.innerHTML = cards.map((card) => {
      const matrix = productCardMatrix(card);
      const metrics = productMetricsForCard(card);
      const skuCount = card.match_mode === 'manual' ? card.sku_codes.length : cardCatalogRows(card).length;
      const subtitle = card.match_mode === 'legacy'
        ? 'Old sheet total for months imported from the workbook'
        : `${matrix.variants.length} variant row${matrix.variants.length === 1 ? '' : 's'} · ${skuCount} SKU${skuCount === 1 ? '' : 's'} from SKU DB`;
      return `
        <article class="pl-product-card">
          <div class="pl-product-card-head">
            <div>
              <strong>${escapeHtml(card.label)}${matrix.total.legacy ? legacyMarker : ''}</strong>
              <small>${escapeHtml(subtitle)}</small>
            </div>
            <div class="pl-product-card-summary">
              <span><small>Revenue</small><b class="is-revenue">${money(matrix.total.netRevenue, true)}${matrix.total.legacy ? legacyMarker : ''}</b></span>
              <span><small>Gross profit</small><b class="${matrix.total.grossProfit < 0 ? 'is-negative' : 'is-profit'}">${money(matrix.total.grossProfit, true)}${matrix.total.legacy ? legacyMarker : ''}</b></span>
              <button type="button" class="pl-icon-button pl-settings-icon" data-pl-edit-product-card="${escapeHtml(card.card_key)}" aria-label="Configure ${escapeHtml(card.label)} card" title="Configure ${escapeHtml(card.label)} card">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>
              </button>
            </div>
          </div>
          ${matrix.variants.length && metrics.length ? `<div class="pl-product-metric-grid">${metrics.map((metric) => renderProductMetricCard(metric, matrix)).join('')}</div>` : `<p class="pl-empty">${matrix.variants.length ? 'No visible metric panels. Open card settings to show at least one metric.' : 'This card has no matching SKU DB products yet.'}</p>`}
        </article>`;
    }).join('');
  };

  const calculateSyrupVolumes = (month) => {
    const groups = syrupGroups();
    const products = state.products.length && month === state.month ? state.products : calculateProducts(month);
    const rows = groups.map((group) => ({
      ...group,
      units: 0,
      netRevenue: 0,
      grossRevenue: 0,
      cogs: 0,
      orders: 0,
      skus: new Set(group.assignment_mode === 'manual' ? group.sku_codes : autoSyrupSkusForGroup(group))
    }));
    for (const product of products) {
      const group = rows.find((candidate) => groupMatchesProduct(candidate, product));
      if (!group) continue;
      group.units += number(product.units);
      group.netRevenue += number(product.netRevenue);
      group.grossRevenue += number(product.grossRevenue);
      group.cogs += number(product.cogs);
      group.orders += number(product.orders);
      if (product.sku) group.skus.add(String(product.sku).toUpperCase());
    }
    return rows.map((row) => {
      const grossProfit = row.netRevenue - row.cogs;
      return {
        ...row,
        grossProfit,
        averagePrice: safeDivide(row.netRevenue, row.units),
        profitPerUnit: safeDivide(grossProfit, row.units),
        margin: safeDivide(grossProfit, row.netRevenue),
        skuCount: row.skus.size
      };
    });
  };

  const renderSyrupVolumes = () => {
    const rows = calculateSyrupVolumes(state.month);
    if (!rows.length) {
      refs.syrupGroups.innerHTML = '<p class="pl-empty">No syrup volume groups configured.</p>';
      return;
    }
    refs.syrupGroups.innerHTML = rows.map((row) => {
      const assignment = row.skuCount
        ? `${row.skuCount} ${row.assignment_mode === 'manual' ? 'selected' : 'auto'} SKU${row.skuCount === 1 ? '' : 's'}`
        : 'No matching SKUs';
      return `
        <article class="pl-syrup-card">
          <div class="pl-syrup-card-head">
            <span><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(assignment)}</small></span>
            <b>${row.volume_ml ? `${integer(row.volume_ml)} ml` : 'Custom'}</b>
          </div>
          <div class="pl-syrup-metrics">
            <span><small>Sold</small><strong>${integer(row.units)}</strong></span>
            <span><small>Net</small><strong>${money(row.netRevenue, true)}</strong></span>
            <span><small>COGS</small><strong>${money(row.cogs, true)}</strong></span>
            <span><small>Gross profit</small><strong class="${row.grossProfit < 0 ? 'is-negative' : ''}">${money(row.grossProfit, true)}</strong></span>
            <span><small>Avg GP</small><strong>${money(row.profitPerUnit, true)}</strong></span>
            <span><small>Margin</small><strong>${percent(row.margin)}</strong></span>
          </div>
        </article>`;
    }).join('');
  };

  const renderLedger = () => {
    state.products = calculateProducts(state.month);
    const query = state.search.trim().toLowerCase();
    const filtered = state.products.filter((row) => !query || [row.sku, row.label, row.tag, row.brand, row.flavor].join(' ').toLowerCase().includes(query));
    const groups = new Map();
    for (const row of filtered) {
      if (!groups.has(row.brand)) groups.set(row.brand, []);
      groups.get(row.brand).push(row);
    }
    if (!filtered.length) {
      refs.ledger.innerHTML = '<p class="pl-empty">No matching SKU sales in this period.</p>';
      return;
    }
    refs.ledger.innerHTML = Array.from(groups.entries()).map(([brand, rows]) => {
      const totals = rows.reduce((result, row) => ({
        units: result.units + row.units,
        revenue: result.revenue + row.netRevenue,
        cogs: result.cogs + row.cogs
      }), { units: 0, revenue: 0, cogs: 0 });
      const grossProfit = totals.revenue - totals.cogs;
      const legacy = rows.some((row) => row.legacy);
      const marker = legacy ? legacyMarker : '';
      return `
        <details class="pl-ledger-group">
          <summary>
            <span><strong>${escapeHtml(brand)}${marker}</strong><small>${rows.length} line${rows.length === 1 ? '' : 's'}</small></span>
            <span>${integer(totals.units)}${marker}</span><span>${money(totals.revenue, true)}${marker}</span><span>${money(safeDivide(totals.revenue, totals.units), true)}${marker}</span>
            <span>${money(totals.cogs, true)}${marker}</span><span class="${grossProfit < 0 ? 'is-negative' : ''}">${money(grossProfit, true)}${marker}</span>
            <span>${money(safeDivide(grossProfit, totals.units), true)}${marker}</span><span>${percent(safeDivide(grossProfit, totals.revenue))}${marker}</span><b aria-hidden="true"></b>
          </summary>
          <div class="pl-ledger-rows">
            ${rows.map((row) => `
              <div class="pl-ledger-row">
                <span><strong>${escapeHtml(row.label)}${row.legacy ? legacyMarker : ''}</strong><small>${escapeHtml(row.sku || (row.legacy ? 'Old spreadsheet category' : 'No SKU'))} ${row.flavor ? `· ${escapeHtml(row.flavor)}` : ''}</small></span>
                <span>${integer(row.units)}${row.legacy ? legacyMarker : ''}</span><span>${money(row.netRevenue, true)}${row.legacy ? legacyMarker : ''}</span><span>${money(row.averagePrice, true)}${row.legacy ? legacyMarker : ''}</span>
                <span>${money(row.cogs, true)}${row.legacy ? legacyMarker : ''}<small>${money(row.directUnitCost, true)} / unit${row.legacy ? legacyMarker : ''}</small></span>
                <span class="${row.grossProfit < 0 ? 'is-negative' : ''}">${money(row.grossProfit, true)}${row.legacy ? legacyMarker : ''}</span>
                <span>${money(row.profitPerUnit, true)}${row.legacy ? legacyMarker : ''}</span><span>${percent(row.margin)}${row.legacy ? legacyMarker : ''}</span>
                <button type="button" class="pl-row-edit" data-pl-edit-sku="${escapeHtml(row.key)}" ${!row.sku || state.month === 0 || row.legacy ? 'disabled' : ''} aria-label="Edit direct costs" title="${row.legacy ? 'From the old spreadsheets.' : (state.month === 0 ? 'Select one month to edit direct costs' : 'Edit direct costs')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4 4-.8L18.5 7.9l-3.2-3.2z"/><path d="m13.8 6.2 3.2 3.2"/></svg></button>
              </div>
            `).join('')}
          </div>
        </details>`;
    }).join('');
  };

  const renderEntries = () => {
    const sections = [
      ['income', 'Other income'],
      ['administration', 'Administration'],
      ['marketing', 'Marketing'],
      ['other', 'Other expenses']
    ];
    const entries = entriesForPeriod(state.month);
    refs.entrySections.innerHTML = sections.map(([key, label]) => {
      const rows = entries.filter((entry) => entry.section === key);
      const total = rows.reduce((sum, row) => sum + number(row.amount), 0);
      const legacy = rows.some((entry) => entry.source === 'legacy_spreadsheet');
      return `
        <details class="pl-entry-section">
          <summary><span>${label}<small>${rows.length} entries</small></span><strong>${money(total, true)}${legacy ? legacyMarker : ''}</strong></summary>
          <div>
            ${rows.length ? rows.map((entry) => `
              <button type="button" class="pl-entry-row" data-pl-edit-entry="${number(entry.id)}" ${entry.source === 'legacy_spreadsheet' ? 'disabled' : ''}>
                <span><strong>${escapeHtml(entry.label)}${entry.source === 'legacy_spreadsheet' ? legacyMarker : ''}</strong><small>${fullMonthNames[number(entry.month) - 1]}${entry.notes ? ` · ${escapeHtml(entry.notes)}` : ''}</small></span>
                <b>${money(entry.amount, true)}${entry.source === 'legacy_spreadsheet' ? legacyMarker : ''}</b>
              </button>`).join('') : '<p class="pl-empty">No saved entries.</p>'}
          </div>
        </details>`;
    }).join('');
  };

  const renderAllocation = () => {
    const totals = calculateStatement(state.month);
    const profit = Math.max(0, totals.netProfit);
    const settings = state.stored?.settings || {};
    const ownership = profit * number(settings.ownership_pct) / 100;
    const bng = ownership * Math.max(0, 100 - number(settings.director_pct)) / 100;
    const rows = [
      ['Reinvest', profit * number(settings.reinvest_pct) / 100, `${number(settings.reinvest_pct)}%`],
      ['Offering to SAGI', profit * number(settings.offering_pct) / 100, `${number(settings.offering_pct)}%`],
      ['Ownership share', ownership, `${number(settings.ownership_pct)}%`],
      ['Director', ownership * number(settings.director_pct) / 100, `${number(settings.director_pct)}% of ownership`],
      ['BnG', bng, `${Math.max(0, 100 - number(settings.director_pct))}% of ownership`],
      ['Loan to BnG', bng * number(settings.bng_loan_pct) / 100, `${number(settings.bng_loan_pct)}% of BnG`],
      ['Commissioner', bng * number(settings.commissioner_pct) / 100, `${number(settings.commissioner_pct)}% of BnG`],
      ['Advisor', bng * number(settings.advisor_pct) / 100, `${number(settings.advisor_pct)}% of BnG`]
    ];
    refs.allocationList.innerHTML = rows.map(([label, amount, note]) => `<div><span>${label}<small>${note}</small></span><strong>${money(amount, true)}${totals.legacy ? legacyMarker : ''}</strong></div>`).join('');
  };

  const renderQuality = () => {
    const liveProducts = state.products.filter((row) => !row.legacy);
    const total = liveProducts.length;
    const unmapped = liveProducts.filter((row) => !row.hasCatalog);
    const missingCogs = liveProducts.filter((row) => !row.hasCogs);
    const zeroSkuRows = liveProducts.filter((row) => !row.sku);
    const legacyProducts = state.products.filter((row) => row.legacy);
    const covered = total ? Math.round(((total - missingCogs.length) / total) * 100) : 100;
    refs.coverage.innerHTML = legacyProducts.length
      ? `Spreadsheet total${legacyMarker}`
      : `${covered}% COGS coverage`;
    refs.coverage.classList.toggle('is-warning', missingCogs.length > 0);
    const checks = [
      [true, 'Source mode', legacyProducts.length ? 'This period is using the old spreadsheet totals.' : 'This period is using live SKU rows.'],
      [missingCogs.length === 0, 'COGS coverage', missingCogs.length ? `${missingCogs.length} sold product lines have no COGS.` : 'Every sold SKU has direct cost coverage.'],
      [unmapped.length === 0, 'SKU catalog match', unmapped.length ? `${unmapped.length} sales lines do not match the SKU database.` : 'All SKU-coded sales match the catalog.'],
      [zeroSkuRows.length === 0, 'Marketplace SKU field', zeroSkuRows.length ? `${zeroSkuRows.length} product lines arrived without a SKU.` : 'All product lines include a SKU.']
    ];
    refs.dataQuality.innerHTML = checks.map(([ok, title, copy]) => `<div class="pl-quality-row ${ok ? 'is-ok' : 'is-warning'}"><span aria-hidden="true">${ok ? '✓' : '!'}</span><p><strong>${title}</strong><small>${copy}</small></p></div>`).join('');
  };

  const renderMonthly = () => {
    state.monthly = Array.from({ length: 12 }, (_, index) => calculateStatement(index + 1));
    const ytd = calculateStatement(0);
    const rows = statementMetrics();
    if (!rows.length) {
      refs.monthlyBody.innerHTML = '<tr><th>No visible metrics</th><td colspan="13">No visible metrics configured.</td></tr>';
      return;
    }
    refs.monthlyBody.innerHTML = rows.map((row) => {
      const key = row.value_key;
      const formatter = formatters[row.display_format] || money;
      return `
      <tr class="${key === 'netProfit' || key === 'grossProfit' ? 'is-emphasis' : ''}">
        <th>${escapeHtml(row.label)}</th>
        ${state.monthly.map((month, index) => `<td class="${number(month[key]) < 0 ? 'is-negative' : ''}">${formatter(month[key], true)}${month.legacy || isLegacyMonth(index + 1) ? legacyMarker : ''}</td>`).join('')}
        <td class="${number(ytd[key]) < 0 ? 'is-negative' : ''}">${formatter(ytd[key], true)}${ytd.legacy ? legacyMarker : ''}</td>
      </tr>`;
    }).join('');
  };

  const render = () => {
    refs.periodLabel.textContent = state.month ? `${fullMonthNames[state.month - 1]} ${state.year}` : `${state.year} year to date`;
    renderLedger();
    renderProductCards();
    renderSyrupVolumes();
    renderKpis();
    renderEntries();
    renderAllocation();
    renderQuality();
    renderMonthly();
    hydrateHelpTargets();
  };

  const load = async () => {
    if (state.loading) return;
    state.loading = true;
    refs.refresh.disabled = true;
    refs.syncLabel.textContent = 'Refreshing live sales';
    try {
      const stamp = Date.now();
      const [sales, stored] = await Promise.all([
        requestJson(`${salesEndpoint}?year=${state.year}&_ts=${stamp}`),
        requestJson(`${apiEndpoint}?year=${state.year}&_ts=${stamp}`)
      ]);
      state.sales = sales;
      state.stored = stored;
      refs.syncLabel.textContent = hasLegacyYear()
        ? 'Old spreadsheet months marked with red stars; live sales used outside them'
        : (sales.last_order_at ? `Live through ${new Date(sales.last_order_at).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB` : 'Live sales connected');
      populateEntryLabels();
      render();
    } catch (error) {
      refs.syncLabel.textContent = 'Data connection needs attention';
      refs.ledger.innerHTML = `<p class="pl-empty is-error">${escapeHtml(error.message)}</p>`;
      showToast(error.message, true);
    } finally {
      state.loading = false;
      refs.refresh.disabled = false;
    }
  };

  const populateEntryLabels = () => {
    const defaults = state.stored?.default_entries || {};
    refs.entryLabels.innerHTML = Object.values(defaults).flat().map((label) => `<option value="${escapeHtml(label)}"></option>`).join('');
  };

  const openSkuModal = (key) => {
    const row = state.products.find((product) => product.key === key);
    if (!row?.sku || state.month === 0) return;
    const input = skuInputMap().get(`${row.sku}|${state.month}`) || {};
    refs.skuForm.reset();
    refs.skuForm.elements.sku.value = row.sku;
    refs.skuForm.elements.month.value = String(state.month);
    refs.skuForm.elements.catalog_cogs.value = money(row.catalogCogs);
    refs.skuForm.elements.cogs_override.value = input.cogs_override ?? '';
    refs.skuForm.elements.packaging_per_unit.value = input.packaging_per_unit ?? '0';
    refs.skuForm.elements.labor_per_unit.value = input.labor_per_unit ?? '0';
    refs.skuForm.elements.other_per_unit.value = input.other_per_unit ?? '0';
    refs.skuForm.elements.notes.value = input.notes ?? '';
    refs.skuTitle.textContent = `${row.label} · ${row.sku}`;
    refs.skuPeriod.textContent = `${fullMonthNames[state.month - 1]} ${state.year}`;
    refs.skuError.hidden = true;
    refs.skuModal.hidden = false;
  };

  const openEntryModal = (entry = null) => {
    refs.entryForm.reset();
    refs.entryForm.elements.id.value = entry?.id || '';
    refs.entryForm.elements.month.value = String(entry?.month || state.month || currentMonth);
    refs.entryForm.elements.section.value = entry?.section || 'administration';
    refs.entryForm.elements.label.value = entry?.label || '';
    refs.entryForm.elements.amount.value = entry?.amount || '';
    refs.entryForm.elements.notes.value = entry?.notes || '';
    refs.entryTitle.textContent = entry ? 'Edit operating entry' : 'Add operating entry';
    refs.deleteEntry.hidden = !entry;
    refs.entryError.hidden = true;
    refs.entryModal.hidden = false;
  };

  const cloneGroup = (group) => ({
    ...group,
    sku_codes: Array.isArray(group.sku_codes) ? [...group.sku_codes] : []
  });
  const cloneMetric = (metric) => ({ ...metric });
  const catalogOptionLabel = (row) => [
    row.sku,
    row.product_name || row.base_product_name,
    row.flavor_name,
    volumeUnitLabel(row),
    row.tag
  ].filter(Boolean).join(' · ');
  const skuCodeForRow = (row = {}) => String(row.sku || '').toUpperCase();
  const uniqueSkuCodes = (codes) => Array.from(new Set(codes.map((sku) => String(sku).toUpperCase()).filter(Boolean)));
  const renderSkuOptions = (selectedCodes) => {
    const selected = new Set(selectedCodes.map((sku) => String(sku).toUpperCase()));
    return catalogRows()
      .slice()
      .sort((left, right) => catalogOptionLabel(left).localeCompare(catalogOptionLabel(right)))
      .map((row) => {
        const sku = skuCodeForRow(row);
        return `<option value="${escapeHtml(sku)}"${selected.has(sku) ? ' selected' : ''}>${escapeHtml(catalogOptionLabel(row))}</option>`;
      }).join('');
  };
  const cloneProductCard = (card) => ({
    ...card,
    sku_codes: Array.isArray(card.sku_codes) ? [...card.sku_codes] : [],
    layout: normalizeProductCardLayout(card.layout)
  });
  const catalogBrandKey = (row = {}) => normalizeKey(row.brand_name || row.brand || 'Unknown brand');
  const catalogBrandLabel = (row = {}) => cleanText(row.brand_name || row.brand, 'Unknown brand');
  const catalogBrands = () => {
    const brands = new Map();
    for (const row of catalogRows()) {
      const key = catalogBrandKey(row);
      if (!brands.has(key)) brands.set(key, { key, label: catalogBrandLabel(row), rows: [] });
      brands.get(key).rows.push(row);
    }
    return Array.from(brands.values()).sort((left, right) => left.label.localeCompare(right.label));
  };
  const productFamiliesForBrand = (brandKey = '') => catalogProductFamilies()
    .filter((family) => !brandKey || family.rows.some((row) => catalogBrandKey(row) === brandKey));
  const productFamilyOptions = (selectedKey, brandKey = '') => {
    const families = productFamiliesForBrand(brandKey);
    const hasSelected = families.some((family) => family.key === selectedKey);
    const options = families.map((family) => (
      `<option value="${escapeHtml(family.key)}"${family.key === selectedKey ? ' selected' : ''}>${escapeHtml(family.label)} (${family.rows.length} SKU${family.rows.length === 1 ? '' : 's'})</option>`
    ));
    if (selectedKey && !hasSelected) options.unshift(`<option value="${escapeHtml(selectedKey)}" selected>${escapeHtml(selectedKey)}</option>`);
    return `<option value="">All products</option>${options.join('')}`;
  };
  const productFlavorsForFamily = (familyKey) => {
    const rows = catalogRows().filter((row) => productFamilyKey(row) === familyKey);
    const flavors = new Map();
    for (const row of rows) {
      const key = productFlavorKey(row);
      if (!flavors.has(key)) flavors.set(key, { key, label: productFlavorLabel(row), rows: [] });
      flavors.get(key).rows.push(row);
    }
    return Array.from(flavors.values()).sort((left, right) => left.label.localeCompare(right.label));
  };
  const productFlavorOptions = (familyKey, selectedKey) => {
    const flavors = productFlavorsForFamily(familyKey);
    const options = flavors.map((flavor) => (
      `<option value="${escapeHtml(flavor.key)}"${flavor.key === selectedKey ? ' selected' : ''}>${escapeHtml(flavor.label)} (${flavor.rows.length} SKU${flavor.rows.length === 1 ? '' : 's'})</option>`
    ));
    if (selectedKey && !flavors.some((flavor) => flavor.key === selectedKey)) options.unshift(`<option value="${escapeHtml(selectedKey)}" selected>${escapeHtml(selectedKey)}</option>`);
    return `<option value="">Choose flavor</option>${options.join('')}`;
  };
  const matchModeOptions = (selectedMode) => [
    ['manual', 'Selected SKUs'],
    ['auto_product', 'Whole SKU DB product'],
    ['auto_product_flavor', 'Whole product flavor'],
    ['auto_syrup', 'Syrup volumes'],
    ['legacy', 'Old sheet total']
  ].map(([value, label]) => `<option value="${value}"${value === selectedMode ? ' selected' : ''}>${label}</option>`).join('');
  const variantModeOptions = (selectedMode) => [
    ['auto', 'Auto rows'],
    ['volume', 'Volume rows'],
    ['flavor', 'Flavor rows'],
    ['sku', 'SKU rows']
  ].map(([value, label]) => `<option value="${value}"${value === selectedMode ? ' selected' : ''}>${label}</option>`).join('');
  const newProductCardDraft = () => normalizeProductCard({
    id: 0,
    card_key: `manual_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    label: 'New SKU card',
    match_mode: 'manual',
    match_value: '',
    variant_mode: 'sku',
    sku_codes: [],
    is_visible: true,
    touched: true
  });
  const sameStringList = (left = [], right = []) => left.length === right.length && left.every((value, index) => value === right[index]);
  const layoutHasNoCustomRowLabels = (layout) => Object.keys(normalizeProductCardLayout(layout).row_labels).length === 0;
  const isPristineGeneratedProductCard = (card) => {
    if (!card.generated || card.touched || number(card.id) > 0) return false;
    const defaultCard = defaultProductCards().find((candidate) => productCardSignature(candidate) === productCardSignature(card));
    if (!defaultCard) return false;
    const layout = normalizeProductCardLayout(card.layout);
    const defaultRowOrder = baseVariantDefinitionsForCard(defaultCard).map((row) => row.key);
    const orderIsDefault = layout.row_order.length === 0 || sameStringList(layout.row_order, defaultRowOrder);
    return card.label === defaultCard.label
      && card.match_mode === defaultCard.match_mode
      && card.match_value === defaultCard.match_value
      && card.variant_mode === defaultCard.variant_mode
      && card.is_visible === defaultCard.is_visible
      && sameStringList(card.sku_codes, defaultCard.sku_codes)
      && orderIsDefault
      && layout.hidden_rows.length === 0
      && layout.hidden_metrics.length === 0
      && layout.metric_order.length === 0
      && layoutHasNoCustomRowLabels(layout)
      && Object.keys(layout.metric_labels).length === 0;
  };
  const productCardDraftKey = (card, index = 0) => [
    number(card.id),
    card.card_key || productCardSignature(card) || `card_${index}`,
    index
  ].join(':');
  const collectProductCardFilterState = () => {
    if (!refs.productCardList) return;
    refs.productCardList.querySelectorAll('[data-pl-product-card-row]').forEach((row) => {
      const key = row.dataset.plProductCardDraftKey || '';
      if (!key) return;
      state.productCardFilters[key] = {
        brand: row.querySelector('[data-pl-sku-filter-brand]')?.value || '',
        product: row.querySelector('[data-pl-sku-filter-product]')?.value || '',
        search: row.querySelector('[data-pl-sku-filter-search]')?.value || ''
      };
    });
  };
  const productCardFilterValues = (card, index) => {
    const key = productCardDraftKey(card, index);
    return {
      brand: state.productCardFilters[key]?.brand || '',
      product: state.productCardFilters[key]?.product || '',
      search: state.productCardFilters[key]?.search || ''
    };
  };
  const filteredCatalogSkuRows = (filters = {}) => {
    const query = cleanText(filters.search, '').toLowerCase();
    return catalogRows()
      .filter((row) => !filters.brand || catalogBrandKey(row) === filters.brand)
      .filter((row) => !filters.product || productFamilyKey(row) === filters.product)
      .filter((row) => !query || skuSearchText(row).includes(query))
      .slice()
      .sort((left, right) => catalogOptionLabel(left).localeCompare(catalogOptionLabel(right)));
  };
  const selectedSkuRows = (selectedCodes) => {
    const selected = new Set(selectedCodes.map((sku) => String(sku).toUpperCase()).filter(Boolean));
    const rows = catalogRows().filter((row) => selected.has(skuCodeForRow(row)));
    const known = new Set(rows.map(skuCodeForRow));
    const unknown = Array.from(selected).filter((sku) => !known.has(sku)).map((sku) => ({ sku, label: sku, unknown: true }));
    return [
      ...rows.sort((left, right) => catalogOptionLabel(left).localeCompare(catalogOptionLabel(right))),
      ...unknown
    ];
  };
  const cardSelectedSkuCodes = (card) => card.match_mode === 'manual'
    ? uniqueSkuCodes(card.sku_codes)
    : uniqueSkuCodes(cardCatalogRows(card).map(skuCodeForRow));
  const renderProductCardSkuPicker = (card, index) => {
    const filters = productCardFilterValues(card, index);
    const manual = card.match_mode === 'manual';
    const rows = filteredCatalogSkuRows(filters);
    const selectedCodes = cardSelectedSkuCodes(card);
    const selected = new Set(selectedCodes);
    const visibleCodes = new Set(rows.map(skuCodeForRow));
    const selectedRows = selectedSkuRows(selectedCodes);
    const brands = catalogBrands().map((brand) => (
      `<option value="${escapeHtml(brand.key)}"${brand.key === filters.brand ? ' selected' : ''}>${escapeHtml(brand.label)} (${brand.rows.length})</option>`
    )).join('');
    const skuTiles = rows.length ? rows.map((row) => {
      const sku = skuCodeForRow(row);
      return `
        <label class="pl-sku-tile${selected.has(sku) ? ' is-selected' : ''}">
          <input type="checkbox" data-pl-product-card-sku-check value="${escapeHtml(sku)}"${selected.has(sku) ? ' checked' : ''}${manual ? '' : ' disabled'}>
          <span>
            <strong>${escapeHtml(row.product_name || row.base_product_name || row.sku)}</strong>
            <small>${escapeHtml([sku, catalogBrandLabel(row), row.flavor_name, volumeUnitLabel(row), row.tag].filter(Boolean).join(' · '))}</small>
          </span>
        </label>`;
    }).join('') : '<p class="pl-empty">No SKU DB rows match these filters.</p>';
    const chips = selectedRows.length ? selectedRows.map((row) => {
      const sku = skuCodeForRow(row);
      const label = row.unknown ? row.label : catalogOptionLabel(row);
      return `
        <button type="button" class="pl-sku-chip${visibleCodes.has(sku) ? '' : ' is-offscreen'}" data-pl-selected-sku="${escapeHtml(sku)}" data-pl-remove-product-card-sku="${escapeHtml(sku)}"${manual ? '' : ' disabled'}>
          <strong>${escapeHtml(sku)}</strong><span>${escapeHtml(label.replace(sku, '').replace(/^ · /, '') || 'Selected SKU')}</span>
        </button>`;
    }).join('') : '<p class="pl-empty">No SKUs selected yet.</p>';
    return `
      <div class="pl-sku-builder${manual ? '' : ' is-readonly'}">
        <div class="pl-sku-filter-grid">
          <label><span>Company ${helpIcon('Narrows the SKU picker by company or brand so long SKU lists are easier to scan. It does not change an automatic card unless the card uses Selected SKUs.')}</span><select data-pl-sku-filter-brand><option value="">All companies</option>${brands}</select></label>
          <label><span>Product ${helpIcon('Narrows the SKU picker to one product family, such as syrup or another SKU DB product group.')}</span><select data-pl-sku-filter-product>${productFamilyOptions(filters.product, filters.brand)}</select></label>
          <label><span>Find SKU ${helpIcon('Searches SKU code, tag, company, product, flavor, unit, and volume in the picker.')}</span><input type="search" data-pl-sku-filter-search value="${escapeHtml(filters.search)}" placeholder="Search SKU, TAG, flavor, unit"></label>
        </div>
        <div class="pl-sku-picker-actions">
          <span>${selectedCodes.length} selected · ${rows.length} showing</span>
          <button type="button" data-pl-sku-select-visible${manual ? '' : ' disabled'}>Select shown</button>
          <button type="button" data-pl-sku-clear-visible${manual ? '' : ' disabled'}>Clear shown</button>
          <button type="button" data-pl-sku-clear-all${manual ? '' : ' disabled'}>Clear all</button>
        </div>
        ${manual ? '' : '<p class="pl-sku-readonly-note">Switch coverage mode to Selected SKUs to choose individual SKU rows.</p>'}
        <div class="pl-sku-picker-grid">${skuTiles}</div>
        <div class="pl-selected-sku-list">${chips}</div>
      </div>`;
  };
  const renderProductCardRowEditor = (card) => {
    const rows = variantDefinitionsForCard(card, true);
    const title = `<div class="pl-editor-section-title"><span>Variant rows ${helpIcon('These are the row labels on the left side of each product-card table. You can rename, reorder, or hide rows to make the card easier to read.')}</span></div>`;
    if (!rows.length) {
      return `<div class="pl-preview-row-editor">${title}<p class="pl-empty">Preview rows will appear after SKUs match this card.</p></div>`;
    }
    return `
      <div class="pl-preview-row-editor">
        ${title}
        ${rows.map((row, index) => `
          <div class="pl-preview-row${row.is_hidden ? ' is-hidden' : ''}" draggable="true" data-pl-variant-row data-pl-variant-row-key="${escapeHtml(row.key)}">
            <button type="button" class="pl-preview-row-drag" data-pl-variant-row-drag aria-label="Drag preview row">Drag</button>
            <input data-pl-variant-row-label data-pl-variant-original-label="${escapeHtml(row.originalLabel || row.label)}" value="${escapeHtml(row.label)}" maxlength="120">
            <div class="pl-preview-row-actions">
              <button type="button" data-pl-variant-row-move="-1" ${index === 0 ? 'disabled' : ''}>Up</button>
              <button type="button" data-pl-variant-row-move="1" ${index === rows.length - 1 ? 'disabled' : ''}>Down</button>
              <button type="button" data-pl-variant-row-reset-label>Reset</button>
              <label><input type="checkbox" data-pl-variant-row-visible ${row.is_hidden ? '' : 'checked'}> Visible</label>
            </div>
          </div>
        `).join('')}
      </div>`;
  };
  const renderProductCardMetricEditor = (card) => {
    const metrics = productMetricsForCard(card, true);
    return `
      <div class="pl-preview-metric-editor">
        <div class="pl-editor-section-title"><span>Metric panels ${helpIcon('Each panel is one table inside the product card, such as revenue, COGS, or gross profit. Hide a panel when you do not need it on the main page.')}</span></div>
        ${metrics.map((metric, index) => `
          <div class="pl-preview-metric-row${metric.is_hidden ? ' is-hidden' : ''}" draggable="true" data-pl-metric-panel-row data-pl-metric-panel-key="${escapeHtml(metric.key)}">
            <button type="button" class="pl-preview-row-drag" data-pl-metric-panel-drag aria-label="Drag metric panel">Drag</button>
            <input data-pl-metric-panel-label data-pl-metric-panel-original-label="${escapeHtml(metric.originalLabel || metric.label)}" value="${escapeHtml(metric.label)}" maxlength="80">
            <div class="pl-preview-row-actions">
              <button type="button" data-pl-metric-panel-move="-1" ${index === 0 ? 'disabled' : ''}>Up</button>
              <button type="button" data-pl-metric-panel-move="1" ${index === metrics.length - 1 ? 'disabled' : ''}>Down</button>
              <button type="button" data-pl-metric-panel-reset-label>Reset</button>
              <label><input type="checkbox" data-pl-metric-panel-visible ${metric.is_hidden ? '' : 'checked'}> Visible</label>
            </div>
          </div>
        `).join('')}
      </div>`;
  };
  const renderProductCardDraftPreview = (card) => {
    const matrix = productCardMatrix(card);
    const metrics = productMetricsForCard(card);
    const skuCount = card.match_mode === 'manual' ? card.sku_codes.length : cardCatalogRows(card).length;
    return `
      <div class="pl-product-card-preview">
        <div class="pl-product-preview-head">
          <span>Live preview ${helpIcon('Shows how the card will look using the same matching rules as the saved dashboard. Red stars mean that value comes from the imported workbook.')}</span>
          <strong>${matrix.variants.length} row${matrix.variants.length === 1 ? '' : 's'} · ${metrics.length} metric${metrics.length === 1 ? '' : 's'} · ${skuCount} SKU${skuCount === 1 ? '' : 's'}</strong>
        </div>
        ${renderProductCardMetricEditor(card)}
        ${renderProductCardRowEditor(card)}
        ${matrix.variants.length && metrics.length ? `<div class="pl-product-preview-grid">${metrics.map((metric) => renderProductMetricCard(metric, matrix)).join('')}</div>` : `<p class="pl-empty">${matrix.variants.length ? 'No visible metric panels.' : 'Select at least one SKU to preview this card.'}</p>`}
      </div>`;
  };
  const collectProductCardLayout = (row) => {
    const rowOrder = [];
    const rowLabels = {};
    const hiddenRows = [];
    const metricOrder = [];
    const metricLabels = {};
    const hiddenMetrics = [];
    row.querySelectorAll('[data-pl-variant-row]').forEach((variantRow) => {
      const key = cleanText(variantRow.dataset.plVariantRowKey || '', '');
      if (!key) return;
      rowOrder.push(key);
      const labelInput = variantRow.querySelector('[data-pl-variant-row-label]');
      const label = cleanText(labelInput?.value || '', '');
      const originalLabel = cleanText(labelInput?.dataset.plVariantOriginalLabel || '', '');
      if (label && label !== originalLabel) rowLabels[key] = label;
      if (!variantRow.querySelector('[data-pl-variant-row-visible]')?.checked) hiddenRows.push(key);
    });
    row.querySelectorAll('[data-pl-metric-panel-row]').forEach((metricRow) => {
      const key = cleanText(metricRow.dataset.plMetricPanelKey || '', '');
      if (!key) return;
      metricOrder.push(key);
      const labelInput = metricRow.querySelector('[data-pl-metric-panel-label]');
      const label = cleanText(labelInput?.value || '', '');
      const originalLabel = cleanText(labelInput?.dataset.plMetricPanelOriginalLabel || '', '');
      if (label && label !== originalLabel) metricLabels[key] = label;
      if (!metricRow.querySelector('[data-pl-metric-panel-visible]')?.checked) hiddenMetrics.push(key);
    });
    return normalizeProductCardLayout({
      row_order: rowOrder,
      row_labels: rowLabels,
      hidden_rows: hiddenRows,
      metric_order: metricOrder,
      metric_labels: metricLabels,
      hidden_metrics: hiddenMetrics
    });
  };
  const renderProductCardSettings = (options = {}) => {
    const previousScrollTop = options.preserveScroll ? number(refs.productCardList.scrollTop) : 0;
    const draft = Array.isArray(state.draftProductCards) ? state.draftProductCards : productCards(true).map(cloneProductCard);
    refs.productCardList.innerHTML = draft.map((card, index) => {
      const flavorParts = parseFlavorMatchValue(card.match_mode === 'auto_product_flavor' ? card.match_value : '');
      const matchFamilyValue = card.match_mode === 'auto_product_flavor' ? flavorParts.familyKey : card.match_value;
      const draftKey = productCardDraftKey(card, index);
      const hiddenClass = card.is_visible === false ? ' is-hidden' : '';
      const selectedCount = cardSelectedSkuCodes(card).length;
      return `
        <section class="pl-config-row pl-product-config-row${hiddenClass}" data-pl-product-card-row data-pl-product-card-index="${index}" data-pl-product-card-draft-key="${escapeHtml(draftKey)}" data-pl-product-card-key-value="${escapeHtml(card.card_key)}" data-pl-product-card-generated="${card.generated ? '1' : '0'}" data-pl-product-card-touched="${card.touched ? '1' : '0'}">
          <input type="hidden" data-pl-product-card-id value="${number(card.id)}">
          <input type="hidden" data-pl-product-card-key value="${escapeHtml(card.card_key)}">
          <input type="hidden" data-pl-product-card-match-value value="${escapeHtml(card.match_value || '')}">
          <div class="pl-config-row-head">
            <div class="pl-config-row-title">
              <button type="button" class="pl-card-drag-handle" draggable="true" data-pl-product-card-drag aria-label="Drag card">Drag</button>
              <span><strong>${escapeHtml(card.label || `Product card ${index + 1}`)}</strong><small>${selectedCount} SKU${selectedCount === 1 ? '' : 's'} · ${escapeHtml(card.match_mode.replace(/_/g, ' '))}</small></span>
            </div>
            <div class="pl-config-row-actions">
              <button type="button" data-pl-product-card-move="-1" ${index === 0 ? 'disabled' : ''}>Up</button>
              <button type="button" data-pl-product-card-move="1" ${index === draft.length - 1 ? 'disabled' : ''}>Down</button>
              <button type="button" data-pl-product-card-hide>${card.is_visible === false ? 'Show' : 'Hide'}</button>
              <button type="button" class="is-danger" data-pl-product-card-delete>Delete</button>
              <label><input type="checkbox" data-pl-product-card-visible ${card.is_visible !== false ? 'checked' : ''}> Visible</label>
            </div>
          </div>
          <div class="pl-form-grid pl-settings-grid pl-product-settings-grid">
            <label><span>Name ${helpIcon('Card title shown on the Profit & Loss page. Rename it for clarity; the product matching rules stay the same.')}</span><input data-pl-product-card-label maxlength="120" value="${escapeHtml(card.label || '')}" required></label>
            <label><span>Coverage mode ${helpIcon('Defines what this card includes. Selected SKUs uses checked rows, whole product updates automatically from SKU DB, whole product flavor focuses on one flavor, syrup volumes groups syrup by size, and old sheet total shows imported workbook totals.')}</span><select data-pl-product-card-mode>${matchModeOptions(card.match_mode)}</select></label>
            <label><span>SKU DB product ${helpIcon('Product family used by whole-product card modes. Disabled when the selected coverage mode does not need a product family.')}</span><select data-pl-product-card-match ${['auto_product', 'auto_product_flavor'].includes(card.match_mode) ? '' : 'disabled'}>${productFamilyOptions(matchFamilyValue)}</select></label>
            <label><span>Flavor ${helpIcon('Flavor used by Whole product flavor mode. Disabled for other coverage modes.')}</span><select data-pl-product-card-flavor ${card.match_mode === 'auto_product_flavor' ? '' : 'disabled'}>${productFlavorOptions(matchFamilyValue, flavorParts.flavorKey)}</select></label>
            <label><span>Rows on left ${helpIcon('Controls how matching products are split into table rows: automatic, by volume, by flavor, or one row per SKU.')}</span><select data-pl-product-card-variant ${card.match_mode === 'legacy' ? 'disabled' : ''}>${variantModeOptions(card.variant_mode)}</select></label>
          </div>
          ${renderProductCardSkuPicker(card, index)}
          ${renderProductCardDraftPreview(card)}
        </section>`;
    }).join('');
    if (options.preserveScroll) {
      window.requestAnimationFrame(() => { refs.productCardList.scrollTop = previousScrollTop; });
    }
    hydrateHelpTargets(refs.productCardList);
  };
  const collectProductCardSettings = () => Array.from(refs.productCardList.querySelectorAll('[data-pl-product-card-row]')).map((row) => {
    const mode = row.querySelector('[data-pl-product-card-mode]')?.value || 'manual';
    const visibleSkuCodes = new Set(Array.from(row.querySelectorAll('[data-pl-product-card-sku-check]')).map((input) => String(input.value || '').toUpperCase()));
    const checkedSkuCodes = Array.from(row.querySelectorAll('[data-pl-product-card-sku-check]:checked')).map((input) => input.value);
    const hiddenSelectedSkuCodes = Array.from(row.querySelectorAll('[data-pl-selected-sku]'))
      .map((element) => element.dataset.plSelectedSku || '')
      .filter((sku) => !visibleSkuCodes.has(String(sku).toUpperCase()));
    const productValue = row.querySelector('[data-pl-product-card-match]')?.value || '';
    const flavorValue = row.querySelector('[data-pl-product-card-flavor]')?.value || productFlavorsForFamily(productValue)[0]?.key || '';
    return normalizeProductCard({
      id: number(row.querySelector('[data-pl-product-card-id]')?.value),
      card_key: row.querySelector('[data-pl-product-card-key]')?.value || '',
      label: row.querySelector('[data-pl-product-card-label]')?.value || '',
      match_mode: mode,
      match_value: mode === 'auto_product'
        ? productValue
        : (mode === 'auto_product_flavor' ? flavorMatchValue(productValue, flavorValue) : ''),
      variant_mode: mode === 'legacy' ? 'sku' : (row.querySelector('[data-pl-product-card-variant]')?.value || 'auto'),
      sku_codes: mode === 'manual' ? uniqueSkuCodes([...checkedSkuCodes, ...hiddenSelectedSkuCodes]) : [],
      layout: collectProductCardLayout(row),
      is_visible: row.querySelector('[data-pl-product-card-visible]')?.checked || false,
      generated: row.dataset.plProductCardGenerated === '1',
      touched: row.dataset.plProductCardTouched === '1'
    });
  });
  const openProductCardSettings = (options = {}) => {
    const cards = productCards(true).map(cloneProductCard);
    state.productCardFilters = {};
    state.deletedProductCards = [];
    if (options.addNew) {
      state.draftProductCards = [...cards, newProductCardDraft()];
      refs.productCardTitle.textContent = 'Product card studio';
    } else if (options.cardKey) {
      const selectedCard = cards.find((card) => card.card_key === options.cardKey || productCardSignature(card) === options.cardKey);
      state.draftProductCards = [selectedCard ? cloneProductCard(selectedCard) : newProductCardDraft()];
      refs.productCardTitle.textContent = selectedCard ? `${selectedCard.label} card settings` : 'Product card settings';
    } else {
      state.draftProductCards = cards.length ? cards : [newProductCardDraft()];
      refs.productCardTitle.textContent = 'Product card studio';
    }
    refs.productCardError.hidden = true;
    renderProductCardSettings();
    refs.productCardModal.hidden = false;
    if (options.cardKey) {
      const row = Array.from(refs.productCardList.querySelectorAll('[data-pl-product-card-row]'))
        .find((candidate) => candidate.dataset.plProductCardKeyValue === options.cardKey);
      row?.scrollIntoView({ block: 'center' });
    } else if (options.addNew) {
      refs.productCardList.lastElementChild?.scrollIntoView({ block: 'center' });
    }
  };
  const hydrateProductCardDrafts = () => {
    const families = catalogProductFamilies();
    state.draftProductCards = (Array.isArray(state.draftProductCards) ? state.draftProductCards : []).map((card) => {
      if (card.match_mode === 'auto_product' && !card.match_value && families.length) {
        return {
          ...card,
          label: card.label === 'New SKU card' ? families[0].label : card.label,
          match_value: families[0].key,
          variant_mode: card.variant_mode === 'sku' ? autoVariantModeForRows(families[0].rows) : card.variant_mode
        };
      }
      if (card.match_mode === 'auto_product_flavor') {
        const parsed = parseFlavorMatchValue(card.match_value);
        const familyKey = parsed.familyKey || families[0]?.key || '';
        const flavors = productFlavorsForFamily(familyKey);
        const flavorKey = parsed.flavorKey || flavors[0]?.key || '';
        const familyLabel = families.find((family) => family.key === familyKey)?.label || '';
        const flavorLabel = flavors.find((flavor) => flavor.key === flavorKey)?.label || '';
        return {
          ...card,
          label: card.label === 'New SKU card' ? [familyLabel, flavorLabel].filter(Boolean).join(' ') : card.label,
          match_value: familyKey ? flavorMatchValue(familyKey, flavorKey) : '',
          variant_mode: card.variant_mode === 'sku' ? 'volume' : card.variant_mode
        };
      }
      if (card.match_mode === 'auto_syrup' && card.label === 'New SKU card') return { ...card, label: 'Syrup', variant_mode: 'volume' };
      if (card.match_mode === 'legacy' && card.label === 'New SKU card') return { ...card, label: 'Old spreadsheet total', variant_mode: 'sku' };
      return card;
    });
  };

  const renderSyrupSettings = () => {
    const draft = Array.isArray(state.draftSyrupGroups) ? state.draftSyrupGroups : syrupGroups(true).map(cloneGroup);
    refs.syrupSettingsList.innerHTML = draft.map((group, index) => {
      const selectedCodes = group.assignment_mode === 'manual' ? group.sku_codes : autoSyrupSkusForGroup(group);
      return `
        <section class="pl-config-row" data-pl-syrup-row>
          <input type="hidden" data-pl-syrup-id value="${number(group.id)}">
          <div class="pl-config-row-head">
            <strong>${escapeHtml(group.label || `Volume ${index + 1}`)}</strong>
            <label><input type="checkbox" data-pl-syrup-visible ${group.is_visible !== false ? 'checked' : ''}> Visible</label>
          </div>
          <div class="pl-form-grid pl-settings-grid">
            <label><span>Name ${helpIcon('Label shown on the Syrup volumes summary card.')}</span><input data-pl-syrup-label maxlength="80" value="${escapeHtml(group.label || '')}" required></label>
            <label><span>Volume ml ${helpIcon('Bottle or sample volume used for automatic syrup matching. Leave blank only for a custom manual group.')}</span><input data-pl-syrup-volume inputmode="decimal" value="${group.volume_ml ? escapeHtml(group.volume_ml) : ''}" placeholder="50"></label>
            <label><span>Assignment ${helpIcon('Auto matches syrup SKUs by SKU DB volume and syrup keywords. Manual includes only the SKUs you select.')}</span><select data-pl-syrup-mode><option value="auto"${group.assignment_mode !== 'manual' ? ' selected' : ''}>Auto</option><option value="manual"${group.assignment_mode === 'manual' ? ' selected' : ''}>Manual</option></select></label>
            <label class="is-wide"><span>SKUs ${helpIcon('For Manual assignment, choose the exact SKU DB rows included in this syrup volume group.')}</span><select data-pl-syrup-skus multiple size="7" ${group.assignment_mode === 'manual' ? '' : 'disabled'}>${renderSkuOptions(selectedCodes)}</select></label>
          </div>
        </section>`;
    }).join('');
    hydrateHelpTargets(refs.syrupSettingsList);
  };

  const collectSyrupSettings = () => Array.from(refs.syrupSettingsList.querySelectorAll('[data-pl-syrup-row]')).map((row) => {
    const mode = row.querySelector('[data-pl-syrup-mode]')?.value === 'manual' ? 'manual' : 'auto';
    const skuSelect = row.querySelector('[data-pl-syrup-skus]');
    return {
      id: number(row.querySelector('[data-pl-syrup-id]')?.value),
      label: row.querySelector('[data-pl-syrup-label]')?.value || '',
      volume_ml: inputNumber(row.querySelector('[data-pl-syrup-volume]')?.value || ''),
      assignment_mode: mode,
      sku_codes: mode === 'manual' ? Array.from(skuSelect?.selectedOptions || []).map((option) => option.value) : [],
      is_visible: row.querySelector('[data-pl-syrup-visible]')?.checked || false
    };
  });

  const openSyrupSettings = () => {
    state.draftSyrupGroups = syrupGroups(true).map(cloneGroup);
    refs.syrupSettingsError.hidden = true;
    renderSyrupSettings();
    refs.syrupSettingsModal.hidden = false;
  };

  const metricOptions = (selectedKey) => metricDefinitions.map((definition) => (
    `<option value="${escapeHtml(definition.key)}"${definition.key === selectedKey ? ' selected' : ''}>${escapeHtml(definition.label)}</option>`
  )).join('');
  const formatOptions = (selectedFormat) => [
    ['money', 'Currency'],
    ['integer', 'Number'],
    ['percent', 'Percent']
  ].map(([value, label]) => `<option value="${value}"${value === selectedFormat ? ' selected' : ''}>${label}</option>`).join('');

  const renderMetricSettings = () => {
    const draft = Array.isArray(state.draftMetrics) ? state.draftMetrics : statementMetrics(true).map(cloneMetric);
    refs.metricsList.innerHTML = draft.map((metric, index) => `
      <section class="pl-config-row" data-pl-metric-row>
        <input type="hidden" data-pl-metric-id value="${number(metric.id)}">
        <div class="pl-config-row-head">
          <strong>${escapeHtml(metric.label || `Metric ${index + 1}`)}</strong>
          <label><input type="checkbox" data-pl-metric-visible ${metric.is_visible !== false ? 'checked' : ''}> Visible</label>
        </div>
        <div class="pl-form-grid pl-settings-grid">
          <label><span>Name ${helpIcon('Row name shown in the Monthly statement table.')}</span><input data-pl-metric-label maxlength="120" value="${escapeHtml(metric.label || '')}" required></label>
          <label><span>Value ${helpIcon('Calculated P&L number this statement row should display.')}</span><select data-pl-metric-value>${metricOptions(metric.value_key)}</select></label>
          <label><span>Format ${helpIcon('Display style for this row: rupiah currency, whole number, or percent.')}</span><select data-pl-metric-format>${formatOptions(metric.display_format)}</select></label>
        </div>
      </section>`).join('');
    hydrateHelpTargets(refs.metricsList);
  };

  const collectMetricSettings = () => Array.from(refs.metricsList.querySelectorAll('[data-pl-metric-row]')).map((row) => ({
    id: number(row.querySelector('[data-pl-metric-id]')?.value),
    label: row.querySelector('[data-pl-metric-label]')?.value || '',
    value_key: row.querySelector('[data-pl-metric-value]')?.value || 'revenue',
    display_format: row.querySelector('[data-pl-metric-format]')?.value || 'money',
    is_visible: row.querySelector('[data-pl-metric-visible]')?.checked || false
  }));

  const openMetricsSettings = () => {
    state.draftMetrics = statementMetrics(true).map(cloneMetric);
    refs.metricsError.hidden = true;
    renderMetricSettings();
    refs.metricsModal.hidden = false;
  };

  const closeModal = (modal) => { if (modal) modal.hidden = true; };
  const postAction = (payload) => requestJson(apiEndpoint, { method: 'POST', body: JSON.stringify({ year: state.year, ...payload }) });

  root.addEventListener('click', (event) => {
    const helpTarget = event.target.closest('[data-pl-help]');
    if (!helpTarget) {
      if (!event.target.closest('.pl-help-popover')) hideHelpPopover();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (activeHelpTarget === helpTarget && !ensureHelpPopover().hidden) {
      hideHelpPopover();
    } else {
      showHelpPopover(helpTarget);
    }
  });
  root.addEventListener('keydown', (event) => {
    const helpTarget = event.target.closest('[data-pl-help]');
    if (!helpTarget || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (activeHelpTarget === helpTarget && !ensureHelpPopover().hidden) {
      hideHelpPopover();
    } else {
      showHelpPopover(helpTarget);
    }
  });
  document.addEventListener('click', (event) => {
    if (!activeHelpTarget) return;
    if (root.contains(event.target) || helpPopover?.contains(event.target)) return;
    hideHelpPopover();
  });
  window.addEventListener('resize', hideHelpPopover);
  window.addEventListener('scroll', hideHelpPopover, true);

  refs.year.addEventListener('change', () => {
    state.year = number(refs.year.value);
    load();
  });
  refs.month.addEventListener('change', () => {
    state.month = number(refs.month.value);
    render();
  });
  refs.search.addEventListener('input', () => {
    state.search = refs.search.value;
    renderLedger();
  });
  refs.refresh.addEventListener('click', load);
  refs.ledger.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-sku]');
    if (button) openSkuModal(button.dataset.plEditSku || '');
  });
  refs.productCards?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-product-card]');
    if (button) openProductCardSettings({ cardKey: button.dataset.plEditProductCard || '' });
  });
  refs.entrySections.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-entry]');
    if (!button) return;
    const entry = (state.stored?.entries || []).find((row) => number(row.id) === number(button.dataset.plEditEntry));
    if (entry) openEntryModal(entry);
  });
  root.querySelector('[data-pl-add-entry]').addEventListener('click', () => openEntryModal());
  root.querySelector('[data-pl-edit-product-cards]')?.addEventListener('click', () => openProductCardSettings());
  refs.addProductCard?.addEventListener('click', () => openProductCardSettings({ addNew: true }));
  root.querySelector('[data-pl-edit-syrup-settings]').addEventListener('click', openSyrupSettings);
  root.querySelector('[data-pl-edit-metrics]').addEventListener('click', openMetricsSettings);

  root.querySelectorAll('[data-pl-close-sku]').forEach((element) => element.addEventListener('click', () => closeModal(refs.skuModal)));
  root.querySelectorAll('[data-pl-close-entry]').forEach((element) => element.addEventListener('click', () => closeModal(refs.entryModal)));
  root.querySelectorAll('[data-pl-close-allocation]').forEach((element) => element.addEventListener('click', () => closeModal(refs.allocationModal)));
  root.querySelectorAll('[data-pl-close-product-cards]').forEach((element) => element.addEventListener('click', () => closeModal(refs.productCardModal)));
  root.querySelectorAll('[data-pl-close-syrup-settings]').forEach((element) => element.addEventListener('click', () => closeModal(refs.syrupSettingsModal)));
  root.querySelectorAll('[data-pl-close-metrics]').forEach((element) => element.addEventListener('click', () => closeModal(refs.metricsModal)));

  refs.skuForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.skuError.hidden = true;
    const data = new FormData(refs.skuForm);
    try {
      await postAction({
        action: 'save_sku_input',
        sku: data.get('sku'),
        month: data.get('month'),
        cogs_override: inputNumber(data.get('cogs_override')),
        packaging_per_unit: inputNumber(data.get('packaging_per_unit')) || 0,
        labor_per_unit: inputNumber(data.get('labor_per_unit')) || 0,
        other_per_unit: inputNumber(data.get('other_per_unit')) || 0,
        notes: data.get('notes')
      });
      closeModal(refs.skuModal);
      showToast('SKU cost input saved.');
      await load();
    } catch (error) {
      refs.skuError.textContent = error.message;
      refs.skuError.hidden = false;
    }
  });

  refs.entryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.entryError.hidden = true;
    const data = new FormData(refs.entryForm);
    try {
      await postAction({
        action: 'save_entry',
        id: data.get('id'),
        month: data.get('month'),
        section: data.get('section'),
        label: data.get('label'),
        amount: inputNumber(data.get('amount')) || 0,
        notes: data.get('notes')
      });
      closeModal(refs.entryModal);
      showToast('P&L entry saved.');
      await load();
    } catch (error) {
      refs.entryError.textContent = error.message;
      refs.entryError.hidden = false;
    }
  });

  refs.deleteEntry.addEventListener('click', async () => {
    const id = number(refs.entryForm.elements.id.value);
    if (!id || !window.confirm('Delete this P&L entry?')) return;
    try {
      await postAction({ action: 'delete_entry', id });
      closeModal(refs.entryModal);
      showToast('P&L entry deleted.');
      await load();
    } catch (error) {
      refs.entryError.textContent = error.message;
      refs.entryError.hidden = false;
    }
  });

  root.querySelector('[data-pl-edit-allocation]').addEventListener('click', () => {
    const settings = state.stored?.settings || {};
    for (const input of refs.allocationForm.elements) {
      if (input.name) input.value = settings[input.name] ?? '';
    }
    refs.allocationError.hidden = true;
    refs.allocationModal.hidden = false;
  });

  refs.allocationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(refs.allocationForm);
    const payload = { action: 'save_settings' };
    for (const [key, value] of data.entries()) payload[key] = inputNumber(value) || 0;
    try {
      const response = await postAction(payload);
      state.stored.settings = response.settings;
      closeModal(refs.allocationModal);
      renderAllocation();
      showToast('Profit allocation saved.');
    } catch (error) {
      refs.allocationError.textContent = error.message;
      refs.allocationError.hidden = false;
    }
  });

  const syncProductCardDrafts = () => {
    collectProductCardFilterState();
    state.draftProductCards = collectProductCardSettings();
    hydrateProductCardDrafts();
  };
  const markProductCardTouched = (row) => {
    if (row) row.dataset.plProductCardTouched = '1';
  };
  const focusProductCardField = (draftKey, selector, value = '') => {
    window.requestAnimationFrame(() => {
      const row = Array.from(refs.productCardList?.querySelectorAll('[data-pl-product-card-row]') || [])
        .find((candidate) => candidate.dataset.plProductCardDraftKey === draftKey);
      const field = row?.querySelector(selector);
      if (!field) return;
      field.focus();
      if (typeof field.setSelectionRange === 'function') {
        const position = String(value).length;
        field.setSelectionRange(position, position);
      }
    });
  };
  const focusVariantRowLabel = (draftKey, rowKey, value = '') => {
    window.requestAnimationFrame(() => {
      const cardRow = Array.from(refs.productCardList?.querySelectorAll('[data-pl-product-card-row]') || [])
        .find((candidate) => candidate.dataset.plProductCardDraftKey === draftKey);
      const variantRow = Array.from(cardRow?.querySelectorAll('[data-pl-variant-row]') || [])
        .find((candidate) => candidate.dataset.plVariantRowKey === rowKey);
      const field = variantRow?.querySelector('[data-pl-variant-row-label]');
      if (!field) return;
      field.focus();
      if (typeof field.setSelectionRange === 'function') {
        const position = String(value).length;
        field.setSelectionRange(position, position);
      }
    });
  };
  const focusMetricPanelLabel = (draftKey, metricKey, value = '') => {
    window.requestAnimationFrame(() => {
      const cardRow = Array.from(refs.productCardList?.querySelectorAll('[data-pl-product-card-row]') || [])
        .find((candidate) => candidate.dataset.plProductCardDraftKey === draftKey);
      const metricRow = Array.from(cardRow?.querySelectorAll('[data-pl-metric-panel-row]') || [])
        .find((candidate) => candidate.dataset.plMetricPanelKey === metricKey);
      const field = metricRow?.querySelector('[data-pl-metric-panel-label]');
      if (!field) return;
      field.focus();
      if (typeof field.setSelectionRange === 'function') {
        const position = String(value).length;
        field.setSelectionRange(position, position);
      }
    });
  };
  const moveProductCardDraft = (fromIndex, toIndex) => {
    const draft = Array.isArray(state.draftProductCards) ? [...state.draftProductCards] : [];
    if (fromIndex < 0 || fromIndex >= draft.length || toIndex < 0 || toIndex >= draft.length || fromIndex === toIndex) return;
    const [card] = draft.splice(fromIndex, 1);
    draft.splice(toIndex, 0, card);
    state.draftProductCards = draft;
    renderProductCardSettings();
  };
  const deleteProductCardDraft = (index) => {
    const draft = Array.isArray(state.draftProductCards) ? [...state.draftProductCards] : [];
    const card = draft[index];
    if (!card) return;
    const signature = productCardSignature(card);
    const defaultCard = defaultProductCards().find((candidate) => productCardSignature(candidate) === signature);
    const remainingHasSignature = draft.some((candidate, candidateIndex) => candidateIndex !== index && productCardSignature(candidate) === signature);
    const deletion = {
      id: number(card.id),
      card_key: card.card_key || '',
      signature
    };
    if (defaultCard && !remainingHasSignature) {
      deletion.hidden_card = {
        ...cloneProductCard(defaultCard),
        id: 0,
        sort_order: number(card.sort_order || defaultCard.sort_order),
        is_visible: false,
        touched: true
      };
    }
    if (deletion.id > 0 || (deletion.card_key && !remainingHasSignature)) state.deletedProductCards.push(deletion);
    draft.splice(index, 1);
    state.draftProductCards = draft.length ? draft : [newProductCardDraft()];
    renderProductCardSettings();
  };
  const moveProductCardVariantDraft = (cardIndex, fromKey, toKey) => {
    const card = state.draftProductCards?.[cardIndex];
    if (!card || !fromKey || !toKey || fromKey === toKey) return;
    const orderedKeys = variantDefinitionsForCard(card, true).map((variant) => variant.key);
    const fromIndex = orderedKeys.indexOf(fromKey);
    const toIndex = orderedKeys.indexOf(toKey);
    if (fromIndex < 0 || toIndex < 0) return;
    const [key] = orderedKeys.splice(fromIndex, 1);
    orderedKeys.splice(toIndex, 0, key);
    card.layout = normalizeProductCardLayout({
      ...card.layout,
      row_order: orderedKeys
    });
    renderProductCardSettings({ preserveScroll: true });
  };
  const moveProductCardMetricDraft = (cardIndex, fromKey, toKey) => {
    const card = state.draftProductCards?.[cardIndex];
    if (!card || !fromKey || !toKey || fromKey === toKey) return;
    const orderedKeys = productMetricsForCard(card, true).map((metric) => metric.key);
    const fromIndex = orderedKeys.indexOf(fromKey);
    const toIndex = orderedKeys.indexOf(toKey);
    if (fromIndex < 0 || toIndex < 0) return;
    const [key] = orderedKeys.splice(fromIndex, 1);
    orderedKeys.splice(toIndex, 0, key);
    card.layout = normalizeProductCardLayout({
      ...card.layout,
      metric_order: orderedKeys
    });
    renderProductCardSettings({ preserveScroll: true });
  };

  refs.productCardList?.addEventListener('input', (event) => {
    if (!event.target.matches('[data-pl-sku-filter-search], [data-pl-variant-row-label], [data-pl-metric-panel-label]')) return;
    const row = event.target.closest('[data-pl-product-card-row]');
    const draftKey = row?.dataset.plProductCardDraftKey || '';
    const value = event.target.value || '';
    const variantRow = event.target.closest('[data-pl-variant-row]');
    const variantKey = variantRow?.dataset.plVariantRowKey || '';
    const metricRow = event.target.closest('[data-pl-metric-panel-row]');
    const metricKey = metricRow?.dataset.plMetricPanelKey || '';
    if (event.target.matches('[data-pl-variant-row-label], [data-pl-metric-panel-label]')) markProductCardTouched(row);
    syncProductCardDrafts();
    renderProductCardSettings({ preserveScroll: true });
    if (event.target.matches('[data-pl-variant-row-label]')) {
      focusVariantRowLabel(draftKey, variantKey, value);
    } else if (event.target.matches('[data-pl-metric-panel-label]')) {
      focusMetricPanelLabel(draftKey, metricKey, value);
    } else {
      focusProductCardField(draftKey, '[data-pl-sku-filter-search]', value);
    }
  });

  refs.productCardList?.addEventListener('change', (event) => {
    const target = event.target;
    if (!target.matches([
      '[data-pl-product-card-label]',
      '[data-pl-product-card-mode]',
      '[data-pl-product-card-match]',
      '[data-pl-product-card-flavor]',
      '[data-pl-product-card-variant]',
      '[data-pl-product-card-visible]',
      '[data-pl-product-card-sku-check]',
      '[data-pl-sku-filter-brand]',
      '[data-pl-sku-filter-product]',
      '[data-pl-variant-row-visible]',
      '[data-pl-metric-panel-visible]'
    ].join(','))) return;
    if (target.matches('[data-pl-sku-filter-brand]')) {
      const row = target.closest('[data-pl-product-card-row]');
      const productFilter = row?.querySelector('[data-pl-sku-filter-product]');
      if (productFilter) productFilter.value = '';
    }
    if (!target.matches('[data-pl-sku-filter-brand], [data-pl-sku-filter-product]')) {
      markProductCardTouched(target.closest('[data-pl-product-card-row]'));
    }
    syncProductCardDrafts();
    renderProductCardSettings({ preserveScroll: true });
  });

  refs.productCardList?.addEventListener('click', (event) => {
    const row = event.target.closest('[data-pl-product-card-row]');
    if (!row) return;
    if (event.target.closest('[data-pl-sku-select-visible]')) {
      markProductCardTouched(row);
      row.querySelectorAll('[data-pl-product-card-sku-check]').forEach((input) => { input.checked = true; });
      syncProductCardDrafts();
      renderProductCardSettings({ preserveScroll: true });
      return;
    }
    if (event.target.closest('[data-pl-sku-clear-visible]')) {
      markProductCardTouched(row);
      row.querySelectorAll('[data-pl-product-card-sku-check]').forEach((input) => { input.checked = false; });
      syncProductCardDrafts();
      renderProductCardSettings({ preserveScroll: true });
      return;
    }
    if (event.target.closest('[data-pl-sku-clear-all]')) {
      markProductCardTouched(row);
      syncProductCardDrafts();
      const index = number(row.dataset.plProductCardIndex);
      if (state.draftProductCards?.[index]) state.draftProductCards[index].sku_codes = [];
      renderProductCardSettings({ preserveScroll: true });
      return;
    }
    const removeSku = event.target.closest('[data-pl-remove-product-card-sku]');
    if (removeSku) {
      markProductCardTouched(row);
      syncProductCardDrafts();
      const index = number(row.dataset.plProductCardIndex);
      const sku = String(removeSku.dataset.plRemoveProductCardSku || '').toUpperCase();
      if (state.draftProductCards?.[index]) {
        state.draftProductCards[index].sku_codes = state.draftProductCards[index].sku_codes.filter((code) => code !== sku);
      }
      renderProductCardSettings({ preserveScroll: true });
      return;
    }
    const moveButton = event.target.closest('[data-pl-product-card-move]');
    if (moveButton) {
      markProductCardTouched(row);
      syncProductCardDrafts();
      const index = number(row.dataset.plProductCardIndex);
      moveProductCardDraft(index, index + number(moveButton.dataset.plProductCardMove));
      return;
    }
    if (event.target.closest('[data-pl-product-card-delete]')) {
      syncProductCardDrafts();
      const index = number(row.dataset.plProductCardIndex);
      if (window.confirm('Delete this product card when you save?')) {
        deleteProductCardDraft(index);
      }
      return;
    }
    const variantMoveButton = event.target.closest('[data-pl-variant-row-move]');
    if (variantMoveButton) {
      markProductCardTouched(row);
      syncProductCardDrafts();
      const index = number(row.dataset.plProductCardIndex);
      const variantRow = variantMoveButton.closest('[data-pl-variant-row]');
      const variants = variantDefinitionsForCard(state.draftProductCards?.[index], true);
      const fromKey = variantRow?.dataset.plVariantRowKey || '';
      const fromIndex = variants.findIndex((variant) => variant.key === fromKey);
      const toVariant = variants[fromIndex + number(variantMoveButton.dataset.plVariantRowMove)];
      if (toVariant) moveProductCardVariantDraft(index, fromKey, toVariant.key);
      return;
    }
    const metricMoveButton = event.target.closest('[data-pl-metric-panel-move]');
    if (metricMoveButton) {
      markProductCardTouched(row);
      syncProductCardDrafts();
      const index = number(row.dataset.plProductCardIndex);
      const metricRow = metricMoveButton.closest('[data-pl-metric-panel-row]');
      const metrics = productMetricsForCard(state.draftProductCards?.[index], true);
      const fromKey = metricRow?.dataset.plMetricPanelKey || '';
      const fromIndex = metrics.findIndex((metric) => metric.key === fromKey);
      const toMetric = metrics[fromIndex + number(metricMoveButton.dataset.plMetricPanelMove)];
      if (toMetric) moveProductCardMetricDraft(index, fromKey, toMetric.key);
      return;
    }
    const variantResetButton = event.target.closest('[data-pl-variant-row-reset-label]');
    if (variantResetButton) {
      markProductCardTouched(row);
      const labelInput = variantResetButton.closest('[data-pl-variant-row]')?.querySelector('[data-pl-variant-row-label]');
      if (labelInput) labelInput.value = labelInput.dataset.plVariantOriginalLabel || labelInput.value;
      syncProductCardDrafts();
      renderProductCardSettings({ preserveScroll: true });
      return;
    }
    const metricResetButton = event.target.closest('[data-pl-metric-panel-reset-label]');
    if (metricResetButton) {
      markProductCardTouched(row);
      const labelInput = metricResetButton.closest('[data-pl-metric-panel-row]')?.querySelector('[data-pl-metric-panel-label]');
      if (labelInput) labelInput.value = labelInput.dataset.plMetricPanelOriginalLabel || labelInput.value;
      syncProductCardDrafts();
      renderProductCardSettings({ preserveScroll: true });
      return;
    }
    if (event.target.closest('[data-pl-product-card-hide]')) {
      markProductCardTouched(row);
      syncProductCardDrafts();
      const index = number(row.dataset.plProductCardIndex);
      if (state.draftProductCards?.[index]) {
        state.draftProductCards[index].is_visible = state.draftProductCards[index].is_visible === false;
      }
      renderProductCardSettings({ preserveScroll: true });
    }
  });

  let productCardDragIndex = null;
  let productVariantDrag = null;
  let productMetricDrag = null;
  refs.productCardList?.addEventListener('dragstart', (event) => {
    const metricHandle = event.target.closest('[data-pl-metric-panel-drag]');
    if (metricHandle) {
      const row = metricHandle.closest('[data-pl-product-card-row]');
      const metricRow = metricHandle.closest('[data-pl-metric-panel-row]');
      markProductCardTouched(row);
      syncProductCardDrafts();
      productMetricDrag = {
        cardIndex: number(row?.dataset.plProductCardIndex),
        metricKey: metricRow?.dataset.plMetricPanelKey || ''
      };
      productVariantDrag = null;
      productCardDragIndex = null;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', productMetricDrag.metricKey);
      metricRow?.classList.add('is-row-dragging');
      return;
    }
    const variantHandle = event.target.closest('[data-pl-variant-row-drag]');
    if (variantHandle) {
      const row = variantHandle.closest('[data-pl-product-card-row]');
      const variantRow = variantHandle.closest('[data-pl-variant-row]');
      markProductCardTouched(row);
      syncProductCardDrafts();
      productVariantDrag = {
        cardIndex: number(row?.dataset.plProductCardIndex),
        rowKey: variantRow?.dataset.plVariantRowKey || ''
      };
      productCardDragIndex = null;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', productVariantDrag.rowKey);
      variantRow?.classList.add('is-row-dragging');
      return;
    }
    const handle = event.target.closest('[data-pl-product-card-drag]');
    if (!handle) return;
    const row = handle.closest('[data-pl-product-card-row]');
    markProductCardTouched(row);
    syncProductCardDrafts();
    productCardDragIndex = number(row?.dataset.plProductCardIndex);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(productCardDragIndex));
    row?.classList.add('is-dragging');
  });
  refs.productCardList?.addEventListener('dragover', (event) => {
    if (productMetricDrag && event.target.closest('[data-pl-metric-panel-row]')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      return;
    }
    if (productVariantDrag && event.target.closest('[data-pl-variant-row]')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      return;
    }
    if (productCardDragIndex === null || !event.target.closest('[data-pl-product-card-row]')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });
  refs.productCardList?.addEventListener('drop', (event) => {
    if (productMetricDrag) {
      const targetMetricRow = event.target.closest('[data-pl-metric-panel-row]');
      const targetCardRow = event.target.closest('[data-pl-product-card-row]');
      if (!targetMetricRow || !targetCardRow || number(targetCardRow.dataset.plProductCardIndex) !== productMetricDrag.cardIndex) return;
      event.preventDefault();
      moveProductCardMetricDraft(productMetricDrag.cardIndex, productMetricDrag.metricKey, targetMetricRow.dataset.plMetricPanelKey || '');
      productMetricDrag = null;
      return;
    }
    if (productVariantDrag) {
      const targetVariantRow = event.target.closest('[data-pl-variant-row]');
      const targetCardRow = event.target.closest('[data-pl-product-card-row]');
      if (!targetVariantRow || !targetCardRow || number(targetCardRow.dataset.plProductCardIndex) !== productVariantDrag.cardIndex) return;
      event.preventDefault();
      moveProductCardVariantDraft(productVariantDrag.cardIndex, productVariantDrag.rowKey, targetVariantRow.dataset.plVariantRowKey || '');
      productVariantDrag = null;
      return;
    }
    const row = event.target.closest('[data-pl-product-card-row]');
    if (productCardDragIndex === null || !row) return;
    event.preventDefault();
    moveProductCardDraft(productCardDragIndex, number(row.dataset.plProductCardIndex));
    productCardDragIndex = null;
  });
  refs.productCardList?.addEventListener('dragend', () => {
    refs.productCardList.querySelectorAll('.is-dragging').forEach((row) => row.classList.remove('is-dragging'));
    refs.productCardList.querySelectorAll('.is-row-dragging').forEach((row) => row.classList.remove('is-row-dragging'));
    productCardDragIndex = null;
    productVariantDrag = null;
    productMetricDrag = null;
  });

  refs.addProductCardDraft?.addEventListener('click', () => {
    syncProductCardDrafts();
    state.draftProductCards.push(newProductCardDraft());
    renderProductCardSettings();
    refs.productCardList.lastElementChild?.scrollIntoView({ block: 'center' });
  });

  refs.productCardForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.productCardError.hidden = true;
    try {
      syncProductCardDrafts();
      const deletedHiddenCards = state.deletedProductCards
        .map((card) => card.hidden_card)
        .filter(Boolean);
      const savedCards = Array.isArray(state.draftProductCards) ? state.draftProductCards : collectProductCardSettings();
      const savedSignatures = new Set(savedCards.map(productCardSignature));
      const keepGeneratedForOrder = savedCards.length > 1;
      const deletedCards = state.deletedProductCards.filter((card) => (
        number(card.id) > 0 || !savedSignatures.has(card.signature || '')
      )).map((card) => ({
        id: number(card.id),
        card_key: card.card_key || ''
      }));
      const response = await postAction({
        action: 'save_product_cards',
        cards: [
          ...savedCards,
          ...deletedHiddenCards.filter((card) => !savedSignatures.has(productCardSignature(card)))
        ].filter((card) => keepGeneratedForOrder || !isPristineGeneratedProductCard(card)),
        deleted_cards: deletedCards
      });
      state.stored.product_cards = response.product_cards;
      state.draftProductCards = null;
      state.deletedProductCards = [];
      closeModal(refs.productCardModal);
      render();
      showToast('Product cards saved.');
    } catch (error) {
      refs.productCardError.textContent = error.message;
      refs.productCardError.hidden = false;
    }
  });

  refs.addSyrupGroup.addEventListener('click', () => {
    state.draftSyrupGroups = collectSyrupSettings();
    state.draftSyrupGroups.push({
      id: 0,
      label: 'New volume',
      volume_ml: '',
      assignment_mode: 'manual',
      sku_codes: [],
      is_visible: true
    });
    renderSyrupSettings();
  });

  refs.syrupSettingsList.addEventListener('change', (event) => {
    if (!event.target.matches('[data-pl-syrup-mode], [data-pl-syrup-volume]')) return;
    state.draftSyrupGroups = collectSyrupSettings();
    renderSyrupSettings();
  });

  refs.syrupSettingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.syrupSettingsError.hidden = true;
    try {
      const response = await postAction({ action: 'save_syrup_groups', groups: collectSyrupSettings() });
      state.stored.syrup_groups = response.syrup_groups;
      state.draftSyrupGroups = null;
      closeModal(refs.syrupSettingsModal);
      render();
      showToast('Syrup settings saved.');
    } catch (error) {
      refs.syrupSettingsError.textContent = error.message;
      refs.syrupSettingsError.hidden = false;
    }
  });

  refs.addMetric.addEventListener('click', () => {
    state.draftMetrics = collectMetricSettings();
    state.draftMetrics.push({
      id: 0,
      label: 'New metric',
      value_key: 'revenue',
      display_format: 'money',
      is_visible: true
    });
    renderMetricSettings();
  });

  refs.metricsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.metricsError.hidden = true;
    try {
      const response = await postAction({ action: 'save_statement_metrics', metrics: collectMetricSettings() });
      state.stored.statement_metrics = response.statement_metrics;
      state.draftMetrics = null;
      closeModal(refs.metricsModal);
      renderMonthly();
      showToast('Monthly metrics saved.');
    } catch (error) {
      refs.metricsError.textContent = error.message;
      refs.metricsError.hidden = false;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    hideHelpPopover();
    closeModal(refs.skuModal);
    closeModal(refs.entryModal);
    closeModal(refs.allocationModal);
    closeModal(refs.productCardModal);
    closeModal(refs.syrupSettingsModal);
    closeModal(refs.metricsModal);
  });

  initializeControls();
  hydrateHelpTargets();
  load();
}
