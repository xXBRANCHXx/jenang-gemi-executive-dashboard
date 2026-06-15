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
    for (const row of state.stored?.sku_catalog || []) map.set(String(row.sku || '').toUpperCase(), row);
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
  const autoSyrupSkusForGroup = (group) => catalogRows()
    .filter((row) => volumeMatchesGroup(row, group) && isSyrupCatalogRow(row))
    .map((row) => String(row.sku || '').toUpperCase())
    .filter(Boolean);
  const groupMatchesProduct = (group, product) => {
    const sku = String(product.sku || '').toUpperCase();
    if (group.assignment_mode === 'manual') return sku && group.sku_codes.includes(sku);
    return volumeMatchesGroup(product, group) && isSyrupCatalogRow(product);
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
    renderSyrupVolumes();
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

  const cloneGroup = (group) => ({
    ...group,
    sku_codes: Array.isArray(group.sku_codes) ? [...group.sku_codes] : []
  });
  const cloneMetric = (metric) => ({ ...metric });
  const catalogOptionLabel = (row) => [
    row.sku,
    row.product_name || row.base_product_name,
    row.flavor_name,
    row.volume ? `${integer(row.volume)} ml` : '',
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
            <label><span>Name</span><input data-pl-syrup-label maxlength="80" value="${escapeHtml(group.label || '')}" required></label>
            <label><span>Volume ml</span><input data-pl-syrup-volume inputmode="decimal" value="${group.volume_ml ? escapeHtml(group.volume_ml) : ''}" placeholder="50"></label>
            <label><span>Assignment</span><select data-pl-syrup-mode><option value="auto"${group.assignment_mode !== 'manual' ? ' selected' : ''}>Auto</option><option value="manual"${group.assignment_mode === 'manual' ? ' selected' : ''}>Manual</option></select></label>
            <label class="is-wide"><span>SKUs</span><select data-pl-syrup-skus multiple size="7" ${group.assignment_mode === 'manual' ? '' : 'disabled'}>${renderSkuOptions(selectedCodes)}</select></label>
          </div>
        </section>`;
    }).join('');
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
  refs.entrySections.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-entry]');
    if (!button) return;
    const entry = (state.stored?.entries || []).find((row) => number(row.id) === number(button.dataset.plEditEntry));
    if (entry) openEntryModal(entry);
  });
  root.querySelector('[data-pl-add-entry]').addEventListener('click', () => openEntryModal());
  root.querySelector('[data-pl-edit-syrup-settings]').addEventListener('click', openSyrupSettings);
  root.querySelector('[data-pl-edit-metrics]').addEventListener('click', openMetricsSettings);

  root.querySelectorAll('[data-pl-close-sku]').forEach((element) => element.addEventListener('click', () => closeModal(refs.skuModal)));
  root.querySelectorAll('[data-pl-close-entry]').forEach((element) => element.addEventListener('click', () => closeModal(refs.entryModal)));
  root.querySelectorAll('[data-pl-close-allocation]').forEach((element) => element.addEventListener('click', () => closeModal(refs.allocationModal)));
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
      state.stored = state.stored || {};
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
    closeModal(refs.syrupSettingsModal);
    closeModal(refs.metricsModal);
  });

  initializeControls();
  load();
}
