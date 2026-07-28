document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-sales]');
  if (!root) return;

  const endpoint = root.dataset.salesEndpoint || '../api/partner-sales/';
  const partnerCode = String(root.dataset.partnerCode || '').trim();
  const $ = (selector) => document.querySelector(selector);
  const refs = {
    loading: $('[data-sales-loading]'), content: $('[data-sales-content]'), error: $('[data-sales-error]'),
    name: $('[data-sales-partner-name]'), code: $('[data-sales-partner-code]'), settings: $('[data-sales-settings-link]'), portal: $('[data-sales-portal-link]'),
    from: $('[data-sales-from]'), to: $('[data-sales-to]'), updated: $('[data-sales-updated]'),
    total: $('[data-sales-total]'), paid: $('[data-sales-paid]'), outstanding: $('[data-sales-outstanding]'), units: $('[data-sales-units]'), average: $('[data-sales-average]'),
    orderCount: $('[data-sales-order-count]'), rate: $('[data-sales-collection-rate]'), unpaidCount: $('[data-sales-unpaid-count]'), cancelledCount: $('[data-sales-cancelled-count]'),
    chart: $('[data-sales-chart]'), trendCaption: $('[data-sales-trend-caption]'), progress: $('[data-sales-progress]'), rateLarge: $('[data-sales-rate]'), statuses: $('[data-sales-status-list]'),
    channels: $('[data-sales-channels]'), products: $('[data-sales-products]'), payments: $('[data-sales-payments]'), orders: $('[data-sales-orders]'),
    search: $('[data-sales-search]'), statusFilter: $('[data-sales-status-filter]'), ledgerCount: $('[data-sales-ledger-count]'), limitNote: $('[data-sales-limit-note]'),
    paymentModal: $('[data-payment-modal]'), paymentForm: $('[data-payment-form]'), paymentError: $('[data-payment-error]'), paymentBalance: $('[data-payment-balance]'), paymentTitle: $('[data-payment-order-title]'), toast: $('[data-sales-toast]')
  };

  const state = { payload: null, search: '', status: 'all', expanded: new Set(), activeOrder: null };
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const currency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
  const number = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(Number(value || 0));
  const isoDate = (date) => date.toISOString().slice(0, 10);
  const parseDate = (value) => {
    const normalized = String(value || '').replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const dateLabel = (value, withTime = false) => {
    const date = parseDate(value);
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date);
  };
  const statusLabel = (status) => ({ paid: 'Paid', partial: 'Partially paid', unpaid: 'Unpaid', cancelled: 'Cancelled' }[status] || status || 'Unknown');
  const orderStatusLabel = (status) => String(status || 'Unknown').toLowerCase().replace(/^is_/, '').replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  const orderCountLabel = (value) => `${number(value)} ${Number(value) === 1 ? 'order' : 'orders'}`;

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      method: options.method || 'GET', credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  };

  const setError = (message) => {
    if (!refs.error) return;
    refs.error.hidden = !message;
    refs.error.textContent = message || '';
  };

  const buildUrl = () => {
    const url = new URL(endpoint, window.location.href);
    url.searchParams.set('code', partnerCode);
    if (refs.from?.value) url.searchParams.set('from', refs.from.value);
    if (refs.to?.value) url.searchParams.set('to', refs.to.value);
    url.searchParams.set('_ts', String(Date.now()));
    return url.toString();
  };

  const visibleOrders = () => (state.payload?.orders || []).filter((order) => {
    if (state.status !== 'all' && order.payment_status !== state.status) return false;
    const term = state.search.trim().toLowerCase();
    if (!term) return true;
    const items = Array.isArray(order.items) ? order.items : [];
    return [order.id, order.customer_name, order.marketplace_platform, order.status, order.payment_status, ...items.flatMap((item) => [item.sku_code, item.sku_label, item.brand, item.product, item.flavor, item.size])]
      .join(' ').toLowerCase().includes(term);
  });

  const renderStats = () => {
    const summary = state.payload?.summary || {};
    const statuses = summary.payment_statuses || {};
    if (refs.total) refs.total.textContent = currency(summary.order_value);
    if (refs.paid) refs.paid.textContent = currency(summary.paid_amount);
    if (refs.outstanding) refs.outstanding.textContent = currency(summary.outstanding_amount);
    if (refs.units) refs.units.textContent = number(summary.units);
    if (refs.average) refs.average.textContent = currency(summary.average_order_value);
    if (refs.orderCount) refs.orderCount.textContent = `${number(summary.order_count)} sales orders`;
    if (refs.rate) refs.rate.textContent = `${number(summary.collection_rate)}% collected`;
    if (refs.unpaidCount) refs.unpaidCount.textContent = `${number((statuses.unpaid || 0) + (statuses.partial || 0))} open balances`;
    if (refs.cancelledCount) refs.cancelledCount.textContent = `${number(summary.cancelled_count)} cancelled`;
    if (refs.rateLarge) refs.rateLarge.textContent = `${number(summary.collection_rate)}%`;
    if (refs.progress) refs.progress.style.width = `${Math.max(0, Math.min(100, Number(summary.collection_rate || 0)))}%`;
    if (refs.statuses) refs.statuses.innerHTML = [
      ['Paid', statuses.paid || 0, summary.paid_amount || 0],
      ['Partially paid', statuses.partial || 0, 0],
      ['Unpaid', statuses.unpaid || 0, summary.outstanding_amount || 0],
      ['Cancelled', statuses.cancelled || 0, 0]
    ].map(([label, count, amount]) => `<div><span>${escapeHtml(label)}</span><strong>${number(count)}</strong><small>${amount ? currency(amount) : orderCountLabel(count)}</small></div>`).join('');
  };

  const renderChart = () => {
    if (!refs.chart) return;
    const orders = (state.payload?.orders || []).filter((order) => order.payment_status !== 'cancelled' && parseDate(order.order_timestamp));
    const buckets = new Map();
    orders.forEach((order) => {
      const date = parseDate(order.order_timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets.has(key)) buckets.set(key, { key, label: new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(date), total: 0, paid: 0, orders: 0 });
      const bucket = buckets.get(key);
      bucket.total += Number(order.order_total || 0);
      bucket.paid += Number(order.paid_amount || 0);
      bucket.orders += 1;
    });
    const data = [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
    if (!data.length) {
      refs.chart.innerHTML = '<p class="partner-sales-empty">No sales in this period.</p>';
      if (refs.trendCaption) refs.trendCaption.textContent = 'No recorded orders';
      return;
    }
    const max = Math.max(...data.map((bucket) => bucket.total), 1);
    refs.chart.innerHTML = data.map((bucket) => {
      const totalHeight = Math.max(3, (bucket.total / max) * 100);
      const paidHeight = bucket.total > 0 ? Math.max(0, (bucket.paid / bucket.total) * totalHeight) : 0;
      return `<div class="partner-sales-chart-column" title="${escapeHtml(`${bucket.label}: ${currency(bucket.total)} · ${bucket.orders} orders`)}"><div class="partner-sales-chart-track"><span style="height:${totalHeight}%"><i style="height:${paidHeight}%"></i></span></div><small>${escapeHtml(bucket.label)}</small></div>`;
    }).join('');
    if (refs.trendCaption) refs.trendCaption.textContent = `${data.length} month${data.length === 1 ? '' : 's'} · dark fill is paid`;
  };

  const rankingRow = (label, detail, value, share) => `<div class="partner-sales-ranking-row"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></div><span>${escapeHtml(value)}</span><i><b style="width:${Math.max(0, Math.min(100, share))}%"></b></i></div>`;

  const renderBreakdowns = () => {
    const orders = (state.payload?.orders || []).filter((order) => order.payment_status !== 'cancelled');
    const orderValue = orders.reduce((sum, order) => sum + Number(order.order_total || 0), 0);
    const channels = new Map();
    const products = new Map();
    orders.forEach((order) => {
      const channelName = String(order.marketplace_platform || 'Unassigned').trim() || 'Unassigned';
      const channel = channels.get(channelName) || { name: channelName, orders: 0, units: 0, value: 0 };
      channel.orders += 1; channel.units += Number(order.units || 0); channel.value += Number(order.order_total || 0); channels.set(channelName, channel);
      (order.items || []).forEach((item) => {
        const key = String(item.sku_code || item.product || item.sku_label || 'Product');
        const product = products.get(key) || { sku: key, name: item.product || item.sku_label || key, units: 0, value: 0 };
        const units = Number(item.quantity || 0);
        product.units += units;
        product.value += Number(item.line_revenue || (Number(item.unit_revenue || item.partner_price || 0) * units));
        products.set(key, product);
      });
    });
    const channelRows = [...channels.values()].sort((a, b) => b.value - a.value).slice(0, 8);
    const productRows = [...products.values()].sort((a, b) => b.value - a.value || b.units - a.units).slice(0, 8);
    if (refs.channels) refs.channels.innerHTML = channelRows.length ? channelRows.map((row) => rankingRow(row.name, `${orderCountLabel(row.orders)} · ${number(row.units)} units`, currency(row.value), orderValue ? (row.value / orderValue) * 100 : 0)).join('') : '<p class="partner-sales-empty">No channel data yet.</p>';
    if (refs.products) refs.products.innerHTML = productRows.length ? productRows.map((row) => rankingRow(row.name, `${row.sku} · ${number(row.units)} units`, currency(row.value), orderValue ? (row.value / orderValue) * 100 : 0)).join('') : '<p class="partner-sales-empty">No product data yet.</p>';
  };

  const renderPayments = () => {
    if (!refs.payments) return;
    const payments = [...(state.payload?.payments || [])].sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date))).slice(0, 10);
    refs.payments.innerHTML = payments.length ? payments.map((payment) => `<div class="partner-sales-payment-row"><div><strong>${currency(payment.amount)}</strong><small>${escapeHtml(payment.order_id)} · ${escapeHtml(payment.payment_method || 'Payment')}</small></div><span>${escapeHtml(dateLabel(payment.payment_date))}</span><button type="button" data-void-payment="${Number(payment.id)}" aria-label="Void payment for ${escapeHtml(payment.order_id)}" title="Void payment">Remove</button></div>`).join('') : '<p class="partner-sales-empty">No payments recorded yet.</p>';
  };

  const itemRows = (order) => (order.items || []).map((item) => {
    const quantity = Number(item.quantity || 0);
    const line = Number(item.line_revenue || (Number(item.unit_revenue || item.partner_price || 0) * quantity));
    return `<div class="partner-sales-item-row"><div><strong>${escapeHtml(item.product || item.sku_label || item.sku_code || 'Product')}</strong><small>${escapeHtml([item.sku_code, item.flavor, item.size].filter(Boolean).join(' · '))}</small></div><span>${number(quantity)} units</span><span>${currency(line)}</span></div>`;
  }).join('');

  const paymentRows = (order) => order.payments?.length ? order.payments.map((payment) => `<div class="partner-sales-order-payment"><span>${escapeHtml(dateLabel(payment.payment_date))}</span><strong>${currency(payment.amount)}</strong><small>${escapeHtml([payment.payment_method, payment.reference_no].filter(Boolean).join(' · ') || 'Payment')}</small></div>`).join('') : '<p class="partner-sales-empty">No settlements recorded for this order.</p>';

  const renderOrders = () => {
    if (!refs.orders) return;
    const orders = visibleOrders();
    if (refs.ledgerCount) refs.ledgerCount.textContent = `${number(orders.length)} of ${number(state.payload?.orders?.length || 0)} orders`;
    if (!orders.length) {
      refs.orders.innerHTML = '<p class="partner-sales-empty partner-sales-ledger-empty">No orders match these filters.</p>';
      return;
    }
    refs.orders.innerHTML = orders.map((order) => {
      const expanded = state.expanded.has(order.id);
      const canPay = !['paid', 'cancelled'].includes(order.payment_status) && Number(order.outstanding_amount || 0) > 0;
      return `<article class="partner-sales-order ${expanded ? 'is-expanded' : ''}" data-order-id="${escapeHtml(order.id)}">
        <div class="partner-sales-order-main" data-toggle-order="${escapeHtml(order.id)}" tabindex="0" role="button" aria-expanded="${expanded}">
          <div><strong>${escapeHtml(order.id)}</strong><small>${escapeHtml(dateLabel(order.order_timestamp, true))}</small></div>
          <div><strong>${escapeHtml(order.marketplace_platform || 'Unassigned')}</strong><small>${escapeHtml(order.customer_name || 'Customer not recorded')}</small></div>
          <div><strong>${number(order.units)} units</strong><small>${number(order.items?.length || 0)} line items</small></div>
          <span>${currency(order.order_total)}</span><span>${currency(order.paid_amount)}</span><span>${currency(order.outstanding_amount)}</span>
          <div class="partner-sales-status partner-sales-status-${escapeHtml(order.payment_status)}"><strong>${escapeHtml(statusLabel(order.payment_status))}</strong><small>${escapeHtml(orderStatusLabel(order.status))}</small></div>
          <button type="button" class="partner-sales-order-toggle" data-toggle-order="${escapeHtml(order.id)}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${escapeHtml(order.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>
        </div>
        <div class="partner-sales-order-detail" ${expanded ? '' : 'hidden'}>
          <section><header><span>Line items</span><strong>${currency(order.order_total)}</strong></header>${itemRows(order)}</section>
          <section><header><span>Payment activity</span><strong>${currency(order.paid_amount)} paid</strong></header>${paymentRows(order)}</section>
          <aside><dl><div><dt>Order status</dt><dd>${escapeHtml(orderStatusLabel(order.status))}</dd></div><div><dt>Outstanding</dt><dd>${currency(order.outstanding_amount)}</dd></div><div><dt>Last updated</dt><dd>${escapeHtml(dateLabel(order.updated_at, true))}</dd></div></dl>${order.notes ? `<p>${escapeHtml(order.notes)}</p>` : ''}${canPay ? `<button type="button" class="admin-primary-btn" data-record-payment="${escapeHtml(order.id)}">Record payment</button>` : '<small>No payment action needed.</small>'}</aside>
        </div>
      </article>`;
    }).join('');
  };

  const render = () => {
    const payload = state.payload || {};
    const partner = payload.partner || {};
    if (refs.name) refs.name.textContent = partner.name || 'Partner';
    if (refs.code) refs.code.textContent = partner.code || partnerCode;
    if (refs.settings) refs.settings.href = `../partner-profile/?code=${encodeURIComponent(partner.code || partnerCode)}`;
    if (refs.portal) refs.portal.href = `https://partner.jenanggemi.com/${encodeURIComponent(partner.partner_slug || '')}/`;
    if (refs.updated) refs.updated.textContent = `${payload.orders?.length || 0} ledger entries · refreshed ${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
    if (refs.limitNote) refs.limitNote.hidden = !payload.source?.orders_limited;
    renderStats(); renderChart(); renderBreakdowns(); renderPayments(); renderOrders();
  };

  const load = async () => {
    setError('');
    if (refs.loading) refs.loading.hidden = false;
    try {
      state.payload = await requestJson(buildUrl());
      render();
      if (refs.content) refs.content.hidden = false;
    } catch (error) {
      setError(error.message || 'Unable to load partner sales.');
    } finally {
      if (refs.loading) refs.loading.hidden = true;
    }
  };

  const setPeriod = (period) => {
    const today = new Date();
    if (refs.to) refs.to.value = isoDate(today);
    if (period === 'all') {
      if (refs.from) refs.from.value = '';
      if (refs.to) refs.to.value = '';
    } else if (period === 'ytd') {
      if (refs.from) refs.from.value = `${today.getFullYear()}-01-01`;
    } else {
      const from = new Date(today);
      from.setDate(from.getDate() - Number(period) + 1);
      if (refs.from) refs.from.value = isoDate(from);
    }
    document.querySelectorAll('[data-sales-period]').forEach((button) => button.classList.toggle('is-active', button.dataset.salesPeriod === period));
    load();
  };

  const openPaymentModal = (orderId) => {
    const order = state.payload?.orders?.find((candidate) => candidate.id === orderId);
    if (!order || !refs.paymentModal || !(refs.paymentForm instanceof HTMLFormElement)) return;
    state.activeOrder = order;
    refs.paymentForm.reset();
    refs.paymentForm.elements.order_id.value = order.id;
    refs.paymentForm.elements.amount.value = Math.round(Number(order.outstanding_amount || 0));
    refs.paymentForm.elements.amount.max = String(Math.round(Number(order.outstanding_amount || 0)));
    refs.paymentForm.elements.payment_date.value = isoDate(new Date());
    if (refs.paymentBalance) refs.paymentBalance.textContent = currency(order.outstanding_amount);
    if (refs.paymentTitle) refs.paymentTitle.textContent = order.id;
    if (refs.paymentError) refs.paymentError.hidden = true;
    refs.paymentModal.hidden = false;
    refs.paymentForm.elements.amount.focus();
  };

  const closePaymentModal = () => { if (refs.paymentModal) refs.paymentModal.hidden = true; state.activeOrder = null; };
  const showToast = () => { if (!refs.toast) return; refs.toast.hidden = false; window.setTimeout(() => { refs.toast.hidden = true; }, 3200); };

  document.querySelectorAll('[data-sales-period]').forEach((button) => button.addEventListener('click', () => setPeriod(button.dataset.salesPeriod || 'all')));
  $('[data-sales-apply]')?.addEventListener('click', () => { document.querySelectorAll('[data-sales-period]').forEach((button) => button.classList.remove('is-active')); load(); });
  refs.search?.addEventListener('input', () => { state.search = refs.search.value || ''; renderOrders(); });
  refs.statusFilter?.addEventListener('change', () => { state.status = refs.statusFilter.value || 'all'; renderOrders(); });

  refs.orders?.addEventListener('click', (event) => {
    const paymentButton = event.target.closest('[data-record-payment]');
    if (paymentButton) { openPaymentModal(paymentButton.dataset.recordPayment); return; }
    const toggle = event.target.closest('[data-toggle-order]');
    if (!toggle) return;
    const id = toggle.dataset.toggleOrder;
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    renderOrders();
  });
  refs.orders?.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const toggle = event.target.closest('[data-toggle-order]');
    if (!toggle) return;
    event.preventDefault(); toggle.click();
  });

  document.querySelectorAll('[data-close-payment-modal]').forEach((button) => button.addEventListener('click', closePaymentModal));
  refs.paymentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(refs.paymentForm);
    const submit = refs.paymentForm.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    if (refs.paymentError) refs.paymentError.hidden = true;
    try {
      await requestJson(endpoint, { method: 'POST', body: { action: 'record_payment', partner_code: partnerCode, order_id: formData.get('order_id'), amount: Number(formData.get('amount')), payment_date: formData.get('payment_date'), payment_method: formData.get('payment_method'), reference_no: formData.get('reference_no'), notes: formData.get('notes') } });
      closePaymentModal(); await load(); showToast();
    } catch (error) {
      if (refs.paymentError) { refs.paymentError.textContent = error.message || 'Unable to record payment.'; refs.paymentError.hidden = false; }
    } finally { if (submit) submit.disabled = false; }
  });

  refs.payments?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-void-payment]');
    if (!button || !window.confirm('Remove this payment from the active settlement history? The audit record will be retained.')) return;
    button.disabled = true;
    try {
      await requestJson(endpoint, { method: 'POST', body: { action: 'void_payment', partner_code: partnerCode, payment_id: Number(button.dataset.voidPayment) } });
      await load();
    } catch (error) { setError(error.message || 'Unable to remove payment.'); }
  });

  if (!partnerCode) {
    if (refs.loading) refs.loading.hidden = true;
    setError('Choose a partner profile to view its sales breakdown.');
    return;
  }
  load();
});
