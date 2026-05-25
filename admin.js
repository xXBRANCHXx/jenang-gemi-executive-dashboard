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
  page_views: 'Website page views over time'
};

const WEBSITE_METRIC_UNITS = {
  visitors: 'visitors',
  page_views: 'page views'
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
const ANALYTICS_DEVICE_COOKIE = 'jg_analytics_device_id';
const ANALYTICS_DEVICE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

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

const shouldHideSourceMetric = (value) => HIDDEN_HOME_SOURCES.has(normalizeSourceKey(value));

const prepareCanvas = (canvas) => {
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
};

const getThemePalette = () => {
  const styles = window.getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue('--admin-text').trim() || '#0c1117',
    muted: styles.getPropertyValue('--admin-muted').trim() || 'rgba(55, 65, 81, 0.68)',
    border: styles.getPropertyValue('--admin-border').trim() || 'rgba(17, 24, 39, 0.08)',
    surface: styles.getPropertyValue('--admin-surface').trim() || '#ffffff',
    surfaceSoft: styles.getPropertyValue('--admin-surface-soft').trim() || '#f6f8f4'
  };
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
      chartActivePointState.delete(canvas);
      const renderChart = chartRendererState.get(canvas);
      if (renderChart) renderChart();
      hideChartTooltip(canvas);
      return;
    }
    chartActivePointState.set(canvas, hoveredPoint);
    const renderChart = chartRendererState.get(canvas);
    if (renderChart) renderChart();
    renderChartTooltip(canvas, hoveredPoint, event.clientX, event.clientY);
  });

  canvas.addEventListener('mouseleave', () => {
    chartActivePointState.delete(canvas);
    const renderChart = chartRendererState.get(canvas);
    if (renderChart) renderChart();
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
  const values = items.map(chartValue).filter((value) => Number.isFinite(value));
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
    linePoints.push({ x, y });
    points.push({
      x,
      y,
      value,
      metric,
      unitsMap,
      label: item.label || '',
      tooltipTitle: item.label || '',
      tooltipValue: formatMetricValue(metric, value, unitsMap),
      tooltipLinesHtml: item.tooltipLinesHtml || null,
      hitbox: {
        left: index === 0 ? padding.left : x - (chartWidth / Math.max(items.length - 1, 1) / 2),
        right: index === items.length - 1 ? width - padding.right : x + (chartWidth / Math.max(items.length - 1, 1) / 2),
        top: padding.top,
        bottom: padding.top + chartHeight
      }
    });
    if (!hasOpenLine) {
      ctx.moveTo(x, y);
      hasOpenLine = true;
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  if (linePoints.length) {
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
    ctx.fillStyle = isActive ? '#ffffff' : lineColor;
    ctx.beginPath();
    ctx.arc(x, y, isActive ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (isActive) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
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
    orders: 'orders'
  };
  const validViews = new Set(['overview', 'orders', 'home', 'website', 'settings']);
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
      data: null,
      requestToken: 0
    },
    orders: {
      data: null,
      startDate: '',
      endDate: '',
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
      data: null,
      deviceExclusions: [],
      currentDeviceId: ensureAnalyticsDeviceId(),
      requestToken: 0,
      settingsRequestToken: 0
    },
    liveSequence: -1,
    liveSource: null
  };

  const endpoint = root.dataset.analyticsEndpoint || './analytics.php';
  const liveEndpoint = root.dataset.liveEndpoint || './live/';
  const settingsEndpoint = root.dataset.settingsEndpoint || './settings/';
  const salesEndpoint = root.dataset.salesEndpoint || './sales/';

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
  const searchResults = document.querySelector('[data-dashboard-search-results]');

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
    startDate: document.querySelector('[data-orders-start-date]'),
    endDate: document.querySelector('[data-orders-end-date]'),
    refresh: document.querySelector('[data-orders-refresh]'),
    tableBody: document.querySelector('[data-orders-table-body]'),
    count: document.querySelector('[data-orders-count]'),
    lastUpdated: document.querySelector('[data-orders-last-updated]')
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
    summaryVisitors: document.querySelector('[data-website-summary-total-visitors]'),
    summaryPageViews: document.querySelector('[data-website-summary-page-views]'),
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
    timeframeButtons: document.querySelectorAll('[data-website-timeframe]'),
    metricButtons: document.querySelectorAll('[data-website-metric]'),
    currentDeviceId: document.querySelector('[data-current-device-id]'),
    currentDeviceLabel: document.querySelector('[data-current-device-label]'),
    ignoreCurrentDeviceButton: document.querySelector('[data-ignore-current-device]'),
    deviceExclusionForm: document.querySelector('[data-device-exclusion-form]'),
    deviceExclusionError: document.querySelector('[data-device-exclusion-error]'),
    deviceExclusionList: document.querySelector('[data-device-exclusion-list]')
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

  const closeSearchResults = ({ clear = false } = {}) => {
    if (clear && searchInput) searchInput.value = '';
    if (searchResults) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
    }
    searchShell?.classList.remove('is-open');
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
      closeSearchResults();
      return [];
    }

    searchShell?.classList.add('is-open');
    searchResults.hidden = false;

    if (!results.length) {
      searchResults.innerHTML = '<div class="admin-search-empty">No matching Jenang Gemi pages found.</div>';
      return [];
    }

    searchResults.innerHTML = results.map((result) => `
      <a class="admin-search-result" href="${escapeHtml(result.url)}"${result.view ? ` data-search-view="${escapeHtml(result.view)}"` : ''}>
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
      const [firstResult] = renderJenangGemiSearchResults(searchInput?.value || '');
      if (firstResult?.url) {
        window.location.href = firstResult.url;
      }
    });

    searchInput?.addEventListener('input', () => {
      renderJenangGemiSearchResults(searchInput.value || '');
    });

    searchInput?.addEventListener('focus', () => {
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
      const link = target.closest('[data-search-view]');
      if (!(link instanceof HTMLAnchorElement)) return;
      const nextView = link.dataset.searchView;
      if (nextView) {
        window.localStorage.setItem(viewStorageKey, nextView);
      }
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
    renderCachedCharts();
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      credentials: 'same-origin',
      cache: 'no-store',
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  };

  const renderRows = (items, emptyColspan, formatter, emptyMessage = 'Belum ada data.') => {
    if (!items.length) {
      return `<tr><td colspan="${emptyColspan}" class="admin-empty">${escapeHtml(emptyMessage)}</td></tr>`;
    }
    return items.map(formatter).join('');
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
      overview: 'Executive Sales Overview',
      orders: 'Orders',
      home: 'Campaigns Dashboard',
      website: 'Official Website Dashboard',
      settings: 'Settings'
    };
    const navSectionByView = {
      overview: 'home',
      orders: 'orders',
      home: 'campaigns',
      website: 'website',
      settings: 'settings'
    };
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
  };

  const openMenu = () => {
    if (!menuPanel || !menuTrigger) return;
    menuPanel.hidden = false;
    menuTrigger.setAttribute('aria-expanded', 'true');
  };

  const buildAnalyticsUrl = (dataset, timeframe) => {
    const params = new URLSearchParams({
      timeframe,
      timezone: state.timezone,
      recent_limit: '120',
      dataset,
      _ts: String(Date.now())
    });
    return `${endpoint}?${params.toString()}`;
  };

  const buildSalesUrl = (year) => {
    const params = new URLSearchParams({
      year: String(year),
      _ts: String(Date.now())
    });
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
    return `${ordersEndpoint}?${params.toString()}`;
  };
  const requestOrderFacts = (startDate, endDate, options = {}) => requestJson(buildOrderFactsUrl(startDate, endDate, options));
  const todayDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone }).format(new Date());
  const offsetDate = (dateValue, offsetDays) => {
    const date = new Date(`${dateValue}T00:00:00+07:00`);
    date.setDate(date.getDate() + offsetDays);
    return new Intl.DateTimeFormat('en-CA', { timeZone: state.timezone }).format(date);
  };
  const defaultOrderDatesFor = (today) => {
    return { start: offsetDate(today, -1), end: today };
  };
  const defaultOrderDates = () => defaultOrderDatesFor(todayDate());
  const buildOrdersUrl = () => {
    const defaults = defaultOrderDates();
    const startDate = ordersRefs.startDate?.value || state.orders.startDate || defaults.start;
    const endDate = ordersRefs.endDate?.value || state.orders.endDate || defaults.end;
    state.orders.startDate = startDate;
    state.orders.endDate = endDate;
    return buildOrderFactsUrl(startDate, endDate);
  };

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

  const applyDefaultOrderDates = (defaults = defaultOrderDates(), force = false) => {
    if (!force && ((ordersRefs.startDate && ordersRefs.startDate.value) || state.orders.startDate)) return;
    state.orders.startDate = defaults.start;
    state.orders.endDate = defaults.end;
    if (ordersRefs.startDate) ordersRefs.startDate.value = defaults.start;
    if (ordersRefs.endDate) ordersRefs.endDate.value = defaults.end;
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
    target.revenue += metrics.revenue;
    target.gross_profit += metrics.gross_profit;
    const orderId = String(order?.order_id || '').trim();
    if (!target._orderIds) target._orderIds = new Set();
    if (orderId === '' || !target._orderIds.has(orderId)) {
      target.orders += metrics.orders;
      if (orderId !== '') target._orderIds.add(orderId);
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
    const customRange = state.overview.customRange || {};
    const customTrend = customRange.active && Array.isArray(customRange.rows)
      ? aggregateOrdersForTrend(customRange.rows, customRange.startDate, customRange.endDate)
      : null;
    const trendRows = customTrend ? customTrend.rows : monthlyRows;
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
    if (overviewRefs.hourlyTitle) {
      overviewRefs.hourlyTitle.textContent = `Today ${OVERVIEW_METRIC_SHORT_LABELS[state.overview.hourlyMetric] || 'Orders'} by hour`;
    }
    if (overviewRefs.hourlyMeta) {
      const hourlyTotal = state.overview.hourlyRows.reduce((sum, row) => sum + Number(row[state.overview.hourlyMetric] || 0), 0);
      overviewRefs.hourlyMeta.textContent = `Live today, 0-23 • ${formatFullMetricValue(state.overview.hourlyMetric, hourlyTotal, OVERVIEW_METRIC_UNITS)}`;
    }

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
    overviewRefs.hourlyMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewHourlyMetric === state.overview.hourlyMetric);
    });
    overviewRefs.productMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewProductMetric === state.overview.productMetric);
    });
    overviewRefs.flavorMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewFlavorMetric === state.overview.flavorMetric);
    });
    const hourlyLineColor = state.overview.hourlyMetric === 'gross_profit'
      ? '#9dff00'
      : state.overview.hourlyMetric === 'revenue'
        ? '#22d3ee'
        : state.overview.hourlyMetric === 'item_count'
          ? '#ff8f1f'
          : '#ff4ecd';

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
    drawChartSafely(overviewRefs.hourlyCanvas, () => drawLineChart(overviewRefs.hourlyCanvas, state.overview.hourlyRows, state.overview.hourlyMetric, OVERVIEW_METRIC_UNITS, {
      padding: { top: 14, right: 16, bottom: 36, left: 68 },
      labelFont: '600 10px "Plus Jakarta Sans", sans-serif',
      maxLabels: 8,
      lineColor: hourlyLineColor
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
  };

  const renderOrders = (data) => {
    state.orders.data = data;
    const rows = Array.isArray(data.orders) ? data.orders : [];
    if (ordersRefs.startDate && data.start_date) ordersRefs.startDate.value = data.start_date;
    if (ordersRefs.endDate && data.end_date) ordersRefs.endDate.value = data.end_date;
    if (ordersRefs.count) ordersRefs.count.textContent = `${formatCompactNumber(rows.length)} rows`;
    if (ordersRefs.lastUpdated) ordersRefs.lastUpdated.textContent = `Updated ${new Date().toLocaleString('id-ID', { timeZone: state.timezone })}`;
    if (!ordersRefs.tableBody) return;
    const contactButton = (value, label) => {
      const text = String(value || '').trim();
      if (!text) return '-';
      return `<button type="button" class="admin-order-view-btn" data-order-popover="${escapeHtml(text)}" aria-label="View ${escapeHtml(label)}">View</button>`;
    };
    ordersRefs.tableBody.innerHTML = renderRows(rows, 11, (row) => {
      const platform = `${row.platform || '-'}${row.account_key ? ` / ${row.account_key}` : ''}`;
      const allocation = Array.isArray(row.allocations) && row.allocations.length
        ? row.allocations.map((item) => `${item.po_number}: ${formatCompactNumber(item.qty_astra_consumed || 0)}`).join(', ')
        : (row.allocation_error ? `Allocation needs review: ${row.allocation_error}` : 'No PO allocation');
      const poNumbers = Array.isArray(row.allocations) && row.allocations.length
        ? [...new Set(row.allocations.map((item) => item.po_number).filter(Boolean))].join(', ')
        : '-';
      return `
        <tr>
          <td>${escapeHtml(row.timestamp || '')}</td>
          <td><strong>${escapeHtml(row.order_id || '')}</strong></td>
          <td>${escapeHtml(platform)}</td>
          <td class="admin-order-product" title="${escapeHtml(row.product_name || row.sku || row.marketplace_sku || '')}"><strong>${escapeHtml(row.product_name || row.sku || row.marketplace_sku || '')}</strong></td>
          <td>${formatCompactNumber(row.quantity || 0)}</td>
          <td title="${escapeHtml(allocation)}">${escapeHtml(poNumbers)}</td>
          <td>${formatCellCurrency(row.revenue || 0)}</td>
          <td>${formatCellCurrency(row.cogs || 0)}</td>
          <td>${contactButton(row.username, 'username')}</td>
          <td>${contactButton(row.address, 'address')}</td>
          <td>${contactButton(row.phone, 'phone')}</td>
        </tr>
      `;
    }, 'No orders found for this date range.');
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
    const summary = data.summary || {};
    const pages = Array.isArray(data.by_page) ? data.by_page : [];
    const regions = Array.isArray(data.by_region) ? data.by_region : [];
    const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];

    if (websiteRefs.summaryVisitors) websiteRefs.summaryVisitors.textContent = Number(summary.total_visitors || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryPageViews) websiteRefs.summaryPageViews.textContent = Number(summary.total_page_views || 0).toLocaleString('id-ID');
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
    if (websiteRefs.trendTitle) websiteRefs.trendTitle.textContent = WEBSITE_METRIC_LABELS[state.website.metric];
    if (websiteRefs.trendMeta) websiteRefs.trendMeta.textContent = `Timeframe: ${state.website.timeframe.toUpperCase()} • Scope: Official website • Timezone: WIB`;
    websiteRefs.timeframeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteTimeframe === state.website.timeframe);
    });
    websiteRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteMetric === state.website.metric);
    });
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

  const refreshOverviewHourlyRows = async (requestToken) => {
    const today = todayDate();
    const hourlyData = await requestOrderFacts(today, today, { lightweight: true });
    if (!isLatestRequest('overview', requestToken)) return;
    state.overview.hourlyRows = hourlyOrderRows(Array.isArray(hourlyData.orders) ? hourlyData.orders : []);
    state.overview.hourlyDate = today;
    if (state.overview.data) {
      renderOverview(state.overview.data);
    }
  };

  const loadOverview = async (options = {}) => {
    if (options.useCache) {
      const cached = readOverviewCache(state.overview.year);
      if (cached) renderOverview(cached);
    }
    const requestToken = beginRequest('overview');
    refreshOverviewHourlyRows(requestToken).catch(() => {});
    const [data, customData] = await Promise.all([
      requestJson(buildSalesUrl(state.overview.year)),
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

  const loadOrders = async () => {
    const requestToken = beginRequest('orders', true);
    const data = await requestJson(buildOrdersUrl());
    if (!isLatestRequest('orders', requestToken, true)) return;
    renderOrders(data);
  };

  const loadOrdersSafely = async () => {
    try {
      await loadOrders();
      return true;
    } catch (error) {
      if (ordersRefs.tableBody) {
        ordersRefs.tableBody.innerHTML = `<tr><td colspan="11" class="admin-empty">${escapeHtml(error.message || 'Unable to load orders.')}</td></tr>`;
      }
      if (ordersRefs.count) ordersRefs.count.textContent = '0 rows';
      return false;
    }
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
    if (state.activeView === 'home') {
      await loadHome();
      return;
    }
    if (state.activeView === 'website') {
      await loadWebsite();
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
    if (state.activeView === 'home') {
      return loadHomeSafely();
    }
    if (state.activeView === 'website') {
      return loadWebsiteSafely();
    }
    if (state.activeView === 'settings') {
      return loadWebsiteSettingsSafely();
    }
    return true;
  };

  const refreshForLocalDateRollover = async () => {
    const nextLocalDate = todayDate();
    if (nextLocalDate === activeLocalDate) return false;

    const previousDefaults = defaultOrderDatesFor(activeLocalDate);
    activeLocalDate = nextLocalDate;
    const nextDefaults = defaultOrderDatesFor(activeLocalDate);
    const wasUsingDefaultOrders = (
      (!state.orders.startDate || state.orders.startDate === previousDefaults.start)
      && (!state.orders.endDate || state.orders.endDate === previousDefaults.end)
      && (!ordersRefs.startDate?.value || ordersRefs.startDate.value === previousDefaults.start)
      && (!ordersRefs.endDate?.value || ordersRefs.endDate.value === previousDefaults.end)
    );

    state.overview.year = Number(activeLocalDate.slice(0, 4)) || state.overview.year;
    state.overview.hourlyRows = [];
    state.overview.hourlyDate = activeLocalDate;
    if (wasUsingDefaultOrders) {
      applyDefaultOrderDates(nextDefaults, true);
    }

    await Promise.allSettled([
      loadOverviewSafely(),
      state.activeView === 'orders' ? loadOrdersSafely() : Promise.resolve(true)
    ]);
    return true;
  };

  const renderCachedCharts = () => {
    if (state.overview.data) renderOverview(state.overview.data);
    if (state.orders.data) renderOrders(state.orders.data);
    if (state.home.data) renderHome(state.home.data);
    if (state.website.data) renderWebsite(state.website.data);
  };

  const switchView = async (nextView) => {
    state.activeView = normalizeDashboardView(nextView);
    syncViewState();
    closeMenu();
    renderJenangGemiSearchResults(searchInput?.value || '');
    await loadActiveViewSafely();
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
  applyDefaultOrderDates(defaultOrderDates());
  syncViewState();
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
      overviewRefs.hourlyMetricButtons.forEach((candidate) => {
        candidate.classList.toggle('is-active', candidate === button);
      });
      if (state.overview.data) renderOverview(state.overview.data);
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

  ordersRefs.refresh?.addEventListener('click', async () => {
    await loadOrdersSafely();
  });

  ordersRefs.startDate?.addEventListener('change', () => {
    state.orders.startDate = ordersRefs.startDate?.value || state.orders.startDate;
  });

  ordersRefs.endDate?.addEventListener('change', () => {
    state.orders.endDate = ordersRefs.endDate?.value || state.orders.endDate;
  });

  ordersRefs.tableBody?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-order-popover]');
    if (!(button instanceof HTMLElement)) return;
    event.stopPropagation();
    openOrderPopover(button, button.dataset.orderPopover || '');
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
  });
  window.setInterval(() => {
    if (!document.hidden) {
      refreshForLocalDateRollover().catch(() => {});
    }
  }, 60000);
  window.addEventListener('beforeunload', closeLiveStream);
});
