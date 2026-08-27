(() => {
  'use strict';

  const root = document.querySelector('[data-product-catalog]');
  if (!root) return;

  const refs = {
    status: root.querySelector('[data-catalog-status]'),
    theme: root.querySelector('[data-theme-toggle]'),
    search: root.querySelector('[data-catalog-search]'),
    clear: root.querySelector('[data-search-clear]'),
    filters: Array.from(root.querySelectorAll('[data-result-type]')),
    title: root.querySelector('[data-results-title]'),
    count: root.querySelector('[data-results-count]'),
    results: root.querySelector('[data-catalog-results]'),
    empty: root.querySelector('[data-catalog-empty]'),
    emptyReset: root.querySelector('[data-empty-reset]'),
    more: root.querySelector('[data-show-more]')
  };

  const state = {
    catalog: [],
    entries: [],
    type: 'all',
    query: '',
    limit: 60,
    selectedIndex: -1
  };

  const icons = {
    product: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    flavor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.7S5.5 10.1 5.5 15.2a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.7 12 2.7Z"/><path d="M9 16.5c.5 1.2 1.5 1.8 3 1.8"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M6 4v16"/><path d="M18 4v16"/><path d="M9 7v4M12 7v2M15 7v4"/><path d="M4 20h16"/></svg>',
    variant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5v4M3 15v4M7 5v4M7 15v4M11 5v14M15 5v14M19 5v4M19 15v4M22 5v14"/></svg>'
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
  const normalize = (value) => String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const number = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
  const analyticsUrl = (product, dimension, flavor = '', volume = '') => {
    const params = new URLSearchParams({ product, dimension });
    if (flavor) params.set('flavor', flavor);
    if (volume) params.set('volume', volume);
    return `../dashboard/product-analytics/?${params.toString()}`;
  };

  const buildEntries = (products) => {
    const entries = [];
    products.forEach((product) => {
      const brands = Array.isArray(product.brands) ? product.brands : [];
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const sharedTokens = [product.label, product.key, ...brands].join(' ');
      entries.push({
        type: 'product',
        title: product.label,
        context: brands.join(' · ') || 'Product family',
        meta: `${number(product.flavor_count)} flavors · ${number(product.volume_count)} sizes · ${number(product.variant_count)} variants`,
        href: analyticsUrl(product.key, 'product'),
        search: normalize(`${sharedTokens} ${variants.map((variant) => `${variant.sku} ${variant.tag}`).join(' ')}`)
      });

      (product.flavors || []).forEach((flavor) => {
        const matching = variants.filter((variant) => variant.flavor_key === flavor.key);
        entries.push({
          type: 'flavor',
          title: flavor.label,
          context: product.label,
          meta: `${number(new Set(matching.map((variant) => variant.volume_key)).size)} sizes · ${number(matching.length)} variants`,
          href: analyticsUrl(product.key, 'flavor', flavor.key),
          search: normalize(`${sharedTokens} ${flavor.label} ${flavor.key} ${matching.map((variant) => `${variant.sku} ${variant.tag}`).join(' ')}`)
        });
      });

      (product.volumes || []).forEach((volume) => {
        const matching = variants.filter((variant) => variant.volume_key === volume.key);
        entries.push({
          type: 'volume',
          title: volume.label,
          context: product.label,
          meta: `${number(new Set(matching.map((variant) => variant.flavor_key)).size)} flavors · ${number(matching.length)} variants`,
          href: analyticsUrl(product.key, 'volume', '', volume.key),
          search: normalize(`${sharedTokens} ${volume.label} ${volume.key} ${matching.map((variant) => `${variant.sku} ${variant.tag}`).join(' ')}`)
        });
      });

      const combinations = new Map();
      variants.forEach((variant) => {
        const key = `${variant.flavor_key}:${variant.volume_key}`;
        const existing = combinations.get(key) || { ...variant, skus: [], tags: [], brands: [] };
        if (variant.sku) existing.skus.push(variant.sku);
        if (variant.tag) existing.tags.push(variant.tag);
        if (variant.brand) existing.brands.push(variant.brand);
        combinations.set(key, existing);
      });
      combinations.forEach((variant) => {
        const skus = [...new Set(variant.skus)];
        const tags = [...new Set(variant.tags)];
        const variantBrands = [...new Set(variant.brands)];
        entries.push({
          type: 'variant',
          title: `${variant.flavor_label} · ${variant.volume_label}`,
          context: product.label,
          meta: skus.length === 1 ? skus[0] : `${number(skus.length)} SKUs`,
          href: analyticsUrl(product.key, 'sku', variant.flavor_key, variant.volume_key),
          search: normalize(`${sharedTokens} ${variant.flavor_label} ${variant.volume_label} ${skus.join(' ')} ${tags.join(' ')} ${variantBrands.join(' ')}`)
        });
      });
    });
    return entries;
  };

  const queryScore = (entry, words) => {
    if (!words.length) return entry.type === 'product' ? 100 : 0;
    if (!words.every((word) => entry.search.includes(word))) return -1;
    const title = normalize(entry.title);
    const context = normalize(entry.context);
    return words.reduce((score, word) => {
      if (title === word) return score + 100;
      if (title.startsWith(word)) return score + 55;
      if (title.includes(word)) return score + 35;
      if (context.startsWith(word)) return score + 18;
      return score + 5;
    }, 0);
  };

  const filteredEntries = () => {
    const words = normalize(state.query).split(' ').filter(Boolean);
    return state.entries
      .filter((entry) => (state.type === 'all' || entry.type === state.type)
        && (state.type !== 'all' || words.length > 0 || entry.type === 'product'))
      .map((entry) => ({ entry, score: queryScore(entry, words) }))
      .filter((result) => result.score >= 0)
      .sort((left, right) => right.score - left.score
        || ['product', 'flavor', 'volume', 'variant'].indexOf(left.entry.type) - ['product', 'flavor', 'volume', 'variant'].indexOf(right.entry.type)
        || left.entry.context.localeCompare(right.entry.context)
        || left.entry.title.localeCompare(right.entry.title))
      .map((result) => result.entry);
  };

  const typeLabel = (type) => ({ product: 'Product', flavor: 'Flavor', volume: 'Size', variant: 'Exact variant' }[type] || type);
  const resultRow = (entry, index) => `
    <a class="product-catalog-result" href="${escapeHtml(entry.href)}" data-result-index="${index}">
      <span class="product-catalog-result-icon">${icons[entry.type]}</span>
      <span class="product-catalog-result-copy">
        <strong>${escapeHtml(entry.title)}</strong>
        <small>${escapeHtml(entry.context)}</small>
      </span>
      <span class="product-catalog-result-meta">${escapeHtml(entry.meta)}</span>
      <span class="product-catalog-result-type">${escapeHtml(typeLabel(entry.type))}</span>
      <svg class="product-catalog-result-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
    </a>`;

  const syncUrl = () => {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.type !== 'all') params.set('type', state.type);
    const suffix = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${suffix ? `?${suffix}` : ''}`);
  };

  const render = () => {
    const matches = filteredEntries();
    const visible = matches.slice(0, state.limit);
    const hasQuery = normalize(state.query) !== '';
    refs.results.innerHTML = visible.map(resultRow).join('');
    refs.results.hidden = matches.length === 0;
    refs.empty.hidden = matches.length > 0;
    refs.more.hidden = matches.length <= state.limit;
    refs.more.textContent = matches.length > state.limit ? `Show ${number(matches.length - state.limit)} more` : 'Show more';
    refs.count.textContent = `${number(matches.length)} ${matches.length === 1 ? 'breakdown' : 'breakdowns'}`;
    refs.title.textContent = hasQuery
      ? `Results for “${state.query.trim()}”`
      : ({ all: 'All products', product: 'Products', flavor: 'Flavors', volume: 'Sizes', variant: 'Exact variants' }[state.type] || 'Breakdowns');
    refs.clear.hidden = !hasQuery;
    state.selectedIndex = -1;
    syncUrl();
  };

  const setType = (type) => {
    state.type = ['all', 'product', 'flavor', 'volume', 'variant'].includes(type) ? type : 'all';
    state.limit = 60;
    refs.filters.forEach((button) => {
      const active = button.dataset.resultType === state.type;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    render();
  };

  const resetSearch = () => {
    state.query = '';
    state.limit = 60;
    refs.search.value = '';
    render();
    refs.search.focus();
  };

  const moveSelection = (direction) => {
    const rows = Array.from(refs.results.querySelectorAll('[data-result-index]'));
    if (!rows.length) return;
    state.selectedIndex = Math.max(0, Math.min(rows.length - 1, state.selectedIndex + direction));
    rows.forEach((row, index) => row.classList.toggle('is-keyboard-selected', index === state.selectedIndex));
    rows[state.selectedIndex].scrollIntoView({ block: 'nearest' });
  };

  const setTheme = (theme) => {
    document.documentElement.dataset.adminTheme = theme;
    document.documentElement.dataset.adminThemeMode = theme;
    try {
      window.localStorage.setItem('jg-admin-theme', theme);
      document.cookie = `jg-admin-theme=${encodeURIComponent(theme)};path=/;max-age=31536000;SameSite=Lax`;
    } catch (_error) {}
  };

  const loadCatalog = async () => {
    try {
      const response = await fetch(root.dataset.endpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !Array.isArray(payload.products)) {
        throw new Error(payload?.message || 'Catalog unavailable');
      }
      state.catalog = payload.products;
      state.entries = buildEntries(payload.products);
      const totals = payload.totals || {};
      render();
    } catch (error) {
      refs.results.innerHTML = '';
      refs.results.hidden = true;
      refs.empty.hidden = false;
      refs.empty.querySelector('strong').textContent = error?.message || 'Catalog unavailable';
    }
  };

  const params = new URLSearchParams(window.location.search);
  state.query = params.get('q') || '';
  state.type = params.get('type') || 'all';
  refs.search.value = state.query;
  refs.filters.forEach((button) => button.addEventListener('click', () => setType(button.dataset.resultType || 'all')));
  refs.search.addEventListener('input', () => {
    state.query = refs.search.value;
    state.limit = 60;
    render();
  });
  refs.search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1); }
    if (event.key === 'Enter' && state.selectedIndex >= 0) {
      const row = refs.results.querySelector(`[data-result-index="${state.selectedIndex}"]`);
      if (row) { event.preventDefault(); row.click(); }
    }
  });
  refs.clear.addEventListener('click', resetSearch);
  refs.emptyReset.addEventListener('click', resetSearch);
  refs.more.addEventListener('click', () => { state.limit += 80; render(); });
  refs.theme.addEventListener('click', () => setTheme(document.documentElement.dataset.adminTheme === 'light' ? 'dark' : 'light'));
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) {
      event.preventDefault();
      refs.search.focus();
    }
    if (event.key === 'Escape' && document.activeElement === refs.search && refs.search.value) resetSearch();
  });

  setType(state.type);
  loadCatalog();
})();
