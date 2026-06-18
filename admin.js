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
  unknown: '#7a879a'
};

const OVERVIEW_PRODUCT_COLORS = ['#9dff00', '#22d3ee', '#ff8f1f', '#ff4ecd', '#8b5cf6', '#f8e16c', '#67f8d4', '#ff6b6b'];
const OVERVIEW_ACCOUNT_COLORS = ['#9dff00', '#22d3ee', '#ff8f1f', '#ff4ecd', '#8b5cf6', '#f8e16c', '#67f8d4', '#ff6b6b', '#c084fc', '#34d399', '#fb7185', '#60a5fa'];

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
      color: OVERVIEW_ACCOUNT_COLORS[keyed.size % OVERVIEW_ACCOUNT_COLORS.length]
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
    title: 'Jenang Gemi',
    chip: 'Jenang Gemi Website Dashboard',
    copy: 'Track real visitors, top regions, and page activity across the main Jenang Gemi website.',
    pageTitle: 'Jenang Gemi website pages',
    pageMeta: 'Jenang Gemi website only',
    scope: 'Counts only `traffic_kind=website` browser events from the Jenang Gemi website.'
  },
  zero: {
    title: 'ZERO',
    chip: 'ZERO Website Dashboard',
    copy: 'Track real visitors, top regions, and page activity across zerofoods.id.',
    pageTitle: 'ZERO website pages',
    pageMeta: 'zerofoods.id only',
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
const DAILY_ORDER_PAGE_LIMIT = 500;
const DAILY_CUSTOM_PLATFORMS_STORAGE_KEY = 'jg-dashboard-daily-custom-platforms';
const ANALYTICS_DEVICE_COOKIE = 'jg_analytics_device_id';
const ANALYTICS_DEVICE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

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

const formatDashboardTime = (value, timezone, options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('id-ID', {
    timeZone: timezone,
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
  return Math.round(number).toLocaleString('id-ID');
};

const formatCurrency = (value, options = {}) => {
  if (options.compact) return `Rp${formatCompactNumber(value)}`;
  return `Rp${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
};

const formatCellCurrency = (value) => formatCurrency(value, { compact: true });

const formatFullMetricValue = (metric, value, unitsMap) => {
  const unit = unitsMap[metric] || 'units';
  if (unit === 'idr') return formatCurrency(value);
  return `${Math.round(Number(value) || 0).toLocaleString('id-ID')} ${unit}`;
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
const OVERVIEW_CACHE_PREFIX = 'jg-overview-summary-v10';
const ORDER_RENDER_BATCH_SIZE = 80;
const ORDER_LOAD_WINDOW_DAYS = 3;
const ORDER_LOAD_PAGE_SIZE = 240;
const ORDER_BOOTSTRAP_MIN_ROWS = 80;
const ORDER_BOOTSTRAP_MAX_WINDOWS = 3;

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
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 999);
  ctx.fill();

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 999);
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

const drawGrid = (ctx, width, height, padding, maxValue, metric, unitsMap, palette) => {
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
    ctx.fillText(formatMetricValue(metric, Math.max(0, tickValue), unitsMap), 8, y - (i === 0 ? -12 : 4));
  }
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

const ensureChartTooltip = (canvas) => {
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  const existing = chartTooltipState.get(canvas);
  if (existing?.isConnected) return existing;

  const surface = canvas.parentElement;
  if (!(surface instanceof HTMLElement)) return null;

  const tooltip = document.createElement('div');
  tooltip.className = 'admin-chart-tooltip';
  tooltip.innerHTML = '<strong></strong><div class="admin-chart-tooltip-body"></div>';
  surface.appendChild(tooltip);
  chartTooltipState.set(canvas, tooltip);
  return tooltip;
};

const hideChartTooltip = (canvas) => {
  const tooltip = chartTooltipState.get(canvas);
  if (!tooltip) return;
  tooltip.classList.remove('is-visible');
};

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
  try {
    renderer();
  } catch (error) {
    console.error('Dashboard chart render failed', error);
    drawChartMessage(canvas, message);
  }
};

const renderChartTooltip = (canvas, point, clientX, clientY) => {
  const tooltip = ensureChartTooltip(canvas);
  const surface = canvas.parentElement;
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
    drawGrid(ctx, width, height, padding, maxValue, config.metric, config.unitsMap, palette);
  }

  chartItems.forEach((item, index) => {
    const value = Number(config.value(item) || 0);
    const barHeight = (value / maxValue) * (chartHeight - 10);
    const x = padding.left + index * (barWidth + gap) + gap / 2;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = palette.surfaceSoft;
    ctx.beginPath();
    ctx.roundRect(x, padding.top + 8, barWidth, chartHeight - 8, 10);
    ctx.fill();

    ctx.fillStyle = config.color(item);
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 10);
    ctx.fill();

    if (config.showValueBadges !== false) {
      drawValueBadge(ctx, x + (barWidth / 2), y, formatMetricValue(config.metric, value, config.unitsMap), palette);
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
      color: OVERVIEW_PLATFORM_COLORS[normalizedKey] || OVERVIEW_PRODUCT_COLORS[keyed.size % OVERVIEW_PRODUCT_COLORS.length]
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
        const activeButton = buttons.find((button) => button.classList.contains('is-active'));

        buttons.forEach((button) => {
          const isActive = button === activeButton;
          button.setAttribute('aria-pressed', String(isActive));
          button.tabIndex = isActive || !activeButton ? 0 : -1;
        });

        if (!activeButton) {
          toggle.classList.remove('has-active-toggle');
          return;
        }

        if (immediate) indicator.classList.add('is-positioning');
        indicator.style.setProperty('--sliding-toggle-x', `${activeButton.offsetLeft}px`);
        indicator.style.setProperty('--sliding-toggle-width', `${activeButton.offsetWidth}px`);
        toggle.classList.add('has-active-toggle');

        if (immediate) {
          indicator.getBoundingClientRect();
          indicator.classList.remove('is-positioning');
        }
      });
    };

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
      ctx.fillStyle = OVERVIEW_PRODUCT_COLORS[index % OVERVIEW_PRODUCT_COLORS.length];
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
    ctx.fillText('No syrup flavor sales yet', width * 0.31, height / 2);
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
    ctx.fillStyle = OVERVIEW_PRODUCT_COLORS[index % OVERVIEW_PRODUCT_COLORS.length];
    ctx.fill();
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
  const themeDefaultMigrationKey = `${themeStorageKey}-minimal-black-default`;
  const themeCookieMaxAge = 60 * 60 * 24 * 365 * 2;
  const viewStorageKey = 'jg-dashboard-view';
  const themeOptions = ['minimal-black', 'dark', 'minimal-white', 'classic-white', 'prism'];
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
    daily: 'daily',
    day: 'daily',
    'daily-report': 'daily',
    context: 'context',
    'open-context': 'context'
  };
  const validViews = new Set(['overview', 'orders', 'daily', 'context', 'home', 'website', 'settings']);
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
    timezone: DASHBOARD_TIMEZONE,
    requestSequence: 0,
    overview: {
      year: new Date().getFullYear(),
      metric: 'revenue',
      volumeMetric: 'orders',
      hourlyMetric: 'orders',
      productMetric: 'quantity',
      flavorMetric: 'quantity',
      customRange: {
        active: false,
        startDate: '',
        endDate: '',
        rows: null
      },
      hourlyRows: [],
      hourlyDate: '',
      hourlyRequestToken: 0,
      data: null,
      yearControlsSignature: '',
      requestToken: 0
    },
    orders: {
      data: null,
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
    daily: {
      month: getMonthKeyForTimezone(new Date(), DASHBOARD_TIMEZONE),
      data: null,
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
      requestToken: 0
    },
    website: {
      timeframe: '7d',
      metric: 'visitors',
      site: '',
      screen: 'select',
      data: null,
      deviceExclusions: [],
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

  const loader = document.querySelector('[data-admin-loader]');
  const loaderProgress = document.querySelector('[data-admin-loader-progress]');
  const loaderLabel = document.querySelector('[data-admin-loader-label]');
  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');
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
    syrupFlavorCanvas: document.querySelector('[data-overview-syrup-flavor-chart]'),
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
    lastUpdated: document.querySelector('[data-overview-last-updated]'),
    tableBody: document.querySelector('[data-overview-table-body]'),
    notes: document.querySelector('[data-overview-notes]'),
    yearControls: document.querySelector('[data-overview-year-controls]'),
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
    lastUpdated: document.querySelector('[data-home-last-updated]'),
    trendTitle: document.querySelector('[data-home-trend-title]'),
    trendMeta: document.querySelector('[data-home-trend-meta]'),
    timeframeButtons: document.querySelectorAll('[data-home-timeframe]'),
    metricButtons: document.querySelectorAll('[data-home-metric]'),
    seriesButtons: document.querySelectorAll('[data-home-series]')
  };

  const websiteRefs = {
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
    excludedCount: document.querySelector('[data-website-excluded-ip-count]'),
    pageTableBody: document.querySelector('[data-website-page-table-body]'),
    regionTableBody: document.querySelector('[data-website-region-table-body]'),
    recentEvents: document.querySelector('[data-website-recent-events]'),
    settingsEndpointLabel: document.querySelector('[data-website-settings-endpoint]'),
    trendCanvas: document.querySelector('[data-website-trend-chart]'),
    regionCanvas: document.querySelector('[data-website-region-chart]'),
    pageCanvas: document.querySelector('[data-website-page-chart]'),
    lastUpdated: document.querySelector('[data-website-last-updated]'),
    trendTitle: document.querySelector('[data-website-trend-title]'),
    trendMeta: document.querySelector('[data-website-trend-meta]'),
    pageChartTitle: document.querySelector('[data-website-page-chart-title]'),
    pageChartMeta: document.querySelector('[data-website-page-chart-meta]'),
    pageTableTitle: document.querySelector('[data-website-page-table-title]'),
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
    return JENANG_GEMI_SEARCH_INDEX
      .map((entry) => ({ ...entry, score: scoreSearchEntry(entry, tokens) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 8);
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
      link.addEventListener('click', () => {
        const view = link.getAttribute('data-dashboard-view-link') || 'home';
        window.localStorage.setItem(viewStorageKey, view);
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

  const normalizeTheme = (theme) => {
    if (theme === 'light') return 'classic-white';
    return themeOptions.includes(theme) ? theme : 'minimal-black';
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
      const storedTheme = window.localStorage.getItem(themeStorageKey) || readThemeCookie();
      if (storedTheme === 'dark' && window.localStorage.getItem(themeDefaultMigrationKey) !== '1') {
        window.localStorage.setItem(themeStorageKey, 'minimal-black');
        window.localStorage.setItem(themeDefaultMigrationKey, '1');
        writeThemeCookie('minimal-black');
        return 'minimal-black';
      }
      return storedTheme;
    } catch (_error) {
      const cookieTheme = readThemeCookie();
      if (cookieTheme === 'dark') {
        writeThemeCookie('minimal-black');
        return 'minimal-black';
      }
      return cookieTheme;
    }
  };

  const writeStoredTheme = (theme) => {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
      window.localStorage.setItem(themeDefaultMigrationKey, '1');
    } catch (_error) {
      // Cookies keep the device preference when localStorage is unavailable.
    }
    writeThemeCookie(theme);
  };

  const getNextTheme = () => {
    const currentTheme = normalizeTheme(document.documentElement.dataset.adminTheme);
    const currentIndex = themeOptions.indexOf(currentTheme);
    return themeOptions[(currentIndex + 1) % themeOptions.length];
  };

  const syncThemeControls = (theme) => {
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const isActive = button.dataset.themeOption === theme;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const applyTheme = (theme) => {
    const normalizedTheme = normalizeTheme(theme);
    document.documentElement.dataset.adminTheme = normalizedTheme;
    writeStoredTheme(normalizedTheme);
    syncThemeControls(normalizedTheme);
    invalidateThemePalette();
    renderCachedCharts();
  };

  const requestJson = async (url, options = {}) => {
    const { timeoutMs = 20000, ...fetchOptions } = options;
    const controller = timeoutMs > 0 && !fetchOptions.signal && window.AbortController ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', ...(options.headers || {}) },
        credentials: 'same-origin',
        cache: 'no-store',
        ...fetchOptions,
        ...(controller ? { signal: controller.signal } : {})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
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
    return Number.isFinite(number) ? number.toLocaleString('id-ID') : '';
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
    if (view === 'website') return websiteRefs.recentEvents;
    return homeRefs.recentEvents;
  };

  const renderViewError = (view, error) => {
    const container = getFeedForView(view);
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
          <span>${Number(item.views || 0).toLocaleString('id-ID')} views</span>
        </div>
      `;
    }).join('');
  };

  const setLastUpdated = (target, isoString) => {
    if (!target) return;
    const date = isoString ? new Date(isoString) : new Date();
    target.textContent = `Updated ${formatDashboardTime(date, state.timezone, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} WIB`;
  };

  const syncViewState = () => {
    const labels = {
      overview: 'Home',
      orders: 'Orders',
      daily: 'Daily',
      context: 'Open Context',
      home: 'Campaigns Dashboard',
      website: 'Official Website Dashboard',
      settings: 'Settings'
    };
    const navSectionByView = {
      overview: 'home',
      orders: 'orders',
      daily: '',
      context: 'home',
      home: 'campaigns',
      website: 'website',
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
      const isActive = link.getAttribute('data-dashboard-nav-section') === navSectionByView[state.activeView];
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
    window.localStorage.setItem(viewStorageKey, state.activeView);
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

  const buildAnalyticsUrl = (dataset, timeframe) => {
    const params = new URLSearchParams({
      timeframe,
      timezone: state.timezone,
      recent_limit: '120',
      dataset,
      _ts: String(Date.now())
    });
    if (dataset === 'website') {
      params.set('site', state.website.site || 'jenang_gemi');
    }
    return `${endpoint}?${params.toString()}`;
  };

  const buildSalesUrl = (year, options = {}) => {
    const params = new URLSearchParams({
      year: String(year),
      _ts: String(Date.now())
    });
    if (options.refresh) {
      params.set('refresh', '1');
    }
    return `${salesEndpoint}?${params.toString()}`;
  };
  const buildOrderFactsUrl = (startDate, endDate, options = {}) => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      _ts: String(Date.now())
    });
    if (options.lightweight) {
      params.set('lightweight', '1');
    }
    if (options.storedOnly) {
      params.set('stored_only', '1');
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
  const dashboardDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone });
  const todayDate = () => dashboardDateFormatter.format(new Date());
  const offsetDate = (dateValue, offsetDays) => {
    const date = new Date(`${dateValue}T00:00:00+07:00`);
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return dashboardDateFormatter.format(date);
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
    if (typeof row?._orderLocalDate === 'string') return row._orderLocalDate;
    const date = parseOrderTimestamp(row?.order_create_time || row?.timestamp);
    return date ? dashboardDateFormatter.format(date) : '';
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
      _orderLocalDate: date ? dashboardDateFormatter.format(date) : '',
      _platformKey: normalizeOrderFilterValue(row?.platform || '')
    };
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

  const buildSettingsUrl = (action) => `${settingsEndpoint}?action=${encodeURIComponent(action)}&_ts=${encodeURIComponent(String(Date.now()))}`;

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
    })} WIB`;
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
        ensureBucket(key, new Intl.DateTimeFormat('id-ID', { timeZone: state.timezone, day: '2-digit', month: 'short' }).format(cursor));
      }
    } else {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const final = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= final) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        ensureBucket(key, new Intl.DateTimeFormat('id-ID', { timeZone: state.timezone, month: 'short', year: '2-digit' }).format(cursor));
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
        ? `Data stale${syncFinishedAt && !Number.isNaN(syncFinishedAt.getTime()) ? ` since ${formatDashboardTime(syncFinishedAt, state.timezone, { hour: '2-digit', minute: '2-digit', hour12: false })} WIB` : ''}`
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

  const dateKeyToWibDate = (dateValue) => new Date(`${dateValue}T00:00:00+07:00`);
  const wibDateKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone }).format(date);
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
    const firstDay = dateKeyToWibDate(firstMonthDay(rangeCalendarMonth));
    const month = firstDay.getMonth();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);
    const today = todayDate();
    const bounds = rangeBounds();
    overviewRefs.rangeMonth.textContent = new Intl.DateTimeFormat('id-ID', {
      timeZone: state.timezone,
      month: 'long',
      year: 'numeric'
    }).format(firstDay);

    const days = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = wibDateKey(date);
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
      const dayLabel = new Intl.DateTimeFormat('id-ID', {
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
    const date = dateKeyToWibDate(firstMonthDay(rangeCalendarMonth));
    date.setMonth(date.getMonth() + offset);
    rangeCalendarMonth = monthKeyFromDate(wibDateKey(date));
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
    await loadOverviewSafely();
  };

  const renderOverviewYearControls = (years) => {
    if (!overviewRefs.yearControls) return;
    const signature = `${(Array.isArray(years) ? years : []).join('\u001f')}\u001e${state.overview.year}`;
    if (state.overview.yearControlsSignature === signature) return;
    state.overview.yearControlsSignature = signature;
    overviewRefs.yearControls.innerHTML = years.map((year) => `
      <button type="button" class="admin-toggle-pill${Number(year) === Number(state.overview.year) ? ' is-active' : ''}" data-overview-year="${escapeHtml(String(year))}">${escapeHtml(String(year))}</button>
    `).join('');

    overviewRefs.yearControls.querySelectorAll('[data-overview-year]').forEach((button) => {
      button.addEventListener('click', async () => {
        const nextYear = Number(button.getAttribute('data-overview-year') || state.overview.year);
        if (!Number.isFinite(nextYear) || nextYear === state.overview.year) return;
        state.overview.year = nextYear;
        await loadOverviewSafely();
      });
    });
  };

  const renderOverview = (data) => {
    state.overview.data = data;
    const totals = data.totals || {};
    const months = Array.isArray(data.months) ? data.months : [];
    const platforms = Array.isArray(data.platforms) ? data.platforms : [];
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const products = data.products || {};
    const monthlyAccountRows = overviewMonthlyAccountRows(months);
    const syrupFlavorRows = Array.isArray(products.syrup_flavors) ? products.syrup_flavors : [];
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
    const currentMonthKey = activeLocalDate.slice(0, 7);
    const currentDay = Number(activeLocalDate.slice(8, 10));
    const currentMonth = Number(activeLocalDate.slice(5, 7));
    const daysInCurrentMonth = new Date(Date.UTC(state.overview.year, currentMonth, 0)).getUTCDate();
    const projectionFactor = currentDay > 0 ? daysInCurrentMonth / currentDay : 1;
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
    const trendRows = customTrend ? customTrend.rows : projectedMonthlyRows;
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
          <td title="${escapeHtml(Number(month.orders || 0).toLocaleString('id-ID'))}">${formatCompactNumber(month.orders || 0)}</td>
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

    setLastUpdated(overviewRefs.lastUpdated, data.generated_at || data.meta?.generated_at);
    renderOverviewYearControls(years);
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

    drawChartSafely(overviewRefs.trendCanvas, () => drawLineChart(overviewRefs.trendCanvas, trendRows, state.overview.metric, OVERVIEW_METRIC_UNITS));
    drawChartSafely(overviewRefs.ordersCanvas, () => drawBarChart(overviewRefs.ordersCanvas, monthlyRows, {
      value: (item) => item[state.overview.volumeMetric] || 0,
      label: (item) => String(item.label || '-'),
      color: () => '#67f8d4',
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
    const accountSeries = accountSeriesFromMonthlyRows(monthlyAccountRows, accounts);
    drawChartSafely(overviewRefs.productStackCanvas, () => drawStackedBarChart(overviewRefs.productStackCanvas, monthlyAccountRows, {
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
      limit: 32
    }));
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
    return date ? dashboardDateFormatter.format(date) : '';
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

  const formatDailyQty = (value, options = {}) => Number(value || 0).toLocaleString('id-ID', {
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
      <th class="daily-subhead">Rp</th>
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
        <th class="daily-subhead daily-total-subhead">Total Rp</th>
        <th class="daily-subhead daily-total-subhead daily-qty-head">Avg Qty</th>
        <th class="daily-subhead daily-total-subhead">Avg Rp</th>
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
        <th scope="row" class="daily-day-cell"><strong>Avg / day</strong><small>${dailyData.dayCount.toLocaleString('id-ID')} days</small></th>
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
      dailyRefs.status.textContent = `${dailyData.label} • ${dailyData.days.length.toLocaleString('id-ID')} days • ${dailyData.totals.accountCount.toLocaleString('id-ID')} account columns • ${dailyData.rows.length.toLocaleString('id-ID')} order lines`;
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
      `Total Qty: ${Number(dailyData.totals.qty || 0).toLocaleString('id-ID')}`,
      `Total Revenue: ${formatCurrency(dailyData.totals.revenue || 0)}`,
      `Average Qty per day: ${Number(dailyData.totals.avgQty || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}`,
      `Average Revenue per day: ${formatCurrency(dailyData.totals.avgRevenue || 0)}`,
      '',
      'Account columns',
      ...accounts.map((account) => `${account.label}: Qty ${Number(account.qty || 0).toLocaleString('id-ID')} | Rp ${formatCurrency(account.revenue || 0)} | Avg Qty/day ${Number(account.avgQty || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} | Avg Rp/day ${formatCurrency(account.avgRevenue || 0)}`),
      '',
      'Daily spreadsheet',
      ...dailyData.days.map((day) => {
        const accountCells = accounts.length
          ? accounts.map((account) => {
            const accountDay = day.accounts.get(account.key) || { qty: 0, revenue: 0 };
            return `${account.label} Qty ${Number(accountDay.qty || 0).toLocaleString('id-ID')} Rp ${formatCurrency(accountDay.revenue || 0)}`;
          }).join('; ')
          : 'No account columns';
        return `${day.date}: ${accountCells} | Total Qty ${Number(day.qty || 0).toLocaleString('id-ID')} | Total Rp ${formatCurrency(day.revenue || 0)} | Avg Qty ${Number(day.avgQty || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} | Avg Rp ${formatCurrency(day.avgRevenue || 0)}`;
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
              <small>${products.length.toLocaleString('id-ID')} products</small>
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
                      <small>${flavors.length.toLocaleString('id-ID')} flavors</small>
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
      ordersRefs.tableBody.innerHTML = `<tr><td colspan="11" class="admin-empty">${escapeHtml(message)}</td></tr>`;
      return;
    }
    ordersRefs.tableBody.innerHTML = renderRows(visibleRows, 11, (row) => {
      const platform = `${row.platform || '-'}${row.account_key ? ` / ${row.account_key}` : ''}`;
      const productLabel = row.product_name || 'Unlinked SKU';
      const allocation = Array.isArray(row.allocations) && row.allocations.length
        ? row.allocations.map((item) => `${item.po_number}: ${formatCompactNumber(item.qty_astra_consumed || 0)}`).join(', ')
        : (row.allocation_error ? `Allocation needs review: ${row.allocation_error}` : 'No PO allocation');
      const poNumbers = Array.isArray(row.allocations) && row.allocations.length
        ? [...new Set(row.allocations.map((item) => item.po_number).filter(Boolean))].join(', ')
        : '-';
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
          <td>${contactButton(row.username, 'username')}</td>
          <td>${contactButton(row.address, 'address')}</td>
          <td>${contactButton(row.phone, 'phone')}</td>
        </tr>
      `;
    }, 'No loaded orders match the current filters yet.');
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
    const first = dateKeyToWibDate(firstMonthDay(monthKey));
    const calendarStart = new Date(first);
    const weekday = (calendarStart.getDay() + 6) % 7;
    calendarStart.setDate(calendarStart.getDate() - weekday);
    const monthFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: state.timezone, month: 'long', year: 'numeric' });
    ordersRefs.dateMonth.textContent = monthFormatter.format(first);
    const today = todayDate();
    const { startDate, endDate } = state.orders.filters;
    const days = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + index);
      const key = wibDateKey(date);
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
        checkout_clicks: Number(item.checkout_clicks || 0)
      },
      bubur: { views: 0, order_now_clicks: 0, checkout_clicks: 0 },
      jamu: { views: 0, order_now_clicks: 0, checkout_clicks: 0 }
    }));
    const hourOfDay = Array.isArray(data.hour_of_day) ? data.hour_of_day : [];
    const recentEvents = (Array.isArray(data.recent_events) ? data.recent_events : []).filter((item) => !shouldHideSourceMetric(item.source));

    if (homeRefs.summaryViews) homeRefs.summaryViews.textContent = Number(summary.total_views || 0).toLocaleString('id-ID');
    if (homeRefs.summaryOrder) homeRefs.summaryOrder.textContent = Number(summary.order_now_clicks || 0).toLocaleString('id-ID');
    if (homeRefs.summaryCheckout) homeRefs.summaryCheckout.textContent = Number(summary.checkout_clicks || 0).toLocaleString('id-ID');
    if (homeRefs.summaryTime) homeRefs.summaryTime.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));
    if (homeRefs.endpointLabel) homeRefs.endpointLabel.textContent = endpoint;

    if (homeRefs.urlTableBody) {
      homeRefs.urlTableBody.innerHTML = renderRows(byUrl, 6, (item) => `
        <tr>
          <td><strong>${escapeHtml(item.page_path || '-')}</strong></td>
          <td>${escapeHtml(toTitleCase(item.source || 'unknown'))}</td>
          <td>${Number(item.views || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.order_now_clicks || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.checkout_clicks || 0).toLocaleString('id-ID')}</td>
          <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
        </tr>
      `);
    }

    if (homeRefs.sourceTableBody) {
      homeRefs.sourceTableBody.innerHTML = renderRows(bySource, 5, (item) => `
        <tr>
          <td><strong>${escapeHtml(toTitleCase(item.source || 'unknown'))}</strong></td>
          <td>${Number(item.views || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.order_now_clicks || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.checkout_clicks || 0).toLocaleString('id-ID')}</td>
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
      label: (item) => `${String(item.hour).padStart(2, '0')}:00`,
      color: () => SOURCE_COLORS.facebook,
      metric: state.home.metric,
      unitsMap: HOME_METRIC_UNITS,
      tooltipTitle: (item) => `${String(item.hour).padStart(2, '0')}:00 WIB`,
      limit: 24
    });
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
    if (homeRefs.trendMeta) homeRefs.trendMeta.textContent = `Timeframe: ${state.home.timeframe.toUpperCase()} • Scope: Landing pages • Timezone: WIB`;
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
    const pages = Array.isArray(data.by_page) ? data.by_page : [];
    const regions = Array.isArray(data.by_region) ? data.by_region : [];
    const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];

    if (websiteRefs.summaryVisitors) websiteRefs.summaryVisitors.textContent = Number(summary.total_visitors || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryPageViews) websiteRefs.summaryPageViews.textContent = Number(summary.total_page_views || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryAddToCart) websiteRefs.summaryAddToCart.textContent = Number(summary.add_to_cart_events || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryCheckout) websiteRefs.summaryCheckout.textContent = Number(summary.checkout_clicks || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryTime) websiteRefs.summaryTime.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));
    if (websiteRefs.summaryTopRegion) websiteRefs.summaryTopRegion.textContent = summary.top_region || 'Unknown';
    if (websiteRefs.excludedCount) websiteRefs.excludedCount.textContent = Number(summary.excluded_ip_count || 0).toLocaleString('id-ID');
    if (websiteRefs.settingsEndpointLabel) websiteRefs.settingsEndpointLabel.textContent = settingsEndpoint;

    if (websiteRefs.pageTableBody) {
      websiteRefs.pageTableBody.innerHTML = renderRows(pages, 4, (item) => `
        <tr>
          <td><strong>${escapeHtml(item.page_path || '/')}</strong></td>
          <td>${Number(item.visitors || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.page_views || 0).toLocaleString('id-ID')}</td>
          <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
        </tr>
      `, 'Belum ada data website.');
    }

    if (websiteRefs.regionTableBody) {
      websiteRefs.regionTableBody.innerHTML = renderRows(regions, 4, (item) => `
        <tr>
          <td><strong>${escapeHtml(item.region_label || 'Unknown')}</strong></td>
          <td>${escapeHtml(item.country_code || '-')}</td>
          <td>${Number(item.visitors || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.page_views || 0).toLocaleString('id-ID')}</td>
        </tr>
      `, 'Belum ada data region.');
    }

    renderEventFeed(websiteRefs.recentEvents, Array.isArray(data.recent_events) ? data.recent_events : [], (item) => `
      <div class="admin-event-item">
        <strong>${escapeHtml(item.page_path || '/')} • ${escapeHtml(item.region_label || 'Unknown')}</strong>
        <span>${escapeHtml(item.ip_address_masked || 'Unknown')}</span>
        ${item.ip_address ? `<button type="button" class="admin-soft-btn" data-ignore-recorded-ip="${escapeHtml(String(item.ip_address))}">Ignore This Recorded IP</button>` : ''}
        <small>${escapeHtml(item.occurred_at || '')}</small>
      </div>
    `, 'Belum ada kunjungan website.');

    drawLineChart(websiteRefs.trendCanvas, timeseries, state.website.metric, WEBSITE_METRIC_UNITS);
    drawBarChart(websiteRefs.regionCanvas, regions, {
      value: (item) => item.visitors || 0,
      label: (item) => String(item.region_label || 'Unknown').slice(0, 14),
      color: () => SOURCE_COLORS.google,
      metric: 'visitors',
      unitsMap: WEBSITE_METRIC_UNITS,
      tooltipTitle: (item) => item.region_label || 'Unknown',
      limit: 6
    });
    drawBarChart(websiteRefs.pageCanvas, pages, {
      value: (item) => item[state.website.metric] || 0,
      label: (item) => formatPageLabel(item.page_path || '/').slice(0, 14),
      color: () => SOURCE_COLORS.direct,
      metric: state.website.metric,
      unitsMap: WEBSITE_METRIC_UNITS,
      tooltipTitle: (item) => item.page_path || '/',
      limit: 6
    });

    setLastUpdated(websiteRefs.lastUpdated, data.meta?.generated_at);
    const siteLabel = WEBSITE_SITE_LABELS[state.website.site]?.title || 'Website';
    if (websiteRefs.trendTitle) websiteRefs.trendTitle.textContent = `${siteLabel} ${WEBSITE_METRIC_LABELS[state.website.metric].replace(/^Website\s+/i, '').replace(/^website\s+/i, '')}`;
    if (websiteRefs.trendMeta) websiteRefs.trendMeta.textContent = `Timeframe: ${state.website.timeframe.toUpperCase()} • Scope: ${siteLabel} • Timezone: WIB`;
    websiteRefs.timeframeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteTimeframe === state.website.timeframe);
    });
    websiteRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteMetric === state.website.metric);
    });
  };

  const renderWebsiteShell = () => {
    const isDetail = state.website.screen === 'detail' && Boolean(state.website.site);
    const siteConfig = WEBSITE_SITE_LABELS[state.website.site] || null;

    if (websiteRefs.selector) websiteRefs.selector.hidden = isDetail;
    if (websiteRefs.detail) websiteRefs.detail.hidden = !isDetail;
    websiteRefs.backButtons.forEach((button) => {
      button.hidden = !isDetail;
    });
    websiteRefs.openButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteOpen === state.website.site);
    });

    if (!isDetail || !siteConfig) {
      if (zeroStoreRefs.panel) zeroStoreRefs.panel.hidden = true;
      if (websiteRefs.heroChip) websiteRefs.heroChip.textContent = 'Official Website Dashboard';
      if (websiteRefs.heroTitle) websiteRefs.heroTitle.textContent = 'Select a website dashboard.';
      if (websiteRefs.heroCopy) websiteRefs.heroCopy.textContent = 'Choose Jenang Gemi or ZERO to open the dedicated website analytics page. Each page uses browser-tagged website visits only.';
      return;
    }

    if (websiteRefs.heroChip) websiteRefs.heroChip.textContent = siteConfig.chip;
    if (websiteRefs.heroTitle) websiteRefs.heroTitle.textContent = siteConfig.title;
    if (websiteRefs.heroCopy) websiteRefs.heroCopy.textContent = siteConfig.copy;
    if (websiteRefs.pageChartTitle) websiteRefs.pageChartTitle.textContent = `${siteConfig.title} visitors by page`;
    if (websiteRefs.pageChartMeta) websiteRefs.pageChartMeta.textContent = siteConfig.pageMeta;
    if (websiteRefs.pageTableTitle) websiteRefs.pageTableTitle.textContent = siteConfig.pageTitle;
    if (websiteRefs.scopeNote) websiteRefs.scopeNote.textContent = siteConfig.scope;
    if (zeroStoreRefs.panel) zeroStoreRefs.panel.hidden = state.website.site !== 'zero';
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
    await loadWebsiteSafely();
    if (site === 'zero') {
      await loadZeroStoreSafely();
    }
  };

  const setZeroStoreError = (message = '') => {
    if (!zeroStoreRefs.error) return;
    zeroStoreRefs.error.hidden = !message;
    zeroStoreRefs.error.textContent = message;
  };

  const formatIdr = (value) => `Rp${Number(value || 0).toLocaleString('id-ID')}`;

  const zeroStoreActionUrl = (action) => `${zeroStoreEndpoint}?action=${encodeURIComponent(action)}&_ts=${Date.now()}`;

  const postZeroStore = (action, body) => requestJson(zeroStoreActionUrl(action), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const discountSummary = (discount) => {
    const amount = discount.discount_type === 'percent'
      ? `${Number(discount.amount || 0).toLocaleString('id-ID')}%`
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
          <td>${item.sku_linked ? Number(item.stock || 0).toLocaleString('id-ID') : 'Unlinked'}</td>
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
    const firstDay = dateKeyToWibDate(firstMonthDay(state.zeroStore.calendarMonth));
    const month = firstDay.getMonth();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);
    const today = todayDate();
    const bounds = zeroDiscountBounds();
    zeroStoreRefs.calendarMonth.textContent = new Intl.DateTimeFormat('id-ID', {
      timeZone: state.timezone,
      month: 'long',
      year: 'numeric'
    }).format(firstDay);
    const days = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = wibDateKey(date);
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
      <div class="admin-settings-chip">
        <strong>${escapeHtml(item.device_id || '')}</strong>
        <span>${escapeHtml(item.label || 'No label')}</span>
        <button type="button" data-delete-device-exclusion="${escapeHtml(String(item.id || ''))}">Remove</button>
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
      loadOverviewSafely(),
      loadHomeSafely(),
      loadWebsiteSafely(),
      loadWebsiteSettingsSafely()
    ]);
  };

  const refreshOverviewHourlyRows = async (requestToken = null) => {
    const hourlyRequestToken = state.overview.hourlyRequestToken + 1;
    state.overview.hourlyRequestToken = hourlyRequestToken;
    const today = todayDate();
    const hourlyData = await requestOrderFacts(today, today, { lightweight: true });
    if (requestToken !== null && !isLatestRequest('overview', requestToken)) return;
    if (hourlyRequestToken !== state.overview.hourlyRequestToken) return;
    state.overview.hourlyRows = hourlyOrderRows(Array.isArray(hourlyData.orders) ? hourlyData.orders : []);
    state.overview.hourlyDate = today;
    renderOverviewHourlyPanel();
  };

  const loadOverview = async (options = {}) => {
    if (options.useCache) {
      const cached = readOverviewCache(state.overview.year);
      if (cached) renderOverview(cached);
    }
    const requestToken = beginRequest('overview');
    if (!options.skipHourly) {
      refreshOverviewHourlyRows(requestToken).catch(() => {});
    }
    const [data, customData] = await Promise.all([
      requestJson(buildSalesUrl(state.overview.year, { refresh: Boolean(options.forceRefresh) })),
      state.overview.customRange.active && state.overview.customRange.startDate && state.overview.customRange.endDate
        ? requestOrderFacts(state.overview.customRange.startDate, state.overview.customRange.endDate).catch(() => ({ orders: [] }))
        : Promise.resolve(null)
    ]);
    if (!isLatestRequest('overview', requestToken)) return;
    if (customData) {
      state.overview.customRange.rows = Array.isArray(customData.orders) ? customData.orders : [];
    }
    writeOverviewCache(state.overview.year, data);
    renderOverview(data);
    requestJson(buildSalesUrl(state.overview.year, { refresh: true }))
      .then((freshData) => {
        if (!isLatestRequest('overview', requestToken)) return;
        writeOverviewCache(state.overview.year, freshData);
        renderOverview(freshData);
      })
      .catch(() => {});
  };

  const loadDaily = async () => {
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
        limit: DAILY_ORDER_PAGE_LIMIT,
        offset
      });
      if (!isLatestRequest('daily', requestToken)) return;
      rows.push(...(Array.isArray(payload.orders) ? payload.orders : []));
      const nextOffset = Number(payload.next_offset);
      if (!payload.has_more || !Number.isFinite(nextOffset) || nextOffset <= offset) {
        break;
      }
      offset = nextOffset;
      if (dailyRefs.status) {
        dailyRefs.status.textContent = `Loading ${formatDailyMonthLabel(state.daily.month)} order lines... ${rows.length.toLocaleString('id-ID')} loaded`;
      }
    }

    if (!isLatestRequest('daily', requestToken)) return;
    state.daily.rows = rows;
    state.daily.loading = false;
    renderDaily(aggregateDailyData(rows, state.daily.month));
  };

  const loadHome = async () => {
    const requestToken = beginRequest('home');
    const data = await requestJson(buildAnalyticsUrl('landing', state.home.timeframe));
    if (!isLatestRequest('home', requestToken)) return;
    renderHome(data);
  };

  const loadWebsite = async () => {
    const requestToken = beginRequest('website');
    const data = await requestJson(buildAnalyticsUrl('website', state.website.timeframe));
    if (!isLatestRequest('website', requestToken)) return;
    renderWebsite(data);
  };

  const loadWebsiteSettings = async () => {
    const requestToken = beginRequest('website', true);
    const data = await requestJson(buildSettingsUrl('website_settings'));
    if (!isLatestRequest('website', requestToken, true)) return;
    state.website.deviceExclusions = Array.isArray(data.excluded_devices) ? data.excluded_devices : [];
    state.website.currentDeviceId = ensureAnalyticsDeviceId();
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
    renderOrders();
  };

  const loadNextOrderWindow = async () => {
    if (state.orders.loadPromise) return state.orders.loadPromise;
    if (!state.orders.monthRanges.length) resetOrderWindowsFromOverview();
    syncOrderLoadedAll();
    const nextRange = nextOrderRange();
    if (!nextRange) {
      state.orders.loadedAll = true;
      renderOrders();
      return;
    }
    const generation = state.orders.loadGeneration;
    state.orders.loading = true;
    renderOrders();
    const loadPromise = (async () => {
      let completed = false;
      try {
        const requestToken = beginRequest('orders');
        const rangeKey = orderRangeKey(nextRange);
        const requestOffset = Number(state.orders.rangeOffsets[rangeKey] || 0);
        const data = await requestOrderFacts(nextRange.start, nextRange.end, {
          limit: ORDER_LOAD_PAGE_SIZE,
          offset: requestOffset,
          storedOnly: true
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
          renderOrders();
          if (completed && state.orders.ensurePending) {
            state.orders.ensurePending = false;
            ensureEnoughOrderRows().catch(showOrderLoadError);
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

  const ensureEnoughOrderRows = async () => {
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
        await loadNextOrderWindow();
        if (orderLoadProgressSignature() === progressSignature) break;
        loadedWindows += 1;
      }
    } finally {
      state.orders.ensureRunning = false;
      if (state.orders.ensurePending && !state.orders.loading) {
        state.orders.ensurePending = false;
        ensureEnoughOrderRows().catch(showOrderLoadError);
      }
    }
  };

  const loadOrders = async () => {
    if (!state.overview.data) {
      await loadOverviewSafely({ useCache: true, skipHourly: true });
    }
    resetOrderWindowsFromOverview();
    await ensureEnoughOrderRows();
    if (state.orders.loadPromise) {
      await state.orders.loadPromise;
    }
  };

  const showOrderLoadError = (error) => {
    state.orders.loading = false;
    const message = error instanceof Error ? error.message : 'Unable to load orders.';
    if (ordersRefs.tableBody && !state.orders.rows.length) {
      ordersRefs.tableBody.innerHTML = `<tr><td colspan="11" class="admin-empty">${escapeHtml(message)}</td></tr>`;
    }
    if (ordersRefs.status) ordersRefs.status.textContent = message;
    if (ordersRefs.loadMore) {
      ordersRefs.loadMore.hidden = false;
      ordersRefs.loadMore.disabled = false;
      ordersRefs.loadMore.textContent = 'Retry';
    }
  };

  const loadOrdersSafely = async () => {
    try {
      await loadOrders();
      return true;
    } catch (error) {
      showOrderLoadError(error);
      return false;
    }
  };

  const loadDailySafely = async () => {
    try {
      await loadDaily();
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

  const loadActiveView = async () => {
    if (state.activeView === 'overview') {
      await loadOverview();
      return;
    }
    if (state.activeView === 'orders') {
      await loadOrders();
      return;
    }
    if (state.activeView === 'daily') {
      await loadDaily();
      return;
    }
    if (state.activeView === 'context') {
      await loadContext();
      return;
    }
    if (state.activeView === 'home') {
      await loadHome();
      return;
    }
    if (state.activeView === 'website') {
      if (state.website.screen === 'detail' && state.website.site) {
        await loadWebsite();
      } else {
        showWebsiteSelector();
      }
      return;
    }
    if (state.activeView === 'settings') {
      await loadWebsiteSettings();
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

  const loadHomeSafely = async () => {
    try {
      await loadHome();
      return true;
    } catch (error) {
      renderViewError('home', error);
      return false;
    }
  };

  const loadWebsiteSafely = async () => {
    try {
      await loadWebsite();
      return true;
    } catch (error) {
      renderViewError('website', error);
      return false;
    }
  };

  const loadWebsiteSettingsSafely = async () => {
    try {
      await loadWebsiteSettings();
      return true;
    } catch (error) {
      if (websiteRefs.deviceExclusionError) {
        websiteRefs.deviceExclusionError.hidden = false;
        websiteRefs.deviceExclusionError.textContent = `Gagal memuat excluded device list: ${error.message}`;
      }
      return false;
    }
  };

  const loadActiveViewSafely = async () => {
    if (state.activeView === 'overview') {
      return loadOverviewSafely();
    }
    if (state.activeView === 'orders') {
      return loadOrdersSafely();
    }
    if (state.activeView === 'daily') {
      return loadDailySafely();
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
      return loadHomeSafely();
    }
    if (state.activeView === 'website') {
      if (state.website.screen === 'detail' && state.website.site) {
        return loadWebsiteSafely();
      }
      showWebsiteSelector();
      return true;
    }
    if (state.activeView === 'settings') {
      return loadWebsiteSettingsSafely();
    }
    return true;
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
      loadOverviewSafely(),
      state.activeView === 'orders' ? loadOrdersSafely() : Promise.resolve(true),
      state.activeView === 'daily' ? loadDailySafely() : Promise.resolve(true)
    ]);
    return true;
  };

  const renderCachedCharts = () => {
    if (state.activeView === 'overview' && state.overview.data) renderOverview(state.overview.data);
    if (state.activeView === 'daily' && state.daily.data) renderDaily(state.daily.data);
    if (state.activeView === 'home' && state.home.data) renderHome(state.home.data);
    if (state.activeView === 'website' && state.website.screen === 'detail' && state.website.data) renderWebsite(state.website.data);
  };

  const switchView = async (nextView) => {
    state.activeView = normalizeDashboardView(nextView);
    if (state.activeView === 'website') {
      showWebsiteSelector();
    }
    syncViewState();
    closeMenu();
    renderJenangGemiSearchResults(searchInput?.value || '');
    await loadActiveViewSafely();
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
      await switchView(requestedView);
      const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      window.history.replaceState(null, '', nextPath || targetUrl.pathname);
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

  const connectLiveStream = () => {
    if (!window.EventSource || !liveEndpoint) return;
    closeLiveStream();
    const streamUrl = `${liveEndpoint}?last_sequence=${encodeURIComponent(String(state.liveSequence))}`;
    const source = new window.EventSource(streamUrl, { withCredentials: true });
    state.liveSource = source;

    source.addEventListener('change', async (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const nextSequence = Number(payload.sequence || 0);
        if (!Number.isFinite(nextSequence) || nextSequence <= state.liveSequence) return;
        state.liveSequence = nextSequence;
        await loadActiveView();
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

  applyTheme(readStoredTheme() || 'minimal-black');
  if (dailyRefs.monthInput) dailyRefs.monthInput.value = state.daily.month;
  renderDailyPlatformList();
  loadOrderCatalog();
  syncViewState();
  renderContextEditor();
  setLoaderState(20, 'Connecting to analytics');

  if (state.activeView === 'overview') {
    loadOverviewSafely({ useCache: true }).catch(() => {});
    setLoaderState(70, 'Preparing interface');
    finishLoader();
    connectLiveStream();
  } else {
    loadActiveViewSafely()
      .then(async () => {
        setLoaderState(70, 'Preparing interface');
        if (state.activeView === 'settings') {
          await loadWebsiteSettingsSafely();
        }
      })
      .finally(() => {
        finishLoader();
        connectLiveStream();
      });
  }

  overviewRefs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.metric = button.dataset.overviewMetric || 'revenue';
      overviewRefs.metricButtons.forEach((candidate) => {
        candidate.classList.toggle('is-active', candidate === button);
      });
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

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
    await loadDailySafely();
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
      await loadHomeSafely();
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
      await loadWebsiteSafely();
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
    const date = dateKeyToWibDate(firstMonthDay(state.zeroStore.calendarMonth));
    date.setMonth(date.getMonth() - 1);
    state.zeroStore.calendarMonth = monthKeyFromDate(wibDateKey(date));
    renderZeroDiscountCalendar();
  });
  zeroStoreRefs.calendarNext?.addEventListener('click', () => {
    const date = dateKeyToWibDate(firstMonthDay(state.zeroStore.calendarMonth));
    date.setMonth(date.getMonth() + 1);
    state.zeroStore.calendarMonth = monthKeyFromDate(wibDateKey(date));
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
    const date = dateKeyToWibDate(firstMonthDay(state.orders.calendarMonth));
    date.setMonth(date.getMonth() - 1);
    state.orders.calendarMonth = monthKeyFromDate(wibDateKey(date));
    renderOrdersDateCalendar();
  });

  ordersRefs.dateNext?.addEventListener('click', () => {
    const date = dateKeyToWibDate(firstMonthDay(state.orders.calendarMonth));
    date.setMonth(date.getMonth() + 1);
    state.orders.calendarMonth = monthKeyFromDate(wibDateKey(date));
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

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(getNextTheme());
    });
  });

  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.themeOption || 'minimal-black');
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
    const id = target.dataset.deleteDeviceExclusion || '';
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
    refreshForLocalDateRollover()
      .then((refreshed) => {
        if (!refreshed) return loadActiveViewSafely();
        return true;
      })
      .catch(() => {});
  });

  window.addEventListener('resize', () => renderCachedCharts());
  window.addEventListener('focus', () => {
    refreshForLocalDateRollover().catch(() => {});
    if (state.activeView === 'overview') {
      refreshOverviewHourlyRows().catch(() => {});
    }
  });
  window.setInterval(() => {
    if (!document.hidden) {
      refreshForLocalDateRollover().catch(() => {});
      if (state.activeView === 'overview') {
        refreshOverviewHourlyRows().catch(() => {});
      }
    }
  }, 60000);
  window.addEventListener('beforeunload', (event) => {
    closeLiveStream();
    if (!state.context.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
});
