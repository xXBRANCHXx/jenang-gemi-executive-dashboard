document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-whatsapp-order-history]');
  if (!root) return;

  const endpoint = root.dataset.endpoint || '../api/whatsapp-orders/';
  const refs = {
    body: root.querySelector('[data-history-body]'),
    status: root.querySelector('[data-history-status]'),
    error: root.querySelector('[data-history-error]'),
    search: root.querySelector('[data-history-search]'),
    statusFilter: root.querySelector('[data-history-status-filter]'),
    previous: root.querySelector('[data-history-previous]'),
    next: root.querySelector('[data-history-next]'),
    page: root.querySelector('[data-history-page]'),
    paymentDialog: root.querySelector('[data-history-payment-dialog]'),
    paymentForm: root.querySelector('[data-history-payment-form]'),
    paymentOrderId: root.querySelector('[data-history-payment-id]'),
    paymentError: root.querySelector('[data-history-payment-error]'),
    paymentCancel: root.querySelector('[data-history-payment-cancel]'),
    paymentConfirm: root.querySelector('[data-history-payment-confirm]')
  };
  const initialParams = new URLSearchParams(window.location.search);
  const state = {
    page: Math.max(1, Number(initialParams.get('page') || 1)),
    perPage: 50,
    query: initialParams.get('query') || '',
    status: initialParams.get('status') || '',
    orders: [],
    pagination: { page: 1, total_pages: 1, total: 0 },
    loading: false,
    paymentSaving: false,
    paymentOrderId: '',
    requestController: null,
    searchTimer: 0
  };
  const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const integer = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const dateTime = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta'
  });
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const money = (value) => currency.format(Number(value || 0));
  const formatDate = (value) => {
    const parsed = value ? new Date(value) : null;
    return parsed && Number.isFinite(parsed.getTime()) ? dateTime.format(parsed) : '—';
  };
  const statusLabel = (status) => ({
    PENDING_PUBLISH: 'Sending', PUBLISH_FAILED: 'Needs retry', IS_LISTED: 'Listed',
    IS_BEING_FULFILLED: 'Being fulfilled', FULFILLED: 'Fulfilled'
  }[status] || String(status || 'Unknown').replaceAll('_', ' '));
  const statusClass = (status) => String(status || 'unknown').toLowerCase().replaceAll('_', '-');
  const paymentLabel = (order) => {
    const status = String(order.payment_status || 'unpaid').toLowerCase();
    const method = { cash: 'Cash', bank: 'Bank' }[String(order.payment_method || '').toLowerCase()] || '';
    if (status === 'paid') return `Paid${method ? ` · ${method}` : ''}`;
    if (status === 'canceled') return 'Canceled';
    return order.pay_later ? 'Pay later' : 'Unpaid';
  };

  const setError = (message = '') => {
    if (!refs.error) return;
    refs.error.textContent = message;
    refs.error.hidden = !message;
  };

  const syncUrl = () => {
    const params = new URLSearchParams();
    if (state.query) params.set('query', state.query);
    if (state.status) params.set('status', state.status);
    if (state.page > 1) params.set('page', String(state.page));
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  };

  const renderSummary = (summary = {}) => {
    root.querySelectorAll('[data-history-summary]').forEach((node) => {
      const key = node.dataset.historySummary || '';
      node.textContent = ['customer_total', 'discount_total', 'merchandise_total', 'shipping_total'].includes(key)
        ? money(summary[key])
        : integer.format(Number(summary[key] || 0));
    });
  };

  const renderOrders = (orders = []) => {
    if (!refs.body) return;
    if (!orders.length) {
      refs.body.innerHTML = '<tr><td colspan="10" class="admin-empty">No WhatsApp orders match these filters.</td></tr>';
      return;
    }
    refs.body.innerHTML = orders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const itemCount = Number(order.item_count || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
      const url = `../whatsapp-order/?order=${encodeURIComponent(order.order_id)}`;
      const contact = order.customer?.phone || order.customer?.address || 'No contact details';
      const paymentStatus = String(order.payment_status || 'unpaid').toLowerCase();
      const canConfirmPayment = order.pay_later === true
        && order.can_confirm_payment === true
        && paymentStatus === 'unpaid';
      const payment = canConfirmPayment
        ? `<button type="button" class="whatsapp-history-pay-btn" data-history-confirm-payment="${escapeHtml(order.order_id)}">Mark paid</button>`
        : `<span class="whatsapp-history-payment-status is-${escapeHtml(paymentStatus)}">${escapeHtml(paymentLabel(order))}</span>`;
      return `<tr class="whatsapp-history-row" tabindex="0" role="link" data-order-url="${escapeHtml(url)}" aria-label="Open ${escapeHtml(order.order_id)}">
        <td><a href="${escapeHtml(url)}"><strong>${escapeHtml(order.order_id)}</strong><small>${escapeHtml(order.label_original_name || 'WhatsApp order')}</small></a></td>
        <td><strong>${escapeHtml(order.customer?.name || 'WhatsApp customer')}</strong><small>${escapeHtml(contact)}</small></td>
        <td><span class="whatsapp-history-status ${escapeHtml(statusClass(order.status))}">${escapeHtml(statusLabel(order.status))}</span></td>
        <td>${escapeHtml(integer.format(itemCount))}</td>
        <td><strong>${escapeHtml(money(order.merchandise_total))}</strong>${Number(order.discount_total || 0) > 0 ? `<small>−${escapeHtml(money(order.discount_total))}</small>` : ''}</td>
        <td>${escapeHtml(money(order.shipping_cost))}</td>
        <td><strong>${escapeHtml(money(Number(order.merchandise_total || 0) + Number(order.shipping_cost || 0)))}</strong></td>
        <td class="whatsapp-history-payment-cell">${payment}</td>
        <td>${escapeHtml(formatDate(order.created_at))}</td>
        <td><span class="whatsapp-history-open" aria-hidden="true">→</span></td>
      </tr>`;
    }).join('');
  };

  const renderPagination = () => {
    const pagination = state.pagination;
    if (refs.page) refs.page.textContent = `Page ${pagination.page} of ${pagination.total_pages}`;
    if (refs.previous) refs.previous.disabled = state.loading || pagination.page <= 1;
    if (refs.next) refs.next.disabled = state.loading || pagination.page >= pagination.total_pages;
  };

  const loadHistory = async () => {
    state.requestController?.abort();
    const controller = new AbortController();
    state.requestController = controller;
    state.loading = true;
    setError();
    if (refs.status) refs.status.textContent = 'Loading orders…';
    renderPagination();
    const params = new URLSearchParams({
      action: 'history', page: String(state.page), per_page: String(state.perPage)
    });
    if (state.query) params.set('query', state.query);
    if (state.status) params.set('status', state.status);
    try {
      const response = await fetch(`${endpoint}?${params}`, {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to load WhatsApp order history.');
      state.pagination = payload.pagination || state.pagination;
      state.page = Number(state.pagination.page || 1);
      renderSummary(payload.summary || {});
      state.orders = Array.isArray(payload.orders) ? payload.orders : [];
      renderOrders(state.orders);
      if (refs.status) refs.status.textContent = `${integer.format(state.pagination.total || 0)} order${Number(state.pagination.total || 0) === 1 ? '' : 's'} found`;
      syncUrl();
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setError(error instanceof Error ? error.message : 'Unable to load WhatsApp order history.');
        if (refs.status) refs.status.textContent = 'History unavailable';
      }
    } finally {
      if (state.requestController === controller) {
        state.loading = false;
        renderPagination();
      }
    }
  };

  if (refs.search) refs.search.value = state.query;
  if (refs.statusFilter) refs.statusFilter.value = state.status;
  refs.search?.addEventListener('input', () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      state.query = refs.search.value.trim();
      state.page = 1;
      loadHistory();
    }, 300);
  });
  refs.statusFilter?.addEventListener('change', () => {
    state.status = refs.statusFilter.value;
    state.page = 1;
    loadHistory();
  });
  refs.previous?.addEventListener('click', () => {
    if (state.page <= 1 || state.loading) return;
    state.page -= 1;
    loadHistory();
  });
  refs.next?.addEventListener('click', () => {
    if (state.page >= state.pagination.total_pages || state.loading) return;
    state.page += 1;
    loadHistory();
  });
  const closePaymentDialog = () => {
    if (state.paymentSaving) return;
    state.paymentOrderId = '';
    refs.paymentDialog?.close?.();
  };
  const openPaymentDialog = (orderId) => {
    const order = state.orders.find((item) => String(item.order_id || '') === orderId);
    if (!order || order.pay_later !== true || order.can_confirm_payment !== true) return;
    state.paymentOrderId = orderId;
    if (refs.paymentOrderId) refs.paymentOrderId.textContent = orderId;
    if (refs.paymentError) {
      refs.paymentError.textContent = '';
      refs.paymentError.hidden = true;
    }
    const cash = refs.paymentForm?.querySelector('input[name="payment_method"][value="cash"]');
    if (cash instanceof HTMLInputElement) cash.checked = true;
    refs.paymentDialog?.showModal?.();
  };
  const confirmPayment = async () => {
    const orderId = state.paymentOrderId;
    const method = refs.paymentForm?.querySelector('input[name="payment_method"]:checked')?.value || '';
    if (!orderId || !method || state.paymentSaving) return;
    state.paymentSaving = true;
    if (refs.paymentConfirm) {
      refs.paymentConfirm.disabled = true;
      refs.paymentConfirm.textContent = 'Confirming…';
    }
    try {
      const response = await fetch(`${endpoint}?action=confirm_payment`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, payment_method: method })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Payment could not be confirmed.');
      const paidOrder = payload.order || {};
      state.orders = state.orders.map((order) => String(order.order_id || '') === orderId
        ? { ...order, ...paidOrder, payment_status: 'paid', can_confirm_payment: false }
        : order);
      renderOrders(state.orders);
      state.paymentOrderId = '';
      refs.paymentDialog?.close?.();
      window.refreshDirectOrderUnpaidIndicator?.();
    } catch (error) {
      if (refs.paymentError) {
        refs.paymentError.textContent = error instanceof Error ? error.message : 'Payment could not be confirmed.';
        refs.paymentError.hidden = false;
      }
    } finally {
      state.paymentSaving = false;
      if (refs.paymentConfirm) {
        refs.paymentConfirm.disabled = false;
        refs.paymentConfirm.textContent = 'Confirm paid';
      }
    }
  };
  refs.paymentCancel?.addEventListener('click', closePaymentDialog);
  refs.paymentForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    confirmPayment();
  });
  refs.body?.addEventListener('click', (event) => {
    const paymentButton = event.target.closest('[data-history-confirm-payment]');
    if (paymentButton) {
      openPaymentDialog(paymentButton.dataset.historyConfirmPayment || '');
      return;
    }
    if (event.target.closest('a, button')) return;
    const row = event.target.closest('[data-order-url]');
    if (row?.dataset.orderUrl) window.location.href = row.dataset.orderUrl;
  });
  refs.body?.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const row = event.target.closest('[data-order-url]');
    if (!row?.dataset.orderUrl) return;
    event.preventDefault();
    window.location.href = row.dataset.orderUrl;
  });

  loadHistory();
});
