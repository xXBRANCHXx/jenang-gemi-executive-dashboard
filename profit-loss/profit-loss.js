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
    month: 0,
    sales: null,
    stored: null,
    products: [],
    monthly: [],
    search: '',
    loading: false,
    draftProductCards: null,
    draftMetrics: null
  };

  const refs = {
    year: root.querySelector('[data-pl-year]'),
    periodLabel: root.querySelector('[data-pl-period-label]'),
    syncLabel: root.querySelector('[data-pl-sync-label]'),
    refresh: root.querySelector('[data-pl-refresh]'),
    search: root.querySelector('[data-pl-search]'),
    ledger: root.querySelector('[data-pl-ledger]'),
    productCards: root.querySelector('[data-pl-product-cards]'),
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

  const initializeControls = () => {
    const startYear = 2024;
    const endYear = Math.max(currentYear + 2, startYear);
    refs.year.innerHTML = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
      .map((year) => `<option value="${year}"${year === state.year ? ' selected' : ''}>${year}</option>`).join('');
    const monthOptions = fullMonthNames.map((name, index) => `<option value="${index + 1}">${name}</option>`).join('');
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
    for (const row of state.stored?.sku_catalog || []) map.set(String(row.sku || '').toUpperCase(), row);
    return map;
  };

  const catalogRows = () => Array.isArray(state.stored?.sku_catalog) ? state.stored.sku_catalog : [];
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
      is_visible: card.is_visible !== false,
      sort_order: number(card.sort_order || index),
      generated: Boolean(card.generated)
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
    let productCardIndex = 0;
    catalogProductFamilies()
      .filter((family) => family.rows.some((row) => !isSyrupCatalogRow(row)))
      .forEach((family, index) => {
        if (familySplitsByFlavor(family)) {
          const flavors = new Map();
          for (const row of family.rows) {
            const flavorKey = productFlavorKey(row);
            const flavor = flavors.get(flavorKey) || { key: flavorKey, label: productFlavorLabel(row), rows: [] };
            flavor.rows.push(row);
            flavors.set(flavorKey, flavor);
          }
          Array.from(flavors.values())
            .sort((left, right) => left.label.localeCompare(right.label))
            .forEach((flavor) => {
              cards.push(normalizeProductCard({
                card_key: `auto_product_flavor_${family.key}_${flavor.key}`,
                label: `${family.label} ${flavor.label}`,
                match_mode: 'auto_product_flavor',
                match_value: flavorMatchValue(family.key, flavor.key),
                variant_mode: 'volume',
                generated: true,
                sort_order: 20 + (productCardIndex * 10)
              }, productCardIndex));
              productCardIndex += 1;
            });
          return;
        }
        cards.push(normalizeProductCard({
          card_key: `auto_product_${family.key}`,
          label: family.label,
          match_mode: 'auto_product',
          match_value: family.key,
          variant_mode: autoVariantModeForRows(family.rows),
          generated: true,
          sort_order: 20 + (productCardIndex * 10)
        }, productCardIndex));
        productCardIndex += 1;
      });
    if (Array.isArray(state.stored?.legacy?.products) && state.stored.legacy.products.length) {
      cards.push(normalizeProductCard({
        card_key: 'legacy_spreadsheet_total',
        label: 'Old spreadsheet total',
        match_mode: 'legacy',
        variant_mode: 'sku',
        generated: true,
        sort_order: 9000
      }));
    }
    return cards;
  };
  const productCardSignature = (card) => {
    if (card.match_mode === 'auto_product') return `auto_product|${card.match_value}`;
    if (card.match_mode === 'auto_product_flavor') return `auto_product_flavor|${card.match_value}`;
    if (card.match_mode === 'manual') return `manual|${card.card_key}`;
    return card.match_mode;
  };
  const productCards = (includeHidden = false) => {
    const stored = Array.isArray(state.stored?.product_cards) ? state.stored.product_cards.map(normalizeProductCard) : [];
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
      .filter((card) => !(card.match_mode === 'auto_product' && familySplitsByFlavorKey(card.match_value)))
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
  const cardMatchesProduct = (card, product) => {
    if (card.match_mode === 'legacy') return Boolean(product.legacy);
    if (product.legacy) return false;
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
    if (product.legacy) return 'legacy';
    if (mode === 'volume') return `volume:${number(product.volume) ? plainVolume(product.volume) : 'unknown'}`;
    if (mode === 'flavor') return `flavor:${normalizeKey(product.flavor_name || product.flavor || 'Unflavored')}`;
    return `sku:${String(product.sku || product.key || product.label).toUpperCase()}`;
  };
  const variantLabelForProduct = (product, mode) => {
    if (product.legacy) return 'All products';
    if (mode === 'volume') return volumeUnitLabel(product) || 'Unknown volume';
    if (mode === 'flavor') return cleanText(product.flavor_name || product.flavor, 'Unflavored');
    return catalogVariantLabel(product);
  };
  const variantDefinitionsForCard = (card) => {
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
      return Array.from(volumes)
        .sort((left, right) => {
          const leftFixed = fixedVolumes.indexOf(left);
          const rightFixed = fixedVolumes.indexOf(right);
          if (leftFixed !== -1 || rightFixed !== -1) return (leftFixed === -1 ? 99 : leftFixed) - (rightFixed === -1 ? 99 : rightFixed);
          return right - left;
        })
        .map((volume, index) => ({ key: `volume:${plainVolume(volume)}`, label: `${plainVolume(volume)} ml`, sort: index }));
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
    return Array.from(definitions.values()).sort((left, right) => left.sort === right.sort ? left.label.localeCompare(right.label) : left.sort - right.sort);
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
    const cells = new Map();
    for (let month = 1; month <= 12; month += 1) {
      const products = calculateProducts(month).filter((product) => cardMatchesProduct(card, product));
      for (const product of products) {
        const key = variantKeyForProduct(product, mode);
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

  const rowsForPeriod = (month) => {
    const rows = Array.isArray(state.sales?.products?.by_month) ? state.sales.products.by_month : [];
    return rows.filter((row) => month === 0 || number(row.month) === month);
  };

  const legacyMonth = (month) => state.stored?.legacy?.months?.[String(month)] || null;
  const isLegacyMonth = (month) => Boolean(month && legacyMonth(month));
  const hasLegacyYear = () => Boolean(Object.keys(state.stored?.legacy?.months || {}).length);

  const legacyProductsForMonth = (month) => {
    const products = Array.isArray(state.stored?.legacy?.products) ? state.stored.legacy.products : [];
    return products.map((product) => {
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
  };

  const catalogCogsForMonth = (catalogRow, month) => {
    const history = Array.isArray(catalogRow?.cogs_history) ? catalogRow.cogs_history : [];
    if (!history.length || !month) return number(catalogRow?.cogs);
    const monthEnd = new Date(Date.UTC(state.year, month, 1));
    let effective = null;
    for (const change of history) {
      const recordedAt = new Date(String(change.recorded_at || '').replace(' ', 'T') + 'Z');
      if (!Number.isNaN(recordedAt.getTime()) && recordedAt < monthEnd) effective = number(change.new_price);
    }
    if (effective !== null) return effective;
    const firstOldPrice = history[0]?.old_price;
    return firstOldPrice !== null && firstOldPrice !== '' && firstOldPrice !== undefined
      ? number(firstOldPrice)
      : number(history[0]?.new_price || catalogRow?.cogs);
  };

  const calculateProducts = (month) => {
    if (month === 0) {
      const aggregates = new Map();
      for (let index = 1; index <= 12; index += 1) {
        for (const row of calculateProducts(index)) {
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
    if (isLegacyMonth(month)) return legacyProductsForMonth(month);
    const catalog = catalogMap();
    const inputs = skuInputMap();
    const aggregates = new Map();
    for (const row of rowsForPeriod(month)) {
      const sku = String(row.sku || '').trim().toUpperCase();
      const key = sku || `UNMAPPED:${String(row.label || row.product_type || 'Unknown').trim()}`;
      const item = aggregates.get(key) || {
        key,
        sku,
        label: String(row.label || row.product_type || sku || 'Unmapped product'),
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
      const quantity = number(row.quantity);
      const rowMonth = number(row.month);
      const catalogRow = catalog.get(sku);
      const input = inputs.get(`${sku}|${rowMonth}`) || {};
      const catalogCogs = catalogCogsForMonth(catalogRow, rowMonth);
      const baseCogs = input.cogs_override !== null && input.cogs_override !== '' && input.cogs_override !== undefined
        ? number(input.cogs_override)
        : catalogCogs;
      const unitCost = baseCogs + number(input.packaging_per_unit) + number(input.labor_per_unit) + number(input.other_per_unit);
      item.units += quantity;
      item.netRevenue += number(row.net_revenue);
      item.grossRevenue += number(row.gross_revenue);
      item.orders += number(row.orders);
      item.cogs += quantity * unitCost;
      item.directUnitCost = safeDivide(item.cogs, item.units);
      item.hasCatalog ||= Boolean(catalogRow);
      item.hasCogs ||= baseCogs > 0;
      item.brand = String(catalogRow?.brand_name || item.brand || row.product_type || 'Uncategorized');
      item.label = String(catalogRow?.product_name || row.label || item.label);
      item.tag = String(catalogRow?.tag || '');
      item.flavor = String(catalogRow?.flavor_name || row.flavor || '');
      item.unit_name = String(catalogRow?.unit_name || row.unit_name || '');
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
        units: 0, netRevenue: 0, grossRevenue: 0, cogs: 0, marketplaceFees: 0,
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
    const cards = productCards();
    if (!cards.length) {
      refs.productCards.innerHTML = '<p class="pl-empty">No product cards yet. Use + Add card to build one from SKU DB.</p>';
      return;
    }
    refs.productCards.innerHTML = cards.map((card) => {
      const matrix = productCardMatrix(card);
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
          ${matrix.variants.length ? `<div class="pl-product-metric-grid">${productCardMetrics.map((metric) => renderProductMetricCard(metric, matrix)).join('')}</div>` : '<p class="pl-empty">This card has no matching SKU DB products yet.</p>'}
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
    refs.periodLabel.textContent = `${state.year} full-year view`;
    renderLedger();
    renderProductCards();
    renderKpis();
    renderEntries();
    renderAllocation();
    renderQuality();
    renderMonthly();
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

  const cloneMetric = (metric) => ({ ...metric });
  const catalogOptionLabel = (row) => [
    row.sku,
    row.product_name || row.base_product_name,
    row.flavor_name,
    volumeUnitLabel(row),
    row.tag
  ].filter(Boolean).join(' · ');
  const renderSkuOptions = (selectedCodes) => {
    const selected = new Set(selectedCodes.map((sku) => String(sku).toUpperCase()));
    return catalogRows()
      .slice()
      .sort((left, right) => catalogOptionLabel(left).localeCompare(catalogOptionLabel(right)))
      .map((row) => {
        const sku = String(row.sku || '').toUpperCase();
        return `<option value="${escapeHtml(sku)}"${selected.has(sku) ? ' selected' : ''}>${escapeHtml(catalogOptionLabel(row))}</option>`;
      }).join('');
  };
  const renderSelectedSkuOptions = (selectedCodes) => {
    const selected = new Set(selectedCodes.map((sku) => String(sku).toUpperCase()));
    const rows = catalogRows().filter((row) => selected.has(String(row.sku || '').toUpperCase()));
    const known = new Set(rows.map((row) => String(row.sku || '').toUpperCase()));
    const unknown = Array.from(selected).filter((sku) => !known.has(sku)).map((sku) => ({ sku, label: sku }));
    return [
      ...rows.map((row) => {
        const sku = String(row.sku || '').toUpperCase();
        return `<option value="${escapeHtml(sku)}" selected>${escapeHtml(catalogOptionLabel(row))}</option>`;
      }),
      ...unknown.map((row) => `<option value="${escapeHtml(row.sku)}" selected>${escapeHtml(row.label)}</option>`)
    ].join('');
  };
  const cloneProductCard = (card) => ({
    ...card,
    sku_codes: Array.isArray(card.sku_codes) ? [...card.sku_codes] : []
  });
  const cardIdentityMatches = (left, right) => {
    if (!left || !right) return false;
    if (number(left.id) > 0 && number(right.id) > 0) return number(left.id) === number(right.id);
    if (left.card_key && right.card_key && left.card_key === right.card_key) return true;
    return productCardSignature(left) === productCardSignature(right);
  };
  const mergeProductCardDrafts = (draftCards, options = {}) => {
    const baseline = productCards(true).map(cloneProductCard);
    const merged = [...baseline];
    for (const draft of draftCards.map(cloneProductCard)) {
      const index = merged.findIndex((card) => cardIdentityMatches(card, draft));
      if (index >= 0) {
        merged[index] = {
          ...draft,
          id: number(draft.id) || number(merged[index].id),
          sort_order: number(merged[index].sort_order)
        };
      } else {
        merged.push({ ...draft, sort_order: merged.length * 10 + 10 });
      }
    }
    if (options.deleteCard) {
      const deleteCard = cloneProductCard(options.deleteCard);
      const index = merged.findIndex((card) => cardIdentityMatches(card, deleteCard));
      const hiddenCard = { ...deleteCard, is_visible: false };
      if (index >= 0) {
        merged[index] = {
          ...hiddenCard,
          id: number(hiddenCard.id) || number(merged[index].id),
          sort_order: number(merged[index].sort_order)
        };
      } else {
        merged.push({ ...hiddenCard, sort_order: merged.length * 10 + 10 });
      }
    }
    return merged;
  };
  const productFamilyOptions = (selectedKey) => {
    const families = catalogProductFamilies().filter((family) => family.rows.some((row) => !isSyrupCatalogRow(row)) && !familySplitsByFlavor(family));
    const hasSelected = families.some((family) => family.key === selectedKey);
    const options = families.map((family) => (
      `<option value="${escapeHtml(family.key)}"${family.key === selectedKey ? ' selected' : ''}>${escapeHtml(family.label)} (${family.rows.length} SKU${family.rows.length === 1 ? '' : 's'})</option>`
    ));
    if (selectedKey && !hasSelected) options.unshift(`<option value="${escapeHtml(selectedKey)}" selected>${escapeHtml(selectedKey)}</option>`);
    return `<option value="">Choose SKU DB product</option>${options.join('')}`;
  };
  const matchModeOptions = (selectedMode) => [
    ['auto_syrup', 'Syrup volumes'],
    ['auto_product', 'SKU DB product'],
    ['auto_product_flavor', 'SKU DB product flavor'],
    ['manual', 'Selected SKUs'],
    ['legacy', 'Old sheet total']
  ].map(([value, label]) => `<option value="${value}"${value === selectedMode ? ' selected' : ''}>${label}</option>`).join('');
  const variantModeOptions = (selectedMode) => [
    ['auto', 'Auto rows'],
    ['volume', 'Volume rows'],
    ['flavor', 'Flavor rows'],
    ['sku', 'SKU rows']
  ].map(([value, label]) => `<option value="${value}"${value === selectedMode ? ' selected' : ''}>${label}</option>`).join('');
  const newProductCardDraft = () => {
    const draft = productCards(true).map(cloneProductCard);
    const used = new Set(draft.map(productCardSignature));
    const family = catalogProductFamilies()
      .filter((candidate) => candidate.rows.some((row) => !isSyrupCatalogRow(row)) && !familySplitsByFlavor(candidate))
      .find((candidate) => !used.has(`auto_product|${candidate.key}`));
    if (family) {
      return normalizeProductCard({
        id: 0,
        card_key: `auto_product_${family.key}`,
        label: family.label,
        match_mode: 'auto_product',
        match_value: family.key,
        variant_mode: autoVariantModeForRows(family.rows),
        sku_codes: [],
        is_visible: true
      });
    }
    return normalizeProductCard({
      id: 0,
      card_key: `manual_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      label: 'New product card',
      match_mode: 'manual',
      match_value: '',
      variant_mode: 'sku',
      sku_codes: [],
      is_visible: true
    });
  };
  const renderProductCardSettings = () => {
    const draft = Array.isArray(state.draftProductCards) ? state.draftProductCards : productCards(true).map(cloneProductCard);
    refs.productCardList.innerHTML = draft.map((card, index) => {
      const selectedCodes = card.match_mode === 'manual'
        ? card.sku_codes
        : cardCatalogRows(card).map((row) => String(row.sku || '').toUpperCase()).filter(Boolean);
      const skuOptions = card.match_mode === 'manual'
        ? renderSkuOptions(selectedCodes)
        : renderSelectedSkuOptions(selectedCodes);
      return `
        <section class="pl-config-row" data-pl-product-card-row>
          <input type="hidden" data-pl-product-card-id value="${number(card.id)}">
          <input type="hidden" data-pl-product-card-key value="${escapeHtml(card.card_key)}">
          <input type="hidden" data-pl-product-card-match-value value="${escapeHtml(card.match_value || '')}">
          <div class="pl-config-row-head">
            <strong>${escapeHtml(card.label || `Product card ${index + 1}`)}</strong>
            <label><input type="checkbox" data-pl-product-card-visible ${card.is_visible !== false ? 'checked' : ''}> Visible</label>
          </div>
          <div class="pl-form-grid pl-settings-grid pl-product-settings-grid">
            <label><span>Name</span><input data-pl-product-card-label maxlength="120" value="${escapeHtml(card.label || '')}" required></label>
            <label><span>Card source</span><select data-pl-product-card-mode>${matchModeOptions(card.match_mode)}</select></label>
            <label><span>SKU DB product</span><select data-pl-product-card-match ${card.match_mode === 'auto_product' ? '' : 'disabled'}>${productFamilyOptions(card.match_value)}</select></label>
            <label><span>Rows on left</span><select data-pl-product-card-variant ${card.match_mode === 'legacy' ? 'disabled' : ''}>${variantModeOptions(card.variant_mode)}</select></label>
            <label class="is-wide"><span>Selected SKUs</span><select data-pl-product-card-skus multiple size="8" ${card.match_mode === 'manual' ? '' : 'disabled'}>${skuOptions}</select></label>
          </div>
        </section>`;
    }).join('');
  };
  const collectProductCardSettings = () => Array.from(refs.productCardList.querySelectorAll('[data-pl-product-card-row]')).map((row) => {
    const mode = row.querySelector('[data-pl-product-card-mode]')?.value || 'manual';
    const skuSelect = row.querySelector('[data-pl-product-card-skus]');
    const existingMatchValue = row.querySelector('[data-pl-product-card-match-value]')?.value || '';
    return normalizeProductCard({
      id: number(row.querySelector('[data-pl-product-card-id]')?.value),
      card_key: row.querySelector('[data-pl-product-card-key]')?.value || '',
      label: row.querySelector('[data-pl-product-card-label]')?.value || '',
      match_mode: mode,
      match_value: mode === 'auto_product'
        ? (row.querySelector('[data-pl-product-card-match]')?.value || '')
        : (mode === 'auto_product_flavor' ? existingMatchValue : ''),
      variant_mode: mode === 'legacy' ? 'sku' : (row.querySelector('[data-pl-product-card-variant]')?.value || 'auto'),
      sku_codes: mode === 'manual' ? Array.from(skuSelect?.selectedOptions || []).map((option) => option.value) : [],
      is_visible: row.querySelector('[data-pl-product-card-visible]')?.checked || false
    });
  });
  const openProductCardSettings = (options = {}) => {
    const cards = productCards(true).map(cloneProductCard);
    if (options.addNew) {
      state.draftProductCards = [newProductCardDraft()];
      refs.productCardTitle.textContent = 'New product card';
    } else {
      const card = cards.find((row) => row.card_key === options.cardKey) || cards[0] || newProductCardDraft();
      state.draftProductCards = [cloneProductCard(card)];
      refs.productCardTitle.textContent = `${card.label} settings`;
    }
    refs.productCardError.hidden = true;
    renderProductCardSettings();
    refs.productCardModal.hidden = false;
  };
  const hydrateProductCardDrafts = () => {
    const families = catalogProductFamilies().filter((family) => family.rows.some((row) => !isSyrupCatalogRow(row)) && !familySplitsByFlavor(family));
    state.draftProductCards = (Array.isArray(state.draftProductCards) ? state.draftProductCards : []).map((card) => {
      if (card.match_mode === 'auto_product' && !card.match_value && families.length) {
        return {
          ...card,
          label: card.label === 'New product card' ? families[0].label : card.label,
          match_value: families[0].key,
          variant_mode: card.variant_mode === 'sku' ? autoVariantModeForRows(families[0].rows) : card.variant_mode
        };
      }
      if (card.match_mode === 'auto_syrup' && card.label === 'New product card') return { ...card, label: 'Syrup', variant_mode: 'volume' };
      if (card.match_mode === 'legacy' && card.label === 'New product card') return { ...card, label: 'Old spreadsheet total', variant_mode: 'sku' };
      return card;
    });
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
          <label><span>Name</span><input data-pl-metric-label maxlength="120" value="${escapeHtml(metric.label || '')}" required></label>
          <label><span>Value</span><select data-pl-metric-value>${metricOptions(metric.value_key)}</select></label>
          <label><span>Format</span><select data-pl-metric-format>${formatOptions(metric.display_format)}</select></label>
        </div>
      </section>`).join('');
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

  refs.year.addEventListener('change', () => {
    state.year = number(refs.year.value);
    load();
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
  refs.entrySections.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-entry]');
    if (!button) return;
    const entry = (state.stored?.entries || []).find((row) => number(row.id) === number(button.dataset.plEditEntry));
    if (entry) openEntryModal(entry);
  });
  root.querySelector('[data-pl-add-entry]').addEventListener('click', () => openEntryModal());
  refs.addProductCard.addEventListener('click', () => openProductCardSettings({ addNew: true }));
  refs.productCards.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-product-card]');
    if (button) openProductCardSettings({ cardKey: button.dataset.plEditProductCard || '' });
  });
  root.querySelector('[data-pl-edit-metrics]').addEventListener('click', openMetricsSettings);

  root.querySelectorAll('[data-pl-close-sku]').forEach((element) => element.addEventListener('click', () => closeModal(refs.skuModal)));
  root.querySelectorAll('[data-pl-close-entry]').forEach((element) => element.addEventListener('click', () => closeModal(refs.entryModal)));
  root.querySelectorAll('[data-pl-close-allocation]').forEach((element) => element.addEventListener('click', () => closeModal(refs.allocationModal)));
  root.querySelectorAll('[data-pl-close-product-cards]').forEach((element) => element.addEventListener('click', () => closeModal(refs.productCardModal)));
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

  refs.productCardList.addEventListener('change', (event) => {
    if (!event.target.matches('[data-pl-product-card-mode], [data-pl-product-card-match], [data-pl-product-card-variant]')) return;
    state.draftProductCards = collectProductCardSettings();
    hydrateProductCardDrafts();
    renderProductCardSettings();
  });

  const saveProductCards = async (cards, message) => {
    const response = await postAction({ action: 'save_product_cards', cards });
    state.stored = state.stored || {};
    state.stored.product_cards = response.product_cards;
    state.draftProductCards = null;
    closeModal(refs.productCardModal);
    render();
    showToast(message);
  };

  refs.deleteProductCard.addEventListener('click', async () => {
    refs.productCardError.hidden = true;
    const draft = collectProductCardSettings()[0];
    if (!draft) return;
    if (!window.confirm(`Delete ${draft.label} card?`)) return;
    try {
      if (!productCards(true).some((card) => cardIdentityMatches(card, draft))) {
        state.draftProductCards = null;
        closeModal(refs.productCardModal);
        showToast('Product card discarded.');
        return;
      }
      await saveProductCards(mergeProductCardDrafts([], { deleteCard: draft }), 'Product card deleted.');
    } catch (error) {
      refs.productCardError.textContent = error.message;
      refs.productCardError.hidden = false;
    }
  });

  refs.productCardForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.productCardError.hidden = true;
    try {
      await saveProductCards(mergeProductCardDrafts(collectProductCardSettings()), 'Product card saved.');
    } catch (error) {
      refs.productCardError.textContent = error.message;
      refs.productCardError.hidden = false;
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
      state.stored = state.stored || {};
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
    closeModal(refs.skuModal);
    closeModal(refs.entryModal);
    closeModal(refs.allocationModal);
    closeModal(refs.productCardModal);
    closeModal(refs.metricsModal);
  });

  initializeControls();
  load();
}
