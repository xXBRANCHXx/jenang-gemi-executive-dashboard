document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-sku-db]');
  if (!root) return;

  const endpoint = root.dataset.skuDbEndpoint || '../api/sku-db/';
  const role = root.dataset.skuRole || 'requester';
  const username = root.dataset.skuUsername || '';
  const themeStorageKey = 'jg-admin-theme';
  const brandSessionStorageKey = 'jg-sku-db-selected-brand';

  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');
  const masterError = document.querySelector('[data-master-form-error]');
  const requestError = document.querySelector('[data-request-error]');
  const requestSubmitError = document.querySelector('[data-request-submit-error]');
  const setupError = document.querySelector('[data-setup-error]');
  const applyError = document.querySelector('[data-apply-error]');
  const cogsError = document.querySelector('[data-cogs-error]');
  const inventoryError = document.querySelector('[data-inventory-error]');
  const approvalError = document.querySelector('[data-approval-error]');
  const skuPreview = document.querySelector('[data-sku-preview]');
  const applyPreview = document.querySelector('[data-apply-preview]');
  const applyPanel = document.querySelector('[data-apply-panel]');
  const setupForm = document.querySelector('[data-setup-form]');
  const applyForm = document.querySelector('[data-apply-form]');
  const requestForm = document.querySelector('[data-request-form]');
  const cogsModal = document.querySelector('[data-cogs-modal]');
  const cogsForm = document.querySelector('[data-cogs-form]');
  const cogsApplicationType = cogsForm?.querySelector('[data-cogs-application-type]');
  const cogsEndMode = cogsForm?.querySelector('[data-cogs-end-mode]');
  const inventoryModal = document.querySelector('[data-inventory-modal]');
  const inventoryForm = document.querySelector('[data-inventory-form]');
  const inventoryAction = inventoryForm?.querySelector('[data-inventory-action]');
  const approvalModal = document.querySelector('[data-approval-modal]');
  const approvalForm = document.querySelector('[data-approval-form]');
  const approvalSummary = document.querySelector('[data-approval-summary]');
  const approvalRequester = document.querySelector('[data-approval-requester]');
  const requestList = document.querySelector('[data-request-list]');
  const tableBody = document.querySelector('[data-sku-table-body]');
  const brandList = document.querySelector('[data-brand-list]');
  const unitList = document.querySelector('[data-unit-list]');
  const flavorList = document.querySelector('[data-flavor-list]');
  const productList = document.querySelector('[data-product-list]');
  const searchInput = document.querySelector('[data-sku-search]');
  const filterBrand = document.querySelector('[data-filter-brand]');
  const filterUnit = document.querySelector('[data-filter-unit]');
  const filterFlavor = document.querySelector('[data-filter-flavor]');
  const filterProduct = document.querySelector('[data-filter-product]');
  const brandSelects = document.querySelectorAll('[data-brand-select]');
  const skuBrandSelect = document.querySelector('[data-sku-brand-select]');
  const unitSelect = document.querySelector('[data-unit-select]');
  const flavorSelect = document.querySelector('[data-flavor-select]');
  const productSelect = document.querySelector('[data-product-select]');

  const state = {
    database: {
      meta: { version: '1.00.00' },
      brands: [],
      units: [],
      skus: []
    },
    requests: [],
    activeApprovalRequestId: null
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const requestJson = async (options = {}) => {
    const response = await fetch(endpoint, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      credentials: 'same-origin',
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  };

  const setError = (node, message) => {
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || '';
  };

  const setRequired = (field, required) => {
    if (field && 'required' in field) field.required = required;
  };

  const syncCogsFields = () => {
    if (!(cogsForm instanceof HTMLFormElement)) return;
    const mode = String(cogsApplicationType?.value || 'next_purchase');
    const endMode = String(cogsEndMode?.value || 'until_next_change');
    const dateWrap = cogsForm.querySelector('[data-cogs-date-wrap]');
    const endModeWrap = cogsForm.querySelector('[data-cogs-end-mode-wrap]');
    const endDateWrap = cogsForm.querySelector('[data-cogs-end-date-wrap]');
    const batchWrap = cogsForm.querySelector('[data-cogs-batch-wrap]');
    const startDate = cogsForm.elements.start_date;
    const endDate = cogsForm.elements.end_date;
    const batchNumber = cogsForm.elements.batch_number;

    if (dateWrap instanceof HTMLElement) dateWrap.hidden = mode !== 'by_date';
    if (endModeWrap instanceof HTMLElement) endModeWrap.hidden = mode !== 'by_date';
    if (endDateWrap instanceof HTMLElement) endDateWrap.hidden = !(mode === 'by_date' && endMode === 'custom_date');
    if (batchWrap instanceof HTMLElement) batchWrap.hidden = mode !== 'batch_number';

    setRequired(startDate, mode === 'by_date');
    setRequired(endDate, mode === 'by_date' && endMode === 'custom_date');
    setRequired(batchNumber, mode === 'batch_number');

    if (mode !== 'by_date') {
      startDate.value = '';
      endDate.value = '';
      if (cogsEndMode instanceof HTMLSelectElement) cogsEndMode.value = 'until_next_change';
    }

    if (!(mode === 'by_date' && endMode === 'custom_date')) {
      endDate.value = '';
    }

    if (mode !== 'batch_number') {
      batchNumber.value = '';
    }
  };

  const syncInventoryFields = () => {
    if (!(inventoryForm instanceof HTMLFormElement)) return;
    const mode = String(inventoryAction?.value || 'set_total');
    const newStockWrap = inventoryForm.querySelector('[name="new_stock"]')?.closest('label');
    const addWrap = inventoryForm.querySelector('[data-inventory-add-wrap]');
    const batchWrap = inventoryForm.querySelector('[data-inventory-batch-wrap]');
    const newStock = inventoryForm.elements.new_stock;
    const quantityToAdd = inventoryForm.elements.quantity_to_add;
    const batchNumber = inventoryForm.elements.batch_number;

    if (newStockWrap instanceof HTMLElement) newStockWrap.hidden = mode === 'add_stock';
    if (addWrap instanceof HTMLElement) addWrap.hidden = mode !== 'add_stock';
    if (batchWrap instanceof HTMLElement) batchWrap.hidden = mode !== 'add_stock';

    setRequired(newStock, mode !== 'add_stock');
    setRequired(quantityToAdd, mode === 'add_stock');
    setRequired(batchNumber, mode === 'add_stock');

    if (mode !== 'add_stock') {
      quantityToAdd.value = '';
      batchNumber.value = '';
    } else {
      newStock.value = '';
    }
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
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
    });
  };

  const buildOptions = (items, placeholder) => [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...items.map((item) => `<option value="${escapeHtml(item.id || '')}">${escapeHtml(item.code || '--')} · ${escapeHtml(item.name || '')}</option>`)
  ].join('');

  const buildFilterOptions = (values, placeholder) => {
    const normalized = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return [`<option value="">${escapeHtml(placeholder)}</option>`, ...normalized.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join('');
  };

  const findBrand = (brandId) => state.database.brands.find((brand) => brand.id === brandId) || null;

  const allBrandSelects = () => [...brandSelects, ...(skuBrandSelect ? [skuBrandSelect] : [])];

  const getStoredBrandId = () => {
    try {
      return window.sessionStorage.getItem(brandSessionStorageKey) || '';
    } catch (_error) {
      return '';
    }
  };

  const storeBrandId = (brandId) => {
    try {
      if (brandId) {
        window.sessionStorage.setItem(brandSessionStorageKey, brandId);
      } else {
        window.sessionStorage.removeItem(brandSessionStorageKey);
      }
    } catch (_error) {
      // Ignore sessionStorage failures and keep the page usable.
    }
  };

  const resolveSelectedBrandId = () => {
    const storedBrandId = getStoredBrandId();
    if (storedBrandId && state.database.brands.some((brand) => brand.id === storedBrandId)) {
      return storedBrandId;
    }

    const liveBrandId = allBrandSelects()
      .map((select) => String(select.value || ''))
      .find((brandId) => brandId && state.database.brands.some((brand) => brand.id === brandId));

    return liveBrandId || '';
  };

  const applySharedBrandSelection = (brandId) => {
    const normalizedBrandId = brandId && state.database.brands.some((brand) => brand.id === brandId) ? brandId : '';

    brandSelects.forEach((select) => {
      select.value = normalizedBrandId;
    });

    if (skuBrandSelect) {
      skuBrandSelect.value = normalizedBrandId || (state.database.brands[0]?.id || '');
    }

    storeBrandId(normalizedBrandId);
  };

  const activePrimaryForm = () => requestForm || setupForm;

  const getPrimarySelections = () => {
    const form = activePrimaryForm();
    if (!(form instanceof HTMLFormElement)) return null;
    return {
      brand_id: String(form.elements.brand_id?.value || ''),
      unit_id: String(form.elements.unit_id?.value || ''),
      volume: String(form.elements.volume?.value || '').trim(),
      flavor_id: String(form.elements.flavor_id?.value || ''),
      product_id: String(form.elements.product_id?.value || '')
    };
  };

  const refreshBrandSelects = () => {
    const brands = state.database.brands || [];
    const selectedBrandId = resolveSelectedBrandId();

    brandSelects.forEach((select) => {
      select.innerHTML = buildOptions(brands, 'Select brand');
    });

    if (skuBrandSelect) {
      skuBrandSelect.innerHTML = buildOptions(brands, 'Select brand');
    }

    applySharedBrandSelection(selectedBrandId);
  };

  const refreshUnitSelect = () => {
    if (!unitSelect) return;
    const current = unitSelect.value;
    const units = state.database.units || [];
    unitSelect.innerHTML = buildOptions(units, 'Select unit');
    unitSelect.value = current && units.some((unit) => unit.id === current) ? current : (units[0]?.id || '');
  };

  const refreshBrandBoundSelects = () => {
    const brand = findBrand(skuBrandSelect?.value || '');
    const flavors = brand?.flavors || [];
    const products = brand?.products || [];

    if (flavorSelect) {
      const current = flavorSelect.value;
      flavorSelect.innerHTML = buildOptions(flavors, 'Select flavor');
      flavorSelect.value = current && flavors.some((item) => item.id === current) ? current : (flavors[0]?.id || '');
    }

    if (productSelect) {
      const current = productSelect.value;
      productSelect.innerHTML = buildOptions(products, 'Select product');
      productSelect.value = current && products.some((item) => item.id === current) ? current : (products[0]?.id || '');
    }
  };

  const computeSkuPreview = () => {
    const values = getPrimarySelections();
    if (!values) return 'Waiting for complete selection';

    const brand = findBrand(values.brand_id);
    const unit = state.database.units.find((item) => item.id === values.unit_id);
    const flavor = brand?.flavors?.find((item) => item.id === values.flavor_id);
    const product = brand?.products?.find((item) => item.id === values.product_id);

    if (!brand || !unit || !flavor || !product || !/^\d{1,3}(\.\d)?$/.test(values.volume)) {
      return 'Waiting for complete selection';
    }

    const scaled = String(Math.round(Number(values.volume) * 10)).padStart(4, '0');
    return `${brand.code}${unit.code}${scaled}${flavor.code}${product.code}`;
  };

  const renderPreview = () => {
    const preview = computeSkuPreview();
    if (skuPreview) skuPreview.textContent = preview;
    if (applyPreview) applyPreview.textContent = preview;
  };

  const renderCounts = () => {
    const versionNode = document.querySelector('[data-sku-version]');
    const brandCountNode = document.querySelector('[data-sku-brand-count]');
    const unitCountNode = document.querySelector('[data-sku-unit-count]');
    const skuCountNode = document.querySelector('[data-sku-count]');

    if (versionNode) versionNode.textContent = state.database.meta?.version || '1.00.00';
    if (brandCountNode) brandCountNode.textContent = String(state.database.brands.length);
    if (unitCountNode) unitCountNode.textContent = String(state.database.units.length);
    if (skuCountNode) skuCountNode.textContent = String(state.database.skus.length);
  };

  const renderMasterLists = () => {
    if (brandList) {
      brandList.innerHTML = state.database.brands.length
        ? state.database.brands.map((brand) => `<span class="admin-sku-token">${escapeHtml(brand.code || '--')} · ${escapeHtml(brand.name || '')}</span>`).join('')
        : '<p class="admin-empty">No brands yet.</p>';
    }

    if (unitList) {
      unitList.innerHTML = state.database.units.length
        ? state.database.units.map((unit) => `<span class="admin-sku-token">${escapeHtml(unit.code || '--')} · ${escapeHtml(unit.name || '')}</span>`).join('')
        : '<p class="admin-empty">No units yet.</p>';
    }

    if (flavorList) {
      flavorList.innerHTML = state.database.brands.length
        ? state.database.brands.map((brand) => `
            <div class="admin-sku-brand-block">
              <strong>${escapeHtml(brand.name || '')}</strong>
              <div class="admin-sku-token-list">
                ${(brand.flavors || []).map((item) => `<span class="admin-sku-token">${escapeHtml(item.code || '--')} · ${escapeHtml(item.name || '')}</span>`).join('')}
              </div>
            </div>
          `).join('')
        : '<p class="admin-empty">No flavors yet.</p>';
    }

    if (productList) {
      productList.innerHTML = state.database.brands.length
        ? state.database.brands.map((brand) => `
            <div class="admin-sku-brand-block">
              <strong>${escapeHtml(brand.name || '')}</strong>
              <div class="admin-sku-token-list">
                ${(brand.products || []).length
                  ? (brand.products || []).map((item) => `<span class="admin-sku-token">${escapeHtml(item.code || '--')} · ${escapeHtml(item.name || '')}</span>`).join('')
                  : '<p class="admin-empty">No products yet.</p>'}
              </div>
            </div>
          `).join('')
        : '<p class="admin-empty">No products yet.</p>';
    }
  };

  const filteredSkus = () => {
    const search = String(searchInput?.value || '').trim().toLowerCase();
    const brand = String(filterBrand?.value || '');
    const unit = String(filterUnit?.value || '');
    const flavor = String(filterFlavor?.value || '');
    const product = String(filterProduct?.value || '');

    return state.database.skus.filter((row) => {
      if (brand && row.brand_name !== brand) return false;
      if (unit && row.unit_name !== unit) return false;
      if (flavor && row.flavor_name !== flavor) return false;
      if (product && row.product_name !== product) return false;
      if (!search) return true;

      const haystack = [
        row.sku,
        row.tag,
        row.brand_name,
        row.product_name,
        row.flavor_name,
        row.unit_name
      ].join(' ').toLowerCase();

      return haystack.includes(search);
    });
  };

  const renderFilters = () => {
    if (filterBrand) filterBrand.innerHTML = buildFilterOptions(state.database.skus.map((row) => row.brand_name), 'All brands');
    if (filterUnit) filterUnit.innerHTML = buildFilterOptions(state.database.skus.map((row) => row.unit_name), 'All units');
    if (filterFlavor) filterFlavor.innerHTML = buildFilterOptions(state.database.skus.map((row) => row.flavor_name), 'All flavors');
    if (filterProduct) filterProduct.innerHTML = buildFilterOptions(state.database.skus.map((row) => row.product_name), 'All products');
  };

  const renderTable = () => {
    if (!tableBody) return;
    const rows = filteredSkus();

    if (!rows.length) {
      tableBody.innerHTML = `<tr><td colspan="11" class="admin-empty">${state.database.skus.length ? 'No SKUs match the current filters.' : 'No approved SKUs yet.'}</td></tr>`;
      return;
    }

    tableBody.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.sku || '')}</strong></td>
        <td>${escapeHtml(row.tag || '')}</td>
        <td>${escapeHtml(row.brand_name || '')}</td>
        <td>${escapeHtml(row.product_name || '')}</td>
        <td>${escapeHtml(row.flavor_name || '')}</td>
        <td>${escapeHtml(row.unit_name || '')}</td>
        <td>${escapeHtml(row.volume || '')}</td>
        <td>${escapeHtml(row.current_stock ?? row.starting_stock ?? 0)}</td>
        <td>${escapeHtml(row.stock_trigger ?? 0)}</td>
        <td>${escapeHtml(row.cogs ?? 0)}</td>
        <td>
          <div class="admin-sku-actions">
            <button type="button" class="admin-primary-btn" data-change-inventory="${escapeHtml(row.sku || '')}">Inventory</button>
            ${role === 'branch'
              ? `<button type="button" class="admin-ghost-btn" data-change-cogs="${escapeHtml(row.sku || '')}">COGS</button>`
              : ''}
          </div>
        </td>
      </tr>
    `).join('');
  };

  const requestStatusLabel = (request) => {
    if (request.status === 'approved') return 'Approved';
    if (request.status === 'denied') return 'Denied';
    return 'Pending';
  };

  const renderRequests = () => {
    if (!requestList) return;

    if (!state.requests.length) {
      requestList.innerHTML = `<p class="admin-empty">${role === 'branch' ? 'No requests yet.' : 'You have not submitted any requests yet.'}</p>`;
      return;
    }

    requestList.innerHTML = state.requests.map((request) => `
      <article class="admin-request-card">
        <div class="admin-request-head">
          <div>
            <span class="admin-chip">${escapeHtml(requestStatusLabel(request))}</span>
            <h4>${escapeHtml(request.proposed_sku || '')}</h4>
          </div>
          <div class="admin-request-meta">
            <strong>${escapeHtml(request.brand_name || '')}</strong>
            <small>${escapeHtml(request.product_name || '')} · ${escapeHtml(request.flavor_name || '')} · ${escapeHtml(request.volume || '')} ${escapeHtml(request.unit_name || '')}</small>
          </div>
        </div>
        <div class="admin-request-foot">
          <p>
            ${role === 'branch'
              ? `Submitted by <strong>${escapeHtml(request.requester_username || '')}</strong>`
              : `Submitted by <strong>${escapeHtml(username)}</strong>`}
            on ${escapeHtml(request.created_at || '')}
          </p>
          ${request.decision_notes ? `<p class="admin-muted-copy">${escapeHtml(request.decision_notes)}</p>` : ''}
          <div class="admin-sku-actions">
            ${role === 'branch' && request.status === 'pending'
              ? `
                <button type="button" class="admin-primary-btn" data-approve-request="${request.id}">Approve</button>
                <button type="button" class="admin-ghost-btn" data-deny-request="${request.id}">Deny</button>
              `
              : ''}
            ${request.status === 'approved' && request.approved_sku
              ? `<span class="admin-request-result">Live SKU: ${escapeHtml(request.approved_sku)}</span>`
              : ''}
            ${request.status === 'denied'
              ? `<span class="admin-request-result">Request denied</span>`
              : ''}
          </div>
        </div>
      </article>
    `).join('');
  };

  const renderAll = () => {
    renderCounts();
    refreshBrandSelects();
    refreshUnitSelect();
    refreshBrandBoundSelects();
    renderPreview();
    renderMasterLists();
    renderFilters();
    renderTable();
    renderRequests();
  };

  const loadDatabase = async () => {
    const payload = await requestJson();
    state.database = payload.database || state.database;
    state.requests = payload.requests || [];
    renderAll();
  };

  const postAction = async (body) => {
    const payload = await requestJson({
      method: 'POST',
      body
    });
    state.database = payload.database || state.database;
    state.requests = payload.requests || state.requests;
    renderAll();
    return payload;
  };

  const bindMasterForm = (selector, buildBody) => {
    const form = document.querySelector(selector);
    if (!(form instanceof HTMLFormElement)) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError(masterError, '');

      try {
        const formData = new window.FormData(form);
        await postAction(buildBody(formData));
        form.reset();
        applySharedBrandSelection(resolveSelectedBrandId());
        refreshBrandBoundSelects();
        renderPreview();
      } catch (error) {
        setError(masterError, error instanceof Error ? error.message : 'Unable to save.');
      }
    });
  };

  const closeCogsModal = () => {
    if (!cogsModal) return;
    cogsModal.hidden = true;
    cogsForm?.reset();
    if (cogsApplicationType instanceof HTMLSelectElement) cogsApplicationType.value = 'next_purchase';
    if (cogsEndMode instanceof HTMLSelectElement) cogsEndMode.value = 'until_next_change';
    syncCogsFields();
    setError(cogsError, '');
  };

  const closeInventoryModal = () => {
    if (!inventoryModal) return;
    inventoryModal.hidden = true;
    inventoryForm?.reset();
    if (inventoryAction instanceof HTMLSelectElement) inventoryAction.value = 'set_total';
    syncInventoryFields();
    setError(inventoryError, '');
  };

  const openCogsModal = (sku) => {
    if (!(cogsForm instanceof HTMLFormElement) || !cogsModal) return;
    const row = state.database.skus.find((item) => item.sku === sku);
    if (!row) return;

    cogsForm.elements.sku.value = row.sku || '';
    cogsForm.elements.sku_display.value = row.sku || '';
    cogsForm.elements.old_price.value = String(row.cogs ?? 0);
    cogsForm.elements.new_price.value = String(row.cogs ?? 0);
    if (cogsApplicationType instanceof HTMLSelectElement) cogsApplicationType.value = 'next_purchase';
    if (cogsEndMode instanceof HTMLSelectElement) cogsEndMode.value = 'until_next_change';
    cogsForm.elements.start_date.value = '';
    cogsForm.elements.end_date.value = '';
    cogsForm.elements.batch_number.value = '';
    syncCogsFields();
    setError(cogsError, '');
    cogsModal.hidden = false;
  };

  const openInventoryModal = (sku) => {
    if (!(inventoryForm instanceof HTMLFormElement) || !inventoryModal) return;
    const row = state.database.skus.find((item) => item.sku === sku);
    if (!row) return;

    inventoryForm.elements.sku.value = row.sku || '';
    inventoryForm.elements.sku_display.value = row.sku || '';
    inventoryForm.elements.current_stock_display.value = String(row.current_stock ?? row.starting_stock ?? 0);
    if (inventoryAction instanceof HTMLSelectElement) inventoryAction.value = 'set_total';
    inventoryForm.elements.new_stock.value = String(row.current_stock ?? row.starting_stock ?? 0);
    inventoryForm.elements.quantity_to_add.value = '';
    inventoryForm.elements.batch_number.value = '';
    syncInventoryFields();
    setError(inventoryError, '');
    inventoryModal.hidden = false;
  };

  const closeApprovalModal = () => {
    if (!approvalModal) return;
    approvalModal.hidden = true;
    approvalForm?.reset();
    state.activeApprovalRequestId = null;
    if (approvalSummary) approvalSummary.textContent = 'Waiting for request selection';
    if (approvalRequester) approvalRequester.textContent = 'Requester';
    setError(approvalError, '');
  };

  const openApprovalModal = (requestId) => {
    if (!(approvalForm instanceof HTMLFormElement) || !approvalModal) return;
    const request = state.requests.find((item) => Number(item.id) === Number(requestId));
    if (!request) return;

    state.activeApprovalRequestId = request.id;
    approvalForm.elements.request_id.value = String(request.id);
    approvalForm.elements.tag.value = '';
    approvalForm.elements.starting_stock.value = '0';
    approvalForm.elements.stock_trigger.value = '0';
    approvalForm.elements.cogs.value = '0';
    approvalForm.elements.batch_number.value = '';
    approvalForm.elements.decision_notes.value = '';

    if (approvalSummary) {
      approvalSummary.textContent = `${request.proposed_sku} · ${request.brand_name} · ${request.product_name} · ${request.flavor_name}`;
    }
    if (approvalRequester) {
      approvalRequester.textContent = `Submitted by ${request.requester_username} · ${request.volume} ${request.unit_name}`;
    }

    setError(approvalError, '');
    approvalModal.hidden = false;
  };

  const setupIsComplete = () => {
    const preview = computeSkuPreview();
    if (preview === 'Waiting for complete selection') return false;
    if (!(setupForm instanceof HTMLFormElement)) return false;
    return String(setupForm.elements.tag?.value || '').trim() !== '';
  };

  bindMasterForm('[data-add-brand-form]', (formData) => ({
    action: 'add_brand',
    name: formData.get('name')
  }));

  bindMasterForm('[data-add-unit-form]', (formData) => ({
    action: 'add_unit',
    name: formData.get('name')
  }));

  bindMasterForm('[data-add-flavor-form]', (formData) => ({
    action: 'add_flavor',
    brand_id: formData.get('brand_id'),
    name: formData.get('name')
  }));

  bindMasterForm('[data-add-product-form]', (formData) => ({
    action: 'add_product',
    brand_id: formData.get('brand_id'),
    name: formData.get('name')
  }));

  activePrimaryForm()?.addEventListener('input', renderPreview);
  const handleBrandSelectionChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    applySharedBrandSelection(String(target.value || ''));
    refreshBrandBoundSelects();
    renderPreview();
  };

  allBrandSelects().forEach((select) => {
    select.addEventListener('change', handleBrandSelectionChange);
  });
  cogsApplicationType?.addEventListener('change', syncCogsFields);
  cogsEndMode?.addEventListener('change', syncCogsFields);
  inventoryAction?.addEventListener('change', syncInventoryFields);
  unitSelect?.addEventListener('change', renderPreview);
  flavorSelect?.addEventListener('change', renderPreview);
  productSelect?.addEventListener('change', renderPreview);

  document.querySelector('[data-continue-apply]')?.addEventListener('click', () => {
    setError(setupError, '');
    if (!setupIsComplete()) {
      setError(setupError, 'Complete brand, unit, volume, flavor, product, and TAG before continuing.');
      return;
    }

    if (applyPanel) applyPanel.hidden = false;
    applyPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelector('[data-back-setup]')?.addEventListener('click', () => {
    if (applyPanel) applyPanel.hidden = true;
    setupForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  applyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(applyError, '');
    setError(setupError, '');

    if (!(setupForm instanceof HTMLFormElement) || !(applyForm instanceof HTMLFormElement)) return;

    if (!setupIsComplete()) {
      setError(setupError, 'Step 1 is incomplete.');
      return;
    }

    try {
      const setupData = new window.FormData(setupForm);
      const applyData = new window.FormData(applyForm);
      await postAction({
        action: 'create_sku',
        brand_id: setupData.get('brand_id'),
        unit_id: setupData.get('unit_id'),
        volume: setupData.get('volume'),
        flavor_id: setupData.get('flavor_id'),
        product_id: setupData.get('product_id'),
        tag: String(setupData.get('tag') || '').toUpperCase().replace(/\s+/g, '_'),
        starting_stock: applyData.get('starting_stock'),
        stock_trigger: applyData.get('stock_trigger'),
        cogs: applyData.get('cogs'),
        batch_number: String(applyData.get('batch_number') || '').toUpperCase()
      });

      setupForm.reset();
      applyForm.reset();
      applySharedBrandSelection(resolveSelectedBrandId());
      refreshBrandBoundSelects();
      if (applyPanel) applyPanel.hidden = true;
      renderPreview();
    } catch (error) {
      setError(applyError, error instanceof Error ? error.message : 'Unable to create SKU.');
    }
  });

  requestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(requestSubmitError, '');

    if (!(requestForm instanceof HTMLFormElement)) return;
    if (computeSkuPreview() === 'Waiting for complete selection') {
      setError(requestSubmitError, 'Complete brand, unit, volume, flavor, and product before submitting.');
      return;
    }

    try {
      const formData = new window.FormData(requestForm);
      await postAction({
        action: 'submit_request',
        brand_id: formData.get('brand_id'),
        unit_id: formData.get('unit_id'),
        volume: formData.get('volume'),
        flavor_id: formData.get('flavor_id'),
        product_id: formData.get('product_id')
      });
      requestForm.reset();
      applySharedBrandSelection(resolveSelectedBrandId());
      refreshBrandBoundSelects();
      renderPreview();
    } catch (error) {
      setError(requestSubmitError, error instanceof Error ? error.message : 'Unable to submit request.');
    }
  });

  requestList?.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const approveButton = target.closest('[data-approve-request]');
    if (approveButton instanceof HTMLButtonElement) {
      openApprovalModal(approveButton.dataset.approveRequest || '');
      return;
    }

    const denyButton = target.closest('[data-deny-request]');
    if (denyButton instanceof HTMLButtonElement) {
      setError(requestError, '');
      try {
        await postAction({
          action: 'deny_request',
          request_id: denyButton.dataset.denyRequest,
          decision_notes: 'Denied by Branch'
        });
      } catch (error) {
        setError(requestError, error instanceof Error ? error.message : 'Unable to deny request.');
      }
    }
  });

  tableBody?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const inventoryButton = target.closest('[data-change-inventory]');
    if (inventoryButton instanceof HTMLButtonElement) {
      openInventoryModal(inventoryButton.dataset.changeInventory || '');
      return;
    }

    if (role !== 'branch') return;
    const cogsButton = target.closest('[data-change-cogs]');
    if (!(cogsButton instanceof HTMLButtonElement)) return;
    openCogsModal(cogsButton.dataset.changeCogs || '');
  });

  cogsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(cogsForm instanceof HTMLFormElement)) return;
    setError(cogsError, '');

    try {
      const formData = new window.FormData(cogsForm);
      await postAction({
        action: 'change_cogs',
        sku: formData.get('sku'),
        new_price: formData.get('new_price'),
        application_type: formData.get('application_type'),
        start_date: formData.get('start_date'),
        end_mode: formData.get('end_mode'),
        end_date: formData.get('end_date'),
        batch_number: String(formData.get('batch_number') || '').toUpperCase()
      });
      closeCogsModal();
    } catch (error) {
      setError(cogsError, error instanceof Error ? error.message : 'Unable to change COGS.');
    }
  });

  inventoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(inventoryForm instanceof HTMLFormElement)) return;
    setError(inventoryError, '');

    try {
      const formData = new window.FormData(inventoryForm);
      await postAction({
        action: 'change_inventory',
        sku: formData.get('sku'),
        inventory_action: formData.get('inventory_action'),
        new_stock: formData.get('new_stock'),
        quantity_to_add: formData.get('quantity_to_add'),
        batch_number: String(formData.get('batch_number') || '').toUpperCase()
      });
      closeInventoryModal();
    } catch (error) {
      setError(inventoryError, error instanceof Error ? error.message : 'Unable to change inventory.');
    }
  });

  approvalForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(approvalForm instanceof HTMLFormElement)) return;
    setError(approvalError, '');

    try {
      const formData = new window.FormData(approvalForm);
      await postAction({
        action: 'approve_request',
        request_id: formData.get('request_id'),
        tag: String(formData.get('tag') || '').toUpperCase().replace(/\s+/g, '_'),
        starting_stock: formData.get('starting_stock'),
        stock_trigger: formData.get('stock_trigger'),
        cogs: formData.get('cogs'),
        batch_number: String(formData.get('batch_number') || '').toUpperCase(),
        decision_notes: formData.get('decision_notes')
      });
      closeApprovalModal();
    } catch (error) {
      setError(approvalError, error instanceof Error ? error.message : 'Unable to approve request.');
    }
  });

  document.querySelectorAll('[data-close-cogs-modal]').forEach((button) => {
    button.addEventListener('click', closeCogsModal);
  });

  document.querySelectorAll('[data-close-inventory-modal]').forEach((button) => {
    button.addEventListener('click', closeInventoryModal);
  });

  document.querySelectorAll('[data-close-approval-modal]').forEach((button) => {
    button.addEventListener('click', closeApprovalModal);
  });

  [searchInput, filterBrand, filterUnit, filterFlavor, filterProduct].forEach((node) => {
    node?.addEventListener('input', renderTable);
    node?.addEventListener('change', renderTable);
  });

  syncCogsFields();
  syncInventoryFields();
  applyTheme(window.localStorage.getItem(themeStorageKey) || 'dark');
  setupTopbarMenu();
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.adminTheme === 'light' ? 'dark' : 'light');
  });

  loadDatabase().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unable to load the SKU database.';
    setError(setupError, message);
    setError(applyError, message);
    setError(requestSubmitError, message);
    setError(requestError, message);
  });
});
