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
    description: 'Marketplace order spreadsheet with seller revenue, FIFO COGS, customer, and address fields.',
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
    title: 'Profit and Loss Workspace',
    section: 'Admin',
    description: 'SKU-level profit, syrup costs, margins, and product finance controls.',
    url: '../profit-loss/',
    keywords: ['profit', 'loss', 'p&l', 'margin', 'gross profit', 'finance']
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
const DAILY_ORDER_PAGE_LIMIT = 1000;
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
  'Sulawesi Tenggara': ['kendari', 'bau bau', 'baubau', 'bombana', 'buton', 'buton selatan', 'buton tengah', 'buton utara', 'kolaka', 'kolaka timur', 'kolaka utara', 'konawe', 'konawe kepulauan', 'konawe selatan', 'konawe utara', 'muna', 'muna barat', 'wakatobi'],
  'Sulawesi Utara': ['manado', 'bitung', 'kotamobagu', 'tomohon', 'bolaang mongondow', 'bolaang mongondow selatan', 'bolaang mongondow timur', 'bolaang mongondow utara', 'kepulauan sangihe', 'kepulauan siau tagulandang biaro', 'kepulauan talaud', 'minahasa', 'minahasa selatan', 'minahasa tenggara', 'minahasa utara'],
  'Sumatera Barat': ['padang', 'bukittinggi', 'padang panjang', 'pariaman', 'payakumbuh', 'sawahlunto', 'solok', 'agam', 'dharmasraya', 'kepulauan mentawai', 'lima puluh kota', 'padang pariaman', 'pasaman', 'pasaman barat', 'pesisir selatan', 'sijunjung', 'solok selatan', 'tanah datar'],
  'Sumatera Selatan': ['palembang', 'pagar alam', 'prabumulih', 'lubuklinggau', 'banyuasin', 'empat lawang', 'lahat', 'muara enim', 'musi banyuasin', 'musi rawas', 'musi rawas utara', 'ogan ilir', 'ogan komering ilir', 'ogan komering ulu', 'ogan komering ulu selatan', 'ogan komering ulu timur', 'penukal abab lematang ilir'],
  'Sumatera Utara': ['medan', 'binjai', 'gunungsitoli', 'padangsidimpuan', 'pematangsiantar', 'sibolga', 'tanjungbalai', 'tebing tinggi', 'asahan', 'batu bara', 'dairi', 'deli serdang', 'humbang hasundutan', 'karo', 'labuhanbatu', 'labuhanbatu selatan', 'labuhanbatu utara', 'langkat', 'mandailing natal', 'nias', 'nias barat', 'nias selatan', 'nias utara', 'padang lawas', 'padang lawas utara', 'pakpak bharat', 'samosir', 'serdang bedagai', 'simalungun', 'tapanuli selatan', 'tapanuli tengah', 'tapanuli utara', 'toba']
};

const INDONESIA_PROVINCE_ALIAS_ENTRIES = Object.entries(INDONESIA_PROVINCE_ALIASES)
  .flatMap(([province, aliases]) => aliases.map((alias) => ({
    province,
    alias: normalizeTextToken(alias)
  })))
  .filter((entry) => entry.alias)
  .sort((left, right) => right.alias.length - left.alias.length);

const INDONESIA_LOCALITY_ALIAS_ENTRIES = Object.entries(INDONESIA_LOCALITY_ALIASES)
  .flatMap(([province, aliases]) => aliases.flatMap((alias) => {
    const normalized = normalizeTextToken(alias);
    if (!normalized) return [];
    const expanded = new Set([
      normalized,
      `kota ${normalized}`,
      `kabupaten ${normalized}`,
      `kab ${normalized}`,
      `kab ${normalized.replace(/^kota /, '')}`
    ].map(normalizeTextToken).filter(Boolean));
    return Array.from(expanded).map((entryAlias) => ({ province, alias: entryAlias }));
  }))
  .sort((left, right) => right.alias.length - left.alias.length);

const shouldHideSourceMetric = (value) => HIDDEN_HOME_SOURCES.has(normalizeSourceKey(value));

const canvasSizeState = new WeakMap();
let themePaletteCache = null;

const prepareCanvas = (canvas) => {
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth || canvas.width || 1));
  const height = Math.max(1, Math.round(canvas.clientHeight || canvas.height || 1));
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  const previousSize = canvasSizeState.get(canvas);
  if (!previousSize || previousSize.pixelWidth !== pixelWidth || previousSize.pixelHeight !== pixelHeight || previousSize.ratio !== ratio) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvasSizeState.set(canvas, { pixelWidth, pixelHeight, ratio });
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
};

const getThemePalette = () => {
  const themeKey = document.documentElement.dataset.adminTheme || '';
  if (themePaletteCache?.key === themeKey) {
    return themePaletteCache.palette;
  }
  const styles = window.getComputedStyle(document.documentElement);
  const palette = {
    text: styles.getPropertyValue('--admin-text').trim() || '#0c1117',
    muted: styles.getPropertyValue('--admin-muted').trim() || 'rgba(55, 65, 81, 0.68)',
    border: styles.getPropertyValue('--admin-border').trim() || 'rgba(17, 24, 39, 0.08)',
    surface: styles.getPropertyValue('--admin-surface').trim() || '#ffffff',
    surfaceSoft: styles.getPropertyValue('--admin-surface-soft').trim() || '#f6f8f4'
  };
  themePaletteCache = { key: themeKey, palette };
  return palette;
};

const invalidateThemePalette = () => {
  themePaletteCache = null;
};

const drawValueBadge = (ctx, x, y, text, palette) => {
  ctx.font = '700 12px "Space Grotesk", sans-serif';
  const metrics = ctx.measureText(text);
  const badgeWidth = Math.ceil(metrics.width) + 14;
  const badgeHeight = 22;
  const badgeX = x - (badgeWidth / 2);
  const badgeY = y - 24;

  ctx.fillStyle = palette.surface;
  ctx.beginPath();
  roundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 999);
  ctx.fill();

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 999);
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, badgeY + 15);
};

const drawHoverGuide = (ctx, activeHover, padding, chartHeight, color = 'rgba(157, 255, 0, 0.72)') => {
  if (!activeHover || !Number.isFinite(activeHover.x)) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(activeHover.x, padding.top);
  ctx.lineTo(activeHover.x, padding.top + chartHeight);
  ctx.stroke();
  ctx.restore();
};

const drawGrid = (ctx, width, height, padding, maxValue, metric, unitsMap, palette, options = {}) => {
  const formatTick = typeof options.valueLabel === 'function'
    ? (value) => options.valueLabel(null, value)
    : (value) => formatMetricValue(metric, value, unitsMap);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const tickValue = Math.round(maxValue - ((maxValue / 3) * i));
    ctx.fillStyle = palette.muted;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(formatTick(Math.max(0, tickValue)), 8, y - (i === 0 ? -12 : 4));
  }
};

const roundedRect = (ctx, x, y, width, height, radius) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  const safeRadius = Math.min(Math.max(Number(radius) || 0, 0), Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
};

const chartHoverState = new WeakMap();
const chartTooltipState = new WeakMap();
const chartBindingState = new WeakSet();
const chartRendererState = new WeakMap();
const chartActivePointState = new WeakMap();
let activeChartInfoButton = null;
let activeChartInfoPopover = null;

const closeChartInfoPopover = () => {
  if (activeChartInfoButton) {
    activeChartInfoButton.classList.remove('is-active');
    activeChartInfoButton.setAttribute('aria-expanded', 'false');
  }
  activeChartInfoPopover?.remove();
  activeChartInfoButton = null;
  activeChartInfoPopover = null;
};

const positionChartInfoPopover = () => {
  if (!activeChartInfoButton || !activeChartInfoPopover) return;

  const buttonRect = activeChartInfoButton.getBoundingClientRect();
  const popoverRect = activeChartInfoPopover.getBoundingClientRect();
  const margin = 14;
  const top = Math.min(
    window.innerHeight - popoverRect.height - margin,
    buttonRect.bottom + 10
  );
  const left = Math.min(
    window.innerWidth - popoverRect.width - margin,
    Math.max(margin, buttonRect.left - popoverRect.width + buttonRect.width)
  );

  activeChartInfoPopover.style.top = `${Math.max(margin, top)}px`;
  activeChartInfoPopover.style.left = `${Math.max(margin, left)}px`;
};

const openChartInfoPopover = (button) => {
  const text = button?.getAttribute('data-chart-info') || '';
  if (!text) return;

  closeChartInfoPopover();
  const popover = document.createElement('div');
  popover.className = 'admin-chart-info-popover';
  popover.setAttribute('role', 'dialog');
  popover.textContent = text;
  document.body.appendChild(popover);

  activeChartInfoButton = button;
  activeChartInfoPopover = popover;
  button.classList.add('is-active');
  button.setAttribute('aria-expanded', 'true');
  positionChartInfoPopover();
};

const bindChartInfoPopovers = () => {
  document.querySelectorAll('[data-chart-info]').forEach((button) => {
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeChartInfoButton === button) {
        closeChartInfoPopover();
        return;
      }
      openChartInfoPopover(button);
    });
  });

  document.addEventListener('click', (event) => {
    if (!activeChartInfoPopover) return;
    if (activeChartInfoPopover.contains(event.target) || activeChartInfoButton?.contains(event.target)) return;
    closeChartInfoPopover();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeChartInfoPopover();
  });

  window.addEventListener('resize', positionChartInfoPopover);
  window.addEventListener('scroll', positionChartInfoPopover, true);
};

const ensureSurfaceTooltip = (surface, key) => {
  if (!(surface instanceof HTMLElement)) return null;
  const tooltipKey = key || surface;
  const existing = chartTooltipState.get(tooltipKey);
  if (existing?.isConnected) return existing;

  const tooltip = document.createElement('div');
  tooltip.className = 'admin-chart-tooltip';
  tooltip.innerHTML = '<strong></strong><div class="admin-chart-tooltip-body"></div>';
  surface.appendChild(tooltip);
  chartTooltipState.set(tooltipKey, tooltip);
  return tooltip;
};

const ensureChartTooltip = (canvas) => (
  canvas instanceof HTMLCanvasElement ? ensureSurfaceTooltip(canvas.parentElement, canvas) : null
);

const hideSurfaceTooltip = (key) => {
  const tooltip = chartTooltipState.get(key);
  if (!tooltip) return;
  tooltip.classList.remove('is-visible');
};

const hideChartTooltip = (canvas) => hideSurfaceTooltip(canvas);

const drawChartMessage = (canvas, message) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--admin-muted') || '#9ca3af';
  ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message, width / 2, height / 2);
  chartHoverState.set(canvas, []);
};

const drawChartSafely = (canvas, renderer, message = 'Chart unavailable') => {
  if (!(canvas instanceof HTMLCanvasElement)) return;
  try {
    renderer();
  } catch (error) {
    console.error('Dashboard chart render failed', error);
    drawChartMessage(canvas, message);
  }
};

const renderSurfaceTooltip = (surface, key, point, clientX, clientY) => {
  const tooltip = ensureSurfaceTooltip(surface, key);
  if (!tooltip || !(surface instanceof HTMLElement) || !point) return;

  const titleNode = tooltip.querySelector('strong');
  const valueNode = tooltip.querySelector('.admin-chart-tooltip-body');

  if (titleNode) titleNode.textContent = point.tooltipTitle || point.label || '';
  if (valueNode) {
    if (point.tooltipLinesHtml) {
      valueNode.innerHTML = point.tooltipLinesHtml;
    } else {
      valueNode.textContent = point.tooltipValue || formatMetricValue(point.metric || 'views', point.value || 0, point.unitsMap || HOME_METRIC_UNITS);
    }
  }

  const surfaceRect = surface.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width || 240;
  const tooltipHeight = tooltipRect.height || 120;
  const xOffset = clientX - surfaceRect.left > surfaceRect.width * 0.62 ? -tooltipWidth - 14 : 14;
  const relativeX = Math.max(12, Math.min(clientX - surfaceRect.left + xOffset, surfaceRect.width - tooltipWidth - 12));
  const relativeY = Math.max(12, Math.min(clientY - surfaceRect.top - (tooltipHeight / 2), surfaceRect.height - tooltipHeight - 12));
  tooltip.style.left = `${relativeX}px`;
  tooltip.style.top = `${relativeY}px`;
  tooltip.classList.add('is-visible');
};

const renderChartTooltip = (canvas, point, clientX, clientY) => {
  renderSurfaceTooltip(canvas?.parentElement, canvas, point, clientX, clientY);
};

const resolveHoveredChartPoint = (canvas, clientX, clientY) => {
  const points = chartHoverState.get(canvas) || [];
  if (!points.length) return null;

  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let closest = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  points.forEach((point) => {
    if (typeof point.hitTest === 'function' && point.hitTest(x, y)) {
      closest = point;
      closestDistance = 0;
      return;
    }

    if (point.hitbox) {
      const { left, top, right, bottom } = point.hitbox;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        closest = point;
        closestDistance = 0;
        return;
      }
    }

    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < closestDistance) {
      closest = point;
      closestDistance = distance;
    }
  });

  if (closestDistance > 28) return null;
  return closest;
};

const bindChartHover = (canvas) => {
  if (!(canvas instanceof HTMLCanvasElement) || chartBindingState.has(canvas)) return;
  chartBindingState.add(canvas);

  canvas.addEventListener('mousemove', (event) => {
    const hoveredPoint = resolveHoveredChartPoint(canvas, event.clientX, event.clientY);
    if (!hoveredPoint) {
      if (chartActivePointState.has(canvas)) {
        chartActivePointState.delete(canvas);
        const renderChart = chartRendererState.get(canvas);
        if (renderChart) renderChart();
      }
      hideChartTooltip(canvas);
      return;
    }

    const activePoint = chartActivePointState.get(canvas);
    const activeKey = activePoint?.hoverKey || '';
    const hoveredKey = hoveredPoint.hoverKey || `${hoveredPoint.x}:${hoveredPoint.y}:${hoveredPoint.label}`;
    if (activeKey !== hoveredKey) {
      chartActivePointState.set(canvas, hoveredPoint);
      const renderChart = chartRendererState.get(canvas);
      if (renderChart) renderChart();
    }
    renderChartTooltip(canvas, hoveredPoint, event.clientX, event.clientY);
  });

  canvas.addEventListener('mouseleave', () => {
    if (chartActivePointState.has(canvas)) {
      chartActivePointState.delete(canvas);
      const renderChart = chartRendererState.get(canvas);
      if (renderChart) renderChart();
    }
    hideChartTooltip(canvas);
  });
};

const drawBarChart = (canvas, items, config) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const chartItems = items.slice(0, config.limit || items.length);
  const maxValue = Math.max(...chartItems.map((item) => Number(config.value(item) || 0)), 1);
  const padding = { top: 20, right: 20, bottom: 48, left: 92, ...(config.padding || {}) };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const itemCount = Math.max(chartItems.length, 1);
  const barWidth = (chartWidth / itemCount) * 0.58;
  const gap = (chartWidth / itemCount) * 0.42;
  const palette = getThemePalette();
  const hoverPoints = [];

  bindChartHover(canvas);

  if (config.showGrid !== false) {
    drawGrid(ctx, width, height, padding, maxValue, config.metric, config.unitsMap, palette, config);
  }

  chartItems.forEach((item, index) => {
    const value = Number(config.value(item) || 0);
    const barHeight = (value / maxValue) * (chartHeight - 10);
    const x = padding.left + index * (barWidth + gap) + gap / 2;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = palette.surfaceSoft;
    ctx.beginPath();
    roundedRect(ctx, x, padding.top + 8, barWidth, chartHeight - 8, 10);
    ctx.fill();

    ctx.fillStyle = config.color(item);
    ctx.beginPath();
    roundedRect(ctx, x, y, barWidth, barHeight, 10);
    ctx.fill();

    if (config.showValueBadges !== false) {
      const valueLabel = typeof config.valueLabel === 'function'
        ? config.valueLabel(item, value)
        : formatMetricValue(config.metric, value, config.unitsMap);
      drawValueBadge(ctx, x + (barWidth / 2), y, valueLabel, palette);
    }

    if (config.showXAxisLabels !== false) {
      ctx.fillStyle = palette.muted;
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(config.label(item), x + (barWidth / 2), height - 16);
    }

    hoverPoints.push({
      x: x + (barWidth / 2),
      y,
      value,
      metric: config.metric,
      unitsMap: config.unitsMap,
      label: config.label(item),
      hoverKey: `${config.metric || 'bar'}:${index}`,
      tooltipTitle: config.tooltipTitle ? config.tooltipTitle(item) : config.label(item),
      tooltipValue: config.tooltipValue ? config.tooltipValue(item, value) : formatMetricValue(config.metric, value, config.unitsMap),
      hitbox: {
        left: x,
        top: padding.top,
        right: x + barWidth,
        bottom: padding.top + chartHeight
      }
    });
  });

  chartHoverState.set(canvas, hoverPoints);
};

const drawLineChart = (canvas, items, metric, unitsMap, options = {}) => {
  chartRendererState.set(canvas, () => drawLineChart(canvas, items, metric, unitsMap, options));
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const padding = { top: 20, right: 18, bottom: 48, left: 92, ...(options.padding || {}) };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const chartValue = (item) => (item?.future ? null : Number(item?.[metric] || 0));
  const projectionValue = (item) => {
    const value = Number(item?.projection?.[metric]);
    return Number.isFinite(value) ? value : null;
  };
  const values = items.flatMap((item) => [chartValue(item), projectionValue(item)]).filter((value) => Number.isFinite(value));
  const maxValue = Math.max(...values, 1);
  const palette = getThemePalette();
  const points = [];
  const activeHover = chartActivePointState.get(canvas) || null;

  bindChartHover(canvas);

  drawGrid(ctx, width, height, padding, maxValue, metric, unitsMap, palette);

  if (!items.length) {
    chartHoverState.set(canvas, []);
    return;
  }

  const lineColor = options.lineColor || SOURCE_COLORS.instagram;
  const fillRgb = options.fillRgb || hexToRgbParts(lineColor);
  const fillGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
  fillGradient.addColorStop(0, `rgba(${fillRgb}, 0.18)`);
  fillGradient.addColorStop(1, `rgba(${fillRgb}, 0)`);
  const linePoints = [];

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  let hasOpenLine = false;

  items.forEach((item, index) => {
    const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
    const value = chartValue(item);
    if (value === null) {
      hasOpenLine = false;
      return;
    }
    const y = padding.top + chartHeight - ((value / maxValue) * (chartHeight - 6));
    points.push({
      x,
      y,
      value,
      metric,
      unitsMap,
      label: item.label || '',
      hoverKey: `${metric}:${index}`,
      tooltipTitle: item.tooltipTitle || item.label || '',
      tooltipValue: formatMetricValue(metric, value, unitsMap),
      tooltipLinesHtml: item.tooltipLinesHtml || null,
      hitbox: {
        left: index === 0 ? padding.left : x - (chartWidth / Math.max(items.length - 1, 1) / 2),
        right: index === items.length - 1 ? width - padding.right : x + (chartWidth / Math.max(items.length - 1, 1) / 2),
        top: padding.top,
        bottom: padding.top + chartHeight
      }
    });
    linePoints.push({ x, y });
    if (!hasOpenLine) {
      ctx.moveTo(x, y);
      hasOpenLine = true;
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  if (linePoints.length) {
    ctx.beginPath();
    linePoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.lineTo(linePoints[linePoints.length - 1].x, padding.top + chartHeight);
    ctx.lineTo(linePoints[0].x, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = fillGradient;
    ctx.fill();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    linePoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  }

  const projectedIndex = items.findIndex((item) => projectionValue(item) !== null);
  if (projectedIndex > 0) {
    const previousValue = chartValue(items[projectedIndex - 1]);
    const projectedValue = projectionValue(items[projectedIndex]);
    if (previousValue !== null && projectedValue !== null) {
      const previousX = padding.left + (chartWidth * (projectedIndex - 1) / Math.max(items.length - 1, 1));
      const projectedX = padding.left + (chartWidth * projectedIndex / Math.max(items.length - 1, 1));
      const previousY = padding.top + chartHeight - ((previousValue / maxValue) * (chartHeight - 6));
      const projectedY = padding.top + chartHeight - ((projectedValue / maxValue) * (chartHeight - 6));
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(previousX, previousY);
      ctx.lineTo(projectedX, projectedY);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHoverGuide(ctx, activeHover, padding, chartHeight);

  items.forEach((item, index) => {
    const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
    const value = chartValue(item);
    if (value === null) {
      if (options.showXAxisLabels !== false && (index === 0 || index === items.length - 1 || items.length <= 8 || index % Math.ceil(items.length / (options.maxLabels || 6)) === 0)) {
        ctx.fillStyle = palette.muted;
        ctx.font = options.labelFont || '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label || '', x, height - 16);
      }
      return;
    }
    const y = padding.top + chartHeight - ((value / maxValue) * (chartHeight - 6));
    const isActive = activeHover && Math.abs(activeHover.x - x) < 1;
    ctx.fillStyle = isActive ? palette.surface : lineColor;
    ctx.beginPath();
    ctx.arc(x, y, isActive ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (isActive) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const projectedValue = projectionValue(item);
    if (projectedValue !== null) {
      const projectedY = padding.top + chartHeight - ((projectedValue / maxValue) * (chartHeight - 6));
      ctx.fillStyle = palette.surface;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, projectedY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (options.showXAxisLabels !== false && (index === 0 || index === items.length - 1 || items.length <= 8 || index % Math.ceil(items.length / (options.maxLabels || 6)) === 0)) {
      ctx.fillStyle = palette.muted;
      ctx.font = options.labelFont || '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label || '', x, height - 16);
    }
  });

  chartHoverState.set(canvas, points);
};

const buildTrendTooltipLines = (metric, unitsMap, seriesValues) => seriesValues.map((seriesItem) => `
  <div class="admin-chart-tooltip-row">
    <span class="admin-chart-tooltip-dot" style="background:${seriesItem.color}"></span>
    <span>${seriesItem.label}: ${formatMetricValue(metric, seriesItem.value, unitsMap)}</span>
  </div>
`).join('');

const buildOverviewTooltipLines = (item, focusMetric = 'sales') => {
  const net = Number(item.net_revenue || item.sales || 0);
  const revenue = Number(item.revenue || net);
  const cogs = Number(item.cogs || 0);
  const grossProfit = Number(item.gross_profit || revenue - cogs);
  const orders = Number(item.orders || 0);
  const items = Number(item.item_count || 0);
  const fees = Number(item.marketplace_fees || 0);
  const aov = orders > 0 ? revenue / orders : 0;
  const focusValue = focusMetric === 'revenue'
    ? revenue
    : focusMetric === 'gross_profit'
      ? grossProfit
      : focusMetric === 'average_order_value'
        ? aov
        : Number(item[focusMetric] || 0);
  const focusLabel = focusMetric === 'orders'
    ? 'Orders QTY'
    : focusMetric === 'item_count'
      ? 'Items QTY'
      : focusMetric === 'gross_profit'
        ? 'Gross profit'
        : focusMetric === 'average_order_value'
          ? 'AOV'
          : 'Revenue';
  const rows = [
    [focusLabel, formatFullMetricValue(focusMetric, focusValue, OVERVIEW_METRIC_UNITS), 'is-primary'],
    ['Revenue', formatFullMetricValue('revenue', revenue, OVERVIEW_METRIC_UNITS), ''],
    ['Gross profit', formatFullMetricValue('gross_profit', grossProfit, OVERVIEW_METRIC_UNITS), ''],
    ['Order QTY', formatFullMetricValue('orders', orders, OVERVIEW_METRIC_UNITS), ''],
    ['Items QTY', formatFullMetricValue('item_count', items, OVERVIEW_METRIC_UNITS), ''],
    ['Marketplace fees', formatFullMetricValue('marketplace_fees', fees, OVERVIEW_METRIC_UNITS), ''],
    ['COGS', formatFullMetricValue('cogs', cogs, OVERVIEW_METRIC_UNITS), ''],
    ['AOV', formatFullMetricValue('average_order_value', aov, OVERVIEW_METRIC_UNITS), '']
  ];
  return rows.map(([label, value, className]) => `
    <div class="admin-chart-tooltip-row ${className}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join('');
};

const normalizeOverviewProductRows = (rows) => (Array.isArray(rows) ? rows : []).map((row) => {
  const platforms = normalizePlatformMap(row?.platforms);
  const quantity = numberFromFields(row, ['quantity', 'item_count', 'items', 'items_sold', 'units_sold', 'sold_quantity']);
  const netRevenue = numberFromFields(row, ['net_revenue', 'sales', 'revenue', 'net_sales']);
  if (!Object.keys(platforms).length && (quantity > 0 || netRevenue > 0)) {
    platforms.unknown = {
      key: 'unknown',
      label: 'Unknown Platform',
      quantity,
      net_revenue: netRevenue
    };
  }
  return {
    ...row,
    quantity,
    net_revenue: netRevenue,
    orders: numberFromFields(row, ['orders', 'order_count']),
    platforms
  };
});

const overviewProductRowsFromPlatformFallback = (products, platforms, months) => {
  const byPlatform = Array.isArray(products?.by_platform) ? products.by_platform : [];
  const sourceRows = byPlatform.length ? byPlatform : (Array.isArray(platforms) ? platforms : []);
  const rows = sourceRows.map((platform) => {
    const normalizedPlatform = normalizePlatformMetricRow(platform);
    const key = normalizedPlatform.key;
    const label = normalizedPlatform.label;
    const quantity = normalizedPlatform.quantity;
    const netRevenue = normalizedPlatform.net_revenue;
    return {
      key: `platform-total-${key}`,
      label: `${label} total`,
      sku: '',
      product_type: 'Platform Total',
      quantity,
      net_revenue: netRevenue,
      platforms: {
        [key]: {
          key,
          label,
          quantity,
          net_revenue: netRevenue
        }
      }
    };
  }).filter((row) => row.quantity > 0 || row.net_revenue > 0);

  if (rows.length) return rows;

  const monthPlatformTotals = {};
  (Array.isArray(months) ? months : []).forEach((month) => {
    Object.entries(normalizePlatformMap(month?.platforms)).forEach(([platformKey, platformRow]) => {
      const key = normalizePlatformKey(platformKey || platformRow?.key);
      monthPlatformTotals[key] = monthPlatformTotals[key] || {
        key,
        label: platformRow?.label || toTitleCase(key),
        quantity: 0,
        net_revenue: 0
      };
      monthPlatformTotals[key].quantity += Number(platformRow?.quantity || 0);
      monthPlatformTotals[key].net_revenue += Number(platformRow?.net_revenue || 0);
    });
  });

  return Object.values(monthPlatformTotals)
    .filter((row) => row.quantity > 0 || row.net_revenue > 0)
    .map((platform) => ({
      key: `platform-total-${platform.key}`,
      label: `${platform.label} total`,
      sku: '',
      product_type: 'Platform Total',
      quantity: platform.quantity,
      net_revenue: platform.net_revenue,
      platforms: {
        [platform.key]: platform
      }
    }));
};

const overviewProductRowsForChart = (products, platforms, months) => {
  const directRows = normalizeOverviewProductRows(products?.by_product);
  if (directRows.some((row) => Number(row.quantity || row.net_revenue || 0) > 0 || Object.values(row.platforms || {}).some((platform) => Number(platform?.quantity || platform?.net_revenue || 0) > 0))) {
    return directRows;
  }
  return normalizeOverviewProductRows(overviewProductRowsFromPlatformFallback(products, platforms, months));
};

const platformSeriesFromProductRows = (rows, fallbackPlatforms) => {
  const keyed = new Map();
  const addPlatform = (key, label = '') => {
    const normalizedKey = String(key || '').trim().toLowerCase();
    if (!normalizedKey || keyed.has(normalizedKey)) return;
    keyed.set(normalizedKey, {
      key: normalizedKey,
      label: label || toTitleCase(normalizedKey),
      color: getOverviewPlatformColor(normalizedKey, keyed.size)
    });
  };

  rows.forEach((row) => {
    Object.entries(row?.platforms || {}).forEach(([key, value]) => {
      addPlatform(value?.key || key, value?.label);
    });
  });
  (Array.isArray(fallbackPlatforms) ? fallbackPlatforms : []).forEach((platform) => {
    const normalizedPlatform = normalizePlatformMetricRow(platform);
    addPlatform(normalizedPlatform.key, normalizedPlatform.label);
  });
  if (!keyed.size) {
    [
      { key: 'shopee', label: 'Shopee' },
      { key: 'tiktok', label: 'TikTok Shop' },
      { key: 'tokopedia', label: 'Tokopedia' }
    ].forEach((platform) => addPlatform(platform.key, platform.label));
  }

  return Array.from(keyed.values());
};

const normalizeOverviewRollupRow = (row, fallback = {}) => ({
  ...(row || {}),
  ...fallback,
  key: row?.key || fallback.key || '',
  label: row?.label || fallback.label || '-',
  quantity: numberFromFields(row, ['quantity', 'item_count', 'items', 'items_sold', 'units_sold', 'sold_quantity']),
  item_count: numberFromFields(row, ['item_count', 'quantity', 'items', 'items_sold', 'units_sold', 'sold_quantity']),
  net_revenue: numberFromFields(row, ['net_revenue', 'sales', 'revenue', 'net_sales']),
  revenue: numberFromFields(row, ['revenue', 'net_revenue', 'sales', 'net_sales']),
  orders: numberFromFields(row, ['orders', 'order_count']),
  cogs: numberFromFields(row, ['cogs']),
  gross_profit: numberFromFields(row, ['gross_profit'])
});

const normalizeOverviewMonthlyProductRows = (rows, year = new Date().getFullYear()) => (Array.isArray(rows) ? rows : []).map((month, index) => {
  const products = {};
  Object.entries(month?.products || {}).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const normalized = normalizeOverviewRollupRow(value, {
      key,
      label: value?.label || toTitleCase(key)
    });
    products[normalized.key || key] = normalized;
  });
  return {
    ...normalizeOverviewRollupRow(month, {
      key: month?.key || `${year}-${String(index + 1).padStart(2, '0')}`,
      label: month?.label || '-'
    }),
    month: Number(month?.month || index + 1),
    products
  };
});

const productSeriesFromMonthlyRows = (rows) => {
  const keyed = new Map();
  rows.forEach((month) => {
    Object.entries(month?.products || {}).forEach(([key, product]) => {
      const normalizedKey = product?.key || key;
      if (!normalizedKey) return;
      const current = keyed.get(normalizedKey) || {
        key: normalizedKey,
        label: product?.label || toTitleCase(normalizedKey),
        total: 0
      };
      current.total += Number(product?.quantity || product?.item_count || product?.net_revenue || product?.revenue || 0);
      keyed.set(normalizedKey, current);
    });
  });

  return Array.from(keyed.values())
    .sort((left, right) => right.total - left.total)
    .map((series, index) => ({
      key: series.key,
      label: series.label,
      color: getOverviewProductColor(index)
    }));
};

const shouldIncludeSkuProductSeries = (series) => {
  const text = `${series?.key || ''} ${series?.label || ''}`.toLowerCase();
  return !text.includes('sticker');
};

const filterMonthlyProductRowsForChart = (rows, series) => {
  const allowedKeys = new Set(series.map((item) => item.key));
  return rows.map((month) => {
    const products = {};
    Object.entries(month?.products || {}).forEach(([key, product]) => {
      const productKey = product?.key || key;
      if (allowedKeys.has(productKey)) {
        products[productKey] = product;
      }
    });
    return {
      ...month,
      products
    };
  });
};

const overviewVolumeBreakdownGroupRows = (volumeBreakdown, groupKey) => {
  const group = volumeBreakdown?.[groupKey] || Object.values(volumeBreakdown || {}).find((item) => item?.key === groupKey) || null;
  const volumes = Array.isArray(group?.volumes) ? group.volumes : Object.values(group?.volumes || {});
  return volumes.map((row, volumeIndex) => ({
    ...normalizeOverviewRollupRow(row, {
      key: row?.key || `${groupKey}-${volumeIndex}`,
      label: row?.short_label || row?.volume_label || row?.label || `${group?.label || toTitleCase(groupKey)} ${volumeIndex + 1}`
    }),
    label: row?.short_label || row?.volume_label || row?.label || `${group?.label || toTitleCase(groupKey)} ${volumeIndex + 1}`,
    product_key: row?.product_key || group?.key || groupKey,
    product_label: row?.product_label || group?.label || toTitleCase(groupKey),
    volume_label: row?.volume_label || row?.short_label || row?.label || '',
    short_label: row?.short_label || row?.volume_label || row?.label || ''
  }));
};

const drawMultiLineChart = (canvas, items, metric, unitsMap, seriesConfig) => {
  chartRendererState.set(canvas, () => drawMultiLineChart(canvas, items, metric, unitsMap, seriesConfig));
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const padding = { top: 20, right: 18, bottom: 48, left: 92 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const palette = getThemePalette();
  const visibleSeries = seriesConfig.filter((series) => series.visible);
  const maxValue = Math.max(
    1,
    ...visibleSeries.flatMap((series) => items.map((item) => Number(item[series.key]?.[metric] || 0)))
  );
  const hoverColumns = [];
  const activeHover = chartActivePointState.get(canvas) || null;

  bindChartHover(canvas);
  drawGrid(ctx, width, height, padding, maxValue, metric, unitsMap, palette);

  if (!items.length || !visibleSeries.length) {
    chartHoverState.set(canvas, []);
    return;
  }

  visibleSeries.forEach((series) => {
    ctx.strokeStyle = series.color;
    ctx.lineWidth = series.key === 'total' ? 3.5 : 3;
    ctx.beginPath();

    items.forEach((item, index) => {
      const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
      const value = Number(item[series.key]?.[metric] || 0);
      const y = padding.top + chartHeight - ((value / maxValue) * (chartHeight - 6));
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    items.forEach((item, index) => {
      const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
      const value = Number(item[series.key]?.[metric] || 0);
      const y = padding.top + chartHeight - ((value / maxValue) * (chartHeight - 6));
      ctx.fillStyle = series.color;
      ctx.beginPath();
      ctx.arc(x, y, series.key === 'total' ? 4 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (!hoverColumns[index]) {
        const columnSeries = visibleSeries.map((entry) => ({
          key: entry.key,
          label: entry.label,
          color: entry.color,
          value: Number(item[entry.key]?.[metric] || 0)
        }));
        hoverColumns[index] = {
          x,
          y,
          label: item.label || '',
          metric,
          unitsMap,
          hoverKey: `${metric}:${index}`,
          tooltipTitle: item.label || '',
          tooltipLinesHtml: buildTrendTooltipLines(metric, unitsMap, columnSeries),
          hitbox: {
            left: index === 0 ? padding.left : x - (chartWidth / Math.max(items.length - 1, 1) / 2),
            right: index === items.length - 1 ? width - padding.right : x + (chartWidth / Math.max(items.length - 1, 1) / 2),
            top: padding.top,
            bottom: padding.top + chartHeight
          }
        };
      }

      if (index === 0 || index === items.length - 1 || items.length <= 8 || index % Math.ceil(items.length / 6) === 0) {
        ctx.fillStyle = palette.muted;
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label || '', x, height - 16);
      }
    });
  });

  if (activeHover && Number.isFinite(activeHover.x)) {
    drawHoverGuide(ctx, activeHover, padding, chartHeight, HOME_TREND_SERIES.total.color);
  }

  chartHoverState.set(canvas, hoverColumns.filter(Boolean));
};

const drawStackedBarChart = (canvas, items, config) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  bindChartHover(canvas);
  chartRendererState.set(canvas, () => drawStackedBarChart(canvas, items, config));

  const metric = config.metric || 'quantity';
  const groupKey = config.groupKey || 'platforms';
  const sourceItems = Array.isArray(items) ? items : [];
  const padding = { top: 22, right: 18, bottom: 66, left: 58, ...(config.padding || {}) };
  const palette = getThemePalette();
  const chartItems = sourceItems
    .filter((item) => config.includeEmptyItems === true || Number(item?.[metric] || 0) > 0 || Object.values(item?.[groupKey] || {}).some((row) => Number(row?.[metric] || 0) > 0))
    .sort((left, right) => {
      if (config.sortItems === false) return 0;
      const leftRows = Object.values(left?.[groupKey] || {});
      const rightRows = Object.values(right?.[groupKey] || {});
      const leftTotal = leftRows.length ? leftRows.reduce((sum, row) => sum + Number(row?.[metric] || 0), 0) : Number(left?.[metric] || 0);
      const rightTotal = rightRows.length ? rightRows.reduce((sum, row) => sum + Number(row?.[metric] || 0), 0) : Number(right?.[metric] || 0);
      return rightTotal - leftTotal;
    })
    .slice(0, config.limit || 8);
  const series = (Array.isArray(config.series) ? config.series : []).filter((seriesItem) => (
    chartItems.some((item) => Number(item[groupKey]?.[seriesItem.key]?.[metric] || 0) > 0)
  ));
  const totals = chartItems.map((item) => series.reduce((sum, seriesItem) => sum + Number(item[groupKey]?.[seriesItem.key]?.[metric] || 0), 0));
  const maxValue = Math.max(...totals, 1);
  if (config.showGrid !== false) {
    drawGrid(ctx, width, height, padding, maxValue, metric, config.unitsMap || OVERVIEW_METRIC_UNITS, palette);
  }

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const slotWidth = chartWidth / Math.max(chartItems.length, 1);
  const barWidth = slotWidth * (config.barWidthRatio || 0.58);
  const hoverPoints = [];

  if (!chartItems.length || !series.length || maxValue <= 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--admin-muted') || '#9ca3af';
    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.emptyMessage || 'No chart data yet', width / 2, height / 2);
    chartHoverState.set(canvas, []);
    return;
  }

  if (config.showLegend) {
    const sideLegend = config.legendPosition === 'side';
    const legendYStart = sideLegend ? padding.top + 2 : 18;
    const legendGap = 18;
    const legendStartX = sideLegend ? width - padding.right + 18 : padding.left;
    const maxLegendWidth = sideLegend ? Math.max(90, padding.right - 28) : Math.max(160, width - padding.left - padding.right);
    let legendX = legendStartX;
    let legendY = legendYStart;
    ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    series.forEach((seriesItem) => {
      const label = String(seriesItem.label || seriesItem.key || '').slice(0, 24);
      const labelWidth = sideLegend ? maxLegendWidth : ctx.measureText(label).width + 30;
      if (!sideLegend && legendX > legendStartX && legendX + labelWidth > legendStartX + maxLegendWidth) {
        legendX = legendStartX;
        legendY += legendGap;
      }
      ctx.fillStyle = seriesItem.color;
      ctx.beginPath();
      roundedRect(ctx, legendX, legendY - 10, 12, 12, 3);
      ctx.fill();
      ctx.fillStyle = palette.text || getComputedStyle(document.documentElement).getPropertyValue('--admin-text') || '#f3f6f8';
      ctx.fillText(label, legendX + 18, legendY);
      if (sideLegend) {
        legendY += legendGap;
      } else {
        legendX += labelWidth;
      }
    });
  }

  chartItems.forEach((item, index) => {
    const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
    let yCursor = padding.top + chartHeight;
    series.forEach((seriesItem) => {
      const value = Number(item[groupKey]?.[seriesItem.key]?.[metric] || 0);
      const segmentHeight = (value / maxValue) * (chartHeight - 8);
      if (segmentHeight <= 0) return;
      yCursor -= segmentHeight;
      ctx.fillStyle = seriesItem.color;
      ctx.fillRect(x, yCursor, barWidth, segmentHeight);
      hoverPoints.push({
        x: x + barWidth / 2,
        y: yCursor + (segmentHeight / 2),
        label: config.tooltipTitle ? config.tooltipTitle(item) : item.label,
        value,
        metric,
        unitsMap: config.unitsMap || OVERVIEW_METRIC_UNITS,
        hoverKey: `${metric}:${index}:${seriesItem.key}`,
        tooltipTitle: `${item.label || '-'} • ${seriesItem.label}`,
        tooltipValue: formatFullMetricValue(metric, value, config.unitsMap || OVERVIEW_METRIC_UNITS),
        hitbox: {
          left: x,
          right: x + barWidth,
          top: yCursor,
          bottom: yCursor + segmentHeight
        }
      });
    });
    if (config.showXAxisLabels !== false) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--admin-muted') || '#9ca3af';
      ctx.font = config.labelFont || '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(config.label ? config.label(item) : item.label || '-').slice(0, config.labelLength || 18), x + barWidth / 2, height - 16);
    }
  });

  chartHoverState.set(canvas, hoverPoints);
};

const initSlidingChartToggles = (root) => {
  root.querySelectorAll('[data-sliding-chart-toggle]').forEach((toggle) => {
    if (toggle.dataset.slidingToggleReady === 'true') return;

    const indicator = document.createElement('span');
    indicator.className = 'admin-sliding-toggle-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    toggle.prepend(indicator);
    toggle.dataset.slidingToggleReady = 'true';

    let animationFrame = 0;
    const syncIndicator = ({ immediate = false } = {}) => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const buttons = Array.from(toggle.querySelectorAll(':scope > .admin-toggle-pill'));
        const activeButtons = buttons.filter((button) => button.classList.contains('is-active'));
        const activeButton = activeButtons[0] || null;

        buttons.forEach((button) => {
          const isActive = activeButtons.includes(button);
          button.setAttribute('aria-pressed', String(isActive));
          button.tabIndex = isActive || !activeButtons.length ? 0 : -1;
        });

        if (!activeButton) {
          toggle.classList.remove('has-active-toggle');
          return;
        }

        if (immediate) indicator.classList.add('is-positioning');
        const lastActiveButton = activeButtons[activeButtons.length - 1] || activeButton;
        const indicatorWidth = (lastActiveButton.offsetLeft + lastActiveButton.offsetWidth) - activeButton.offsetLeft;
        indicator.style.setProperty('--sliding-toggle-x', `${activeButton.offsetLeft}px`);
        indicator.style.setProperty('--sliding-toggle-width', `${indicatorWidth}px`);
        toggle.classList.add('has-active-toggle');

        if (immediate) {
          indicator.getBoundingClientRect();
          indicator.classList.remove('is-positioning');
        }
      });
    };

    toggle.syncSlidingIndicator = syncIndicator;

    const observer = new MutationObserver(() => syncIndicator());
    toggle.querySelectorAll(':scope > .admin-toggle-pill').forEach((button) => {
      observer.observe(button, { attributes: true, attributeFilter: ['class'] });
    });

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => syncIndicator({ immediate: true }));
      resizeObserver.observe(toggle);
    }

    toggle.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const buttons = Array.from(toggle.querySelectorAll(':scope > .admin-toggle-pill:not(:disabled)'));
      if (!buttons.length) return;

      const currentIndex = Math.max(0, buttons.indexOf(document.activeElement));
      let nextIndex = currentIndex;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = buttons.length - 1;

      event.preventDefault();
      buttons[nextIndex].focus();
      buttons[nextIndex].click();
    });

    window.requestAnimationFrame(() => syncIndicator({ immediate: true }));
  });
};

const drawPieChart = (canvas, items, config) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  bindChartHover(canvas);
  chartRendererState.set(canvas, () => drawPieChart(canvas, items, config));

  const metric = config.metric || 'quantity';
  const visibleItems = items.slice(0, config.limit || 8);
  const rows = visibleItems.filter((item) => Number(item[metric] || 0) > 0);
  const total = rows.reduce((sum, item) => sum + Number(item[metric] || 0), 0);
  const colorForIndex = typeof config.colorForIndex === 'function' ? config.colorForIndex : getOverviewProductColor;
  const drawLegend = () => {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--admin-text') || '#f3f6f8';
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--admin-muted') || '#9ca3af';
    const rowHeight = 28;
    const maxRows = Math.max(1, Math.floor((height - 32) / rowHeight));
    const columns = Math.max(1, Math.ceil(visibleItems.length / maxRows));
    const legendStartX = width < 760 ? width * 0.58 : width * 0.6;
    const columnWidth = Math.max(150, (width - legendStartX - 16) / columns);
    ctx.textAlign = 'left';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    visibleItems.forEach((item, index) => {
      const column = Math.floor(index / maxRows);
      const row = index % maxRows;
      const x = legendStartX + column * columnWidth;
      const y = 28 + row * rowHeight;
      ctx.fillStyle = colorForIndex(index);
      ctx.fillRect(x, y - 12, 14, 14);
      ctx.fillStyle = textColor;
      ctx.fillText(String(item.label || 'Flavor').slice(0, columns > 2 ? 12 : 16), x + 22, y - 2);
      ctx.fillStyle = mutedColor;
      ctx.fillText(formatMetricValue(metric, item[metric] || 0, config.unitsMap || OVERVIEW_METRIC_UNITS), x + 22, y + 11);
    });
  };
  if (!rows.length || total <= 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--admin-muted') || '#9ca3af';
    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.emptyMessage || 'No flavor sales yet', width * 0.31, height / 2);
    drawLegend();
    chartHoverState.set(canvas, []);
    return;
  }

  const cx = width < 640 ? width * 0.32 : width * 0.31;
  const cy = height * 0.5;
  const radius = Math.min(width * 0.3, height * 0.37);
  let start = -Math.PI / 2;
  const hoverPoints = [];
  rows.forEach((item, index) => {
    const value = Number(item[metric] || 0);
    const angle = (value / total) * Math.PI * 2;
    const end = start + angle;
    const startAngle = start;
    const endAngle = end;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colorForIndex(index);
    ctx.fill();
    if (isLightAdminTheme()) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)';
      ctx.stroke();
    }
    const mid = start + angle / 2;
    hoverPoints.push({
      x: cx + Math.cos(mid) * radius * 0.72,
      y: cy + Math.sin(mid) * radius * 0.72,
      left: cx - radius,
      right: cx + radius,
      top: cy - radius,
      bottom: cy + radius,
      label: item.label || 'Flavor',
      value,
      metric,
      unitsMap: config.unitsMap || OVERVIEW_METRIC_UNITS,
      hoverKey: `${metric}:${index}`,
      tooltipValue: `${formatMetricValue(metric, value, config.unitsMap || OVERVIEW_METRIC_UNITS)} • ${Math.round((value / total) * 100)}%`,
      hitTest: (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.hypot(dx, dy) > radius) return false;
        let pointerAngle = Math.atan2(dy, dx);
        if (pointerAngle < -Math.PI / 2) pointerAngle += Math.PI * 2;
        return pointerAngle >= startAngle && pointerAngle <= endAngle;
      }
    });
    start = end;
  });

  drawLegend();

  chartHoverState.set(canvas, hoverPoints);
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-admin-dashboard]');
  if (!root) return;

  bindChartInfoPopovers();
  initSlidingChartToggles(root);

  const themeStorageKey = 'jg-admin-theme';
  const themeCookieMaxAge = 60 * 60 * 24 * 365 * 2;
  const viewStorageKey = 'jg-dashboard-view';
  const themeOptions = ['dark', 'light', 'system'];
  const systemThemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const viewAliases = {
    landing: 'home',
    landing_pages: 'home',
    'landing-pages': 'home',
    campaign: 'home',
    campaigns: 'home',
	    overview: 'overview',
	    executive: 'overview',
	    homepage: 'overview',
	    orders: 'orders',
	    wallet: 'wallet',
	    wallets: 'wallet',
	    daily: 'daily',
	    day: 'daily',
    'daily-report': 'daily',
    ops: 'store-ops',
    'store-ops': 'store-ops',
    store_ops: 'store-ops',
    fulfillment: 'store-ops',
    context: 'context',
    'open-context': 'context',
    hardset: 'hard-set',
    'big-set': 'hard-set'
  };
	  const validViews = new Set(['overview', 'orders', 'wallet', 'daily', 'store-ops', 'context', 'home', 'website', 'hard-set', 'settings']);
  const quickMenuContextByView = {
	    overview: 'overview',
	    daily: 'daily',
	    orders: 'orders',
	    wallet: 'wallet',
	    home: 'campaigns',
    context: 'context',
    website: 'website',
    'hard-set': 'hard-set',
    settings: 'settings'
  };
  const quickMenuByContext = {
	    overview: ['daily', 'orders', 'campaigns', 'back-dash', 'context', 'settings'],
	    daily: ['home', 'orders', 'campaigns', 'back-dash', 'context', 'settings'],
	    orders: ['home', 'daily', 'campaigns', 'back-dash', 'context', 'settings'],
	    wallet: ['home', 'orders', 'daily', 'back-dash', 'settings'],
	    campaigns: ['home', 'orders', 'affiliates', 'back-dash', 'context', 'settings'],
	    context: ['home', 'api', 'back-dash', 'settings'],
	    settings: ['home', 'daily', 'orders', 'campaigns', 'context'],
	    website: ['home', 'daily', 'orders', 'campaigns', 'affiliates', 'settings'],
	    'hard-set': ['home', 'settings']
  };
  const faviconKeyByView = {
	    overview: 'home',
	    daily: 'home',
	    orders: 'orders',
	    wallet: 'wallet',
	    'store-ops': 'orders',
    home: 'campaigns',
    context: 'home',
    website: 'website',
    'hard-set': 'hard-set',
    settings: 'settings'
  };
  const dashboardFaviconAssets = {
    home: {
      light: '/assets/admin-icons/executive-dashboard-favicon-light.svg',
      dark: '/assets/admin-icons/executive-dashboard-favicon-dark.svg'
    },
	    orders: {
	      light: '/assets/admin-icons/favicon-orders-ops-light.svg',
	      dark: '/assets/admin-icons/favicon-orders-ops-dark.svg'
	    },
	    wallet: {
	      light: 'https://api.iconify.design/lucide:wallet.svg?color=%230f172a',
	      dark: 'https://api.iconify.design/lucide:wallet.svg?color=%23ffffff'
	    },
    campaigns: {
      light: '/assets/admin-icons/favicon-campaigns-light.svg',
      dark: '/assets/admin-icons/favicon-campaigns-dark.svg'
    },
    website: {
      light: '/assets/admin-icons/favicon-website-light.svg',
      dark: '/assets/admin-icons/favicon-website-dark.svg'
    },
    'hard-set': {
      light: '/assets/admin-icons/favicon-hard-set-light.svg',
      dark: '/assets/admin-icons/favicon-hard-set-dark.svg'
    },
    settings: {
      light: '/assets/admin-icons/favicon-settings-light.svg',
      dark: '/assets/admin-icons/favicon-settings-dark.svg'
    }
  };
  const normalizeDashboardView = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    const aliased = viewAliases[normalized] || normalized;
    return validViews.has(aliased) ? aliased : 'overview';
  };
  const resolveInitialView = () => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view') || window.location.hash.replace(/^#/, '');
    return normalizeDashboardView(requestedView || window.localStorage.getItem(viewStorageKey));
  };

  const state = {
    activeView: resolveInitialView(),
    timezone: regionalDefaults.timezone,
    requestSequence: 0,
    overview: {
      year: new Date().getFullYear(),
      metric: 'revenue',
      volumeMetric: 'orders',
      hourlyMetric: 'orders',
      productMetric: 'quantity',
      flavorMetric: 'quantity',
      salesRecapOpen: false,
      salesRecapExport: null,
      customRange: {
        active: false,
        startDate: '',
        endDate: '',
        rows: null
      },
      hourlyRows: [],
      hourlyDate: '',
      hourlyRequestToken: 0,
      locationRowKeys: new Set(),
      locationAggregate: null,
      locationSignature: '',
      locationLoadedAt: 0,
      locationMirroredAfter: '',
      locationLoading: false,
      locationError: '',
      locationTruncated: false,
      locationRequestToken: 0,
      locationCacheReady: false,
      locationRenderSignature: '',
      locationMapHtmlByTheme: {},
      locationMapSignatureByTheme: {},
      provinceGeoJson: null,
      provinceMapError: '',
      data: null,
      loadedAt: 0,
      yearControlsSignature: '',
      requestToken: 0
    },
	    orders: {
	      data: null,
	      loadedAt: 0,
      rows: [],
      rowKeys: new Set(),
      catalog: [],
      skuCatalogByCode: {},
      platforms: [],
      monthRanges: [],
      monthsSignature: '',
      activeFiltersSignature: '',
      platformsRenderSignature: '',
      skuTreeSignature: '',
      loadedRangeKeys: new Set(),
      rangeOffsets: {},
      loading: false,
      loadPromise: null,
      loadGeneration: 0,
      loadedAll: false,
      renderLimit: ORDER_RENDER_BATCH_SIZE,
      scrollPending: false,
      ensureRunning: false,
      ensurePending: false,
      activeDateField: 'start',
      calendarMonth: new Date().toISOString().slice(0, 7),
      filters: {
        companies: [],
        products: [],
        flavors: [],
        platforms: [],
        startDate: '',
        endDate: ''
	      },
	      requestToken: 0
	    },
	    wallet: {
	      data: null,
	      loadedAt: 0,
	      mode: 'wallet',
	      loading: false,
	      apiLoading: false,
	      apiQuery: 'Jenang Gemi Shopee Wallet Info',
	      apiResult: null,
	      balanceEditorKey: '',
	      backtrackRunning: false,
	      releaseSyncedAt: 0,
	      releaseSyncPromise: null,
	      backgroundRefreshAt: 0,
	      backgroundRefreshPromise: null,
	      backgroundLoading: false,
	      cacheWrittenAt: 0,
	      usingCache: false,
	      actionId: '',
	      requestToken: 0
	    },
	    daily: {
	      month: getMonthKeyForTimezone(new Date(), regionalDefaults.timezone),
      data: null,
      loadedAt: 0,
      rows: [],
      customPlatforms: [],
      loading: false,
      requestToken: 0
    },
    context: {
      group: '2025',
      periodKey: '2025-01',
      records: {},
      draft: {},
      dirty: false,
      loaded: false,
      requestToken: 0
    },
    home: {
      timeframe: '24h',
      metric: 'views',
      series: {
        bubur: true,
        jamu: true
      },
      data: null,
      loadedAt: 0,
      requestToken: 0
    },
    website: {
      timeframe: '7d',
      metric: 'visitors',
      site: '',
      screen: 'select',
      data: null,
      loadedAt: 0,
      deviceExclusions: [],
      settingsLoadedAt: 0,
      currentDeviceId: ensureAnalyticsDeviceId(),
      requestToken: 0,
      settingsRequestToken: 0
    },
    zeroStore: {
      items: [],
      discounts: [],
      activeDiscountId: '',
      productFilter: '',
      discountSearch: '',
      rangeStart: '',
      rangeEnd: '',
      calendarMonth: new Date().toISOString().slice(0, 7),
      draftStart: '',
      hoverDate: ''
    },
    jenangGemiStore: {
      items: [],
      discounts: [],
      activeDiscountId: ''
    },
    notifications: {
      orders: [],
      metrics: {},
      hardSet: { enabled: false },
      open: false,
      selectedOrderId: '',
      feedback: null
    },
    hardSet: {
      state: { enabled: false },
      readiness: { ready: false, sources: {} },
      access: { branch: false, username: '' },
      audit: [],
      loading: false
    },
    marketplaceRefresh: {
      loading: false,
      lastAutoAttemptAt: 0
    },
    liveSequence: -1,
    liveSource: null
  };

  const endpoint = root.dataset.analyticsEndpoint || './analytics.php';
  const liveEndpoint = root.dataset.liveEndpoint || './live/';
  const settingsEndpoint = root.dataset.settingsEndpoint || './settings/';
  const salesEndpoint = root.dataset.salesEndpoint || './sales/';
  const skuCatalogEndpoint = root.dataset.skuCatalogEndpoint || `${salesEndpoint}?action=sku_catalog`;
  const contextEndpoint = root.dataset.contextEndpoint || './context/';
  const zeroStoreEndpoint = root.dataset.zeroStoreEndpoint || '../api/zero-store/';
  const jenangGemiStoreEndpoint = root.dataset.jenangGemiStoreEndpoint || '../api/jenang-gemi-store/';
	  const websiteOrdersEndpoint = root.dataset.websiteOrdersEndpoint || '../api/website-orders/';
	  const hardSetEndpoint = root.dataset.hardSetEndpoint || '../api/hard-set/';
	  const walletEndpoint = root.dataset.walletEndpoint || '../api/wallet/';
	  const provinceMapUrl = root.dataset.provinceMapUrl || '../assets/data/indonesia-38-provinces.geojson';

  const loader = document.querySelector('[data-admin-loader]');
  const loaderProgress = document.querySelector('[data-admin-loader-progress]');
  const loaderLabel = document.querySelector('[data-admin-loader-label]');
  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');
  const quickMenuItems = Array.from(document.querySelectorAll('[data-quick-menu-key]'));
  const quickMenuItemsByKey = new Map(quickMenuItems.map((item) => [item.getAttribute('data-quick-menu-key'), item]));
  const faviconLinks = Array.from(document.querySelectorAll('[data-admin-favicon]'));
  const viewLabel = document.querySelector('[data-active-view-label]');
  const viewPanels = document.querySelectorAll('[data-view-panel]');
  const viewSwitchButtons = document.querySelectorAll('[data-view-switch]');
  const navLinks = document.querySelectorAll('[data-dashboard-nav-section]');
  const searchShell = document.querySelector('[data-dashboard-search-shell]');
  const searchForm = document.querySelector('[data-dashboard-search-form]');
  const searchInput = document.querySelector('[data-dashboard-search-input]');
  const searchOpenButton = document.querySelector('[data-dashboard-search-open]');
  const searchCloseButton = document.querySelector('[data-dashboard-search-close]');
  const searchResults = document.querySelector('[data-dashboard-search-results]');
  const notificationToggle = document.querySelector('[data-notification-toggle]');
  const notificationCount = document.querySelector('[data-notification-count]');
  const notificationSummary = document.querySelector('[data-notification-summary]');
  const notificationDrawer = document.querySelector('[data-notification-drawer]');
  const notificationClose = document.querySelector('[data-notification-close]');
  const notificationBack = document.querySelector('[data-notification-back]');
  const notificationBackdrop = document.querySelector('[data-notification-backdrop]');
  const notificationMode = document.querySelector('[data-notification-mode]');
  const notificationList = document.querySelector('[data-notification-list]');
  let notificationFeedbackTimer = null;
  let searchFocusTimer = null;

  const overviewRefs = {
    summarySales: document.querySelector('[data-overview-summary-sales]'),
    summaryOrders: document.querySelector('[data-overview-summary-orders]'),
    summaryAov: document.querySelector('[data-overview-summary-aov]'),
    summaryBestMonth: document.querySelector('[data-overview-summary-best-month]'),
    summaryBestMonthMeta: document.querySelector('[data-overview-summary-best-month-meta]'),
    yearSummary: document.querySelector('[data-overview-year-summary]'),
    endpointLabel: document.querySelector('[data-overview-endpoint-label]'),
    trendCanvas: document.querySelector('[data-overview-trend-chart]'),
    ordersCanvas: document.querySelector('[data-overview-orders-chart]'),
    hourlyCanvas: document.querySelector('[data-overview-hourly-chart]'),
    productStackCanvas: document.querySelector('[data-overview-product-stack-chart]'),
    syrupVolumeCanvas: document.querySelector('[data-overview-syrup-volume-chart]'),
    dropsVolumeCanvas: document.querySelector('[data-overview-drops-volume-chart]'),
    accountStackCanvas: document.querySelector('[data-overview-account-stack-chart]'),
    syrupFlavorCanvas: document.querySelector('[data-overview-syrup-flavor-chart]'),
    dropsFlavorCanvas: document.querySelector('[data-overview-drops-flavor-chart]'),
    buburFlavorCanvas: document.querySelector('[data-overview-bubur-flavor-chart]'),
    locationMap: document.querySelector('[data-overview-location-map]'),
    locationStatus: document.querySelector('[data-overview-location-status]'),
    locationList: document.querySelector('[data-overview-location-list]'),
    trendTitle: document.querySelector('[data-overview-trend-title]'),
    trendMeta: document.querySelector('[data-overview-trend-meta]'),
    hourlyTitle: document.querySelector('[data-overview-hourly-title]'),
    hourlyMeta: document.querySelector('[data-overview-hourly-meta]'),
    rangeShell: document.querySelector('[data-overview-range-shell]'),
    rangeToggle: document.querySelector('[data-overview-range-toggle]'),
    rangePopover: document.querySelector('[data-overview-range-popover]'),
    rangeReset: document.querySelector('[data-overview-range-reset]'),
    rangeGrid: document.querySelector('[data-overview-range-grid]'),
    rangeMonth: document.querySelector('[data-overview-range-month]'),
    rangePrev: document.querySelector('[data-overview-range-prev]'),
    rangeNext: document.querySelector('[data-overview-range-next]'),
    refreshButton: document.querySelector('[data-overview-refresh]'),
    refreshLabel: document.querySelector('[data-overview-refresh-label]'),
    lastUpdated: document.querySelector('[data-overview-last-updated]'),
    tableBody: document.querySelector('[data-overview-table-body]'),
    notes: document.querySelector('[data-overview-notes]'),
    yearControls: document.querySelector('[data-overview-year-controls]'),
    yearSelect: document.querySelector('[data-overview-year-select]'),
    salesRecapToggle: document.querySelector('[data-sales-recap-toggle]'),
    salesRecap: document.querySelector('[data-sales-recap]'),
    salesRecapTitle: document.querySelector('[data-sales-recap-title]'),
    salesRecapMeta: document.querySelector('[data-sales-recap-meta]'),
    salesRecapHead: document.querySelector('[data-sales-recap-head]'),
    salesRecapBody: document.querySelector('[data-sales-recap-body]'),
    salesRecapCopy: document.querySelector('[data-sales-recap-copy]'),
    salesRecapDownload: document.querySelector('[data-sales-recap-download]'),
    salesRecapClose: document.querySelector('[data-sales-recap-close]'),
    metricButtons: document.querySelectorAll('[data-overview-metric]'),
    volumeMetricButtons: document.querySelectorAll('[data-overview-volume-metric]'),
    hourlyMetricButtons: document.querySelectorAll('[data-overview-hourly-metric]'),
    productMetricButtons: document.querySelectorAll('[data-overview-product-metric]'),
    flavorMetricButtons: document.querySelectorAll('[data-overview-flavor-metric]')
  };
	  const ordersEndpoint = root.dataset.ordersEndpoint || '../api/orders/';
	  const ordersRefs = {
    tableBody: document.querySelector('[data-orders-table-body]'),
    scroll: document.querySelector('[data-orders-scroll]'),
    status: document.querySelector('[data-orders-status]'),
    loadMore: document.querySelector('[data-orders-load-more]'),
    filterOpen: document.querySelector('[data-orders-filter-open]'),
    filterReset: document.querySelector('[data-orders-filter-reset]'),
    activeFilters: document.querySelector('[data-orders-active-filters]'),
    filterModal: document.querySelector('[data-orders-filter-modal]'),
    filterCloseButtons: document.querySelectorAll('[data-orders-filter-close]'),
    filterClear: document.querySelector('[data-orders-filter-clear]'),
    companyTree: document.querySelector('[data-orders-company-tree]'),
    platforms: document.querySelector('[data-orders-platforms]'),
    startLabel: document.querySelector('[data-orders-start-label]'),
    endLabel: document.querySelector('[data-orders-end-label]'),
    dateToggleButtons: document.querySelectorAll('[data-orders-date-toggle]'),
    datePopover: document.querySelector('[data-orders-date-popover]'),
    dateGrid: document.querySelector('[data-orders-date-grid]'),
    dateMonth: document.querySelector('[data-orders-date-month]'),
    datePrev: document.querySelector('[data-orders-date-prev]'),
	    dateNext: document.querySelector('[data-orders-date-next]')
	  };
	  const walletRefs = {
	    status: document.querySelector('[data-wallet-status]'),
	    tableMeta: document.querySelector('[data-wallet-table-meta]'),
	    balance: document.querySelector('[data-wallet-total-balance]'),
	    outstanding: document.querySelector('[data-wallet-total-outstanding]'),
	    released: document.querySelector('[data-wallet-total-released]'),
	    modeButtons: document.querySelectorAll('[data-wallet-mode]'),
	    refresh: document.querySelector('[data-wallet-refresh]'),
	    backtrack: document.querySelector('[data-wallet-backtrack]'),
	    walletPanel: document.querySelector('[data-wallet-wallet-panel]'),
	    apiPanel: document.querySelector('[data-wallet-api-panel]'),
	    apiInput: document.querySelector('[data-wallet-api-input]'),
	    apiRun: document.querySelector('[data-wallet-api-run]'),
	    apiCopy: document.querySelector('[data-wallet-api-copy]'),
	    apiOutput: document.querySelector('[data-wallet-api-output]'),
	    tableBody: document.querySelector('[data-wallet-table-body]')
	  };
	  const dailyRefs = {
    monthInput: document.querySelector('[data-daily-month]'),
    status: document.querySelector('[data-daily-status]'),
    exportButton: document.querySelector('[data-daily-export]'),
    sheetHead: document.querySelector('[data-daily-sheet-head]'),
    sheetBody: document.querySelector('[data-daily-sheet-body]'),
    sheetFoot: document.querySelector('[data-daily-sheet-foot]'),
    platformForm: document.querySelector('[data-daily-platform-form]'),
    platformName: document.querySelector('[data-daily-platform-name]'),
    platformList: document.querySelector('[data-daily-platform-list]')
  };
  const contextRefs = {
    groupButtons: document.querySelectorAll('[data-context-group]'),
    periods: document.querySelector('[data-context-periods]'),
    form: document.querySelector('[data-context-form]'),
    fields: document.querySelectorAll('[data-context-field]'),
    periodTitle: document.querySelector('[data-context-period-title]'),
    status: document.querySelector('[data-context-status]'),
    save: document.querySelector('[data-context-save]'),
    error: document.querySelector('[data-context-error]'),
    progress: document.querySelector('[data-context-progress-bar]')
  };

  const homeRefs = {
    summaryViews: document.querySelector('[data-home-summary-total-views]'),
    summaryOrder: document.querySelector('[data-home-summary-order-clicks]'),
    summaryCheckout: document.querySelector('[data-home-summary-checkout-clicks]'),
    summaryTime: document.querySelector('[data-home-summary-time-spent]'),
    urlTableBody: document.querySelector('[data-home-url-table-body]'),
    sourceTableBody: document.querySelector('[data-home-source-table-body]'),
    recentEvents: document.querySelector('[data-home-recent-events]'),
    endpointLabel: document.querySelector('[data-home-endpoint-label]'),
    sourceCanvas: document.querySelector('[data-home-source-chart]'),
    urlCanvas: document.querySelector('[data-home-url-chart]'),
    trendCanvas: document.querySelector('[data-home-trend-chart]'),
    hourCanvas: document.querySelector('[data-home-hour-chart]'),
    sourceLegend: document.querySelector('[data-home-source-legend]'),
    productCartRundown: document.querySelector('[data-home-product-cart-rundown]'),
    productCartMeta: document.querySelector('[data-home-product-cart-meta]'),
    lastUpdated: document.querySelector('[data-home-last-updated]'),
    trendTitle: document.querySelector('[data-home-trend-title]'),
    trendMeta: document.querySelector('[data-home-trend-meta]'),
    timeframeButtons: document.querySelectorAll('[data-home-timeframe]'),
    metricButtons: document.querySelectorAll('[data-home-metric]'),
    seriesButtons: document.querySelectorAll('[data-home-series]')
  };

  const websiteRefs = {
    header: document.querySelector('[data-website-header]'),
    selector: document.querySelector('[data-website-selector]'),
    detail: document.querySelector('[data-website-detail]'),
    openButtons: document.querySelectorAll('[data-website-open]'),
    backButtons: document.querySelectorAll('[data-website-back]'),
    heroChip: document.querySelector('[data-website-hero-chip]'),
    heroTitle: document.querySelector('[data-website-hero-title]'),
    heroCopy: document.querySelector('[data-website-hero-copy]'),
    summaryVisitors: document.querySelector('[data-website-summary-total-visitors]'),
    summaryPageViews: document.querySelector('[data-website-summary-page-views]'),
    summaryAddToCart: document.querySelector('[data-website-summary-add-to-cart]'),
    summaryCheckout: document.querySelector('[data-website-summary-checkout]'),
    summaryTime: document.querySelector('[data-website-summary-time-spent]'),
    summaryTopRegion: document.querySelector('[data-website-summary-top-region]'),
    paidOrders: document.querySelector('[data-website-paid-orders]'),
    paidQuantity: document.querySelector('[data-website-paid-quantity]'),
    paidRevenue: document.querySelector('[data-website-paid-revenue]'),
    excludedCount: document.querySelector('[data-website-excluded-ip-count]'),
    settingsEndpointLabel: document.querySelector('[data-website-settings-endpoint]'),
    trendCanvas: document.querySelector('[data-website-trend-chart]'),
    lastUpdated: document.querySelector('[data-website-last-updated]'),
    trendTitle: document.querySelector('[data-website-trend-title]'),
    trendMeta: document.querySelector('[data-website-trend-meta]'),
    scopeNote: document.querySelector('[data-website-scope-note]'),
    timeframeButtons: document.querySelectorAll('[data-website-timeframe]'),
    metricButtons: document.querySelectorAll('[data-website-metric]'),
    currentDeviceId: document.querySelector('[data-current-device-id]'),
    currentDeviceLabel: document.querySelector('[data-current-device-label]'),
    ignoreCurrentDeviceButton: document.querySelector('[data-ignore-current-device]'),
    deviceExclusionForm: document.querySelector('[data-device-exclusion-form]'),
    deviceExclusionError: document.querySelector('[data-device-exclusion-error]'),
    deviceExclusionList: document.querySelector('[data-device-exclusion-list]')
  };

  const regionalRefs = {
    form: document.querySelector('[data-regional-defaults-form]'),
    controls: document.querySelectorAll('[data-regional-setting]'),
    previewDate: document.querySelector('[data-regional-preview-date]'),
    previewCurrency: document.querySelector('[data-regional-preview-currency]')
  };

  const zeroStoreRefs = {
    panel: document.querySelector('[data-zero-store-panel]'),
    itemForm: document.querySelector('[data-zero-item-form]'),
    itemTable: document.querySelector('[data-zero-item-table]'),
    productFilter: document.querySelector('[data-zero-product-filter]'),
    discountForm: document.querySelector('[data-zero-discount-form]'),
    discountList: document.querySelector('[data-zero-discount-list]'),
    discountSearch: document.querySelector('[data-zero-discount-search]'),
    skuPicker: document.querySelector('[data-zero-discount-sku-picker]'),
    error: document.querySelector('[data-zero-store-error]'),
    resetDiscount: document.querySelector('[data-zero-discount-reset]'),
    rangeStart: document.querySelector('[data-zero-discount-start]'),
    rangeEnd: document.querySelector('[data-zero-discount-end]'),
    rangeLabel: document.querySelector('[data-zero-discount-range-label]'),
    calendarToggle: document.querySelector('[data-zero-discount-calendar-toggle]'),
    calendar: document.querySelector('[data-zero-discount-calendar]'),
    calendarMonth: document.querySelector('[data-zero-discount-month]'),
    calendarGrid: document.querySelector('[data-zero-discount-calendar-grid]'),
    calendarPrev: document.querySelector('[data-zero-discount-month-prev]'),
    calendarNext: document.querySelector('[data-zero-discount-month-next]')
  };

  const jenangGemiStoreRefs = {
    panel: document.querySelector('[data-jenang-gemi-store-panel]'),
    itemForm: document.querySelector('[data-jg-item-form]'),
    itemTable: document.querySelector('[data-jg-item-table]'),
    error: document.querySelector('[data-jg-store-error]'),
    discountForm: document.querySelector('[data-jg-discount-form]'),
    discountItems: document.querySelector('[data-jg-discount-items]'),
    discountList: document.querySelector('[data-jg-discount-list]'),
    discountReset: document.querySelector('[data-jg-discount-reset]')
  };

  const hardSetRefs = {
    state: document.querySelector('[data-hard-set-state]'),
    activation: document.querySelector('[data-hard-set-activation]'),
    explanation: document.querySelector('[data-hard-set-explanation]'),
    switchButton: document.querySelector('[data-hard-set-switch]'),
    switchLabel: document.querySelector('[data-hard-set-switch-label]'),
    switchNote: document.querySelector('[data-hard-set-switch-note]'),
    readiness: document.querySelector('[data-hard-set-readiness]'),
    audit: document.querySelector('[data-hard-set-audit]'),
    access: document.querySelector('[data-hard-set-access]'),
    accessTitle: document.querySelector('[data-hard-set-access-title]'),
    accessNote: document.querySelector('[data-hard-set-access-note]'),
    accessForm: document.querySelector('[data-hard-set-unlock-form]'),
    accessError: document.querySelector('[data-hard-set-access-error]'),
    dialog: document.querySelector('[data-hard-set-dialog]'),
    form: document.querySelector('[data-hard-set-form]'),
    cancel: document.querySelector('[data-hard-set-cancel]'),
    error: document.querySelector('[data-hard-set-error]')
  };

  let orderPopover = null;
  const closeOrderPopover = () => {
    if (!orderPopover) return;
    orderPopover.remove();
    orderPopover = null;
  };

  const openOrderPopover = (button, value) => {
    closeOrderPopover();
    orderPopover = document.createElement('div');
    orderPopover.className = 'admin-order-popover';
    orderPopover.textContent = value;
    document.body.appendChild(orderPopover);
    const rect = button.getBoundingClientRect();
    const popoverRect = orderPopover.getBoundingClientRect();
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - popoverRect.width - 12);
    const top = Math.min(Math.max(12, rect.bottom + 8), window.innerHeight - popoverRect.height - 12);
    orderPopover.style.left = `${left}px`;
    orderPopover.style.top = `${top}px`;
  };

  const setLoaderState = (progress, label) => {
    if (loaderProgress) loaderProgress.style.width = `${Math.max(8, Math.min(progress, 100))}%`;
    if (loaderLabel && label) loaderLabel.textContent = label;
  };

  const normalizeSearchText = (value) => String(value || '').trim().toLowerCase();

  const setSearchOpen = (open, { focus = false } = {}) => {
    if (!searchShell) return;
    searchShell.classList.toggle('is-search-open', open);
    searchOpenButton?.setAttribute('aria-expanded', open ? 'true' : 'false');
    searchOpenButton?.setAttribute('aria-label', open ? 'Search dashboard' : 'Open dashboard search');
    if (open) closeMenu();
    if (searchFocusTimer) {
      window.clearTimeout(searchFocusTimer);
      searchFocusTimer = null;
    }
    if (open && focus && searchInput) {
      searchFocusTimer = window.setTimeout(() => {
        searchInput.focus();
        searchFocusTimer = null;
      }, 220);
    }
  };

  const hideSearchResults = () => {
    if (searchResults) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
    }
    searchShell?.classList.remove('is-open');
  };

  const closeSearchResults = ({ clear = false, collapse = true } = {}) => {
    if (clear && searchInput) searchInput.value = '';
    hideSearchResults();
    if (collapse) setSearchOpen(false);
  };

  const scoreSearchEntry = (entry, tokens) => {
    const title = normalizeSearchText(entry.title);
    const section = normalizeSearchText(entry.section);
    const description = normalizeSearchText(entry.description);
    const url = normalizeSearchText(entry.url);
    const keywords = Array.isArray(entry.keywords) ? entry.keywords.map(normalizeSearchText) : [];
    let score = 0;
    for (const token of tokens) {
      if (!token) continue;
      if (title.includes(token)) score += 6;
      if (section.includes(token)) score += 3;
      if (description.includes(token)) score += 2;
      if (url.includes(token)) score += 2;
      if (keywords.some((keyword) => keyword.includes(token))) score += 4;
    }
    return score;
  };

  const getJenangGemiSearchResults = (query) => {
    const normalized = normalizeSearchText(query);
    if (!normalized) return [];
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const staticResults = JENANG_GEMI_SEARCH_INDEX
      .map((entry) => ({ ...entry, score: scoreSearchEntry(entry, tokens) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    const dynamicResults = /[a-z0-9._-]*\d[a-z0-9._-]*/i.test(normalized) && normalized.length >= 5
      ? [{
          title: `Search Store Ops for "${query.trim()}"`,
          section: 'Admin',
          description: 'Open Store Ops fulfillment logs filtered to this order ID.',
          url: `../dashboard/?view=store-ops&q=${encodeURIComponent(query.trim())}`,
          view: 'store-ops',
          score: 7
        }]
      : [];
    return [...dynamicResults, ...staticResults].slice(0, 8);
  };

  const renderJenangGemiSearchResults = (query) => {
    if (!searchResults) return [];
    const results = getJenangGemiSearchResults(query);
    if (!normalizeSearchText(query)) {
      hideSearchResults();
      return [];
    }

    setSearchOpen(true);
    searchShell?.classList.add('is-open');
    searchResults.hidden = false;

    if (!results.length) {
      searchResults.innerHTML = '<div class="admin-search-empty">No matching dashboard pages found.</div>';
      return [];
    }

    searchResults.innerHTML = results.map((result, index) => `
      <a class="admin-search-result" href="${escapeHtml(result.url)}" data-search-result-index="${index}"${result.view ? ` data-search-view="${escapeHtml(result.view)}"` : ''}>
        <strong>${escapeHtml(result.title)}</strong>
        <span>${escapeHtml(result.section)}</span>
        <small>${escapeHtml(result.description)}</small>
      </a>
    `).join('');

    return results;
  };

  const setupTopbarMenu = () => {
    menuTrigger?.addEventListener('click', () => {
      if (menuPanel?.hidden === false) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuShell && !menuShell.contains(target)) closeMenu();
      if (searchShell && !searchShell.contains(target)) closeSearchResults();
      if (orderPopover && !orderPopover.contains(target)) closeOrderPopover();
      if (overviewRefs.rangeShell && !overviewRefs.rangeShell.contains(target)) closeOverviewRangePopover();
    });

    document.querySelectorAll('[data-dashboard-view-link]').forEach((link) => {
      link.addEventListener('click', async (event) => {
        const view = link.getAttribute('data-dashboard-view-link') || 'home';
        window.localStorage.setItem(viewStorageKey, view);
        if (!(link instanceof HTMLAnchorElement) || !view || link.target) return;
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        let targetUrl;
        try {
          targetUrl = new URL(link.href, window.location.href);
        } catch (_error) {
          return;
        }

        const currentUrl = new URL(window.location.href);
        const normalizePath = (path) => String(path || '').replace(/\/(?:index\.php)?$/i, '') || '/';
        const isSameDashboard =
          targetUrl.origin === currentUrl.origin &&
          normalizePath(targetUrl.pathname) === normalizePath(currentUrl.pathname);
        if (!isSameDashboard) return;

        event.preventDefault();
        await switchView(view);
      });
    });

    searchForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!searchShell?.classList.contains('is-search-open')) {
        setSearchOpen(true, { focus: true });
        return;
      }
      const [firstResult] = renderJenangGemiSearchResults(searchInput?.value || '');
      if (firstResult?.url) {
        navigateSearchResult(firstResult);
      }
    });

    searchOpenButton?.addEventListener('click', () => {
      setSearchOpen(true, { focus: true });
      if (searchInput?.value.trim()) renderJenangGemiSearchResults(searchInput.value);
    });

    searchCloseButton?.addEventListener('click', () => {
      closeSearchResults({ clear: true });
    });

    searchInput?.addEventListener('input', () => {
      renderJenangGemiSearchResults(searchInput.value || '');
    });

    searchInput?.addEventListener('focus', () => {
      setSearchOpen(true);
      if (searchInput.value.trim()) renderJenangGemiSearchResults(searchInput.value);
    });

    searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSearchResults({ clear: true });
      }
    });

    searchResults?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('[data-search-result-index]');
      if (!(link instanceof HTMLAnchorElement)) return;
      const result = getJenangGemiSearchResults(searchInput?.value || '')[Number(link.dataset.searchResultIndex || -1)];
      if (!result) return;
      event.preventDefault();
      navigateSearchResult(result);
    });
  };

  const finishLoader = () => {
    setLoaderState(100, 'Dashboard ready');
    window.requestAnimationFrame(() => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      if (loader) window.setTimeout(() => loader.remove(), 500);
    });
  };

  const waitForInitialViewReveal = (refreshPromise, options = {}) => {
    const minimumDelay = wait(options.rendered ? INITIAL_VIEW_LOADER_CACHED_MS : INITIAL_VIEW_LOADER_MIN_MS);
    if (options.rendered) return minimumDelay;
    const refresh = refreshPromise && typeof refreshPromise.then === 'function'
      ? refreshPromise
      : Promise.resolve(false);
    return Promise.race([
      Promise.allSettled([refresh, minimumDelay]),
      wait(INITIAL_VIEW_LOADER_MAX_MS)
    ]);
  };

  const normalizeThemePreference = (theme) => {
    if (theme === 'minimal-white' || theme === 'classic-white' || theme === 'light') return 'light';
    if (theme === 'minimal-black' || theme === 'prism' || theme === 'dark') return 'dark';
    if (theme === 'system') return 'system';
    return 'dark';
  };

  const resolveThemePreference = (theme) => {
    const preference = normalizeThemePreference(theme);
    if (preference !== 'system') return preference;
    return systemThemeQuery?.matches ? 'light' : 'dark';
  };

  const readThemeCookie = () => {
    const escapedKey = themeStorageKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedKey}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  };

  const writeThemeCookie = (theme) => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${themeStorageKey}=${encodeURIComponent(theme)}; Path=/; SameSite=Lax; Max-Age=${themeCookieMaxAge}${secure}`;
  };

  const readStoredTheme = () => {
    try {
      return normalizeThemePreference(window.localStorage.getItem(themeStorageKey) || readThemeCookie());
    } catch (_error) {
      return normalizeThemePreference(readThemeCookie());
    }
  };

  const writeStoredTheme = (theme) => {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch (_error) {
      // Cookies keep the device preference when localStorage is unavailable.
    }
    writeThemeCookie(theme);
  };

  const getNextTheme = () => {
    const currentPreference = normalizeThemePreference(document.documentElement.dataset.adminThemeMode || readStoredTheme());
    const currentIndex = themeOptions.indexOf(currentPreference);
    return themeOptions[(currentIndex + 1) % themeOptions.length];
  };

  const syncThemeControls = (preference) => {
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const isActive = button.dataset.themeOption === preference;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const applyTheme = (theme) => {
    const preference = normalizeThemePreference(theme);
    const resolvedTheme = resolveThemePreference(preference);
    document.documentElement.dataset.adminTheme = resolvedTheme;
    document.documentElement.dataset.adminThemeMode = preference;
    writeStoredTheme(preference);
    syncThemeControls(preference);
    invalidateThemePalette();
    renderCachedCharts();
    renderOverviewLocationHeatmap();
  };

  const requestJson = async (url, options = {}) => {
    const { timeoutMs = 20000, ...fetchOptions } = options;
    const controller = timeoutMs > 0 && !fetchOptions.signal && window.AbortController ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', ...(options.headers || {}) },
        credentials: 'same-origin',
        cache: fetchOptions.cache || 'default',
        ...fetchOptions,
        ...(controller ? { signal: controller.signal } : {})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const requestError = new Error(payload.error || `HTTP ${response.status}`);
        requestError.status = response.status;
        requestError.payload = payload;
        throw requestError;
      }
      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timed out.');
      }
      throw error;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const websiteOrderActionUrl = (action) => {
    const url = new URL(websiteOrdersEndpoint, window.location.href);
    url.searchParams.set('action', action);
    url.searchParams.set('_ts', String(Date.now()));
    return url.toString();
  };

  const websiteMetricForSelectedSite = () => {
    const platform = state.website.site === 'zero' ? 'zero_website' : 'jenang_gemi_website';
    return state.notifications.metrics?.[platform] || {};
  };

  const renderWebsitePaidMetrics = () => {
    const metrics = websiteMetricForSelectedSite();
    if (websiteRefs.paidOrders) websiteRefs.paidOrders.textContent = formatRegionalInteger(metrics.paid_orders);
    if (websiteRefs.paidQuantity) websiteRefs.paidQuantity.textContent = formatRegionalInteger(metrics.paid_quantity);
    if (websiteRefs.paidRevenue) websiteRefs.paidRevenue.textContent = formatCurrency(metrics.net_revenue || 0);
  };

  const notificationItemLabel = (item) => [item.product_name, item.option_name, item.size_label]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' · ');

  const notificationOrderItemCount = (order) => (Array.isArray(order?.items) ? order.items : [])
    .reduce((total, item) => total + Number(item.quantity || 0), 0);

  const notificationRelativeTime = (value) => {
    const timestamp = new Date(value || '').getTime();
    if (!Number.isFinite(timestamp)) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const selectedNotificationOrder = () => state.notifications.orders
    .find((order) => order.order_id === state.notifications.selectedOrderId) || null;

  const notificationResultMarkup = (feedback) => {
    const submitted = feedback?.type === 'submitted';
    return `
      <div class="admin-notification-result" role="status">
        <span class="admin-notification-result-icon${submitted ? ' is-submitted' : ''}">
          <svg viewBox="0 0 24 24" aria-hidden="true">${submitted ? '<path d="m5 12 4 4L19 6"/>' : '<path d="M6 6l12 12M18 6 6 18"/>'}</svg>
        </span>
        <h3>${escapeHtml(feedback?.title || '')}</h3>
        <p>${escapeHtml(feedback?.message || '')}</p>
      </div>
    `;
  };

  const notificationListMarkup = (orders) => orders.map((order, index) => {
    const itemCount = notificationOrderItemCount(order);
    const customer = order.customer || {};
    return `
      <button type="button" class="admin-notification-order-row" data-notification-select="${escapeHtml(order.order_id)}" style="--notification-index:${index}">
        <span class="admin-notification-user-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/></svg>
        </span>
        <span class="admin-notification-order-copy">
          <span class="admin-notification-customer"><strong>${escapeHtml(customer.name || 'Website customer')}</strong><i></i></span>
          <small>${formatCurrency(order.net_revenue || 0)} · ${itemCount} item${itemCount === 1 ? '' : 's'}</small>
          <em>${escapeHtml(order.platform_label || order.platform || 'Website')} checkout → WhatsApp</em>
        </span>
        <span class="admin-notification-row-time">${escapeHtml(notificationRelativeTime(order.created_at))}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></span>
      </button>
    `;
  }).join('');

  const notificationDetailMarkup = (order) => {
    const isPending = order.status === 'PENDING_PAYMENT';
    const canFulfill = order.status === 'AWAITING_FULFILLMENT_SETUP' && order.era === 'STORE_OPS_ELIGIBLE';
    const readyToPublish = canFulfill && order.has_label && Number(order.deadline_hours || 0) >= 1;
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = notificationOrderItemCount(order);
    const customer = order.customer || {};
    if (canFulfill) {
      const deadline = Number(order.deadline_hours || 24);
      return `
        <article class="admin-notification-detail admin-notification-fulfillment" data-notification-order="${escapeHtml(order.order_id)}">
          <div class="admin-notification-paid-banner">
            <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>
            <div><strong>Payment confirmed</strong><small>Upload the shipping label and set the deadline.</small></div>
          </div>
          <label class="admin-notification-dropzone${order.has_label ? ' has-file' : ''}" data-notification-dropzone>
            <input type="file" accept="application/pdf,.pdf" data-notification-label hidden>
            <span class="admin-notification-upload-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">${order.has_label ? '<path d="M7 3h7l4 4v14H7zM14 3v5h5M10 13h5M10 17h5"/>' : '<path d="M12 16V5M8 9l4-4 4 4M5 15v4h14v-4"/>'}</svg>
            </span>
            <strong>${escapeHtml(order.has_label ? (order.label_original_name || 'Shipping label.pdf') : 'Drop shipping label PDF')}</strong>
            <small>${order.has_label ? 'PDF shipping label attached' : 'or click to choose from device · 10 MB max'}</small>
          </label>
          <div class="admin-notification-deadline">
            <div><span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Store Ops deadline</span><strong data-notification-deadline-value>${deadline}h</strong></div>
            <input type="range" min="1" max="48" value="${deadline}" data-notification-deadline>
            <small><span>1 hour</span><span>48 hours max</span></small>
          </div>
          ${order.publication_error ? `<p class="admin-order-publication-error">${escapeHtml(order.publication_error)}</p>` : ''}
          <button type="button" class="admin-notification-submit" data-notification-action="${order.publication_error ? 'retry_publish' : 'publish'}" ${readyToPublish ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-6 16-2-6zM12 14l4-6"/></svg>
            ${order.publication_error ? 'Retry Store Ops' : 'Send to Store Ops'}
          </button>
        </article>
      `;
    }

    return `
      <article class="admin-notification-detail" data-notification-order="${escapeHtml(order.order_id)}">
        <div class="admin-notification-order-card">
          <div class="admin-notification-order-identity">
            <span class="admin-notification-package-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 8-4 8 4-8 4zM4 8v9l8 4 8-4V8M12 12v9"/></svg></span>
            <div><small>${escapeHtml(order.order_id)}</small><h3>${escapeHtml(customer.name || 'Website customer')}</h3><p>${escapeHtml(customer.phone || customer.address || '')}</p></div>
          </div>
          <div class="admin-notification-order-stats">
            <div><small>Order total</small><strong>${formatCurrency(order.net_revenue || 0)}</strong></div>
            <div><small>Items</small><strong>${itemCount}</strong></div>
          </div>
          <div class="admin-notification-line-items">${items.map((item) => `<div><span>${escapeHtml(notificationItemLabel(item))}</span><strong>× ${Number(item.quantity || 0)}</strong><small>${escapeHtml(item.sku || '')}</small></div>`).join('')}</div>
          <div class="admin-notification-warning">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19zM12 9v5M12 17h.01"/></svg>
            <p>This order came through WhatsApp, so payment cannot be verified automatically. Confirm payment before Store Ops receives it.</p>
          </div>
        </div>
        ${isPending ? `
          <div class="admin-notification-actions">
            <button type="button" data-notification-action="remove">Remove</button>
            <button type="button" class="is-primary" data-notification-action="paid">Paid</button>
          </div>
        ` : ''}
      </article>
    `;
  };

  const renderNotifications = () => {
    const orders = state.notifications.orders;
    const hardSetEnabled = Boolean(state.notifications.hardSet?.enabled);
    if (notificationCount) {
      notificationCount.hidden = orders.length === 0;
      notificationCount.textContent = orders.length > 99 ? '99+' : String(orders.length);
    }
    if (notificationSummary) {
      notificationSummary.textContent = orders.length
        ? `${orders.length} WhatsApp order${orders.length === 1 ? '' : 's'} pending`
        : 'No website orders pending';
    }
    const selected = selectedNotificationOrder();
    if (state.notifications.selectedOrderId && !selected && !state.notifications.feedback) {
      state.notifications.selectedOrderId = '';
    }
    const detailOrder = selectedNotificationOrder();
    if (notificationBack) notificationBack.hidden = !detailOrder;
    if (notificationMode) {
      notificationMode.textContent = detailOrder
        ? (detailOrder.status === 'AWAITING_FULFILLMENT_SETUP' ? 'Attach the label and deadline.' : 'Review the WhatsApp order.')
        : hardSetEnabled
          ? 'Verify payment before Store Ops receives it.'
          : 'Verify payment. Store Ops stays isolated while Hard Set is off.';
    }
    if (!notificationList) return;
    if (state.notifications.feedback) {
      notificationList.innerHTML = notificationResultMarkup(state.notifications.feedback);
      renderWebsitePaidMetrics();
      return;
    }
    if (detailOrder) {
      notificationList.innerHTML = notificationDetailMarkup(detailOrder);
      renderWebsitePaidMetrics();
      return;
    }
    if (!orders.length) {
      notificationList.innerHTML = '<div class="admin-notification-empty"><span>✓</span><strong>All caught up</strong><p>No actionable website orders.</p></div>';
      renderWebsitePaidMetrics();
      return;
    }
    notificationList.innerHTML = notificationListMarkup(orders);
    renderWebsitePaidMetrics();
  };

  const loadNotifications = async () => {
    const data = await requestJson(websiteOrderActionUrl('notifications'));
    state.notifications.orders = Array.isArray(data.orders) ? data.orders : [];
    state.notifications.metrics = data.metrics || {};
    state.notifications.hardSet = data.hard_set || { enabled: false };
    renderNotifications();
  };

  const setNotificationOpen = (open) => {
    state.notifications.open = open;
    notificationDrawer?.classList.toggle('is-open', open);
    notificationDrawer?.setAttribute('aria-hidden', open ? 'false' : 'true');
    notificationToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (notificationBackdrop) notificationBackdrop.hidden = !open;
    document.body.classList.toggle('admin-notifications-open', open);
    if (open) {
      window.setTimeout(() => notificationClose?.focus(), 120);
    } else if (notificationDrawer?.contains(document.activeElement)) {
      notificationToggle?.focus();
    }
  };

  const postWebsiteOrderAction = async (action, orderId, extra = {}) => {
    await requestJson(websiteOrderActionUrl(action), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, ...extra }),
      timeoutMs: action.includes('publish') ? 25000 : 20000
    });
    await loadNotifications();
  };

  const showNotificationFeedback = (feedback) => {
    if (notificationFeedbackTimer) window.clearTimeout(notificationFeedbackTimer);
    state.notifications.selectedOrderId = '';
    state.notifications.feedback = feedback;
    renderNotifications();
    notificationFeedbackTimer = window.setTimeout(() => {
      state.notifications.feedback = null;
      notificationFeedbackTimer = null;
      renderNotifications();
    }, 1300);
  };

  const appendNotificationError = (container, error) => {
    container?.querySelector('.admin-order-publication-error.is-client')?.remove();
    const message = document.createElement('p');
    message.className = 'admin-order-publication-error is-client';
    message.textContent = error?.message || 'Unable to update this order.';
    container?.appendChild(message);
  };

  const uploadNotificationLabel = async (orderId, file, container) => {
    if (!(file instanceof File)) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      appendNotificationError(container, new Error('Choose a PDF shipping label.'));
      return;
    }
    const form = new FormData();
    form.set('order_id', orderId);
    form.set('label', file);
    try {
      await requestJson(websiteOrderActionUrl('upload_label'), { method: 'POST', body: form, headers: {}, timeoutMs: 30000 });
      await loadNotifications();
    } catch (error) {
      appendNotificationError(container, error);
    }
  };

  const renderHardSet = () => {
    const hardSet = state.hardSet.state || {};
    const readiness = state.hardSet.readiness || {};
    const enabled = Boolean(hardSet.enabled);
    const hasBranchAccess = Boolean(state.hardSet.access?.branch);
    const formatHardSetTimestamp = (primaryValue, fallbackValue = '') => {
      const raw = String(primaryValue || '').trim();
      if (!raw) return fallbackValue;
      const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
      const date = new Date(normalized.includes('+') || normalized.endsWith('Z') ? normalized : `${normalized}Z`);
      if (Number.isNaN(date.getTime())) return fallbackValue || raw;
      return `${formatDashboardTime(date, state.timezone, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })} ${getTimezoneLabel(state.timezone)}`;
    };
    if (hardSetRefs.state) hardSetRefs.state.textContent = enabled ? 'ON · LOCKED' : 'OFF';
    if (hardSetRefs.activation) {
      hardSetRefs.activation.textContent = enabled
        ? `${formatHardSetTimestamp(hardSet.activated_at_iso || hardSet.activated_at, hardSet.activated_at_wib || '')} · ${hardSet.activated_by || 'Unknown actor'}`
        : 'No cutover timestamp has been recorded.';
    }
    hardSetRefs.switchButton?.classList.toggle('is-on', enabled);
    hardSetRefs.switchButton?.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    if (hardSetRefs.switchButton) hardSetRefs.switchButton.disabled = enabled || !readiness.ready || !hasBranchAccess || state.hardSet.loading;
    if (hardSetRefs.switchLabel) hardSetRefs.switchLabel.textContent = enabled ? 'ON · LOCKED' : 'OFF';
    if (hardSetRefs.switchNote) {
      hardSetRefs.switchNote.textContent = enabled
        ? 'The cutover is permanent. There is no disable operation in the UI or API.'
        : !hasBranchAccess
          ? 'Branch-tier credentials are required before the physical switch can be used.'
          : readiness.ready ? 'Ready. Activation permanently establishes the server cutover timestamp.' : 'All readiness checks must pass. Activation cannot be undone.';
    }
    if (hardSetRefs.access) {
      hardSetRefs.access.hidden = enabled;
      hardSetRefs.access.classList.toggle('is-unlocked', hasBranchAccess);
    }
    if (hardSetRefs.accessForm) hardSetRefs.accessForm.hidden = enabled || hasBranchAccess;
    if (hardSetRefs.accessTitle) hardSetRefs.accessTitle.textContent = hasBranchAccess ? 'Branch tier unlocked' : 'Unlock activation controls';
    if (hardSetRefs.accessNote) {
      hardSetRefs.accessNote.textContent = hasBranchAccess
        ? `${state.hardSet.access.username || 'Branch'} is authorized to operate the permanent switch.`
        : 'Use the same Branch username and password as the SKU Database.';
    }
    if (hardSetRefs.explanation) {
      hardSetRefs.explanation.textContent = enabled
        ? 'Only website orders created after the recorded activation timestamp can enter Store Ops. Earlier orders remain manual-era permanently.'
        : 'Website order notifications and paid metrics are live. Store Ops remains isolated until this switch is permanently activated.';
    }
    if (hardSetRefs.readiness) {
      const sources = readiness.sources || {};
      hardSetRefs.readiness.innerHTML = ['zero_website', 'jenang_gemi_website'].map((source) => {
        const group = sources[source] || { label: source, ready: false, checks: [] };
        return `<article class="admin-panel">
          <div class="admin-panel-head"><div><span class="admin-panel-kicker">Readiness</span><h3>${escapeHtml(group.label || source)}</h3></div><span class="admin-panel-meta">${group.ready ? 'READY' : 'BLOCKED'}</span></div>
          <div class="admin-readiness-list">${(group.checks || []).map((check) => `<div class="admin-readiness-row${check.ready ? ' is-ready' : ''}"><i></i><span><strong>${escapeHtml(check.label)}</strong><small>${escapeHtml(check.detail)}</small></span></div>`).join('')}</div>
        </article>`;
      }).join('');
    }
    if (hardSetRefs.audit) {
      const audit = state.hardSet.audit || [];
      hardSetRefs.audit.innerHTML = audit.length ? audit.map((event) => `<div class="admin-note-card"><strong>${escapeHtml(event.event_type)}</strong><span>${escapeHtml(formatHardSetTimestamp(event.created_at_iso || event.created_at, event.created_at_wib || ''))}</span><small>${escapeHtml(event.actor || '')}</small></div>`).join('') : '<p class="admin-empty">No activation event. Hard Set is OFF.</p>';
    }
  };

  const loadHardSet = async () => {
    const data = await requestJson(`${hardSetEndpoint}?_ts=${Date.now()}`);
    state.hardSet.state = data.state || { enabled: false };
    state.hardSet.readiness = data.readiness || { ready: false, sources: {} };
    state.hardSet.access = data.access || { branch: false, username: '' };
    state.hardSet.audit = Array.isArray(data.audit) ? data.audit : [];
    state.notifications.hardSet = state.hardSet.state;
    renderHardSet();
    renderNotifications();
  };

  const setJenangGemiStoreError = (message = '') => {
    if (!jenangGemiStoreRefs.error) return;
    jenangGemiStoreRefs.error.hidden = !message;
    jenangGemiStoreRefs.error.textContent = message;
  };

  const renderJenangGemiStore = () => {
    const items = state.jenangGemiStore.items;
    if (jenangGemiStoreRefs.itemTable) {
      jenangGemiStoreRefs.itemTable.innerHTML = items.length ? items.map((item) => `<tr>
        <td><code>${escapeHtml(item.sku || '')}</code></td><td>${escapeHtml(item.product_name || '')}</td><td>${escapeHtml(item.option_name || '')}</td><td>${escapeHtml(item.size_label || '')}</td>
        <td>${item.stock === null ? 'Unlinked' : formatRegionalInteger(item.stock)}</td><td>${item.cogs === null ? '—' : formatCurrency(item.cogs)}</td><td>${formatCurrency(item.price || 0)}</td>
        <td>${item.is_active && item.sku_linked && Number(item.stock) > 0 ? 'Active' : 'Disabled'}</td><td><button type="button" class="admin-soft-btn" data-jg-edit-item="${escapeHtml(item.item_key)}">Edit</button></td>
      </tr>`).join('') : '<tr><td colspan="9" class="admin-empty">No Jenang Gemi SKU DB products found.</td></tr>';
    }
    if (jenangGemiStoreRefs.discountItems) {
      jenangGemiStoreRefs.discountItems.innerHTML = `<span class="admin-control-label">Included SKUs</span>${items.map((item) => `<label class="admin-store-sku-option"><input type="checkbox" name="item_keys" value="${escapeHtml(item.item_key)}"><span><strong>${escapeHtml(item.sku || 'Unlinked')}</strong> ${escapeHtml(notificationItemLabel(item))}</span></label>`).join('')}`;
    }
    if (jenangGemiStoreRefs.discountList) {
      const discounts = state.jenangGemiStore.discounts;
      jenangGemiStoreRefs.discountList.innerHTML = discounts.length ? discounts.map((discount) => `<div class="admin-note-card"><strong>${escapeHtml(discount.name)}</strong><span>${escapeHtml(discount.discount_type)} ${formatRegionalNumber(discount.amount)} · ${escapeHtml(discount.starts_on)} to ${escapeHtml(discount.ends_on)}</span><small>${(discount.item_keys || []).map(escapeHtml).join(', ')}</small><div class="admin-inline-actions"><button type="button" class="admin-soft-btn" data-jg-edit-discount="${Number(discount.id)}">Edit</button><button type="button" class="admin-danger-btn" data-jg-delete-discount="${Number(discount.id)}">Delete</button></div></div>`).join('') : '<p class="admin-empty">No Jenang Gemi discounts yet.</p>';
    }
  };

  const loadJenangGemiStore = async () => {
    const data = await requestJson(`${jenangGemiStoreEndpoint}?action=list&_ts=${Date.now()}`);
    state.jenangGemiStore.items = Array.isArray(data.items) ? data.items : [];
    state.jenangGemiStore.discounts = Array.isArray(data.discounts) ? data.discounts : [];
    renderJenangGemiStore();
    setJenangGemiStoreError('');
  };

  const renderRows = (items, emptyColspan, formatter, emptyMessage = 'Belum ada data.') => {
    if (!items.length) {
      return `<tr><td colspan="${emptyColspan}" class="admin-empty">${escapeHtml(emptyMessage)}</td></tr>`;
    }
    return items.map(formatter).join('');
  };

  const contextMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const contextPeriods = {
    2025: contextMonthNames.map((label, index) => ({
      key: `2025-${String(index + 1).padStart(2, '0')}`,
      short: label.slice(0, 3),
      title: `${label} 2025`
    })),
    '2026-months': contextMonthNames.slice(0, 4).map((label, index) => ({
      key: `2026-${String(index + 1).padStart(2, '0')}`,
      short: label.slice(0, 3),
      title: `${label} 2026`
    })),
    '2026-may': Array.from({ length: 19 }, (_, index) => ({
      key: `2026-05-${String(index + 1).padStart(2, '0')}`,
      short: String(index + 1),
      title: `May ${index + 1}, 2026`
    }))
  };
  const contextMetricKeys = ['revenue', 'gross_profit', 'orders_qty', 'items_qty'];
  const contextFormatInput = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const number = Number(String(value).replace(/[^\d-]/g, ''));
    return Number.isFinite(number) ? formatRegionalNumber(number) : '';
  };
  const contextParseInput = (value) => {
    const normalized = String(value || '').replace(/[^\d-]/g, '');
    if (normalized === '' || normalized === '-') return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? Math.round(number) : null;
  };
  const currentContextPeriods = () => contextPeriods[state.context.group] || contextPeriods[2025];
  const contextRecordFor = (periodKey) => state.context.draft[periodKey] || state.context.records[periodKey] || {};
  const contextRecordComplete = (periodKey) => contextMetricKeys.every((key) => contextRecordFor(periodKey)[key] !== null && contextRecordFor(periodKey)[key] !== undefined);

  const setContextError = (message = '') => {
    if (!contextRefs.error) return;
    contextRefs.error.hidden = !message;
    contextRefs.error.textContent = message;
  };

  const renderContextProgress = () => {
    const allPeriods = Object.values(contextPeriods).flat();
    const complete = allPeriods.filter((period) => contextRecordComplete(period.key)).length;
    const percentage = allPeriods.length ? (complete / allPeriods.length) * 100 : 0;
    if (contextRefs.progress) contextRefs.progress.style.width = `${percentage}%`;
    if (contextRefs.status && !state.context.dirty) {
      contextRefs.status.textContent = `${complete} of ${allPeriods.length} complete`;
    }
  };

  const renderContextEditor = () => {
    const periods = currentContextPeriods();
    if (!periods.some((period) => period.key === state.context.periodKey)) {
      state.context.periodKey = periods[0]?.key || '2025-01';
    }
    const activePeriod = periods.find((period) => period.key === state.context.periodKey) || periods[0];
    const record = contextRecordFor(state.context.periodKey);

    contextRefs.groupButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.contextGroup === state.context.group);
    });
    if (contextRefs.periods) {
      contextRefs.periods.innerHTML = periods.map((period) => `
        <button type="button" class="admin-context-period${period.key === state.context.periodKey ? ' is-active' : ''}${contextRecordComplete(period.key) ? ' is-complete' : ''}" data-context-period="${period.key}">
          <span>${escapeHtml(period.short)}</span>
          <i aria-hidden="true"></i>
        </button>
      `).join('');
    }
    if (contextRefs.periodTitle && activePeriod) contextRefs.periodTitle.textContent = activePeriod.title;
    contextRefs.fields.forEach((input) => {
      const key = input.dataset.contextField || '';
      input.value = contextFormatInput(record[key]);
    });
    if (contextRefs.save) contextRefs.save.disabled = !state.context.dirty;
    renderContextProgress();
  };

  const setContextGroup = (group) => {
    if (!contextPeriods[group]) return;
    state.context.group = group;
    state.context.periodKey = contextPeriods[group][0].key;
    renderContextEditor();
  };

  const updateContextDraft = (field, rawValue) => {
    const periodKey = state.context.periodKey;
    const current = { ...contextRecordFor(periodKey) };
    current[field] = contextParseInput(rawValue);
    state.context.draft[periodKey] = current;
    state.context.dirty = true;
    if (contextRefs.status) contextRefs.status.textContent = 'Unsaved changes';
    if (contextRefs.save) contextRefs.save.disabled = false;
    renderContextProgress();
  };

  const renderContextData = (data) => {
    const records = Array.isArray(data.records) ? data.records : [];
    state.context.records = records.reduce((map, row) => {
      if (row?.period_key) {
        map[row.period_key] = contextMetricKeys.reduce((record, key) => {
          record[key] = row[key] === null || row[key] === undefined ? null : Number(row[key]);
          return record;
        }, {});
      }
      return map;
    }, {});
    state.context.draft = {};
    state.context.dirty = false;
    state.context.loaded = true;
    setContextError('');
    renderContextEditor();
  };

  const loadContext = async () => {
    const requestToken = beginRequest('context');
    const data = await requestJson(`${contextEndpoint}?_ts=${Date.now()}`);
    if (!isLatestRequest('context', requestToken)) return;
    renderContextData(data);
  };

  const saveContext = async () => {
    if (!state.context.dirty) return;
    setContextError('');
    if (contextRefs.save) contextRefs.save.disabled = true;
    if (contextRefs.status) contextRefs.status.textContent = 'Saving...';
    try {
      const records = Object.entries(state.context.draft).map(([periodKey, values]) => ({
        period_key: periodKey,
        ...contextMetricKeys.reduce((record, key) => {
          record[key] = values[key] ?? null;
          return record;
        }, {})
      }));
      const data = await requestJson(contextEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      renderContextData(data);
      if (contextRefs.status) contextRefs.status.textContent = 'Saved to C1';
      await loadOverviewSafely({ forceRefresh: true });
    } catch (error) {
      if (contextRefs.status) contextRefs.status.textContent = 'Save failed';
      if (contextRefs.save) contextRefs.save.disabled = false;
      setContextError(error.message || 'Unable to save context.');
    }
  };

  const renderEventFeed = (container, items, formatter, emptyMessage) => {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }
    container.innerHTML = items.map(formatter).join('');
  };

  const getFeedForView = (view) => {
    if (view === 'overview') return overviewRefs.notes;
    return homeRefs.recentEvents;
  };

	  const renderViewError = (view, error) => {
	    if (view === 'website') {
	      if (websiteRefs.trendMeta) {
	        websiteRefs.trendMeta.textContent = `Unable to load website analytics: ${error?.message || 'Unknown error'}`;
	      }
	      return;
	    }
	    if (view === 'wallet') {
	      const message = error?.message || 'Unable to load wallets.';
	      if (walletRefs.status) walletRefs.status.textContent = message;
	      if (walletRefs.tableBody) walletRefs.tableBody.innerHTML = `<tr><td colspan="6" class="admin-empty">${escapeHtml(message)}</td></tr>`;
	      if (walletRefs.apiOutput) walletRefs.apiOutput.textContent = JSON.stringify({ ok: false, error: message }, null, 2);
	      return;
	    }
	    const container = getFeedForView(view);
    if (view === 'home') {
      renderProductCartRundown(homeRefs.productCartRundown, homeRefs.productCartMeta, { items: [], total_cart_events: 0 });
    }
    renderEventFeed(
      container,
      [],
      () => '',
      `Gagal memuat dashboard: ${error?.message || 'Unknown error'}`
    );
  };

  const renderSourceLegend = (items) => {
    if (!homeRefs.sourceLegend) return;
    homeRefs.sourceLegend.innerHTML = items.map((item) => {
      const source = String(item.source || 'unknown').toLowerCase();
      const color = SOURCE_COLORS[source] || SOURCE_COLORS.unknown;
      return `
        <div class="admin-legend-item">
          <span class="admin-legend-swatch" style="background:${color};"></span>
          <strong>${escapeHtml(toTitleCase(item.source || 'unknown'))}</strong>
          <span>${formatRegionalInteger(item.views)} views</span>
        </div>
      `;
    }).join('');
  };

  const normalizeProductCartItems = (productCart) => {
    const rawItems = Array.isArray(productCart?.items) ? productCart.items : [];
    const keyedItems = new Map(rawItems.map((item) => [String(item.product_key || '').toLowerCase(), item]));
    const items = ['bubur', 'jamu'].map((key) => {
      const source = keyedItems.get(key) || {};
      const count = Number(source.cart_events ?? source.add_to_cart_events ?? source.order_now_clicks ?? 0);
      return {
        key,
        label: source.label || PRODUCT_CART_SERIES[key].label,
        color: PRODUCT_CART_SERIES[key].color,
        count: Number.isFinite(count) ? Math.max(0, count) : 0,
        share: Number(source.share ?? 0)
      };
    });
    const total = Number(productCart?.total_cart_events) || items.reduce((sum, item) => sum + item.count, 0);

    return items.map((item) => ({
      ...item,
      share: total > 0 ? Math.round(((item.count / total) * 100) * 10) / 10 : 0
    }));
  };

  const renderProductCartRundown = (container, metaTarget, productCart, emptyMessage = 'Belum ada data.') => {
    if (!container) return;
    const items = normalizeProductCartItems(productCart);
    const total = Number(productCart?.total_cart_events) || items.reduce((sum, item) => sum + item.count, 0);
    const sourceMetric = String(productCart?.source_metric || 'add_to_cart_events');
    if (metaTarget) {
      metaTarget.textContent = total > 0
        ? `${formatRegionalInteger(total)} ${sourceMetric === 'order_now_clicks' ? 'cart intents' : 'cart adds'}`
        : 'No cart adds';
    }

    if (!productCart && total <= 0) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="admin-product-cart-row admin-product-cart-row-${escapeHtml(item.key)}" style="--cart-share:${item.share}%; --cart-color:${item.color};">
        <div class="admin-product-cart-row-head">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${formatRegionalNumber(item.share, { maximumFractionDigits: 1 })}%</span>
        </div>
        <div class="admin-product-cart-track" aria-hidden="true"><i></i></div>
        <small>${formatRegionalInteger(item.count)} of ${formatRegionalInteger(total)}</small>
      </div>
    `).join('');
  };

  const setLastUpdated = (target, isoString) => {
    if (!target) return;
    const date = isoString ? new Date(isoString) : new Date();
    target.textContent = `Updated ${formatDashboardTime(date, state.timezone, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} ${getTimezoneLabel(state.timezone)}`;
  };

  const syncQuickMenuItems = () => {
    if (!menuPanel || !quickMenuItems.length) return;
    const menuContext = quickMenuContextByView[state.activeView] || 'overview';
    const orderedKeys = quickMenuByContext[menuContext] || quickMenuByContext.overview;

    quickMenuItems.forEach((item) => {
      if (item instanceof HTMLElement) item.hidden = true;
    });

    orderedKeys.forEach((key) => {
      const item = quickMenuItemsByKey.get(key);
      if (!(item instanceof HTMLElement)) return;
      item.hidden = false;
      menuPanel.appendChild(item);
    });
  };

  const syncFavicons = () => {
    if (!faviconLinks.length) return;
    const faviconKey = faviconKeyByView[state.activeView] || 'home';
    const assets = dashboardFaviconAssets[faviconKey] || dashboardFaviconAssets.home;
    faviconLinks.forEach((link) => {
      if (!(link instanceof HTMLLinkElement)) return;
      const scheme = link.dataset.adminFavicon;
      if (scheme && assets[scheme]) link.href = assets[scheme];
    });
  };

  const syncViewState = () => {
    const labels = {
	    overview: 'Home',
	    orders: 'Orders',
	    wallet: 'Wallet',
	    daily: 'Daily',
      'store-ops': 'Ops',
      context: 'Open Context',
      home: 'Campaigns Dashboard',
      website: 'Official Website Dashboard',
      'hard-set': 'Hard Set',
      settings: 'Settings'
    };
    const navSectionByView = {
	    overview: 'home',
	    orders: 'orders',
	    wallet: 'wallet',
	    daily: '',
      'store-ops': 'orders',
      context: 'home',
      home: 'campaigns',
      website: 'website',
      'hard-set': 'hard-set',
      settings: 'settings'
    };
    if (root) root.dataset.activeView = state.activeView;
    viewPanels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.viewPanel === state.activeView);
    });
    viewSwitchButtons.forEach((button) => {
      const isActive = button.dataset.viewSwitch === state.activeView;
      button.classList.toggle('is-active', isActive);
      if (isActive) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
    navLinks.forEach((link) => {
      const navSection = link.getAttribute('data-dashboard-nav-section');
      const isActive = navSection === navSectionByView[state.activeView];
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    if (viewLabel) {
      viewLabel.textContent = labels[state.activeView] || 'Dashboard';
    }
    syncQuickMenuItems();
    syncFavicons();
    window.requestAnimationFrame(() => {
      root.querySelectorAll('[data-sliding-chart-toggle]').forEach((toggle) => {
        if (typeof toggle.syncSlidingIndicator === 'function') {
          toggle.syncSlidingIndicator({ immediate: true });
        }
      });
    });
    window.localStorage.setItem(viewStorageKey, state.activeView);
  };

  const inactiveViewUnloadTimers = new Map();

  const cancelDeferredViewUnload = (view) => {
    const timer = inactiveViewUnloadTimers.get(view);
    if (!timer) return;
    window.clearTimeout(timer);
    inactiveViewUnloadTimers.delete(view);
  };

  const clearInactiveCanvas = (canvas, view) => {
    if (!(canvas instanceof HTMLCanvasElement) || state.activeView === view) return;
    chartRendererState.delete(canvas);
    chartHoverState.delete(canvas);
    chartActivePointState.delete(canvas);
    hideChartTooltip(canvas);
    const context = canvas.getContext('2d');
    if (context) context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const inactiveViewDomNodes = (view) => {
    if (view === 'overview') {
      return [
        overviewRefs.tableBody,
        overviewRefs.notes
      ].filter(Boolean);
    }
	    if (view === 'home') {
	      return [
	        homeRefs.urlTableBody,
        homeRefs.sourceTableBody,
        homeRefs.recentEvents,
        homeRefs.sourceLegend
	      ].filter(Boolean);
	    }
	    if (view === 'wallet') {
	      return [
	        walletRefs.tableBody
	      ].filter(Boolean);
	    }
	    return [];
	  };

  const unloadInactiveViewRenderState = (view) => {
    inactiveViewUnloadTimers.delete(view);
    if (state.activeView === view) return;
    const panel = Array.from(viewPanels).find((candidate) => candidate.dataset.viewPanel === view);
    const canvases = panel ? Array.from(panel.querySelectorAll('canvas')) : [];
    canvases.forEach((canvas, index) => {
      window.setTimeout(() => clearInactiveCanvas(canvas, view), index * INACTIVE_VIEW_UNLOAD_STEP_MS);
    });
    inactiveViewDomNodes(view).forEach((node, index) => {
      window.setTimeout(() => {
        if (state.activeView !== view) node.replaceChildren();
      }, (canvases.length + index) * INACTIVE_VIEW_UNLOAD_STEP_MS);
    });
  };

  const scheduleDeferredViewUnload = (view) => {
    if (!['overview', 'home', 'wallet'].includes(view) || state.activeView === view) return;
    cancelDeferredViewUnload(view);
    const delay = view === 'wallet' ? BACKGROUND_TASK_DELAY_MS : INACTIVE_VIEW_UNLOAD_DELAY_MS;
    inactiveViewUnloadTimers.set(view, window.setTimeout(() => {
      unloadInactiveViewRenderState(view);
    }, delay));
  };

  const closeMenu = () => {
    if (!menuPanel || !menuTrigger) return;
    menuPanel.hidden = true;
    menuTrigger.setAttribute('aria-expanded', 'false');
    menuTrigger.setAttribute('aria-label', 'Open dashboard menu');
  };

  const openMenu = () => {
    if (!menuPanel || !menuTrigger) return;
    closeSearchResults();
    menuPanel.hidden = false;
    menuTrigger.setAttribute('aria-expanded', 'true');
    menuTrigger.setAttribute('aria-label', 'Close dashboard menu');
  };

  const buildAnalyticsUrl = (dataset, timeframe, options = {}) => {
    const params = new URLSearchParams({
      timeframe,
      timezone: state.timezone,
      recent_limit: '120',
      dataset
    });
    if (dataset === 'website') {
      params.set('site', state.website.site || 'jenang_gemi');
    }
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    return `${endpoint}?${params.toString()}`;
  };

  const buildSalesUrl = (year, options = {}) => {
    const params = new URLSearchParams({
      year: String(year)
    });
    if (options.manualRefresh) {
      params.set('action', 'refresh');
    } else if (options.refresh) {
      params.set('refresh', '1');
    }
    if (options.cacheBust || options.refresh || options.manualRefresh) params.set('_ts', String(Date.now()));
    return `${salesEndpoint}?${params.toString()}`;
  };
  const buildOrderFactsUrl = (startDate, endDate, options = {}) => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    if (options.lightweight) {
      params.set('lightweight', '1');
    }
    if (options.storedOnly) {
      params.set('stored_only', '1');
    }
    if (options.repair) {
      params.set('repair', '1');
    }
    if (options.mirroredAfter) {
      params.set('mirrored_after', String(options.mirroredAfter));
    }
    const limit = Number(options.limit || 0);
    if (Number.isFinite(limit) && limit > 0) {
      params.set('limit', String(Math.floor(limit)));
    }
    const offset = Number(options.offset || 0);
    if (Number.isFinite(offset) && offset > 0) {
      params.set('offset', String(Math.floor(offset)));
    }
    return `${ordersEndpoint}?${params.toString()}`;
  };
  const requestOrderFacts = (startDate, endDate, options = {}) => requestJson(buildOrderFactsUrl(startDate, endDate, options));
  const buildOrderLocationSummaryUrl = (startDate, endDate, options = {}) => {
    const params = new URLSearchParams({
      action: 'location_summary',
      start_date: startDate,
      end_date: endDate
    });
    if (options.refresh || options.force || options.repair) params.set('refresh', '1');
    if (options.cacheBust || options.refresh || options.force || options.repair) params.set('_ts', String(Date.now()));
    return `${ordersEndpoint}?${params.toString()}`;
  };
  const requestOrderLocationSummary = (startDate, endDate, options = {}) => requestJson(buildOrderLocationSummaryUrl(startDate, endDate, options));
  const dashboardDateKey = (date = new Date(), timezone = state.timezone) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
  const todayDate = () => dashboardDateKey(new Date());
  const offsetDate = (dateValue, offsetDays) => {
    const date = new Date(`${dateValue}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return dashboardDateKey(date);
  };
  const defaultOrderDatesFor = (today) => {
    return { start: offsetDate(today, -1), end: today };
  };
  const defaultOrderDates = () => defaultOrderDatesFor(todayDate());

  let activeLocalDate = todayDate();
  state.overview.year = Number(activeLocalDate.slice(0, 4)) || state.overview.year;

  const overviewCacheKey = (year, localDate = activeLocalDate) => `${OVERVIEW_CACHE_PREFIX}:${year}:${localDate}`;

  const readOverviewCache = (year) => {
    try {
      const cached = window.localStorage.getItem(overviewCacheKey(year));
      return cached ? JSON.parse(cached) : null;
    } catch (_error) {
      return null;
    }
  };

  const writeOverviewCache = (year, data) => {
    try {
      const cacheKey = overviewCacheKey(year);
      window.localStorage.setItem(cacheKey, JSON.stringify(data));
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(`${OVERVIEW_CACHE_PREFIX}:`) && key !== cacheKey) {
          window.localStorage.removeItem(key);
        }
      }
    } catch (_error) {
      // Cache is only a first-paint optimization; live signals and rollover checks fetch fresh data.
    }
  };

  const homeCacheKey = (timeframe = state.home.timeframe, timezone = state.timezone, localDate = activeLocalDate) => (
    `${HOME_CACHE_PREFIX}:${timeframe}:${timezone}:${localDate}`
  );

  const readHomeCache = () => {
    try {
      const cached = window.localStorage.getItem(homeCacheKey());
      return cached ? JSON.parse(cached) : null;
    } catch (_error) {
      return null;
    }
  };

  const writeHomeCache = (data) => {
    if (!data || typeof data !== 'object') return;
    try {
      const cacheKey = homeCacheKey();
      window.localStorage.setItem(cacheKey, JSON.stringify(data));
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(`${HOME_CACHE_PREFIX}:`) && key !== cacheKey) {
          window.localStorage.removeItem(key);
        }
      }
    } catch (_error) {
      // Home cache is only a first-paint optimization; the analytics API stays authoritative.
    }
  };

  const isBrowserOnline = () => !('onLine' in navigator) || navigator.onLine;

  const readWalletCache = () => {
    try {
      const cached = JSON.parse(window.localStorage.getItem(WALLET_CACHE_STORAGE_KEY) || '{}');
      if (!cached || typeof cached !== 'object' || !cached.data || typeof cached.data !== 'object') return null;
      return {
        savedAt: Math.max(0, Number(cached.saved_at || 0)),
        data: cached.data
      };
    } catch (_error) {
      return null;
    }
  };

  const writeWalletCache = (data, options = {}) => {
    if (!data || typeof data !== 'object' || data.ok === false) return;
    const now = Date.now();
    if (!options.force && now - Number(state.wallet.cacheWrittenAt || 0) < WALLET_CACHE_WRITE_MIN_MS) return;
    try {
      window.localStorage.setItem(WALLET_CACHE_STORAGE_KEY, JSON.stringify({
        saved_at: now,
        data
      }));
      state.wallet.cacheWrittenAt = now;
    } catch (_error) {
      // Wallet cache is only for fast/offline first paint; the API remains the source of truth.
    }
  };

  const applyDefaultOrderDates = () => {};

  const normalizeOrderFilterValue = (value) => String(value || '').trim().toLowerCase();

  const compactOrderFilterValue = (value) => normalizeOrderFilterValue(value).replace(/[^a-z0-9]+/g, '');

  const orderFiltersSignature = () => {
    const filters = state.orders.filters;
    return [
      filters.companies.join('\u001f'),
      filters.products.join('\u001f'),
      filters.flavors.join('\u001f'),
      filters.platforms.join('\u001f'),
      filters.startDate || '',
      filters.endDate || ''
    ].join('\u001e');
  };

  const createOrderFilterMatchList = (items) => ({
    normalized: items.map(normalizeOrderFilterValue).filter(Boolean),
    compact: items.map(compactOrderFilterValue).filter(Boolean)
  });

  const createOrderFilterSnapshot = () => {
    const filters = state.orders.filters;
    return {
      companies: createOrderFilterMatchList(filters.companies),
      products: createOrderFilterMatchList(filters.products),
      flavors: createOrderFilterMatchList(filters.flavors),
      platforms: new Set(filters.platforms.map(normalizeOrderFilterValue).filter(Boolean)),
      startDate: filters.startDate || '',
      endDate: filters.endDate || ''
    };
  };

  const orderFilterMatchesAny = (filter, values) => {
    if (!filter.normalized.length && !filter.compact.length) return true;
    return values.some((value) => {
      const normalized = normalizeOrderFilterValue(value);
      const compact = compactOrderFilterValue(value);
      return normalized && filter.normalized.some((item) => normalized === item || normalized.includes(item) || item.includes(normalized))
        || compact && filter.compact.some((item) => compact === item || compact.includes(item) || item.includes(compact));
    });
  };

  const skuCatalogRecordForOrder = (row) => {
    const candidates = [
      row?.sku,
      row?.marketplace_sku,
      row?.item_key
    ].map((value) => String(value || '').trim()).filter(Boolean);
    for (const candidate of candidates) {
      const direct = state.orders.skuCatalogByCode[normalizeOrderFilterValue(candidate)];
      if (direct) return direct;
      const compact = state.orders.skuCatalogByCode[compactOrderFilterValue(candidate)];
      if (compact) return compact;
    }
    return null;
  };

  const orderCompanyValues = (row) => {
    const sku = skuCatalogRecordForOrder(row) || {};
    return [
      row?.brand_name,
      sku.brand_name,
      row?.company,
      row?.account_key,
      row?.product_name,
      row?.marketplace_product_name
    ];
  };

  const orderProductValues = (row) => {
    const sku = skuCatalogRecordForOrder(row) || {};
    return [
      row?.base_product_name,
      row?.product_type,
      sku.product_name,
      row?.product_name,
      row?.marketplace_product_name,
      row?.sku,
      row?.marketplace_sku,
      row?.item_key
    ];
  };

  const orderFlavorValues = (row) => {
    const sku = skuCatalogRecordForOrder(row) || {};
    return [
      row?.flavor_name,
      row?.flavor,
      sku.flavor_name,
      row?.product_name,
      row?.marketplace_product_name,
      row?.sku,
      row?.marketplace_sku,
      row?.item_key
    ];
  };

  const orderLocalDate = (row) => {
    if (typeof row?._orderLocalDate === 'string' && row?._orderLocalTimezone === state.timezone) return row._orderLocalDate;
    const date = parseOrderTimestamp(row?.order_create_time || row?.timestamp);
    return date ? dashboardDateKey(date) : '';
  };

  const uniqueOrderRowKey = (row) => [
    row?.platform || '',
    row?.account_key || '',
    row?.order_id || '',
    row?.sku || '',
    row?.item_key || '',
    row?.product_name || ''
  ].join('|');

  const enrichOrderRow = (row) => {
    const date = parseOrderTimestamp(row?.order_create_time || row?.timestamp);
    return {
      ...row,
      _orderRowKey: uniqueOrderRowKey(row),
      _orderTimestamp: date?.getTime() || 0,
      _orderLocalDate: date ? dashboardDateKey(date) : '',
      _orderLocalTimezone: state.timezone,
      _platformKey: normalizeOrderFilterValue(row?.platform || '')
    };
  };

  const provinceAliasMatches = (text, alias) => {
    if (!text || !alias) return false;
    return new RegExp(`(^|\\s)${escapeRegExp(alias)}(?=\\s|$)`).test(text);
  };

  const provinceFromOrderRow = (row) => {
    const searchable = normalizeTextToken([
      row?.province,
      row?.state,
      row?.region,
      row?.city,
      row?.district,
      row?.address,
      row?.customer_address,
      row?.shipping_address
    ].filter(Boolean).join(' '));
    if (!searchable) return '';
    const matched = INDONESIA_PROVINCE_ALIAS_ENTRIES.find((entry) => provinceAliasMatches(searchable, entry.alias));
    if (matched?.province) return matched.province;
    const localityMatched = INDONESIA_LOCALITY_ALIAS_ENTRIES.find((entry) => provinceAliasMatches(searchable, entry.alias));
    return localityMatched?.province || '';
  };

  const uniqueProvinceOrderKey = (row) => {
    const orderId = String(row?.order_id || '').trim();
    if (orderId) {
      return [
        normalizeTextToken(row?.platform || 'unknown'),
        normalizeTextToken(row?.account_key || ''),
        orderId
      ].join('|');
    }
    return uniqueOrderRowKey(row);
  };

  const createOverviewLocationAggregate = () => ({
    byProvince: new Map(),
    rows: [],
    totalOrders: 0,
    matchedOrders: 0,
    unmatchedOrders: 0,
    maxOrders: 0
  });

  const finalizeOverviewLocationAggregate = (aggregate) => {
    const byProvince = aggregate?.byProvince instanceof Map ? aggregate.byProvince : new Map();
    const rows = Array.from(byProvince.values()).sort((left, right) => (
      Number(right.orders || 0) - Number(left.orders || 0) || String(left.province || '').localeCompare(String(right.province || ''))
    ));
    aggregate.byProvince = byProvince;
    aggregate.rows = rows;
    aggregate.totalOrders = Math.max(0, Number(aggregate.totalOrders || 0));
    aggregate.unmatchedOrders = Math.max(0, Number(aggregate.unmatchedOrders || 0));
    aggregate.matchedOrders = Math.max(0, aggregate.totalOrders - aggregate.unmatchedOrders);
    aggregate.maxOrders = Math.max(0, ...rows.map((row) => Number(row.orders || 0)));
    return aggregate;
  };

  const overviewLocationAggregateSignature = (aggregate) => {
    const normalized = finalizeOverviewLocationAggregate(aggregate || createOverviewLocationAggregate());
    return [
      normalized.totalOrders,
      normalized.unmatchedOrders,
      normalized.maxOrders,
      normalized.rows.map((row) => `${row.province}:${row.orders}`).join('|')
    ].join('::');
  };

  const addOrderToOverviewLocationAggregate = (aggregate, row) => {
    const province = provinceFromOrderRow(row);
    aggregate.totalOrders += 1;
    if (!province) {
      aggregate.unmatchedOrders += 1;
      return;
    }
    const current = aggregate.byProvince.get(province) || { province, orders: 0 };
    current.orders += 1;
    aggregate.byProvince.set(province, current);
  };

  const normalizeOverviewLocationAggregate = (value = {}) => {
    const source = value.aggregate && typeof value.aggregate === 'object' ? value.aggregate : value;
    const aggregate = createOverviewLocationAggregate();
    const counts = source.provinceCounts && typeof source.provinceCounts === 'object'
      ? source.provinceCounts
      : {};
    Object.entries(counts).forEach(([province, orders]) => {
      const count = Math.max(0, Number(orders || 0));
      if (province && count > 0) aggregate.byProvince.set(province, { province, orders: count });
    });
    if (!aggregate.byProvince.size && Array.isArray(source.rows)) {
      source.rows.forEach((row) => {
        const province = String(row?.province || '').trim();
        const count = Math.max(0, Number(row?.orders || 0));
        if (province && count > 0) aggregate.byProvince.set(province, { province, orders: count });
      });
    }
    aggregate.totalOrders = Math.max(0, Number(source.totalOrders || 0));
    aggregate.unmatchedOrders = Math.max(0, Number(source.unmatchedOrders || 0));
    return finalizeOverviewLocationAggregate(aggregate);
  };

  const updateOverviewLocationCursor = (rows) => {
    let cursorDate = state.overview.locationMirroredAfter
      ? parseOrderTimestamp(state.overview.locationMirroredAfter)
      : null;
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const mirroredDate = parseOrderTimestamp(row?.mirrored_at);
      if (!mirroredDate) return;
      if (!cursorDate || mirroredDate.getTime() > cursorDate.getTime()) {
        cursorDate = mirroredDate;
      }
    });
    state.overview.locationMirroredAfter = cursorDate ? cursorDate.toISOString() : state.overview.locationMirroredAfter;
  };

  const mergeOverviewLocationRows = (rows, options = {}) => {
    if (!(state.overview.locationRowKeys instanceof Set) || options.reset) {
      state.overview.locationRowKeys = new Set();
    }
    if (options.reset) {
      state.overview.locationAggregate = createOverviewLocationAggregate();
      state.overview.locationMirroredAfter = '';
      state.overview.locationRenderSignature = '';
    }
    if (!state.overview.locationAggregate) {
      state.overview.locationAggregate = createOverviewLocationAggregate();
    }

    let added = 0;
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const key = uniqueProvinceOrderKey(row);
      if (!key || state.overview.locationRowKeys.has(key)) return;
      state.overview.locationRowKeys.add(key);
      addOrderToOverviewLocationAggregate(state.overview.locationAggregate, row);
      added += 1;
    });
    finalizeOverviewLocationAggregate(state.overview.locationAggregate);
    updateOverviewLocationCursor(rows);
    return added;
  };

  const coordinateGroupsForFeature = (feature) => {
    const geometry = feature?.geometry || {};
    if (geometry.type === 'Polygon') return [geometry.coordinates || []];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates || [];
    return [];
  };

  const provinceMapBounds = (features) => {
    const bounds = {
      minLon: Infinity,
      maxLon: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity
    };
    (Array.isArray(features) ? features : []).forEach((feature) => {
      coordinateGroupsForFeature(feature).forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach((point) => {
            const lon = Number(point?.[0]);
            const lat = Number(point?.[1]);
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
            bounds.minLon = Math.min(bounds.minLon, lon);
            bounds.maxLon = Math.max(bounds.maxLon, lon);
            bounds.minLat = Math.min(bounds.minLat, lat);
            bounds.maxLat = Math.max(bounds.maxLat, lat);
          });
        });
      });
    });
    if (!Number.isFinite(bounds.minLon)) {
      return { minLon: 95, maxLon: 142, minLat: -12, maxLat: 7 };
    }
    return bounds;
  };

  const provinceFeaturePath = (feature, project) => coordinateGroupsForFeature(feature)
    .map((polygon) => polygon
      .map((ring) => ring
        .map((point, index) => {
          const projected = project(Number(point?.[0]), Number(point?.[1]));
          return `${index === 0 ? 'M' : 'L'}${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
        })
        .join(' ')
        .concat(' Z'))
      .join(' '))
    .join(' ');

  const interpolateRgb = (from, to, amount) => {
    const channel = (index) => Math.round(from[index] + ((to[index] - from[index]) * amount));
    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
  };

  const provinceFillColor = (orders, maxOrders) => {
    const count = Number(orders || 0);
    if (count <= 0 || maxOrders <= 0) return isLightAdminTheme() ? '#eef2f7' : '#101827';
    const weight = Math.pow(Math.min(1, count / maxOrders), 0.55);
    return isLightAdminTheme()
      ? interpolateRgb([191, 219, 254], [29, 78, 216], weight)
      : interpolateRgb([22, 78, 130], [56, 189, 248], weight);
  };

  const renderProvinceHeatmapSvg = (geoJson, aggregate) => {
    const features = Array.isArray(geoJson?.features) ? geoJson.features : [];
    if (!features.length) return '<div class="admin-location-map-empty">Map unavailable</div>';
    const width = 1000;
    const height = 420;
    const margin = 20;
    const bounds = provinceMapBounds(features);
    const lonSpan = Math.max(1, bounds.maxLon - bounds.minLon);
    const latSpan = Math.max(1, bounds.maxLat - bounds.minLat);
    const scale = Math.min((width - margin * 2) / lonSpan, (height - margin * 2) / latSpan);
    const offsetX = (width - lonSpan * scale) / 2;
    const offsetY = (height - latSpan * scale) / 2;
    const stroke = isLightAdminTheme() ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.18)';
    const project = (lon, lat) => ({
      x: offsetX + ((lon - bounds.minLon) * scale),
      y: offsetY + ((bounds.maxLat - lat) * scale)
    });

    const paths = features.map((feature) => {
      const province = String(feature?.properties?.PROVINSI || feature?.properties?.province || '').trim();
      const orders = Number(aggregate.byProvince.get(province)?.orders || 0);
      const path = provinceFeaturePath(feature, project);
      if (!path) return '';
      const share = aggregate.matchedOrders > 0 ? orders / aggregate.matchedOrders : 0;
      const title = `${province || 'Unknown province'}: ${formatRegionalInteger(orders)} orders`;
      const shareLabel = `${formatRegionalNumber(Math.round(share * 1000) / 10, { maximumFractionDigits: 1 })}% of mapped orders`;
      return `
        <path class="admin-location-province" d="${path}" fill="${provinceFillColor(orders, aggregate.maxOrders)}" stroke="${stroke}" stroke-width="0.8" fill-rule="evenodd" tabindex="0" role="listitem" data-location-province="${escapeHtml(province || 'Unknown province')}" data-location-orders="${escapeHtml(String(orders))}" data-location-share="${escapeHtml(String(share))}" aria-label="${escapeHtml(`${title}, ${shareLabel}`)}"></path>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" role="list" aria-label="Indonesia order heat map by province" preserveAspectRatio="xMidYMid meet">
        <g>${paths}</g>
      </svg>
    `;
  };

  const locationTooltipPoint = (provincePath) => {
    if (!(provincePath instanceof Element) || !provincePath.classList.contains('admin-location-province')) return null;
    const province = provincePath.getAttribute('data-location-province') || 'Unknown province';
    const orders = Number(provincePath.getAttribute('data-location-orders') || 0);
    const share = Number(provincePath.getAttribute('data-location-share') || 0);
    return {
      label: province,
      tooltipTitle: province,
      tooltipLinesHtml: `
        <div class="admin-chart-tooltip-row is-primary">
          <span>Orders</span>
          <strong>${formatCompactNumber(orders)}</strong>
        </div>
        <div class="admin-chart-tooltip-row">
          <span>Share</span>
          <strong>${Number.isFinite(share) ? `${Math.round(share * 1000) / 10}%` : '0%'}</strong>
        </div>
        <div class="admin-chart-tooltip-row">
          <span>Basis</span>
          <strong>Mapped orders</strong>
        </div>
      `
    };
  };

  let activeLocationProvince = null;
  const setActiveLocationProvince = (provincePath) => {
    if (activeLocationProvince === provincePath) return;
    if (activeLocationProvince?.classList) activeLocationProvince.classList.remove('is-active');
    activeLocationProvince = provincePath;
    if (activeLocationProvince?.classList) activeLocationProvince.classList.add('is-active');
  };

  const hideLocationTooltip = () => {
    if (overviewRefs.locationMap) hideSurfaceTooltip(overviewRefs.locationMap);
    setActiveLocationProvince(null);
  };

  const showLocationTooltip = (provincePath, clientX, clientY) => {
    if (!overviewRefs.locationMap) return;
    const point = locationTooltipPoint(provincePath);
    if (!point) {
      hideLocationTooltip();
      return;
    }
    setActiveLocationProvince(provincePath);
    renderSurfaceTooltip(overviewRefs.locationMap, overviewRefs.locationMap, point, clientX, clientY);
  };

  const renderOverviewLocationList = (aggregate) => {
    if (!overviewRefs.locationList) return;
    const topRows = aggregate.rows.slice(0, 8);
    if (!topRows.length) {
      overviewRefs.locationList.innerHTML = '<p class="admin-empty">No province orders mapped yet.</p>';
      return;
    }
    overviewRefs.locationList.innerHTML = topRows.map((row) => `
      <div class="admin-location-row">
        <strong>${escapeHtml(row.province)}</strong>
        <span>${formatCompactNumber(row.orders)} orders</span>
      </div>
    `).join('');
  };

  const overviewLocationThemeKey = () => document.documentElement.dataset.adminTheme || 'dark';

  const overviewLocationCachedMap = (signature) => {
    const theme = overviewLocationThemeKey();
    const html = state.overview.locationMapHtmlByTheme?.[theme] || '';
    const cachedSignature = state.overview.locationMapSignatureByTheme?.[theme] || '';
    return html && cachedSignature === signature ? { html, signature: cachedSignature } : null;
  };

  const setOverviewLocationCachedMap = (signature, html) => {
    const theme = overviewLocationThemeKey();
    state.overview.locationMapHtmlByTheme = {
      ...(state.overview.locationMapHtmlByTheme || {}),
      [theme]: html
    };
    state.overview.locationMapSignatureByTheme = {
      ...(state.overview.locationMapSignatureByTheme || {}),
      [theme]: signature
    };
  };

  const applyOverviewLocationMapHtml = (signature, html) => {
    if (!overviewRefs.locationMap || !html) return false;
    if (state.overview.locationRenderSignature !== signature) {
      overviewRefs.locationMap.innerHTML = html;
      state.overview.locationRenderSignature = signature;
    }
    return true;
  };

  const renderOverviewLocationHeatmap = () => {
    if (!overviewRefs.locationMap) return;
    const aggregate = finalizeOverviewLocationAggregate(state.overview.locationAggregate || createOverviewLocationAggregate());
    const loading = Boolean(state.overview.locationLoading);
    const truncated = Boolean(state.overview.locationTruncated);
    if (overviewRefs.locationStatus) {
      if (state.overview.provinceMapError) {
        overviewRefs.locationStatus.textContent = `Map unavailable: ${state.overview.provinceMapError}`;
      } else if (state.overview.locationError) {
        overviewRefs.locationStatus.textContent = `Location data unavailable: ${state.overview.locationError}`;
      } else if (loading && !aggregate.totalOrders) {
        overviewRefs.locationStatus.textContent = `Loading ${state.overview.year} order locations`;
      } else if (aggregate.matchedOrders > 0) {
        const mappedRate = aggregate.totalOrders > 0 ? Math.round((aggregate.matchedOrders / aggregate.totalOrders) * 1000) / 10 : 0;
        overviewRefs.locationStatus.textContent = `${formatCompactNumber(aggregate.matchedOrders)} mapped orders • ${mappedRate}% mapped${aggregate.unmatchedOrders ? ` • ${formatCompactNumber(aggregate.unmatchedOrders)} unmatched` : ''}${truncated ? ' • sample capped' : ''}${loading ? ' • checking new orders' : ''}`;
      } else if (aggregate.totalOrders > 0) {
        overviewRefs.locationStatus.textContent = `${formatCompactNumber(aggregate.totalOrders)} loaded orders • no province matches`;
      } else {
        overviewRefs.locationStatus.textContent = loading ? `Loading ${state.overview.year} order locations` : `No ${state.overview.year} order locations yet`;
      }
    }

    const aggregateSignature = overviewLocationAggregateSignature(aggregate);
    if (!state.overview.provinceGeoJson) {
      const cachedThemeSignature = state.overview.locationMapSignatureByTheme?.[overviewLocationThemeKey()] || '';
      const cached = cachedThemeSignature.includes(`::${aggregateSignature}`) ? overviewLocationCachedMap(cachedThemeSignature) : null;
      if (cached && applyOverviewLocationMapHtml(cached.signature, cached.html)) {
        renderOverviewLocationList(aggregate);
        return;
      }
      const emptySignature = 'empty:loading-map';
      if (state.overview.locationRenderSignature !== emptySignature) {
        overviewRefs.locationMap.innerHTML = '<div class="admin-location-map-empty">Loading Indonesia map</div>';
        state.overview.locationRenderSignature = emptySignature;
      }
    } else {
      const mapSignature = [
        document.documentElement.dataset.adminTheme || 'dark',
        state.overview.provinceGeoJson.features?.length || 0,
        aggregateSignature
      ].join('::');
      if (state.overview.locationRenderSignature !== mapSignature) {
        const cached = overviewLocationCachedMap(mapSignature);
        if (cached) {
          applyOverviewLocationMapHtml(cached.signature, cached.html);
        } else {
          const html = renderProvinceHeatmapSvg(state.overview.provinceGeoJson, aggregate);
          applyOverviewLocationMapHtml(mapSignature, html);
          setOverviewLocationCachedMap(mapSignature, html);
          writeOverviewLocationCache(overviewLocationDateRange());
        }
      }
    }
    renderOverviewLocationList(aggregate);
  };

  let provinceMapPromise = null;
  const loadProvinceMapData = async () => {
    if (state.overview.provinceGeoJson) return state.overview.provinceGeoJson;
    if (provinceMapPromise) return provinceMapPromise;
    state.overview.provinceMapError = '';
    provinceMapPromise = fetch(provinceMapUrl, {
      credentials: 'same-origin',
      cache: 'force-cache',
      headers: { Accept: 'application/json' }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!payload || !Array.isArray(payload.features)) throw new Error('invalid map data');
        state.overview.provinceGeoJson = payload;
        return payload;
      })
      .catch((error) => {
        state.overview.provinceMapError = error?.message || 'unable to load map';
        throw error;
      })
      .finally(() => {
        provinceMapPromise = null;
        renderOverviewLocationHeatmap();
      });
    return provinceMapPromise;
  };

  const overviewLocationDateRange = () => {
    const year = Number(state.overview.year || activeLocalDate.slice(0, 4));
    const start = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const today = todayDate();
    const end = year === Number(today.slice(0, 4)) && today < yearEnd ? today : yearEnd;
    return { start, end, signature: `${start}:${end}` };
  };

  const overviewLocationCacheKey = (range) => `${OVERVIEW_LOCATION_CACHE_PREFIX}:${OVERVIEW_LOCATION_GEOCODER_VERSION}:${range.signature}`;

  const overviewLocationCachePayload = (range) => {
    const aggregate = finalizeOverviewLocationAggregate(state.overview.locationAggregate || createOverviewLocationAggregate());
    const provinceCounts = {};
    aggregate.byProvince.forEach((row, province) => {
      provinceCounts[province] = Number(row.orders || 0);
    });
    return {
      version: OVERVIEW_LOCATION_CACHE_VERSION,
      geocoderVersion: OVERVIEW_LOCATION_GEOCODER_VERSION,
      signature: range.signature,
      mirroredAfter: state.overview.locationMirroredAfter || '',
      loadedAt: state.overview.locationLoadedAt || Date.now(),
      truncated: Boolean(state.overview.locationTruncated),
      totalOrders: aggregate.totalOrders,
      unmatchedOrders: aggregate.unmatchedOrders,
      provinceCounts,
      orderKeys: Array.from(state.overview.locationRowKeys || []),
      mapHtmlByTheme: state.overview.locationMapHtmlByTheme || {},
      mapSignatureByTheme: state.overview.locationMapSignatureByTheme || {}
    };
  };

  const writeOverviewLocationCache = (range) => {
    if (!range?.signature || !state.overview.locationAggregate) return;
    try {
      window.localStorage.setItem(overviewLocationCacheKey(range), JSON.stringify(overviewLocationCachePayload(range)));
    } catch (_) {
      // The map can still work from the server when browser storage is full or disabled.
    }
  };

  const removeOverviewLocationCache = (range) => {
    if (!range?.signature) return;
    try {
      window.localStorage.removeItem(overviewLocationCacheKey(range));
    } catch (_) {
      // Cache removal is best-effort; the follow-up server load remains authoritative.
    }
  };

  const readOverviewLocationCache = (range) => {
    try {
      const raw = window.localStorage.getItem(overviewLocationCacheKey(range));
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (
        !payload ||
        payload.version !== OVERVIEW_LOCATION_CACHE_VERSION ||
        payload.geocoderVersion !== OVERVIEW_LOCATION_GEOCODER_VERSION ||
        payload.signature !== range.signature
      ) {
        return null;
      }
      return payload;
    } catch (_) {
      return null;
    }
  };

  const applyOverviewLocationCache = (range) => {
    if (
      state.overview.locationCacheReady &&
      state.overview.locationSignature === range.signature
    ) {
      return Boolean(state.overview.locationAggregate);
    }

    const cached = readOverviewLocationCache(range);
    state.overview.locationSignature = range.signature;
    state.overview.locationRenderSignature = '';
    state.overview.locationError = '';
    state.overview.locationCacheReady = true;

    if (!cached) {
      state.overview.locationRowKeys = new Set();
      state.overview.locationAggregate = createOverviewLocationAggregate();
      state.overview.locationMirroredAfter = '';
      state.overview.locationLoadedAt = 0;
      state.overview.locationTruncated = false;
      state.overview.locationMapHtmlByTheme = {};
      state.overview.locationMapSignatureByTheme = {};
      return false;
    }

    state.overview.locationAggregate = normalizeOverviewLocationAggregate(cached);
    state.overview.locationRowKeys = new Set(Array.isArray(cached.orderKeys) ? cached.orderKeys : []);
    state.overview.locationMirroredAfter = String(cached.mirroredAfter || '');
    state.overview.locationLoadedAt = Number(cached.loadedAt || 0);
    state.overview.locationTruncated = Boolean(cached.truncated);
    state.overview.locationMapHtmlByTheme = cached.mapHtmlByTheme && typeof cached.mapHtmlByTheme === 'object' ? cached.mapHtmlByTheme : {};
    state.overview.locationMapSignatureByTheme = cached.mapSignatureByTheme && typeof cached.mapSignatureByTheme === 'object' ? cached.mapSignatureByTheme : {};
    return true;
  };

  const applyOverviewLocationSummaryPayload = (payload, range) => {
    const aggregatePayload = payload?.aggregate && typeof payload.aggregate === 'object' ? payload.aggregate : payload;
    const previousSignature = overviewLocationAggregateSignature(state.overview.locationAggregate || createOverviewLocationAggregate());
    state.overview.locationAggregate = normalizeOverviewLocationAggregate(aggregatePayload || {});
    state.overview.locationRowKeys = new Set();
    state.overview.locationMirroredAfter = String(aggregatePayload?.mirroredAfter || payload?.mirror?.last_mirrored_at || '');
    state.overview.locationLoadedAt = Date.now();
    state.overview.locationTruncated = false;
    const nextSignature = overviewLocationAggregateSignature(state.overview.locationAggregate);
    writeOverviewLocationCache(range);
    return previousSignature !== nextSignature;
  };

  const loadOverviewLocationRows = async (options = {}) => {
    if (!overviewRefs.locationMap) return;
    const range = overviewLocationDateRange();
    applyOverviewLocationCache(range);
    const sameRange = state.overview.locationSignature === range.signature;
    if (
      !options.force &&
      !options.incremental &&
      sameRange &&
      (state.overview.locationLoadedAt || state.overview.locationLoading)
    ) {
      renderOverviewLocationHeatmap();
      return;
    }

    const requestToken = state.overview.locationRequestToken + 1;
    state.overview.locationRequestToken = requestToken;
    state.overview.locationSignature = range.signature;
    state.overview.locationLoading = true;
    state.overview.locationError = '';
    renderOverviewLocationHeatmap();

    try {
      const payload = await requestOrderLocationSummary(range.start, range.end, {
        refresh: Boolean(options.force || options.repair),
        cacheBust: Boolean(options.force || options.repair)
      });
      if (state.overview.locationRequestToken !== requestToken) return;
      const changed = applyOverviewLocationSummaryPayload(payload, range);
      if (changed && !state.overview.provinceGeoJson) {
        loadProvinceMapData().catch(() => {});
      }
    } catch (error) {
      if (state.overview.locationRequestToken !== requestToken) return;
      state.overview.locationError = error?.message || 'unable to load orders';
    } finally {
      if (state.overview.locationRequestToken === requestToken) {
        state.overview.locationLoading = false;
        renderOverviewLocationHeatmap();
      }
    }
  };

  const ensureOverviewLocationHeatmap = (options = {}) => {
    if (!overviewRefs.locationMap) return;
    const range = overviewLocationDateRange();
    applyOverviewLocationCache(range);
    renderOverviewLocationHeatmap();
    loadProvinceMapData().catch(() => {});
    loadOverviewLocationRows({ incremental: true, ...options }).catch(() => {});
  };

  const deriveOrderMonthRanges = (years, months) => {
    const ranges = [];
    const monthYears = (Array.isArray(months) ? months : []).map((monthRow) => Number(monthRow?.year || 0));
    const availableYears = [
      ...(Array.isArray(years) && years.length ? years : [state.overview.year]),
      ...monthYears
    ]
      .map((yearValue) => Number(yearValue))
      .filter((year) => Number.isFinite(year) && year >= 2000);
    const earliestYear = availableYears.length ? Math.min(...availableYears) : Number(todayDate().slice(0, 4));
    const earliestDate = `${earliestYear}-01-01`;
    let end = todayDate();

    while (end >= earliestDate) {
      const candidateStart = offsetDate(end, -(ORDER_LOAD_WINDOW_DAYS - 1));
      const start = candidateStart < earliestDate ? earliestDate : candidateStart;
      ranges.push({
        year: Number(start.slice(0, 4)),
        month: Number(start.slice(5, 7)),
        start,
        end,
        key: `${start}:${end}`
      });
      end = offsetDate(start, -1);
    }

    return ranges;
  };

  const orderMatchesFilters = (row, filters) => {
    const rowDate = orderLocalDate(row);
    if (filters.startDate && rowDate && rowDate < filters.startDate) return false;
    if (filters.endDate && rowDate && rowDate > filters.endDate) return false;
    return (
      orderFilterMatchesAny(filters.companies, orderCompanyValues(row)) &&
      orderFilterMatchesAny(filters.products, orderProductValues(row)) &&
      orderFilterMatchesAny(filters.flavors, orderFlavorValues(row)) &&
      (!filters.platforms.size || filters.platforms.has(row._platformKey || normalizeOrderFilterValue(row.platform || '')))
    );
  };

  const filteredOrderRows = () => {
    if (!hasOrderFilters()) return state.orders.rows;
    const filters = createOrderFilterSnapshot();
    return state.orders.rows.filter((row) => orderMatchesFilters(row, filters));
  };

  const hasOrderFilters = () => {
    const filters = state.orders.filters;
    return Boolean(filters.companies.length || filters.products.length || filters.flavors.length || filters.platforms.length || filters.startDate || filters.endDate);
  };

  const resetOrderRenderWindow = () => {
    state.orders.renderLimit = ORDER_RENDER_BATCH_SIZE;
    if (ordersRefs.scroll) ordersRefs.scroll.scrollTop = 0;
  };

  const addOrderFilter = (kind, value) => {
    const normalized = String(value || '').trim();
    if (!normalized || !Array.isArray(state.orders.filters[kind])) return;
    if (!state.orders.filters[kind].some((item) => normalizeOrderFilterValue(item) === normalizeOrderFilterValue(normalized))) {
      state.orders.filters[kind].push(normalized);
      resetOrderRenderWindow();
      syncOrderLoadedAll();
    }
  };

  const removeOrderFilter = (kind, value = '') => {
    if (kind === 'startDate' || kind === 'endDate') {
      state.orders.filters[kind] = '';
    } else if (Array.isArray(state.orders.filters[kind])) {
      state.orders.filters[kind] = state.orders.filters[kind].filter((item) => normalizeOrderFilterValue(item) !== normalizeOrderFilterValue(value));
    }
    resetOrderRenderWindow();
    syncOrderLoadedAll();
    syncOrderFilterControls();
    renderSkuOrderTree();
    renderOrders();
    ensureEnoughOrderRows().catch(showOrderLoadError);
  };

  const clearOrderFilters = () => {
    state.orders.filters = {
      companies: [],
      products: [],
      flavors: [],
      platforms: [],
      startDate: '',
      endDate: ''
    };
    resetOrderRenderWindow();
    syncOrderLoadedAll();
    syncOrderFilterControls();
    renderSkuOrderTree();
    renderOrders();
    ensureEnoughOrderRows().catch(showOrderLoadError);
  };

  const buildSettingsUrl = (action, options = {}) => {
    const params = new URLSearchParams({ action });
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    return `${settingsEndpoint}?${params.toString()}`;
  };

  const beginRequest = (key, settings = false) => {
    state.requestSequence += 1;
    const token = state.requestSequence;
    if (settings) {
      state[key].settingsRequestToken = token;
    } else {
      state[key].requestToken = token;
    }
    return token;
  };

  const isLatestRequest = (key, token, settings = false) => (
    settings
      ? state[key].settingsRequestToken === token
      : state[key].requestToken === token
  );

  const isFresh = (loadedAt, ttl) => (
    Number.isFinite(loadedAt) &&
    loadedAt > 0 &&
    Date.now() - loadedAt < ttl
  );

  const hasFreshViewData = (view) => {
	    if (view === 'overview') return Boolean(state.overview.data) && isFresh(state.overview.loadedAt, VIEW_CACHE_TTL_MS.overview);
	    if (view === 'orders') return Boolean(state.orders.data) && isFresh(state.orders.loadedAt, VIEW_CACHE_TTL_MS.orders);
	    if (view === 'wallet') return Boolean(state.wallet.data) && isFresh(state.wallet.loadedAt, VIEW_CACHE_TTL_MS.wallet);
	    if (view === 'daily') return Boolean(state.daily.data) && isFresh(state.daily.loadedAt, VIEW_CACHE_TTL_MS.daily);
    if (view === 'home') return Boolean(state.home.data) && isFresh(state.home.loadedAt, VIEW_CACHE_TTL_MS.home);
    if (view === 'website') {
      if (state.website.screen !== 'detail' || !state.website.site) return true;
      return Boolean(state.website.data) && isFresh(state.website.loadedAt, VIEW_CACHE_TTL_MS.website);
    }
    if (view === 'settings') return isFresh(state.website.settingsLoadedAt, VIEW_CACHE_TTL_MS.settings);
    return true;
  };

  const topPlatformForMonth = (month) => {
    const entries = Object.entries(month?.platforms || {});
    if (!entries.length) return 'No platform data';
    entries.sort((left, right) => Number(right[1]?.sales || 0) - Number(left[1]?.sales || 0));
    return entries[0] ? `${toTitleCase(entries[0][0])} • ${formatCellCurrency(entries[0][1]?.sales || 0)}` : 'No platform data';
  };

  const parseOrderTimestamp = (timestamp) => {
    const value = String(timestamp || '').trim();
    if (!value) return null;
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized.includes('+') || normalized.endsWith('Z') ? normalized : `${normalized}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatOrderTimestamp = (timestamp) => {
    const date = parseOrderTimestamp(timestamp);
    if (!date) return String(timestamp || '');
    return `${formatDashboardTime(date, state.timezone, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })} ${getTimezoneLabel(state.timezone)}`;
  };

  const localHour = (date) => Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: state.timezone,
    hour: '2-digit',
    hour12: false
  }).format(date));

  const orderMetricRow = (order) => {
    const revenue = Number(order?.revenue || 0);
    const cogs = Number(order?.cogs || 0);
    return {
      revenue,
      gross_profit: Number(order?.gross_profit ?? (revenue - cogs)),
      orders: 1,
      item_count: Number(order?.quantity || order?.item_count || 0)
    };
  };

  const addOrderMetrics = (target, order) => {
    const metrics = orderMetricRow(order);
    const orderId = String(order?.order_id || '').trim();
    const orderKey = [
      String(order?.platform || '').trim(),
      String(order?.account_key || '').trim(),
      orderId
    ].join('|');
    if (!target._orderIds) target._orderIds = new Set();
    const isFirstOrderRow = orderId === '' || !target._orderIds.has(orderKey);
    const orderRevenue = Number(order?.order_net_revenue);
    const hasOrderRevenue = Number.isFinite(orderRevenue) && orderRevenue > 0;
    const revenueContribution = hasOrderRevenue
      ? (isFirstOrderRow ? orderRevenue : 0)
      : metrics.revenue;
    const cogs = Number(order?.cogs || 0);

    target.revenue += revenueContribution;
    target.gross_profit += revenueContribution - cogs;
    if (isFirstOrderRow) {
      target.orders += metrics.orders;
      if (orderId !== '') target._orderIds.add(orderKey);
    }
    target.item_count += metrics.item_count;
  };

  const aggregateOrdersForTrend = (orders, startDate, endDate) => {
    const start = new Date(`${startDate}T00:00:00+07:00`);
    const end = new Date(`${endDate}T00:00:00+07:00`);
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const mode = days <= 1 ? 'hour' : days <= 92 ? 'day' : 'month';
    const buckets = new Map();
    const ensureBucket = (key, label) => {
      if (!buckets.has(key)) {
        buckets.set(key, { key, label, revenue: 0, gross_profit: 0, orders: 0, item_count: 0 });
      }
      return buckets.get(key);
    };

    if (mode === 'hour') {
      for (let hour = 0; hour < 24; hour += 1) {
        ensureBucket(String(hour).padStart(2, '0'), `${String(hour).padStart(2, '0')}:00`);
      }
    } else if (mode === 'day') {
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const key = new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone }).format(cursor);
        ensureBucket(key, new Intl.DateTimeFormat(getRegionalDateLocale(), { timeZone: state.timezone, day: '2-digit', month: 'short' }).format(cursor));
      }
    } else {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const final = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= final) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        ensureBucket(key, new Intl.DateTimeFormat(getRegionalDateLocale(), { timeZone: state.timezone, month: 'short', year: '2-digit' }).format(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    orders.forEach((order) => {
      const date = parseOrderTimestamp(order?.order_create_time || order?.timestamp);
      if (!date) return;
      const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone }).format(date);
      if (localDate < startDate || localDate > endDate) return;
      let key = localDate;
      if (mode === 'hour') {
        key = String(localHour(date)).padStart(2, '0');
      } else if (mode === 'month') {
        key = localDate.slice(0, 7);
      }
      const bucket = buckets.get(key);
      if (bucket) addOrderMetrics(bucket, order);
    });

    return {
      mode,
      rows: Array.from(buckets.values()).map((row) => ({
        ...row,
        _orderIds: undefined,
        average_order_value: row.orders > 0 ? row.revenue / row.orders : 0,
        tooltipLinesHtml: buildOverviewTooltipLines(row, state.overview.metric)
      }))
    };
  };

  const hourlyOrderRows = (orders) => {
    const rows = [];
    const now = new Date();
    const currentHour = localHour(now);
    const localToday = todayDate();
    for (let hour = 0; hour <= 23; hour += 1) {
      rows.push({
        hour,
        key: String(hour).padStart(2, '0'),
        label: String(hour),
        future: hour > currentHour,
        revenue: 0,
        gross_profit: 0,
        orders: 0,
        item_count: 0
      });
    }

    orders.forEach((order) => {
      const date = parseOrderTimestamp(order?.order_create_time || order?.timestamp);
      if (!date) return;
      if (date.getTime() > now.getTime()) return;
      const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone }).format(date);
      if (localDate !== localToday) return;
      const hour = localHour(date);
      const row = rows.find((item) => item.hour === hour);
      if (row) addOrderMetrics(row, order);
    });

    return rows.map((row) => ({
      ...row,
      _orderIds: undefined,
      tooltipLinesHtml: buildOverviewTooltipLines(row, state.overview.hourlyMetric)
    }));
  };

  const overviewHourlyLineColor = (metric) => {
    if (metric === 'gross_profit') return '#9dff00';
    if (metric === 'revenue') return '#22d3ee';
    if (metric === 'item_count') return '#ff8f1f';
    return '#ff4ecd';
  };

  const currentHourlyRows = () => state.overview.hourlyRows.map((row) => ({
    ...row,
    tooltipLinesHtml: buildOverviewTooltipLines(row, state.overview.hourlyMetric)
  }));

  const renderOverviewHourlyPanel = () => {
    if (overviewRefs.hourlyTitle) {
      overviewRefs.hourlyTitle.textContent = `Today ${OVERVIEW_METRIC_SHORT_LABELS[state.overview.hourlyMetric] || 'Orders'} by hour`;
    }
    if (overviewRefs.hourlyMeta) {
      const hourlyTotal = state.overview.hourlyRows.reduce((sum, row) => sum + Number(row[state.overview.hourlyMetric] || 0), 0);
      const syncStatus = state.overview.data?.sync_status;
      const syncFinishedAt = syncStatus?.finished_at ? new Date(syncStatus.finished_at) : null;
      const staleLabel = syncStatus?.fresh === false
        ? `Data stale${syncFinishedAt && !Number.isNaN(syncFinishedAt.getTime()) ? ` since ${formatDashboardTime(syncFinishedAt, state.timezone, { hour: '2-digit', minute: '2-digit', hour12: false })} ${getTimezoneLabel(state.timezone)}` : ''}`
        : 'Live today, 0-23';
      overviewRefs.hourlyMeta.textContent = `${staleLabel} • ${formatFullMetricValue(state.overview.hourlyMetric, hourlyTotal, OVERVIEW_METRIC_UNITS)}`;
    }
    overviewRefs.hourlyMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewHourlyMetric === state.overview.hourlyMetric);
    });
    drawChartSafely(overviewRefs.hourlyCanvas, () => drawLineChart(overviewRefs.hourlyCanvas, currentHourlyRows(), state.overview.hourlyMetric, OVERVIEW_METRIC_UNITS, {
      padding: { top: 14, right: 16, bottom: 36, left: 68 },
      labelFont: '600 10px "Plus Jakarta Sans", sans-serif',
      maxLabels: 8,
      lineColor: overviewHourlyLineColor(state.overview.hourlyMetric)
    }));
  };

  const closeOverviewRangePopover = () => {
    if (overviewRefs.rangePopover) overviewRefs.rangePopover.hidden = true;
  };

  const dateKeyToCalendarDate = (dateValue) => new Date(`${dateValue}T12:00:00Z`);
  const calendarDateKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone }).format(date);
  const monthKeyFromDate = (dateValue) => dateValue.slice(0, 7);
  const firstMonthDay = (monthKey) => `${monthKey}-01`;
  let rangeCalendarMonth = monthKeyFromDate(todayDate());
  let rangeDraftStart = '';
  let rangeHoverDate = '';
  let rangePointerSelectionHandled = false;

  const setRangeCalendarMonth = (dateValue = '') => {
    const customRange = state.overview.customRange || {};
    rangeCalendarMonth = monthKeyFromDate(dateValue || customRange.startDate || customRange.endDate || todayDate());
  };

  const rangeBounds = () => {
    const customRange = state.overview.customRange || {};
    if (rangeDraftStart && rangeHoverDate) {
      return {
        start: rangeDraftStart <= rangeHoverDate ? rangeDraftStart : rangeHoverDate,
        end: rangeDraftStart <= rangeHoverDate ? rangeHoverDate : rangeDraftStart,
        preview: true
      };
    }
    if (rangeDraftStart) {
      return { start: rangeDraftStart, end: rangeDraftStart, preview: true };
    }
    if (customRange.active && customRange.startDate && customRange.endDate) {
      return { start: customRange.startDate, end: customRange.endDate, preview: false };
    }
    return { start: '', end: '', preview: false };
  };

  const renderOverviewRangeCalendar = () => {
    if (!overviewRefs.rangeGrid || !overviewRefs.rangeMonth) return;
    const firstDay = dateKeyToCalendarDate(firstMonthDay(rangeCalendarMonth));
    const month = firstDay.getMonth();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);
    const today = todayDate();
    const bounds = rangeBounds();
    overviewRefs.rangeMonth.textContent = new Intl.DateTimeFormat(getRegionalDateLocale(), {
      timeZone: state.timezone,
      month: 'long',
      year: 'numeric'
    }).format(firstDay);

    const days = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = calendarDateKey(date);
      const outside = date.getMonth() !== month;
      const inRange = bounds.start && bounds.end && key >= bounds.start && key <= bounds.end;
      const selectedStart = bounds.start && key === bounds.start;
      const selectedEnd = bounds.end && key === bounds.end;
      const classes = [
        'admin-range-day',
        outside ? 'is-outside' : '',
        inRange ? 'is-in-range' : '',
        bounds.preview && inRange ? 'is-preview' : '',
        !bounds.preview && inRange ? 'is-final-range' : '',
        selectedStart ? 'is-selected-start' : '',
        selectedEnd ? 'is-selected-end' : '',
        key === today ? 'is-today' : ''
      ].filter(Boolean).join(' ');
      const dayLabel = new Intl.DateTimeFormat(getRegionalDateLocale(), {
        timeZone: state.timezone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
      days.push(`
        <button type="button" class="${classes}" data-overview-range-date="${key}" aria-label="Select ${escapeHtml(dayLabel)}">
          <span class="admin-range-day-label">${date.getDate()}</span>
        </button>
      `);
    }
    overviewRefs.rangeGrid.innerHTML = days.join('');
  };

  const openOverviewRangePopover = () => {
    if (!overviewRefs.rangePopover) return;
    rangeDraftStart = '';
    rangeHoverDate = '';
    setRangeCalendarMonth();
    renderOverviewRangeCalendar();
    overviewRefs.rangePopover.hidden = false;
  };

  const shiftRangeCalendarMonth = (offset) => {
    const date = dateKeyToCalendarDate(firstMonthDay(rangeCalendarMonth));
    date.setMonth(date.getMonth() + offset);
    rangeCalendarMonth = monthKeyFromDate(calendarDateKey(date));
    renderOverviewRangeCalendar();
  };

  const selectOverviewRangeDate = async (dateValue) => {
    if (!dateValue) return;
    if (!rangeDraftStart) {
      rangeDraftStart = dateValue;
      rangeHoverDate = dateValue;
      setRangeCalendarMonth(dateValue);
      renderOverviewRangeCalendar();
      return;
    }

    const startDate = rangeDraftStart <= dateValue ? rangeDraftStart : dateValue;
    const endDate = rangeDraftStart <= dateValue ? dateValue : rangeDraftStart;
    state.overview.customRange = {
      active: true,
      startDate,
      endDate,
      rows: []
    };
    rangeDraftStart = '';
    rangeHoverDate = '';
    closeOverviewRangePopover();
    await loadOverviewSafely({ force: true, preferStale: false });
  };

  const renderOverviewYearControls = (years) => {
    const yearSelect = overviewRefs.yearSelect || overviewRefs.yearControls?.querySelector('[data-overview-year-select]');
    if (!yearSelect) return;
    const yearOptions = (Array.isArray(years) ? years : [])
      .map((year) => Number(year))
      .filter((year) => Number.isFinite(year))
      .sort((left, right) => right - left);
    const signature = `${yearOptions.join('\u001f')}\u001e${state.overview.year}`;
    if (state.overview.yearControlsSignature === signature) return;
    state.overview.yearControlsSignature = signature;
    yearSelect.innerHTML = yearOptions.map((year) => `
      <option value="${escapeHtml(String(year))}">${escapeHtml(String(year))}</option>
    `).join('');
    yearSelect.value = String(state.overview.year);
    yearSelect.disabled = yearOptions.length <= 1;

    if (yearSelect.dataset.overviewYearSelectReady !== 'true') {
      yearSelect.addEventListener('change', async () => {
        const nextYear = Number(yearSelect.value || state.overview.year);
        if (!Number.isFinite(nextYear) || nextYear === state.overview.year) return;
        state.overview.year = nextYear;
        await loadOverviewSafely({ force: true, preferStale: false });
      });
      yearSelect.dataset.overviewYearSelectReady = 'true';
    }
  };

  const optionalNumberFrom = (source, keys) => {
    if (!source || typeof source !== 'object') return null;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = source[key];
      if (value === null || value === '') continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  };

  const salesRecapMonthNumber = (row, fallbackIndex = 0) => {
    const numericMonth = Number(row?.month ?? row?.month_index ?? row?.monthNumber);
    if (Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
      return Math.round(numericMonth);
    }
    const label = String(row?.label || row?.month_label || '').slice(0, 3).toLowerCase();
    const labelIndex = SALES_RECAP_MONTH_LABELS.findIndex((month) => month.toLowerCase() === label);
    if (labelIndex >= 0) return labelIndex + 1;
    return fallbackIndex >= 0 && fallbackIndex < 12 ? fallbackIndex + 1 : 0;
  };

  const salesRecapValuesForMonth = (row = {}) => {
    const pcs = optionalNumberFrom(row, ['item_count', 'total_pcs', 'pcs', 'quantity', 'qty', 'units', 'order_item_count']) ?? 0;
    const rev = optionalNumberFrom(row, ['revenue', 'net_revenue', 'sales', 'total_revenue', 'grossRevenue', 'gross_revenue']) ?? 0;
    const cogs = optionalNumberFrom(row, ['cogs', 'total_cogs', 'cost_of_goods_sold']);
    const directGp = optionalNumberFrom(row, ['gross_profit', 'grossProfit', 'gp', 'profit']);
    const gp = directGp !== null ? directGp : (cogs !== null ? rev - cogs : null);

    return {
      pcs,
      rev,
      cogs,
      avgCogs: cogs !== null ? (pcs > 0 ? cogs / pcs : 0) : null,
      gp,
      avgGp: gp !== null ? (pcs > 0 ? gp / pcs : 0) : null,
      gpPct: gp !== null && rev > 0 ? gp / rev : null
    };
  };

  const salesRecapTotals = (values) => {
    const pcs = values.reduce((sum, item) => sum + Number(item.pcs || 0), 0);
    const rev = values.reduce((sum, item) => sum + Number(item.rev || 0), 0);
    const hasFullCogs = values.every((item) => item.cogs !== null || (!item.pcs && !item.rev));
    const hasFullGp = values.every((item) => item.gp !== null || (!item.pcs && !item.rev));
    const cogs = hasFullCogs ? values.reduce((sum, item) => sum + Number(item.cogs || 0), 0) : null;
    const gp = hasFullGp
      ? values.reduce((sum, item) => sum + Number(item.gp || 0), 0)
      : (cogs !== null ? rev - cogs : null);

    return {
      pcs,
      rev,
      cogs,
      avgCogs: cogs !== null ? (pcs > 0 ? cogs / pcs : 0) : null,
      gp,
      avgGp: gp !== null ? (pcs > 0 ? gp / pcs : 0) : null,
      gpPct: gp !== null && rev > 0 ? gp / rev : null
    };
  };

  const formatSalesRecapValue = (format, value) => {
    const number = Number(value);
    if (value === null || value === undefined || !Number.isFinite(number)) return '-';
    if (format === 'money') return formatCurrency(number);
    if (format === 'percent') {
      return `${formatRegionalNumber(number * 100, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      })}%`;
    }
    return formatRegionalInteger(number);
  };

  const renderSalesRecapCell = (metric, value, isTotal = false) => {
    const number = Number(value);
    const unavailable = value === null || value === undefined || !Number.isFinite(number);
    const classes = [
      'admin-sales-recap-cell',
      `admin-sales-recap-cell-${metric.key}`,
      isTotal ? 'is-total' : '',
      !unavailable && number < 0 ? 'is-negative' : '',
      unavailable ? 'is-empty' : ''
    ].filter(Boolean).join(' ');
    return `<td class="${classes}">${escapeHtml(formatSalesRecapValue(metric.format, value))}</td>`;
  };

  const salesRecapExportData = () => {
    const exportData = state.overview.salesRecapExport;
    return exportData && Array.isArray(exportData.rows) && exportData.rows.length ? exportData : null;
  };

  const setSalesRecapExportActionsEnabled = () => {
    const disabled = !salesRecapExportData();
    [overviewRefs.salesRecapCopy, overviewRefs.salesRecapDownload].forEach((button) => {
      if (button) button.disabled = disabled;
    });
  };

  const normalizeSalesRecapExportValue = (value) => String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();

  const salesRecapRowsToTsv = (rows) => rows
    .map((row) => row.map(normalizeSalesRecapExportValue).join('\t'))
    .join('\n');

  const salesRecapRowsToCsv = (rows) => rows
    .map((row) => row.map((value) => {
      const text = normalizeSalesRecapExportValue(value);
      return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(','))
    .join('\r\n');

  const writeClipboardText = async (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Unable to copy Sales Recap');
  };

  const flashSalesRecapActionLabel = (button, label) => {
    if (!button) return;
    const originalLabel = button.dataset.defaultLabel || button.getAttribute('aria-label') || '';
    button.dataset.defaultLabel = originalLabel;
    button.setAttribute('aria-label', label);
    button.title = label;
    window.clearTimeout(Number(button.dataset.feedbackTimer || 0));
    button.dataset.feedbackTimer = String(window.setTimeout(() => {
      button.setAttribute('aria-label', originalLabel);
      button.title = originalLabel;
    }, 1400));
  };

  const copySalesRecap = async () => {
    const exportData = salesRecapExportData();
    if (!exportData) return;
    try {
      await writeClipboardText(salesRecapRowsToTsv(exportData.rows));
      flashSalesRecapActionLabel(overviewRefs.salesRecapCopy, 'Sales Recap copied');
    } catch (error) {
      flashSalesRecapActionLabel(overviewRefs.salesRecapCopy, 'Copy failed');
    }
  };

  const downloadSalesRecapCsv = () => {
    const exportData = salesRecapExportData();
    if (!exportData) return;
    const blob = new Blob([salesRecapRowsToCsv(exportData.rows)], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = exportData.filename;
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 0);
    flashSalesRecapActionLabel(overviewRefs.salesRecapDownload, 'Sales Recap downloaded');
  };

  const setSalesRecapOpen = (isOpen) => {
    state.overview.salesRecapOpen = Boolean(isOpen);
    root.classList.toggle('is-sales-recap-open', state.overview.salesRecapOpen);
    if (overviewRefs.salesRecap) {
      overviewRefs.salesRecap.classList.toggle('is-open', state.overview.salesRecapOpen);
      overviewRefs.salesRecap.setAttribute('aria-hidden', state.overview.salesRecapOpen ? 'false' : 'true');
    }
    if (overviewRefs.salesRecapToggle) {
      overviewRefs.salesRecapToggle.hidden = state.overview.salesRecapOpen;
      overviewRefs.salesRecapToggle.classList.toggle('is-active', state.overview.salesRecapOpen);
      overviewRefs.salesRecapToggle.setAttribute('aria-expanded', state.overview.salesRecapOpen ? 'true' : 'false');
    }
  };

  const renderSalesRecap = (data) => {
    if (!overviewRefs.salesRecapHead || !overviewRefs.salesRecapBody) return;

    const months = Array.isArray(data?.months) ? data.months : [];
    const currentMonthKey = getMonthKeyForTimezone(new Date(), state.timezone);
    const currentYear = Number(currentMonthKey.slice(0, 4));
    const currentMonth = Number(currentMonthKey.slice(5, 7));
    const selectedYear = Number(data?.year || state.overview.year || currentYear);
    const monthMap = new Map();
    months.forEach((row, index) => {
      const monthNumber = salesRecapMonthNumber(row, index);
      if (monthNumber >= 1 && monthNumber <= 12) {
        monthMap.set(monthNumber, row);
      }
    });

    const availableMonths = Array.from(monthMap.keys()).sort((left, right) => left - right);
    let maxMonth = selectedYear < currentYear ? 12 : (selectedYear === currentYear ? currentMonth : 0);
    if (maxMonth <= 0 && availableMonths.length) {
      maxMonth = Math.max(...availableMonths);
    }

    const monthNumbers = Array.from({ length: Math.max(0, Math.min(12, maxMonth)) }, (_, index) => index + 1);
    const columns = monthNumbers.map((month) => ({
      month,
      label: SALES_RECAP_MONTH_LABELS[month - 1] || String(month)
    }));
    const values = columns.map((column) => salesRecapValuesForMonth(monthMap.get(column.month) || {}));
    const totals = salesRecapTotals(values);
    const lastMonthLabel = columns.length ? columns[columns.length - 1].label : '-';
    const recapTitle = `Sales Recap ${selectedYear}`;
    const recapMeta = selectedYear < currentYear
      ? `${selectedYear} full year`
      : `${selectedYear} YTD through ${lastMonthLabel}`;

    if (overviewRefs.salesRecapTitle) {
      overviewRefs.salesRecapTitle.textContent = recapTitle;
    }
    if (overviewRefs.salesRecapMeta) {
      overviewRefs.salesRecapMeta.textContent = recapMeta;
    }

    overviewRefs.salesRecapHead.innerHTML = `
      <tr>
        <th scope="col" class="admin-sales-recap-corner">Metric</th>
        ${columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join('')}
        <th scope="col" class="is-total">Total</th>
      </tr>
    `;

    overviewRefs.salesRecapBody.innerHTML = SALES_RECAP_METRICS.map((metric) => `
      <tr>
        <th scope="row">${escapeHtml(metric.label)}</th>
        ${values.map((item) => renderSalesRecapCell(metric, item[metric.key])).join('')}
        ${renderSalesRecapCell(metric, totals[metric.key], true)}
      </tr>
    `).join('');

    state.overview.salesRecapExport = {
      title: recapTitle,
      meta: recapMeta,
      filename: `jenang-gemi-sales-recap-${selectedYear}.csv`,
      rows: [
        ['Metric', ...columns.map((column) => column.label), 'Total'],
        ...SALES_RECAP_METRICS.map((metric) => [
          metric.label,
          ...values.map((item) => formatSalesRecapValue(metric.format, item[metric.key])),
          formatSalesRecapValue(metric.format, totals[metric.key])
        ])
      ]
    };
    setSalesRecapExportActionsEnabled();
  };

  const renderOverview = (data) => {
    state.overview.data = data;
    const totals = data.totals || {};
    const months = Array.isArray(data.months) ? data.months : [];
    const platforms = Array.isArray(data.platforms) ? data.platforms : [];
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const products = data.products || {};
    const monthlyAccountRows = overviewMonthlyAccountRows(months);
    const monthlyProductRows = normalizeOverviewMonthlyProductRows(products.monthly_product_groups, state.overview.year);
    const elapsedMonthlyProductRows = filterElapsedMonthlyRows(monthlyProductRows);
    const syrupVolumeRows = overviewVolumeBreakdownGroupRows(products.volume_breakdown, 'syrup');
    const dropsVolumeRows = overviewVolumeBreakdownGroupRows(products.volume_breakdown, 'drops');
    const syrupFlavorRows = Array.isArray(products.syrup_flavors) ? products.syrup_flavors : [];
    const dropsFlavorRows = Array.isArray(products.drops_flavors) ? products.drops_flavors : [];
    const buburFlavorRows = Array.isArray(products.bubur_flavors) ? products.bubur_flavors : [];
    const years = Array.isArray(data.years) ? data.years : [state.overview.year];
    const bestMonth = totals.best_month || {};
    const monthlyRows = months.map((month, index) => ({
      key: `${state.overview.year}-${String(index + 1).padStart(2, '0')}`,
      label: month.label || '-',
      sales: Number(month.sales || 0),
      net_revenue: Number(month.net_revenue || month.sales || 0),
      revenue: Number(month.revenue || month.net_revenue || month.sales || 0),
      marketplace_fees: Number(month.marketplace_fees || 0),
      cogs: Number(month.cogs || 0),
      gross_profit: Number(month.gross_profit || 0),
      orders: Number(month.orders || 0),
      item_count: Number(month.item_count || 0),
      average_order_value: Number(month.orders || 0) > 0 ? Number(month.revenue || month.net_revenue || month.sales || 0) / Number(month.orders || 0) : 0,
      accounts: month.accounts || {},
      platforms: month.platforms || {},
      tooltipLinesHtml: buildOverviewTooltipLines({
        ...month,
        revenue: Number(month.revenue || month.net_revenue || month.sales || 0),
        cogs: Number(month.cogs || 0),
        gross_profit: Number(month.gross_profit || 0),
        average_order_value: Number(month.orders || 0) > 0 ? Number(month.revenue || month.net_revenue || month.sales || 0) / Number(month.orders || 0) : 0
      }, state.overview.metric)
    }));
    const { monthKey: currentMonthKey, projectionFactor } = getCurrentMonthVelocity();
    const projectedMonthlyRows = monthlyRows.map((row) => {
      if (row.key !== currentMonthKey) return row;
      const projection = {
        ...row,
        revenue: Number(row.revenue || 0) * projectionFactor,
        sales: Number(row.sales || 0) * projectionFactor,
        net_revenue: Number(row.net_revenue || 0) * projectionFactor,
        marketplace_fees: Number(row.marketplace_fees || 0) * projectionFactor,
        cogs: Number(row.cogs || 0) * projectionFactor,
        gross_profit: Number(row.gross_profit || 0) * projectionFactor,
        orders: Number(row.orders || 0) * projectionFactor,
        item_count: Number(row.item_count || 0) * projectionFactor
      };
      projection.average_order_value = projection.orders > 0 ? projection.revenue / projection.orders : 0;
      return { ...row, projection };
    });
    const customRange = state.overview.customRange || {};
    const customTrend = customRange.active && Array.isArray(customRange.rows)
      ? aggregateOrdersForTrend(customRange.rows, customRange.startDate, customRange.endDate)
      : null;
    const trendRows = customTrend ? customTrend.rows : filterElapsedMonthlyRows(projectedMonthlyRows);
    const trendLabel = customTrend
      ? `${customRange.startDate} to ${customRange.endDate}`
      : `${state.overview.year}`;

    if (overviewRefs.summarySales) overviewRefs.summarySales.textContent = formatCellCurrency(totals.revenue || totals.net_revenue || totals.sales || 0);
    if (overviewRefs.summaryOrders) overviewRefs.summaryOrders.textContent = formatCellCurrency(totals.marketplace_fees || 0);
    if (overviewRefs.summaryAov) overviewRefs.summaryAov.textContent = formatCellCurrency(totals.gross_profit || 0);
    if (overviewRefs.summaryBestMonth) overviewRefs.summaryBestMonth.textContent = formatCompactNumber(totals.orders || 0);
    if (overviewRefs.summaryBestMonthMeta) {
      overviewRefs.summaryBestMonthMeta.textContent = `${formatCompactNumber(totals.item_count || 0)} items`;
    }
    if (overviewRefs.yearSummary) {
      overviewRefs.yearSummary.textContent = `${years[0]} to ${years[years.length - 1]}`;
    }
    if (overviewRefs.endpointLabel) overviewRefs.endpointLabel.textContent = salesEndpoint;
    if (overviewRefs.trendTitle) overviewRefs.trendTitle.textContent = customTrend
      ? `${OVERVIEW_METRIC_SHORT_LABELS[state.overview.metric] || 'Metric'} by ${customTrend.mode}`
      : OVERVIEW_METRIC_LABELS[state.overview.metric];
    if (overviewRefs.trendMeta) {
      overviewRefs.trendMeta.textContent = customTrend
        ? `${trendLabel} • ${formatCompactNumber(trendRows.reduce((sum, row) => sum + Number(row.orders || 0), 0))} orders`
        : `${state.overview.year} • Revenue ${formatCellCurrency(totals.revenue || totals.net_revenue || totals.sales || 0)} • Gross profit ${formatCellCurrency(totals.gross_profit || 0)}`;
    }
    if (overviewRefs.rangeToggle) {
      overviewRefs.rangeToggle.classList.toggle('is-active', Boolean(customTrend));
      overviewRefs.rangeToggle.title = customTrend ? trendLabel : 'Select custom chart date range';
    }
    if (overviewRefs.rangeReset) {
      overviewRefs.rangeReset.hidden = !customTrend;
    }
    renderOverviewHourlyPanel();

    if (overviewRefs.tableBody) {
      overviewRefs.tableBody.innerHTML = renderRows(months, 4, (month) => `
        <tr>
          <td><strong>${escapeHtml(month.label || '-')}</strong></td>
          <td title="${escapeHtml(formatCurrency(month.revenue || month.net_revenue || month.sales || 0))}">${formatCellCurrency(month.revenue || month.net_revenue || month.sales || 0)}</td>
          <td title="${escapeHtml(formatRegionalInteger(month.orders))}">${formatCompactNumber(month.orders || 0)}</td>
          <td>${escapeHtml(topPlatformForMonth(month))}</td>
        </tr>
      `, 'Belum ada data marketplace.');
    }

    if (overviewRefs.notes) {
      overviewRefs.notes.innerHTML = `
        <div class="admin-note-card"><strong>Platforms</strong><span>${platforms.length ? platforms.map((platform) => `${platform.label}: ${formatCellCurrency(platform.revenue || platform.net_revenue || platform.sales || 0)}`).join(' • ') : 'No connected platform revenue yet.'}</span></div>
        <div class="admin-note-card"><strong>Year Scope</strong><span>The year toggle is generated automatically from 2026 through the current calendar year so new years appear without manual edits.</span></div>
        <div class="admin-note-card"><strong>Data Path</strong><span>Dashboard requests protected marketplace sales, enriches it with SKU DB COGS, then renders seller-received revenue and gross profit locally.</span></div>
      `;
    }

    renderSalesRecap(data);
    setLastUpdated(overviewRefs.lastUpdated, data.generated_at || data.meta?.generated_at);
    renderOverviewYearControls(years);
    setSalesRecapOpen(state.overview.salesRecapOpen);
    overviewRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewMetric === state.overview.metric);
    });
    overviewRefs.volumeMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewVolumeMetric === state.overview.volumeMetric);
    });
    overviewRefs.productMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewProductMetric === state.overview.productMetric);
    });
    overviewRefs.flavorMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewFlavorMetric === state.overview.flavorMetric);
    });

    drawChartSafely(overviewRefs.trendCanvas, () => drawLineChart(overviewRefs.trendCanvas, trendRows, state.overview.metric, OVERVIEW_METRIC_UNITS, {
      lineColor: getOverviewMetricColor(state.overview.metric)
    }));
    drawChartSafely(overviewRefs.ordersCanvas, () => drawBarChart(overviewRefs.ordersCanvas, monthlyRows, {
      value: (item) => item[state.overview.volumeMetric] || 0,
      label: (item) => String(item.label || '-'),
      color: () => getOverviewMetricColor(state.overview.volumeMetric),
      metric: state.overview.volumeMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      tooltipTitle: (item) => `${item.label || '-'} Order Volume`,
      tooltipValue: (item, value) => formatFullMetricValue(state.overview.volumeMetric, value, OVERVIEW_METRIC_UNITS),
      showGrid: false,
      showXAxisLabels: false,
      showValueBadges: false,
      padding: { top: 12, right: 16, bottom: 12, left: 16 },
      limit: 12
    }));
    const productSeries = productSeriesFromMonthlyRows(elapsedMonthlyProductRows).filter(shouldIncludeSkuProductSeries);
    const filteredMonthlyProductRows = filterMonthlyProductRowsForChart(elapsedMonthlyProductRows, productSeries);
    drawChartSafely(overviewRefs.productStackCanvas, () => drawStackedBarChart(overviewRefs.productStackCanvas, filteredMonthlyProductRows, {
      series: productSeries,
      metric: state.overview.productMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      groupKey: 'products',
      label: (item) => item.label || '-',
      tooltipTitle: (item) => item.label || 'Month',
      includeEmptyItems: true,
      sortItems: false,
      showLegend: true,
      legendPosition: 'side',
      padding: { top: 22, right: 150, bottom: 44, left: 64 },
      limit: 12
    }), 'No monthly product sales yet');
    drawChartSafely(overviewRefs.syrupVolumeCanvas, () => drawPieChart(overviewRefs.syrupVolumeCanvas, syrupVolumeRows, {
      metric: state.overview.productMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      limit: 3,
      emptyMessage: 'No syrup volume sales yet',
      colorForIndex: getOverviewFlavorColor
    }), 'No syrup volume sales yet');
    drawChartSafely(overviewRefs.dropsVolumeCanvas, () => drawPieChart(overviewRefs.dropsVolumeCanvas, dropsVolumeRows, {
      metric: state.overview.productMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      limit: 3,
      emptyMessage: 'No drops volume sales yet',
      colorForIndex: getOverviewFlavorColor
    }), 'No drops volume sales yet');
    const accountSeries = accountSeriesFromMonthlyRows(monthlyAccountRows, accounts);
    drawChartSafely(overviewRefs.accountStackCanvas, () => drawStackedBarChart(overviewRefs.accountStackCanvas, monthlyAccountRows, {
      series: accountSeries,
      metric: 'item_count',
      unitsMap: OVERVIEW_METRIC_UNITS,
      groupKey: 'accounts',
      label: (item) => item.label || '-',
      tooltipTitle: (item) => item.label || 'Month',
      includeEmptyItems: true,
      sortItems: false,
      limit: 12
    }), 'No monthly account unit data yet');
    drawChartSafely(overviewRefs.syrupFlavorCanvas, () => drawPieChart(overviewRefs.syrupFlavorCanvas, syrupFlavorRows, {
      metric: state.overview.flavorMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      limit: 32,
      emptyMessage: 'No syrup flavor sales yet',
      colorForIndex: getOverviewFlavorColor
    }));
    drawChartSafely(overviewRefs.dropsFlavorCanvas, () => drawPieChart(overviewRefs.dropsFlavorCanvas, dropsFlavorRows, {
      metric: state.overview.flavorMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      limit: 32,
      emptyMessage: 'No drops flavor sales yet',
      colorForIndex: getOverviewFlavorColor
    }));
    drawChartSafely(overviewRefs.buburFlavorCanvas, () => drawPieChart(overviewRefs.buburFlavorCanvas, buburFlavorRows, {
      metric: state.overview.flavorMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      limit: 32,
      emptyMessage: 'No Bubur flavor sales yet',
      colorForIndex: getOverviewFlavorColor
    }));
    if (state.activeView === 'overview') {
      ensureOverviewLocationHeatmap();
    }
    if (state.activeView === 'orders') {
      resetOrderWindowsFromOverview();
      ensureEnoughOrderRows().catch(showOrderLoadError);
    }
  };

  const platformLabel = (value) => toTitleCase(String(value || 'unknown').replace(/[-_]/g, ' '));

  const dailyPlatformKey = (value) => normalizePlatformKey(value || 'unknown');

  const parseDailyMonth = (value) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})$/);
    const fallback = getMonthKeyForTimezone(new Date(), state.timezone);
    if (!match) return parseDailyMonth(fallback);
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return parseDailyMonth(fallback);
    }
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return { year, month, start, end };
  };

  const formatDailyMonthLabel = (monthKey) => {
    const range = parseDailyMonth(monthKey);
    return new Date(Date.UTC(range.year, range.month - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const dailyOrderDateString = (row) => {
    const date = parseOrderTimestamp(row?.order_create_time || row?.timestamp);
    return date ? dashboardDateKey(date) : '';
  };

  const dailyAccountFromParts = (platformValue, accountValue = '', custom = false) => {
    const platformRaw = String(platformValue || 'unknown').trim() || 'unknown';
    const accountRaw = String(accountValue || '').trim();
    const platform = platformLabel(platformRaw);
    const account = accountRaw && normalizeAccountKey(accountRaw) !== dailyPlatformKey(platformRaw)
      ? accountRaw
      : '';
    const label = account ? `${platform} / ${account}` : platform;
    const key = `${dailyPlatformKey(platformRaw)}:${normalizeAccountKey(account || platformRaw)}`;
    return { key, platform, account, label, custom };
  };

  const dailyAccountFromRow = (row) => dailyAccountFromParts(
    row?.platform || 'unknown',
    row?.account_label || row?.account_name || row?.shop_name || row?.store_name || row?.account_key || row?.account || ''
  );

  const dailyAccountFromCustomName = (name) => {
    const parts = String(name || '').split('/').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return dailyAccountFromParts(parts.shift(), parts.join(' / '), true);
    }
    return dailyAccountFromParts(name, '', true);
  };

  const readDailyCustomPlatforms = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(DAILY_CUSTOM_PLATFORMS_STORAGE_KEY) || '[]');
      return (Array.isArray(parsed) ? parsed : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean)
        .filter((name, index, items) => items.findIndex((item) => dailyAccountFromCustomName(item).key === dailyAccountFromCustomName(name).key) === index)
        .slice(0, 24);
    } catch (_error) {
      return [];
    }
  };

  const persistDailyCustomPlatforms = () => {
    window.localStorage.setItem(DAILY_CUSTOM_PLATFORMS_STORAGE_KEY, JSON.stringify(state.daily.customPlatforms.slice(0, 24)));
  };

  state.daily.customPlatforms = readDailyCustomPlatforms();

  const buildDailyAccountMap = (rows) => {
    const accountMap = new Map();
    state.daily.customPlatforms.forEach((name) => {
      const account = dailyAccountFromCustomName(name);
      accountMap.set(account.key, {
        ...account,
        qty: 0,
        revenue: 0,
        daysActive: 0
      });
    });
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const account = dailyAccountFromRow(row);
      if (!accountMap.has(account.key)) {
        accountMap.set(account.key, {
          ...account,
          qty: 0,
          revenue: 0,
          daysActive: 0
        });
      }
    });
    return accountMap;
  };

  const aggregateDailyData = (rows, monthKey) => {
    const range = parseDailyMonth(monthKey);
    const dayCount = new Date(Date.UTC(range.year, range.month, 0)).getUTCDate();
    const accountMap = buildDailyAccountMap(rows);
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(Date.UTC(range.year, range.month - 1, index + 1));
      const dateKey = date.toISOString().slice(0, 10);
      return {
        date: dateKey,
        label: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: '2-digit',
          timeZone: 'UTC'
        }),
        qty: 0,
        revenue: 0,
        orders: new Set(),
        accounts: new Map(),
        avgQty: 0,
        avgRevenue: 0
      };
    });
    const dayMap = new Map(days.map((day) => [day.date, day]));

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const date = dailyOrderDateString(row);
      const day = dayMap.get(date);
      if (!day) return;
      const account = dailyAccountFromRow(row);
      const quantity = Math.max(0, Number(row?.quantity || row?.item_count || 0));
      const revenue = Number(row?.revenue || row?.net_revenue || row?.sales || row?.gross_revenue || 0);
      const orderKey = [
        row?.platform || '',
        row?.account_key || '',
        row?.order_id || '',
        row?.sku || '',
        row?.item_key || ''
      ].join('|');

      if (!accountMap.has(account.key)) {
        accountMap.set(account.key, {
          ...account,
          qty: 0,
          revenue: 0,
          daysActive: 0
        });
      }
      if (!day.accounts.has(account.key)) {
        day.accounts.set(account.key, {
          key: account.key,
          label: account.label,
          platform: account.platform,
          account: account.account,
          qty: 0,
          revenue: 0,
          orders: new Set()
        });
      }
      const accountDay = day.accounts.get(account.key);
      const accountTotal = accountMap.get(account.key);
      day.qty += quantity;
      day.revenue += revenue;
      accountDay.qty += quantity;
      accountDay.revenue += revenue;
      accountTotal.qty += quantity;
      accountTotal.revenue += revenue;
      if (orderKey.replace(/\|/g, '').trim() !== '') {
        day.orders.add(orderKey);
        accountDay.orders.add(orderKey);
      }
    });

    const accountCount = Math.max(accountMap.size, 1);

    days.forEach((day) => {
      day.accounts.forEach((accountDay) => {
        const accountTotal = accountMap.get(accountDay.key);
        if (accountTotal && (accountDay.qty > 0 || accountDay.revenue > 0)) {
          accountTotal.daysActive += 1;
        }
        accountDay.orders = accountDay.orders.size;
      });
      day.orders = day.orders.size;
      day.avgQty = day.qty / accountCount;
      day.avgRevenue = day.revenue / accountCount;
    });

    const accounts = Array.from(accountMap.values())
      .sort((left, right) => left.platform.localeCompare(right.platform) || left.label.localeCompare(right.label))
      .map((account) => ({
        ...account,
        avgQty: account.qty / dayCount,
        avgRevenue: account.revenue / dayCount
      }));

    const totalQty = days.reduce((sum, day) => sum + day.qty, 0);
    const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
    const topDay = days.reduce((best, day) => (
      !best || day.revenue > best.revenue || (day.revenue === best.revenue && day.qty > best.qty) ? day : best
    ), null);

    return {
      month: `${range.year}-${String(range.month).padStart(2, '0')}`,
      label: formatDailyMonthLabel(`${range.year}-${String(range.month).padStart(2, '0')}`),
      start: range.start,
      end: range.end,
      dayCount,
      rows: Array.isArray(rows) ? rows : [],
      days,
      accounts,
      totals: {
        qty: totalQty,
        revenue: totalRevenue,
        avgQty: totalQty / dayCount,
        avgRevenue: totalRevenue / dayCount,
        accountCount: accounts.length,
        activeDayCount: days.filter((day) => day.qty > 0 || day.revenue > 0).length,
        topDay
      }
    };
  };

  const renderDailyPlatformList = () => {
    if (!dailyRefs.platformList) return;
    const custom = state.daily.customPlatforms;
    if (!custom.length) {
      dailyRefs.platformList.innerHTML = '<p class="admin-empty">No manual account columns.</p>';
      return;
    }
    dailyRefs.platformList.innerHTML = custom.map((name) => `
      <button type="button" class="daily-platform-chip" data-daily-remove-platform="${escapeHtml(name)}">
        <span>${escapeHtml(dailyAccountFromCustomName(name).label)}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    `).join('');
  };

  const formatDailyQty = (value, options = {}) => formatRegionalNumber(value, {
    maximumFractionDigits: options.average ? 1 : 0
  });

  const dailyQtyMarkup = (value, options = {}) => {
    const amount = Number(value || 0);
    return `<span class="${amount > 0 ? 'daily-qty-value' : 'daily-zero'}">${formatDailyQty(amount, options)}</span>`;
  };

  const dailyRpMarkup = (value) => {
    const amount = Number(value || 0);
    return `<span class="${amount > 0 ? 'daily-rp-value' : 'daily-zero'}">${formatCurrency(amount)}</span>`;
  };

  const renderDailySheet = (dailyData) => {
    if (!dailyRefs.sheetHead || !dailyRefs.sheetBody || !dailyRefs.sheetFoot) return;
    const accounts = Array.isArray(dailyData.accounts) ? dailyData.accounts : [];
    const columnCount = 1 + (accounts.length * 2) + 4;
    const accountHeaders = accounts.map((account) => `
      <th colspan="2" class="daily-account-header" title="${escapeHtml(account.label)}">
        <span>${escapeHtml(account.platform)}</span>
        <small>${escapeHtml(account.account || 'All accounts')}</small>
      </th>
    `).join('');
    const accountSubheads = accounts.map(() => `
      <th class="daily-subhead daily-qty-head">Qty</th>
      <th class="daily-subhead">Revenue</th>
    `).join('');

    dailyRefs.sheetHead.innerHTML = `
      <tr>
        <th rowspan="2" class="daily-day-header">Day</th>
        ${accountHeaders}
        <th colspan="4" class="daily-total-header">Totals & Avg <span class="admin-info-dot" title="Right-side columns summarize each day. The footer shows month totals and calendar-day averages." aria-label="Right-side columns summarize each day. The footer shows month totals and calendar-day averages.">i</span></th>
      </tr>
      <tr>
        ${accountSubheads}
        <th class="daily-subhead daily-total-subhead daily-qty-head">Total Qty</th>
        <th class="daily-subhead daily-total-subhead">Total Revenue</th>
        <th class="daily-subhead daily-total-subhead daily-qty-head">Avg Qty</th>
        <th class="daily-subhead daily-total-subhead">Avg Revenue</th>
      </tr>
    `;

    if (!dailyData.days.length) {
      dailyRefs.sheetBody.innerHTML = `<tr><td colspan="${columnCount}" class="admin-empty">No days available.</td></tr>`;
      dailyRefs.sheetFoot.innerHTML = '';
      return;
    }

    dailyRefs.sheetBody.innerHTML = dailyData.days.map((day) => {
      const accountCells = accounts.map((account) => {
        const accountDay = day.accounts.get(account.key) || { qty: 0, revenue: 0 };
        return `
          <td class="daily-number-cell daily-qty-cell">${dailyQtyMarkup(accountDay.qty)}</td>
          <td class="daily-number-cell daily-rp-cell">${dailyRpMarkup(accountDay.revenue)}</td>
        `;
      }).join('');
      return `
        <tr>
          <th scope="row" class="daily-day-cell"><strong>${escapeHtml(day.label)}</strong><small>${escapeHtml(day.date)}</small></th>
          ${accountCells}
          <td class="daily-number-cell daily-total-cell daily-qty-cell">${dailyQtyMarkup(day.qty)}</td>
          <td class="daily-number-cell daily-total-cell daily-rp-cell">${dailyRpMarkup(day.revenue)}</td>
          <td class="daily-number-cell daily-total-cell daily-qty-cell">${dailyQtyMarkup(day.avgQty, { average: true })}</td>
          <td class="daily-number-cell daily-total-cell daily-rp-cell">${dailyRpMarkup(day.avgRevenue)}</td>
        </tr>
      `;
    }).join('');

    const totalAccountCells = accounts.map((account) => `
      <td class="daily-number-cell daily-qty-cell">${dailyQtyMarkup(account.qty)}</td>
      <td class="daily-number-cell daily-rp-cell">${dailyRpMarkup(account.revenue)}</td>
    `).join('');
    const averageAccountCells = accounts.map((account) => `
      <td class="daily-number-cell daily-qty-cell">${dailyQtyMarkup(account.avgQty, { average: true })}</td>
      <td class="daily-number-cell daily-rp-cell">${dailyRpMarkup(account.avgRevenue)}</td>
    `).join('');

    dailyRefs.sheetFoot.innerHTML = `
      <tr>
        <th scope="row" class="daily-day-cell"><strong>Total</strong><small>${escapeHtml(dailyData.label)}</small></th>
        ${totalAccountCells}
        <td class="daily-number-cell daily-total-cell daily-qty-cell">${dailyQtyMarkup(dailyData.totals.qty)}</td>
        <td class="daily-number-cell daily-total-cell daily-rp-cell">${dailyRpMarkup(dailyData.totals.revenue)}</td>
        <td class="daily-number-cell daily-total-cell daily-qty-cell">${dailyQtyMarkup(dailyData.totals.avgQty, { average: true })}</td>
        <td class="daily-number-cell daily-total-cell daily-rp-cell">${dailyRpMarkup(dailyData.totals.avgRevenue)}</td>
      </tr>
      <tr>
        <th scope="row" class="daily-day-cell"><strong>Avg / day</strong><small>${formatRegionalInteger(dailyData.dayCount)} days</small></th>
        ${averageAccountCells}
        <td class="daily-number-cell daily-total-cell daily-qty-cell">${dailyQtyMarkup(dailyData.totals.avgQty, { average: true })}</td>
        <td class="daily-number-cell daily-total-cell daily-rp-cell">${dailyRpMarkup(dailyData.totals.avgRevenue)}</td>
        <td class="daily-number-cell daily-total-cell daily-qty-cell">${dailyQtyMarkup(dailyData.totals.accountCount ? dailyData.totals.avgQty / dailyData.totals.accountCount : 0, { average: true })}</td>
        <td class="daily-number-cell daily-total-cell daily-rp-cell">${dailyRpMarkup(dailyData.totals.accountCount ? dailyData.totals.avgRevenue / dailyData.totals.accountCount : 0)}</td>
      </tr>
    `;
  };

  const renderDaily = (dailyData) => {
    state.daily.data = dailyData;
    if (dailyRefs.monthInput) dailyRefs.monthInput.value = dailyData.month;
    if (dailyRefs.status) {
      dailyRefs.status.textContent = `${dailyData.label} • ${formatRegionalInteger(dailyData.days.length)} days • ${formatRegionalInteger(dailyData.totals.accountCount)} account columns • ${formatRegionalInteger(dailyData.rows.length)} order lines`;
    }
    if (dailyRefs.exportButton) dailyRefs.exportButton.disabled = false;
    renderDailyPlatformList();
    renderDailySheet(dailyData);
  };

  const pdfEscape = (value) => String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  const buildSimplePdf = (title, lines) => {
    const safeLines = [title, '', ...lines].map((line) => String(line || '').slice(0, 120));
    const pages = [];
    for (let index = 0; index < safeLines.length; index += 46) {
      pages.push(safeLines.slice(index, index + 46));
    }
    const objects = [];
    const addObject = (body) => {
      objects.push(body);
      return objects.length;
    };
    const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
    const pagesId = addObject('');
    const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pageIds = [];

    pages.forEach((pageLines) => {
      const content = [
        'BT',
        '/F1 10 Tf',
        '14 TL',
        '44 800 Td',
        ...pageLines.map((line) => `(${pdfEscape(line)}) Tj T*`),
        'ET'
      ].join('\n');
      const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    });

    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((body, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  };

  const downloadDailyPdf = () => {
    const dailyData = state.daily.data;
    if (!dailyData) return;
    const accounts = Array.isArray(dailyData.accounts) ? dailyData.accounts : [];
    const lines = [
      `Month: ${dailyData.label}`,
      `Date range: ${dailyData.start} to ${dailyData.end}`,
      `Total Qty: ${formatRegionalInteger(dailyData.totals.qty)}`,
      `Total Revenue: ${formatCurrency(dailyData.totals.revenue || 0)}`,
      `Average Qty per day: ${formatRegionalNumber(dailyData.totals.avgQty, { maximumFractionDigits: 1 })}`,
      `Average Revenue per day: ${formatCurrency(dailyData.totals.avgRevenue || 0)}`,
      '',
      'Account columns',
      ...accounts.map((account) => `${account.label}: Qty ${formatRegionalInteger(account.qty)} | Revenue ${formatCurrency(account.revenue || 0)} | Avg Qty/day ${formatRegionalNumber(account.avgQty, { maximumFractionDigits: 1 })} | Avg Revenue/day ${formatCurrency(account.avgRevenue || 0)}`),
      '',
      'Daily spreadsheet',
      ...dailyData.days.map((day) => {
        const accountCells = accounts.length
          ? accounts.map((account) => {
            const accountDay = day.accounts.get(account.key) || { qty: 0, revenue: 0 };
            return `${account.label} Qty ${formatRegionalInteger(accountDay.qty)} Revenue ${formatCurrency(accountDay.revenue || 0)}`;
          }).join('; ')
          : 'No account columns';
        return `${day.date}: ${accountCells} | Total Qty ${formatRegionalInteger(day.qty)} | Total Revenue ${formatCurrency(day.revenue || 0)} | Avg Qty ${formatRegionalNumber(day.avgQty, { maximumFractionDigits: 1 })} | Avg Revenue ${formatCurrency(day.avgRevenue || 0)}`;
      })
    ];
    const pdf = buildSimplePdf(`Jenang Gemi Daily Report - ${dailyData.label}`, lines);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `jenang-gemi-daily-${dailyData.month}.pdf`;
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 0);
  };

  const renderActiveOrderFilters = () => {
    if (!ordersRefs.activeFilters) return;
    const signature = orderFiltersSignature();
    if (state.orders.activeFiltersSignature === signature) {
      ordersRefs.activeFilters.hidden = !hasOrderFilters();
      return;
    }
    state.orders.activeFiltersSignature = signature;
    const filters = state.orders.filters;
    const chips = [];
    const addChip = (kind, label, value) => {
      chips.push(`
        <button type="button" class="admin-orders-filter-chip" data-remove-order-filter="${escapeHtml(kind)}" data-filter-value="${escapeHtml(value)}">
          <span>${escapeHtml(label)}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      `);
    };
    filters.companies.forEach((value) => addChip('companies', `Company: ${value}`, value));
    filters.products.forEach((value) => addChip('products', `Product: ${value}`, value));
    filters.flavors.forEach((value) => addChip('flavors', `Flavor: ${value}`, value));
    filters.platforms.forEach((value) => addChip('platforms', `Platform: ${platformLabel(value)}`, value));
    if (filters.startDate) addChip('startDate', `From: ${filters.startDate}`, filters.startDate);
    if (filters.endDate) addChip('endDate', `To: ${filters.endDate}`, filters.endDate);
    ordersRefs.activeFilters.hidden = !chips.length;
    ordersRefs.activeFilters.innerHTML = chips.join('');
  };

  const renderOrderPlatforms = () => {
    if (!ordersRefs.platforms) return;
    const platforms = Array.from(new Set(state.orders.platforms.filter(Boolean))).sort();
    const signature = `${platforms.join('\u001f')}\u001e${state.orders.filters.platforms.join('\u001f')}`;
    if (state.orders.platformsRenderSignature === signature) return;
    state.orders.platformsRenderSignature = signature;
    if (!platforms.length) {
      ordersRefs.platforms.innerHTML = '<p class="admin-empty">Platforms appear after orders load.</p>';
      return;
    }
    ordersRefs.platforms.innerHTML = platforms.map((platform) => {
      const selected = state.orders.filters.platforms.some((item) => normalizeOrderFilterValue(item) === normalizeOrderFilterValue(platform));
      return `
        <button type="button" class="admin-orders-platform-choice${selected ? ' is-selected' : ''}" data-toggle-order-platform="${escapeHtml(platform)}">
          ${escapeHtml(platformLabel(platform))}
        </button>
      `;
    }).join('');
  };

  const renderSkuOrderTree = () => {
    if (!ordersRefs.companyTree) return;
    const catalog = Array.isArray(state.orders.catalog) ? state.orders.catalog : [];
    const catalogSignature = catalog.map((company) => {
      const products = Array.isArray(company.products) ? company.products : [];
      return `${company.id || company.name}:${products.map((product) => {
        const flavors = Array.isArray(product.flavors) ? product.flavors : [];
        return `${product.id || product.name}:${flavors.map((flavor) => flavor.id || flavor.name).join(',')}`;
      }).join(';')}`;
    }).join('|');
    const signature = `${catalogSignature}\u001e${orderFiltersSignature()}`;
    if (state.orders.skuTreeSignature === signature) return;
    state.orders.skuTreeSignature = signature;
    if (!catalog.length) {
      ordersRefs.companyTree.innerHTML = '<p class="admin-empty">No SKU companies are available yet.</p>';
      return;
    }
    ordersRefs.companyTree.innerHTML = catalog.map((company) => {
      const companySelected = state.orders.filters.companies.some((item) => normalizeOrderFilterValue(item) === normalizeOrderFilterValue(company.name));
      const products = Array.isArray(company.products) ? company.products : [];
      return `
        <details class="admin-orders-nested">
          <summary>
            <button type="button" class="admin-orders-filter-row${companySelected ? ' is-selected' : ''}" data-add-order-filter="companies" data-filter-value="${escapeHtml(company.name || '')}">
              <span>${escapeHtml(company.name || 'Unnamed company')}</span>
                      <small>${formatRegionalInteger(products.length)} products</small>
            </button>
          </summary>
          <div class="admin-orders-nested-content">
            ${products.length ? products.map((product) => {
              const productSelected = state.orders.filters.products.some((item) => normalizeOrderFilterValue(item) === normalizeOrderFilterValue(product.name));
              const flavors = Array.isArray(product.flavors) ? product.flavors : [];
              return `
                <details class="admin-orders-nested admin-orders-nested-product">
                  <summary>
                    <button type="button" class="admin-orders-filter-row${productSelected ? ' is-selected' : ''}" data-add-order-filter="products" data-filter-value="${escapeHtml(product.name || '')}">
                      <span>${escapeHtml(product.name || 'Unnamed product')}</span>
                      <small>${formatRegionalInteger(flavors.length)} flavors</small>
                    </button>
                  </summary>
                  <div class="admin-orders-nested-content">
                    ${flavors.length ? flavors.map((flavor) => {
                      const flavorSelected = state.orders.filters.flavors.some((item) => normalizeOrderFilterValue(item) === normalizeOrderFilterValue(flavor.name));
                      return `
                        <button type="button" class="admin-orders-filter-row admin-orders-flavor-row${flavorSelected ? ' is-selected' : ''}" data-add-order-filter="flavors" data-filter-value="${escapeHtml(flavor.name || '')}">
                          <span>${escapeHtml(flavor.name || 'Unnamed flavor')}</span>
                        </button>
                      `;
                    }).join('') : '<p class="admin-empty">No flavors in the SKU database for this product.</p>'}
                  </div>
                </details>
              `;
            }).join('') : '<p class="admin-empty">No products in the SKU database for this company.</p>'}
          </div>
        </details>
      `;
    }).join('');
  };

  const syncOrderFilterControls = () => {
    if (ordersRefs.filterReset) ordersRefs.filterReset.hidden = !hasOrderFilters();
    if (ordersRefs.startLabel) ordersRefs.startLabel.textContent = state.orders.filters.startDate || 'Any start date';
    if (ordersRefs.endLabel) ordersRefs.endLabel.textContent = state.orders.filters.endDate || 'Any end date';
    renderActiveOrderFilters();
    renderOrderPlatforms();
  };

	  const renderOrders = (data = state.orders.data) => {
    if (data) state.orders.data = data;
    const rows = filteredOrderRows();
    const visibleRows = rows.slice(0, state.orders.renderLimit);
    syncOrderFilterControls();
    if (ordersRefs.status) {
      const loadedCount = state.orders.rows.length;
      const shown = Math.min(visibleRows.length, rows.length);
      if (state.orders.loading) {
        ordersRefs.status.textContent = hasOrderFilters() ? 'Filtering older order windows...' : 'Loading older orders...';
      } else if (hasOrderFilters()) {
        ordersRefs.status.textContent = `${formatCompactNumber(shown)} shown from ${formatCompactNumber(rows.length)} matching order lines across ${formatCompactNumber(loadedCount)} loaded${state.orders.loadedAll ? '' : ' as you scroll'}`;
      } else {
        ordersRefs.status.textContent = `${formatCompactNumber(shown)} shown from ${formatCompactNumber(loadedCount)} loaded order lines${state.orders.loadedAll ? '' : ' as you scroll'}`;
      }
    }
    if (ordersRefs.loadMore) {
      ordersRefs.loadMore.hidden = state.orders.loadedAll && !state.orders.loading;
      ordersRefs.loadMore.disabled = state.orders.loading;
      ordersRefs.loadMore.textContent = state.orders.loading ? 'Loading...' : 'Load older';
    }
    if (!ordersRefs.tableBody) return;
    const contactButton = (value, label) => {
      const text = String(value || '').trim();
      if (!text) return '-';
      return `<button type="button" class="admin-order-view-btn" data-order-popover="${escapeHtml(text)}" aria-label="View ${escapeHtml(label)}">View</button>`;
    };
    if (!visibleRows.length) {
      const message = state.orders.loading
        ? 'Loading orders.'
        : (hasOrderFilters()
          ? (state.orders.loadedAll ? 'No orders match the current filters.' : 'No loaded orders match the current filters yet.')
          : (state.orders.loadedAll ? 'No stored orders found.' : 'No stored orders found in the loaded window yet.'));
	      ordersRefs.tableBody.innerHTML = `<tr><td colspan="12" class="admin-empty">${escapeHtml(message)}</td></tr>`;
	      return;
	    }
	    ordersRefs.tableBody.innerHTML = renderRows(visibleRows, 12, (row) => {
	      const platform = `${row.platform || '-'}${row.account_key ? ` / ${row.account_key}` : ''}`;
	      const productLabel = row.product_name || 'Unlinked SKU';
      const allocation = Array.isArray(row.allocations) && row.allocations.length
        ? row.allocations.map((item) => `${item.po_number}: ${formatCompactNumber(item.qty_astra_consumed || 0)}`).join(', ')
        : (row.allocation_error ? `Allocation needs review: ${row.allocation_error}` : 'No PO allocation');
	      const poNumbers = Array.isArray(row.allocations) && row.allocations.length
	        ? [...new Set(row.allocations.map((item) => item.po_number).filter(Boolean))].join(', ')
	        : '-';
	      const fundsReleased = row.funds_released === true || row.funds_released === 1 || String(row.funds_released || '').toLowerCase() === 'true';
	      const releasedAmount = Number(row.funds_released_amount || row.order_net_revenue || row.revenue || 0);
	      const releasedTitle = fundsReleased
	        ? `Funds released${releasedAmount > 0 ? `: ${formatCurrency(releasedAmount)}` : ''}${row.funds_released_at ? ` at ${formatOrderTimestamp(row.funds_released_at)}` : ''}`
	        : 'Funds not released';
	      return `
	        <tr>
	          <td>${escapeHtml(formatOrderTimestamp(row.order_create_time || row.timestamp))}</td>
	          <td><strong>${escapeHtml(row.order_id || '')}</strong></td>
	          <td>${escapeHtml(platform)}</td>
          <td class="admin-order-product" title="${escapeHtml(productLabel)}"><strong>${escapeHtml(productLabel)}</strong></td>
          <td>${formatCompactNumber(row.quantity || 0)}</td>
          <td title="${escapeHtml(allocation)}">${escapeHtml(poNumbers)}</td>
	          <td>${formatCellCurrency(row.revenue || 0)}</td>
	          <td${row.cogs_estimated ? ' title="Estimated from SKU COGS until FIFO allocation is recorded"' : ''}>${formatCellCurrency(row.cogs || 0)}</td>
	          <td class="admin-order-wallet-cell"><span class="admin-order-wallet-symbol${fundsReleased ? ' is-released' : ' is-pending'}" title="${escapeHtml(releasedTitle)}" aria-label="${escapeHtml(releasedTitle)}">${fundsReleased ? 'Rp' : '-'}</span></td>
	          <td>${contactButton(row.username, 'username')}</td>
	          <td>${contactButton(row.address, 'address')}</td>
	          <td>${contactButton(row.phone, 'phone')}</td>
	        </tr>
	      `;
	    }, 'No loaded orders match the current filters yet.');
	  };

	  const walletActionUrl = (action = 'summary', params = {}) => {
	    const url = new URL(walletEndpoint, window.location.href);
	    url.searchParams.set('action', action);
	    Object.entries(params || {}).forEach(([key, value]) => {
	      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
	    });
	    url.searchParams.set('_ts', String(Date.now()));
	    return url.toString();
	  };

	  const walletAmount = (value) => Math.max(0, Math.round(Number(value) || 0));

	  const walletBacktrackStatus = (backtrack = state.wallet.data?.backtrack) => {
	    if (!backtrack || backtrack.status === 'idle') return '';
	    if (backtrack.status === 'failed') return `Backtrack failed: ${backtrack.last_error || 'retry required'}`;
	    if (backtrack.status === 'complete') return `Backtrack complete / ${formatRegionalInteger(backtrack.imported_rows || 0)} rows checked`;
	    if (!backtrack.active) return '';
	    const progress = Math.max(1, Math.min(99, Math.round(Number(backtrack.progress) || 1)));
	    const phase = backtrack.phase === 'import' ? 'importing' : 'syncing';
	    const range = backtrack.cursor_date && backtrack.chunk_end ? `${backtrack.cursor_date} to ${backtrack.chunk_end}` : 'May 20, 2026';
	    return `Backtracking ${progress}% / ${phase} ${range}`;
	  };

	  const walletActionStatus = (actionId = '') => {
	    if (actionId === 'backtrack') return walletBacktrackStatus() || 'Backtracking from May 20, 2026';
	    if (actionId.startsWith('sync_releases')) return 'Checking marketplace releases';
	    if (actionId.startsWith('balance:')) return 'Setting wallet balance';
	    if (actionId.startsWith('release:')) return 'Releasing wallet';
	    return '';
	  };

	  const setWalletMode = (mode) => {
	    state.wallet.mode = ['wallet', 'api'].includes(mode) ? mode : 'wallet';
	    walletRefs.modeButtons.forEach((button) => {
	      const active = button.getAttribute('data-wallet-mode') === state.wallet.mode;
	      button.classList.toggle('is-active', active);
	      button.setAttribute('aria-pressed', active ? 'true' : 'false');
	    });
	    if (walletRefs.walletPanel) walletRefs.walletPanel.hidden = state.wallet.mode !== 'wallet';
	    if (walletRefs.apiPanel) walletRefs.apiPanel.hidden = state.wallet.mode !== 'api';
	    if (walletRefs.tableMeta) {
	      walletRefs.tableMeta.textContent = state.wallet.mode === 'api'
	          ? 'API terminal'
	          : 'Per account';
	    }
	  };

	  const walletUpdateTime = (value) => {
	    const date = parseOrderTimestamp(value || '');
	    if (!date) return '';
	    return formatDashboardTime(date, state.timezone, {
	      hour: '2-digit',
	      minute: '2-digit',
	      hour12: false
	    });
	  };

	  const walletMutationLabel = (wallet) => {
	    const events = [
	      { label: 'Set', value: wallet.manual_anchor_created_at || wallet.manual_anchor_observed_at || '' },
	      { label: 'System', value: wallet.last_wallet_transaction_at || wallet.last_released_at || wallet.last_mirrored_at || '' }
	    ]
	      .map((event) => ({
	        ...event,
	        date: parseOrderTimestamp(event.value)
	      }))
	      .filter((event) => event.date && !Number.isNaN(event.date.getTime()))
	      .sort((a, b) => b.date.getTime() - a.date.getTime());
	    if (!events.length) return 'Last Update: -';
	    const time = walletUpdateTime(events[0].value);
	    return time ? `${events[0].label}: ${time}` : 'Last Update: -';
	  };

	  const walletDatetimeLocalValue = (value) => {
	    const date = value ? new Date(value) : new Date();
	    if (Number.isNaN(date.getTime())) return '';
	    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
	    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
	  };

	  const walletBalanceNote = (wallet) => {
	    if (!wallet.wallet_balance_known) return 'Manual balance required';
	    const anchor = formatCurrency(wallet.manual_anchor_balance || 0);
	    if (wallet.wallet_activity_source === 'platform_wallet_transactions') {
	      const activity = formatCurrency(wallet.wallet_activity_since_anchor_total || wallet.wallet_transaction_since_anchor_total || 0);
	      return `${anchor} set + ${activity} wallet activity`;
	    }
	    const since = formatCurrency(wallet.released_since_anchor_total || 0);
	    return `${anchor} set + ${since} released`;
	  };

	  const walletOrderCounts = (wallet) => {
	    return formatRegionalInteger(wallet.outstanding_orders || 0);
	  };

	  const renderWalletApiOutput = () => {
	    if (walletRefs.apiInput && document.activeElement !== walletRefs.apiInput) {
	      walletRefs.apiInput.value = state.wallet.apiQuery || '';
	    }
	    if (walletRefs.apiRun) {
	      walletRefs.apiRun.disabled = state.wallet.apiLoading;
	      walletRefs.apiRun.textContent = state.wallet.apiLoading ? 'Running' : 'Run';
	    }
	    if (walletRefs.apiCopy) {
	      walletRefs.apiCopy.disabled = !state.wallet.apiResult || state.wallet.apiLoading;
	    }
	    if (!walletRefs.apiOutput) return;
	    const payload = state.wallet.apiResult || {
	      query: state.wallet.apiQuery,
	      endpoint: '/api/wallet/?action=terminal&query=' + encodeURIComponent(state.wallet.apiQuery || ''),
	      result: 'ready'
	    };
	    walletRefs.apiOutput.textContent = JSON.stringify(payload, null, 2);
	  };

	  const renderWallet = (data = state.wallet.data) => {
	    if (data) {
	      state.wallet.data = data;
	      if (!state.wallet.usingCache) writeWalletCache(data);
	    }
	    if (state.activeView !== 'wallet') return;
	    const wallets = Array.isArray(state.wallet.data?.wallets) ? state.wallet.data.wallets : [];
	    const totals = state.wallet.data?.totals || {};
	    const activeAction = state.wallet.actionId;
	    const backtrack = state.wallet.data?.backtrack || {};

	    setWalletMode(state.wallet.mode);
	    renderWalletApiOutput();
	    if (walletRefs.balance) {
	      walletRefs.balance.textContent = Number(totals.manual_anchor_count || 0) > 0 ? formatCurrency(totals.wallet_balance || 0) : 'Set balance';
	    }
	    if (walletRefs.outstanding) walletRefs.outstanding.textContent = formatCurrency(totals.outstanding_total || 0);
	    if (walletRefs.released) walletRefs.released.textContent = formatCurrency(totals.released_total || 0);
	    if (walletRefs.status) {
	      walletRefs.status.textContent = walletActionStatus(activeAction) || walletBacktrackStatus(backtrack) || (state.wallet.loading
	        ? 'Loading wallets'
	        : state.wallet.backgroundLoading
	          ? 'Updating wallets in background'
	        : `${formatRegionalInteger(wallets.length)} wallets / ${formatRegionalInteger(totals.outstanding_orders || 0)} outstanding / ${formatRegionalInteger(totals.manual_required_count || 0)} need set`);
	    }
	    if (walletRefs.refresh) {
	      walletRefs.refresh.disabled = state.wallet.loading || Boolean(activeAction);
	      walletRefs.refresh.classList.toggle('is-loading', state.wallet.loading || activeAction.startsWith('sync_releases'));
	    }
	    if (walletRefs.backtrack) {
	      const backtracking = activeAction === 'backtrack' || Boolean(backtrack.active);
	      walletRefs.backtrack.disabled = state.wallet.loading || Boolean(activeAction);
	      walletRefs.backtrack.textContent = backtracking ? 'Backtracking' : 'Backtrack';
	      walletRefs.backtrack.classList.toggle('is-loading', backtracking);
	    }

	    if (walletRefs.tableBody) {
	      if (!wallets.length) {
	        walletRefs.tableBody.innerHTML = `<tr><td colspan="6" class="admin-empty">${state.wallet.loading || state.wallet.backgroundLoading ? 'Loading wallets.' : 'No wallets found.'}</td></tr>`;
	      } else {
	        walletRefs.tableBody.innerHTML = renderRows(wallets, 6, (wallet) => {
	          const balance = walletAmount(wallet.wallet_balance);
	          const balanceKnown = Boolean(wallet.wallet_balance_known);
	          const platform = escapeHtml(wallet.platform || '');
	          const accountKey = escapeHtml(wallet.account_key || '');
	          const walletKey = `${wallet.platform || ''}|${wallet.account_key || ''}`;
	          const actionKey = `balance:${walletKey}`;
	          const editorOpen = state.wallet.balanceEditorKey === walletKey;
	          const disabled = state.wallet.loading || Boolean(activeAction);
	          return `
	            <tr>
	              <td class="admin-wallet-account">
	                <span class="admin-wallet-account-title">
	                  <strong>${escapeHtml(wallet.label || wallet.account_key || '-')}</strong>
	                  <button type="button" class="admin-wallet-set-link" data-wallet-balance-toggle data-wallet-key="${escapeHtml(walletKey)}" ${disabled ? 'disabled' : ''}>${editorOpen ? 'Close' : 'Set'}</button>
	                </span>
	                <small>${escapeHtml(wallet.platform || '-')} / ${escapeHtml(wallet.account_key || '-')}</small>
	                ${editorOpen ? `
	                  <div class="admin-wallet-balance-control">
	                    <input class="admin-wallet-balance-amount" type="number" min="0" step="1" inputmode="numeric" value="${balanceKnown ? balance : ''}" data-wallet-balance-amount aria-label="Wallet balance for ${escapeHtml(wallet.label || wallet.account_key || 'wallet')}" ${disabled ? 'disabled' : ''}>
	                    <input class="admin-wallet-balance-at" type="datetime-local" value="${escapeHtml(walletDatetimeLocalValue(wallet.manual_anchor_observed_at || ''))}" data-wallet-balance-at aria-label="Observed time for ${escapeHtml(wallet.label || wallet.account_key || 'wallet')}" ${disabled ? 'disabled' : ''}>
	                    <button type="button" class="admin-wallet-action" data-wallet-balance-set data-wallet-platform="${platform}" data-wallet-account="${accountKey}" ${disabled ? 'disabled' : ''}>${activeAction === actionKey ? 'Setting' : 'Save'}</button>
	                  </div>
	                ` : ''}
	              </td>
	              <td>${formatCurrency(wallet.released_total || 0)}</td>
	              <td><strong>${balanceKnown ? formatCurrency(balance) : 'Set balance'}</strong><small class="admin-wallet-muted">${escapeHtml(walletBalanceNote(wallet))}</small></td>
	              <td>${formatCurrency(wallet.outstanding_total || 0)}</td>
	              <td><span class="admin-wallet-counts" title="Outstanding orders">${walletOrderCounts(wallet)}</span></td>
	              <td class="admin-wallet-action-cell">
	                <div class="admin-wallet-balance-summary">
	                  <span><span class="admin-wallet-updated">${escapeHtml(walletMutationLabel(wallet))}</span></span>
	                </div>
	              </td>
	            </tr>
	          `;
	        }, 'No wallets found.');
	      }
	    }
	  };

  const closeOrdersDatePopover = () => {
    if (ordersRefs.datePopover) ordersRefs.datePopover.hidden = true;
  };

  const setOrdersCalendarMonth = (dateValue = '') => {
    state.orders.calendarMonth = monthKeyFromDate(dateValue || state.orders.filters[state.orders.activeDateField === 'end' ? 'endDate' : 'startDate'] || todayDate());
  };

  const renderOrdersDateCalendar = () => {
    if (!ordersRefs.dateGrid || !ordersRefs.dateMonth) return;
    const monthKey = state.orders.calendarMonth || monthKeyFromDate(todayDate());
    const first = dateKeyToCalendarDate(firstMonthDay(monthKey));
    const calendarStart = new Date(first);
    const weekday = (calendarStart.getDay() + 6) % 7;
    calendarStart.setDate(calendarStart.getDate() - weekday);
    const monthFormatter = new Intl.DateTimeFormat(getRegionalDateLocale(), { timeZone: state.timezone, month: 'long', year: 'numeric' });
    ordersRefs.dateMonth.textContent = monthFormatter.format(first);
    const today = todayDate();
    const { startDate, endDate } = state.orders.filters;
    const days = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + index);
      const key = calendarDateKey(date);
      const inMonth = key.slice(0, 7) === monthKey;
      const inRange = startDate && endDate && key >= startDate && key <= endDate;
      const isStart = startDate && key === startDate;
      const isEnd = endDate && key === endDate;
      days.push(`
        <button type="button" class="admin-range-day${inMonth ? '' : ' is-outside'}${key === today ? ' is-today' : ''}${inRange ? ' is-final-range is-in-range' : ''}${isStart ? ' is-selected-start' : ''}${isEnd ? ' is-selected-end' : ''}" data-orders-date="${key}">
          <span class="admin-range-day-label">${Number(key.slice(-2))}</span>
        </button>
      `);
    }
    ordersRefs.dateGrid.innerHTML = days.join('');
  };

  const selectOrdersDate = async (dateValue) => {
    if (!dateValue) return;
    const field = state.orders.activeDateField === 'end' ? 'endDate' : 'startDate';
    state.orders.filters[field] = dateValue;
    if (state.orders.filters.startDate && state.orders.filters.endDate && state.orders.filters.startDate > state.orders.filters.endDate) {
      if (field === 'startDate') {
        state.orders.filters.endDate = dateValue;
      } else {
        state.orders.filters.startDate = dateValue;
      }
    }
    resetOrderRenderWindow();
    syncOrderLoadedAll();
    syncOrderFilterControls();
    renderOrdersDateCalendar();
    renderOrders();
    closeOrdersDatePopover();
    try {
      await ensureEnoughOrderRows();
    } catch (error) {
      showOrderLoadError(error);
    }
  };

  const renderHome = (data) => {
    state.home.data = data;
    const summary = data.summary || {};
    const bySource = (Array.isArray(data.by_source) ? data.by_source : []).filter((item) => !shouldHideSourceMetric(item.source));
    const byUrl = (Array.isArray(data.by_url) ? data.by_url : []).filter((item) => !shouldHideSourceMetric(item.source));
    const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];
    const timeseriesByProduct = Array.isArray(data.timeseries_by_product) ? data.timeseries_by_product : timeseries.map((item) => ({
      bucket_start: item.bucket_start,
      label: item.label,
      total: {
        views: Number(item.views || 0),
        order_now_clicks: Number(item.order_now_clicks || 0),
        checkout_clicks: Number(item.checkout_clicks || 0),
        add_to_cart_events: Number(item.add_to_cart_events || 0)
      },
      bubur: { views: 0, order_now_clicks: 0, checkout_clicks: 0, add_to_cart_events: 0 },
      jamu: { views: 0, order_now_clicks: 0, checkout_clicks: 0, add_to_cart_events: 0 }
    }));
    const hourOfDay = Array.isArray(data.hour_of_day) ? data.hour_of_day : [];
    const recentEvents = (Array.isArray(data.recent_events) ? data.recent_events : []).filter((item) => !shouldHideSourceMetric(item.source));

    if (homeRefs.summaryViews) homeRefs.summaryViews.textContent = formatRegionalInteger(summary.total_views);
    if (homeRefs.summaryOrder) homeRefs.summaryOrder.textContent = formatRegionalInteger(summary.order_now_clicks);
    if (homeRefs.summaryCheckout) homeRefs.summaryCheckout.textContent = formatRegionalInteger(summary.checkout_clicks);
    if (homeRefs.summaryTime) homeRefs.summaryTime.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));
    if (homeRefs.endpointLabel) homeRefs.endpointLabel.textContent = endpoint;

    if (homeRefs.urlTableBody) {
      homeRefs.urlTableBody.innerHTML = renderRows(byUrl, 6, (item) => `
        <tr>
          <td><strong>${escapeHtml(item.page_path || '-')}</strong></td>
          <td>${escapeHtml(toTitleCase(item.source || 'unknown'))}</td>
          <td>${formatRegionalInteger(item.views)}</td>
          <td>${formatRegionalInteger(item.order_now_clicks)}</td>
          <td>${formatRegionalInteger(item.checkout_clicks)}</td>
          <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
        </tr>
      `);
    }

    if (homeRefs.sourceTableBody) {
      homeRefs.sourceTableBody.innerHTML = renderRows(bySource, 5, (item) => `
        <tr>
          <td><strong>${escapeHtml(toTitleCase(item.source || 'unknown'))}</strong></td>
          <td>${formatRegionalInteger(item.views)}</td>
          <td>${formatRegionalInteger(item.order_now_clicks)}</td>
          <td>${formatRegionalInteger(item.checkout_clicks)}</td>
          <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
        </tr>
      `);
    }

    renderEventFeed(homeRefs.recentEvents, recentEvents, (item) => `
      <div class="admin-event-item">
        <strong>${escapeHtml(item.event_type || 'event')} • ${escapeHtml(toTitleCase(item.source || 'unknown'))}</strong>
        <span>${escapeHtml(item.page_path || '-')}</span>
        <small>${escapeHtml(item.occurred_at || '')}</small>
      </div>
    `, 'Belum ada aktivitas.');

    drawMultiLineChart(homeRefs.trendCanvas, timeseriesByProduct, state.home.metric, HOME_METRIC_UNITS, [
      { key: 'total', label: HOME_TREND_SERIES.total.label, color: HOME_TREND_SERIES.total.color, visible: true },
      { key: 'bubur', label: HOME_TREND_SERIES.bubur.label, color: HOME_TREND_SERIES.bubur.color, visible: state.home.series.bubur },
      { key: 'jamu', label: HOME_TREND_SERIES.jamu.label, color: HOME_TREND_SERIES.jamu.color, visible: state.home.series.jamu }
    ]);
    drawBarChart(homeRefs.hourCanvas, hourOfDay, {
      value: (item) => item[state.home.metric] || 0,
      label: (item) => String(Number(item.hour || 0)),
      color: () => SOURCE_COLORS.facebook,
      metric: state.home.metric,
      unitsMap: HOME_METRIC_UNITS,
      valueLabel: (_item, value) => formatRegionalInteger(value),
      tooltipTitle: (item) => `Hour ${Number(item.hour || 0)} ${getTimezoneLabel(state.timezone)}`,
      tooltipValue: (_item, value) => formatRegionalInteger(value),
      limit: 24
    });
    renderProductCartRundown(homeRefs.productCartRundown, homeRefs.productCartMeta, data.product_cart, 'No cart adds in this timeframe.');
    drawBarChart(homeRefs.sourceCanvas, bySource, {
      value: (item) => item.views || 0,
      label: (item) => String(toTitleCase(item.source || 'unknown')),
      color: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || SOURCE_COLORS.unknown,
      metric: 'views',
      unitsMap: HOME_METRIC_UNITS,
      tooltipTitle: (item) => `${toTitleCase(item.source || 'unknown')} source`,
      limit: 6
    });
    drawBarChart(homeRefs.urlCanvas, byUrl, {
      value: (item) => item.checkout_clicks || 0,
      label: (item) => formatPageLabel(item.page_path || '-'),
      color: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || SOURCE_COLORS.unknown,
      metric: 'checkout_clicks',
      unitsMap: HOME_METRIC_UNITS,
      tooltipTitle: (item) => item.page_path || '/',
      limit: 6
    });
    renderSourceLegend(bySource);
    setLastUpdated(homeRefs.lastUpdated, data.meta?.generated_at);
    if (homeRefs.trendTitle) homeRefs.trendTitle.textContent = HOME_METRIC_LABELS[state.home.metric];
    if (homeRefs.trendMeta) homeRefs.trendMeta.textContent = `Timeframe: ${state.home.timeframe.toUpperCase()} • Scope: Landing pages • Timezone: ${getTimezoneLabel(state.timezone)}`;
    homeRefs.timeframeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.homeTimeframe === state.home.timeframe);
    });
    homeRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.homeMetric === state.home.metric);
    });
    homeRefs.seriesButtons.forEach((button) => {
      const key = button.dataset.homeSeries;
      button.classList.toggle('is-active', Boolean(key && state.home.series[key]));
    });
  };

  const renderWebsite = (data) => {
    state.website.data = data;
    state.website.screen = 'detail';
    renderWebsiteShell();
    const summary = data.summary || {};
    const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];

    if (websiteRefs.summaryVisitors) websiteRefs.summaryVisitors.textContent = formatRegionalInteger(summary.total_visitors);
    if (websiteRefs.summaryPageViews) websiteRefs.summaryPageViews.textContent = formatRegionalInteger(summary.total_page_views);
    if (websiteRefs.summaryAddToCart) websiteRefs.summaryAddToCart.textContent = formatRegionalInteger(summary.add_to_cart_events);
    if (websiteRefs.summaryCheckout) websiteRefs.summaryCheckout.textContent = formatRegionalInteger(summary.checkout_clicks);
    if (websiteRefs.summaryTime) websiteRefs.summaryTime.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));
    if (websiteRefs.summaryTopRegion) websiteRefs.summaryTopRegion.textContent = summary.top_region || 'Unknown';
    if (websiteRefs.excludedCount) websiteRefs.excludedCount.textContent = formatRegionalInteger(summary.excluded_ip_count);
    if (websiteRefs.settingsEndpointLabel) websiteRefs.settingsEndpointLabel.textContent = settingsEndpoint;

    drawLineChart(websiteRefs.trendCanvas, timeseries, state.website.metric, WEBSITE_METRIC_UNITS, {
      lineColor: '#60a5fa'
    });

    setLastUpdated(websiteRefs.lastUpdated, data.meta?.generated_at);
    const siteLabel = WEBSITE_SITE_LABELS[state.website.site]?.title || 'Website';
    if (websiteRefs.trendTitle) websiteRefs.trendTitle.textContent = `${siteLabel} ${WEBSITE_METRIC_LABELS[state.website.metric].replace(/^Website\s+/i, '').replace(/^website\s+/i, '')}`;
    if (websiteRefs.trendMeta) websiteRefs.trendMeta.textContent = `Timeframe: ${state.website.timeframe.toUpperCase()} • Scope: ${siteLabel} • Timezone: ${getTimezoneLabel(state.timezone)}`;
    websiteRefs.timeframeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteTimeframe === state.website.timeframe);
    });
    websiteRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteMetric === state.website.metric);
    });
    renderWebsitePaidMetrics();
  };

  const renderWebsiteShell = () => {
    const isDetail = state.website.screen === 'detail' && Boolean(state.website.site);
    const siteConfig = WEBSITE_SITE_LABELS[state.website.site] || null;

    if (websiteRefs.selector) websiteRefs.selector.hidden = isDetail;
    if (websiteRefs.detail) websiteRefs.detail.hidden = !isDetail;
    if (websiteRefs.header) websiteRefs.header.classList.toggle('is-detail', isDetail);
    websiteRefs.backButtons.forEach((button) => {
      button.hidden = !isDetail;
    });
    websiteRefs.openButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteOpen === state.website.site);
    });

    if (!isDetail || !siteConfig) {
      if (zeroStoreRefs.panel) zeroStoreRefs.panel.hidden = true;
      if (jenangGemiStoreRefs.panel) jenangGemiStoreRefs.panel.hidden = true;
      if (websiteRefs.heroChip) websiteRefs.heroChip.textContent = 'Official Website Dashboard';
      if (websiteRefs.heroTitle) websiteRefs.heroTitle.textContent = 'Select a website dashboard.';
      if (websiteRefs.heroCopy) websiteRefs.heroCopy.textContent = 'Choose jenanggemi.com or zerofoods.id to open the dedicated website analytics page. Each page uses browser-tagged website visits only.';
      return;
    }

    if (websiteRefs.heroChip) websiteRefs.heroChip.textContent = siteConfig.chip;
    if (websiteRefs.heroTitle) websiteRefs.heroTitle.textContent = siteConfig.title;
    if (websiteRefs.heroCopy) websiteRefs.heroCopy.textContent = siteConfig.copy;
    if (websiteRefs.scopeNote) websiteRefs.scopeNote.textContent = siteConfig.scope;
    if (zeroStoreRefs.panel) zeroStoreRefs.panel.hidden = state.website.site !== 'zero';
    if (jenangGemiStoreRefs.panel) jenangGemiStoreRefs.panel.hidden = state.website.site !== 'jenang_gemi';
    renderWebsitePaidMetrics();
  };

  const showWebsiteSelector = () => {
    state.website.screen = 'select';
    state.website.site = '';
    renderWebsiteShell();
  };

  const openWebsiteSite = async (site) => {
    if (!WEBSITE_SITE_LABELS[site]) return;
    state.website.site = site;
    state.website.screen = 'detail';
    renderWebsiteShell();
    await loadWebsiteSafely({ force: true, preferStale: false });
    if (site === 'zero') {
      await loadZeroStoreSafely();
    } else if (site === 'jenang_gemi') {
      try {
        await loadJenangGemiStore();
      } catch (error) {
        setJenangGemiStoreError(error.message);
      }
    }
    await loadNotifications().catch(() => {});
  };

  const setZeroStoreError = (message = '') => {
    if (!zeroStoreRefs.error) return;
    zeroStoreRefs.error.hidden = !message;
    zeroStoreRefs.error.textContent = message;
  };

  const formatIdr = (value) => formatCurrency(value);

  const zeroStoreActionUrl = (action) => `${zeroStoreEndpoint}?action=${encodeURIComponent(action)}&_ts=${Date.now()}`;

  const postZeroStore = (action, body) => requestJson(zeroStoreActionUrl(action), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const discountSummary = (discount) => {
    const amount = discount.discount_type === 'percent'
      ? `${formatRegionalNumber(discount.amount || 0)}%`
      : formatIdr(discount.amount);
    return `${amount} | ${discount.starts_on || '-'} to ${discount.ends_on || '-'}`;
  };

  const zeroItemLabel = (item) => [
    item.product_name || '',
    item.option_name || item.variant_name || item.flavor_name || '',
    item.size_label || ''
  ].filter(Boolean).join(' · ');

  const zeroItemIdentity = (item) => item.sku_linked
    ? (item.sku || item.sku_code || '')
    : (item.fallback_sku || item.sku_code || item.item_key || '');

  const zeroItemLinkNote = (item) => {
    if (item.sku_linked) return '';
    const candidate = String(item.sku || item.sku_code || '').trim();
    return /^[A-Z0-9]{12}$/.test(candidate) ? 'Needs SKU DB link' : 'No SKU DB code set';
  };

  const normalizeZeroStoreSearch = (value) => String(value || '').trim().toLowerCase();

  const zeroDiscountSearchText = (discount, itemByKey) => {
    const itemKeys = discount.item_keys || discount.skus || [];
    const itemText = itemKeys.map((itemKey) => {
      const item = itemByKey.get(String(itemKey));
      return item
        ? `${itemKey} ${zeroItemIdentity(item)} ${zeroItemLabel(item)}`
        : String(itemKey);
    }).join(' ');
    return normalizeZeroStoreSearch([
      discount.name,
      discount.discount_type,
      discount.amount,
      discount.starts_on,
      discount.ends_on,
      itemText
    ].filter(Boolean).join(' '));
  };

  const syncZeroDiscountRangeFields = () => {
    if (zeroStoreRefs.rangeStart) zeroStoreRefs.rangeStart.value = state.zeroStore.rangeStart;
    if (zeroStoreRefs.rangeEnd) zeroStoreRefs.rangeEnd.value = state.zeroStore.rangeEnd;
    if (zeroStoreRefs.rangeLabel) {
      zeroStoreRefs.rangeLabel.textContent = state.zeroStore.rangeStart && state.zeroStore.rangeEnd
        ? `${state.zeroStore.rangeStart} to ${state.zeroStore.rangeEnd}`
        : 'Select date range';
    }
  };

  const renderZeroStore = () => {
    if (zeroStoreRefs.panel) zeroStoreRefs.panel.hidden = state.website.site !== 'zero';
    if (state.website.site !== 'zero') return;
    const items = state.zeroStore.items;
    const discounts = state.zeroStore.discounts;
    const itemByKey = new Map(items.map((item) => [String(item.item_key || ''), item]));
    const filteredItems = state.zeroStore.productFilter
      ? items.filter((item) => String(item.product_slug || '') === state.zeroStore.productFilter)
      : items;
    const discountQuery = normalizeZeroStoreSearch(state.zeroStore.discountSearch);
    const filteredDiscounts = discountQuery
      ? discounts.filter((discount) => zeroDiscountSearchText(discount, itemByKey).includes(discountQuery))
      : discounts;
    if (zeroStoreRefs.productFilter) zeroStoreRefs.productFilter.value = state.zeroStore.productFilter;
    if (zeroStoreRefs.discountSearch) zeroStoreRefs.discountSearch.value = state.zeroStore.discountSearch;
    if (zeroStoreRefs.itemTable) {
      zeroStoreRefs.itemTable.innerHTML = renderRows(filteredItems, 9, (item) => `
        <tr>
          <td><strong>${escapeHtml(zeroItemIdentity(item))}</strong>${item.sku_linked ? '' : `<br><small>${escapeHtml(zeroItemLinkNote(item))}</small>`}</td>
          <td>${escapeHtml(item.product_name || '')}</td>
          <td>${escapeHtml(item.option_name || item.variant_name || item.flavor_name || '')}</td>
          <td>${escapeHtml(item.size_label || '')}</td>
          <td>${item.sku_linked ? formatRegionalInteger(item.stock) : 'Unlinked'}</td>
          <td>${item.sku_linked ? formatIdr(item.cogs) : 'Unlinked'}</td>
          <td>${formatIdr(item.price)}</td>
          <td>${Number(item.is_active || 0) === 1 ? '<span class="admin-status-badge">Visible</span>' : '<span class="admin-status-badge admin-status-badge-warn">Hidden</span>'}</td>
          <td><button type="button" class="admin-soft-btn" data-zero-edit-item="${escapeHtml(item.item_key || '')}">Edit</button></td>
        </tr>
      `, state.zeroStore.productFilter ? 'No ZERO sale items match this product filter.' : 'No ZERO sale items found.');
    }
    if (zeroStoreRefs.skuPicker) {
      zeroStoreRefs.skuPicker.innerHTML = `
        <div class="admin-store-sku-picker-head">
          <span class="admin-control-label">Included SKUs</span>
          <button type="button" class="admin-soft-btn" data-zero-toggle-visible-items>Toggle All</button>
        </div>
        ${items.length ? items.map((item) => `
          <label class="admin-store-sku-option" data-zero-sku-product="${escapeHtml(item.product_slug || '')}"${state.zeroStore.productFilter && String(item.product_slug || '') !== state.zeroStore.productFilter ? ' hidden' : ''}>
            <input type="checkbox" name="item_keys" value="${escapeHtml(item.item_key || '')}">
            <span><strong>${escapeHtml(zeroItemIdentity(item))}</strong>${escapeHtml(` ${zeroItemLabel(item)}`)}</span>
          </label>
        `).join('') : '<p class="admin-empty">No ZERO sale items found.</p>'}
      `;
    }
    if (zeroStoreRefs.discountList) {
      zeroStoreRefs.discountList.innerHTML = filteredDiscounts.length ? filteredDiscounts.map((discount) => `
        <div class="admin-note-card">
          <strong>${escapeHtml(discount.name || '')}</strong>
          <span>${escapeHtml(discountSummary(discount))}</span>
          <small>${(discount.item_keys || discount.skus || []).map(escapeHtml).join(', ') || 'No items'}</small>
          <div class="admin-inline-actions">
            <button type="button" class="admin-soft-btn" data-zero-edit-discount="${Number(discount.id || 0)}">Edit</button>
            <button type="button" class="admin-soft-btn" data-zero-delete-discount="${Number(discount.id || 0)}">Delete</button>
          </div>
        </div>
      `).join('') : `<p class="admin-empty">${discountQuery ? 'No discount groups match this search.' : 'No discounts yet.'}</p>`;
    }
    syncZeroDiscountRangeFields();
  };

  const loadZeroStore = async () => {
    const data = await requestJson(zeroStoreActionUrl('list'));
    state.zeroStore.items = Array.isArray(data.items) ? data.items : [];
    state.zeroStore.discounts = Array.isArray(data.discounts) ? data.discounts : [];
    renderZeroStore();
  };

  const loadZeroStoreSafely = async () => {
    try {
      await loadZeroStore();
      setZeroStoreError('');
      return true;
    } catch (error) {
      setZeroStoreError(error.message);
      return false;
    }
  };

  const resetZeroDiscountForm = () => {
    zeroStoreRefs.discountForm?.reset();
    state.zeroStore.activeDiscountId = '';
    state.zeroStore.rangeStart = '';
    state.zeroStore.rangeEnd = '';
    state.zeroStore.draftStart = '';
    state.zeroStore.hoverDate = '';
    if (zeroStoreRefs.discountForm?.elements.id) zeroStoreRefs.discountForm.elements.id.value = '';
    syncZeroDiscountRangeFields();
    renderZeroDiscountCalendar();
  };

  const zeroDiscountBounds = () => {
    if (state.zeroStore.draftStart && state.zeroStore.hoverDate) {
      return {
        start: state.zeroStore.draftStart <= state.zeroStore.hoverDate ? state.zeroStore.draftStart : state.zeroStore.hoverDate,
        end: state.zeroStore.draftStart <= state.zeroStore.hoverDate ? state.zeroStore.hoverDate : state.zeroStore.draftStart,
        preview: true
      };
    }
    if (state.zeroStore.draftStart) return { start: state.zeroStore.draftStart, end: state.zeroStore.draftStart, preview: true };
    return { start: state.zeroStore.rangeStart, end: state.zeroStore.rangeEnd, preview: false };
  };

  const renderZeroDiscountCalendar = () => {
    if (!zeroStoreRefs.calendarGrid || !zeroStoreRefs.calendarMonth) return;
    const firstDay = dateKeyToCalendarDate(firstMonthDay(state.zeroStore.calendarMonth));
    const month = firstDay.getMonth();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);
    const today = todayDate();
    const bounds = zeroDiscountBounds();
    zeroStoreRefs.calendarMonth.textContent = new Intl.DateTimeFormat(getRegionalDateLocale(), {
      timeZone: state.timezone,
      month: 'long',
      year: 'numeric'
    }).format(firstDay);
    const days = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = calendarDateKey(date);
      const outside = date.getMonth() !== month;
      const inRange = bounds.start && bounds.end && key >= bounds.start && key <= bounds.end;
      const selectedStart = bounds.start && key === bounds.start;
      const selectedEnd = bounds.end && key === bounds.end;
      const classes = [
        'admin-range-day',
        outside ? 'is-outside' : '',
        inRange ? 'is-in-range' : '',
        bounds.preview && inRange ? 'is-preview' : '',
        !bounds.preview && inRange ? 'is-final-range' : '',
        selectedStart ? 'is-selected-start' : '',
        selectedEnd ? 'is-selected-end' : '',
        key === today ? 'is-today' : ''
      ].filter(Boolean).join(' ');
      days.push(`<button type="button" class="${classes}" data-zero-discount-date="${key}"><span class="admin-range-day-label">${date.getDate()}</span></button>`);
    }
    zeroStoreRefs.calendarGrid.innerHTML = days.join('');
  };

  const selectZeroDiscountDate = (dateValue) => {
    if (!dateValue) return;
    if (!state.zeroStore.draftStart) {
      state.zeroStore.draftStart = dateValue;
      state.zeroStore.hoverDate = dateValue;
      state.zeroStore.rangeStart = '';
      state.zeroStore.rangeEnd = '';
      state.zeroStore.calendarMonth = monthKeyFromDate(dateValue);
      syncZeroDiscountRangeFields();
      renderZeroDiscountCalendar();
      return;
    }
    state.zeroStore.rangeStart = state.zeroStore.draftStart <= dateValue ? state.zeroStore.draftStart : dateValue;
    state.zeroStore.rangeEnd = state.zeroStore.draftStart <= dateValue ? dateValue : state.zeroStore.draftStart;
    state.zeroStore.draftStart = '';
    state.zeroStore.hoverDate = '';
    if (zeroStoreRefs.calendar) zeroStoreRefs.calendar.hidden = true;
    syncZeroDiscountRangeFields();
    renderZeroDiscountCalendar();
  };

  const renderDeviceExclusionList = () => {
    if (!websiteRefs.deviceExclusionList) return;
    const items = state.website.deviceExclusions;
    if (!items.length) {
      websiteRefs.deviceExclusionList.innerHTML = '<p class="admin-empty">Belum ada device yang dikecualikan.</p>';
      return;
    }

    websiteRefs.deviceExclusionList.innerHTML = items.map((item) => `
      <div class="admin-settings-device-row">
        <span class="admin-settings-device-mark" aria-hidden="true"></span>
        <span class="admin-settings-device-copy">
          <strong>${escapeHtml(item.label || 'Unlabeled device')}</strong>
          <code>${escapeHtml(item.device_id || '')}</code>
        </span>
        <button type="button" class="admin-settings-device-remove" data-delete-device-exclusion="${escapeHtml(String(item.id || ''))}" aria-label="Remove ignored device">
          <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/trash-2.svg" alt="" width="18" height="18" loading="lazy" referrerpolicy="no-referrer">
        </button>
      </div>
    `).join('');
  };

  const renderCurrentDeviceId = () => {
    if (websiteRefs.currentDeviceId) {
      websiteRefs.currentDeviceId.textContent = state.website.currentDeviceId || 'Unavailable on this browser.';
    }
    if (websiteRefs.ignoreCurrentDeviceButton) {
      websiteRefs.ignoreCurrentDeviceButton.disabled = !state.website.currentDeviceId;
    }
  };

  const clearDeviceExclusionError = () => {
    if (!websiteRefs.deviceExclusionError) return;
    websiteRefs.deviceExclusionError.hidden = true;
    websiteRefs.deviceExclusionError.textContent = '';
  };

  const refreshAnalyticsAfterDeviceExclusion = async () => {
    await Promise.allSettled([
      loadOverviewSafely({ force: true, preferStale: false }),
      loadHomeSafely({ force: true, preferStale: false }),
      loadWebsiteSafely({ force: true, preferStale: false }),
      loadWebsiteSettingsSafely({ force: true, preferStale: false })
    ]);
  };

  const refreshOverviewHourlyRows = async (requestToken = null, options = {}) => {
    const hourlyRequestToken = state.overview.hourlyRequestToken + 1;
    state.overview.hourlyRequestToken = hourlyRequestToken;
    const today = todayDate();
    const hourlyData = await requestOrderFacts(today, today, {
      lightweight: true,
      repair: Boolean(options.repair),
      cacheBust: Boolean(options.repair)
    });
    if (requestToken !== null && !isLatestRequest('overview', requestToken)) return;
    if (hourlyRequestToken !== state.overview.hourlyRequestToken) return;
    state.overview.hourlyRows = hourlyOrderRows(Array.isArray(hourlyData.orders) ? hourlyData.orders : []);
    state.overview.hourlyDate = today;
    renderOverviewHourlyPanel();
  };

  const loadOverview = async (options = {}) => {
    if (!options.forceRefresh && !options.force && state.overview.data) {
      if (isFresh(state.overview.loadedAt, VIEW_CACHE_TTL_MS.overview)) {
        renderOverview(state.overview.data);
        return;
      }
      if (options.preferStale !== false) {
        renderOverview(state.overview.data);
        if (!options.background) queueViewRefresh('overview');
        return;
      }
    }
    if (options.useCache) {
      const cached = readOverviewCache(state.overview.year);
      if (cached) {
        renderOverview(cached);
        if (options.cacheFirst) {
          state.overview.loadedAt = Date.now();
          if (!options.skipHourly) {
            refreshOverviewHourlyRows().catch(() => {});
          }
          queueViewRefresh('overview');
          return;
        }
      }
    }
    const requestToken = beginRequest('overview');
    if (!options.skipHourly) {
      refreshOverviewHourlyRows(requestToken).catch(() => {});
    }
    const [data, customData] = await Promise.all([
      requestJson(buildSalesUrl(state.overview.year, {
        refresh: Boolean(options.forceRefresh),
        cacheBust: Boolean(options.forceRefresh || options.force)
      })),
      state.overview.customRange.active && state.overview.customRange.startDate && state.overview.customRange.endDate
        ? requestOrderFacts(state.overview.customRange.startDate, state.overview.customRange.endDate).catch(() => ({ orders: [] }))
        : Promise.resolve(null)
    ]);
    if (!isLatestRequest('overview', requestToken)) return;
    if (customData) {
      state.overview.customRange.rows = Array.isArray(customData.orders) ? customData.orders : [];
    }
    writeOverviewCache(state.overview.year, data);
    state.overview.loadedAt = Date.now();
    renderOverview(data);
  };

  const readAutoMarketplaceRefreshAt = () => {
    try {
      return Math.max(0, Number(window.localStorage.getItem(AUTO_MARKETPLACE_REFRESH_STORAGE_KEY) || 0));
    } catch (_) {
      return 0;
    }
  };

  const writeAutoMarketplaceRefreshAt = (timestamp) => {
    state.marketplaceRefresh.lastAutoAttemptAt = timestamp;
    try {
      window.localStorage.setItem(AUTO_MARKETPLACE_REFRESH_STORAGE_KEY, String(timestamp));
    } catch (_) {
      // Local storage is a tab-level optimization only; the server lock is authoritative.
    }
  };

	  const syncActiveOrderViewsAfterRepair = async () => {
	    if (state.activeView === 'orders') {
	      state.orders.monthsSignature = '';
	      await loadOrdersSafely({ force: true, preferStale: false, repair: true });
	      return;
	    }
	    if (state.activeView === 'wallet') {
	      await syncWalletReleases({ skipRemote: true, background: true });
	      preloadOrderMemory({ reset: true, repair: true }).catch(() => {});
	      return;
	    }
	    if (state.activeView === 'daily') {
	      await loadDailySafely({ force: true, preferStale: false, repair: true });
	      return;
	    }
    preloadOrderMemory({ reset: true, repair: true }).catch(() => {});
  };

  const runMarketplaceRefresh = async (options = {}) => {
    const interactive = Boolean(options.interactive);
    if (state.marketplaceRefresh.loading) return false;
    state.marketplaceRefresh.loading = true;
    if (interactive && overviewRefs.refreshButton) {
      overviewRefs.refreshButton.disabled = true;
      overviewRefs.refreshButton.classList.add('is-loading');
      overviewRefs.refreshButton.setAttribute('aria-busy', 'true');
    }
    if (interactive && overviewRefs.refreshLabel) overviewRefs.refreshLabel.textContent = 'Refreshing…';
    if (interactive && overviewRefs.lastUpdated) overviewRefs.lastUpdated.textContent = 'Refreshing the dashboard view…';

    try {
      const data = await requestJson(buildSalesUrl(state.overview.year, {
        manualRefresh: true,
        cacheBust: true
      }), { method: 'POST', timeoutMs: 90000 });
      writeOverviewCache(state.overview.year, data);
      renderOverview(data);
      await refreshOverviewHourlyRows(null, { repair: true }).catch(() => {});
      if (state.activeView === 'overview') {
        await loadOverviewLocationRows({ force: true, incremental: true, repair: true }).catch(() => {});
      }
      await syncActiveOrderViewsAfterRepair();
      if (interactive && overviewRefs.refreshLabel) {
        overviewRefs.refreshLabel.textContent = 'Refreshed';
        window.setTimeout(() => {
          if (!state.marketplaceRefresh.loading && overviewRefs.refreshLabel) {
            overviewRefs.refreshLabel.textContent = 'Refresh View';
          }
        }, 1800);
      }
      return true;
    } catch (error) {
      if (interactive && overviewRefs.refreshLabel) overviewRefs.refreshLabel.textContent = 'Try again';
      if (interactive && overviewRefs.lastUpdated) {
        overviewRefs.lastUpdated.textContent = `Refresh failed: ${error.message || 'Unable to sync marketplace data.'}`;
      } else if (!String(error?.message || '').includes('marketplace_refresh_in_progress')) {
        console.warn('Automatic marketplace refresh failed', error);
      }
      return false;
    } finally {
      state.marketplaceRefresh.loading = false;
      if (interactive && overviewRefs.refreshButton) {
        overviewRefs.refreshButton.disabled = false;
        overviewRefs.refreshButton.classList.remove('is-loading');
        overviewRefs.refreshButton.removeAttribute('aria-busy');
      }
    }
  };

  const refreshMarketplaceData = () => runMarketplaceRefresh({ interactive: true });

  const runAutomaticMarketplaceRefresh = async (options = {}) => {
    if (document.hidden || state.marketplaceRefresh.loading) return false;
    const now = Date.now();
    const lastAttemptAt = Math.max(state.marketplaceRefresh.lastAutoAttemptAt, readAutoMarketplaceRefreshAt());
    const syncStatus = state.overview.data?.sync_status;
    const syncLooksStale = syncStatus?.fresh === false || syncStatus?.status === 'missing';
    const force = Boolean(options.force || syncLooksStale);
    if (!force && now - lastAttemptAt < AUTO_MARKETPLACE_REFRESH_MIN_MS) {
      return false;
    }
    writeAutoMarketplaceRefreshAt(now);
    return runMarketplaceRefresh({ interactive: false });
  };

  const loadDaily = async (options = {}) => {
    if (!options.force && state.daily.data) {
      if (isFresh(state.daily.loadedAt, VIEW_CACHE_TTL_MS.daily)) {
        renderDaily(state.daily.data);
        return;
      }
      if (options.preferStale !== false) {
        renderDaily(state.daily.data);
        if (!options.background) queueViewRefresh('daily');
        return;
      }
    }
    const requestToken = beginRequest('daily');
    const month = parseDailyMonth(state.daily.month);
    state.daily.month = `${month.year}-${String(month.month).padStart(2, '0')}`;
    state.daily.loading = true;
    if (dailyRefs.status) dailyRefs.status.textContent = `Loading ${formatDailyMonthLabel(state.daily.month)} order lines...`;
    if (dailyRefs.exportButton) dailyRefs.exportButton.disabled = true;

    let offset = 0;
    let guard = 0;
    const rows = [];
    while (guard < 80) {
      guard += 1;
      const payload = await requestOrderFacts(month.start, month.end, {
        lightweight: true,
        storedOnly: true,
        repair: Boolean(options.repair) && offset === 0,
        limit: DAILY_ORDER_PAGE_LIMIT,
        offset,
        cacheBust: Boolean(options.force || options.repair)
      });
      if (!isLatestRequest('daily', requestToken)) return;
      rows.push(...(Array.isArray(payload.orders) ? payload.orders : []));
      const nextOffset = Number(payload.next_offset);
      if (!payload.has_more || !Number.isFinite(nextOffset) || nextOffset <= offset) {
        break;
      }
      offset = nextOffset;
      if (dailyRefs.status) {
        dailyRefs.status.textContent = `Loading ${formatDailyMonthLabel(state.daily.month)} order lines... ${formatRegionalInteger(rows.length)} loaded`;
      }
    }

    if (!isLatestRequest('daily', requestToken)) return;
    state.daily.rows = rows;
    state.daily.loading = false;
    state.daily.loadedAt = Date.now();
    renderDaily(aggregateDailyData(rows, state.daily.month));
  };

  const loadHome = async (options = {}) => {
    if (!options.force && state.home.data) {
      if (isFresh(state.home.loadedAt, VIEW_CACHE_TTL_MS.home)) {
        renderHome(state.home.data);
        return;
      }
      if (options.preferStale !== false) {
        renderHome(state.home.data);
        if (!options.background) queueViewRefresh('home');
        return;
      }
    }
    const requestToken = beginRequest('home');
    const data = await requestJson(buildAnalyticsUrl('landing', state.home.timeframe, { cacheBust: Boolean(options.force) }));
    if (!isLatestRequest('home', requestToken)) return;
    writeHomeCache(data);
    state.home.loadedAt = Date.now();
    renderHome(data);
  };

  const loadWebsite = async (options = {}) => {
    if (!options.force && state.website.data) {
      if (isFresh(state.website.loadedAt, VIEW_CACHE_TTL_MS.website)) {
        renderWebsite(state.website.data);
        return;
      }
      if (options.preferStale !== false) {
        renderWebsite(state.website.data);
        if (!options.background) queueViewRefresh('website');
        return;
      }
    }
    const requestToken = beginRequest('website');
    const data = await requestJson(buildAnalyticsUrl('website', state.website.timeframe, { cacheBust: Boolean(options.force) }));
    if (!isLatestRequest('website', requestToken)) return;
    state.website.loadedAt = Date.now();
    renderWebsite(data);
  };

  const loadWebsiteSettings = async (options = {}) => {
    if (!options.force && isFresh(state.website.settingsLoadedAt, VIEW_CACHE_TTL_MS.settings)) {
      renderDeviceExclusionList();
      renderCurrentDeviceId();
      return;
    }
    const requestToken = beginRequest('website', true);
    const data = await requestJson(buildSettingsUrl('website_settings', { cacheBust: Boolean(options.force) }));
    if (!isLatestRequest('website', requestToken, true)) return;
    state.website.deviceExclusions = Array.isArray(data.excluded_devices) ? data.excluded_devices : [];
    state.website.currentDeviceId = ensureAnalyticsDeviceId();
    state.website.settingsLoadedAt = Date.now();
    renderDeviceExclusionList();
    renderCurrentDeviceId();
  };

  const mergeLoadedOrderRows = (rows) => {
    if (!(state.orders.rowKeys instanceof Set)) {
      state.orders.rowKeys = new Set(state.orders.rows.map(uniqueOrderRowKey));
    }
    const seen = state.orders.rowKeys;
    const incoming = [];
    const platforms = new Set(state.orders.platforms);
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const key = uniqueOrderRowKey(row);
      if (seen.has(key)) return;
      seen.add(key);
      incoming.push(enrichOrderRow(row));
      const platform = String(row.platform || '').trim();
      if (platform && !platforms.has(platform)) {
        platforms.add(platform);
        state.orders.platforms.push(platform);
      }
    });
    if (!incoming.length) return;
    incoming.sort((left, right) => Number(right._orderTimestamp || 0) - Number(left._orderTimestamp || 0));
    if (!state.orders.rows.length) {
      state.orders.rows = incoming;
      return;
    }

    const merged = [];
    let currentIndex = 0;
    let incomingIndex = 0;
    while (currentIndex < state.orders.rows.length && incomingIndex < incoming.length) {
      const current = state.orders.rows[currentIndex];
      const next = incoming[incomingIndex];
      if (Number(current._orderTimestamp || 0) >= Number(next._orderTimestamp || 0)) {
        merged.push(current);
        currentIndex += 1;
      } else {
        merged.push(next);
        incomingIndex += 1;
      }
    }
    state.orders.rows = merged
      .concat(state.orders.rows.slice(currentIndex))
      .concat(incoming.slice(incomingIndex));
  };

  const orderRangeKey = (range) => range?.key || `${range?.start || ''}:${range?.end || ''}`;

  const orderRangeMatchesDateFilters = (range) => {
    const { startDate, endDate } = state.orders.filters;
    if (startDate && range.end < startDate) return false;
    if (endDate && range.start > endDate) return false;
    return true;
  };

  const nextOrderRange = () => state.orders.monthRanges.find((range) => (
    orderRangeMatchesDateFilters(range) &&
    !state.orders.loadedRangeKeys.has(orderRangeKey(range))
  )) || null;

  const syncOrderLoadedAll = () => {
    state.orders.loadedAll = !nextOrderRange();
  };

  const orderLoadProgressSignature = () => [
    state.orders.rows.length,
    state.orders.loadedRangeKeys.size,
    Object.keys(state.orders.rangeOffsets)
      .sort()
      .map((key) => `${key}:${state.orders.rangeOffsets[key]}`)
      .join(',')
  ].join('|');

  const renderOrdersIfActive = () => {
    if (state.activeView === 'orders') renderOrders();
  };

  const resetOrderWindowsFromOverview = () => {
    const data = state.overview.data || {};
    const years = Array.isArray(data.years) ? data.years : [state.overview.year];
    const months = Array.isArray(data.months) ? data.months : [];
    const ranges = deriveOrderMonthRanges(years, months);
    const signature = ranges.map(orderRangeKey).join('|');
    if (
      signature === state.orders.monthsSignature &&
      (state.orders.rows.length || state.orders.loadedAll || state.orders.loading || state.orders.loadPromise)
    ) {
      syncOrderLoadedAll();
      return;
    }
    state.orders.monthRanges = ranges;
    state.orders.monthsSignature = signature;
    state.orders.loadedRangeKeys = new Set();
    state.orders.rangeOffsets = {};
    state.orders.loading = false;
    state.orders.loadedAll = false;
    state.orders.loadGeneration += 1;
    state.orders.loadPromise = null;
    state.orders.renderLimit = ORDER_RENDER_BATCH_SIZE;
    state.orders.ensurePending = false;
    state.orders.rows = [];
    state.orders.rowKeys = new Set();
    state.orders.platforms = [];
    state.orders.activeFiltersSignature = '';
    state.orders.platformsRenderSignature = '';
    renderOrdersIfActive();
  };

  const loadNextOrderWindow = async (options = {}) => {
    if (state.orders.loadPromise) return state.orders.loadPromise;
    if (!state.orders.monthRanges.length) resetOrderWindowsFromOverview();
    syncOrderLoadedAll();
    const nextRange = nextOrderRange();
    if (!nextRange) {
      state.orders.loadedAll = true;
      renderOrdersIfActive();
      return;
    }
    const generation = state.orders.loadGeneration;
    state.orders.loading = true;
    renderOrdersIfActive();
    const loadPromise = (async () => {
      let completed = false;
      try {
        const requestToken = beginRequest('orders');
        const rangeKey = orderRangeKey(nextRange);
        const requestOffset = Number(state.orders.rangeOffsets[rangeKey] || 0);
        const data = await requestOrderFacts(nextRange.start, nextRange.end, {
          limit: ORDER_LOAD_PAGE_SIZE,
          offset: requestOffset,
          storedOnly: true,
          repair: Boolean(options.repair) && requestOffset === 0,
          cacheBust: Boolean(options.repair) && requestOffset === 0
        });
        if (!isLatestRequest('orders', requestToken) || generation !== state.orders.loadGeneration) return;
        const rows = Array.isArray(data.orders) ? data.orders : [];
        mergeLoadedOrderRows(rows);
        const nextOffset = Number(data.next_offset);
        if (data.has_more && Number.isFinite(nextOffset) && nextOffset > requestOffset) {
          state.orders.rangeOffsets[rangeKey] = nextOffset;
        } else {
          state.orders.loadedRangeKeys.add(rangeKey);
          delete state.orders.rangeOffsets[rangeKey];
        }
        syncOrderLoadedAll();
        state.orders.data = {
          ok: true,
          start_date: nextRange.start,
          end_date: nextRange.end,
          orders: state.orders.rows
        };
        completed = true;
      } finally {
        if (generation === state.orders.loadGeneration) {
          state.orders.loading = false;
          renderOrdersIfActive();
          if (completed && state.orders.ensurePending) {
            state.orders.ensurePending = false;
            ensureEnoughOrderRows(options).catch(showOrderLoadError);
          }
        }
        if (state.orders.loadPromise === loadPromise) {
          state.orders.loadPromise = null;
        }
      }
    })();
    state.orders.loadPromise = loadPromise;
    return loadPromise;
  };

  const ensureEnoughOrderRows = async (options = {}) => {
    if (state.orders.ensureRunning) {
      state.orders.ensurePending = true;
      return;
    }
    state.orders.ensureRunning = true;
    try {
      if (!state.orders.monthRanges.length && !state.orders.loadedAll) resetOrderWindowsFromOverview();
      syncOrderLoadedAll();
      let loadedWindows = 0;
      while (!state.orders.loadedAll && loadedWindows < ORDER_BOOTSTRAP_MAX_WINDOWS) {
        const rows = filteredOrderRows();
        const needsViewportFill = ordersRefs.scroll
          ? ordersRefs.scroll.scrollHeight <= ordersRefs.scroll.clientHeight + 24
          : rows.length < ORDER_BOOTSTRAP_MIN_ROWS;
        if (rows.length >= ORDER_BOOTSTRAP_MIN_ROWS && !needsViewportFill) break;
        const progressSignature = orderLoadProgressSignature();
        await loadNextOrderWindow({ repair: Boolean(options.repair) });
        if (orderLoadProgressSignature() === progressSignature) break;
        loadedWindows += 1;
      }
    } finally {
      state.orders.ensureRunning = false;
      if (state.orders.ensurePending && !state.orders.loading) {
        state.orders.ensurePending = false;
        ensureEnoughOrderRows(options).catch(showOrderLoadError);
      }
    }
  };

  let orderMemoryPreloadPromise = null;
  const preloadOrderMemory = async (options = {}) => {
    if (orderMemoryPreloadPromise && !options.reset) return orderMemoryPreloadPromise;
    if (options.reset) {
      state.orders.monthsSignature = '';
      state.orders.loadedAt = 0;
    }

    orderMemoryPreloadPromise = (async () => {
      if (!state.overview.data && !options.skipOverviewRefresh) {
        loadOverviewSafely({
          background: true,
          preferStale: false,
          useCache: true,
          skipHourly: true
        }).catch(() => {});
      }
      if (!state.orders.monthRanges.length || options.reset) {
        resetOrderWindowsFromOverview();
      }
      syncOrderLoadedAll();

      let windowsLoaded = 0;
      while (
        !document.hidden &&
        !state.orders.loadedAll &&
        state.orders.rows.length < ORDER_BACKGROUND_TARGET_ROWS &&
        windowsLoaded < ORDER_BACKGROUND_MAX_WINDOWS
      ) {
        const progressSignature = orderLoadProgressSignature();
        await loadNextOrderWindow({ repair: Boolean(options.repair) });
        if (orderLoadProgressSignature() === progressSignature) break;
        windowsLoaded += 1;
        await wait(BACKGROUND_TASK_DELAY_MS);
      }
      state.orders.loadedAt = Date.now();
      return {
        rows: state.orders.rows.length,
        loadedAll: state.orders.loadedAll
      };
    })();

    try {
      return await orderMemoryPreloadPromise;
    } finally {
      orderMemoryPreloadPromise = null;
    }
  };

  const loadOrders = async (options = {}) => {
    if (!options.force && state.orders.data) {
      if (isFresh(state.orders.loadedAt, VIEW_CACHE_TTL_MS.orders)) {
        renderOrdersIfActive();
        return;
      }
      if (options.preferStale !== false) {
        renderOrdersIfActive();
        if (!options.background) queueViewRefresh('orders');
        return;
      }
    }
    if (!state.overview.data) {
      await loadOverviewSafely({ useCache: true, skipHourly: true });
    }
    resetOrderWindowsFromOverview();
    await ensureEnoughOrderRows({ repair: Boolean(options.repair) });
    if (state.orders.loadPromise) {
      await state.orders.loadPromise;
    }
    state.orders.loadedAt = Date.now();
  };

  const showOrderLoadError = (error) => {
    state.orders.loading = false;
    const message = error instanceof Error ? error.message : 'Unable to load orders.';
    if (ordersRefs.tableBody && !state.orders.rows.length) {
      ordersRefs.tableBody.innerHTML = `<tr><td colspan="12" class="admin-empty">${escapeHtml(message)}</td></tr>`;
    }
    if (ordersRefs.status) ordersRefs.status.textContent = message;
    if (ordersRefs.loadMore) {
      ordersRefs.loadMore.hidden = false;
      ordersRefs.loadMore.disabled = false;
      ordersRefs.loadMore.textContent = 'Retry';
    }
  };

  const loadOrdersSafely = async (options = {}) => {
    try {
      await loadOrders(options);
      return true;
    } catch (error) {
      showOrderLoadError(error);
      return false;
    }
  };

	  const shouldAutoSyncWalletReleases = (options = {}) => {
	    if (options.skipReleaseSync) return false;
	    if (!isBrowserOnline()) return false;
	    if (state.wallet.releaseSyncPromise || state.wallet.backtrackRunning) return false;
	    if (state.wallet.actionId && !String(state.wallet.actionId).startsWith('sync_releases')) return false;
	    const lastStarted = Number(state.wallet.releaseSyncedAt || 0);
	    if (!lastStarted) return true;
	    if (options.force) return Date.now() - lastStarted > 30000;
	    return Date.now() - lastStarted >= AUTO_REFRESH_INTERVAL_MS;
	  };

	  const startWalletReleaseSync = (options = {}) => {
	    if (!shouldAutoSyncWalletReleases(options)) return state.wallet.releaseSyncPromise || null;
	    state.wallet.releaseSyncedAt = Date.now();
	    state.wallet.releaseSyncPromise = syncWalletReleases({
	      background: true,
	      fallback: false,
	      silent: true,
	      skipRemote: Boolean(options.skipRemote)
	    }).finally(() => {
	      state.wallet.releaseSyncPromise = null;
	    });
	    return state.wallet.releaseSyncPromise;
	  };

	  const restoreWalletFromCache = () => {
	    const cached = readWalletCache();
	    if (!cached) return false;
	    state.wallet.loadedAt = cached.savedAt || state.wallet.loadedAt || 0;
	    state.wallet.usingCache = true;
	    renderWallet(cached.data);
	    return true;
	  };

	  const loadWallet = async (options = {}) => {
	    if (!options.force && state.wallet.data) {
	      if (isFresh(state.wallet.loadedAt, VIEW_CACHE_TTL_MS.wallet)) {
	        renderWallet(state.wallet.data);
	        startWalletReleaseSync(options);
	        return;
	      }
	      if (options.preferStale !== false) {
	        renderWallet(state.wallet.data);
	        if (!options.background) queueViewRefresh('wallet');
	        return;
	      }
	    }
	    if (!options.force && !state.wallet.data && options.useCache !== false) {
	      const restored = restoreWalletFromCache();
	      if (restored && options.preferStale !== false) {
	        if (!options.background && isBrowserOnline()) queueViewRefresh('wallet');
	        return;
	      }
	    }
	    if (!isBrowserOnline()) {
	      if (state.wallet.data || restoreWalletFromCache()) {
	        if (state.activeView === 'wallet' && walletRefs.status) {
	          walletRefs.status.textContent = 'Offline / showing last wallet update';
	        }
	        return;
	      }
	    }
	    if (options.background && state.wallet.loading) return;
	    const requestToken = beginRequest('wallet');
	    const showLoading = !options.background;
	    if (showLoading) state.wallet.loading = true;
	    renderWallet(state.wallet.data);
	    try {
	      const data = await requestJson(walletActionUrl('summary'), { timeoutMs: 30000 });
	      if (!isLatestRequest('wallet', requestToken)) return;
	      state.wallet.loadedAt = Date.now();
	      state.wallet.usingCache = false;
	      state.wallet.loading = false;
	      renderWallet(data);
	      startWalletReleaseSync(options);
	    } catch (error) {
	      if (showLoading && isLatestRequest('wallet', requestToken)) {
	        state.wallet.loading = false;
	      }
	      throw error;
	    }
	  };

	  const loadWalletSafely = async (options = {}) => {
	    try {
	      await loadWallet(options);
	      return true;
	    } catch (error) {
	      if (options.background && state.wallet.data) {
	        return false;
	      }
	      renderViewError('wallet', error);
	      return false;
	    }
	  };

	  const postWalletAction = async (action, body, actionId, options = {}) => {
	    const interactive = !options.background;
	    if (interactive) state.wallet.actionId = actionId;
	    if (interactive && walletRefs.status) {
	      walletRefs.status.textContent = walletActionStatus(actionId);
	    }
	    if (interactive) renderWallet(state.wallet.data);
	    try {
	      const data = await requestJson(walletActionUrl(action), {
	        method: 'POST',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify(body),
	        timeoutMs: options.timeoutMs || 30000
	      });
	      state.wallet.loadedAt = Date.now();
	      state.wallet.usingCache = false;
	      renderWallet(data);
	      return true;
	    } catch (error) {
	      if (options.silent || !interactive) {
	        if (walletRefs.status) walletRefs.status.textContent = error?.message || 'Wallet refresh unavailable';
	      } else {
	        renderViewError('wallet', error);
	      }
	      return false;
	    } finally {
	      if (interactive) {
	        state.wallet.actionId = '';
	        renderWallet(state.wallet.data);
	      }
	    }
	  };

	  const syncWalletReleases = async (options = {}) => {
	    const ok = await postWalletAction(
	      'sync_releases',
	      { skip_remote: Boolean(options.skipRemote) },
	      options.background ? 'sync_releases:background' : 'sync_releases',
	      { timeoutMs: 95000, silent: Boolean(options.silent), background: Boolean(options.background) }
	    );
	    if (ok) state.wallet.releaseSyncedAt = Date.now();
	    if (!ok && options.fallback !== false) {
	      return loadWalletSafely({ force: true, preferStale: false });
	    }
	    return ok;
	  };

	  const runWalletTerminal = async () => {
	    const query = walletRefs.apiInput instanceof HTMLInputElement ? walletRefs.apiInput.value.trim() : state.wallet.apiQuery;
	    state.wallet.apiQuery = query || 'Jenang Gemi Shopee Wallet Info';
	    state.wallet.apiLoading = true;
	    state.wallet.mode = 'api';
	    renderWallet(state.wallet.data);
	    try {
	      const data = await requestJson(walletActionUrl('terminal', { query: state.wallet.apiQuery }), { timeoutMs: 30000 });
	      state.wallet.apiResult = data;
	      if (walletRefs.status) walletRefs.status.textContent = data?.command || 'Wallet API ready';
	      renderWallet(state.wallet.data);
	      return true;
	    } catch (error) {
	      state.wallet.apiResult = { ok: false, error: error?.message || 'wallet_api_failed', query: state.wallet.apiQuery };
	      if (walletRefs.status) walletRefs.status.textContent = state.wallet.apiResult.error;
	      renderWallet(state.wallet.data);
	      return false;
	    } finally {
	      state.wallet.apiLoading = false;
	      renderWallet(state.wallet.data);
	    }
	  };

	  const copyWalletApiResult = async () => {
	    const output = walletRefs.apiOutput?.textContent || '';
	    if (!output) return;
	    try {
	      await navigator.clipboard.writeText(output);
	      if (walletRefs.status) walletRefs.status.textContent = 'Wallet API copied';
	    } catch (error) {
	      if (walletRefs.status) walletRefs.status.textContent = 'Copy unavailable';
	    }
	  };

	  const runWalletBacktrack = async (startNew = true) => {
	    if (state.wallet.backtrackRunning) return true;
	    state.wallet.backtrackRunning = true;
	    state.wallet.actionId = 'backtrack';
	    renderWallet(state.wallet.data);
	    try {
	      let data = state.wallet.data;
	      if (startNew || !data?.backtrack?.active) {
	        data = await requestJson(walletActionUrl('backtrack'), {
	          method: 'POST',
	          headers: { 'Content-Type': 'application/json' },
	          body: JSON.stringify({}),
	          timeoutMs: 30000
	        });
	        state.wallet.loadedAt = Date.now();
	        renderWallet(data);
	      }

	      let backtrack = data?.backtrack || state.wallet.data?.backtrack || {};
	      for (let step = 0; backtrack.active && step < 1000; step += 1) {
	        await wait(200);
	        const stepData = await requestJson(walletActionUrl('backtrack_step'), {
	          method: 'POST',
	          headers: { 'Content-Type': 'application/json' },
	          body: JSON.stringify({ run_key: backtrack.run_key || '' }),
	          timeoutMs: 130000
	        });
	        state.wallet.loadedAt = Date.now();
	        renderWallet(stepData);
	        backtrack = stepData.backtrack || {};
	      }

	      if (backtrack.status === 'complete') {
	        await loadWalletSafely({ force: true, preferStale: false });
	      }
	      return backtrack.status === 'complete';
	    } catch (error) {
	      renderViewError('wallet', error);
	      return false;
	    } finally {
	      state.wallet.actionId = '';
	      state.wallet.backtrackRunning = false;
	      renderWallet(state.wallet.data);
	    }
	  };

	  const loadDailySafely = async (options = {}) => {
    try {
      await loadDaily(options);
      return true;
    } catch (error) {
      state.daily.loading = false;
      if (dailyRefs.status) {
        dailyRefs.status.textContent = `Daily report unavailable: ${error?.message || 'Unknown error'}`;
      }
      if (dailyRefs.sheetBody) {
        dailyRefs.sheetBody.innerHTML = `<tr><td colspan="6" class="admin-empty">Unable to load Daily: ${escapeHtml(error?.message || 'Unknown error')}</td></tr>`;
      }
      if (dailyRefs.sheetFoot) dailyRefs.sheetFoot.innerHTML = '';
      return false;
    }
  };

  const loadOrderCatalog = async () => {
    try {
      const data = await requestJson(skuCatalogEndpoint);
      state.orders.catalog = Array.isArray(data.catalog) ? data.catalog : [];
      state.orders.skuCatalogByCode = {};
      (Array.isArray(data.skus) ? data.skus : []).forEach((sku) => {
        [sku.sku, sku.tag].forEach((code) => {
          const normalized = normalizeOrderFilterValue(code);
          const compact = compactOrderFilterValue(code);
          if (normalized) state.orders.skuCatalogByCode[normalized] = sku;
          if (compact) state.orders.skuCatalogByCode[compact] = sku;
        });
      });
    } catch (_error) {
      state.orders.catalog = [];
      state.orders.skuCatalogByCode = {};
    }
    renderSkuOrderTree();
  };

  const loadActiveView = async (options = {}) => {
	    if (state.activeView === 'overview') {
	      await loadOverview(options);
	      return;
	    }
	    if (state.activeView === 'orders') {
	      await loadOrders(options);
	      return;
	    }
	    if (state.activeView === 'wallet') {
	      await loadWallet(options);
	      return;
	    }
	    if (state.activeView === 'daily') {
	      await loadDaily(options);
	      return;
	    }
    if (state.activeView === 'store-ops') {
      return;
    }
    if (state.activeView === 'context') {
      await loadContext();
      return;
    }
    if (state.activeView === 'home') {
      await loadHome(options);
      return;
    }
    if (state.activeView === 'website') {
      if (state.website.screen === 'detail' && state.website.site) {
        await loadWebsite(options);
      } else {
        showWebsiteSelector();
      }
      return;
    }
    if (state.activeView === 'hard-set') {
      await loadHardSet();
      return;
    }
    if (state.activeView === 'settings') {
      await loadWebsiteSettings(options);
    }
  };

  const loadOverviewSafely = async (options = {}) => {
    try {
      await loadOverview(options);
      return true;
    } catch (error) {
      renderViewError('overview', error);
      return false;
    }
  };

  const loadHomeSafely = async (options = {}) => {
    try {
      await loadHome(options);
      return true;
    } catch (error) {
      renderViewError('home', error);
      return false;
    }
  };

  const loadWebsiteSafely = async (options = {}) => {
    try {
      await loadWebsite(options);
      return true;
    } catch (error) {
      renderViewError('website', error);
      return false;
    }
  };

  const loadWebsiteSettingsSafely = async (options = {}) => {
    try {
      await loadWebsiteSettings(options);
      return true;
    } catch (error) {
      if (websiteRefs.deviceExclusionError) {
        websiteRefs.deviceExclusionError.hidden = false;
        websiteRefs.deviceExclusionError.textContent = `Gagal memuat excluded device list: ${error.message}`;
      }
      return false;
    }
  };

  const loadActiveViewSafely = async (options = {}) => {
	    if (state.activeView === 'overview') {
	      return loadOverviewSafely(options);
	    }
	    if (state.activeView === 'orders') {
	      return loadOrdersSafely(options);
	    }
	    if (state.activeView === 'wallet') {
	      return loadWalletSafely(options);
	    }
	    if (state.activeView === 'daily') {
	      return loadDailySafely(options);
	    }
    if (state.activeView === 'store-ops') {
      return true;
    }
    if (state.activeView === 'context') {
      try {
        await loadContext();
        return true;
      } catch (error) {
        setContextError(error.message || 'Unable to load context.');
        return false;
      }
    }
    if (state.activeView === 'home') {
      return loadHomeSafely(options);
    }
    if (state.activeView === 'website') {
      if (state.website.screen === 'detail' && state.website.site) {
        return loadWebsiteSafely(options);
      }
      showWebsiteSelector();
      return true;
    }
    if (state.activeView === 'hard-set') {
      try {
        await loadHardSet();
        return true;
      } catch (error) {
        if (hardSetRefs.switchNote) hardSetRefs.switchNote.textContent = error.message || 'Unable to load Hard Set.';
        return false;
      }
    }
    if (state.activeView === 'settings') {
      return loadWebsiteSettingsSafely(options);
    }
    return true;
  };

  let activeRefreshTimer = null;
  const queueActiveViewRefresh = (options = {}) => {
    if (activeRefreshTimer) window.clearTimeout(activeRefreshTimer);
    activeRefreshTimer = window.setTimeout(() => {
      activeRefreshTimer = null;
      loadActiveViewSafely({
        force: options.force !== false,
        forceRefresh: Boolean(options.forceRefresh),
        repair: Boolean(options.repair),
        preferStale: false,
        background: true
      }).catch(() => {});
    }, options.delay || LIVE_REFRESH_DEBOUNCE_MS);
  };

  const queueViewRefresh = (view) => {
    const options = { force: true, preferStale: false, background: true };
    if (view === 'overview') return loadOverviewSafely({ ...options, forceRefresh: true });
    if (view === 'orders') return loadOrdersSafely(options);
    if (view === 'wallet') return loadWalletSafely(options);
    if (view === 'daily') return loadDailySafely(options);
    if (view === 'home') return loadHomeSafely(options);
    if (view === 'website' && state.website.screen === 'detail' && state.website.site) return loadWebsiteSafely(options);
    if (view === 'settings') return loadWebsiteSettingsSafely(options);
    return Promise.resolve(false);
  };

  let walletBackgroundRefreshTimer = null;

  const runWalletBackgroundRefresh = async (options = {}) => {
    if (document.hidden) return false;
    if (!isBrowserOnline()) {
      if (!state.wallet.data) restoreWalletFromCache();
      return false;
    }
    if (state.wallet.backgroundRefreshPromise) return state.wallet.backgroundRefreshPromise;
    const now = Date.now();
    if (!options.force && now - Number(state.wallet.backgroundRefreshAt || 0) < WALLET_BACKGROUND_REFRESH_MIN_MS) {
      return false;
    }
    state.wallet.backgroundRefreshAt = now;
    state.wallet.backgroundLoading = true;
    renderWallet(state.wallet.data);
    state.wallet.backgroundRefreshPromise = loadWalletSafely({
      force: true,
      preferStale: false,
      background: true,
      skipReleaseSync: Boolean(options.skipReleaseSync)
    }).finally(() => {
      state.wallet.backgroundRefreshPromise = null;
      state.wallet.backgroundLoading = false;
      renderWallet(state.wallet.data);
    });
    return state.wallet.backgroundRefreshPromise;
  };

  const scheduleWalletBackgroundRefresh = (options = {}) => {
    if (walletBackgroundRefreshTimer || state.wallet.backgroundRefreshPromise) return;
    const run = () => {
      walletBackgroundRefreshTimer = null;
      runWalletBackgroundRefresh(options).catch(() => {});
    };
    if ('requestIdleCallback' in window) {
      walletBackgroundRefreshTimer = window.requestIdleCallback(run, { timeout: BACKGROUND_IDLE_TIMEOUT_MS });
      return;
    }
    walletBackgroundRefreshTimer = window.setTimeout(run, BACKGROUND_TASK_DELAY_MS);
  };

  const refreshForLocalDateRollover = async () => {
    const nextLocalDate = todayDate();
    if (nextLocalDate === activeLocalDate) return false;

    activeLocalDate = nextLocalDate;

    state.overview.year = Number(activeLocalDate.slice(0, 4)) || state.overview.year;
    state.overview.hourlyRows = [];
    state.overview.hourlyDate = activeLocalDate;
    state.orders.monthsSignature = '';

	    await Promise.allSettled([
	      loadOverviewSafely({ force: true, preferStale: false }),
	      state.activeView === 'orders' ? loadOrdersSafely({ force: true, preferStale: false }) : Promise.resolve(true),
	      state.activeView === 'wallet' ? loadWalletSafely({ force: true, preferStale: false }) : Promise.resolve(true),
	      state.activeView === 'daily' ? loadDailySafely({ force: true, preferStale: false }) : Promise.resolve(true)
	    ]);
    return true;
  };

  const renderCachedCharts = () => {
	    if (state.activeView === 'overview' && state.overview.data) renderOverview(state.overview.data);
	    if (state.activeView === 'daily' && state.daily.data) renderDaily(aggregateDailyData(Array.isArray(state.daily.rows) ? state.daily.rows : state.daily.data.rows, state.daily.month));
	    if (state.activeView === 'wallet' && state.wallet.data) renderWallet(state.wallet.data);
	    if (state.activeView === 'home' && state.home.data) renderHome(state.home.data);
    if (state.activeView === 'website' && state.website.screen === 'detail' && state.website.data) renderWebsite(state.website.data);
  };

  const syncRegionalControls = () => {
    regionalRefs.controls.forEach((control) => {
      if (!(control instanceof HTMLSelectElement)) return;
      control.value = regionalDefaults[control.name] || REGIONAL_DEFAULTS_FALLBACK[control.name] || '';
    });
  };

  const renderRegionalPreview = () => {
    if (regionalRefs.previewDate) {
      regionalRefs.previewDate.textContent = `${formatDashboardTime(new Date(), regionalDefaults.timezone, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })} ${getTimezoneLabel(regionalDefaults.timezone)}`;
    }
    if (regionalRefs.previewCurrency) {
      regionalRefs.previewCurrency.textContent = formatCurrency(1234567);
    }
  };

  const applyRegionalSettings = (nextDefaults) => {
    writeRegionalDefaults({ ...regionalDefaults, ...nextDefaults });
    state.timezone = regionalDefaults.timezone;
    syncRegionalControls();
    renderRegionalPreview();
	    renderCachedCharts();
	    if (state.activeView === 'orders') {
	      renderOrdersDateCalendar();
	      renderOrders();
	    }
	    if (state.activeView === 'wallet') {
	      renderWallet();
	    }
    if (state.activeView === 'overview') {
      renderOverviewRangeCalendar();
      renderOverviewHourlyPanel();
    }
    if (state.activeView === 'hard-set') {
      renderHardSet();
    }
    renderZeroDiscountCalendar();
  };

  const activateOrdersViewInstantly = () => {
    if (!state.orders.monthRanges.length && !state.orders.loadedAll) {
      resetOrderWindowsFromOverview();
    }
    if (!state.orders.rows.length && !state.orders.loadedAll && !state.orders.loading) {
      state.orders.loading = true;
    }
    renderOrders();
    ensureEnoughOrderRows()
      .then(async () => {
        if (state.orders.loadPromise) await state.orders.loadPromise;
        state.orders.loadedAt = Date.now();
        preloadOrderMemory().catch(showOrderLoadError);
      })
      .catch(showOrderLoadError);
  };

  const activateWalletViewInstantly = () => {
    const restored = state.wallet.data ? true : restoreWalletFromCache();
    const online = isBrowserOnline();
    state.wallet.backgroundLoading = online;
    renderWallet(state.wallet.data);
    if (online) {
      scheduleWalletBackgroundRefresh({ force: true });
    } else if (!restored && walletRefs.status) {
      walletRefs.status.textContent = 'Offline / waiting for last wallet update';
    }
  };

  const activateOverviewViewInstantly = () => {
    let rendered = false;
    if (state.overview.data) {
      renderOverview(state.overview.data);
      rendered = true;
    } else {
      const cached = readOverviewCache(state.overview.year);
      if (cached) {
        state.overview.loadedAt = Date.now();
        renderOverview(cached);
        rendered = true;
      }
    }
    if (isBrowserOnline()) {
      return {
        rendered,
        refreshPromise: loadOverviewSafely({ force: true, preferStale: false, background: true, useCache: true })
      };
    }
    return { rendered, refreshPromise: Promise.resolve(false) };
  };

  const restoreHomeFromCache = () => {
    const cached = readHomeCache();
    if (!cached) return false;
    state.home.loadedAt = Date.now();
    renderHome(cached);
    return true;
  };

  const activateHomeViewInstantly = () => {
    const restored = state.home.data ? true : restoreHomeFromCache();
    if (state.home.data) renderHome(state.home.data);
    if (!restored && homeRefs.trendMeta) {
      homeRefs.trendMeta.textContent = isBrowserOnline()
        ? 'Loading campaign analytics in background'
        : 'Offline / waiting for last campaign update';
    }
    if (isBrowserOnline()) {
      return {
        rendered: restored,
        refreshPromise: loadHomeSafely({ force: true, preferStale: false, background: true })
      };
    }
    return { rendered: restored, refreshPromise: Promise.resolve(false) };
  };

  const switchView = async (nextView) => {
    const previousView = state.activeView;
    const normalizedNextView = normalizeDashboardView(nextView);
    cancelDeferredViewUnload(normalizedNextView);
    state.activeView = normalizedNextView;
    if (state.activeView === 'website') {
      showWebsiteSelector();
    }
    syncViewState();
    scheduleDeferredViewUnload(previousView);
    const viewUrl = new URL(window.location.href);
    viewUrl.searchParams.set('view', state.activeView);
    viewUrl.hash = '';
    window.history.replaceState(null, '', `${viewUrl.pathname}${viewUrl.search}`);
    closeMenu();
	    renderJenangGemiSearchResults(searchInput?.value || '');
	    if (state.activeView === 'overview') {
	      activateOverviewViewInstantly();
	      return;
	    }
	    if (state.activeView === 'orders') {
	      activateOrdersViewInstantly();
	      return;
	    }
	    if (state.activeView === 'wallet') {
	      activateWalletViewInstantly();
	      return;
	    }
    if (state.activeView === 'home') {
      activateHomeViewInstantly();
      return;
    }
    await loadActiveViewSafely();
    if (state.activeView === 'store-ops') {
      window.dispatchEvent(new CustomEvent('jg-store-ops-refresh'));
    }
  };

  const navigateSearchResult = async (entry) => {
    if (!entry?.url) return;

    let targetUrl;
    try {
      targetUrl = new URL(entry.url, window.location.href);
    } catch (_) {
      window.location.href = entry.url;
      return;
    }

    const currentUrl = new URL(window.location.href);
    const normalizePath = (path) => String(path || '').replace(/\/+$/, '') || '/';
    const isCurrentDashboard =
      targetUrl.origin === currentUrl.origin &&
      normalizePath(targetUrl.pathname) === normalizePath(currentUrl.pathname);
    const requestedView = entry.view || targetUrl.searchParams.get('view') || targetUrl.hash.replace(/^#/, '');

    if (entry.view) {
      window.localStorage.setItem(viewStorageKey, normalizeDashboardView(entry.view));
    }

    closeSearchResults({ clear: true });

    if (isCurrentDashboard && requestedView) {
      const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      window.history.replaceState(null, '', nextPath || targetUrl.pathname);
      await switchView(requestedView);
      return;
    }

    window.location.href = targetUrl.href;
  };

  const closeLiveStream = () => {
    if (state.liveSource) {
      state.liveSource.close();
      state.liveSource = null;
    }
  };

  const handleLiveChange = (payload = {}) => {
	    const reason = String(payload.reason || '').toLowerCase();
	    const orderRelated = reason.includes('order') || reason.includes('marketplace') || reason.includes('sales');
	    if (orderRelated) {
	      if (state.activeView === 'orders' || state.activeView === 'daily' || state.activeView === 'overview' || state.activeView === 'wallet') {
	        queueActiveViewRefresh({ force: true, forceRefresh: true, repair: true });
	      }
	      if (state.activeView !== 'wallet') {
	        queueViewRefresh('wallet').catch(() => {});
	      }
	      refreshOverviewHourlyRows(null, { repair: true }).catch(() => {});
      if (state.activeView === 'overview') {
        loadOverviewLocationRows({ force: true, incremental: true, repair: true }).catch(() => {});
      }
      preloadOrderMemory({ reset: true, repair: true }).catch(() => {});
    } else {
      queueActiveViewRefresh({ force: true });
    }
    loadNotifications().catch(() => {});
  };

  const connectLiveStream = () => {
    if (!window.EventSource || !liveEndpoint) return;
    closeLiveStream();
    const streamUrl = `${liveEndpoint}?last_sequence=${encodeURIComponent(String(state.liveSequence))}`;
    const source = new window.EventSource(streamUrl, { withCredentials: true });
    state.liveSource = source;

    source.addEventListener('change', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const nextSequence = Number(payload.sequence || 0);
        if (!Number.isFinite(nextSequence) || nextSequence <= state.liveSequence) return;
        state.liveSequence = nextSequence;
        handleLiveChange(payload);
      } catch (_) {
        // Ignore malformed live payloads and wait for the next internal signal.
      }
    });

    source.addEventListener('error', () => {
      closeLiveStream();
      window.setTimeout(() => {
        if (!document.hidden) connectLiveStream();
      }, 2000);
    });
  };

  let backgroundLoadsScheduled = false;
  const scheduleBackgroundLoads = () => {
    if (backgroundLoadsScheduled) return;
    backgroundLoadsScheduled = true;
    const run = async () => {
      if (document.hidden) return;
      const tasks = [
        state.activeView !== 'overview' && !state.overview.data
          ? loadOverviewSafely({ background: true, preferStale: false, useCache: true, skipHourly: true })
          : Promise.resolve(true),
        state.activeView !== 'home' && !state.home.data
          ? loadHomeSafely({ background: true, preferStale: false })
          : Promise.resolve(true),
        !state.website.settingsLoadedAt
          ? loadWebsiteSettingsSafely({ background: true, preferStale: false })
          : Promise.resolve(true),
        state.activeView !== 'wallet' && !state.wallet.data
          ? loadWalletSafely({ background: true, preferStale: false, skipReleaseSync: true })
          : Promise.resolve(true),
        loadOrderCatalog(),
        loadNotifications(),
        preloadOrderMemory()
      ];
      await Promise.allSettled(tasks);
      scheduleWalletBackgroundRefresh({ force: true });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        run().catch(() => {});
      }, { timeout: BACKGROUND_IDLE_TIMEOUT_MS });
      return;
    }

    window.setTimeout(() => {
      run().catch(() => {});
    }, 160);
  };

  if (systemThemeQuery) {
    const handleSystemThemeChange = () => {
      if (normalizeThemePreference(document.documentElement.dataset.adminThemeMode || readStoredTheme()) === 'system') {
        applyTheme('system');
      }
    };
    if (systemThemeQuery.addEventListener) {
      systemThemeQuery.addEventListener('change', handleSystemThemeChange);
    } else if (systemThemeQuery.addListener) {
      systemThemeQuery.addListener(handleSystemThemeChange);
    }
  }

  applyTheme(readStoredTheme() || 'dark');
  syncRegionalControls();
  renderRegionalPreview();
  if (dailyRefs.monthInput) dailyRefs.monthInput.value = state.daily.month;
  renderDailyPlatformList();
  syncViewState();
  renderContextEditor();
  if (state.activeView === 'overview') {
    window.setTimeout(() => ensureOverviewLocationHeatmap(), 0);
  }
  setLoaderState(20, 'Connecting to analytics');
  setLoaderState(34, 'Loading active dashboard charts');

  const initialLoad = state.activeView === 'overview'
    ? Promise.resolve().then(() => {
        const activation = activateOverviewViewInstantly();
        return waitForInitialViewReveal(activation.refreshPromise, activation);
      })
    : state.activeView === 'orders'
      ? Promise.resolve().then(() => activateOrdersViewInstantly())
      : state.activeView === 'wallet'
        ? Promise.resolve().then(() => activateWalletViewInstantly())
        : state.activeView === 'home'
          ? Promise.resolve().then(() => {
              const activation = activateHomeViewInstantly();
              return waitForInitialViewReveal(activation.refreshPromise, activation);
            })
          : loadActiveViewSafely({ preferStale: false });

  if (state.activeView !== 'orders') {
    window.setTimeout(() => {
      preloadOrderMemory({ skipOverviewRefresh: state.activeView === 'overview' }).catch(() => {});
    }, 0);
  }

  initialLoad
    .then(async () => {
      setLoaderState(76, 'Rendering charts and tables');
      if (state.activeView === 'settings') {
        await loadWebsiteSettingsSafely();
      }
    })
    .finally(() => {
      finishLoader();
      connectLiveStream();
      scheduleBackgroundLoads();
      scheduleWalletBackgroundRefresh({ force: true });
      window.setTimeout(() => {
        const syncStatus = state.overview.data?.sync_status;
        if (syncStatus?.fresh === false || syncStatus?.status === 'missing') {
          runAutomaticMarketplaceRefresh({ force: true }).catch(() => {});
        }
      }, 2500);
    });

  overviewRefs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.metric = button.dataset.overviewMetric || 'revenue';
      overviewRefs.metricButtons.forEach((candidate) => {
        candidate.classList.toggle('is-active', candidate === button);
      });
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

  overviewRefs.refreshButton?.addEventListener('click', refreshMarketplaceData);
  overviewRefs.salesRecapToggle?.addEventListener('click', () => {
    setSalesRecapOpen(!state.overview.salesRecapOpen);
  });
  overviewRefs.salesRecapCopy?.addEventListener('click', copySalesRecap);
  overviewRefs.salesRecapDownload?.addEventListener('click', downloadSalesRecapCsv);
  overviewRefs.salesRecapClose?.addEventListener('click', () => {
    setSalesRecapOpen(false);
  });
  overviewRefs.locationMap?.addEventListener('pointermove', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const provincePath = target.closest('.admin-location-province');
    if (!provincePath || !overviewRefs.locationMap.contains(provincePath)) {
      hideLocationTooltip();
      return;
    }
    showLocationTooltip(provincePath, event.clientX, event.clientY);
  });
  overviewRefs.locationMap?.addEventListener('pointerleave', hideLocationTooltip);
  overviewRefs.locationMap?.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const provincePath = target.closest('.admin-location-province');
    if (!provincePath || !overviewRefs.locationMap.contains(provincePath)) return;
    const rect = provincePath.getBoundingClientRect();
    showLocationTooltip(provincePath, rect.left + (rect.width / 2), rect.top + (rect.height / 2));
  });
  overviewRefs.locationMap?.addEventListener('focusout', hideLocationTooltip);

  overviewRefs.volumeMetricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.volumeMetric = button.dataset.overviewVolumeMetric || 'orders';
      overviewRefs.volumeMetricButtons.forEach((candidate) => {
        candidate.classList.toggle('is-active', candidate === button);
      });
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

  overviewRefs.hourlyMetricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.hourlyMetric = button.dataset.overviewHourlyMetric || 'orders';
      renderOverviewHourlyPanel();
    });
  });

  overviewRefs.rangeToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!overviewRefs.rangePopover) return;
    if (overviewRefs.rangePopover.hidden) {
      openOverviewRangePopover();
    } else {
      closeOverviewRangePopover();
    }
  });

  overviewRefs.rangePopover?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  overviewRefs.rangePrev?.addEventListener('click', () => {
    shiftRangeCalendarMonth(-1);
  });

  overviewRefs.rangeNext?.addEventListener('click', () => {
    shiftRangeCalendarMonth(1);
  });

  overviewRefs.rangeGrid?.addEventListener('pointerover', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-overview-range-date]');
    if (!(button instanceof HTMLElement) || !rangeDraftStart) return;
    const nextHoverDate = button.dataset.overviewRangeDate || rangeDraftStart;
    if (!nextHoverDate || nextHoverDate === rangeHoverDate) return;
    rangeHoverDate = nextHoverDate;
    renderOverviewRangeCalendar();
  });

  overviewRefs.rangeGrid?.addEventListener('pointerdown', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-overview-range-date]');
    if (!(button instanceof HTMLElement)) return;
    event.preventDefault();
    rangePointerSelectionHandled = true;
    window.setTimeout(() => {
      rangePointerSelectionHandled = false;
    }, 500);
    await selectOverviewRangeDate(button.dataset.overviewRangeDate || '');
  });

  overviewRefs.rangeGrid?.addEventListener('click', async (event) => {
    if (rangePointerSelectionHandled) {
      rangePointerSelectionHandled = false;
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-overview-range-date]');
    if (!(button instanceof HTMLElement)) return;
    await selectOverviewRangeDate(button.dataset.overviewRangeDate || '');
  });

  overviewRefs.rangeReset?.addEventListener('click', () => {
    state.overview.customRange = {
      active: false,
      startDate: '',
      endDate: '',
      rows: null
    };
    rangeDraftStart = '';
    rangeHoverDate = '';
    closeOverviewRangePopover();
    if (state.overview.data) renderOverview(state.overview.data);
  });

  overviewRefs.productMetricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.productMetric = button.dataset.overviewProductMetric || 'quantity';
      overviewRefs.productMetricButtons.forEach((candidate) => {
        candidate.classList.toggle('is-active', candidate === button);
      });
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

  overviewRefs.flavorMetricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.flavorMetric = button.dataset.overviewFlavorMetric || 'quantity';
      overviewRefs.flavorMetricButtons.forEach((candidate) => {
        candidate.classList.toggle('is-active', candidate === button);
      });
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

  dailyRefs.monthInput?.addEventListener('change', async () => {
    const nextMonth = String(dailyRefs.monthInput?.value || '').trim();
    if (!nextMonth || nextMonth === state.daily.month) return;
    state.daily.month = nextMonth;
    await loadDailySafely({ force: true, preferStale: false });
  });

  dailyRefs.exportButton?.addEventListener('click', downloadDailyPdf);

  dailyRefs.platformForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = String(dailyRefs.platformName?.value || '').trim();
    if (!name) return;
    const key = dailyPlatformKey(name);
    if (!state.daily.customPlatforms.some((item) => dailyPlatformKey(item) === key)) {
      state.daily.customPlatforms.push(name);
      persistDailyCustomPlatforms();
    }
    if (dailyRefs.platformName) dailyRefs.platformName.value = '';
    const rows = Array.isArray(state.daily.rows) ? state.daily.rows : [];
    renderDaily(aggregateDailyData(rows, state.daily.month));
  });

  dailyRefs.platformList?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-daily-remove-platform]');
    if (!(button instanceof HTMLElement)) return;
    const name = button.getAttribute('data-daily-remove-platform') || '';
    state.daily.customPlatforms = state.daily.customPlatforms.filter((item) => dailyPlatformKey(item) !== dailyPlatformKey(name));
    persistDailyCustomPlatforms();
    const rows = Array.isArray(state.daily.rows) ? state.daily.rows : [];
    renderDaily(aggregateDailyData(rows, state.daily.month));
  });

  homeRefs.timeframeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.home.timeframe = button.dataset.homeTimeframe || '24h';
      await loadHomeSafely({ force: true, preferStale: false });
    });
  });

  homeRefs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.home.metric = button.dataset.homeMetric || 'views';
      if (state.home.data) renderHome(state.home.data);
    });
  });

  homeRefs.seriesButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.homeSeries;
      if (!key || !(key in state.home.series)) return;
      state.home.series[key] = !state.home.series[key];
      if (state.home.data) renderHome(state.home.data);
    });
  });

  websiteRefs.timeframeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.website.timeframe = button.dataset.websiteTimeframe || '7d';
      await loadWebsiteSafely({ force: true, preferStale: false });
    });
  });

  websiteRefs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.website.metric = button.dataset.websiteMetric || 'visitors';
      if (state.website.data) renderWebsite(state.website.data);
    });
  });

  websiteRefs.openButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      await openWebsiteSite(button.dataset.websiteOpen || '');
    });
  });

  websiteRefs.backButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showWebsiteSelector();
    });
  });

  zeroStoreRefs.itemForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(zeroStoreRefs.itemForm);
    try {
      const data = await postZeroStore('save_item', {
        item_key: form.get('item_key'),
        sku: form.get('sku'),
        price: form.get('price'),
        is_active: zeroStoreRefs.itemForm.elements.is_active_checkbox?.checked
      });
      state.zeroStore.items = Array.isArray(data.items) ? data.items : [];
      state.zeroStore.discounts = Array.isArray(data.discounts) ? data.discounts : [];
      zeroStoreRefs.itemForm.reset();
      renderZeroStore();
      setZeroStoreError('');
    } catch (error) {
      setZeroStoreError(error.message);
    }
  });

  zeroStoreRefs.itemTable?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-zero-edit-item]');
    if (!button || !zeroStoreRefs.itemForm) return;
    const item = state.zeroStore.items.find((candidate) => candidate.item_key === button.dataset.zeroEditItem);
    if (!item) return;
    zeroStoreRefs.itemForm.elements.item_key.value = item.item_key || '';
    zeroStoreRefs.itemForm.elements.sku.value = item.sku || '';
    zeroStoreRefs.itemForm.elements.price.value = Number(item.price || 0);
    if (zeroStoreRefs.itemForm.elements.is_active_checkbox) {
      zeroStoreRefs.itemForm.elements.is_active_checkbox.checked = Number(item.is_active || 0) === 1;
    }
  });

  zeroStoreRefs.productFilter?.addEventListener('change', () => {
    state.zeroStore.productFilter = zeroStoreRefs.productFilter?.value || '';
    renderZeroStore();
  });

  zeroStoreRefs.discountSearch?.addEventListener('input', () => {
    state.zeroStore.discountSearch = zeroStoreRefs.discountSearch?.value || '';
    renderZeroStore();
  });

  zeroStoreRefs.skuPicker?.addEventListener('click', (event) => {
    const toggleButton = event.target.closest('[data-zero-toggle-visible-items]');
    if (!toggleButton || !zeroStoreRefs.skuPicker) return;
    const visibleInputs = Array.from(zeroStoreRefs.skuPicker.querySelectorAll('.admin-store-sku-option:not([hidden]) input[name="item_keys"]'));
    if (!visibleInputs.length) return;
    const shouldCheck = visibleInputs.some((input) => !input.checked);
    visibleInputs.forEach((input) => {
      input.checked = shouldCheck;
    });
  });

  zeroStoreRefs.discountForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(zeroStoreRefs.discountForm);
    const itemKeys = Array.from(zeroStoreRefs.discountForm.querySelectorAll('input[name="item_keys"]:checked')).map((input) => input.value);
    try {
      const data = await postZeroStore('save_discount', {
        id: form.get('id'),
        name: form.get('name'),
        discount_type: form.get('discount_type'),
        amount: form.get('amount'),
        starts_on: state.zeroStore.rangeStart,
        ends_on: state.zeroStore.rangeEnd,
        is_active: true,
        item_keys: itemKeys
      });
      state.zeroStore.items = Array.isArray(data.items) ? data.items : [];
      state.zeroStore.discounts = Array.isArray(data.discounts) ? data.discounts : [];
      resetZeroDiscountForm();
      renderZeroStore();
      setZeroStoreError('');
    } catch (error) {
      setZeroStoreError(error.message);
    }
  });

  zeroStoreRefs.discountList?.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-zero-edit-discount]');
    const deleteButton = event.target.closest('[data-zero-delete-discount]');
    if (editButton && zeroStoreRefs.discountForm) {
      const id = Number(editButton.dataset.zeroEditDiscount || 0);
      const discount = state.zeroStore.discounts.find((candidate) => Number(candidate.id) === id);
      if (!discount) return;
      zeroStoreRefs.discountForm.elements.id.value = discount.id || '';
      zeroStoreRefs.discountForm.elements.name.value = discount.name || '';
      zeroStoreRefs.discountForm.elements.discount_type.value = discount.discount_type || 'fixed';
      zeroStoreRefs.discountForm.elements.amount.value = Number(discount.amount || 0);
      state.zeroStore.rangeStart = discount.starts_on || '';
      state.zeroStore.rangeEnd = discount.ends_on || '';
      state.zeroStore.calendarMonth = (state.zeroStore.rangeStart || todayDate()).slice(0, 7);
      renderZeroStore();
      (discount.item_keys || discount.skus || []).forEach((itemKey) => {
        const checkbox = Array.from(zeroStoreRefs.discountForm.querySelectorAll('input[name="item_keys"]')).find((input) => input.value === itemKey);
        if (checkbox) checkbox.checked = true;
      });
      syncZeroDiscountRangeFields();
      renderZeroDiscountCalendar();
      return;
    }
    if (deleteButton) {
      try {
        const data = await postZeroStore('delete_discount', { id: deleteButton.dataset.zeroDeleteDiscount });
        state.zeroStore.items = Array.isArray(data.items) ? data.items : [];
        state.zeroStore.discounts = Array.isArray(data.discounts) ? data.discounts : [];
        resetZeroDiscountForm();
        renderZeroStore();
        setZeroStoreError('');
      } catch (error) {
        setZeroStoreError(error.message);
      }
    }
  });

  zeroStoreRefs.resetDiscount?.addEventListener('click', resetZeroDiscountForm);
  zeroStoreRefs.calendarToggle?.addEventListener('click', () => {
    if (!zeroStoreRefs.calendar) return;
    zeroStoreRefs.calendar.hidden = !zeroStoreRefs.calendar.hidden;
    state.zeroStore.calendarMonth = (state.zeroStore.rangeStart || todayDate()).slice(0, 7);
    renderZeroDiscountCalendar();
  });
  zeroStoreRefs.calendarPrev?.addEventListener('click', () => {
    const date = dateKeyToCalendarDate(firstMonthDay(state.zeroStore.calendarMonth));
    date.setMonth(date.getMonth() - 1);
    state.zeroStore.calendarMonth = monthKeyFromDate(calendarDateKey(date));
    renderZeroDiscountCalendar();
  });
  zeroStoreRefs.calendarNext?.addEventListener('click', () => {
    const date = dateKeyToCalendarDate(firstMonthDay(state.zeroStore.calendarMonth));
    date.setMonth(date.getMonth() + 1);
    state.zeroStore.calendarMonth = monthKeyFromDate(calendarDateKey(date));
    renderZeroDiscountCalendar();
  });
  zeroStoreRefs.calendarGrid?.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('[data-zero-discount-date]');
    if (!button) return;
    event.preventDefault();
    selectZeroDiscountDate(button.dataset.zeroDiscountDate || '');
  });
	  zeroStoreRefs.calendarGrid?.addEventListener('pointerover', (event) => {
	    const button = event.target.closest('[data-zero-discount-date]');
	    if (!button || !state.zeroStore.draftStart) return;
	    const hoverDate = button.dataset.zeroDiscountDate || '';
	    if (!hoverDate || hoverDate === state.zeroStore.hoverDate) return;
	    state.zeroStore.hoverDate = hoverDate;
	    renderZeroDiscountCalendar();
	  });

	  walletRefs.modeButtons.forEach((button) => {
	    button.addEventListener('click', () => {
	      setWalletMode(button.getAttribute('data-wallet-mode') || 'wallet');
	      renderWalletApiOutput();
	    });
	  });

	  walletRefs.refresh?.addEventListener('click', () => {
	    syncWalletReleases().catch(() => {
	      loadWalletSafely({ force: true, preferStale: false }).catch(() => {});
	    });
	  });

	  walletRefs.backtrack?.addEventListener('click', () => {
	    runWalletBacktrack(true).catch(() => {});
	  });

	  walletRefs.apiRun?.addEventListener('click', () => {
	    runWalletTerminal().catch(() => {});
	  });

	  walletRefs.apiInput?.addEventListener('keydown', (event) => {
	    if (event.key !== 'Enter') return;
	    event.preventDefault();
	    runWalletTerminal().catch(() => {});
	  });

	  walletRefs.apiInput?.addEventListener('input', () => {
	    if (walletRefs.apiInput instanceof HTMLInputElement) {
	      state.wallet.apiQuery = walletRefs.apiInput.value;
	      renderWalletApiOutput();
	    }
	  });

	  walletRefs.apiCopy?.addEventListener('click', () => {
	    copyWalletApiResult().catch(() => {});
	  });

	  walletRefs.tableBody?.addEventListener('click', (event) => {
	    const toggle = event.target.closest('[data-wallet-balance-toggle]');
	    if (toggle instanceof HTMLElement) {
	      const walletKey = toggle.getAttribute('data-wallet-key') || '';
	      state.wallet.balanceEditorKey = state.wallet.balanceEditorKey === walletKey ? '' : walletKey;
	      renderWallet(state.wallet.data);
	      return;
	    }

	    const button = event.target.closest('[data-wallet-balance-set]');
	    if (!(button instanceof HTMLElement)) return;
	    const platform = button.getAttribute('data-wallet-platform') || '';
	    const accountKey = button.getAttribute('data-wallet-account') || '';
	    if (!platform || !accountKey) return;
	    const row = button.closest('tr');
	    const amountInput = row?.querySelector('[data-wallet-balance-amount]');
	    const observedInput = row?.querySelector('[data-wallet-balance-at]');
	    const balance = amountInput instanceof HTMLInputElement ? amountInput.value : '';
	    const observedAt = observedInput instanceof HTMLInputElement ? observedInput.value : '';
	    postWalletAction('set_balance', {
	      platform,
	      account_key: accountKey,
	      balance,
	      observed_at: observedAt
	    }, `balance:${platform}|${accountKey}`).then((saved) => {
	      if (saved) {
	        state.wallet.balanceEditorKey = '';
	        renderWallet(state.wallet.data);
	      }
	    }).catch(() => {});
	  });

	  ordersRefs.loadMore?.addEventListener('click', async () => {
    try {
      await loadNextOrderWindow();
    } catch (error) {
      showOrderLoadError(error);
    }
  });

  ordersRefs.filterOpen?.addEventListener('click', () => {
    if (!ordersRefs.filterModal) return;
    syncOrderFilterControls();
    renderSkuOrderTree();
    closeOrdersDatePopover();
    ordersRefs.filterModal.hidden = false;
  });

  ordersRefs.filterCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (ordersRefs.filterModal) ordersRefs.filterModal.hidden = true;
      closeOrdersDatePopover();
    });
  });

  ordersRefs.filterReset?.addEventListener('click', clearOrderFilters);
  ordersRefs.filterClear?.addEventListener('click', clearOrderFilters);

  ordersRefs.activeFilters?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-order-filter]');
    if (!button) return;
    removeOrderFilter(button.getAttribute('data-remove-order-filter') || '', button.getAttribute('data-filter-value') || '');
  });

  ordersRefs.companyTree?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-add-order-filter]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    addOrderFilter(button.getAttribute('data-add-order-filter') || '', button.getAttribute('data-filter-value') || '');
    syncOrderFilterControls();
    renderSkuOrderTree();
    renderOrders();
    try {
      await ensureEnoughOrderRows();
    } catch (error) {
      showOrderLoadError(error);
    }
  });

  ordersRefs.platforms?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-toggle-order-platform]');
    if (!button) return;
    const platform = button.getAttribute('data-toggle-order-platform') || '';
    if (state.orders.filters.platforms.some((item) => normalizeOrderFilterValue(item) === normalizeOrderFilterValue(platform))) {
      state.orders.filters.platforms = state.orders.filters.platforms.filter((item) => normalizeOrderFilterValue(item) !== normalizeOrderFilterValue(platform));
      resetOrderRenderWindow();
      syncOrderLoadedAll();
    } else {
      addOrderFilter('platforms', platform);
    }
    syncOrderFilterControls();
    renderOrders();
    try {
      await ensureEnoughOrderRows();
    } catch (error) {
      showOrderLoadError(error);
    }
  });

  ordersRefs.dateToggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.orders.activeDateField = button.getAttribute('data-orders-date-toggle') === 'end' ? 'end' : 'start';
      setOrdersCalendarMonth();
      renderOrdersDateCalendar();
      if (ordersRefs.datePopover) ordersRefs.datePopover.hidden = false;
    });
  });

  ordersRefs.datePrev?.addEventListener('click', () => {
    const date = dateKeyToCalendarDate(firstMonthDay(state.orders.calendarMonth));
    date.setMonth(date.getMonth() - 1);
    state.orders.calendarMonth = monthKeyFromDate(calendarDateKey(date));
    renderOrdersDateCalendar();
  });

  ordersRefs.dateNext?.addEventListener('click', () => {
    const date = dateKeyToCalendarDate(firstMonthDay(state.orders.calendarMonth));
    date.setMonth(date.getMonth() + 1);
    state.orders.calendarMonth = monthKeyFromDate(calendarDateKey(date));
    renderOrdersDateCalendar();
  });

  ordersRefs.dateGrid?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-orders-date]');
    if (!button) return;
    await selectOrdersDate(button.getAttribute('data-orders-date') || '');
  });

  ordersRefs.scroll?.addEventListener('scroll', () => {
    if (state.orders.scrollPending) return;
    state.orders.scrollPending = true;
    window.requestAnimationFrame(async () => {
      state.orders.scrollPending = false;
      const node = ordersRefs.scroll;
      if (!node || state.orders.loading) return;
      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (remaining < 220) {
        const rows = filteredOrderRows();
        if (state.orders.renderLimit < rows.length) {
          state.orders.renderLimit += 80;
          renderOrders();
        } else {
          try {
            await loadNextOrderWindow();
          } catch (error) {
            showOrderLoadError(error);
          }
        }
      }
    });
  }, { passive: true });

  ordersRefs.tableBody?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-order-popover]');
    if (!(button instanceof HTMLElement)) return;
    event.stopPropagation();
    openOrderPopover(button, button.dataset.orderPopover || '');
  });

  contextRefs.groupButtons.forEach((button) => {
    button.addEventListener('click', () => setContextGroup(button.dataset.contextGroup || '2025'));
  });

  contextRefs.periods?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-context-period]');
    if (!(button instanceof HTMLElement)) return;
    state.context.periodKey = button.dataset.contextPeriod || state.context.periodKey;
    renderContextEditor();
  });

  contextRefs.fields.forEach((input) => {
    input.addEventListener('input', () => {
      const field = input.dataset.contextField || '';
      updateContextDraft(field, input.value);
    });
    input.addEventListener('blur', () => {
      input.value = contextFormatInput(contextParseInput(input.value));
    });
  });

  contextRefs.form?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveContext();
  });
  contextRefs.save?.addEventListener('click', saveContext);

  document.addEventListener('keydown', (event) => {
    if (state.activeView !== 'context' || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
    event.preventDefault();
    saveContext();
  });

  document.querySelectorAll('[data-view-switch]').forEach((button) => {
    button.addEventListener('click', async () => {
      await switchView(button.dataset.viewSwitch || 'home');
    });
  });

  setupTopbarMenu();

  notificationToggle?.addEventListener('click', () => {
    setNotificationOpen(!state.notifications.open);
    if (!state.notifications.open) return;
    loadNotifications().catch((error) => {
      if (notificationList) notificationList.innerHTML = `<p class="admin-empty">${escapeHtml(error.message)}</p>`;
    });
  });
  notificationClose?.addEventListener('click', () => setNotificationOpen(false));
  notificationBack?.addEventListener('click', () => {
    state.notifications.selectedOrderId = '';
    state.notifications.feedback = null;
    renderNotifications();
  });
  notificationBackdrop?.addEventListener('click', () => setNotificationOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.notifications.open) setNotificationOpen(false);
  });
  notificationList?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const selected = target.closest('[data-notification-select]');
    if (selected instanceof HTMLElement) {
      state.notifications.selectedOrderId = selected.dataset.notificationSelect || '';
      state.notifications.feedback = null;
      renderNotifications();
      return;
    }
    const button = target.closest('[data-notification-action]');
    const card = target.closest('[data-notification-order]');
    if (!(button instanceof HTMLButtonElement) || !(card instanceof HTMLElement)) return;
    const action = button.dataset.notificationAction || '';
    const orderId = card.dataset.notificationOrder || '';
    if (action === 'remove' && !window.confirm(`Permanently remove unpaid order ${orderId}?`)) return;
    button.disabled = true;
    try {
      await postWebsiteOrderAction(action, orderId);
      if (action === 'paid') {
        const updated = selectedNotificationOrder();
        if (updated?.status === 'AWAITING_FULFILLMENT_SETUP') {
          if (!Number(updated.deadline_hours || 0)) {
            await postWebsiteOrderAction('deadline', orderId, { deadline_hours: 24 });
          }
          renderNotifications();
        } else {
          showNotificationFeedback({
            type: 'submitted',
            title: 'Payment confirmed',
            message: 'The order is recorded in website sales metrics.'
          });
        }
      } else if (action === 'remove') {
        showNotificationFeedback({
          type: 'removed',
          title: 'Notification removed',
          message: 'The unpaid order was permanently dismissed.'
        });
      } else if (action === 'publish' || action === 'retry_publish') {
        showNotificationFeedback({
          type: 'submitted',
          title: 'Sent to Store Ops',
          message: 'The order was persisted and is ready for fulfillment.'
        });
      }
    } catch (error) {
      button.disabled = false;
      appendNotificationError(card, error);
    }
  });
  notificationList?.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches('[data-notification-deadline]')) return;
    const card = target.closest('[data-notification-order]');
    const value = card?.querySelector('[data-notification-deadline-value]');
    if (value) value.textContent = `${target.value}h`;
  });
  notificationList?.addEventListener('change', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const card = target.closest('[data-notification-order]');
    if (!(card instanceof HTMLElement)) return;
    const orderId = card.dataset.notificationOrder || '';
    try {
      if (target.matches('[data-notification-deadline]')) {
        await postWebsiteOrderAction('deadline', orderId, { deadline_hours: Number(target.value || 0) });
      }
      if (target instanceof HTMLInputElement && target.matches('[data-notification-label]')) {
        const file = target.files?.[0];
        await uploadNotificationLabel(orderId, file, card);
      }
    } catch (error) {
      appendNotificationError(card, error);
    }
  });
  notificationList?.addEventListener('dragover', (event) => {
    const dropzone = event.target instanceof Element ? event.target.closest('[data-notification-dropzone]') : null;
    if (!(dropzone instanceof HTMLElement)) return;
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
  notificationList?.addEventListener('dragleave', (event) => {
    const dropzone = event.target instanceof Element ? event.target.closest('[data-notification-dropzone]') : null;
    dropzone?.classList.remove('is-dragging');
  });
  notificationList?.addEventListener('drop', async (event) => {
    const dropzone = event.target instanceof Element ? event.target.closest('[data-notification-dropzone]') : null;
    const card = event.target instanceof Element ? event.target.closest('[data-notification-order]') : null;
    if (!(dropzone instanceof HTMLElement) || !(card instanceof HTMLElement)) return;
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    await uploadNotificationLabel(card.dataset.notificationOrder || '', file, card);
  });

  hardSetRefs.accessForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement) || state.hardSet.loading) return;
    const values = new FormData(form);
    state.hardSet.loading = true;
    if (hardSetRefs.accessError) {
      hardSetRefs.accessError.hidden = true;
      hardSetRefs.accessError.textContent = '';
    }
    renderHardSet();
    try {
      const data = await requestJson(`${hardSetEndpoint}?action=unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: String(values.get('username') || ''),
          password: String(values.get('password') || '')
        })
      });
      state.hardSet.access = data.access || { branch: false, username: '' };
      form.reset();
    } catch (error) {
      if (hardSetRefs.accessError) {
        hardSetRefs.accessError.hidden = false;
        hardSetRefs.accessError.textContent = error.message;
      }
    } finally {
      state.hardSet.loading = false;
      renderHardSet();
    }
  });

  hardSetRefs.switchButton?.addEventListener('click', () => {
    if (hardSetRefs.switchButton?.disabled || state.hardSet.state?.enabled) return;
    if (hardSetRefs.error) {
      hardSetRefs.error.hidden = true;
      hardSetRefs.error.textContent = '';
    }
    hardSetRefs.form?.reset();
    hardSetRefs.dialog?.showModal();
  });
  hardSetRefs.cancel?.addEventListener('click', () => hardSetRefs.dialog?.close());
  hardSetRefs.form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    const confirmation = String(new FormData(form).get('confirmation') || '');
    state.hardSet.loading = true;
    renderHardSet();
    try {
      const data = await requestJson(`${hardSetEndpoint}?action=activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
        timeoutMs: 30000
      });
      state.hardSet.state = data.state || state.hardSet.state;
      state.hardSet.readiness = data.readiness || state.hardSet.readiness;
      state.hardSet.access = data.access || state.hardSet.access;
      state.hardSet.audit = Array.isArray(data.audit) ? data.audit : state.hardSet.audit;
      hardSetRefs.dialog?.close();
      hardSetRefs.switchButton?.classList.add('is-activating');
      window.setTimeout(() => hardSetRefs.switchButton?.classList.remove('is-activating'), 1000);
      await loadNotifications().catch(() => {});
    } catch (error) {
      if (hardSetRefs.error) {
        hardSetRefs.error.hidden = false;
        hardSetRefs.error.textContent = error.message;
      }
    } finally {
      state.hardSet.loading = false;
      renderHardSet();
    }
  });

  const jenangGemiStoreActionUrl = (action) => `${jenangGemiStoreEndpoint}?action=${encodeURIComponent(action)}&_ts=${Date.now()}`;
  const resetJenangGemiDiscountForm = () => {
    jenangGemiStoreRefs.discountForm?.reset();
    state.jenangGemiStore.activeDiscountId = '';
    if (jenangGemiStoreRefs.discountForm?.elements.id) jenangGemiStoreRefs.discountForm.elements.id.value = '';
    jenangGemiStoreRefs.discountForm?.querySelectorAll('[name="item_keys"]').forEach((input) => { input.checked = false; });
  };
  jenangGemiStoreRefs.itemTable?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-jg-edit-item]');
    if (!(button instanceof HTMLElement) || !jenangGemiStoreRefs.itemForm) return;
    const item = state.jenangGemiStore.items.find((candidate) => candidate.item_key === button.dataset.jgEditItem);
    if (!item) return;
    jenangGemiStoreRefs.itemForm.elements.item_key.value = item.item_key || '';
    jenangGemiStoreRefs.itemForm.elements.sku.value = item.sku || '';
    jenangGemiStoreRefs.itemForm.elements.price.value = Number(item.price || 0);
    jenangGemiStoreRefs.itemForm.elements.is_active.checked = Number(item.is_active || 0) === 1;
    jenangGemiStoreRefs.itemForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  jenangGemiStoreRefs.itemForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await requestJson(jenangGemiStoreActionUrl('save_item'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: values.get('item_key'), sku: values.get('sku'), price: Number(values.get('price') || 0), is_active: values.get('is_active') === 'on' })
      });
      await loadJenangGemiStore();
    } catch (error) { setJenangGemiStoreError(error.message); }
  });
  jenangGemiStoreRefs.discountReset?.addEventListener('click', resetJenangGemiDiscountForm);
  jenangGemiStoreRefs.discountList?.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-jg-edit-discount]');
    const remove = event.target.closest('[data-jg-delete-discount]');
    if (edit instanceof HTMLElement && jenangGemiStoreRefs.discountForm) {
      const discount = state.jenangGemiStore.discounts.find((candidate) => Number(candidate.id) === Number(edit.dataset.jgEditDiscount));
      if (!discount) return;
      const form = jenangGemiStoreRefs.discountForm;
      form.elements.id.value = discount.id;
      form.elements.name.value = discount.name || '';
      form.elements.discount_type.value = discount.discount_type || 'fixed';
      form.elements.amount.value = Number(discount.amount || 0);
      form.elements.starts_on.value = discount.starts_on || '';
      form.elements.ends_on.value = discount.ends_on || '';
      form.elements.is_active.checked = Number(discount.is_active || 0) === 1;
      form.querySelectorAll('[name="item_keys"]').forEach((input) => { input.checked = (discount.item_keys || []).includes(input.value); });
      return;
    }
    if (remove instanceof HTMLElement && window.confirm('Delete this Jenang Gemi discount group?')) {
      try {
        await requestJson(jenangGemiStoreActionUrl('delete_discount'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(remove.dataset.jgDeleteDiscount) }) });
        await loadJenangGemiStore();
      } catch (error) { setJenangGemiStoreError(error.message); }
    }
  });
  jenangGemiStoreRefs.discountForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const itemKeys = Array.from(form.querySelectorAll('[name="item_keys"]:checked')).map((input) => input.value);
    try {
      await requestJson(jenangGemiStoreActionUrl('save_discount'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          id: Number(values.get('id') || 0), name: values.get('name'), discount_type: values.get('discount_type'), amount: Number(values.get('amount') || 0),
          starts_on: values.get('starts_on'), ends_on: values.get('ends_on'), is_active: values.get('is_active') === 'on', item_keys: itemKeys
        })
      });
      resetJenangGemiDiscountForm();
      await loadJenangGemiStore();
    } catch (error) { setJenangGemiStoreError(error.message); }
  });

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(getNextTheme());
    });
  });

  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.themeOption || 'dark');
    });
  });

  regionalRefs.form?.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches('[data-regional-setting]')) return;
    const formData = new FormData(regionalRefs.form);
    applyRegionalSettings({
      timezone: String(formData.get('timezone') || ''),
      numberLocale: String(formData.get('numberLocale') || ''),
      dateFormat: String(formData.get('dateFormat') || ''),
      currencyDisplay: String(formData.get('currencyDisplay') || '')
    });
  });

  websiteRefs.deviceExclusionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;

    const formData = new FormData(form);
    const payload = {
      device_id: String(formData.get('device_id') || '').trim(),
      label: String(formData.get('label') || '').trim()
    };

    clearDeviceExclusionError();

    try {
      const data = await requestJson(buildSettingsUrl('website_device_exclusion_add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.website.deviceExclusions = Array.isArray(data.excluded_devices) ? data.excluded_devices : [];
      form.reset();
      renderDeviceExclusionList();
      await refreshAnalyticsAfterDeviceExclusion();
    } catch (error) {
      if (websiteRefs.deviceExclusionError) {
        websiteRefs.deviceExclusionError.hidden = false;
        websiteRefs.deviceExclusionError.textContent = error.message;
      }
    }
  });

  websiteRefs.deviceExclusionList?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-delete-device-exclusion]');
    if (!(button instanceof HTMLElement)) return;
    const id = button.dataset.deleteDeviceExclusion || '';
    if (!id) return;

    try {
      const data = await requestJson(buildSettingsUrl('website_device_exclusion_delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id) })
      });
      state.website.deviceExclusions = Array.isArray(data.excluded_devices) ? data.excluded_devices : [];
      renderDeviceExclusionList();
      await refreshAnalyticsAfterDeviceExclusion();
    } catch (error) {
      if (websiteRefs.deviceExclusionError) {
        websiteRefs.deviceExclusionError.hidden = false;
        websiteRefs.deviceExclusionError.textContent = error.message;
      }
    }
  });

  websiteRefs.ignoreCurrentDeviceButton?.addEventListener('click', async () => {
    if (!state.website.currentDeviceId) return;

    clearDeviceExclusionError();
    const label = String(websiteRefs.currentDeviceLabel?.value || '').trim();

    try {
      const data = await requestJson(buildSettingsUrl('website_device_exclusion_add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: state.website.currentDeviceId,
          label
        })
      });
      state.website.deviceExclusions = Array.isArray(data.excluded_devices) ? data.excluded_devices : state.website.deviceExclusions;
      renderDeviceExclusionList();
      if (websiteRefs.currentDeviceLabel) websiteRefs.currentDeviceLabel.value = '';
      await refreshAnalyticsAfterDeviceExclusion();
    } catch (error) {
      if (websiteRefs.deviceExclusionError) {
        websiteRefs.deviceExclusionError.hidden = false;
        websiteRefs.deviceExclusionError.textContent = error.message;
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      closeLiveStream();
      return;
    }
    connectLiveStream();
    preloadOrderMemory().catch(() => {});
    scheduleWalletBackgroundRefresh({ force: true });
    refreshForLocalDateRollover()
      .then((refreshed) => {
        if (!refreshed && !hasFreshViewData(state.activeView)) return loadActiveViewSafely({ preferStale: true });
        return true;
      })
      .catch(() => {});
  });

  window.addEventListener('resize', () => renderCachedCharts());
  window.addEventListener('focus', () => {
    refreshForLocalDateRollover().catch(() => {});
    preloadOrderMemory().catch(() => {});
    runAutomaticMarketplaceRefresh().catch(() => {});
    scheduleWalletBackgroundRefresh({ force: true });
    if (state.activeView === 'overview') {
      refreshOverviewHourlyRows(null, { repair: true }).catch(() => {});
    }
  });
  window.addEventListener('online', () => {
    scheduleWalletBackgroundRefresh({ force: true });
  });
  window.setInterval(() => {
    if (!document.hidden) {
      refreshForLocalDateRollover().catch(() => {});
      runAutomaticMarketplaceRefresh().catch(() => {});
      scheduleWalletBackgroundRefresh();
      if (state.activeView === 'overview') {
        refreshOverviewHourlyRows(null, { repair: true }).catch(() => {});
      }
    }
  }, AUTO_REFRESH_INTERVAL_MS);
  window.addEventListener('beforeunload', (event) => {
    closeLiveStream();
    if (!state.context.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
});
