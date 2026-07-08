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
  sales: 'Net revenue by month',
  net_revenue: 'Net revenue by month',
  gross_revenue: 'Gross revenue by month',
  marketplace_fees: 'Marketplace fees by month',
  orders: 'Total orders by month',
  average_order_value: 'Average order value by month',
  item_count: 'Items sold by month'
};

const OVERVIEW_METRIC_UNITS = {
  sales: 'idr',
  net_revenue: 'idr',
  gross_revenue: 'idr',
  marketplace_fees: 'idr',
  orders: 'orders',
  average_order_value: 'idr',
  item_count: 'items'
};

const OVERVIEW_PLATFORM_COLORS = {
  shopee: '#ff8f1f',
  tiktok: '#22d3ee',
  tokopedia: '#5bff8a',
  unknown: '#7a879a'
};

const C4_METRIC_LABELS = {
  orders: 'Daily orders QTY by hour',
  gross_profit: 'Gross profit by hour',
  revenue: 'Revenue by hour',
  item_count: 'QTY sold by hour'
};

const C4_METRIC_UNITS = {
  orders: 'orders',
  gross_profit: 'idr',
  revenue: 'idr',
  item_count: 'items'
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
    title: 'jenanggemi.com',
    chip: 'Jenang Gemi Website Dashboard',
    copy: 'Minimal traffic and paid-commerce view for jenanggemi.com.',
    scope: 'Counts only `traffic_kind=website` browser events from the Jenang Gemi website.'
  },
  zero: {
    title: 'zerofoods.id',
    chip: 'ZERO Website Dashboard',
    copy: 'Minimal traffic and paid-commerce view for zerofoods.id.',
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
    url: '../dashboard/',
    view: 'overview',
    keywords: ['home', 'homepage', 'sales', 'marketplace', 'overview', 'executive']
  },
  {
    title: 'Marketplace Order Explorer',
    section: 'Admin',
    description: 'Search and inspect stored marketplace order facts.',
    url: '../dashboard/#orders',
    view: 'overview',
    hash: 'orders',
    keywords: ['orders', 'marketplace orders', 'order explorer', 'transactions']
  },
  {
    title: 'Store Ops Fulfillment',
    section: 'Admin',
    description: 'Search employee orders, fulfilled orders, active claims, scan errors, and order timelines.',
    url: '../dashboard/?view=store-ops',
    view: 'store-ops',
    keywords: ['store ops', 'employee orders', 'fulfilled orders', 'order id', 'scan errors', 'claims', 'fulfillment']
  },
  {
    title: 'Daily Sales Rundown',
    section: 'Admin',
    description: 'Daily platform quantities, revenue, totals, and monthly averages.',
    url: '../dashboard/?view=daily',
    view: 'daily',
    keywords: ['daily', 'day', 'daily report', 'platform', 'quantity', 'qty', 'revenue', 'monthly averages']
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
    title: 'API Ingest Workspace',
    section: 'Admin',
    description: 'Webhook diagnostics, marketplace API experiments, and isolated integration work.',
    url: '../back-dash/',
    keywords: ['api', 'ingest', 'webhook', 'context', 'workspace']
  },
  {
    title: 'Accounting',
    section: 'Admin',
    description: 'Cash, bills, expenses, manual finance entries, and profit cash-control summary.',
    url: '../dashboard/?view=accounting',
    view: 'accounting',
    keywords: ['accounting', 'cash control', 'cash', 'bills', 'expenses', 'payments', 'vendor', 'supplier', 'p&l', 'profit loss', 'finance']
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
const ORDER_WINDOW_ROW_LIMIT = 240;
const DAILY_ORDER_PAGE_LIMIT = 500;
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
  daily: 5 * 60 * 1000,
  home: 90 * 1000,
  website: 2 * 60 * 1000,
  accounting: 90 * 1000,
  settings: 5 * 60 * 1000
};
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_REFRESH_DEBOUNCE_MS = 1200;
const BACKGROUND_IDLE_TIMEOUT_MS = 5000;
const BACKGROUND_TASK_DELAY_MS = 450;

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

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

const jgValidMonthKey = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return Number.isFinite(year) && year >= 2024 && year <= 2100 && month >= 1 && month <= 12;
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

const formatCurrency = (value) => `Rp${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;

const formatMetricValue = (metric, value, unitsMap) => {
  const unit = unitsMap[metric] || 'units';
  if (unit === 'idr') return formatCurrency(value);
  return `${Number(value).toLocaleString('id-ID')} ${unit}`;
};

const formatPageLabel = (pagePath = '') => {
  const cleaned = String(pagePath).replace(/^\//, '').replace(/\.html$/i, '');
  return cleaned || '/';
};

const normalizeSourceKey = (value) => String(value || '').trim().toLowerCase();

const HIDDEN_HOME_SOURCES = new Set(['internal', 'direct']);

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
  const relativeX = Math.max(12, Math.min(clientX - surfaceRect.left, surfaceRect.width - 12));
  const relativeY = Math.max(12, Math.min(clientY - surfaceRect.top, surfaceRect.height - 12));
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
  const padding = { top: 20, right: 20, bottom: 48, left: 92 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const itemCount = Math.max(chartItems.length, 1);
  const barWidth = (chartWidth / itemCount) * 0.58;
  const gap = (chartWidth / itemCount) * 0.42;
  const palette = getThemePalette();
  const hoverPoints = [];

  bindChartHover(canvas);

  drawGrid(ctx, width, height, padding, maxValue, config.metric, config.unitsMap, palette);

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

    drawValueBadge(ctx, x + (barWidth / 2), y, String(value), palette);

    ctx.fillStyle = palette.muted;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.label(item), x + (barWidth / 2), height - 16);

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

const drawLineChart = (canvas, items, metric, unitsMap) => {
  chartRendererState.set(canvas, () => drawLineChart(canvas, items, metric, unitsMap));
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const padding = { top: 20, right: 18, bottom: 48, left: 92 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = items.map((item) => Number(item[metric] || 0));
  const maxValue = Math.max(...values, 1);
  const palette = getThemePalette();
  const points = [];

  bindChartHover(canvas);

  drawGrid(ctx, width, height, padding, maxValue, metric, unitsMap, palette);

  if (!items.length) {
    chartHoverState.set(canvas, []);
    return;
  }

  ctx.strokeStyle = SOURCE_COLORS.instagram;
  ctx.lineWidth = 3;
  ctx.beginPath();

  items.forEach((item, index) => {
    const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
    const value = Number(item[metric] || 0);
    const y = padding.top + chartHeight - ((value / maxValue) * (chartHeight - 6));
    points.push({
      x,
      y,
      value,
      metric,
      unitsMap,
      label: item.label || '',
      hoverKey: `${metric}:${index}`,
      tooltipTitle: item.label || '',
      tooltipValue: formatMetricValue(metric, value, unitsMap)
    });
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  items.forEach((item, index) => {
    const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
    const y = padding.top + chartHeight - ((Number(item[metric] || 0) / maxValue) * (chartHeight - 6));
    ctx.fillStyle = SOURCE_COLORS.instagram;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (index === 0 || index === items.length - 1 || items.length <= 8 || index % Math.ceil(items.length / 6) === 0) {
      ctx.fillStyle = palette.muted;
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
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
    ctx.strokeStyle = HOME_TREND_SERIES.total.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(activeHover.x, padding.top);
    ctx.lineTo(activeHover.x, padding.top + chartHeight);
    ctx.stroke();
  }

  chartHoverState.set(canvas, hoverColumns.filter(Boolean));
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-admin-dashboard]');
  if (!root) return;

  const themeStorageKey = 'jg-admin-theme';
  const viewStorageKey = 'jg-dashboard-view';
  const viewAliases = {
    landing: 'home',
    landing_pages: 'home',
    'landing-pages': 'home',
    campaign: 'home',
    campaigns: 'home',
    overview: 'overview',
    executive: 'overview',
    homepage: 'overview',
    daily: 'daily',
    day: 'daily',
    'daily-report': 'daily',
    ops: 'store-ops',
    'store-ops': 'store-ops',
    store_ops: 'store-ops',
    fulfillment: 'store-ops',
    accounting: 'accounting',
    accounts: 'accounting',
    cash: 'accounting',
    'cash-control': 'accounting',
    cash_control: 'accounting',
    'profit-loss': 'accounting',
    profit_loss: 'accounting',
    pl: 'accounting'
  };
  const validViews = new Set(['overview', 'daily', 'home', 'website', 'accounting', 'store-ops', 'settings']);
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
      metric: 'sales',
      volumeMetric: 'orders',
      platformMetric: 'sales',
      salesRecapOpen: false,
      data: null,
      loadedAt: 0,
      orderMonths: [],
      orders: [],
      orderKeys: new Set(),
      orderPlatforms: [],
      orderCatalog: [],
      orderMonthsSignature: '',
      orderYearControlsSignature: '',
      orderActiveFiltersSignature: '',
      orderPlatformsRenderSignature: '',
      orderSkuTreeSignature: '',
      orderDataVersion: 0,
      orderFilteredCache: {
        dataVersion: -1,
        filterSignature: '',
        rows: []
      },
      orderTableRenderSignature: '',
      orderLoading: false,
      orderLoadPromise: null,
      orderLoadGeneration: 0,
      orderLoadedAll: false,
      orderNextMonthIndex: 0,
      orderNextWindowOffset: 0,
      orderRenderLimit: 80,
      orderScrollPending: false,
      orderCatalogLoaded: false,
      orderCatalogPromise: null,
      orderFilters: {
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
      loadedAt: 0,
      rows: [],
      customPlatforms: [],
      loading: false,
      requestToken: 0
    },
    home: {
      timeframe: '24h',
      metric: 'views',
      c4Metric: 'revenue',
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
    accounting: {
      month: getMonthKeyForTimezone(new Date(), DASHBOARD_TIMEZONE),
      range: 'this_month',
      mode: 'expense_paid',
      insightTab: 'category',
      data: null,
      summary: null,
      bills: [],
      transactions: [],
      reviewQueue: [],
      accounts: [],
      categories: [],
      counterparties: [],
      loadedAt: 0,
      requestToken: 0,
      lookupsLoaded: false
    },
    liveSequence: -1,
    liveSource: null
  };

  const endpoint = root.dataset.analyticsEndpoint || './analytics.php';
  const liveEndpoint = root.dataset.liveEndpoint || './live/';
  const settingsEndpoint = root.dataset.settingsEndpoint || './settings/';
  const salesEndpoint = root.dataset.salesEndpoint || './sales/';
  const accountingEndpoint = root.dataset.accountingEndpoint || './accounting/';
  const skuCatalogEndpoint = root.dataset.skuCatalogEndpoint || `${salesEndpoint}?action=sku_catalog`;

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
    platformCanvas: document.querySelector('[data-overview-platform-chart]'),
    trendTitle: document.querySelector('[data-overview-trend-title]'),
    trendMeta: document.querySelector('[data-overview-trend-meta]'),
    lastUpdated: document.querySelector('[data-overview-last-updated]'),
    tableBody: document.querySelector('[data-overview-table-body]'),
    notes: document.querySelector('[data-overview-notes]'),
    yearControls: document.querySelector('[data-overview-year-controls]'),
    salesRecap: document.querySelector('[data-sales-recap]'),
    salesRecapTitle: document.querySelector('[data-sales-recap-title]'),
    salesRecapMeta: document.querySelector('[data-sales-recap-meta]'),
    salesRecapHead: document.querySelector('[data-sales-recap-head]'),
    salesRecapBody: document.querySelector('[data-sales-recap-body]'),
    salesRecapClose: document.querySelector('[data-sales-recap-close]'),
    metricButtons: document.querySelectorAll('[data-overview-metric]'),
    volumeMetricButtons: document.querySelectorAll('[data-overview-volume-metric]'),
    platformMetricButtons: document.querySelectorAll('[data-overview-platform-metric]'),
    ordersTableBody: document.querySelector('[data-orders-table-body]'),
    ordersScroll: document.querySelector('[data-orders-scroll]'),
    ordersStatus: document.querySelector('[data-orders-status]'),
    ordersFilterOpen: document.querySelector('[data-orders-filter-open]'),
    ordersFilterReset: document.querySelector('[data-orders-filter-reset]'),
    ordersActiveFilters: document.querySelector('[data-orders-active-filters]'),
    ordersFilterModal: document.querySelector('[data-orders-filter-modal]'),
    ordersFilterCloseButtons: document.querySelectorAll('[data-orders-filter-close]'),
    ordersFilterClear: document.querySelector('[data-orders-filter-clear]'),
    ordersCompanyTree: document.querySelector('[data-orders-company-tree]'),
    ordersPlatforms: document.querySelector('[data-orders-platforms]'),
    ordersStartDate: document.querySelector('[data-orders-start-date]'),
    ordersEndDate: document.querySelector('[data-orders-end-date]')
  };

  const dailyRefs = {
    monthInput: document.querySelector('[data-daily-month]'),
    status: document.querySelector('[data-daily-status]'),
    exportButton: document.querySelector('[data-daily-export]'),
    totalQty: document.querySelector('[data-daily-total-qty]'),
    totalRevenue: document.querySelector('[data-daily-total-revenue]'),
    avgQty: document.querySelector('[data-daily-avg-qty]'),
    avgRevenue: document.querySelector('[data-daily-avg-revenue]'),
    platformCount: document.querySelector('[data-daily-platform-count]'),
    topDay: document.querySelector('[data-daily-top-day]'),
    platformSummary: document.querySelector('[data-daily-platform-summary]'),
    dayTableBody: document.querySelector('[data-daily-day-table-body]'),
    platformForm: document.querySelector('[data-daily-platform-form]'),
    platformName: document.querySelector('[data-daily-platform-name]'),
    platformList: document.querySelector('[data-daily-platform-list]')
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
    hourTitle: document.querySelector('[data-home-hour-title]'),
    hourMeta: document.querySelector('[data-home-hour-meta]'),
    c4MetricButtons: document.querySelectorAll('[data-c4-metric]'),
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
    summaryPaidOrders: document.querySelector('[data-website-summary-paid-orders]'),
    summaryPaidQty: document.querySelector('[data-website-summary-paid-qty]'),
    summaryPaidRevenue: document.querySelector('[data-website-summary-paid-revenue]'),
    salesMeta: document.querySelector('[data-website-sales-meta]'),
    excludedCount: document.querySelector('[data-website-excluded-ip-count]'),
    productTableBody: document.querySelector('[data-website-product-table-body]'),
    discountSummary: document.querySelector('[data-website-discount-summary]'),
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

  const accountingRefs = {
    view: document.querySelector('[data-accounting-view]'),
    status: document.querySelector('[data-accounting-status]'),
    refresh: document.querySelector('[data-accounting-refresh]'),
    monthInput: document.querySelector('[data-accounting-month-select]'),
    dateFrom: document.querySelector('[data-accounting-date-from]'),
    dateTo: document.querySelector('[data-accounting-date-to]'),
    rangeButtons: document.querySelectorAll('[data-accounting-range]'),
    openModeButtons: document.querySelectorAll('[data-accounting-open-mode]'),
    exportButton: document.querySelector('[data-accounting-export]'),
    settingsButton: document.querySelector('[data-accounting-settings]'),
    kpis: {
      realCash: document.querySelector('[data-accounting-kpi="real-cash"]'),
      marketplaceOutstanding: document.querySelector('[data-accounting-kpi="marketplace-outstanding"]'),
      billsDue: document.querySelector('[data-accounting-kpi="bills-due"]'),
      overdue: document.querySelector('[data-accounting-kpi="overdue"]'),
      expenses: document.querySelector('[data-accounting-kpi="expenses"]'),
      safeCash: document.querySelector('[data-accounting-kpi="safe-cash"]'),
      pendingReview: document.querySelector('[data-accounting-kpi="pending-review"]')
    },
    safeCashCard: document.querySelector('[data-accounting-safe-cash-card]'),
    alerts: document.querySelector('[data-accounting-alerts]'),
    form: document.querySelector('[data-accounting-form]'),
    formStatus: document.querySelector('[data-accounting-form-status]'),
    formError: document.querySelector('[data-accounting-form-error]'),
    modeButtons: document.querySelectorAll('[data-accounting-quick-mode]'),
    modeField: document.querySelector('[data-accounting-mode-field]'),
    modeHelper: document.querySelector('[data-accounting-mode-helper]'),
    marketplaceWarning: document.querySelector('[data-accounting-marketplace-warning]'),
    dateInput: document.querySelector('[data-accounting-date]'),
    issueDateInput: document.querySelector('[data-accounting-issue-date]'),
    amountInput: document.querySelector('[data-accounting-amount]'),
    accountSelect: document.querySelector('[data-accounting-account-select]'),
    toAccountSelect: document.querySelector('[data-accounting-to-account-select]'),
    categorySelect: document.querySelector('[data-accounting-category-select]'),
    counterpartyInput: document.querySelector('[data-accounting-counterparty-input]'),
    counterpartyOptions: document.querySelector('[data-accounting-counterparty-options]'),
    billSelect: document.querySelector('[data-accounting-bill-select]'),
    brandSelect: document.querySelector('[data-accounting-brand-select]'),
    channelSelect: document.querySelector('[data-accounting-channel-select]'),
    incomeType: document.querySelector('[data-accounting-income-type]'),
    billsBody: document.querySelector('[data-accounting-bills-body]'),
    transactionsBody: document.querySelector('[data-accounting-transactions-body]'),
    reviewBody: document.querySelector('[data-accounting-review-body]'),
    billsMeta: document.querySelector('[data-accounting-bills-meta]'),
    ledgerMeta: document.querySelector('[data-accounting-ledger-meta]'),
    monthlySummary: document.querySelector('[data-accounting-monthly-summary]'),
    insightTabs: document.querySelectorAll('[data-accounting-insight-tab]'),
    insights: document.querySelector('[data-accounting-insights]'),
    drawer: document.querySelector('[data-accounting-drawer]'),
    drawerCloseButtons: document.querySelectorAll('[data-accounting-drawer-close]'),
    drawerKicker: document.querySelector('[data-accounting-drawer-kicker]'),
    drawerTitle: document.querySelector('[data-accounting-drawer-title]'),
    drawerBody: document.querySelector('[data-accounting-drawer-body]')
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

  const applyTheme = (theme) => {
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
    invalidateThemePalette();
    renderCachedCharts();
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      credentials: 'same-origin',
      cache: options.cache || 'default',
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
    return homeRefs.recentEvents;
  };

  const renderViewError = (view, error) => {
    if (view === 'website') {
      if (websiteRefs.productTableBody) {
        websiteRefs.productTableBody.innerHTML = `<tr><td colspan="4" class="admin-empty">${escapeHtml(`Gagal memuat dashboard: ${error?.message || 'Unknown error'}`)}</td></tr>`;
      }
      if (websiteRefs.salesMeta) {
        websiteRefs.salesMeta.textContent = 'Analytics unavailable';
      }
      return;
    }
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
      daily: 'Daily',
      home: 'Campaigns Dashboard',
      website: 'Official Website Dashboard',
      accounting: 'Accounting',
      'store-ops': 'Ops',
      settings: 'Settings'
    };
    const navSectionByView = {
      overview: 'home',
      daily: '',
      home: 'campaigns',
      website: 'website',
      accounting: 'accounting',
      'store-ops': 'home',
      settings: 'settings'
    };
    if (root) root.dataset.activeView = state.activeView;
    document.body.dataset.activeView = state.activeView;
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
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    return `${salesEndpoint}?${params.toString()}`;
  };

  const dashboardDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: state.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dashboardHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: state.timezone,
    hour: '2-digit',
    hourCycle: 'h23',
    hour12: false
  });

  const getDashboardDateString = (date = new Date()) => {
    const parts = dashboardDateFormatter.formatToParts(date).reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  const getDashboardHour = (date) => {
    const hour = dashboardHourFormatter.format(date);
    return Math.max(0, Math.min(23, Number(hour) || 0));
  };

  const parseSalesOrderDate = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const buildSalesOrdersUrl = (startDate, endDate = startDate, options = {}) => {
    const params = new URLSearchParams({
      action: 'orders',
      start_date: startDate,
      end_date: endDate
    });
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    if (options.lightweight !== false) {
      params.set('lightweight', '1');
    }
    if (options.skipSync) {
      params.set('skip_sync', '1');
    }
    const limit = Number(options.limit || 0);
    if (Number.isFinite(limit) && limit > 0) {
      params.set('limit', String(Math.floor(limit)));
    }
    const offset = Number(options.offset || 0);
    if (Number.isFinite(offset) && offset > 0) {
      params.set('offset', String(Math.floor(offset)));
    }
    return `${salesEndpoint}?${params.toString()}`;
  };

  const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase();

  const orderFiltersSignature = () => {
    const filters = state.overview.orderFilters;
    return [
      filters.companies.join('\u001f'),
      filters.products.join('\u001f'),
      filters.flavors.join('\u001f'),
      filters.platforms.join('\u001f'),
      filters.startDate || '',
      filters.endDate || ''
    ].join('\u001e');
  };

  const createOrderFilterSnapshot = () => {
    const filters = state.overview.orderFilters;
    return {
      companies: new Set(filters.companies.map(normalizeFilterValue).filter(Boolean)),
      products: filters.products.map(normalizeFilterValue).filter(Boolean),
      flavors: new Set(filters.flavors.map(normalizeFilterValue).filter(Boolean)),
      platforms: new Set(filters.platforms.map(normalizeFilterValue).filter(Boolean)),
      startDate: filters.startDate || '',
      endDate: filters.endDate || ''
    };
  };

  const filterMatchesAny = (normalizedItems, normalizedValues) => {
    if (!normalizedItems.length) return true;
    return normalizedValues.some((value) => (
      value && normalizedItems.some((item) => value === item || value.includes(item))
    ));
  };

  const uniqueOrderKey = (row) => [
    row.platform || '',
    row.account_key || '',
    row.order_id || '',
    row.order_row_id || '',
    row.item_row_id || ''
  ].join('|');

  const enrichOrderRow = (row) => {
    const orderedAt = parseSalesOrderDate(row.order_create_time || row.timestamp || row.ordered_at);
    const enriched = {
      ...row,
      _orderKey: uniqueOrderKey(row),
      _orderTimestamp: orderedAt?.getTime() || 0,
      _orderDateString: orderedAt ? getDashboardDateString(orderedAt) : '',
      _companyKey: normalizeFilterValue(row.company || ''),
      _flavorKey: normalizeFilterValue(row.flavor || ''),
      _platformKey: normalizeFilterValue(row.platform || ''),
      _productSearchValues: [
        row.product_type || '',
        row.product_name || '',
        row.sku || ''
      ].map(normalizeFilterValue).filter(Boolean)
    };
    return enriched;
  };

  const monthRange = (year, month) => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(year, month, 0));
    return {
      year,
      month,
      start,
      end: endDate.toISOString().slice(0, 10)
    };
  };

  const deriveOrderMonths = (years, months) => {
    const seen = new Set();
    const ranges = [];
    const now = new Date();
    const availableYears = (Array.isArray(years) && years.length ? years : [state.overview.year])
      .map((yearValue) => Number(yearValue))
      .filter((year) => Number.isFinite(year));

    (Array.isArray(months) ? months : []).forEach((item) => {
      const year = Number(item.year || state.overview.year);
      const month = Number(item.month || 0);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return;
      const key = `${year}-${month}`;
      if (seen.has(key)) return;
      seen.add(key);
      ranges.push(monthRange(year, month));
    });

    availableYears.forEach((year) => {
      const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
      for (let month = maxMonth; month >= 1; month -= 1) {
        const key = `${year}-${month}`;
        if (seen.has(key)) continue;
        seen.add(key);
        ranges.push(monthRange(year, month));
      }
    });

    return ranges.sort((left, right) => (
      right.year === left.year ? right.month - left.month : right.year - left.year
    ));
  };

  const orderDateString = (row) => {
    if (typeof row._orderDateString === 'string') return row._orderDateString;
    const parsed = parseSalesOrderDate(row.order_create_time || row.timestamp || row.ordered_at);
    return parsed ? getDashboardDateString(parsed) : '';
  };

  const orderMatchesFilters = (row, filters) => {
    const rowDate = orderDateString(row);
    if (filters.startDate && rowDate && rowDate < filters.startDate) return false;
    if (filters.endDate && rowDate && rowDate > filters.endDate) return false;
    return (
      (!filters.companies.size || filters.companies.has(row._companyKey || normalizeFilterValue(row.company || ''))) &&
      filterMatchesAny(
        filters.products,
        row._productSearchValues || [row.product_type || '', row.product_name || '', row.sku || ''].map(normalizeFilterValue).filter(Boolean)
      ) &&
      (!filters.flavors.size || filters.flavors.has(row._flavorKey || normalizeFilterValue(row.flavor || ''))) &&
      (!filters.platforms.size || filters.platforms.has(row._platformKey || normalizeFilterValue(row.platform || '')))
    );
  };

  const filteredOrderRows = () => {
    const filterSignature = orderFiltersSignature();
    const cache = state.overview.orderFilteredCache;
    if (
      cache.dataVersion === state.overview.orderDataVersion &&
      cache.filterSignature === filterSignature
    ) {
      return cache.rows;
    }

    const filters = hasOrderFilters() ? createOrderFilterSnapshot() : null;
    const rows = filters
      ? state.overview.orders.filter((row) => orderMatchesFilters(row, filters))
      : state.overview.orders;
    state.overview.orderFilteredCache = {
      dataVersion: state.overview.orderDataVersion,
      filterSignature,
      rows
    };
    return rows;
  };

  const hasOrderFilters = () => {
    const filters = state.overview.orderFilters;
    return Boolean(
      filters.companies.length ||
      filters.products.length ||
      filters.flavors.length ||
      filters.platforms.length ||
      filters.startDate ||
      filters.endDate
    );
  };

  const addUniqueFilter = (kind, value) => {
    const normalized = String(value || '').trim();
    if (!normalized || !Array.isArray(state.overview.orderFilters[kind])) return;
    if (!state.overview.orderFilters[kind].some((item) => normalizeFilterValue(item) === normalizeFilterValue(normalized))) {
      state.overview.orderFilters[kind].push(normalized);
    }
  };

  const removeOrderFilter = (kind, value = '') => {
    if (kind === 'startDate' || kind === 'endDate') {
      state.overview.orderFilters[kind] = '';
    } else if (Array.isArray(state.overview.orderFilters[kind])) {
      state.overview.orderFilters[kind] = state.overview.orderFilters[kind].filter((item) => normalizeFilterValue(item) !== normalizeFilterValue(value));
    }
    syncOrderFilterControls();
    renderOrders();
    ensureEnoughOrderRows();
  };

  const clearOrderFilters = () => {
    state.overview.orderFilters = {
      companies: [],
      products: [],
      flavors: [],
      platforms: [],
      startDate: '',
      endDate: ''
    };
    syncOrderFilterControls();
    renderOrders();
  };

  const buildSettingsUrl = (action, options = {}) => {
    const params = new URLSearchParams({ action });
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    return `${settingsEndpoint}?${params.toString()}`;
  };

  const buildAccountingUrl = (action, options = {}) => {
    const params = new URLSearchParams({
      action,
      month: options.month || state.accounting.month
    });
    ['date_from', 'date_to', 'status', 'search', 'include_voided'].forEach((key) => {
      if (options[key]) params.set(key, options[key]);
    });
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    return `${accountingEndpoint}?${params.toString()}`;
  };

  const accountingMonthRange = (monthKey = state.accounting.month) => {
    const range = parseDailyMonth(monthKey);
    return { start: range.start, end: range.end, year: range.year, month: range.month };
  };

  const accountingLastMonth = () => {
    const range = parseDailyMonth(state.accounting.month);
    const date = new Date(Date.UTC(range.year, range.month - 2, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const accountingRangeOptions = () => {
    const range = accountingMonthRange(state.accounting.month);
    if (state.accounting.range === 'last_month') {
      const lastMonth = accountingLastMonth();
      const last = accountingMonthRange(lastMonth);
      return { month: lastMonth, date_from: last.start, date_to: last.end };
    }
    if (state.accounting.range === 'ytd') {
      return { month: state.accounting.month, date_from: `${range.year}-01-01`, date_to: range.end };
    }
    if (state.accounting.range === 'custom') {
      return {
        month: state.accounting.month,
        date_from: accountingRefs.dateFrom?.value || '',
        date_to: accountingRefs.dateTo?.value || ''
      };
    }
    return { month: state.accounting.month, date_from: '', date_to: '' };
  };

  const accountingEndpointOptions = (extra = {}) => ({
    ...accountingRangeOptions(),
    ...extra
  });

  const normalizeAccountingAmountInput = (value) => {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    return digits ? formatCurrency(Number(digits)) : '';
  };

  const accountingRawAmount = (value) => String(value || '').replace(/[^0-9]/g, '');

  const accountingStatusClass = (status) => `admin-accounting-chip admin-accounting-chip-${String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const accountingModeConfig = {
    expense_paid: {
      helper: 'Use this when money already left the business.',
      action: 'create_transaction',
      type: 'expense',
      direction: 'money_out',
      shown: ['transaction_date', 'account_id', 'category_id', 'counterparty']
    },
    bill_received: {
      helper: 'Use this when we owe money but have not paid yet.',
      action: 'create_bill',
      shown: ['issue_date', 'due_date', 'category_id', 'counterparty', 'bill_no']
    },
    pay_bill: {
      helper: 'Use this when paying a bill already saved below.',
      action: 'mark_bill_paid',
      shown: ['transaction_date', 'bill_id', 'account_id']
    },
    transfer: {
      helper: 'Use this for wallet payout, bank transfer, cash deposit, or moving money. This does not count as income or expense.',
      action: 'create_transaction',
      type: 'transfer',
      direction: 'internal_transfer',
      shown: ['transaction_date', 'account_id', 'to_account_id', 'transfer_fee_amount']
    },
    manual_income: {
      helper: 'Use only for non-marketplace income, owner injection, refund, reimbursement, or offline/manual customer payment.',
      action: 'create_transaction',
      type: 'manual_income',
      direction: 'money_in',
      shown: ['transaction_date', 'account_id', 'category_id', 'counterparty', 'income_type'],
      warning: true
    }
  };

  const setAccountingFormError = (message = '') => {
    if (!accountingRefs.formError) return;
    accountingRefs.formError.hidden = !message;
    accountingRefs.formError.textContent = message;
  };

  const setAccountingMode = (mode) => {
    const nextMode = accountingModeConfig[mode] ? mode : 'expense_paid';
    state.accounting.mode = nextMode;
    const config = accountingModeConfig[nextMode];
    if (accountingRefs.modeField) accountingRefs.modeField.value = nextMode;
    if (accountingRefs.modeHelper) accountingRefs.modeHelper.textContent = config.helper;
    if (accountingRefs.marketplaceWarning) accountingRefs.marketplaceWarning.hidden = !config.warning;
    accountingRefs.modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.accountingQuickMode === nextMode);
    });
    accountingRefs.openModeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.accountingOpenMode === nextMode);
    });
    document.querySelectorAll('[data-accounting-field]').forEach((field) => {
      const key = field.getAttribute('data-accounting-field') || '';
      field.hidden = !config.shown.includes(key);
      field.querySelectorAll('input, select, textarea').forEach((input) => {
        if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) return;
        input.required = !field.hidden && ['amount', 'account_id', 'category_id', 'counterparty', 'bill_id', 'issue_date', 'due_date'].includes(key) && !(nextMode === 'transfer' && key === 'category_id');
      });
    });
    if (accountingRefs.accountSelect) {
      const label = accountingRefs.accountSelect.closest('label')?.querySelector('span');
      if (label) {
        label.textContent = nextMode === 'manual_income'
          ? 'Received Into Account'
          : (nextMode === 'transfer' ? 'From Account' : 'Paid From Account');
      }
    }
    if (accountingRefs.counterpartyInput) {
      accountingRefs.counterpartyInput.placeholder = nextMode === 'manual_income' ? 'Source / customer' : 'Search or quick-create';
    }
    setAccountingFormError('');
  };

  const accountingOption = (value, label, selected = false) => (
    `<option value="${escapeHtml(String(value))}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`
  );

  const renderAccountingLookupOptions = () => {
    const accounts = state.accounting.accounts;
    const categories = state.accounting.categories.filter((item) => item.parent_id !== null || item.is_billable);
    const openBills = state.accounting.bills.filter((bill) => ['unpaid', 'partially_paid', 'overdue'].includes(String(bill.status || '')));
    const accountOptions = [
      accountingOption('', 'Choose account'),
      ...accounts.map((account) => accountingOption(account.id, `${account.name}${account.is_spendable ? '' : ' (not spendable)'}`))
    ].join('');
    if (accountingRefs.accountSelect) accountingRefs.accountSelect.innerHTML = accountOptions;
    if (accountingRefs.toAccountSelect) accountingRefs.toAccountSelect.innerHTML = accountOptions;

    if (accountingRefs.categorySelect) {
      accountingRefs.categorySelect.innerHTML = [
        accountingOption('', 'Choose category'),
        ...categories.map((category) => accountingOption(category.id, category.parent_name ? `${category.parent_name} - ${category.name}` : category.name))
      ].join('');
    }
    if (accountingRefs.billSelect) {
      accountingRefs.billSelect.innerHTML = [
        accountingOption('', 'Choose bill'),
        ...openBills.map((bill) => accountingOption(bill.id, `${bill.vendor_name || 'Vendor'} - ${bill.bill_no || bill.bill_key} - ${formatCurrency(bill.outstanding_amount || 0)}`))
      ].join('');
    }
    if (accountingRefs.counterpartyOptions) {
      accountingRefs.counterpartyOptions.innerHTML = state.accounting.counterparties
        .map((item) => `<option value="${escapeHtml(item.name || '')}"></option>`)
        .join('');
    }
  };

  const resetAccountingForm = () => {
    accountingRefs.form?.reset();
    const today = getDashboardDateString();
    if (accountingRefs.dateInput) accountingRefs.dateInput.value = today;
    if (accountingRefs.issueDateInput) accountingRefs.issueDateInput.value = today;
    if (accountingRefs.amountInput) accountingRefs.amountInput.value = '';
    if (accountingRefs.brandSelect) accountingRefs.brandSelect.value = 'General / Shared';
    if (accountingRefs.channelSelect) accountingRefs.channelSelect.value = 'Internal';
    renderAccountingLookupOptions();
    setAccountingMode(state.accounting.mode);
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
    if (view === 'daily') return Boolean(state.daily.data) && isFresh(state.daily.loadedAt, VIEW_CACHE_TTL_MS.daily);
    if (view === 'home') return Boolean(state.home.data) && isFresh(state.home.loadedAt, VIEW_CACHE_TTL_MS.home);
    if (view === 'website') {
      if (state.website.screen !== 'detail' || !state.website.site) return true;
      return Boolean(state.website.data) && isFresh(state.website.loadedAt, VIEW_CACHE_TTL_MS.website);
    }
    if (view === 'accounting') return Boolean(state.accounting.summary) && isFresh(state.accounting.loadedAt, VIEW_CACHE_TTL_MS.accounting);
    if (view === 'settings') return isFresh(state.website.settingsLoadedAt, VIEW_CACHE_TTL_MS.settings);
    return true;
  };

  const topPlatformForMonth = (month) => {
    const entries = Object.entries(month?.platforms || {});
    if (!entries.length) return 'No platform data';
    entries.sort((left, right) => Number(right[1]?.sales || 0) - Number(left[1]?.sales || 0));
    return entries[0] ? `${toTitleCase(entries[0][0])} • ${formatCurrency(entries[0][1]?.sales || 0)}` : 'No platform data';
  };

  const buildTodaySalesByHour = (ordersPayload, salesDate) => {
    const hourOfDay = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: 0,
      gross_profit: 0,
      net_revenue: 0,
      gross_revenue: 0,
      marketplace_fees: 0,
      orders: 0,
      item_count: 0
    }));
    const orderIdsByHour = Array.from({ length: 24 }, () => new Set());
    const rows = Array.isArray(ordersPayload?.orders) ? ordersPayload.orders : [];
    let totalRevenue = 0;
    let totalGrossProfit = 0;
    let totalItems = 0;

    rows.forEach((row) => {
      const orderedAt = parseSalesOrderDate(row.order_create_time || row.timestamp || row.ordered_at);
      if (!orderedAt || getDashboardDateString(orderedAt) !== salesDate) return;
      const hour = getDashboardHour(orderedAt);
      const revenue = Number(row.revenue || row.net_revenue || 0);
      const marketplaceFees = Number(row.marketplace_fees || 0);
      const grossRevenue = Number(row.gross_revenue || row.order_gross_revenue || (revenue + marketplaceFees) || 0);
      const grossProfit = Number(row.gross_profit || row.profit || row.net_profit || revenue || 0);
      const quantity = Number(row.quantity || 0);
      const orderKey = [
        row.platform || 'unknown',
        row.account_key || 'unknown',
        row.order_id || row.order_row_id || ''
      ].join('|');

      hourOfDay[hour].revenue += revenue;
      hourOfDay[hour].net_revenue += revenue;
      hourOfDay[hour].gross_revenue += grossRevenue;
      hourOfDay[hour].gross_profit += grossProfit;
      hourOfDay[hour].marketplace_fees += marketplaceFees;
      hourOfDay[hour].item_count += quantity;
      totalRevenue += revenue;
      totalGrossProfit += grossProfit;
      totalItems += quantity;
      if (orderKey.trim() !== 'unknown|unknown|') {
        orderIdsByHour[hour].add(orderKey);
      }
    });

    let totalOrders = 0;
    orderIdsByHour.forEach((orderSet, hour) => {
      hourOfDay[hour].orders = orderSet.size;
      totalOrders += orderSet.size;
    });

    return {
      date: salesDate,
      error: ordersPayload?.ok === false ? (ordersPayload.error || 'sales_orders_unavailable') : '',
      hour_of_day: hourOfDay,
      totals: {
        revenue: totalRevenue,
        net_revenue: totalRevenue,
        gross_profit: totalGrossProfit,
        orders: totalOrders,
        item_count: totalItems
      }
    };
  };

  const platformLabel = (value) => toTitleCase(String(value || 'unknown').replace(/[-_]/g, ' '));

  const dailyPlatformKey = (value) => normalizeFilterValue(value || 'unknown').replace(/\s+/g, '_') || 'unknown';

  const dailyTextTone = (index) => ['daily-text-green', 'daily-text-blue', 'daily-text-yellow', 'daily-text-red', 'daily-text-muted'][index % 5];

  const parseDailyMonth = (value) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      const current = getMonthKeyForTimezone(new Date(), state.timezone);
      return parseDailyMonth(current);
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return parseDailyMonth(getMonthKeyForTimezone(new Date(), state.timezone));
    }
    return monthRange(year, month);
  };

  const formatDailyMonthLabel = (monthKey) => {
    const range = parseDailyMonth(monthKey);
    return new Date(Date.UTC(range.year, range.month - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const readDailyCustomPlatforms = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(DAILY_CUSTOM_PLATFORMS_STORAGE_KEY) || '[]');
      return (Array.isArray(parsed) ? parsed : [])
        .map((name) => String(name || '').trim())
        .filter(Boolean)
        .filter((name, index, items) => items.findIndex((item) => dailyPlatformKey(item) === dailyPlatformKey(name)) === index)
        .slice(0, 24);
    } catch (_) {
      return [];
    }
  };

  const persistDailyCustomPlatforms = () => {
    window.localStorage.setItem(
      DAILY_CUSTOM_PLATFORMS_STORAGE_KEY,
      JSON.stringify(state.daily.customPlatforms.slice(0, 24))
    );
  };

  state.daily.customPlatforms = readDailyCustomPlatforms();

  const buildDailyPlatformList = (rows) => {
    const platformMap = new Map();
    state.daily.customPlatforms.forEach((name) => {
      const key = dailyPlatformKey(name);
      platformMap.set(key, {
        key,
        label: platformLabel(name),
        custom: true,
        qty: 0,
        revenue: 0,
        daysActive: 0
      });
    });
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const raw = String(row.platform || 'unknown').trim() || 'unknown';
      const key = dailyPlatformKey(raw);
      if (!platformMap.has(key)) {
        platformMap.set(key, {
          key,
          label: platformLabel(raw),
          custom: false,
          qty: 0,
          revenue: 0,
          daysActive: 0
        });
      }
    });
    return platformMap;
  };

  const aggregateDailyData = (rows, monthKey) => {
    const range = parseDailyMonth(monthKey);
    const startDate = new Date(`${range.start}T00:00:00Z`);
    const dayCount = new Date(Date.UTC(range.year, range.month, 0)).getUTCDate();
    const platformMap = buildDailyPlatformList(rows);
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(index + 1);
      const dateKey = date.toISOString().slice(0, 10);
      return {
        date: dateKey,
        label: date.toLocaleDateString('en-US', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          timeZone: 'UTC'
        }),
        qty: 0,
        revenue: 0,
        orders: new Set(),
        platforms: new Map()
      };
    });
    const dayMap = new Map(days.map((day) => [day.date, day]));

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const date = orderDateString(row);
      const day = dayMap.get(date);
      if (!day) return;
      const rawPlatform = String(row.platform || 'unknown').trim() || 'unknown';
      const platformKey = dailyPlatformKey(rawPlatform);
      const quantity = Math.max(0, Number(row.quantity || row.order_item_count || 0));
      const revenue = Number(row.revenue || row.net_revenue || row.sales || row.gross_revenue || 0);
      const orderKey = [
        rawPlatform,
        row.account_key || '',
        row.order_id || row.order_row_id || '',
        row.item_row_id || ''
      ].join('|');

      if (!platformMap.has(platformKey)) {
        platformMap.set(platformKey, {
          key: platformKey,
          label: platformLabel(rawPlatform),
          custom: false,
          qty: 0,
          revenue: 0,
          daysActive: 0
        });
      }
      if (!day.platforms.has(platformKey)) {
        day.platforms.set(platformKey, {
          key: platformKey,
          label: platformLabel(rawPlatform),
          qty: 0,
          revenue: 0,
          orders: new Set()
        });
      }
      const platformDay = day.platforms.get(platformKey);
      const platformTotal = platformMap.get(platformKey);

      day.qty += quantity;
      day.revenue += revenue;
      platformDay.qty += quantity;
      platformDay.revenue += revenue;
      platformTotal.qty += quantity;
      platformTotal.revenue += revenue;
      if (orderKey.trim() !== '|||') {
        day.orders.add(orderKey);
        platformDay.orders.add(orderKey);
      }
    });

    days.forEach((day) => {
      day.platforms.forEach((platformDay) => {
        const platformTotal = platformMap.get(platformDay.key);
        if (platformTotal && (platformDay.qty > 0 || platformDay.revenue > 0)) {
          platformTotal.daysActive += 1;
        }
        platformDay.orders = platformDay.orders.size;
      });
      day.orders = day.orders.size;
      day.platforms = Array.from(day.platforms.values())
        .sort((left, right) => right.revenue - left.revenue || right.qty - left.qty || left.label.localeCompare(right.label));
    });

    const platforms = Array.from(platformMap.values())
      .sort((left, right) => right.revenue - left.revenue || right.qty - left.qty || left.label.localeCompare(right.label))
      .map((platform, index) => ({
        ...platform,
        tone: dailyTextTone(index),
        avgQty: platform.qty / dayCount,
        avgRevenue: platform.revenue / dayCount
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
      platforms,
      totals: {
        qty: totalQty,
        revenue: totalRevenue,
        avgQty: totalQty / dayCount,
        avgRevenue: totalRevenue / dayCount,
        platformCount: platforms.length,
        activeDayCount: days.filter((day) => day.qty > 0 || day.revenue > 0).length,
        topDay
      }
    };
  };

  const renderDailyPlatformList = () => {
    if (!dailyRefs.platformList) return;
    const custom = state.daily.customPlatforms;
    if (!custom.length) {
      dailyRefs.platformList.innerHTML = '<p class="admin-empty">No manual platform placeholders.</p>';
      return;
    }
    dailyRefs.platformList.innerHTML = custom.map((name) => `
      <button type="button" class="daily-platform-chip" data-daily-remove-platform="${escapeHtml(name)}">
        <span>${escapeHtml(platformLabel(name))}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    `).join('');
  };

  const renderDailyPlatformSummary = (dailyData) => {
    if (!dailyRefs.platformSummary) return;
    if (!dailyData.platforms.length) {
      dailyRefs.platformSummary.innerHTML = '<p class="admin-empty">No platforms found for this month.</p>';
      return;
    }
    dailyRefs.platformSummary.innerHTML = dailyData.platforms.map((platform) => `
      <div class="daily-platform-row">
        <div class="daily-platform-name">
          <strong class="${escapeHtml(platform.tone)}">${escapeHtml(platform.label)}</strong>
          <small>${platform.custom ? 'Manual placeholder' : `${platform.daysActive.toLocaleString('id-ID')} active days`}</small>
        </div>
        <span><small>Qty</small><b class="daily-text-green">${Number(platform.qty || 0).toLocaleString('id-ID')}</b></span>
        <span><small>Rp</small><b class="daily-text-blue">${formatCurrency(platform.revenue || 0)}</b></span>
        <span><small>Avg Qty</small><b class="daily-text-yellow">${Number(platform.avgQty || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}</b></span>
        <span><small>Avg Rp</small><b class="daily-text-red">${formatCurrency(platform.avgRevenue || 0)}</b></span>
      </div>
    `).join('');
  };

  const renderDailyRows = (dailyData) => {
    if (!dailyRefs.dayTableBody) return;
    if (!dailyData.days.length) {
      dailyRefs.dayTableBody.innerHTML = '<tr><td colspan="4" class="admin-empty">No days available.</td></tr>';
      return;
    }
    dailyRefs.dayTableBody.innerHTML = dailyData.days.map((day) => {
      const platformHtml = day.platforms.length
        ? day.platforms.map((platform) => `
          <span class="daily-breakdown-item">
            <strong>${escapeHtml(platform.label)}</strong>
            <b class="daily-text-green">${Number(platform.qty || 0).toLocaleString('id-ID')} qty</b>
            <b class="daily-text-blue">${formatCurrency(platform.revenue || 0)}</b>
          </span>
        `).join('')
        : '<span class="daily-breakdown-empty">No platform sales</span>';
      return `
        <tr>
          <td><strong>${escapeHtml(day.label)}</strong><small class="admin-table-note">${escapeHtml(day.date)}</small></td>
          <td><strong class="daily-text-green">${Number(day.qty || 0).toLocaleString('id-ID')}</strong></td>
          <td><strong class="daily-text-blue">${formatCurrency(day.revenue || 0)}</strong></td>
          <td><div class="daily-breakdown-list">${platformHtml}</div></td>
        </tr>
      `;
    }).join('');
  };

  const renderDaily = (dailyData) => {
    state.daily.data = dailyData;
    if (dailyRefs.monthInput) dailyRefs.monthInput.value = dailyData.month;
    if (dailyRefs.totalQty) dailyRefs.totalQty.textContent = Number(dailyData.totals.qty || 0).toLocaleString('id-ID');
    if (dailyRefs.totalRevenue) dailyRefs.totalRevenue.textContent = formatCurrency(dailyData.totals.revenue || 0);
    if (dailyRefs.avgQty) dailyRefs.avgQty.textContent = Number(dailyData.totals.avgQty || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    if (dailyRefs.avgRevenue) dailyRefs.avgRevenue.textContent = formatCurrency(dailyData.totals.avgRevenue || 0);
    if (dailyRefs.platformCount) dailyRefs.platformCount.textContent = Number(dailyData.totals.platformCount || 0).toLocaleString('id-ID');
    if (dailyRefs.topDay) {
      const topDay = dailyData.totals.topDay;
      dailyRefs.topDay.textContent = topDay && topDay.revenue > 0
        ? `${topDay.label} • ${formatCurrency(topDay.revenue)}`
        : '-';
    }
    if (dailyRefs.status) {
      dailyRefs.status.textContent = `${dailyData.label} • ${dailyData.rows.length.toLocaleString('id-ID')} order lines • ${dailyData.totals.activeDayCount.toLocaleString('id-ID')} active days`;
    }
    if (dailyRefs.exportButton) {
      dailyRefs.exportButton.disabled = false;
    }
    renderDailyPlatformList();
    renderDailyPlatformSummary(dailyData);
    renderDailyRows(dailyData);
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
    const lines = [
      `Month: ${dailyData.label}`,
      `Date range: ${dailyData.start} to ${dailyData.end}`,
      `Total Qty: ${Number(dailyData.totals.qty || 0).toLocaleString('id-ID')}`,
      `Total Revenue: ${formatCurrency(dailyData.totals.revenue || 0)}`,
      `Average Qty per day: ${Number(dailyData.totals.avgQty || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}`,
      `Average Revenue per day: ${formatCurrency(dailyData.totals.avgRevenue || 0)}`,
      '',
      'Platforms',
      ...dailyData.platforms.map((platform) => `${platform.label}: Qty ${Number(platform.qty || 0).toLocaleString('id-ID')} | Revenue ${formatCurrency(platform.revenue || 0)} | Avg Qty ${Number(platform.avgQty || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} | Avg Rp ${formatCurrency(platform.avgRevenue || 0)}`),
      '',
      'Daily Breakdown',
      ...dailyData.days.map((day) => {
        const platforms = day.platforms.length
          ? day.platforms.map((platform) => `${platform.label} ${Number(platform.qty || 0).toLocaleString('id-ID')} qty ${formatCurrency(platform.revenue || 0)}`).join('; ')
          : 'No platform sales';
        return `${day.date}: Total Qty ${Number(day.qty || 0).toLocaleString('id-ID')} | Total Rp ${formatCurrency(day.revenue || 0)} | ${platforms}`;
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

  const orderRowHtml = (row) => {
    if (row._orderTableHtml) return row._orderTableHtml;
    const date = orderDateString(row) || '-';
    const quantity = Number(row.quantity || row.order_item_count || 0);
    row._orderTableHtml = `
      <tr>
        <td><strong>${escapeHtml(date)}</strong></td>
        <td><strong>${escapeHtml(row.order_id || '-')}</strong><small class="admin-table-note">${escapeHtml(row.status || '')}</small></td>
        <td>${escapeHtml(row.company || '-')}</td>
        <td>${escapeHtml(row.product_type || row.product_name || '-')}</td>
        <td>${escapeHtml(row.flavor || '-')}</td>
        <td>${escapeHtml(platformLabel(row.platform || 'unknown'))}</td>
        <td>${formatCurrency(row.net_revenue || row.revenue || 0)}</td>
        <td>${quantity.toLocaleString('id-ID')}</td>
      </tr>
    `;
    return row._orderTableHtml;
  };

  const renderOrders = () => {
    if (!overviewRefs.ordersTableBody) return;
    const rows = filteredOrderRows();
    const visibleRows = rows.slice(0, state.overview.orderRenderLimit);
    const active = hasOrderFilters();

    if (overviewRefs.ordersFilterReset) {
      overviewRefs.ordersFilterReset.hidden = !active;
    }

    renderActiveOrderFilters();
    renderOrderPlatforms();

    if (overviewRefs.ordersStatus) {
      const shown = Math.min(visibleRows.length, rows.length);
      const loadedCount = state.overview.orders.length;
      const loading = state.overview.orderLoading ? 'Loading older orders...' : '';
      overviewRefs.ordersStatus.textContent = loading || `${shown.toLocaleString('id-ID')} shown from ${loadedCount.toLocaleString('id-ID')} loaded order lines${state.overview.orderLoadedAll ? '' : ' as you scroll'}`;
    }

    if (!visibleRows.length) {
      const message = state.overview.orderLoading
        ? 'Loading orders.'
        : (active ? 'No loaded orders match the current filters yet.' : 'No stored orders found.');
      const signature = `empty:${message}`;
      if (state.overview.orderTableRenderSignature !== signature) {
        state.overview.orderTableRenderSignature = signature;
        overviewRefs.ordersTableBody.innerHTML = `<tr><td colspan="8" class="admin-empty">${message}</td></tr>`;
      }
      return;
    }

    const signature = visibleRows.map((row) => row._orderKey).join('\u001f');
    if (state.overview.orderTableRenderSignature === signature) return;
    state.overview.orderTableRenderSignature = signature;
    overviewRefs.ordersTableBody.innerHTML = visibleRows.map(orderRowHtml).join('');
  };

  const renderActiveOrderFilters = () => {
    if (!overviewRefs.ordersActiveFilters) return;
    const signature = orderFiltersSignature();
    if (state.overview.orderActiveFiltersSignature === signature) {
      overviewRefs.ordersActiveFilters.hidden = !hasOrderFilters();
      return;
    }
    state.overview.orderActiveFiltersSignature = signature;
    const filters = state.overview.orderFilters;
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

    overviewRefs.ordersActiveFilters.hidden = !chips.length;
    overviewRefs.ordersActiveFilters.innerHTML = chips.join('');
  };

  const syncOrderFilterControls = () => {
    const filters = state.overview.orderFilters;
    if (overviewRefs.ordersStartDate) overviewRefs.ordersStartDate.value = filters.startDate || '';
    if (overviewRefs.ordersEndDate) overviewRefs.ordersEndDate.value = filters.endDate || '';
    renderSkuFilterTree();
    renderOrderPlatforms();
  };

  const renderSkuFilterTree = () => {
    if (!overviewRefs.ordersCompanyTree) return;
    const catalog = Array.isArray(state.overview.orderCatalog) ? state.overview.orderCatalog : [];
    const catalogSignature = catalog.map((company) => {
      const products = Array.isArray(company.products) ? company.products : [];
      return `${company.id || company.name}:${products.map((product) => {
        const flavors = Array.isArray(product.flavors) ? product.flavors : [];
        return `${product.id || product.name}:${flavors.map((flavor) => flavor.id || flavor.name).join(',')}`;
      }).join(';')}`;
    }).join('|');
    const signature = `${catalogSignature}\u001e${orderFiltersSignature()}\u001e${state.overview.orderCatalogPromise ? 'loading' : 'idle'}`;
    if (state.overview.orderSkuTreeSignature === signature) return;
    state.overview.orderSkuTreeSignature = signature;
    if (!catalog.length) {
      overviewRefs.ordersCompanyTree.innerHTML = state.overview.orderCatalogPromise
        ? '<p class="admin-empty">Loading SKU companies...</p>'
        : '<p class="admin-empty">No SKU companies are available yet.</p>';
      return;
    }

    overviewRefs.ordersCompanyTree.innerHTML = catalog.map((company) => {
      const companySelected = state.overview.orderFilters.companies.some((item) => normalizeFilterValue(item) === normalizeFilterValue(company.name));
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
              const productSelected = state.overview.orderFilters.products.some((item) => normalizeFilterValue(item) === normalizeFilterValue(product.name));
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
                      const flavorSelected = state.overview.orderFilters.flavors.some((item) => normalizeFilterValue(item) === normalizeFilterValue(flavor.name));
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

  const renderOrderPlatforms = () => {
    if (!overviewRefs.ordersPlatforms) return;
    const platforms = Array.from(new Set(state.overview.orderPlatforms.filter(Boolean))).sort();
    const signature = `${platforms.join('\u001f')}\u001e${state.overview.orderFilters.platforms.join('\u001f')}`;
    if (state.overview.orderPlatformsRenderSignature === signature) return;
    state.overview.orderPlatformsRenderSignature = signature;
    if (!platforms.length) {
      overviewRefs.ordersPlatforms.innerHTML = '<p class="admin-empty">Platforms appear after orders load.</p>';
      return;
    }
    overviewRefs.ordersPlatforms.innerHTML = platforms.map((platform) => {
      const selected = state.overview.orderFilters.platforms.some((item) => normalizeFilterValue(item) === normalizeFilterValue(platform));
      return `
        <button type="button" class="admin-orders-platform-choice${selected ? ' is-selected' : ''}" data-toggle-order-platform="${escapeHtml(platform)}">
          ${escapeHtml(platformLabel(platform))}
        </button>
      `;
    }).join('');
  };

  const mergeOrderRows = (rows) => {
    if (!(state.overview.orderKeys instanceof Set)) {
      state.overview.orderKeys = new Set(state.overview.orders.map(uniqueOrderKey));
    }
    const existing = state.overview.orderKeys;
    const incoming = [];
    const platforms = new Set(state.overview.orderPlatforms);
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const key = uniqueOrderKey(row);
      if (existing.has(key)) return;
      existing.add(key);
      incoming.push(enrichOrderRow(row));
      const platform = String(row.platform || '').trim();
      if (platform && !platforms.has(platform)) {
        platforms.add(platform);
        state.overview.orderPlatforms.push(platform);
      }
    });
    if (!incoming.length) return;

    incoming.sort((left, right) => Number(right._orderTimestamp || 0) - Number(left._orderTimestamp || 0));
    if (!state.overview.orders.length) {
      state.overview.orders = incoming;
    } else if (
      Number(state.overview.orders[state.overview.orders.length - 1]._orderTimestamp || 0) >=
      Number(incoming[0]._orderTimestamp || 0)
    ) {
      state.overview.orders = state.overview.orders.concat(incoming);
    } else {
      const merged = [];
      let currentIndex = 0;
      let incomingIndex = 0;
      while (currentIndex < state.overview.orders.length && incomingIndex < incoming.length) {
        const current = state.overview.orders[currentIndex];
        const next = incoming[incomingIndex];
        if (Number(current._orderTimestamp || 0) >= Number(next._orderTimestamp || 0)) {
          merged.push(current);
          currentIndex += 1;
        } else {
          merged.push(next);
          incomingIndex += 1;
        }
      }
      state.overview.orders = merged
        .concat(state.overview.orders.slice(currentIndex))
        .concat(incoming.slice(incomingIndex));
    }
    state.overview.orderDataVersion += 1;
  };

  const loadNextOrderWindow = async () => {
    if (state.overview.orderLoadPromise) return state.overview.orderLoadPromise;
    if (state.overview.orderLoadedAll) return;
    const nextRange = state.overview.orderMonths[state.overview.orderNextMonthIndex];
    if (!nextRange) {
      state.overview.orderLoadedAll = true;
      renderOrders();
      return;
    }
    const generation = state.overview.orderLoadGeneration;
    state.overview.orderLoading = true;
    renderOrders();
    const loadPromise = (async () => {
      try {
        const requestOffset = state.overview.orderNextWindowOffset;
        const payload = await requestJson(buildSalesOrdersUrl(nextRange.start, nextRange.end, {
          limit: ORDER_WINDOW_ROW_LIMIT,
          offset: requestOffset,
          skipSync: true
        }));
        if (generation !== state.overview.orderLoadGeneration) return;
        const rows = Array.isArray(payload.orders) ? payload.orders : [];
        mergeOrderRows(rows);

        const nextOffset = Number(payload.next_offset);
        if (payload.has_more && Number.isFinite(nextOffset) && nextOffset > requestOffset) {
          state.overview.orderNextWindowOffset = nextOffset;
        } else {
          state.overview.orderNextMonthIndex += 1;
          state.overview.orderNextWindowOffset = 0;
          if (state.overview.orderNextMonthIndex >= state.overview.orderMonths.length) {
            state.overview.orderLoadedAll = true;
          }
        }
      } catch (error) {
        if (generation === state.overview.orderLoadGeneration && overviewRefs.ordersStatus) {
          overviewRefs.ordersStatus.textContent = error instanceof Error ? error.message : 'Unable to load orders.';
        }
      } finally {
        if (generation === state.overview.orderLoadGeneration) {
          state.overview.orderLoading = false;
          renderOrders();
        }
        if (state.overview.orderLoadPromise === loadPromise) {
          state.overview.orderLoadPromise = null;
        }
      }
    })();
    state.overview.orderLoadPromise = loadPromise;
    return loadPromise;
  };

  const ensureEnoughOrderRows = async () => {
    let guard = 0;
    while (!state.overview.orderLoadedAll && filteredOrderRows().length < 40 && guard < 4) {
      guard += 1;
      await loadNextOrderWindow();
    }
  };

  const loadOrderCatalog = async () => {
    if (state.overview.orderCatalogLoaded) return;
    if (state.overview.orderCatalogPromise) return state.overview.orderCatalogPromise;
    const catalogPromise = (async () => {
      try {
        const payload = await requestJson(skuCatalogEndpoint);
        state.overview.orderCatalog = Array.isArray(payload.catalog) ? payload.catalog : [];
        state.overview.orderCatalogLoaded = true;
      } catch (_) {
        state.overview.orderCatalog = [];
      } finally {
        if (state.overview.orderCatalogPromise === catalogPromise) {
          state.overview.orderCatalogPromise = null;
        }
        renderSkuFilterTree();
      }
    })();
    state.overview.orderCatalogPromise = catalogPromise;
    return catalogPromise;
  };

  const resetOrderWindowsFromOverview = (years, months) => {
    state.overview.orderMonths = deriveOrderMonths(years, months);
    state.overview.orders = [];
    state.overview.orderKeys = new Set();
    state.overview.orderPlatforms = [];
    state.overview.orderDataVersion += 1;
    state.overview.orderFilteredCache = {
      dataVersion: -1,
      filterSignature: '',
      rows: []
    };
    state.overview.orderTableRenderSignature = '';
    state.overview.orderActiveFiltersSignature = '';
    state.overview.orderPlatformsRenderSignature = '';
    state.overview.orderLoadGeneration += 1;
    state.overview.orderLoading = false;
    state.overview.orderLoadPromise = null;
    state.overview.orderLoadedAll = false;
    state.overview.orderNextMonthIndex = 0;
    state.overview.orderNextWindowOffset = 0;
    state.overview.orderRenderLimit = 80;
    renderOrders();
  };

  const dashboardYearMonth = () => {
    const [year, month] = getMonthKeyForTimezone(new Date(), state.timezone).split('-').map((part) => Number(part));
    return {
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      month: Number.isFinite(month) ? month : new Date().getMonth() + 1
    };
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

  const monthNumberFrom = (row) => {
    const numericMonth = Number(row?.month ?? row?.month_index ?? row?.monthNumber);
    if (Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
      return Math.round(numericMonth);
    }

    const label = String(row?.label || row?.month_label || '').slice(0, 3).toLowerCase();
    const labelIndex = SALES_RECAP_MONTH_LABELS.findIndex((month) => month.toLowerCase() === label);
    return labelIndex >= 0 ? labelIndex + 1 : 0;
  };

  const salesRecapValuesForMonth = (row = {}) => {
    const pcs = optionalNumberFrom(row, ['item_count', 'total_pcs', 'pcs', 'quantity', 'qty', 'units', 'order_item_count']) ?? 0;
    const rev = optionalNumberFrom(row, ['net_revenue', 'sales', 'revenue', 'total_revenue', 'grossRevenue', 'gross_revenue']) ?? 0;
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
      return `${(number * 100).toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      })}%`;
    }
    return Math.round(number).toLocaleString('id-ID');
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

  const setSalesRecapOpen = (isOpen) => {
    state.overview.salesRecapOpen = Boolean(isOpen);
    root.classList.toggle('is-sales-recap-open', state.overview.salesRecapOpen);
    if (overviewRefs.salesRecap) {
      overviewRefs.salesRecap.classList.toggle('is-open', state.overview.salesRecapOpen);
      overviewRefs.salesRecap.setAttribute('aria-hidden', state.overview.salesRecapOpen ? 'false' : 'true');
    }

    const trigger = overviewRefs.yearControls?.querySelector('[data-sales-recap-toggle]');
    if (trigger) {
      trigger.classList.toggle('is-active', state.overview.salesRecapOpen);
      trigger.setAttribute('aria-expanded', state.overview.salesRecapOpen ? 'true' : 'false');
    }
  };

  const renderSalesRecap = (data) => {
    if (!overviewRefs.salesRecapHead || !overviewRefs.salesRecapBody) return;

    const months = Array.isArray(data?.months) ? data.months : [];
    const { year: currentYear, month: currentMonth } = dashboardYearMonth();
    const selectedYear = Number(data?.year || state.overview.year || currentYear);
    const monthMap = new Map();
    months.forEach((row) => {
      const monthNumber = monthNumberFrom(row);
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

    if (overviewRefs.salesRecapTitle) {
      overviewRefs.salesRecapTitle.textContent = `Sales Recap ${selectedYear}`;
    }
    if (overviewRefs.salesRecapMeta) {
      overviewRefs.salesRecapMeta.textContent = selectedYear < currentYear
        ? `${selectedYear} full year`
        : `${selectedYear} YTD through ${lastMonthLabel}`;
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
  };

  const renderOverviewYearControls = (years) => {
    if (!overviewRefs.yearControls) return;
    const signature = `${(Array.isArray(years) ? years : []).join('\u001f')}\u001e${state.overview.year}`;
    if (state.overview.orderYearControlsSignature === signature) return;
    state.overview.orderYearControlsSignature = signature;
    const safeYears = Array.isArray(years) && years.length ? years : [state.overview.year];
    overviewRefs.yearControls.innerHTML = `${safeYears.map((year) => `
      <button type="button" class="admin-toggle-pill${Number(year) === Number(state.overview.year) ? ' is-active' : ''}" data-overview-year="${escapeHtml(String(year))}">${escapeHtml(String(year))}</button>
    `).join('')}
      <button type="button" class="admin-toggle-pill admin-sales-recap-trigger${state.overview.salesRecapOpen ? ' is-active' : ''}" data-sales-recap-toggle aria-expanded="${state.overview.salesRecapOpen ? 'true' : 'false'}">Sales Recap</button>
    `;

    overviewRefs.yearControls.querySelectorAll('[data-overview-year]').forEach((button) => {
      button.addEventListener('click', async () => {
        const nextYear = Number(button.getAttribute('data-overview-year') || state.overview.year);
        if (!Number.isFinite(nextYear) || nextYear === state.overview.year) return;
        state.overview.year = nextYear;
        await loadOverviewSafely({ force: true, preferStale: false });
      });
    });

    overviewRefs.yearControls.querySelector('[data-sales-recap-toggle]')?.addEventListener('click', () => {
      setSalesRecapOpen(!state.overview.salesRecapOpen);
    });
  };

  const renderOverview = (data) => {
    state.overview.data = data;
    const totals = data.totals || {};
    const months = Array.isArray(data.months) ? data.months : [];
    const platforms = Array.isArray(data.platforms) ? data.platforms : [];
    const years = Array.isArray(data.years) ? data.years : [state.overview.year];
    const nextOrderMonths = deriveOrderMonths(years, months);
    const nextOrderMonthsSignature = nextOrderMonths.map((item) => `${item.year}-${item.month}`).join('|');
    const bestMonth = totals.best_month || {};
    const monthlyRows = months.map((month) => ({
      label: month.label || '-',
      sales: Number(month.sales || 0),
      net_revenue: Number(month.net_revenue || month.sales || 0),
      gross_revenue: Number(month.gross_revenue || 0),
      marketplace_fees: Number(month.marketplace_fees || 0),
      orders: Number(month.orders || 0),
      item_count: Number(month.item_count || 0),
      average_order_value: Number(month.orders || 0) > 0 ? Number(month.sales || 0) / Number(month.orders || 0) : 0
    }));

    if (overviewRefs.summarySales) overviewRefs.summarySales.textContent = formatCurrency(totals.sales || 0);
    if (overviewRefs.summaryOrders) overviewRefs.summaryOrders.textContent = Number(totals.orders || 0).toLocaleString('id-ID');
    if (overviewRefs.summaryAov) overviewRefs.summaryAov.textContent = formatCurrency(totals.average_order_value || 0);
    if (overviewRefs.summaryBestMonth) overviewRefs.summaryBestMonth.textContent = bestMonth.label || '-';
    if (overviewRefs.summaryBestMonthMeta) {
      overviewRefs.summaryBestMonthMeta.textContent = bestMonth.sales
        ? `${formatCurrency(bestMonth.sales)} • ${Number(bestMonth.orders || 0).toLocaleString('id-ID')} orders`
        : 'No peak yet';
    }
    if (overviewRefs.yearSummary) {
      overviewRefs.yearSummary.textContent = `${years[0]} to ${years[years.length - 1]}`;
    }
    if (overviewRefs.endpointLabel) overviewRefs.endpointLabel.textContent = salesEndpoint;
    if (overviewRefs.trendTitle) overviewRefs.trendTitle.textContent = OVERVIEW_METRIC_LABELS[state.overview.metric];
    if (overviewRefs.trendMeta) {
      overviewRefs.trendMeta.textContent = `${state.overview.year} • Net ${formatCurrency(totals.net_revenue || totals.sales || 0)} • Gross ${formatCurrency(totals.gross_revenue || 0)}`;
    }

    if (overviewRefs.notes) {
      overviewRefs.notes.innerHTML = `
        <div class="admin-note-card"><strong>Platforms</strong><span>${platforms.length ? platforms.map((platform) => `${platform.label}: ${formatCurrency(platform.sales || 0)}`).join(' • ') : 'No connected platform revenue yet.'}</span></div>
        <div class="admin-note-card"><strong>Order Windows</strong><span>The Orders table loads stored order lines month by month as you scroll, starting with the newest month that has summary data.</span></div>
        <div class="admin-note-card"><strong>Data Path</strong><span>Dashboard requests a protected marketplace summary endpoint, then renders the charts locally with hover tooltips and month-level comparisons.</span></div>
      `;
    }

    renderSalesRecap(data);
    drawLineChart(overviewRefs.trendCanvas, monthlyRows, state.overview.metric, OVERVIEW_METRIC_UNITS);
    drawBarChart(overviewRefs.ordersCanvas, monthlyRows, {
      value: (item) => item[state.overview.volumeMetric] || 0,
      label: (item) => String(item.label || '-'),
      color: () => '#67f8d4',
      metric: state.overview.volumeMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      tooltipTitle: (item) => `${item.label || '-'} ${OVERVIEW_METRIC_LABELS[state.overview.volumeMetric] || 'volume'}`,
      limit: 12
    });
    drawBarChart(overviewRefs.platformCanvas, platforms, {
      value: (item) => item[state.overview.platformMetric] || 0,
      label: (item) => String(item.label || 'Unknown').slice(0, 12),
      color: (item) => OVERVIEW_PLATFORM_COLORS[String(item.key || 'unknown').toLowerCase()] || OVERVIEW_PLATFORM_COLORS.unknown,
      metric: state.overview.platformMetric,
      unitsMap: OVERVIEW_METRIC_UNITS,
      tooltipTitle: (item) => item.label || 'Unknown',
      limit: 6
    });

    setLastUpdated(overviewRefs.lastUpdated, data.generated_at || data.meta?.generated_at);
    renderOverviewYearControls(years);
    setSalesRecapOpen(state.overview.salesRecapOpen);
    overviewRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewMetric === state.overview.metric);
    });
    overviewRefs.volumeMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewVolumeMetric === state.overview.volumeMetric);
    });
    overviewRefs.platformMetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.overviewPlatformMetric === state.overview.platformMetric);
    });

    if (nextOrderMonthsSignature !== state.overview.orderMonthsSignature) {
      state.overview.orderMonthsSignature = nextOrderMonthsSignature;
      state.overview.orderMonths = nextOrderMonths;
      resetOrderWindowsFromOverview(years, months);
      loadNextOrderWindow();
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
    const salesToday = data.sales_today || {};
    const hourOfDay = Array.isArray(salesToday.hour_of_day) ? salesToday.hour_of_day : [];
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
    const c4Metric = C4_METRIC_LABELS[state.home.c4Metric] ? state.home.c4Metric : 'revenue';
    drawBarChart(homeRefs.hourCanvas, hourOfDay, {
      value: (item) => item[c4Metric] || 0,
      label: (item) => `${String(item.hour).padStart(2, '0')}:00`,
      color: () => OVERVIEW_PLATFORM_COLORS.shopee,
      metric: c4Metric,
      unitsMap: C4_METRIC_UNITS,
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
    if (homeRefs.hourTitle) homeRefs.hourTitle.textContent = C4_METRIC_LABELS[c4Metric];
    if (homeRefs.hourMeta) {
      const metricTotal = Number(salesToday.totals?.[c4Metric] || 0);
      const metricSummary = C4_METRIC_UNITS[c4Metric] === 'idr'
        ? formatCurrency(metricTotal)
        : `${metricTotal.toLocaleString('id-ID')} ${C4_METRIC_UNITS[c4Metric] || ''}`.trim();
      homeRefs.hourMeta.textContent = salesToday.error
        ? `Marketplace orders unavailable: ${salesToday.error}`
        : `${salesToday.date || getDashboardDateString()} • ${metricSummary}`;
    }
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
    homeRefs.c4MetricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.c4Metric === c4Metric);
    });
  };

  const websiteSalesWindow = () => {
    const now = Date.now();
    const today = getDashboardDateString();
    const year = dashboardYearMonth().year;
    const rollingDays = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    if (state.website.timeframe === '1h') {
      const cutoffMs = now - (60 * 60 * 1000);
      return {
        startDate: getDashboardDateString(new Date(cutoffMs)),
        endDate: today,
        cutoffMs,
        label: 'Last 1H'
      };
    }

    if (rollingDays[state.website.timeframe]) {
      const cutoffMs = now - (rollingDays[state.website.timeframe] * 24 * 60 * 60 * 1000);
      return {
        startDate: getDashboardDateString(new Date(cutoffMs)),
        endDate: today,
        cutoffMs,
        label: `Last ${state.website.timeframe.toUpperCase()}`
      };
    }

    return {
      startDate: `${year}-01-01`,
      endDate: today,
      cutoffMs: 0,
      label: `${year} YTD`
    };
  };

  const websiteOrderKey = (row) => [
    row.platform || 'unknown',
    row.account_key || 'unknown',
    row.order_id || row.order_row_id || ''
  ].join('|');

  const websiteOrderTimestamp = (row) => {
    const parsed = parseSalesOrderDate(row.order_create_time || row.timestamp || row.ordered_at);
    return parsed ? parsed.getTime() : 0;
  };

  const websiteOrderIsPaid = (row) => {
    const status = normalizeFilterValue(row.status || row.order_status || row.payment_status || row.fulfillment_status);
    if (!status) return true;
    return !/(cancel|return|refund|unpaid|failed|void|reject)/.test(status);
  };

  const websiteOrderQuantity = (row) => Math.max(0, optionalNumberFrom(row, [
    'quantity',
    'order_item_count',
    'item_count',
    'qty',
    'units'
  ]) ?? 0);

  const websiteOrderRevenue = (row) => optionalNumberFrom(row, [
    'net_revenue',
    'revenue',
    'sales',
    'total_revenue',
    'gross_revenue'
  ]) ?? 0;

  const websiteOrderDiscount = (row) => [
    'discount',
    'discount_amount',
    'discount_total',
    'total_discount',
    'seller_discount',
    'platform_discount',
    'voucher_discount',
    'seller_voucher',
    'platform_voucher',
    'voucher_seller',
    'voucher_platform',
    'coin_discount'
  ].reduce((sum, key) => {
    const value = optionalNumberFrom(row, [key]);
    return sum + (value === null ? 0 : Math.abs(value));
  }, 0);

  const websiteProductLabel = (row) => String(
    row.product_type ||
    row.product_name ||
    row.item_name ||
    row.sku ||
    'Unknown product'
  ).trim() || 'Unknown product';

  const aggregateWebsiteSalesRows = (rows, range, partial = false) => {
    const paidRows = (Array.isArray(rows) ? rows : []).filter((row) => {
      const timestamp = websiteOrderTimestamp(row);
      if (range.cutoffMs && timestamp && timestamp < range.cutoffMs) return false;
      return websiteOrderIsPaid(row);
    });
    const orderIds = new Set();
    const discountedOrderIds = new Set();
    const productMap = new Map();
    let paidQty = 0;
    let paidRevenue = 0;
    let totalDiscounts = 0;

    paidRows.forEach((row) => {
      const orderKey = websiteOrderKey(row);
      const quantity = websiteOrderQuantity(row);
      const revenue = websiteOrderRevenue(row);
      const discount = websiteOrderDiscount(row);
      const productLabel = websiteProductLabel(row);

      if (orderKey.trim() !== 'unknown|unknown|') orderIds.add(orderKey);
      if (discount > 0 && orderKey.trim() !== 'unknown|unknown|') discountedOrderIds.add(orderKey);
      paidQty += quantity;
      paidRevenue += revenue;
      totalDiscounts += discount;

      if (!productMap.has(productLabel)) {
        productMap.set(productLabel, {
          label: productLabel,
          orders: new Set(),
          quantity: 0,
          revenue: 0
        });
      }

      const product = productMap.get(productLabel);
      product.quantity += quantity;
      product.revenue += revenue;
      if (orderKey.trim() !== 'unknown|unknown|') product.orders.add(orderKey);
    });

    const products = Array.from(productMap.values())
      .map((item) => ({
        ...item,
        orders: item.orders.size
      }))
      .sort((left, right) => right.revenue - left.revenue || right.quantity - left.quantity || left.label.localeCompare(right.label));

    return {
      ok: true,
      range,
      partial,
      line_count: paidRows.length,
      totals: {
        paid_orders: orderIds.size || paidRows.length,
        paid_qty: paidQty,
        paid_revenue: paidRevenue,
        total_discounts: totalDiscounts,
        average_discount: discountedOrderIds.size ? totalDiscounts / discountedOrderIds.size : 0,
        discounted_orders: discountedOrderIds.size
      },
      products
    };
  };

  const loadWebsiteSalesData = async (options = {}) => {
    const range = websiteSalesWindow();
    const rows = [];
    let offset = 0;

    for (let page = 0; page < 6; page += 1) {
      const payload = await requestJson(buildSalesOrdersUrl(range.startDate, range.endDate, {
        cacheBust: options.cacheBust && page === 0,
        limit: 500,
        offset,
        skipSync: true
      }));
      rows.push(...(Array.isArray(payload.orders) ? payload.orders : []));
      const nextOffset = Number(payload.next_offset);
      if (!payload.has_more || !Number.isFinite(nextOffset) || nextOffset <= offset) {
        return aggregateWebsiteSalesRows(rows, range, false);
      }
      offset = nextOffset;
    }

    return aggregateWebsiteSalesRows(rows, range, true);
  };

  const renderWebsiteSales = (sales) => {
    const totals = sales?.totals || {};
    const products = Array.isArray(sales?.products) ? sales.products : [];
    const salesError = sales?.ok === false ? (sales.error || 'sales_unavailable') : '';

    if (websiteRefs.summaryPaidOrders) {
      websiteRefs.summaryPaidOrders.textContent = salesError ? '-' : Number(totals.paid_orders || 0).toLocaleString('id-ID');
    }
    if (websiteRefs.summaryPaidQty) {
      websiteRefs.summaryPaidQty.textContent = salesError ? '-' : Number(totals.paid_qty || 0).toLocaleString('id-ID');
    }
    if (websiteRefs.summaryPaidRevenue) {
      websiteRefs.summaryPaidRevenue.textContent = salesError ? '-' : formatCurrency(totals.paid_revenue || 0);
    }
    if (websiteRefs.salesMeta) {
      websiteRefs.salesMeta.textContent = salesError
        ? `Sales unavailable: ${salesError}`
        : `${sales.range?.label || 'Selected window'} • ${Number(sales.line_count || 0).toLocaleString('id-ID')} lines${sales.partial ? ' • partial' : ''}`;
    }

    if (websiteRefs.productTableBody) {
      websiteRefs.productTableBody.innerHTML = salesError
        ? `<tr><td colspan="4" class="admin-empty">${escapeHtml(`Sales feed unavailable: ${salesError}`)}</td></tr>`
        : renderRows(products.slice(0, 6), 4, (item) => `
          <tr>
            <td><strong>${escapeHtml(item.label || 'Unknown product')}</strong></td>
            <td>${Number(item.orders || 0).toLocaleString('id-ID')}</td>
            <td>${Number(item.quantity || 0).toLocaleString('id-ID')}</td>
            <td>${formatCurrency(item.revenue || 0)}</td>
          </tr>
        `, 'No paid product activity in this window.');
    }

    if (websiteRefs.discountSummary) {
      if (salesError) {
        websiteRefs.discountSummary.innerHTML = `<p class="admin-empty">${escapeHtml(`Discount data unavailable: ${salesError}`)}</p>`;
      } else {
        websiteRefs.discountSummary.innerHTML = `
          <div><span>Total discounts</span><strong>${formatCurrency(totals.total_discounts || 0)}</strong></div>
          <div><span>Average discount</span><strong>${formatCurrency(totals.average_discount || 0)}</strong></div>
          <div><span>Discounted orders</span><strong>${Number(totals.discounted_orders || 0).toLocaleString('id-ID')}</strong></div>
        `;
      }
    }
  };

  const renderWebsite = (data) => {
    state.website.data = data;
    state.website.screen = 'detail';
    renderWebsiteShell();
    const summary = data.summary || {};
    const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];

    if (websiteRefs.summaryVisitors) websiteRefs.summaryVisitors.textContent = Number(summary.total_visitors || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryPageViews) websiteRefs.summaryPageViews.textContent = Number(summary.total_page_views || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryAddToCart) websiteRefs.summaryAddToCart.textContent = Number(summary.add_to_cart_events || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryCheckout) websiteRefs.summaryCheckout.textContent = Number(summary.checkout_clicks || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryTime) websiteRefs.summaryTime.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));
    if (websiteRefs.summaryTopRegion) websiteRefs.summaryTopRegion.textContent = summary.top_region || 'Unknown';
    if (websiteRefs.excludedCount) websiteRefs.excludedCount.textContent = Number(summary.excluded_ip_count || 0).toLocaleString('id-ID');
    if (websiteRefs.settingsEndpointLabel) websiteRefs.settingsEndpointLabel.textContent = settingsEndpoint;
    renderWebsiteSales(data.sales || null);

    drawLineChart(websiteRefs.trendCanvas, timeseries, state.website.metric, WEBSITE_METRIC_UNITS);

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
      if (websiteRefs.heroChip) websiteRefs.heroChip.textContent = 'Official Website Dashboard';
      if (websiteRefs.heroTitle) websiteRefs.heroTitle.textContent = 'Select a website dashboard.';
      if (websiteRefs.heroCopy) websiteRefs.heroCopy.textContent = 'Choose jenanggemi.com or zerofoods.id to open the dedicated website analytics page. Each page uses browser-tagged website visits only.';
      return;
    }

    if (websiteRefs.heroChip) websiteRefs.heroChip.textContent = siteConfig.chip;
    if (websiteRefs.heroTitle) websiteRefs.heroTitle.textContent = siteConfig.title;
    if (websiteRefs.heroCopy) websiteRefs.heroCopy.textContent = siteConfig.copy;
    if (websiteRefs.scopeNote) websiteRefs.scopeNote.textContent = siteConfig.scope;
  };

  const showWebsiteSelector = () => {
    state.website.screen = 'select';
    state.website.site = '';
    renderWebsiteShell();
  };

  const renderAccountingKpis = (summary) => {
    const kpis = summary?.kpis || {};
    if (accountingRefs.kpis.realCash) accountingRefs.kpis.realCash.textContent = formatCurrency(kpis.real_cash_available || 0);
    if (accountingRefs.kpis.marketplaceOutstanding) accountingRefs.kpis.marketplaceOutstanding.textContent = formatCurrency(kpis.marketplace_outstanding || 0);
    if (accountingRefs.kpis.billsDue) accountingRefs.kpis.billsDue.textContent = formatCurrency(kpis.bills_due_soon || 0);
    if (accountingRefs.kpis.overdue) accountingRefs.kpis.overdue.textContent = formatCurrency(kpis.overdue_bills || 0);
    if (accountingRefs.kpis.expenses) accountingRefs.kpis.expenses.textContent = formatCurrency(kpis.expenses_this_month || 0);
    if (accountingRefs.kpis.safeCash) accountingRefs.kpis.safeCash.textContent = formatCurrency(kpis.net_safe_cash || 0);
    if (accountingRefs.kpis.pendingReview) accountingRefs.kpis.pendingReview.textContent = Number(kpis.pending_manual_review || 0).toLocaleString('id-ID');
    accountingRefs.safeCashCard?.classList.toggle('is-danger', Number(kpis.net_safe_cash || 0) < 0);
  };

  const renderAccountingAlerts = (summary) => {
    if (!accountingRefs.alerts) return;
    const alerts = Array.isArray(summary?.alerts) ? summary.alerts : [];
    if (!alerts.length) {
      accountingRefs.alerts.innerHTML = '<div class="admin-accounting-alert"><strong>No urgent alerts</strong><span>Accounting checks will appear after data loads.</span></div>';
      return;
    }
    accountingRefs.alerts.innerHTML = alerts.map((alert) => `
      <button type="button" class="admin-accounting-alert admin-accounting-alert-${escapeHtml(alert.type || 'info')}" data-accounting-alert-action="${escapeHtml(alert.action || '')}">
        <strong>${escapeHtml(alert.title || 'Alert')}</strong>
        <span>${Number(alert.amount || 0) > 0 ? formatCurrency(alert.amount) : escapeHtml(alert.action || 'Review')}</span>
      </button>
    `).join('');
  };

  const renderAccountingBills = () => {
    if (!accountingRefs.billsBody) return;
    const bills = state.accounting.bills;
    if (accountingRefs.billsMeta) {
      accountingRefs.billsMeta.textContent = `${bills.length.toLocaleString('id-ID')} bills loaded`;
    }
    if (!bills.length) {
      accountingRefs.billsBody.innerHTML = '<tr><td colspan="13" class="admin-empty">No unpaid bills. Add a bill when supplier invoices arrive.</td></tr>';
      renderAccountingLookupOptions();
      return;
    }
    accountingRefs.billsBody.innerHTML = bills.map((bill) => `
      <tr class="${bill.status === 'overdue' ? 'is-overdue' : ''}" data-accounting-bill-row="${escapeHtml(String(bill.id))}">
        <td><strong>${escapeHtml(bill.due_date || '-')}</strong><small class="admin-table-note">${escapeHtml(bill.issue_date || '')}</small></td>
        <td><span class="${accountingStatusClass(bill.status)}">${escapeHtml(bill.status || '-')}</span></td>
        <td>${escapeHtml(bill.vendor_name || '-')}</td>
        <td>${escapeHtml(bill.bill_no || bill.bill_key || '-')}</td>
        <td>${escapeHtml(bill.category_name || '-')}</td>
        <td>${escapeHtml(bill.brand || 'General / Shared')}</td>
        <td>${escapeHtml(bill.channel || 'Internal')}</td>
        <td>${formatCurrency(bill.total_amount || 0)}</td>
        <td>${formatCurrency(bill.paid_amount || 0)}</td>
        <td><strong>${formatCurrency(bill.outstanding_amount || 0)}</strong></td>
        <td>${Number(bill.age_days || 0).toLocaleString('id-ID')}d</td>
        <td><span class="${accountingStatusClass(bill.receipt_status)}">${escapeHtml(bill.receipt_status || 'missing')}</span></td>
        <td>
          <div class="admin-accounting-row-actions">
            <button type="button" class="admin-soft-btn" data-accounting-pay-bill="${escapeHtml(String(bill.id))}">Pay</button>
            <button type="button" class="admin-ghost-btn" data-accounting-view-bill="${escapeHtml(String(bill.id))}">View</button>
            <button type="button" class="admin-danger-btn" data-accounting-void-bill="${escapeHtml(String(bill.id))}">Void</button>
          </div>
        </td>
      </tr>
    `).join('');
    renderAccountingLookupOptions();
  };

  const renderAccountingTransactions = () => {
    if (!accountingRefs.transactionsBody) return;
    const rows = state.accounting.transactions;
    if (accountingRefs.ledgerMeta) {
      accountingRefs.ledgerMeta.textContent = `${rows.length.toLocaleString('id-ID')} rows loaded`;
    }
    if (!rows.length) {
      accountingRefs.transactionsBody.innerHTML = '<tr><td colspan="13" class="admin-empty">No manual accounting entries for this month yet.</td></tr>';
      return;
    }
    accountingRefs.transactionsBody.innerHTML = rows.map((row) => `
      <tr data-accounting-transaction-row="${escapeHtml(String(row.id))}">
        <td><strong>${escapeHtml(row.transaction_date || '-')}</strong><small class="admin-table-note">${escapeHtml(row.transaction_key || '')}</small></td>
        <td><span class="${accountingStatusClass(row.type)}">${escapeHtml(String(row.type || '-').replace(/_/g, ' '))}</span></td>
        <td>${escapeHtml(row.account_name || '-')} ${row.to_account_name ? `<small class="admin-table-note">to ${escapeHtml(row.to_account_name)}</small>` : ''}</td>
        <td>${escapeHtml(String(row.direction || '-').replace(/_/g, ' '))}</td>
        <td>${escapeHtml(row.counterparty_name || '-')}</td>
        <td>${escapeHtml(row.category_name || '-')}</td>
        <td>${escapeHtml(row.brand || 'General / Shared')}</td>
        <td>${escapeHtml(row.channel || 'Internal')}</td>
        <td><strong>${formatCurrency(row.amount || 0)}</strong></td>
        <td><span class="${accountingStatusClass(row.status)}">${escapeHtml(row.status || '-')}</span></td>
        <td><span class="${accountingStatusClass(row.receipt_status)}">${escapeHtml(row.receipt_status || 'missing')}</span></td>
        <td>${escapeHtml(row.bill_no || '-')}</td>
        <td>
          <div class="admin-accounting-row-actions">
            <button type="button" class="admin-ghost-btn" data-accounting-view-transaction="${escapeHtml(String(row.id))}">View</button>
            <button type="button" class="admin-danger-btn" data-accounting-void-transaction="${escapeHtml(String(row.id))}">Void</button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const renderAccountingSummary = (summary) => {
    if (!accountingRefs.monthlySummary) return;
    const monthly = summary?.monthly_summary || {};
    const rows = [
      ['Sales Revenue Context', monthly.sales_revenue_context || 0],
      ['Gross Profit Context', monthly.gross_profit_context || 0],
      ['Paid Operating Expenses', monthly.paid_operating_expenses || 0],
      ['Marketing Expenses', monthly.marketing_expenses || 0],
      ['Production / COGS Support', monthly.production_cogs_support_expenses || 0],
      ['Payroll / Labor', monthly.payroll_labor || 0],
      ['Software / Admin', monthly.software_admin || 0],
      ['Owner Draw', monthly.owner_draw || 0],
      ['Owner Injection', monthly.owner_injection || 0],
      ['Manual Income', monthly.manual_income || 0],
      ['Transfers In', monthly.transfers_in || 0],
      ['Transfers Out', monthly.transfers_out || 0],
      ['Bills Created', monthly.bills_created || 0],
      ['Bills Paid', monthly.bills_paid || 0],
      ['Bills Still Unpaid', monthly.bills_still_unpaid || 0],
      ['Estimated Net Cash Movement', monthly.estimated_net_cash_movement || 0]
    ];
    accountingRefs.monthlySummary.innerHTML = rows.map(([label, value]) => `
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${formatCurrency(value)}</strong>
      </div>
    `).join('');
  };

  const renderAccountingInsights = (summary) => {
    if (!accountingRefs.insights) return;
    const key = `${state.accounting.insightTab}_summary`;
    const rows = Array.isArray(summary?.[key]) ? summary[key] : [];
    accountingRefs.insightTabs.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.accountingInsightTab === state.accounting.insightTab);
    });
    if (!rows.length) {
      accountingRefs.insights.innerHTML = '<p class="admin-empty">No spend split for this period yet.</p>';
      return;
    }
    const max = Math.max(...rows.map((row) => Number(row.this_month || 0)), 1);
    accountingRefs.insights.innerHTML = rows.map((row) => {
      const value = Number(row.this_month || 0);
      return `
        <div class="admin-accounting-insight-row">
          <div><strong>${escapeHtml(row.label || '-')}</strong><span>${row.last_transaction ? escapeHtml(row.last_transaction) : 'Selected period'}</span></div>
          <div class="admin-accounting-bar"><span style="width:${Math.max(4, Math.round((value / max) * 100))}%"></span></div>
          <b>${formatCurrency(value)}</b>
        </div>
      `;
    }).join('');
  };

  const renderAccountingReviewQueue = () => {
    if (!accountingRefs.reviewBody) return;
    const rows = state.accounting.reviewQueue;
    if (!rows.length) {
      accountingRefs.reviewBody.innerHTML = '<tr><td colspan="5" class="admin-empty">No open review issues.</td></tr>';
      return;
    }
    accountingRefs.reviewBody.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.issue_message || row.issue_key || '-')}</strong><small class="admin-table-note">${escapeHtml(row.issue_key || '')}</small></td>
        <td><span class="${accountingStatusClass(row.severity)}">${escapeHtml(row.severity || 'warning')}</span></td>
        <td>${escapeHtml(row.entity_type || '-')} #${Number(row.entity_id || 0).toLocaleString('id-ID')}</td>
        <td>${escapeHtml(row.suggested_action || '-')}</td>
        <td><button type="button" class="admin-soft-btn" data-accounting-resolve-review="${escapeHtml(String(row.id))}">Mark reviewed</button></td>
      </tr>
    `).join('');
  };

  const openAccountingDrawer = (kind, id) => {
    const collection = kind === 'bill' ? state.accounting.bills : state.accounting.transactions;
    const item = collection.find((row) => Number(row.id) === Number(id));
    if (!item || !accountingRefs.drawer) return;
    if (accountingRefs.drawerKicker) accountingRefs.drawerKicker.textContent = kind === 'bill' ? 'Bill' : 'Transaction';
    if (accountingRefs.drawerTitle) accountingRefs.drawerTitle.textContent = kind === 'bill'
      ? (item.bill_no || item.bill_key || 'Bill')
      : (item.transaction_key || 'Transaction');
    if (accountingRefs.drawerBody) {
      const entries = Object.entries(item).filter(([, value]) => value !== null && value !== '');
      accountingRefs.drawerBody.innerHTML = entries.map(([key, value]) => `
        <div class="admin-accounting-detail-row">
          <span>${escapeHtml(key.replace(/_/g, ' '))}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `).join('');
    }
    accountingRefs.drawer.hidden = false;
  };

  const renderAccounting = () => {
    const summary = state.accounting.summary;
    if (accountingRefs.monthInput) accountingRefs.monthInput.value = state.accounting.month;
    renderAccountingKpis(summary);
    renderAccountingAlerts(summary);
    renderAccountingBills();
    renderAccountingTransactions();
    renderAccountingSummary(summary);
    renderAccountingInsights(summary);
    renderAccountingReviewQueue();
    renderAccountingLookupOptions();
    if (accountingRefs.status) {
      const walletContext = summary?.marketplace_outstanding_context || {};
      const importedWallet = Number(walletContext.wallet_payouts_imported_amount || 0);
      const matchedWallet = Number(walletContext.wallet_payouts_matched_count || 0);
      const walletErrors = Array.isArray(walletContext.errors) ? walletContext.errors.length : 0;
      const statusParts = ['Accounting data updates live from manual entries, wallet context, and stored order facts.'];
      if (importedWallet > 0) {
        statusParts.push(`Imported ${formatCurrency(importedWallet)} wallet payout cash.`);
      } else if (matchedWallet > 0) {
        statusParts.push(`${matchedWallet.toLocaleString('id-ID')} wallet payout transfer${matchedWallet === 1 ? '' : 's'} already matched.`);
      }
      if (walletErrors > 0) {
        statusParts.push('Wallet sync partial; retrying on the next refresh.');
      }
      statusParts.push(`Updated ${formatDashboardTime(new Date(), state.timezone, { hour: '2-digit', minute: '2-digit' })} WIB.`);
      accountingRefs.status.textContent = statusParts.join(' ');
    }
  };

  const loadAccountingLookups = async (options = {}) => {
    if (state.accounting.lookupsLoaded && !options.force) {
      renderAccountingLookupOptions();
      return;
    }
    const [accounts, categories, counterparties] = await Promise.all([
      requestJson(buildAccountingUrl('accounts', { cacheBust: options.force })),
      requestJson(buildAccountingUrl('categories', { cacheBust: options.force })),
      requestJson(buildAccountingUrl('counterparties', { cacheBust: options.force }))
    ]);
    state.accounting.accounts = Array.isArray(accounts.data?.accounts) ? accounts.data.accounts : [];
    state.accounting.categories = Array.isArray(categories.data?.categories) ? categories.data.categories : [];
    state.accounting.counterparties = Array.isArray(counterparties.data?.counterparties) ? counterparties.data.counterparties : [];
    state.accounting.lookupsLoaded = true;
    renderAccountingLookupOptions();
  };

  const loadAccounting = async (options = {}) => {
    if (!options.force && state.accounting.summary && isFresh(state.accounting.loadedAt, VIEW_CACHE_TTL_MS.accounting)) {
      renderAccounting();
      return;
    }
    const requestToken = beginRequest('accounting');
    if (accountingRefs.status) accountingRefs.status.textContent = 'Loading Accounting data...';
    const rangeOptions = accountingEndpointOptions({ cacheBust: options.force });
    const [summary, bills, transactions, review] = await Promise.all([
      requestJson(buildAccountingUrl('summary', rangeOptions)),
      requestJson(buildAccountingUrl('bills', { ...rangeOptions, status: 'open' })),
      requestJson(buildAccountingUrl('transactions', rangeOptions)),
      requestJson(buildAccountingUrl('review_queue', rangeOptions)),
      loadAccountingLookups(options)
    ]);
    if (!isLatestRequest('accounting', requestToken)) return;
    state.accounting.summary = summary.data || {};
    state.accounting.bills = Array.isArray(bills.data?.bills) ? bills.data.bills : [];
    state.accounting.transactions = Array.isArray(transactions.data?.transactions) ? transactions.data.transactions : [];
    state.accounting.reviewQueue = Array.isArray(review.data?.review_queue) ? review.data.review_queue : [];
    state.accounting.loadedAt = Date.now();
    renderAccounting();
  };

  const loadAccountingSafely = async (options = {}) => {
    try {
      await loadAccounting(options);
      return true;
    } catch (error) {
      if (accountingRefs.status) accountingRefs.status.textContent = `Accounting unavailable: ${error?.message || 'Unknown error'}`;
      if (accountingRefs.billsBody) accountingRefs.billsBody.innerHTML = `<tr><td colspan="13" class="admin-empty">Unable to load Accounting: ${escapeHtml(error?.message || 'Unknown error')}</td></tr>`;
      if (accountingRefs.transactionsBody) accountingRefs.transactionsBody.innerHTML = `<tr><td colspan="13" class="admin-empty">Unable to load Accounting: ${escapeHtml(error?.message || 'Unknown error')}</td></tr>`;
      return false;
    }
  };

  const accountingPayloadFromForm = (submitter) => {
    const form = accountingRefs.form;
    if (!(form instanceof HTMLFormElement)) return null;
    const data = new FormData(form);
    const mode = state.accounting.mode;
    const config = accountingModeConfig[mode];
    const amount = accountingRawAmount(data.get('amount'));
    const payload = {
      action: config.action,
      month: state.accounting.month,
      amount,
      transaction_date: String(data.get('transaction_date') || ''),
      issue_date: String(data.get('issue_date') || ''),
      due_date: String(data.get('due_date') || ''),
      bill_id: String(data.get('bill_id') || ''),
      account_id: String(data.get('account_id') || ''),
      to_account_id: String(data.get('to_account_id') || ''),
      category_id: String(data.get('category_id') || ''),
      counterparty_name: String(data.get('counterparty_name') || '').trim(),
      vendor_name: String(data.get('counterparty_name') || '').trim(),
      bill_no: String(data.get('bill_no') || '').trim(),
      brand: String(data.get('brand') || ''),
      channel: String(data.get('channel') || ''),
      type: mode === 'manual_income' ? String(data.get('income_type') || 'manual_income') : (config.type || ''),
      direction: config.direction || '',
      payment_method: String(data.get('payment_method') || ''),
      transfer_fee_amount: accountingRawAmount(data.get('transfer_fee_amount')),
      receipt_url: String(data.get('receipt_url') || '').trim(),
      attachment_url: String(data.get('receipt_url') || '').trim(),
      receipt_status: String(data.get('receipt_status') || 'missing'),
      reference_no: String(data.get('reference_no') || '').trim(),
      order_no: String(data.get('order_no') || '').trim(),
      notes: String(data.get('notes') || ''),
      status: submitter?.dataset?.accountingSaveDraft !== undefined ? 'draft' : 'posted'
    };
    if (mode === 'bill_received') {
      payload.total_amount = amount;
      payload.action = 'create_bill';
    }
    if (mode === 'pay_bill') {
      payload.action = 'mark_bill_paid';
      payload.payment_date = payload.transaction_date;
    }
    return payload;
  };

  const submitAccountingForm = async (event) => {
    event.preventDefault();
    const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
    const payload = accountingPayloadFromForm(submitter);
    if (!payload) return;
    setAccountingFormError('');
    if (accountingRefs.formStatus) accountingRefs.formStatus.textContent = 'Saving...';
    try {
      const data = await requestJson(accountingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (accountingRefs.formStatus) accountingRefs.formStatus.textContent = 'Saved';
      state.accounting.loadedAt = 0;
      await loadAccountingSafely({ force: true, preferStale: false });
      if (!submitter?.dataset?.accountingSaveAdd) {
        resetAccountingForm();
      } else if (accountingRefs.amountInput) {
        accountingRefs.amountInput.value = '';
      }
      return data;
    } catch (error) {
      const message = error?.message || 'Unable to save Accounting entry.';
      setAccountingFormError(message);
      if (accountingRefs.formStatus) accountingRefs.formStatus.textContent = 'Needs attention';
    }
  };

  const openWebsiteSite = async (site) => {
    if (!WEBSITE_SITE_LABELS[site]) return;
    state.website.site = site;
    state.website.screen = 'detail';
    renderWebsiteShell();
    await loadWebsiteSafely({ force: true, preferStale: false });
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
      loadOverviewSafely({ force: true, preferStale: false }),
      loadHomeSafely({ force: true, preferStale: false }),
      loadWebsiteSafely({ force: true, preferStale: false }),
      loadWebsiteSettingsSafely({ force: true, preferStale: false })
    ]);
  };

  const loadOverview = async (options = {}) => {
    if (!options.force && state.overview.data) {
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
    const requestToken = beginRequest('overview');
    const data = await requestJson(buildSalesUrl(state.overview.year, { cacheBust: options.force }));
    if (!isLatestRequest('overview', requestToken)) return;
    state.overview.loadedAt = Date.now();
    renderOverview(data);
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
      const payload = await requestJson(buildSalesOrdersUrl(month.start, month.end, {
        limit: DAILY_ORDER_PAGE_LIMIT,
        offset,
        skipSync: true,
        cacheBust: options.force
      }));
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
    const salesDate = getDashboardDateString();
    const [data, salesOrders] = await Promise.all([
      requestJson(buildAnalyticsUrl('landing', state.home.timeframe, { cacheBust: options.force })),
      requestJson(buildSalesOrdersUrl(salesDate, salesDate, { cacheBust: options.force })).catch((error) => ({
        ok: false,
        error: error?.message || 'sales_orders_unavailable',
        orders: []
      }))
    ]);
    if (!isLatestRequest('home', requestToken)) return;
    data.sales_today = buildTodaySalesByHour(salesOrders, salesDate);
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
    const [data, sales] = await Promise.all([
      requestJson(buildAnalyticsUrl('website', state.website.timeframe, { cacheBust: options.force })),
      loadWebsiteSalesData({ cacheBust: options.force }).catch((error) => ({
        ok: false,
        error: error?.message || 'sales_unavailable'
      }))
    ]);
    if (!isLatestRequest('website', requestToken)) return;
    data.sales = sales;
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
    const data = await requestJson(buildSettingsUrl('website_settings', { cacheBust: options.force }));
    if (!isLatestRequest('website', requestToken, true)) return;
    state.website.deviceExclusions = Array.isArray(data.excluded_devices) ? data.excluded_devices : [];
    state.website.currentDeviceId = ensureAnalyticsDeviceId();
    state.website.settingsLoadedAt = Date.now();
    renderDeviceExclusionList();
    renderCurrentDeviceId();
  };

  const loadActiveView = async (options = {}) => {
    if (state.activeView === 'overview') {
      await loadOverview(options);
      return;
    }
    if (state.activeView === 'daily') {
      await loadDaily(options);
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
    if (state.activeView === 'accounting') {
      await loadAccounting(options);
      return;
    }
    if (state.activeView === 'store-ops') {
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
      renderEventFeed(
        overviewRefs.notes,
        [],
        () => '',
        `Gagal memuat ringkasan marketplace: ${error?.message || 'Unknown error'}`
      );
      return false;
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
      if (dailyRefs.dayTableBody) {
        dailyRefs.dayTableBody.innerHTML = `<tr><td colspan="4" class="admin-empty">Unable to load Daily: ${escapeHtml(error?.message || 'Unknown error')}</td></tr>`;
      }
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
    if (state.activeView === 'daily') {
      return loadDailySafely(options);
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
    if (state.activeView === 'accounting') {
      return loadAccountingSafely(options);
    }
    if (state.activeView === 'store-ops') {
      return true;
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
        preferStale: false,
        background: true
      }).catch(() => {});
    }, options.delay || LIVE_REFRESH_DEBOUNCE_MS);
  };

  const queueViewRefresh = (view) => {
    const options = { force: true, preferStale: false, background: true };
    if (view === 'overview') return loadOverviewSafely(options);
    if (view === 'daily') return loadDailySafely(options);
    if (view === 'home') return loadHomeSafely(options);
    if (view === 'website' && state.website.screen === 'detail' && state.website.site) return loadWebsiteSafely(options);
    if (view === 'accounting') return loadAccountingSafely(options);
    if (view === 'settings') return loadWebsiteSettingsSafely(options);
    return Promise.resolve(false);
  };

  const renderCachedCharts = () => {
    if (state.activeView === 'overview' && state.overview.data) renderOverview(state.overview.data);
    if (state.activeView === 'daily' && state.daily.data) renderDaily(state.daily.data);
    if (state.activeView === 'home' && state.home.data) renderHome(state.home.data);
    if (state.activeView === 'website' && state.website.screen === 'detail' && state.website.data) renderWebsite(state.website.data);
    if (state.activeView === 'accounting' && state.accounting.summary) renderAccounting();
  };

  const scrollToOrdersPanel = () => {
    const ordersPanel = document.getElementById('orders');
    if (!ordersPanel) return;
    ordersPanel.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  };

  const openOrdersPanel = async () => {
    state.activeView = 'overview';
    syncViewState();
    closeMenu();
    if (!state.overview.data) {
      await loadOverviewSafely();
    }
    scrollToOrdersPanel();
    if (!state.overview.orderLoadPromise && !state.overview.orders.length && !state.overview.orderLoadedAll) {
      loadNextOrderWindow();
    }
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
    const requestedHash = entry.hash || targetUrl.hash.replace(/^#/, '');

    if (entry.view) {
      window.localStorage.setItem(viewStorageKey, normalizeDashboardView(entry.view));
    }

    closeSearchResults({ clear: true });

    if (isCurrentDashboard && requestedHash === 'orders') {
      await openOrdersPanel();
      window.history.replaceState(null, '', `${targetUrl.pathname}#orders`);
      return;
    }

    if (isCurrentDashboard && requestedView) {
      await switchView(requestedView);
      const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      window.history.replaceState(null, '', nextPath || targetUrl.pathname);
      if (normalizeDashboardView(requestedView) === 'store-ops') {
        window.dispatchEvent(new CustomEvent('jg-store-ops-refresh'));
      }
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

    source.addEventListener('change', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const nextSequence = Number(payload.sequence || 0);
        if (!Number.isFinite(nextSequence) || nextSequence <= state.liveSequence) return;
        state.liveSequence = nextSequence;
        queueActiveViewRefresh({ force: true });
      } catch (_) {
        // Keep the polling fallback simple.
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
      const tasks = [];
      if (state.activeView !== 'overview' && !state.overview.data) {
        tasks.push(() => loadOverviewSafely({ background: true, preferStale: false }));
      }
      if (state.activeView !== 'home' && !state.home.data) {
        tasks.push(() => loadHomeSafely({ background: true, preferStale: false }));
      }
      if (!state.website.settingsLoadedAt) {
        tasks.push(() => loadWebsiteSettingsSafely({ background: true, preferStale: false }));
      }
      tasks.push(() => loadOrderCatalog());

      for (const task of tasks) {
        if (document.hidden) break;
        await task().catch(() => {});
        await wait(BACKGROUND_TASK_DELAY_MS);
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        run().catch(() => {});
      }, { timeout: BACKGROUND_IDLE_TIMEOUT_MS });
      return;
    }
    window.setTimeout(() => {
      run().catch(() => {});
    }, 1200);
  };

  if (dailyRefs.monthInput) dailyRefs.monthInput.value = state.daily.month;
  renderDailyPlatformList();
  resetAccountingForm();

  applyTheme(window.localStorage.getItem(themeStorageKey) || 'dark');
  syncViewState();
  setLoaderState(20, 'Connecting to analytics');
  setLoaderState(34, 'Loading active dashboard charts');

  loadActiveViewSafely({ preferStale: false })
    .then(async () => {
      setLoaderState(76, 'Rendering charts and tables');
      if (state.activeView === 'website') {
        showWebsiteSelector();
      }
    })
    .finally(() => {
      finishLoader();
      window.setTimeout(() => {
        if (window.location.hash.replace(/^#/, '') === 'orders') {
          scrollToOrdersPanel();
        }
      }, 50);
      const startDeferredWork = () => {
        connectLiveStream();
        scheduleBackgroundLoads();
      };
      startDeferredWork();
    });

  overviewRefs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.metric = button.dataset.overviewMetric || 'sales';
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

  overviewRefs.volumeMetricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.volumeMetric = button.dataset.overviewVolumeMetric || 'orders';
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

  overviewRefs.platformMetricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.overview.platformMetric = button.dataset.overviewPlatformMetric || 'sales';
      if (state.overview.data) renderOverview(state.overview.data);
    });
  });

  overviewRefs.salesRecapClose?.addEventListener('click', () => {
    setSalesRecapOpen(false);
  });

  overviewRefs.ordersFilterOpen?.addEventListener('click', () => {
    if (!overviewRefs.ordersFilterModal) return;
    if (!state.overview.orderCatalogLoaded && !state.overview.orderCatalog.length) {
      loadOrderCatalog();
    }
    syncOrderFilterControls();
    overviewRefs.ordersFilterModal.hidden = false;
  });

  overviewRefs.ordersFilterCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (overviewRefs.ordersFilterModal) overviewRefs.ordersFilterModal.hidden = true;
    });
  });

  overviewRefs.ordersFilterReset?.addEventListener('click', clearOrderFilters);
  overviewRefs.ordersFilterClear?.addEventListener('click', clearOrderFilters);

  overviewRefs.ordersStartDate?.addEventListener('change', async () => {
    state.overview.orderFilters.startDate = overviewRefs.ordersStartDate.value || '';
    if (state.overview.orderFilters.endDate && state.overview.orderFilters.startDate > state.overview.orderFilters.endDate) {
      state.overview.orderFilters.endDate = state.overview.orderFilters.startDate;
      if (overviewRefs.ordersEndDate) overviewRefs.ordersEndDate.value = state.overview.orderFilters.endDate;
    }
    renderOrders();
    await ensureEnoughOrderRows();
  });

  overviewRefs.ordersEndDate?.addEventListener('change', async () => {
    state.overview.orderFilters.endDate = overviewRefs.ordersEndDate.value || '';
    if (state.overview.orderFilters.startDate && state.overview.orderFilters.endDate < state.overview.orderFilters.startDate) {
      state.overview.orderFilters.startDate = state.overview.orderFilters.endDate;
      if (overviewRefs.ordersStartDate) overviewRefs.ordersStartDate.value = state.overview.orderFilters.startDate;
    }
    renderOrders();
    await ensureEnoughOrderRows();
  });

  overviewRefs.ordersCompanyTree?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-add-order-filter]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    addUniqueFilter(button.getAttribute('data-add-order-filter') || '', button.getAttribute('data-filter-value') || '');
    syncOrderFilterControls();
    renderOrders();
    await ensureEnoughOrderRows();
  });

  overviewRefs.ordersPlatforms?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-toggle-order-platform]');
    if (!button) return;
    const platform = button.getAttribute('data-toggle-order-platform') || '';
    const filters = state.overview.orderFilters.platforms;
    if (filters.some((item) => normalizeFilterValue(item) === normalizeFilterValue(platform))) {
      state.overview.orderFilters.platforms = filters.filter((item) => normalizeFilterValue(item) !== normalizeFilterValue(platform));
    } else {
      addUniqueFilter('platforms', platform);
    }
    syncOrderFilterControls();
    renderOrders();
    await ensureEnoughOrderRows();
  });

  overviewRefs.ordersActiveFilters?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-order-filter]');
    if (!button) return;
    removeOrderFilter(button.getAttribute('data-remove-order-filter') || '', button.getAttribute('data-filter-value') || '');
  });

  overviewRefs.ordersScroll?.addEventListener('scroll', () => {
    if (state.overview.orderScrollPending) return;
    state.overview.orderScrollPending = true;
    window.requestAnimationFrame(async () => {
      state.overview.orderScrollPending = false;
      const node = overviewRefs.ordersScroll;
      if (!node || state.overview.orderLoading) return;
      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (remaining < 220) {
        const rows = filteredOrderRows();
        if (state.overview.orderRenderLimit < rows.length) {
          state.overview.orderRenderLimit += 80;
          renderOrders();
        } else {
          await loadNextOrderWindow();
        }
      }
    });
  }, { passive: true });

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
    const button = event.target.closest('[data-daily-remove-platform]');
    if (!button) return;
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

  homeRefs.c4MetricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const metric = button.dataset.c4Metric || 'revenue';
      if (!C4_METRIC_LABELS[metric]) return;
      state.home.c4Metric = metric;
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

  if (accountingRefs.monthInput) {
    accountingRefs.monthInput.value = state.accounting.month;
    accountingRefs.monthInput.addEventListener('change', async () => {
      const nextMonth = accountingRefs.monthInput?.value || state.accounting.month;
      state.accounting.month = jgValidMonthKey(nextMonth) ? nextMonth : getMonthKeyForTimezone(new Date(), state.timezone);
      state.accounting.loadedAt = 0;
      await loadAccountingSafely({ force: true, preferStale: false });
    });
  }

  accountingRefs.rangeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.accounting.range = button.dataset.accountingRange || 'this_month';
      accountingRefs.rangeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      state.accounting.loadedAt = 0;
      await loadAccountingSafely({ force: true, preferStale: false });
    });
  });

  [accountingRefs.dateFrom, accountingRefs.dateTo].forEach((input) => {
    input?.addEventListener('change', async () => {
      if (state.accounting.range !== 'custom') return;
      state.accounting.loadedAt = 0;
      await loadAccountingSafely({ force: true, preferStale: false });
    });
  });

  accountingRefs.modeButtons.forEach((button) => {
    button.addEventListener('click', () => setAccountingMode(button.dataset.accountingQuickMode || 'expense_paid'));
  });

  accountingRefs.openModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setAccountingMode(button.dataset.accountingOpenMode || 'expense_paid');
      accountingRefs.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  accountingRefs.amountInput?.addEventListener('input', () => {
    accountingRefs.amountInput.value = normalizeAccountingAmountInput(accountingRefs.amountInput.value);
  });

  accountingRefs.form?.addEventListener('submit', submitAccountingForm);

  accountingRefs.billsBody?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const payButton = target.closest('[data-accounting-pay-bill]');
    if (payButton instanceof HTMLElement) {
      setAccountingMode('pay_bill');
      if (accountingRefs.billSelect) accountingRefs.billSelect.value = payButton.dataset.accountingPayBill || '';
      accountingRefs.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const viewButton = target.closest('[data-accounting-view-bill]');
    if (viewButton instanceof HTMLElement) {
      openAccountingDrawer('bill', viewButton.dataset.accountingViewBill || '');
      return;
    }
    const voidButton = target.closest('[data-accounting-void-bill]');
    if (voidButton instanceof HTMLElement) {
      const reason = window.prompt('Void reason');
      if (!reason) return;
      await requestJson(accountingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void_bill', bill_id: voidButton.dataset.accountingVoidBill, void_reason: reason })
      }).catch((error) => setAccountingFormError(error.message));
      await loadAccountingSafely({ force: true, preferStale: false });
    }
  });

  accountingRefs.transactionsBody?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const viewButton = target.closest('[data-accounting-view-transaction]');
    if (viewButton instanceof HTMLElement) {
      openAccountingDrawer('transaction', viewButton.dataset.accountingViewTransaction || '');
      return;
    }
    const voidButton = target.closest('[data-accounting-void-transaction]');
    if (voidButton instanceof HTMLElement) {
      const reason = window.prompt('Void reason');
      if (!reason) return;
      await requestJson(accountingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void_transaction', transaction_id: voidButton.dataset.accountingVoidTransaction, void_reason: reason })
      }).catch((error) => setAccountingFormError(error.message));
      await loadAccountingSafely({ force: true, preferStale: false });
    }
  });

  accountingRefs.reviewBody?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('[data-accounting-resolve-review]');
    if (!(button instanceof HTMLElement)) return;
    await requestJson(accountingEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_review_resolved', review_id: button.dataset.accountingResolveReview })
    }).catch((error) => setAccountingFormError(error.message));
    await loadAccountingSafely({ force: true, preferStale: false });
  });

  accountingRefs.insightTabs.forEach((button) => {
    button.addEventListener('click', () => {
      state.accounting.insightTab = button.dataset.accountingInsightTab || 'category';
      renderAccountingInsights(state.accounting.summary);
    });
  });

  accountingRefs.refresh?.addEventListener('click', async () => {
    await loadAccountingSafely({ force: true, preferStale: false });
  });

  accountingRefs.exportButton?.addEventListener('click', () => {
    window.location.href = buildAccountingUrl('export_csv', accountingEndpointOptions({ include_voided: '0' }));
  });

  accountingRefs.settingsButton?.addEventListener('click', () => {
    setAccountingFormError('Settings are read-only in this version. Accounts and categories are seeded safely by the API.');
  });

  accountingRefs.drawerCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (accountingRefs.drawer) accountingRefs.drawer.hidden = true;
    });
  });

  document.querySelectorAll('[data-view-switch]').forEach((button) => {
    button.addEventListener('click', async () => {
      await switchView(button.dataset.viewSwitch || 'home');
    });
  });

  document.querySelectorAll('[data-orders-nav]').forEach((button) => {
    button.addEventListener('click', async () => {
      await openOrdersPanel();
    });
  });

  setupTopbarMenu();

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark');
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

  window.setInterval(() => {
    if (document.hidden) return;
    loadActiveViewSafely({ force: true, preferStale: false, background: true }).catch(() => {});
  }, AUTO_REFRESH_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      closeLiveStream();
      return;
    }
    connectLiveStream();
    if (!hasFreshViewData(state.activeView)) {
      loadActiveViewSafely({ preferStale: true, background: true }).catch(() => {});
    }
  });

  window.addEventListener('resize', () => renderCachedCharts());
  window.addEventListener('beforeunload', closeLiveStream);
});
