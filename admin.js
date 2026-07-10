const SOURCE_COLORS = {
  youtube: '#ff5252',
  facebook: '#ffd400',
  instagram: '#9dff00',
  tiktok: '#22d3ee',
  google: '#22d3ee',
  direct: '#9dff00',
  internal: '#ffd400',
  unknown: '#7a879a'
};

const SOURCE_LABELS = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  google: 'Google',
  direct: 'Direct',
  internal: 'Internal',
  zero_website: 'ZERO Website',
  jenang_gemi_website: 'Jenang Gemi Website',
  unknown: 'Unknown'
};

const HOME_METRIC_LABELS = {
  views: 'Views over time',
  order_now_clicks: 'Order Now clicks over time',
  checkout_clicks: 'Checkout clicks over time'
};

const HOME_METRIC_UNITS = {
  views: 'views',
  order_now_clicks: 'clicks',
  checkout_clicks: 'checkouts'
};

const OVERVIEW_METRIC_LABELS = {
  revenue: 'Revenue by month',
  gross_profit: 'Gross profit by month',
  orders: 'Orders QTY by month',
  average_order_value: 'Average order value by month',
  item_count: 'Items QTY by month'
};

const OVERVIEW_METRIC_SHORT_LABELS = {
  revenue: 'Revenue',
  gross_profit: 'Gross Profit',
  orders: 'Orders QTY',
  average_order_value: 'AOV',
  item_count: 'Items QTY',
  marketplace_fees: 'Marketplace Fees',
  cogs: 'COGS',
  quantity: 'QTY Sold'
};

const OVERVIEW_METRIC_UNITS = {
  revenue: 'idr',
  gross_profit: 'idr',
  cogs: 'idr',
  sales: 'idr',
  net_revenue: 'idr',
  marketplace_fees: 'idr',
  orders: 'orders',
  average_order_value: 'idr',
  item_count: 'items',
  quantity: 'qty'
};

const DAILY_METRIC_LABELS = {
  revenue: 'Revenue by day',
  qty: 'Quantity by day',
  orders: 'Orders by day'
};

const DAILY_METRIC_UNITS = {
  revenue: 'idr',
  qty: 'qty',
  orders: 'orders'
};

const OVERVIEW_PLATFORM_COLORS = {
  shopee: '#ff8f1f',
  tiktok: '#22d3ee',
  tokopedia: '#5bff8a',
  zero_website: '#9dff00',
  jenang_gemi_website: '#ffd400',
  unknown: '#7a879a'
};

const OVERVIEW_PRODUCT_COLORS = ['#9dff00', '#22d3ee', '#ff8f1f', '#ff4ecd', '#8b5cf6', '#f8e16c', '#67f8d4', '#ff6b6b'];
const OVERVIEW_PRODUCT_COLORS_LIGHT = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777', '#4d7c0f', '#be123c'];
const OVERVIEW_FLAVOR_COLORS_LIGHT = ['#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#f43f5e', '#eab308', '#06b6d4', '#d946ef', '#84cc16', '#6366f1', '#14b8a6', '#ec4899'];
const OVERVIEW_ACCOUNT_COLORS = ['#9dff00', '#22d3ee', '#ff8f1f', '#ff4ecd', '#8b5cf6', '#f8e16c', '#67f8d4', '#ff6b6b', '#c084fc', '#34d399', '#fb7185', '#60a5fa'];
const OVERVIEW_ACCOUNT_COLORS_LIGHT = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#be123c', '#4d7c0f', '#9333ea', '#047857', '#e11d48', '#0284c7'];
const OVERVIEW_PLATFORM_COLORS_LIGHT = {
  shopee: '#d35400',
  tiktok: '#0e7490',
  tokopedia: '#15803d',
  zero_website: '#4d7c0f',
  jenang_gemi_website: '#b45309',
  unknown: '#64748b'
};

const isLightAdminTheme = () => (document.documentElement.dataset.adminTheme || '') === 'light';

const getOverviewProductColor = (index) => {
  const colors = isLightAdminTheme() ? OVERVIEW_PRODUCT_COLORS_LIGHT : OVERVIEW_PRODUCT_COLORS;
  return colors[index % colors.length];
};

const getOverviewFlavorColor = (index) => {
  if (!isLightAdminTheme()) return getOverviewProductColor(index);
  return OVERVIEW_FLAVOR_COLORS_LIGHT[index % OVERVIEW_FLAVOR_COLORS_LIGHT.length];
};

const getOverviewAccountColor = (index) => {
  const colors = isLightAdminTheme() ? OVERVIEW_ACCOUNT_COLORS_LIGHT : OVERVIEW_ACCOUNT_COLORS;
  return colors[index % colors.length];
};

const getOverviewPlatformColor = (key, index = 0) => (
  isLightAdminTheme()
    ? (OVERVIEW_PLATFORM_COLORS_LIGHT[key] || getOverviewProductColor(index))
    : (OVERVIEW_PLATFORM_COLORS[key] || getOverviewProductColor(index))
);

const getOverviewMetricColor = (metric) => {
  if (isLightAdminTheme()) {
    if (metric === 'gross_profit') return '#16a34a';
    if (metric === 'orders') return '#2563eb';
    if (metric === 'item_count') return '#7c3aed';
    if (metric === 'average_order_value') return '#db2777';
    return '#ea580c';
  }
  if (metric === 'gross_profit') return '#9dff00';
  if (metric === 'orders') return '#22d3ee';
  if (metric === 'item_count') return '#8b5cf6';
  if (metric === 'average_order_value') return '#ff4ecd';
  return '#67f8d4';
};

const hexToRgbParts = (hex) => {
  const normalized = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '157, 255, 0';
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16)
  ].join(', ');
};

const numberFromFields = (item, fields, fallback = 0) => {
  for (const field of fields) {
    const value = Number(item?.[field]);
    if (Number.isFinite(value) && value !== 0) return value;
  }
  return fallback;
};

const normalizePlatformKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized.includes('tiktok')) return 'tiktok';
  if (normalized.includes('tokopedia')) return 'tokopedia';
  if (normalized.includes('shopee')) return 'shopee';
  if (normalized === 'zero_website' || normalized === 'zero-website') return 'zero_website';
  if (normalized === 'jenang_gemi_website' || normalized === 'jenang-gemi-website') return 'jenang_gemi_website';
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
};

const normalizePlatformMetricRow = (row, fallbackKey = 'unknown') => {
  const key = normalizePlatformKey(row?.key || row?.platform || row?.channel || row?.source || row?.name || fallbackKey);
  return {
    ...(row || {}),
    key,
    label: row?.label || row?.platform_label || row?.name || toTitleCase(key),
    quantity: numberFromFields(row, ['quantity', 'item_count', 'items', 'items_sold', 'units_sold', 'sold_quantity']),
    net_revenue: numberFromFields(row, ['net_revenue', 'sales', 'revenue', 'net_sales']),
    orders: numberFromFields(row, ['orders', 'order_count'])
  };
};

const normalizePlatformMap = (platforms) => {
  if (!platforms || typeof platforms !== 'object') return {};
  const entries = Array.isArray(platforms)
    ? platforms.map((row, index) => [row?.key || row?.platform || row?.channel || row?.source || `platform-${index}`, row])
    : Object.entries(platforms);

  return entries.reduce((normalizedPlatforms, [key, value]) => {
    if (!value || typeof value !== 'object') return normalizedPlatforms;
    const platform = normalizePlatformMetricRow(value, key);
    normalizedPlatforms[platform.key] = platform;
    return normalizedPlatforms;
  }, {});
};

const normalizeAccountKey = (value) => String(value || 'unknown')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'unknown';

const normalizeSalesAccountRow = (row, fallbackKey = 'unknown') => {
  const key = normalizeAccountKey(row?.key || row?.account || row?.account_key || row?.name || fallbackKey);
  const platform = normalizePlatformKey(row?.platform || row?.platform_key || row?.channel || '');
  return {
    ...(row || {}),
    key,
    label: row?.label || row?.account_label || row?.name || toTitleCase(key),
    platform,
    item_count: numberFromFields(row, ['item_count', 'quantity', 'items', 'items_sold', 'units_sold', 'sold_quantity']),
    orders: numberFromFields(row, ['orders', 'order_count']),
    sales: numberFromFields(row, ['sales', 'net_revenue', 'revenue', 'net_sales']),
    net_revenue: numberFromFields(row, ['net_revenue', 'sales', 'revenue', 'net_sales'])
  };
};

const normalizeAccountMap = (accounts) => {
  if (!accounts || typeof accounts !== 'object') return {};
  const entries = Array.isArray(accounts)
    ? accounts.map((row, index) => [row?.key || row?.account || row?.account_key || `account-${index}`, row])
    : Object.entries(accounts);

  return entries.reduce((normalizedAccounts, [key, value]) => {
    if (!value || typeof value !== 'object') return normalizedAccounts;
    const account = normalizeSalesAccountRow(value, key);
    normalizedAccounts[account.key] = account;
    return normalizedAccounts;
  }, {});
};

const overviewMonthlyAccountRows = (months) => (Array.isArray(months) ? months : []).map((month) => ({
  ...month,
  label: month?.label || '-',
  item_count: numberFromFields(month, ['item_count', 'quantity', 'items', 'items_sold', 'units_sold', 'sold_quantity']),
  accounts: normalizeAccountMap(month?.accounts)
}));

const accountSeriesFromMonthlyRows = (monthRows, fallbackAccounts) => {
  const keyed = new Map();
  const addAccount = (account) => {
    const normalized = normalizeSalesAccountRow(account);
    if (!normalized.key || keyed.has(normalized.key)) return;
    const platformPrefix = normalized.platform && normalized.platform !== 'unknown' ? `${toTitleCase(normalized.platform)} • ` : '';
    keyed.set(normalized.key, {
      key: normalized.key,
      label: `${platformPrefix}${normalized.label}`,
      color: getOverviewAccountColor(keyed.size)
    });
  };

  (Array.isArray(monthRows) ? monthRows : []).forEach((month) => {
    Object.values(month?.accounts || {}).forEach(addAccount);
  });
  (Array.isArray(fallbackAccounts) ? fallbackAccounts : []).forEach(addAccount);

  return Array.from(keyed.values());
};

const HOME_TREND_SERIES = {
  total: { label: 'Total', color: '#12cfff' },
  bubur: { label: 'Bubur', color: '#9dff00' },
  jamu: { label: 'Jamu', color: '#ffb12b' }
};

const PRODUCT_CART_SERIES = {
  bubur: { label: 'Bubur', color: '#9dff00' },
  jamu: { label: 'Jamu', color: '#ffb12b' }
};

const WEBSITE_METRIC_LABELS = {
  visitors: 'Website visitors over time',
  page_views: 'Website page views over time',
  add_to_cart_events: 'Website add-to-cart activity over time',
  checkout_clicks: 'Website checkout intent over time'
};

const WEBSITE_METRIC_UNITS = {
  visitors: 'visitors',
  page_views: 'page views',
  add_to_cart_events: 'add to carts',
  checkout_clicks: 'checkout clicks'
};

const WEBSITE_SITE_LABELS = {
  jenang_gemi: {
    title: 'jenanggemi.com',
    chip: 'Jenang Gemi Website Dashboard',
    copy: 'Website traffic, cart intent, checkout clicks, paid orders, and Jenang Gemi store settings.',
    scope: 'Counts only `traffic_kind=website` browser events from the Jenang Gemi website.'
  },
  zero: {
    title: 'zerofoods.id',
    chip: 'ZERO Website Dashboard',
    copy: 'Website traffic, cart intent, checkout clicks, paid orders, and ZERO product setup.',
    scope: 'Counts only `traffic_kind=website` browser events from zerofoods.id.'
  }
};

const JENANG_GEMI_SEARCH_INDEX = [
  {
    title: 'Jenang Gemi Homepage',
    section: 'Official Website',
    description: 'Main public homepage for Jenang Gemi.',
    url: 'https://jenanggemi.com/',
    keywords: ['home', 'homepage', 'official website', 'landing']
  },
  {
    title: 'Bubur YouTube Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Bubur campaign page for YouTube traffic.',
    url: 'https://jenanggemi.com/bubur-youtube.html',
    keywords: ['bubur', 'youtube', 'campaign', 'landing page']
  },
  {
    title: 'Bubur Facebook Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Bubur campaign page for Facebook traffic.',
    url: 'https://jenanggemi.com/bubur-facebook.html',
    keywords: ['bubur', 'facebook', 'campaign', 'landing page']
  },
  {
    title: 'Bubur Instagram Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Bubur campaign page for Instagram traffic.',
    url: 'https://jenanggemi.com/bubur-instagram.html',
    keywords: ['bubur', 'instagram', 'campaign', 'landing page']
  },
  {
    title: 'Bubur TikTok Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Bubur campaign page for TikTok traffic.',
    url: 'https://jenanggemi.com/bubur-tiktok.html',
    keywords: ['bubur', 'tiktok', 'campaign', 'landing page']
  },
  {
    title: 'Jamu YouTube Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Jamu campaign page for YouTube traffic.',
    url: 'https://jenanggemi.com/jamu-youtube.html',
    keywords: ['jamu', 'youtube', 'campaign', 'landing page']
  },
  {
    title: 'Jamu Facebook Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Jamu campaign page for Facebook traffic.',
    url: 'https://jenanggemi.com/jamu-facebook.html',
    keywords: ['jamu', 'facebook', 'campaign', 'landing page']
  },
  {
    title: 'Jamu Instagram Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Jamu campaign page for Instagram traffic.',
    url: 'https://jenanggemi.com/jamu-instagram.html',
    keywords: ['jamu', 'instagram', 'campaign', 'landing page']
  },
  {
    title: 'Jamu TikTok Campaign',
    section: 'Campaign Landing Page',
    description: 'Jenang Gemi Jamu campaign page for TikTok traffic.',
    url: 'https://jenanggemi.com/jamu-tiktok.html',
    keywords: ['jamu', 'tiktok', 'campaign', 'landing page']
  },
  {
    title: 'Executive Sales Overview',
    section: 'Admin',
    description: 'Marketplace sales homepage with yearly monthly revenue charts.',
    url: '../dashboard/?view=overview',
    view: 'overview',
    keywords: ['home', 'homepage', 'sales', 'marketplace', 'overview', 'executive']
  },
  {
    title: 'Orders by Province',
    section: 'Admin',
    description: 'C8 Indonesia heat map showing where marketplace orders come from.',
    url: '../dashboard/?view=overview',
    view: 'overview',
    keywords: ['c8', 'province', 'provinsi', 'location', 'heat map', 'indonesia map', 'orders by province']
  },
  {
    title: 'Orders',
    section: 'Admin',
    description: 'Marketplace order spreadsheet with seller revenue, static average COGS, customer, and address fields.',
    url: '../dashboard/?view=orders',
    view: 'orders',
    keywords: ['orders', 'marketplace', 'spreadsheet', 'revenue', 'cogs']
  },
  {
    title: 'Open Context',
    section: 'Admin',
    description: 'Edit historical context values used by the Executive Sales C1 chart.',
    url: '../dashboard/?view=context',
    view: 'context',
    keywords: ['context', 'historical', '2025', '2026', 'revenue', 'gross profit', 'orders', 'items']
  },
  {
    title: 'Hard Set',
    section: 'Admin',
    description: 'Big Set irreversible website-order cutover into Store Ops.',
    url: '../dashboard/?view=hard-set',
    view: 'hard-set',
    keywords: ['hard set', 'big set', 'cutover', 'store ops', 'website orders', 'activation']
  },
  {
    title: 'Back Dash',
    section: 'Admin',
    description: 'Marketplace sync status, revenue formulas, raw JSON mappings, API calls, and backfill controls.',
    url: '../back-dash/',
    keywords: ['back dash', 'backdash', 'marketplace', 'sync', 'revenue formula', 'raw json', 'backfill', 'api ingest']
  },
  {
    title: 'Campaigns Dashboard',
    section: 'Admin',
    description: 'Campaign landing-page analytics for Bubur and Jamu pages.',
    url: '../dashboard/?view=campaigns',
    view: 'home',
    keywords: ['admin', 'dashboard', 'analytics', 'executive', 'landing pages', 'campaign landing', 'campaigns']
  },
  {
    title: 'Official Website Dashboard',
    section: 'Admin',
    description: 'Website analytics view inside the executive dashboard.',
    url: '../dashboard/?view=website',
    view: 'website',
    keywords: ['website dashboard', 'site analytics', 'traffic']
  },
  {
    title: 'Dashboard Settings',
    section: 'Admin',
    description: 'Appearance, lock controls, and analytics device exclusions.',
    url: '../dashboard/?view=settings',
    view: 'settings',
    keywords: ['settings', 'theme', 'device exclusions', 'security', 'lock']
  },
  {
    title: 'Store Ops Fulfillment',
    section: 'Admin',
    description: 'Search employee orders, fulfilled orders, active claims, scan errors, and order timelines.',
    url: '../dashboard/?view=store-ops',
    view: 'store-ops',
    keywords: ['store ops', 'ops', 'employee orders', 'fulfilled orders', 'order id', 'scan errors', 'claims', 'fulfillment']
  },
  {
    title: 'Affiliate Program Dashboard',
    section: 'Admin',
    description: 'Affiliate performance control room.',
    url: '../affiliate-program/',
    keywords: ['affiliate', 'program', 'dashboard', 'performance']
  },
  {
    title: 'Affiliate Profiles',
    section: 'Admin',
    description: 'Directory and management area for affiliate profiles.',
    url: '../affiliate-profiles/',
    keywords: ['affiliate', 'profiles', 'directory', 'edit']
  },
  {
    title: 'Partner Program Dashboard',
    section: 'Admin',
    description: 'Partner program management dashboard.',
    url: '../partner-program/',
    keywords: ['partner', 'program', 'dashboard', 'dropshipper']
  },
  {
    title: 'Partner Profiles',
    section: 'Admin',
    description: 'Partner profile registry and editing entry point.',
    url: '../partner-profiles/',
    keywords: ['partner', 'profiles', 'registry', 'edit']
  },
  {
    title: 'SKU Database',
    section: 'Admin',
    description: 'SKU database, approvals, and source-of-truth records.',
    url: '../sku-db/',
    keywords: ['sku', 'database', 'branch', 'approval', 'inventory']
  },
  {
    title: 'Inventory Recap',
    section: 'Admin',
    description: 'Smart restock suggestions, production draft, and Accounting cash fit.',
    url: '../dashboard/?view=inventory-recap',
    view: 'inventory-recap',
    keywords: ['inventory', 'recap', 'restock', 'production order', 'cash available', 'stock risk', 'purchase']
  },
  {
    title: 'Accounting Workspace',
    section: 'Admin',
    description: 'Cash, bills, expenses, transfers, manual income, and finance controls.',
    url: '../profit-loss/',
    keywords: ['accounting', 'cash control', 'bills', 'expenses', 'transfer', 'manual income', 'finance', 'profit', 'loss', 'p&l']
  },
  {
    title: 'API Health',
    section: 'Admin',
    description: 'Operational health checks for Shopee, Store Ops, and admin databases.',
    url: '../api-health/',
    keywords: ['api', 'health', 'errors', 'shopee', 'store ops', 'failures']
  },
  {
    title: 'Partner Portal',
    section: 'Partner',
    description: 'Live partner-facing portal.',
    url: 'https://partner.jenanggemi.com',
    keywords: ['partner portal', 'portal', 'partner login']
  }
];

const DASHBOARD_TIMEZONE = 'Asia/Jakarta';
const REGIONAL_DEFAULTS_STORAGE_KEY = 'jg-admin-regional-defaults';
const REGIONAL_DEFAULT_OPTIONS = {
  timezones: ['Asia/Jakarta', 'Asia/Singapore', 'UTC', 'America/New_York', 'America/Los_Angeles'],
  numberLocales: ['id-ID', 'en-US', 'en-GB'],
  dateFormats: ['dmy', 'mdy', 'iso'],
  currencyDisplays: ['symbol', 'code']
};
const REGIONAL_DEFAULTS_FALLBACK = Object.freeze({
  timezone: DASHBOARD_TIMEZONE,
  numberLocale: 'id-ID',
  dateFormat: 'dmy',
  currencyDisplay: 'symbol'
});
const TIMEZONE_LABELS = {
  'Asia/Jakarta': 'WIB',
  'Asia/Singapore': 'SGT',
  UTC: 'UTC',
  'America/New_York': 'ET',
  'America/Los_Angeles': 'PT'
};
const DAILY_CUSTOM_PLATFORMS_STORAGE_KEY = 'jg-dashboard-daily-custom-platforms';
const ANALYTICS_DEVICE_COOKIE = 'jg_analytics_device_id';
const ANALYTICS_DEVICE_MAX_AGE = 60 * 60 * 24 * 365 * 2;
const SALES_RECAP_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SALES_RECAP_METRICS = [
  { key: 'pcs', label: 'Total PCS', format: 'integer' },
  { key: 'rev', label: 'Total Rev', format: 'money' },
  { key: 'cogs', label: 'Total COGS', format: 'money' },
  { key: 'avgCogs', label: 'AVG COGS', format: 'money' },
  { key: 'gp', label: 'GP', format: 'money' },
  { key: 'avgGp', label: 'AVG GP', format: 'money' },
  { key: 'gpPct', label: 'GP%', format: 'percent' }
];
const VIEW_CACHE_TTL_MS = {
  overview: 2 * 60 * 1000,
  orders: 2 * 60 * 1000,
  wallet: 30 * 1000,
  'inventory-recap': 60 * 1000,
  daily: 5 * 60 * 1000,
  home: 90 * 1000,
  website: 2 * 60 * 1000,
  settings: 5 * 60 * 1000
};
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_MARKETPLACE_REFRESH_MIN_MS = 5 * 60 * 1000;
const AUTO_MARKETPLACE_REFRESH_STORAGE_KEY = 'jg-dashboard-auto-marketplace-refresh-at-v1';
const HOME_CACHE_PREFIX = 'jg-dashboard-home-cache-v1';
const WALLET_CACHE_STORAGE_KEY = 'jg-dashboard-wallet-cache-v1';
const WALLET_CACHE_WRITE_MIN_MS = 5 * 1000;
const WALLET_BACKGROUND_REFRESH_MIN_MS = 60 * 1000;
const DASHBOARD_CLIENT_CACHE_NAME = 'jg-executive-dashboard-page-cache-v1';
const DASHBOARD_CLIENT_CACHE_INDEX_KEY = 'jg-executive-dashboard-page-cache-index-v1';
const DASHBOARD_FALLBACK_CACHE_PREFIX = 'jg-executive-dashboard-page-cache-fallback-v1';
const DASHBOARD_PAGE_CACHE_LIMIT_BYTES = 300 * 1024 * 1024;
const DASHBOARD_RAM_LIMIT_BYTES = 700 * 1024 * 1024;
const DASHBOARD_RAM_RECOVERY_BYTES = 620 * 1024 * 1024;
const DASHBOARD_NAVIGATION_TYPE = (() => {
  try {
    const navigation = window.performance?.getEntriesByType?.('navigation')?.[0];
    if (navigation?.type) return navigation.type;
    if (window.performance?.navigation?.type === 1) return 'reload';
  } catch (_error) {
    return '';
  }
  return '';
})();
const DASHBOARD_FORCE_FRESH_LOAD = DASHBOARD_NAVIGATION_TYPE === 'reload';
const DASHBOARD_STARTUP_BACKGROUND_DELAY_MS = DASHBOARD_FORCE_FRESH_LOAD ? 8000 : 160;
const VIEW_PERSISTED_CACHE_TTL_MS = {
  overview: 15 * 60 * 1000,
  orders: 30 * 60 * 1000,
  wallet: 5 * 60 * 1000,
  'inventory-recap': 10 * 60 * 1000,
  daily: 20 * 60 * 1000,
  home: 10 * 60 * 1000,
  website: 10 * 60 * 1000,
  settings: 15 * 60 * 1000
};
const LIVE_REFRESH_DEBOUNCE_MS = 1200;
const BACKGROUND_IDLE_TIMEOUT_MS = 800;
const BACKGROUND_TASK_DELAY_MS = 80;
const INITIAL_VIEW_LOADER_CACHED_MS = 360;
const INITIAL_VIEW_LOADER_MIN_MS = 700;
const INITIAL_VIEW_LOADER_MAX_MS = 2200;
const INACTIVE_VIEW_UNLOAD_DELAY_MS = 15 * 1000;
const INACTIVE_VIEW_UNLOAD_STEP_MS = 140;

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const normalizeRegionalDefaults = (value = {}) => {
  const candidate = value && typeof value === 'object' ? value : {};
  return {
    timezone: REGIONAL_DEFAULT_OPTIONS.timezones.includes(candidate.timezone) ? candidate.timezone : REGIONAL_DEFAULTS_FALLBACK.timezone,
    numberLocale: REGIONAL_DEFAULT_OPTIONS.numberLocales.includes(candidate.numberLocale) ? candidate.numberLocale : REGIONAL_DEFAULTS_FALLBACK.numberLocale,
    dateFormat: REGIONAL_DEFAULT_OPTIONS.dateFormats.includes(candidate.dateFormat) ? candidate.dateFormat : REGIONAL_DEFAULTS_FALLBACK.dateFormat,
    currencyDisplay: REGIONAL_DEFAULT_OPTIONS.currencyDisplays.includes(candidate.currencyDisplay) ? candidate.currencyDisplay : REGIONAL_DEFAULTS_FALLBACK.currencyDisplay
  };
};

const readRegionalDefaults = () => {
  try {
    return normalizeRegionalDefaults(JSON.parse(window.localStorage.getItem(REGIONAL_DEFAULTS_STORAGE_KEY) || '{}'));
  } catch (_error) {
    return { ...REGIONAL_DEFAULTS_FALLBACK };
  }
};

let regionalDefaults = readRegionalDefaults();

const writeRegionalDefaults = (defaults) => {
  regionalDefaults = normalizeRegionalDefaults(defaults);
  try {
    window.localStorage.setItem(REGIONAL_DEFAULTS_STORAGE_KEY, JSON.stringify(regionalDefaults));
  } catch (_error) {
    // Browser-local settings are progressive enhancement only.
  }
  return regionalDefaults;
};

const getRegionalDateLocale = () => {
  if (regionalDefaults.dateFormat === 'mdy') return 'en-US';
  if (regionalDefaults.dateFormat === 'iso') return 'en-CA';
  return regionalDefaults.numberLocale === 'id-ID' ? 'id-ID' : 'en-GB';
};

const getTimezoneLabel = (timezone = regionalDefaults.timezone) => TIMEZONE_LABELS[timezone] || timezone;

const formatRegionalNumber = (value, options = {}) => Number(value || 0).toLocaleString(regionalDefaults.numberLocale, options);
const formatRegionalInteger = (value) => formatRegionalNumber(Math.round(Number(value) || 0));

const getMonthKeyForTimezone = (date = new Date(), timezone = DASHBOARD_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}`;
};

const getJakartaMonthStart = (year, month) => new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+07:00`);

const getCurrentMonthVelocity = (date = new Date()) => {
  const monthKey = getMonthKeyForTimezone(date, DASHBOARD_TIMEZONE);
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const monthStart = getJakartaMonthStart(year, month).getTime();
  const monthEnd = getJakartaMonthStart(nextMonthYear, nextMonth).getTime();
  const monthDuration = Math.max(monthEnd - monthStart, 1);
  const elapsed = Math.min(Math.max(date.getTime() - monthStart, 0), monthDuration);
  const projectionFactor = elapsed > 0 ? Math.max(1, monthDuration / elapsed) : 1;

  return { monthKey, projectionFactor };
};

const filterElapsedMonthlyRows = (rows, date = new Date()) => {
  const currentMonthKey = getMonthKeyForTimezone(date, DASHBOARD_TIMEZONE);
  return rows.filter((row) => {
    const rowKey = String(row?.key || '');
    return /^\d{4}-\d{2}$/.test(rowKey) ? rowKey <= currentMonthKey : true;
  });
};

const createAnalyticsDeviceId = () => {
  if (window.crypto?.randomUUID) return `device-${window.crypto.randomUUID()}`;
  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readCookie = (name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const resolveAnalyticsCookieDomain = () => {
  const host = window.location.hostname.toLowerCase();
  if (host === 'jenanggemi.com' || host.endsWith('.jenanggemi.com')) {
    return '.jenanggemi.com';
  }
  return '';
};

const writeCookie = (name, value, maxAgeSeconds) => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];
  const domain = resolveAnalyticsCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
};

const ensureAnalyticsDeviceId = () => {
  const existing = readCookie(ANALYTICS_DEVICE_COOKIE);
  if (existing) return existing;
  const next = createAnalyticsDeviceId();
  writeCookie(ANALYTICS_DEVICE_COOKIE, next, ANALYTICS_DEVICE_MAX_AGE);
  return next;
};

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const toTitleCase = (value) => {
  const normalized = String(value || '').toLowerCase();
  return SOURCE_LABELS[normalized] || normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeTextToken = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' dan ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatRegionalDateKey = (date, timezone) => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const formatDashboardTime = (value, timezone, options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  const resolvedTimezone = timezone || regionalDefaults.timezone;
  if (regionalDefaults.dateFormat === 'iso') {
    const wantsDate = options.weekday || options.day || options.month || options.year;
    const wantsTime = options.hour || options.minute || options.second;
    const segments = [];
    if (wantsDate) {
      const weekday = options.weekday
        ? `${new Intl.DateTimeFormat('en-GB', { timeZone: resolvedTimezone, weekday: options.weekday }).format(date)}, `
        : '';
      segments.push(`${weekday}${formatRegionalDateKey(date, resolvedTimezone)}`);
    }
    if (wantsTime) {
      segments.push(new Intl.DateTimeFormat('en-GB', {
        timeZone: resolvedTimezone,
        hour: options.hour || '2-digit',
        minute: options.minute || '2-digit',
        ...(options.second ? { second: options.second } : {}),
        hour12: options.hour12 ?? false
      }).format(date));
    }
    if (segments.length) return segments.join(' ');
  }
  return date.toLocaleString(getRegionalDateLocale(), {
    timeZone: resolvedTimezone,
    ...options
  });
};

const formatCompactNumber = (value) => {
  const number = Number(value) || 0;
  const absolute = Math.abs(number);
  if (absolute >= 1000000000000) return `${(number / 1000000000000).toFixed(absolute >= 10000000000000 ? 0 : 1).replace(/\.0$/, '')}T`;
  if (absolute >= 1000000000) return `${(number / 1000000000).toFixed(absolute >= 10000000000 ? 0 : 1).replace(/\.0$/, '')}B`;
  if (absolute >= 1000000) return `${(number / 1000000).toFixed(absolute >= 10000000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (absolute >= 1000) return `${(number / 1000).toFixed(absolute >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return formatRegionalNumber(Math.round(number));
};

const formatCurrency = (value, options = {}) => {
  const prefix = regionalDefaults.currencyDisplay === 'code' ? 'IDR ' : 'Rp';
  if (options.compact) return `${prefix}${formatCompactNumber(value)}`;
  return `${prefix}${formatRegionalNumber(Math.round(Number(value) || 0))}`;
};

const formatCellCurrency = (value) => formatCurrency(value, { compact: true });

const formatFullMetricValue = (metric, value, unitsMap) => {
  const unit = unitsMap[metric] || 'units';
  if (unit === 'idr') return formatCurrency(value);
  return `${formatRegionalNumber(Math.round(Number(value) || 0))} ${unit}`;
};

const formatMetricValue = (metric, value, unitsMap) => {
  const unit = unitsMap[metric] || 'units';
  if (unit === 'idr') return formatCurrency(value, { compact: true });
  return `${formatCompactNumber(value)} ${unit}`;
};

const formatPageLabel = (pagePath = '') => {
  const cleaned = String(pagePath).replace(/^\//, '').replace(/\.html$/i, '');
  return cleaned || '/';
};

const normalizeSourceKey = (value) => String(value || '').trim().toLowerCase();

const HIDDEN_HOME_SOURCES = new Set(['internal', 'direct']);
const OVERVIEW_CACHE_PREFIX = 'jg-overview-summary-v11';
const ORDER_RENDER_BATCH_SIZE = 120;
const ORDER_LOAD_WINDOW_DAYS = 14;
const ORDER_LOAD_PAGE_SIZE = 1000;
const ORDER_BOOTSTRAP_MIN_ROWS = 320;
const ORDER_BOOTSTRAP_MAX_WINDOWS = 2;
const ORDER_BACKGROUND_TARGET_ROWS = 24000;
const ORDER_BACKGROUND_MAX_WINDOWS = 72;
const OVERVIEW_LOCATION_PAGE_SIZE = 2000;
const OVERVIEW_LOCATION_MAX_PAGES = 25;
const OVERVIEW_LOCATION_CACHE_VERSION = 5;
const OVERVIEW_LOCATION_GEOCODER_VERSION = 3;
const OVERVIEW_LOCATION_CACHE_PREFIX = `jg-overview-location-v${OVERVIEW_LOCATION_CACHE_VERSION}`;

const INDONESIA_PROVINCE_ALIASES = {
  'Aceh': ['aceh', 'nanggroe aceh darussalam', 'nad'],
  'Bali': ['bali'],
  'Banten': ['banten'],
  'Bengkulu': ['bengkulu'],
  'DKI Jakarta': ['dki jakarta', 'jakarta', 'jakarta raya'],
  'Daerah Istimewa Yogyakarta': ['daerah istimewa yogyakarta', 'di yogyakarta', 'd i yogyakarta', 'yogyakarta', 'jogjakarta', 'jogja', 'diy'],
  'Gorontalo': ['gorontalo'],
  'Jambi': ['jambi'],
  'Jawa Barat': ['jawa barat', 'west java', 'jabar'],
  'Jawa Tengah': ['jawa tengah', 'central java', 'jateng'],
  'Jawa Timur': ['jawa timur', 'east java', 'jatim'],
  'Kalimantan Barat': ['kalimantan barat', 'west kalimantan', 'kalbar'],
  'Kalimantan Selatan': ['kalimantan selatan', 'south kalimantan', 'kalsel'],
  'Kalimantan Tengah': ['kalimantan tengah', 'central kalimantan', 'kalteng'],
  'Kalimantan Timur': ['kalimantan timur', 'east kalimantan', 'kaltim'],
  'Kalimantan Utara': ['kalimantan utara', 'north kalimantan', 'kaltra'],
  'Kepulauan Bangka Belitung': ['kepulauan bangka belitung', 'bangka belitung', 'babel'],
  'Kepulauan Riau': ['kepulauan riau', 'riau islands', 'kep riau', 'kepri'],
  'Lampung': ['lampung'],
  'Maluku': ['maluku'],
  'Maluku Utara': ['maluku utara', 'north maluku', 'malut'],
  'Nusa Tenggara Barat': ['nusa tenggara barat', 'ntb', 'west nusa tenggara'],
  'Nusa Tenggara Timur': ['nusa tenggara timur', 'ntt', 'east nusa tenggara'],
  'Papua': ['papua'],
  'Papua Barat': ['papua barat', 'west papua'],
  'Papua Barat Daya': ['papua barat daya', 'southwest papua'],
  'Papua Pegunungan': ['papua pegunungan', 'highland papua'],
  'Papua Selatan': ['papua selatan', 'south papua'],
  'Papua Tengah': ['papua tengah', 'central papua'],
  'Riau': ['riau'],
  'Sulawesi Barat': ['sulawesi barat', 'west sulawesi', 'sulbar'],
  'Sulawesi Selatan': ['sulawesi selatan', 'south sulawesi', 'sulsel'],
  'Sulawesi Tengah': ['sulawesi tengah', 'central sulawesi', 'sulteng'],
  'Sulawesi Tenggara': ['sulawesi tenggara', 'southeast sulawesi', 'sultra'],
  'Sulawesi Utara': ['sulawesi utara', 'north sulawesi', 'sulut'],
  'Sumatera Barat': ['sumatera barat', 'sumatra barat', 'west sumatra', 'sumbar'],
  'Sumatera Selatan': ['sumatera selatan', 'sumatra selatan', 'south sumatra', 'sumsel'],
  'Sumatera Utara': ['sumatera utara', 'sumatra utara', 'north sumatra', 'sumut']
};

const INDONESIA_LOCALITY_ALIASES = {
  'Aceh': ['banda aceh', 'langsa', 'lhokseumawe', 'sabang', 'subulussalam', 'aceh besar', 'aceh jaya', 'aceh selatan', 'aceh singkil', 'aceh tamiang', 'aceh tengah', 'aceh tenggara', 'aceh timur', 'aceh utara', 'bener meriah', 'bireuen', 'gayo lues', 'nagan raya', 'pidie', 'pidie jaya', 'simeulue'],
  'Bali': ['denpasar', 'badung', 'bangli', 'buleleng', 'gianyar', 'jembrana', 'karangasem', 'klungkung', 'tabanan'],
  'Banten': ['tangerang', 'tangerang selatan', 'tangsel', 'serang', 'cilegon', 'lebak', 'pandeglang'],
  'Bengkulu': ['bengkulu selatan', 'bengkulu tengah', 'bengkulu utara', 'kaur', 'kepahiang', 'lebong', 'mukomuko', 'rejang lebong', 'seluma'],
  'DKI Jakarta': ['jakarta pusat', 'jakarta selatan', 'jakarta barat', 'jakarta timur', 'jakarta utara', 'kepulauan seribu'],
  'Daerah Istimewa Yogyakarta': ['bantul', 'gunungkidul', 'gunung kidul', 'kulon progo', 'sleman'],
  'Gorontalo': ['boalemo', 'bone bolango', 'gorontalo utara', 'pohuwato'],
  'Jambi': ['sungai penuh', 'batanghari', 'bungo', 'kerinci', 'merangin', 'muaro jambi', 'sarolangun', 'tanjung jabung barat', 'tanjung jabung timur', 'tebo'],
  'Jawa Barat': ['bandung', 'bandung barat', 'banjar', 'bekasi', 'bogor', 'cimahi', 'cirebon', 'depok', 'garut', 'indramayu', 'karawang', 'kuningan', 'majalengka', 'pangandaran', 'purwakarta', 'subang', 'sukabumi', 'sumedang', 'tasikmalaya', 'ciamis', 'cianjur'],
  'Jawa Tengah': ['semarang', 'surakarta', 'solo', 'salatiga', 'magelang', 'pekalongan', 'tegal', 'banjarnegara', 'banyumas', 'batang', 'blora', 'boyolali', 'brebes', 'cilacap', 'demak', 'grobogan', 'jepara', 'karanganyar', 'kebumen', 'kendal', 'klaten', 'kudus', 'pati', 'pemalang', 'purbalingga', 'purworejo', 'rembang', 'sragen', 'sukoharjo', 'temanggung', 'wonogiri', 'wonosobo'],
  'Jawa Timur': ['surabaya', 'batu', 'blitar', 'kediri', 'madiun', 'malang', 'mojokerto', 'pasuruan', 'probolinggo', 'banyuwangi', 'bojonegoro', 'bondowoso', 'gresik', 'jember', 'jombang', 'lamongan', 'lumajang', 'magetan', 'nganjuk', 'ngawi', 'pacitan', 'pamekasan', 'ponorogo', 'sampang', 'sidoarjo', 'situbondo', 'sumenep', 'trenggalek', 'tuban', 'tulungagung'],
  'Kalimantan Barat': ['pontianak', 'singkawang', 'bengkayang', 'kapuas hulu', 'kayong utara', 'ketapang', 'kubu raya', 'landak', 'melawi', 'mempawah', 'sambas', 'sanggau', 'sekadau', 'sintang'],
  'Kalimantan Selatan': ['banjarmasin', 'banjarbaru', 'balangan', 'banjar', 'barito kuala', 'hulu sungai selatan', 'hulu sungai tengah', 'hulu sungai utara', 'kotabaru', 'tabalong', 'tanah bumbu', 'tanah laut', 'tapin'],
  'Kalimantan Tengah': ['palangka raya', 'barito selatan', 'barito timur', 'barito utara', 'gunung mas', 'kapuas', 'katingan', 'kotawaringin barat', 'kotawaringin timur', 'lamandau', 'murung raya', 'pulang pisau', 'seruyan', 'sukamara'],
  'Kalimantan Timur': ['balikpapan', 'bontang', 'samarinda', 'berau', 'kutai barat', 'kutai kartanegara', 'kutai timur', 'mahakam ulu', 'paser', 'penajam paser utara'],
  'Kalimantan Utara': ['tarakan', 'bulungan', 'malinau', 'nunukan', 'tana tidung'],
  'Kepulauan Bangka Belitung': ['pangkal pinang', 'bangka', 'bangka barat', 'bangka selatan', 'bangka tengah', 'belitung', 'belitung timur'],
  'Kepulauan Riau': ['batam', 'tanjung pinang', 'bintan', 'karimun', 'kepulauan anambas', 'lingga', 'natuna'],
  'Lampung': ['bandar lampung', 'metro', 'lampung barat', 'lampung selatan', 'lampung tengah', 'lampung timur', 'lampung utara', 'mesuji', 'pesawaran', 'pesisir barat', 'pringsewu', 'tanggamus', 'tulang bawang', 'tulang bawang barat', 'way kanan'],
  'Maluku': ['ambon', 'tual', 'buru', 'buru selatan', 'kepulauan aru', 'maluku barat daya', 'maluku tengah', 'maluku tenggara', 'seram bagian barat', 'seram bagian timur', 'kepulauan tanimbar'],
  'Maluku Utara': ['ternate', 'tidore', 'halmahera barat', 'halmahera tengah', 'halmahera selatan', 'halmahera timur', 'halmahera utara', 'kepulauan sula', 'pulau morotai', 'pulau taliabu'],
  'Nusa Tenggara Barat': ['mataram', 'bima', 'dompu', 'lombok barat', 'lombok tengah', 'lombok timur', 'lombok utara', 'sumbawa', 'sumbawa barat'],
  'Nusa Tenggara Timur': ['kupang', 'alor', 'belu', 'ende', 'flores timur', 'lembata', 'malaka', 'manggarai', 'manggarai barat', 'manggarai timur', 'nagekeo', 'ngada', 'rote ndao', 'sabu raijua', 'sikka', 'sumba barat', 'sumba barat daya', 'sumba tengah', 'sumba timur', 'timor tengah selatan', 'timor tengah utara'],
  'Papua': ['jayapura', 'biak numfor', 'kepulauan yapen', 'mamberamo raya', 'sarmi', 'supiori', 'waropen', 'keerom'],
  'Papua Barat': ['manokwari', 'fakfak', 'kaimana', 'teluk bintuni', 'teluk wondama'],
  'Papua Barat Daya': ['sorong', 'raja ampat', 'maybrat', 'tambrauw'],
  'Papua Pegunungan': ['jayawijaya', 'yahukimo', 'tolikara', 'mamberamo tengah', 'yalimo', 'lanny jaya', 'nduga', 'pegunungan bintang'],
  'Papua Selatan': ['merauke', 'asmat', 'boven digoel', 'mappi'],
  'Papua Tengah': ['nabire', 'mimika', 'paniai', 'puncak', 'puncak jaya', 'dogiyai', 'deiyai', 'intan jaya'],
  'Riau': ['pekanbaru', 'dumai', 'bengkalis', 'indragiri hilir', 'indragiri hulu', 'kampar', 'kepulauan meranti', 'kuantan singingi', 'pelalawan', 'rokan hilir', 'rokan hulu', 'siak'],
  'Sulawesi Barat': ['mamuju', 'majene', 'mamasa', 'mamuju tengah', 'pasangkayu', 'polewali mandar', 'polman'],
  'Sulawesi Selatan': ['makassar', 'palopo', 'parepare', 'bantaeng', 'barru', 'bone', 'bulukumba', 'enrekang', 'gowa', 'jeneponto', 'kepulauan selayar', 'luwu', 'luwu timur', 'luwu utara', 'maros', 'pangkajene kepulauan', 'pangkep', 'pinrang', 'sidenreng rappang', 'sidrap', 'sinjai', 'soppeng', 'takalar', 'tana toraja', 'toraja utara', 'wajo'],
  'Sulawesi Tengah': ['palu', 'banggai', 'banggai kepulauan', 'banggai laut', 'buol', 'donggala', 'morowali', 'morowali utara', 'parigi moutong', 'poso', 'sigi', 'tojo una una', 'tolitoli'],
  'Sulawesi Tenggara': ['kendari', 'bau bau', 'baubau', 'bombana', 'buton', 'buton selatan', 'buton tengah', 'buton utara', 'kolaka', 'kolaka timur', 'kolaka utara', 'konawe', 'konawe 