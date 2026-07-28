document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-whatsapp-order-detail]');
  if (!root) return;

  const endpoint = root.dataset.endpoint || '../api/whatsapp-orders/';
  const orderId = new URLSearchParams(window.location.search).get('order')?.trim() || '';
  const refs = {
    loading: root.querySelector('[data-detail-loading]'),
    content: root.querySelector('[data-detail-content]'),
    error: root.querySelector('[data-detail-error]'),
    items: root.querySelector('[data-detail-items]'),
    label: root.querySelector('[data-detail-label-link]')
  };
  const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const integer = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const percentage = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
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
  const setText = (selector, value) => {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  };

  const renderOrder = (order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = Number(order.merchandise_subtotal || 0);
    const merchandise = Number(order.merchandise_total || 0);
    const shipping = Number(order.shipping_cost || 0);
    const discount = Number(order.discount_total || 0);
    const cogs = items.reduce((sum, item) => sum + Number(item.unit_cogs || 0) * Number(item.quantity || 0), 0);
    const profit = merchandise - cogs;
    const margin = merchandise > 0 ? profit / merchandise * 100 : 0;
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    document.title = `${order.order_id} | WhatsApp Order`;
    setText('[data-detail-topbar-title]', order.order_id);
    setText('[data-detail-order-id]', order.order_id);
    setText('[data-detail-customer-name]', order.customer?.name || 'WhatsApp customer');
    setText('[data-detail-created]', `Created ${formatDate(order.created_at)}`);
    setText('[data-detail-item-count]', `${integer.format(itemCount)} item${itemCount === 1 ? '' : 's'} · ${integer.format(items.length)} SKU${items.length === 1 ? '' : 's'}`);
    const status = root.querySelector('[data-detail-status]');
    if (status) {
      status.textContent = statusLabel(order.status);
      status.className = `whatsapp-history-status ${statusClass(order.status)}`;
    }

    setText('[data-detail-metric="subtotal"]', money(subtotal));
    setText('[data-detail-metric="discount"]', money(discount));
    setText('[data-detail-metric="merchandise"]', money(merchandise));
    setText('[data-detail-metric="shipping"]', money(shipping));
    setText('[data-detail-metric="customer_total"]', money(merchandise + shipping));
    const discountKind = order.discount_type === 'percentage'
      ? `${percentage.format(Number(order.discount_value || 0))}% order discount · effective line allocation below`
      : order.discount_type === 'sale_price'
        ? `Order sale price ${money(order.discount_value)}`
        : discount > 0 ? 'Item-level discounts' : 'No discount';
    setText('[data-detail-discount-kind]', discountKind);

    ['name', 'phone', 'address'].forEach((key) => {
      setText(`[data-detail-customer="${key}"]`, order.customer?.[key] || '—');
    });
    setText('[data-detail-notes]', order.notes || '—');
    setText('[data-detail-economics="cogs"]', money(cogs));
    setText('[data-detail-economics="profit"]', money(profit));
    setText('[data-detail-economics="margin"]', `${percentage.format(margin)}%`);
    setText('[data-detail-time="created"]', formatDate(order.created_at));
    setText('[data-detail-time="listed"]', formatDate(order.listed_at));
    setText('[data-detail-time="deadline"]', formatDate(order.deadline_at));
    setText('[data-detail-time="fulfilled"]', formatDate(order.fulfilled_at));

    if (refs.label) {
      refs.label.href = `${endpoint}?${new URLSearchParams({ action: 'label', order: order.order_id })}`;
      refs.label.hidden = !order.has_label;
    }
    if (refs.items) {
      refs.items.innerHTML = items.length ? items.map((item) => {
        const quantity = Number(item.quantity || 0);
        const gross = quantity * Number(item.unit_price || 0);
        const itemDiscount = Number(item.discount_total || 0);
        return `<tr>
          <td><strong>${escapeHtml(item.product_name || item.sku)}</strong><small>${escapeHtml(item.sku)}${item.brand_name ? ` · ${escapeHtml(item.brand_name)}` : ''}</small></td>
          <td>${escapeHtml(integer.format(quantity))}</td>
          <td>${escapeHtml(money(item.unit_price))}</td>
          <td>${escapeHtml(money(gross))}</td>
          <td>${itemDiscount > 0 ? `<strong class="is-discount">−${escapeHtml(money(itemDiscount))}</strong><small>${escapeHtml(percentage.format(item.discount_rate || 0))}% effective</small>` : '—'}</td>
          <td><strong>${escapeHtml(money(item.line_total))}</strong></td>
        </tr>`;
      }).join('') : '<tr><td colspan="6" class="admin-empty">No product rows were saved for this order.</td></tr>';
    }

    if (refs.loading) refs.loading.hidden = true;
    if (refs.content) refs.content.hidden = false;
  };

  const loadOrder = async () => {
    if (!orderId) throw new Error('No WhatsApp order was selected. Return to history and choose an order.');
    const params = new URLSearchParams({ action: 'order', order: orderId });
    const response = await fetch(`${endpoint}?${params}`, {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to load this WhatsApp order.');
    renderOrder(payload.order || {});
  };

  loadOrder().catch((error) => {
    if (refs.loading) refs.loading.hidden = true;
    if (refs.error) {
      refs.error.textContent = error instanceof Error ? error.message : 'Unable to load this WhatsApp order.';
      refs.error.hidden = false;
    }
  });
});
