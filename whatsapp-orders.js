document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-whatsapp-orders]');
  if (!root) return;

  const endpoint = root.dataset.endpoint || '../api/whatsapp-orders/';
  const form = root.querySelector('[data-order-form]');
  const skuList = root.querySelector('[data-sku-list]');
  const skuSearch = root.querySelector('[data-sku-search]');
  const companyFilter = root.querySelector('[data-company-filter]');
  const productFilter = root.querySelector('[data-product-filter]');
  const flavorFilter = root.querySelector('[data-flavor-filter]');
  const cartList = root.querySelector('[data-cart-list]');
  const cartCount = root.querySelector('[data-cart-count]');
  const labelInput = root.querySelector('[data-label-input]');
  const labelName = root.querySelector('[data-label-name]');
  const deadlineInput = root.querySelector('[data-deadline-input]');
  const deadlineValue = root.querySelector('[data-deadline-value]');
  const merchandiseTotal = root.querySelector('[data-merchandise-total]');
  const shippingTotal = root.querySelector('[data-shipping-total]');
  const customerTotal = root.querySelector('[data-customer-total]');
  const submitButton = root.querySelector('[data-submit-order]');
  const formError = root.querySelector('[data-form-error]');
  const orderList = root.querySelector('[data-order-list]');
  const refreshButton = root.querySelector('[data-refresh-orders]');
  const shippingInput = form?.elements.namedItem('shipping_cost');
  const customerNameInput = form?.elements.namedItem('customer_name');

  const state = { skus: [], cart: new Map(), company: '', product: '', flavor: '', submitting: false };
  const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const money = (value) => currency.format(Number(value || 0));

  const request = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const setError = (message = '') => {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = !message;
  };

  const totals = () => {
    const merchandise = [...state.cart.values()].reduce(
      (sum, item) => sum + Math.max(1, Number(item.quantity || 1)) * Math.max(0, Number(item.unit_price || 0)),
      0
    );
    const shipping = Math.max(0, Number(shippingInput?.value || 0));
    return { merchandise, shipping, customer: merchandise + shipping };
  };

  const updateSubmitState = () => {
    const ready = state.cart.size > 0 && Boolean(labelInput?.files?.[0]) && Boolean(customerNameInput?.value.trim());
    if (submitButton) {
      submitButton.disabled = state.submitting || !ready;
      submitButton.textContent = state.submitting ? 'Sending to Store Ops…' : 'Send listed order to Store Ops';
    }
  };

  const renderTotals = () => {
    const values = totals();
    if (merchandiseTotal) merchandiseTotal.textContent = money(values.merchandise);
    if (shippingTotal) shippingTotal.textContent = money(values.shipping);
    if (customerTotal) customerTotal.textContent = money(values.customer);
    updateSubmitState();
  };

  const uniqueLabels = (values) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  const renderFilters = () => {
    const companies = uniqueLabels(state.skus.map((sku) => sku.brand_name));
    const companySource = state.company
      ? state.skus.filter((sku) => sku.brand_name === state.company)
      : state.skus;
    const products = uniqueLabels(companySource.map((sku) => sku.base_product_name));
    if (state.product && !products.includes(state.product)) state.product = '';
    const flavorSource = state.product
      ? companySource.filter((sku) => sku.base_product_name === state.product)
      : companySource;
    const flavors = uniqueLabels(flavorSource.map((sku) => sku.flavor_name));
    if (state.flavor && !flavors.includes(state.flavor)) state.flavor = '';
    if (companyFilter) {
      companyFilter.innerHTML = ['', ...companies].map((value) => `<button type="button" class="${state.company === value ? 'is-active' : ''}" data-company-value="${escapeHtml(value)}">${escapeHtml(value || 'All companies')}</button>`).join('');
    }
    if (productFilter) {
      const visibleCompanies = state.company ? [state.company] : companies;
      const groups = visibleCompanies.map((company) => {
        const companyProducts = uniqueLabels(state.skus
          .filter((sku) => sku.brand_name === company)
          .map((sku) => sku.base_product_name));
        const buttons = companyProducts.map((product) => `<button type="button" class="${state.company === company && state.product === product ? 'is-active' : ''}" data-product-company="${escapeHtml(company)}" data-product-value="${escapeHtml(product)}">${escapeHtml(product)}</button>`).join('');
        return `<div class="whatsapp-product-company-group"><span>${escapeHtml(company)}</span><div>${buttons}</div></div>`;
      }).join('');
      productFilter.innerHTML = `<button type="button" class="${state.product === '' ? 'is-active' : ''}" data-product-company="${escapeHtml(state.company)}" data-product-value="">All products</button><div class="whatsapp-product-company-groups">${groups}</div>`;
    }
    if (flavorFilter) {
      flavorFilter.innerHTML = ['', ...flavors].map((value) => `<button type="button" class="${state.flavor === value ? 'is-active' : ''}" data-flavor-value="${escapeHtml(value)}">${escapeHtml(value || 'All')}</button>`).join('');
    }
  };

  const renderCatalog = () => {
    if (!skuList) return;
    const query = String(skuSearch?.value || '').trim().toLowerCase();
    const rows = state.skus.filter((sku) => {
      if (state.company && sku.brand_name !== state.company) return false;
      if (state.product && sku.base_product_name !== state.product) return false;
      if (state.flavor && sku.flavor_name !== state.flavor) return false;
      return !query || [sku.sku, sku.tag, sku.product_name, sku.brand_name, sku.flavor_name]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    skuList.innerHTML = rows.length ? rows.map((sku) => {
      const selected = state.cart.get(sku.sku);
      const available = Math.max(0, Number(sku.current_stock || 0));
      return `<article class="whatsapp-sku-card${selected ? ' is-selected' : ''}">
        <div><span>${escapeHtml(sku.sku)} · ${escapeHtml(sku.tag || 'No tag')}</span><strong>${escapeHtml(sku.product_name || sku.sku)}</strong><small>Stock ${escapeHtml(sku.current_stock)} · ${escapeHtml(money(sku.sale_price))}</small></div>
        <button type="button" class="whatsapp-sku-add" data-add-sku="${escapeHtml(sku.sku)}" aria-label="Add ${escapeHtml(sku.product_name || sku.sku)}"${available < 1 || Number(selected?.quantity || 0) >= available ? ' disabled' : ''}><span aria-hidden="true">+</span> Add${selected ? ` (${escapeHtml(selected.quantity)})` : ''}</button>
      </article>`;
    }).join('') : '<p class="admin-empty">No SKU matches this search.</p>';
  };

  const renderCart = () => {
    if (!cartList) return;
    const items = [...state.cart.values()];
    if (cartCount) cartCount.textContent = `${items.length} SKU${items.length === 1 ? '' : 's'}`;
    cartList.innerHTML = items.length ? items.map((item) => `<article class="whatsapp-cart-row" data-cart-row="${escapeHtml(item.sku)}">
      <div class="whatsapp-cart-row-title"><span>${escapeHtml(item.sku)}</span><strong>${escapeHtml(item.product_name)}</strong></div>
      <div class="whatsapp-cart-row-controls">
        <label class="whatsapp-quantity-field"><span>Qty</span><div><button type="button" data-cart-delta="-1" data-cart-sku="${escapeHtml(item.sku)}">−</button><input type="number" min="1" max="${escapeHtml(Math.max(1, Number(item.current_stock || 1)))}" step="1" value="${escapeHtml(item.quantity)}" data-cart-quantity="${escapeHtml(item.sku)}"><button type="button" data-cart-delta="1" data-cart-sku="${escapeHtml(item.sku)}"${Number(item.quantity || 0) >= Number(item.current_stock || 0) ? ' disabled' : ''}>+</button></div></label>
        <label class="whatsapp-price-field"><span>Unit price</span><div><b>Rp</b><input type="number" min="0" max="99999999999999" step="1" value="${escapeHtml(item.unit_price)}" data-cart-price="${escapeHtml(item.sku)}"></div></label>
        <button type="button" class="whatsapp-remove-sku" data-remove-sku="${escapeHtml(item.sku)}" aria-label="Remove ${escapeHtml(item.sku)}"><span class="whatsapp-trash-icon" aria-hidden="true"></span></button>
      </div>
      <small>${escapeHtml(money(Number(item.quantity) * Number(item.unit_price)))}</small>
    </article>`).join('') : '<p class="admin-empty">Select at least one SKU.</p>';
    renderTotals();
  };

  const statusLabel = (status) => ({
    PENDING_PUBLISH: 'Sending', PUBLISH_FAILED: 'Needs retry', IS_LISTED: 'Listed',
    IS_BEING_FULFILLED: 'Being fulfilled', FULFILLED: 'Fulfilled'
  }[status] || String(status || 'Unknown').replaceAll('_', ' '));

  const renderOrders = (orders) => {
    if (!orderList) return;
    orderList.innerHTML = orders.length ? orders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const failed = order.status === 'PUBLISH_FAILED';
      return `<article class="whatsapp-history-card${failed ? ' has-error' : ''}">
        <div class="whatsapp-history-card-main">
          <div class="whatsapp-history-id"><span>${escapeHtml(order.order_id)}</span><strong>${escapeHtml(order.customer?.name || 'Customer')}</strong></div>
          <div class="whatsapp-history-meta"><span>${escapeHtml(quantity)} item${quantity === 1 ? '' : 's'}</span><span>${escapeHtml(money(order.merchandise_total))} + ${escapeHtml(money(order.shipping_cost))} shipping</span><span>${escapeHtml(dateTime.format(new Date(order.created_at)))}</span></div>
        </div>
        <div class="whatsapp-history-card-state">
          <span class="whatsapp-status is-${escapeHtml(String(order.status || '').toLowerCase().replaceAll('_', '-'))}">${escapeHtml(statusLabel(order.status))}</span>
          ${failed ? `<button type="button" class="admin-ghost-btn" data-retry-order="${escapeHtml(order.order_id)}">Retry Store Ops</button>` : ''}
        </div>
        ${order.publication_error ? `<p>${escapeHtml(order.publication_error)}</p>` : ''}
      </article>`;
    }).join('') : '<p class="admin-empty">No WhatsApp orders yet.</p>';
  };

  const loadCatalog = async () => {
    try {
      const data = await request(`${endpoint}?action=catalog`);
      state.skus = Array.isArray(data.skus) ? data.skus : [];
      renderFilters();
      renderCatalog();
    } catch (error) {
      if (skuList) skuList.innerHTML = `<p class="admin-form-error">${escapeHtml(error.message)}</p>`;
    }
  };

  const loadOrders = async () => {
    if (refreshButton) refreshButton.disabled = true;
    try {
      const data = await request(`${endpoint}?action=list`);
      renderOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      if (orderList) orderList.innerHTML = `<p class="admin-form-error">${escapeHtml(error.message)}</p>`;
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  };

  skuList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-sku]');
    if (!button) return;
    const sku = state.skus.find((row) => row.sku === button.dataset.addSku);
    if (!sku) return;
    const existing = state.cart.get(sku.sku);
    const available = Math.max(0, Number(sku.current_stock || 0));
    if (available < 1 || Number(existing?.quantity || 0) >= available) return;
    state.cart.set(sku.sku, existing
      ? { ...existing, quantity: Math.min(available, Number(existing.quantity || 0) + 1) }
      : { ...sku, quantity: 1, unit_price: Math.max(0, Number(sku.sale_price || 0)) });
    renderCatalog();
    renderCart();
  });

  cartList?.addEventListener('click', (event) => {
    const deltaButton = event.target.closest('[data-cart-delta]');
    if (deltaButton) {
      const sku = deltaButton.dataset.cartSku || '';
      const item = state.cart.get(sku);
      if (!item) return;
      const nextQuantity = Number(item.quantity || 1) + Number(deltaButton.dataset.cartDelta || 0);
      if (nextQuantity < 1) state.cart.delete(sku);
      else state.cart.set(sku, { ...item, quantity: Math.min(Math.max(1, Number(item.current_stock || 1)), nextQuantity) });
      renderCatalog();
      renderCart();
      return;
    }
    const button = event.target.closest('[data-remove-sku]');
    if (!button) return;
    state.cart.delete(button.dataset.removeSku);
    renderCatalog();
    renderCart();
  });

  cartList?.addEventListener('change', (event) => {
    const input = event.target;
    const sku = input.dataset.cartQuantity || input.dataset.cartPrice;
    if (!sku || !state.cart.has(sku)) return;
    const item = state.cart.get(sku);
    if (input.dataset.cartQuantity) item.quantity = Math.max(1, Math.min(Math.max(1, Number(item.current_stock || 1)), Number(input.value || 1)));
    if (input.dataset.cartPrice) item.unit_price = Math.max(0, Number(input.value || 0));
    state.cart.set(sku, item);
    renderCart();
  });

  skuSearch?.addEventListener('input', renderCatalog);
  companyFilter?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-company-value]');
    if (!button) return;
    state.company = button.dataset.companyValue || '';
    state.product = '';
    state.flavor = '';
    renderFilters();
    renderCatalog();
  });
  productFilter?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-value]');
    if (!button) return;
    state.company = button.dataset.productCompany || state.company;
    state.product = button.dataset.productValue || '';
    state.flavor = '';
    renderFilters();
    renderCatalog();
  });
  flavorFilter?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-flavor-value]');
    if (!button) return;
    state.flavor = button.dataset.flavorValue || '';
    renderFilters();
    renderCatalog();
  });
  customerNameInput?.addEventListener('input', updateSubmitState);
  shippingInput?.addEventListener('input', renderTotals);
  deadlineInput?.addEventListener('input', () => {
    if (deadlineValue) deadlineValue.textContent = `${deadlineInput.value}h`;
  });
  labelInput?.addEventListener('change', () => {
    const file = labelInput.files?.[0];
    if (labelName) labelName.textContent = file ? file.name : 'Choose shipping label';
    updateSubmitState();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError();
    if (!form.reportValidity() || !state.cart.size || !labelInput?.files?.[0]) return;
    state.submitting = true;
    updateSubmitState();
    const fields = new FormData(form);
    const label = labelInput.files[0];
    const payload = {
      customer_name: fields.get('customer_name'), customer_phone: fields.get('customer_phone'),
      customer_address: fields.get('customer_address'), notes: fields.get('notes'),
      shipping_cost: Number(fields.get('shipping_cost') || 0),
      deadline_hours: Number(fields.get('deadline_hours') || 24),
      items: [...state.cart.values()].map((item) => ({ sku: item.sku, quantity: item.quantity, unit_price: item.unit_price }))
    };
    const body = new FormData();
    body.append('payload', JSON.stringify(payload));
    body.append('label', label, label.name);
    try {
      await request(`${endpoint}?action=create`, { method: 'POST', body });
      form.reset();
      state.cart.clear();
      if (deadlineValue) deadlineValue.textContent = '24h';
      if (labelName) labelName.textContent = 'Choose shipping label';
      renderCatalog();
      renderCart();
      await loadOrders();
    } catch (error) {
      setError(error.message);
      await loadOrders();
    } finally {
      state.submitting = false;
      updateSubmitState();
    }
  });

  orderList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-retry-order]');
    if (!button || button.disabled) return;
    button.disabled = true;
    try {
      await request(`${endpoint}?action=retry`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: button.dataset.retryOrder })
      });
    } catch (error) {
      setError(error.message);
    } finally {
      await loadOrders();
    }
  });
  refreshButton?.addEventListener('click', loadOrders);

  renderCart();
  loadCatalog();
  loadOrders();
});
