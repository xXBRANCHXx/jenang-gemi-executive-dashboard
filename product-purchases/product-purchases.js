const root = document.querySelector('[data-product-purchases]');

if (root) {
  const refs = Object.fromEntries(['form', 'product', 'period', 'start', 'end', 'apply', 'status', 'results', 'title', 'caption', 'all', 'ordered', 'received', 'remaining', 'value', 'order-count', 'table-title', 'search-label', 'search', 'table-head', 'rows'].map((key) => [key, root.querySelector(`[data-purchases-${key}]`)]));
  const integer = (value) => Number(value || 0).toLocaleString('id-ID');
  const money = (value) => `Rp${Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const dateLabel = (value) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${value}T00:00:00+07:00`));
  const orderDate = (value) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${value.replace(' ', 'T')}Z`));
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = (type) => parts.find((item) => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const presetDates = (preset) => {
    const end = today();
    const date = new Date(`${end}T12:00:00Z`);
    if (preset === 'all') return { start_date: '', end_date: '' };
    if (preset === 'month') return { start_date: `${end.slice(0, 7)}-01`, end_date: end };
    if (preset === 'year') return { start_date: `${end.slice(0, 4)}-01-01`, end_date: end };
    if (preset === 'lastmonth') {
      date.setUTCDate(1);
      date.setUTCDate(0);
      const last = date.toISOString().slice(0, 10);
      return { start_date: `${last.slice(0, 7)}-01`, end_date: last };
    }
    date.setUTCDate(date.getUTCDate() - 29);
    return { start_date: date.toISOString().slice(0, 10), end_date: end };
  };
  let data = null;
  let controller = null;
  let requestedSku = '';
  let appliedFilters = null;

  const setDateControls = (filters) => {
    refs.start.value = filters.start_date;
    refs.end.value = filters.end_date;
    refs.start.disabled = refs.end.disabled = refs.period.value === 'all';
  };
  const readLocation = () => {
    const params = new URLSearchParams(location.search);
    requestedSku = params.get('sku') || '';
    const hasDates = params.has('start_date') || params.has('end_date');
    const allTime = params.get('period') === 'all';
    refs.period.value = allTime ? 'all' : hasDates ? 'custom' : 'last30';
    setDateControls(hasDates && !allTime
      ? { start_date: params.get('start_date') || '', end_date: params.get('end_date') || '' }
      : presetDates(refs.period.value));
    if (requestedSku && ![...refs.product.options].some((option) => option.value === requestedSku)) refs.product.add(new Option(requestedSku, requestedSku));
    refs.product.value = requestedSku;
    refs.search.value = '';
  };
  const reportUrl = (sku, filters = appliedFilters) => {
    const url = new URL('./', location.href);
    if (sku) url.searchParams.set('sku', sku);
    if (filters.start_date && filters.end_date) {
      url.searchParams.set('start_date', filters.start_date);
      url.searchParams.set('end_date', filters.end_date);
    } else url.searchParams.set('period', 'all');
    return `${url.pathname}${url.search}`;
  };
  const renderRows = () => {
    if (!data) return;
    if (data.selected_product) {
      refs['table-head'].innerHTML = '<tr><th scope="col">Purchase order</th><th scope="col">PO date</th><th scope="col">Units ordered</th><th scope="col">Received</th><th scope="col">Unit cost</th><th scope="col">Purchase value</th></tr>';
      refs.rows.innerHTML = data.orders.length ? data.orders.map((order) => {
        const status = { pending: 'Waiting for delivery', partially_received: 'Partially received', received: 'Received in full' }[order.status] || order.status;
        const type = order.order_type === 'overflow' ? 'Overflow stock' : 'Stock reorder';
        return `<tr><td><a href="../dashboard/?view=po-detail&amp;po=${Number(order.id)}">${escapeHtml(order.po_number)} →</a><small>${escapeHtml(status)} · ${escapeHtml(type)}${order.tag ? ` · ${escapeHtml(order.tag)}` : ''}</small></td><td>${escapeHtml(orderDate(order.ordered_at))}</td><td>${integer(order.ordered_qty)}</td><td>${integer(order.received_qty)}</td><td>${money(order.unit_cost)}</td><td>${money(order.purchase_value)}</td></tr>`;
      }).join('') : '<tr><td colspan="6" class="product-purchases-empty">No purchases for this product in the selected period. Try a wider date range.</td></tr>';
    } else {
      const query = refs.search.value.trim().toLowerCase();
      const rows = data.products.filter((product) => product.order_count > 0 && (!query || `${product.product_name} ${product.sku}`.toLowerCase().includes(query)));
      refs['table-head'].innerHTML = '<tr><th scope="col">Product</th><th scope="col">Units ordered</th><th scope="col">Received</th><th scope="col">Still to arrive</th><th scope="col">Purchase value</th><th scope="col">POs</th></tr>';
      refs.rows.innerHTML = rows.length ? rows.map((product) => `<tr><td><a href="${escapeHtml(reportUrl(product.sku))}" data-purchases-sku="${escapeHtml(product.sku)}">${escapeHtml(product.product_name)} →</a><small>${escapeHtml(product.sku)}</small></td><td>${integer(product.ordered_qty)}</td><td>${integer(product.received_qty)}</td><td>${integer(product.remaining_qty)}</td><td>${money(product.purchase_value)}</td><td>${integer(product.order_count)}</td></tr>`).join('') : `<tr><td colspan="6" class="product-purchases-empty">${query ? 'No purchased products match your search.' : 'No purchases in the selected period. Try a wider date range.'}</td></tr>`;
    }
  };
  const render = () => {
    const selected = data.selected_product;
    const products = [...data.products].sort((a, b) => a.product_name.localeCompare(b.product_name) || a.sku.localeCompare(b.sku));
    refs.product.replaceChildren(new Option('All products', ''), ...products.map((product) => new Option(`${product.product_name} · ${product.sku}`, product.sku)));
    refs.product.value = data.sku;
    refs.title.textContent = selected?.product_name || 'All products';
    const period = data.period.start_date ? `${dateLabel(data.period.start_date)} – ${dateLabel(data.period.end_date)}` : 'All time';
    refs.caption.textContent = `${selected ? `SKU ${selected.sku} · ` : ''}${period} · Jakarta time`;
    document.title = `${selected?.product_name || 'Purchases by product'} | Purchase history`;
    refs.all.hidden = !selected;
    refs.all.href = reportUrl('');
    refs.ordered.textContent = integer(data.totals.ordered_qty);
    refs.received.textContent = integer(data.totals.received_qty);
    refs.remaining.textContent = integer(data.totals.remaining_qty);
    refs.value.textContent = money(data.totals.purchase_value);
    refs['order-count'].textContent = `${integer(data.totals.order_count)} purchase order${data.totals.order_count === 1 ? '' : 's'}`;
    refs['table-title'].textContent = selected ? 'Purchase orders for this product' : 'Products purchased';
    refs['search-label'].hidden = Boolean(selected);
    renderRows();
    refs.results.hidden = false;
  };
  const load = async ({ updateHistory = true } = {}) => {
    controller?.abort();
    const requestController = new AbortController();
    controller = requestController;
    const filters = { sku: requestedSku, start_date: refs.start.value, end_date: refs.end.value };
    if (refs.period.value === 'all') filters.start_date = filters.end_date = '';
    refs.results.hidden = true;
    refs.apply.disabled = true;
    refs.status.classList.remove('is-error');
    refs.status.textContent = 'Loading purchase history…';
    root.setAttribute('aria-busy', 'true');
    const timeout = setTimeout(() => requestController.abort(new Error('Purchase history took too long to load. Please try again.')), 30000);
    try {
      if (refs.period.value !== 'all' && (!filters.start_date || !filters.end_date)) throw new Error('Choose a valid start and end date, or use All time.');
      const url = new URL(root.dataset.apiEndpoint, location.href);
      Object.entries(filters).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: requestController.signal, headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok || payload.ok !== true) throw new Error(payload.message || (response.status === 401 ? 'Your session expired. Open PO History to sign in again.' : 'Purchase history could not be loaded. Please try again.'));
      if (controller !== requestController) return;
      data = payload;
      appliedFilters = filters;
      render();
      refs.status.textContent = 'Confirmed purchase orders · drafts and cancelled orders excluded';
      if (updateHistory) {
        const next = reportUrl(data.sku);
        if (`${location.pathname}${location.search}` !== next) history.pushState(null, '', next);
      }
    } catch (error) {
      if (controller !== requestController) return;
      refs.status.textContent = error.message || 'Purchase history could not be loaded. Please try again.';
      refs.status.classList.add('is-error');
    } finally {
      clearTimeout(timeout);
      if (controller === requestController) {
        refs.apply.disabled = false;
        root.setAttribute('aria-busy', 'false');
      }
    }
  };

  refs.form.addEventListener('submit', (event) => { event.preventDefault(); load(); });
  refs.period.addEventListener('change', () => {
    refs.start.disabled = refs.end.disabled = refs.period.value === 'all';
    if (refs.period.value === 'custom') return;
    setDateControls(presetDates(refs.period.value));
    load();
  });
  [refs.start, refs.end].forEach((input) => input.addEventListener('input', () => { refs.period.value = 'custom'; }));
  refs.product.addEventListener('change', () => { requestedSku = refs.product.value; load(); });
  refs.search.addEventListener('input', renderRows);
  root.addEventListener('click', (event) => {
    const link = event.target.closest('[data-purchases-sku], [data-purchases-all]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    requestedSku = link.dataset.purchasesSku || '';
    refs.product.value = requestedSku;
    // A product link always keeps the range shown in the report, even if inputs were edited.
    refs.period.value = appliedFilters.start_date ? 'custom' : 'all';
    setDateControls(appliedFilters);
    refs.search.value = '';
    load();
  });
  window.addEventListener('popstate', () => { readLocation(); load({ updateHistory: false }); });
  readLocation();
  load({ updateHistory: false });
}
