document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-sales]');
  if (!root) return;

  const endpoint = root.dataset.salesEndpoint || '../api/partner-sales/';
  const disputesEndpoint = root.dataset.disputesEndpoint || '../api/partner-billing/';
  const partnerCode = String(root.dataset.partnerCode || '').trim();
  const $ = (selector) => document.querySelector(selector);
  const refs = {
    loading: $('[data-sales-loading]'), content: $('[data-sales-content]'), error: $('[data-sales-error]'),
    name: $('[data-sales-partner-name]'), code: $('[data-sales-partner-code]'), settings: $('[data-sales-settings-link]'), portal: $('[data-sales-portal-link]'), stock: $('[data-sales-stock-link]'),
    from: $('[data-sales-from]'), to: $('[data-sales-to]'), updated: $('[data-sales-updated]'),
    total: $('[data-sales-total]'), paid: $('[data-sales-paid]'), outstanding: $('[data-sales-outstanding]'), units: $('[data-sales-units]'), average: $('[data-sales-average]'),
    orderCount: $('[data-sales-order-count]'), rate: $('[data-sales-collection-rate]'), unpaidCount: $('[data-sales-unpaid-count]'), cancelledCount: $('[data-sales-cancelled-count]'),
    chart: $('[data-sales-chart]'), trendCaption: $('[data-sales-trend-caption]'), progress: $('[data-sales-progress]'), rateLarge: $('[data-sales-rate]'), statuses: $('[data-sales-status-list]'),
    channels: $('[data-sales-channels]'), products: $('[data-sales-products]'), payments: $('[data-sales-payments]'), orders: $('[data-sales-orders]'),
    search: $('[data-sales-search]'), statusFilter: $('[data-sales-status-filter]'), ledgerCount: $('[data-sales-ledger-count]'), limitNote: $('[data-sales-limit-note]'),
    paymentModal: $('[data-payment-modal]'), paymentForm: $('[data-payment-form]'), paymentError: $('[data-payment-error]'), paymentBalance: $('[data-payment-balance]'), paymentTitle: $('[data-payment-order-title]'), toast: $('[data-sales-toast]'),
    settlementModal: $('[data-settlement-detail-modal]'), settlementBody: $('[data-settlement-detail-body]'),
    disputesButton: $('[data-open-disputes]'), disputesModal: $('[data-disputes-modal]'), disputesPicker: $('[data-disputes-picker]'), disputesHistory: $('[data-disputes-history]'), disputesForm: $('[data-disputes-window-form]'), disputesWeek: $('[data-disputes-week]'), disputesSubmit: $('[data-view-disputes]'), disputesError: $('[data-disputes-error]'), disputesWindowLabel: $('[data-disputes-window-label]'), disputesSummary: $('[data-disputes-summary]'), disputesList: $('[data-disputes-list]')
  };

  const state = { payload: null, search: '', status: 'all', expanded: new Set(), activeOrder: null, editingOrderId: '', disputePayload: null, disputeLoading: false };
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const currency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
  const number = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(Number(value || 0));
  const isoDate = (date) => date.toISOString().slice(0, 10);
  const parseDate = (value) => {
    const raw = String(value || '').trim();
    const normalized = raw.replace(' ', 'T');
    const hasTime = /T\d{2}:\d{2}/.test(normalized);
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
    const date = new Date(hasTime && !hasZone ? `${normalized}Z` : normalized);
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
  const fileSize = (value) => {
    const bytes = Math.max(0, Number(value || 0));
    if (bytes < 1024) return `${number(bytes)} B`;
    if (bytes < 1024 * 1024) return `${number(bytes / 1024)} KB`;
    return `${number(bytes / (1024 * 1024))} MB`;
  };

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

  const paymentGroupKey = (payment) => payment.source_type === 'partner_weekly_bill' && payment.source_reference
    ? `partner_weekly_bill:${payment.source_reference}` : `manual:${Number(payment.id || 0)}`;

  const settlementGroups = () => {
    const groups = new Map();
    (state.payload?.payments || []).forEach((payment) => {
      const key = paymentGroupKey(payment);
      if (!groups.has(key)) groups.set(key, {
        key,
        source_type: payment.source_type || 'manual',
        reference: payment.source_reference || payment.reference_no || '',
        payment_date: payment.payment_date || '',
        submitted_at: payment.submitted_at || '',
        confirmed_at: payment.confirmed_at || payment.created_at || '',
        payment_method: payment.payment_method || 'Payment',
        proof: payment.proof || null,
        accounting_transaction_id: Number(payment.accounting_transaction_id || 0),
        amount: 0,
        payments: [],
      });
      const group = groups.get(key);
      group.amount += Number(payment.amount || 0);
      group.payments.push(payment);
      if (!group.proof && payment.proof) group.proof = payment.proof;
    });
    return [...groups.values()].sort((left, right) => String(right.confirmed_at || right.payment_date).localeCompare(String(left.confirmed_at || left.payment_date)));
  };

  const renderPayments = () => {
    if (!refs.payments) return;
    const settlements = settlementGroups().slice(0, 10);
    refs.payments.innerHTML = settlements.length ? settlements.map((settlement) => {
      const automatic = settlement.source_type === 'partner_weekly_bill';
      const orderLabel = automatic ? `${orderCountLabel(settlement.payments.length)} updated` : settlement.payments[0]?.order_id || 'Order payment';
      return `<div class="partner-sales-payment-row${automatic ? ' is-confirmed-bill' : ''}" data-settlement-open="${escapeHtml(settlement.key)}" tabindex="0" role="button" aria-label="Open settlement ${escapeHtml(settlement.reference || orderLabel)}">
        <div><strong>${currency(settlement.amount)}</strong><small>${escapeHtml(orderLabel)} · ${escapeHtml(automatic ? 'Confirmed partner bill' : settlement.payment_method)}</small></div>
        <span>${escapeHtml(dateLabel(settlement.confirmed_at || settlement.payment_date, automatic))}</span>
        ${automatic ? '<i aria-hidden="true">→</i>' : `<button type="button" data-void-payment="${Number(settlement.payments[0]?.id || 0)}" aria-label="Void payment for ${escapeHtml(settlement.payments[0]?.order_id || '')}" title="Void payment">Remove</button>`}
      </div>`;
    }).join('') : '<p class="partner-sales-empty">No payments recorded yet.</p>';
  };

  const itemUnitPrice = (order, item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const direct = item.unit_revenue ?? item.partner_price ?? item.partner_unit_price;
    if (direct !== undefined && direct !== null && Number.isFinite(Number(direct))) return Math.max(0, Number(direct));
    if (Number.isFinite(Number(item.line_revenue))) return Math.max(0, Number(item.line_revenue) / quantity);
    return Math.max(0, Number(order.order_total || 0) / Math.max(1, Number(order.units || quantity)));
  };

  const itemRows = (order, editing = false) => (order.items || []).map((item, lineIndex) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = itemUnitPrice(order, item);
    const line = Number(item.line_revenue ?? (unitPrice * quantity));
    return `<div class="partner-sales-item-row ${editing ? 'is-editing' : ''}"><div><strong>${escapeHtml(item.product || item.sku_label || item.sku_code || 'Product')}</strong><small>${escapeHtml([item.sku_code, item.flavor, item.size].filter(Boolean).join(' · '))}</small></div><span>${number(quantity)} units</span>${editing
      ? `<label class="partner-sales-price-editor"><small>Unit price</small><span><i>Rp</i><input type="number" min="0" max="1000000000000" step="1" value="${Math.round(unitPrice)}" data-order-price-input data-line-index="${lineIndex}" required></span></label>`
      : `<span>${currency(line)}</span>`}</div>`;
  }).join('');

  const paymentRows = (order) => order.payments?.length ? order.payments.map((payment) => `<button type="button" class="partner-sales-order-payment" data-settlement-open="${escapeHtml(paymentGroupKey(payment))}"><span>${escapeHtml(dateLabel(payment.confirmed_at || payment.payment_date, payment.source_type === 'partner_weekly_bill'))}</span><strong>${currency(payment.amount)}</strong><small>${escapeHtml([payment.payment_method, payment.reference_no].filter(Boolean).join(' · ') || 'Payment')}${payment.proof?.url ? ' · View proof' : ''}</small></button>`).join('') : '<p class="partner-sales-empty">No settlements recorded for this order.</p>';

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
      const editing = state.editingOrderId === order.id;
      const canPay = !['paid', 'cancelled'].includes(order.payment_status) && Number(order.outstanding_amount || 0) > 0;
      const cancelled = order.payment_status === 'cancelled';
      return `<article class="partner-sales-order ${expanded ? 'is-expanded' : ''} ${cancelled ? 'is-cancelled' : ''}" data-order-id="${escapeHtml(order.id)}">
        <div class="partner-sales-order-main" data-toggle-order="${escapeHtml(order.id)}" tabindex="0" role="button" aria-expanded="${expanded}">
          <div><strong>${escapeHtml(order.id)}</strong><small>${escapeHtml(dateLabel(order.order_timestamp, true))}</small></div>
          <div><strong>${escapeHtml(order.marketplace_platform || 'Unassigned')}</strong><small>${escapeHtml(order.customer_name || 'Customer not recorded')}</small></div>
          <div><strong>${number(order.units)} units</strong><small>${number(order.items?.length || 0)} line items</small></div>
          <span>${currency(order.order_total)}</span><span>${currency(order.paid_amount)}</span><span>${currency(order.outstanding_amount)}</span>
          <div class="partner-sales-status partner-sales-status-${escapeHtml(order.payment_status)}"><strong>${escapeHtml(statusLabel(order.payment_status))}</strong><small>${escapeHtml(orderStatusLabel(order.status))}</small></div>
          <button type="button" class="partner-sales-order-toggle" data-toggle-order="${escapeHtml(order.id)}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${escapeHtml(order.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>
        </div>
        <div class="partner-sales-order-detail" ${expanded ? '' : 'hidden'}>
          <section class="partner-sales-line-items"><header><span>Line items</span><div class="partner-sales-price-actions"><strong>${currency(order.order_total)}</strong>${!cancelled ? (editing ? `<button type="button" data-cancel-order-prices="${escapeHtml(order.id)}">Cancel</button><button type="button" class="is-save" data-save-order-prices="${escapeHtml(order.id)}">Save prices</button>` : `<button type="button" data-edit-order-prices="${escapeHtml(order.id)}">Edit prices</button>`) : ''}</div></header>${itemRows(order, editing)}${editing ? '<p class="admin-form-error partner-sales-price-error" data-order-price-error hidden></p>' : ''}</section>
          <section><header><span>Payment activity</span><strong>${currency(order.paid_amount)} paid</strong></header>${paymentRows(order)}</section>
          <aside><dl><div><dt>Order status</dt><dd>${escapeHtml(orderStatusLabel(order.status))}</dd></div><div><dt>Outstanding</dt><dd>${currency(order.outstanding_amount)}</dd></div><div><dt>Last updated</dt><dd>${escapeHtml(dateLabel(order.updated_at, true))}</dd></div></dl>${order.notes ? `<p>${escapeHtml(order.notes)}</p>` : ''}${canPay ? `<button type="button" class="admin-primary-btn" data-record-payment="${escapeHtml(order.id)}">Record payment</button>` : '<small>No payment action needed.</small>'}</aside>
        </div>
      </article>`;
    }).join('');
  };

  const disputeUrl = (periodStart = '') => {
    const url = new URL(disputesEndpoint, window.location.href);
    url.searchParams.set('action', 'dispute_history');
    url.searchParams.set('partner_code', partnerCode);
    if (periodStart) url.searchParams.set('period_start', periodStart);
    url.searchParams.set('_ts', String(Date.now()));
    return url.toString();
  };

  const disputeStatusLabel = (status) => ({ pending: 'Under review', accepted: 'Accepted', rejected: 'Rejected' }[status] || 'Resolved');

  const renderDisputeWindows = (history) => {
    const windows = Array.isArray(history?.windows) ? history.windows : [];
    const selectedStart = history?.window?.period_start || windows[0]?.period_start || '';
    if (refs.disputesWeek) {
      refs.disputesWeek.innerHTML = windows.length ? windows.map((window) => {
        const count = Number(window.dispute_count || 0);
        const detail = `${count} ${count === 1 ? 'dispute' : 'disputes'}${Number(window.pending_count || 0) ? ` · ${number(window.pending_count)} open` : ''}`;
        return `<option value="${escapeHtml(window.period_start)}" ${window.period_start === selectedStart ? 'selected' : ''}>${escapeHtml(window.period_label)} — ${escapeHtml(detail)}</option>`;
      }).join('') : '<option value="">No billing weeks available</option>';
      refs.disputesWeek.disabled = !windows.length;
    }
    if (refs.disputesSubmit) refs.disputesSubmit.disabled = !windows.length;
  };

  const disputeIcon = (status) => status === 'accepted'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>'
    : status === 'rejected'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"></path></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';

  const disputeItemMarkup = (item) => `<article class="partner-disputes-order-card">
    <div><strong>${escapeHtml(item.order_id || 'Order')}</strong><small>${escapeHtml(item.description || 'Order items')}</small><span>${escapeHtml([item.platform || 'Other', `${number(item.units || 0)} units`, item.customer_name].filter(Boolean).join(' · '))}</span></div>
    <strong>${currency(item.amount)}</strong>
  </article>`;

  const disputeMessageMarkup = (message) => {
    const side = message.side === 'finance' ? 'finance' : 'partner';
    return `<article class="partner-disputes-message is-${side}">
      <div><strong>${escapeHtml(message.author || (side === 'finance' ? 'Jenang Gemi Finance' : 'Partner'))}</strong><span>${escapeHtml(message.label || 'Message')}</span></div>
      <p>${escapeHtml(message.body || 'No message supplied.')}</p>
      <time>${escapeHtml(dateLabel(message.created_at, true))}</time>
    </article>`;
  };

  const disputeAttachmentMarkup = (attachment, dispute) => {
    const isImage = String(attachment.mime_type || '').startsWith('image/');
    return `<a href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener" class="partner-disputes-evidence-link ${isImage ? 'is-image' : 'is-document'}">
      ${isImage
        ? `<img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.label || 'Dispute attachment')} for ${escapeHtml(dispute.dispute_key || 'dispute')}" loading="lazy">`
        : '<span class="partner-disputes-file-preview"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"></path><path d="M14 3v5h5M9.5 13h5M9.5 16h5"></path></svg><strong>PDF</strong></span>'}
      <span><em>${escapeHtml(attachment.label || 'Billing attachment')}</em><strong>${escapeHtml(attachment.name || 'Attachment')}</strong><small>Open full ${isImage ? 'screenshot' : 'document'} · ${escapeHtml(dateLabel(attachment.created_at, true))}</small></span>
    </a>`;
  };

  const disputeCardMarkup = (dispute) => {
    const status = ['pending', 'accepted', 'rejected'].includes(dispute.status) ? dispute.status : 'pending';
    const items = Array.isArray(dispute.items) ? dispute.items : [];
    const messages = Array.isArray(dispute.messages) ? dispute.messages : [];
    const evidence = dispute.evidence && typeof dispute.evidence === 'object' ? dispute.evidence : null;
    const attachments = Array.isArray(dispute.attachments) && dispute.attachments.length
      ? dispute.attachments
      : (evidence ? [{ ...evidence, label: 'Finance evidence', created_at: dispute.resolved_at }] : []);
    return `<article class="partner-disputes-card is-${status}">
      <header>
        <div class="partner-disputes-status-icon">${disputeIcon(status)}</div>
        <div><span>${escapeHtml(dispute.dispute_key || `Dispute #${dispute.id || ''}`)}</span><h4>${escapeHtml(disputeStatusLabel(status))}</h4><small>Opened ${escapeHtml(dateLabel(dispute.created_at, true))}${dispute.resolved_at ? ` · resolved ${escapeHtml(dateLabel(dispute.resolved_at, true))}` : ''}</small></div>
        <strong>${currency(dispute.amount)}</strong>
      </header>
      <div class="partner-disputes-card-grid">
        <section class="partner-disputes-orders"><div class="partner-disputes-section-title"><span>Affected orders</span><strong>${number(items.length)}</strong></div>${items.length ? items.map(disputeItemMarkup).join('') : '<p class="partner-sales-empty">No affected orders were retained.</p>'}</section>
        <section class="partner-disputes-conversation"><div class="partner-disputes-section-title"><span>Conversation</span><strong>${number(messages.length)} messages</strong></div><div class="partner-disputes-thread">${messages.map(disputeMessageMarkup).join('')}</div></section>
        <aside class="partner-disputes-evidence"><div class="partner-disputes-section-title"><span>Attachments</span><strong>${attachments.length ? `${number(attachments.length)} ${attachments.length === 1 ? 'file' : 'files'}` : 'None'}</strong></div>${attachments.length
          ? `<div class="partner-disputes-attachment-list">${attachments.map((attachment) => disputeAttachmentMarkup(attachment, dispute)).join('')}</div>`
          : '<div class="partner-disputes-no-evidence"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 9 12l4 4 3-3 4 4"></path><rect x="3" y="4" width="18" height="16" rx="2"></rect></svg><strong>No attachments</strong><span>No screenshot or payment proof was stored for this billing week.</span></div>'}</aside>
      </div>
    </article>`;
  };

  const renderDisputeHistory = (history) => {
    const summary = history?.summary || {};
    const statuses = summary.statuses || {};
    const disputes = Array.isArray(history?.disputes) ? history.disputes : [];
    if (refs.disputesWindowLabel) refs.disputesWindowLabel.textContent = history?.window?.period_label || 'Weekly window';
    if (refs.disputesSummary) refs.disputesSummary.innerHTML = `
      <article><span>Disputes</span><strong>${number(summary.count || 0)}</strong><small>in this billing week</small></article>
      <article><span>Disputed value</span><strong>${currency(summary.amount || 0)}</strong><small>across affected orders</small></article>
      <article><span>Outcomes</span><strong>${number(statuses.accepted || 0)} / ${number(statuses.rejected || 0)}</strong><small>accepted / rejected · ${number(statuses.pending || 0)} open</small></article>`;
    if (refs.disputesList) refs.disputesList.innerHTML = disputes.length
      ? disputes.map(disputeCardMarkup).join('')
      : '<div class="partner-disputes-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg><strong>No disputes in this window</strong><p>This weekly bill has a clean history. Choose another week to continue reviewing the archive.</p></div>';
    if (refs.disputesPicker) refs.disputesPicker.hidden = true;
    if (refs.disputesHistory) refs.disputesHistory.hidden = false;
  };

  const showDisputePicker = () => {
    if (refs.disputesPicker) refs.disputesPicker.hidden = false;
    if (refs.disputesHistory) refs.disputesHistory.hidden = true;
    if (refs.disputesError) refs.disputesError.hidden = true;
  };

  const loadDisputes = async (periodStart = '') => {
    if (state.disputeLoading) return null;
    state.disputeLoading = true;
    if (refs.disputesSubmit) refs.disputesSubmit.disabled = true;
    if (refs.disputesError) refs.disputesError.hidden = true;
    try {
      const payload = await requestJson(disputeUrl(periodStart));
      state.disputePayload = payload.history || {};
      renderDisputeWindows(state.disputePayload);
      return state.disputePayload;
    } catch (error) {
      if (refs.disputesError) {
        refs.disputesError.textContent = error.message || 'Unable to load dispute history.';
        refs.disputesError.hidden = false;
      }
      return null;
    } finally {
      state.disputeLoading = false;
      if (refs.disputesSubmit) refs.disputesSubmit.disabled = !(state.disputePayload?.windows?.length);
    }
  };

  const openDisputes = async () => {
    if (!refs.disputesModal) return;
    refs.disputesModal.hidden = false;
    document.body.classList.add('partner-disputes-open');
    showDisputePicker();
    if (refs.disputesWeek) {
      refs.disputesWeek.disabled = true;
      refs.disputesWeek.innerHTML = '<option value="">Loading weekly windows…</option>';
    }
    state.disputePayload = null;
    await loadDisputes();
    refs.disputesWeek?.focus();
  };

  const closeDisputes = () => {
    if (refs.disputesModal) refs.disputesModal.hidden = true;
    document.body.classList.remove('partner-disputes-open');
    refs.disputesButton?.focus();
  };

  const render = () => {
    const payload = state.payload || {};
    const partner = payload.partner || {};
    if (refs.name) refs.name.textContent = partner.name || 'Partner';
    if (refs.code) refs.code.textContent = partner.code || partnerCode;
    if (refs.settings) refs.settings.href = `../partner-profile/?code=${encodeURIComponent(partner.code || partnerCode)}`;
    if (refs.portal) refs.portal.href = `https://partner.jenanggemi.com/${encodeURIComponent(partner.partner_slug || '')}/`;
    if (refs.stock) {
      refs.stock.hidden = partner.partner_class !== 'B';
      refs.stock.href = `../partner-stock-orders/?partner=${encodeURIComponent(partner.code || partnerCode)}`;
    }
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
  const closeSettlementDetail = () => {
    if (refs.settlementModal) refs.settlementModal.hidden = true;
    document.body.classList.remove('partner-settlement-open');
  };
  const openSettlementDetail = (key) => {
    const settlement = settlementGroups().find((candidate) => candidate.key === key);
    if (!settlement || !refs.settlementModal || !refs.settlementBody) return;
    const automatic = settlement.source_type === 'partner_weekly_bill';
    const proof = settlement.proof || null;
    const isPdf = proof?.mime_type === 'application/pdf';
    const orderRows = settlement.payments.map((payment) => {
      const order = (state.payload?.orders || []).find((candidate) => candidate.id === payment.order_id) || {};
      return `<article><div><strong>${escapeHtml(payment.order_id || 'Order')}</strong><small>${escapeHtml([order.marketplace_platform, order.customer_name].filter(Boolean).join(' · ') || 'Partner order')}</small></div><span><strong>${currency(payment.amount)}</strong><small>Marked paid</small></span></article>`;
    }).join('');
    refs.settlementBody.innerHTML = `
      <section class="partner-settlement-hero">
        <span>${automatic ? 'Confirmed partner bill' : 'Recorded order payment'}</span>
        <strong>${currency(settlement.amount)}</strong>
        <small>${escapeHtml(settlement.reference || settlement.payments[0]?.order_id || 'Settlement record')}</small>
      </section>
      <section class="partner-settlement-timeline">
        <div><i></i><span><small>${automatic ? 'Proof submitted by partner' : 'Payment recorded'}</small><strong>${escapeHtml(dateLabel(settlement.submitted_at || settlement.confirmed_at || settlement.payment_date, true))}</strong></span></div>
        <div><i></i><span><small>${automatic ? 'Confirmed by finance' : 'Entered in Partner Sales'}</small><strong>${escapeHtml(dateLabel(settlement.confirmed_at || settlement.payment_date, true))}</strong></span></div>
      </section>
      ${proof?.url ? `<section class="partner-settlement-proof"><header><div><span>Proof of payment</span><strong>${escapeHtml(proof.name || 'Payment proof')}</strong><small>${escapeHtml([proof.mime_type, proof.size_bytes ? fileSize(proof.size_bytes) : ''].filter(Boolean).join(' · '))}</small></div><a href="${escapeHtml(proof.url)}" target="_blank" rel="noopener">Open original ↗</a></header><div class="partner-settlement-proof-frame is-${isPdf ? 'pdf' : 'image'}">${isPdf ? `<object data="${escapeHtml(proof.url)}" type="application/pdf"><a href="${escapeHtml(proof.url)}" target="_blank" rel="noopener">Open payment proof</a></object>` : `<img src="${escapeHtml(proof.url)}" alt="Proof of payment for ${escapeHtml(settlement.reference || 'settlement')}">`}</div></section>` : '<section class="partner-settlement-no-proof"><strong>No proof attached</strong><span>This manually recorded payment predates proof capture.</span></section>'}
      <section class="partner-settlement-updates"><header><span>What was updated</span><strong>${orderCountLabel(settlement.payments.length)}</strong></header><div>${orderRows}</div></section>
      <footer><span>Accounting treatment</span><strong>${automatic ? `Cash received and order balances marked paid${settlement.accounting_transaction_id ? ` · transaction #${settlement.accounting_transaction_id}` : ''}` : 'Order balance updated manually'}</strong></footer>`;
    refs.settlementModal.hidden = false;
    document.body.classList.add('partner-settlement-open');
    refs.settlementModal.querySelector('[data-close-settlement-detail]')?.focus();
  };
  const showToast = (title = 'Payment recorded', message = 'The order balance is up to date.') => {
    if (!refs.toast) return;
    const heading = refs.toast.querySelector('strong');
    const copy = refs.toast.querySelector('span');
    if (heading) heading.textContent = title;
    if (copy) copy.textContent = message;
    refs.toast.hidden = false;
    window.setTimeout(() => { refs.toast.hidden = true; }, 3200);
  };

  document.querySelectorAll('[data-sales-period]').forEach((button) => button.addEventListener('click', () => setPeriod(button.dataset.salesPeriod || 'all')));
  $('[data-sales-apply]')?.addEventListener('click', () => { document.querySelectorAll('[data-sales-period]').forEach((button) => button.classList.remove('is-active')); load(); });
  refs.search?.addEventListener('input', () => { state.search = refs.search.value || ''; renderOrders(); });
  refs.statusFilter?.addEventListener('change', () => { state.status = refs.statusFilter.value || 'all'; renderOrders(); });

  refs.orders?.addEventListener('click', (event) => {
    const settlementButton = event.target.closest('[data-settlement-open]');
    if (settlementButton) { openSettlementDetail(settlementButton.dataset.settlementOpen || ''); return; }
    const paymentButton = event.target.closest('[data-record-payment]');
    if (paymentButton) { openPaymentModal(paymentButton.dataset.recordPayment); return; }
    const editPrices = event.target.closest('[data-edit-order-prices]');
    if (editPrices) { state.editingOrderId = editPrices.dataset.editOrderPrices || ''; renderOrders(); return; }
    const cancelPrices = event.target.closest('[data-cancel-order-prices]');
    if (cancelPrices) { state.editingOrderId = ''; renderOrders(); return; }
    const savePrices = event.target.closest('[data-save-order-prices]');
    if (savePrices) {
      const orderId = savePrices.dataset.saveOrderPrices || '';
      const orderNode = savePrices.closest('[data-order-id]');
      const errorNode = orderNode?.querySelector('[data-order-price-error]');
      const priceInputs = Array.from(orderNode?.querySelectorAll('[data-order-price-input]') || []);
      const invalidInput = priceInputs.find((input) => !(input instanceof HTMLInputElement) || !input.checkValidity() || input.value.trim() === '');
      if (invalidInput instanceof HTMLInputElement) { invalidInput.reportValidity(); invalidInput.focus(); return; }
      const prices = priceInputs.map((input) => ({
        line_index: Number(input.dataset.lineIndex || 0), unit_price: Number(input.value)
      }));
      savePrices.disabled = true;
      if (errorNode) errorNode.hidden = true;
      requestJson(endpoint, { method: 'POST', body: { action: 'update_order_prices', partner_code: partnerCode, order_id: orderId, prices } })
        .then(async () => { state.editingOrderId = ''; await load(); showToast('Prices updated', 'The order value and weekly bill now use the saved product prices.'); })
        .catch((error) => {
          savePrices.disabled = false;
          if (errorNode) { errorNode.textContent = error.message || 'Unable to update prices.'; errorNode.hidden = false; }
        });
      return;
    }
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
  document.querySelectorAll('[data-close-settlement-detail]').forEach((button) => button.addEventListener('click', closeSettlementDetail));
  refs.disputesButton?.addEventListener('click', openDisputes);
  document.querySelectorAll('[data-close-disputes]').forEach((button) => button.addEventListener('click', closeDisputes));
  $('[data-change-dispute-week]')?.addEventListener('click', showDisputePicker);
  refs.disputesForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const periodStart = refs.disputesWeek?.value || '';
    if (!periodStart) return;
    const history = await loadDisputes(periodStart);
    if (history) renderDisputeHistory(history);
  });
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
    const settlement = event.target.closest('[data-settlement-open]');
    if (settlement && !event.target.closest('[data-void-payment]')) {
      openSettlementDetail(settlement.dataset.settlementOpen || '');
      return;
    }
    const button = event.target.closest('[data-void-payment]');
    if (!button || !window.confirm('Remove this payment from the active settlement history? The audit record will be retained.')) return;
    button.disabled = true;
    try {
      await requestJson(endpoint, { method: 'POST', body: { action: 'void_payment', partner_code: partnerCode, payment_id: Number(button.dataset.voidPayment) } });
      await load();
    } catch (error) { setError(error.message || 'Unable to remove payment.'); }
  });
  refs.payments?.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key) || event.target.closest('[data-void-payment]')) return;
    const settlement = event.target.closest('[data-settlement-open]');
    if (!settlement) return;
    event.preventDefault();
    openSettlementDetail(settlement.dataset.settlementOpen || '');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && refs.settlementModal && !refs.settlementModal.hidden) { closeSettlementDetail(); return; }
    if (event.key === 'Escape' && refs.disputesModal && !refs.disputesModal.hidden) closeDisputes();
  });

  if (!partnerCode) {
    if (refs.loading) refs.loading.hidden = true;
    setError('Choose a partner profile to view its sales breakdown.');
    return;
  }
  load();
});
