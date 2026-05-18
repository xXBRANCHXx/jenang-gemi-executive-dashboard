document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-profiles]');
  if (!root) return;

  const endpoint = root.dataset.partnersEndpoint || '../api/partners/';
  const partnerList = document.querySelector('[data-partner-list]');
  const partnerModal = document.querySelector('[data-partner-modal]');
  const partnerForm = document.querySelector('[data-partner-form]');
  const partnerFormError = document.querySelector('[data-partner-form-error]');
  const partnerSiteOrigin = 'https://partner.jenanggemi.com';

  const brandChoiceGrid = document.querySelector('[data-brand-choice-grid]');
  const productChoiceGrid = document.querySelector('[data-product-choice-grid]');
  const brandSearch = document.querySelector('[data-brand-search]');
  const productSearch = document.querySelector('[data-product-search]');
  const selectedSkuList = document.querySelector('[data-partner-selected-skus]');
  const brandSummary = document.querySelector('[data-partner-brand-summary]');
  const productSummary = document.querySelector('[data-partner-product-summary]');
  const skuSummary = document.querySelector('[data-partner-sku-summary]');
  const gatedActions = Array.from(document.querySelectorAll('[data-partner-gated-action]'));
  const lockedFields = Array.from(document.querySelectorAll('[data-partner-locked-field] input, [data-partner-locked-field] textarea, [data-partner-locked-field] select'));

  const state = {
    partners: [],
    skuCatalog: {
      brands: [],
      skus: []
    },
    selections: {
      brands: [],
      products: [],
      skus: []
    },
    search: {
      brands: '',
      products: ''
    },
    activeStep: 'brands',
    activeProductId: ''
  };

  const stepOrder = ['brands', 'products'];

  const generatePortalPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = new Uint32Array(14);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
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

  const setError = (message) => {
    if (!partnerFormError) return;
    partnerFormError.hidden = !message;
    partnerFormError.textContent = message || '';
  };

  const catalogBrands = () => state.skuCatalog.brands || [];
  const catalogSkus = () => state.skuCatalog.skus || [];

  const selectedBrandRecords = () => catalogBrands().filter((brand) => state.selections.brands.includes(brand.id));
  const filteredProducts = () => selectedBrandRecords()
    .flatMap((brand) => (brand.products || []).map((product) => ({ ...product, brand_id: brand.id, brand_name: brand.name })));

  const visibleBrandSkus = () => {
    const allowedBrands = new Set(state.selections.brands);
    return catalogSkus().filter((sku) => allowedBrands.has(sku.brand_id));
  };

  const productSkus = (product) => visibleBrandSkus()
    .filter((sku) => sku.brand_id === product.brand_id && sku.product_key === product.id);

  const selectedSkuSet = () => new Set(state.selections.skus);

  const selectedProductRecords = () => {
    const selected = selectedSkuSet();
    return filteredProducts().filter((product) => productSkus(product).some((sku) => selected.has(sku.sku)));
  };

  const activeProduct = () => filteredProducts().find((product) => product.id === state.activeProductId) || null;

  const matchesSearch = (value, searchTerm) => String(value || '').toLowerCase().includes(searchTerm.trim().toLowerCase());

  const hydrateSelections = () => {
    const validBrandIds = new Set(catalogBrands().map((brand) => brand.id));
    state.selections.brands = state.selections.brands.filter((brandId) => validBrandIds.has(brandId));

    const validSkus = new Set(visibleBrandSkus().map((sku) => sku.sku));
    state.selections.skus = state.selections.skus.filter((skuCode) => validSkus.has(skuCode));
    syncSelectedProductsFromSkus();
  };

  const syncSelectedProductsFromSkus = () => {
    const selected = selectedSkuSet();
    state.selections.products = filteredProducts()
      .filter((product) => productSkus(product).some((sku) => selected.has(sku.sku)))
      .map((product) => product.id);
    if (state.activeProductId && !filteredProducts().some((product) => product.id === state.activeProductId)) {
      state.activeProductId = '';
    }
  };

  const updateGatedControls = () => {
    const unlocked = state.selections.skus.length > 0;
    [...gatedActions, ...lockedFields].forEach((control) => {
      if ('disabled' in control) control.disabled = !unlocked;
    });
  };

  const renderStepState = () => {
    stepOrder.forEach((step, index) => {
      const indicator = document.querySelector(`[data-partner-step-indicator="${step}"]`);
      const panel = document.querySelector(`[data-partner-step-panel="${step}"]`);
      if (panel instanceof HTMLElement) {
        panel.hidden = step !== state.activeStep;
      }
      if (indicator instanceof HTMLElement) {
        indicator.classList.toggle('is-active', step === state.activeStep);
        indicator.classList.toggle('is-complete', index < stepOrder.indexOf(state.activeStep));
      }
    });
  };

  const renderBrands = () => {
    if (!brandChoiceGrid) return;
    const brands = catalogBrands().filter((brand) => {
      if (!state.search.brands) return true;
      return [brand.name, brand.code].some((value) => matchesSearch(value, state.search.brands));
    });
    if (!brands.length) {
      brandChoiceGrid.innerHTML = `<div class="partner-access-empty">${state.search.brands ? 'No brands match that search.' : 'No brands are available in the SKU database yet.'}</div>`;
      return;
    }

    brandChoiceGrid.innerHTML = brands.map((brand) => `
      <label class="partner-access-choice">
        <input type="checkbox" data-partner-brand value="${escapeHtml(brand.id || '')}" ${state.selections.brands.includes(brand.id) ? 'checked' : ''}>
        <span class="partner-access-choice-body">
          <span class="partner-access-choice-title">${escapeHtml(brand.name || '')}</span>
          <span class="partner-access-choice-meta">${escapeHtml(brand.code || '--')} · ${(brand.products || []).length} products</span>
        </span>
      </label>
    `).join('');
  };

  const renderProducts = () => {
    if (!productChoiceGrid) return;
    const products = filteredProducts().filter((product) => {
      if (!state.search.products) return true;
      return [product.display_name || product.name, product.name, product.brand_name, product.code].some((value) => matchesSearch(value, state.search.products));
    });
    if (!state.selections.brands.length) {
      productChoiceGrid.innerHTML = '<div class="partner-access-empty">Select a brand first.</div>';
      return;
    }
    if (!products.length) {
      productChoiceGrid.innerHTML = `<div class="partner-access-empty">${state.search.products ? 'No products match that search.' : 'No products exist for the selected brand yet.'}</div>`;
      return;
    }

    const selected = selectedSkuSet();
    const currentProduct = activeProduct();
    productChoiceGrid.innerHTML = `
      <div class="partner-two-pane-picker ${currentProduct ? 'has-active-product' : ''}">
        <div class="partner-product-pane">
          ${products.map((product) => {
      const skus = productSkus(product);
      const selectedCount = skus.filter((sku) => selected.has(sku.sku)).length;
      const isChecked = skus.length > 0 && selectedCount === skus.length;
      const isPartial = selectedCount > 0 && selectedCount < skus.length;
      return `
        <article class="partner-product-row ${selectedCount > 0 ? 'has-selection' : ''} ${product.id === state.activeProductId ? 'is-active' : ''}">
          <button type="button" class="partner-product-select" data-partner-product-select="${escapeHtml(product.id || '')}">
            <span>
              <strong>${escapeHtml(product.display_name || product.name || '')}</strong>
              <small>${escapeHtml(product.brand_name || '')} · ${selectedCount}/${skus.length} SKUs</small>
            </span>
          </button>
          <label class="partner-product-mini-toggle" title="Select all SKUs for this product">
            <input type="checkbox" data-partner-product-toggle value="${escapeHtml(product.id || '')}" ${isChecked ? 'checked' : ''} ${isPartial ? 'data-indeterminate="true"' : ''}>
          </label>
        </article>
      `;
    }).join('')}
        </div>
        <div class="partner-sku-pane">
          ${currentProduct ? renderSkuPane(currentProduct, selected) : '<div class="partner-access-empty">Select a product to open SKU choices.</div>'}
        </div>
      </div>
    `;

    productChoiceGrid.querySelectorAll('[data-indeterminate="true"]').forEach((input) => {
      if (input instanceof HTMLInputElement) input.indeterminate = true;
    });
  };

  const renderSkuPane = (product, selected) => {
    const skus = productSkus(product);
    const selectedCount = skus.filter((sku) => selected.has(sku.sku)).length;
    const allSelected = skus.length > 0 && selectedCount === skus.length;
    return `
      <div class="partner-sku-pane-head">
        <div>
          <strong>${escapeHtml(product.display_name || product.name || '')}</strong>
          <span>${escapeHtml(product.brand_name || '')} · ${selectedCount}/${skus.length} SKUs selected</span>
        </div>
        <button type="button" class="admin-ghost-btn partner-sku-pane-toggle" data-partner-product-action="${allSelected ? 'clear' : 'select'}" data-product-id="${escapeHtml(product.id || '')}">${allSelected ? 'Clear' : 'Select All'}</button>
      </div>
      <div class="partner-sku-choice-list">
        ${skus.map((sku) => `
          <label class="partner-sku-choice">
            <input type="checkbox" data-partner-sku value="${escapeHtml(sku.sku || '')}" ${selected.has(sku.sku) ? 'checked' : ''}>
            <span>
              <strong>${escapeHtml(sku.sku || '')}</strong>
              <small>${escapeHtml(sku.label || sku.product_name || '')}</small>
            </span>
          </label>
        `).join('')}
      </div>
    `;
  };

  const renderSummary = () => {
    const brands = selectedBrandRecords();
    const products = selectedProductRecords();
    const skuRecords = catalogSkus().filter((sku) => state.selections.skus.includes(sku.sku));

    if (brandSummary) {
      brandSummary.textContent = brands.length ? brands.map((brand) => brand.name).join(', ') : 'None selected';
    }
    if (productSummary) {
      productSummary.textContent = products.length ? products.map((product) => `${product.brand_name} · ${product.name}`).join(', ') : 'None selected';
    }
    if (skuSummary) {
      skuSummary.textContent = skuRecords.length ? `${skuRecords.length} SKU${skuRecords.length === 1 ? '' : 's'} selected` : 'None selected';
    }

    if (!selectedSkuList) return;
    if (!skuRecords.length) {
      selectedSkuList.innerHTML = '<div class="partner-access-empty">Selected SKUs will show here.</div>';
      return;
    }

    selectedSkuList.innerHTML = skuRecords.map((sku) => `
      <div class="partner-access-tag">
        <strong>${escapeHtml(sku.sku || '')}</strong>
        <span>${escapeHtml(sku.product_name || sku.label || '')}</span>
      </div>
    `).join('');
  };

  const renderSelectionUi = () => {
    hydrateSelections();
    renderStepState();
    renderBrands();
    renderProducts();
    renderSummary();
    updateGatedControls();
  };

  const syncSelection = (type, values) => {
    state.selections[type] = [...new Set(values)];
    if (type === 'brands') {
      hydrateSelections();
    }
    renderSelectionUi();
  };

  const selectedSkuPayload = () => [...new Set(state.selections.skus)];

  const openStep = (step) => {
    state.activeStep = step;
    renderStepState();
    updateGatedControls();
  };

  const renderPartners = (partners) => {
    if (!partnerList) return;
    if (!partners.length) {
      partnerList.innerHTML = '<p class="admin-empty">No partners yet.</p>';
      return;
    }

    partnerList.innerHTML = partners.map((partner) => `
      <article class="admin-affiliate-card">
        <div class="admin-affiliate-head">
          <div>
            <span class="admin-chip">${escapeHtml(partner.code || '')}</span>
            <h4>${escapeHtml(partner.name || 'Partner')}</h4>
          </div>
          <div class="admin-affiliate-actions">
            <a class="admin-primary-btn admin-link-btn" href="../partner-profile/?code=${encodeURIComponent(partner.code || '')}">Edit Profile</a>
            <a class="admin-ghost-btn admin-link-btn" href="${escapeHtml(`${partnerSiteOrigin}${partner.store_path || '/'}`)}" target="_blank" rel="noopener">Open Page</a>
            <button type="button" class="admin-danger-btn" data-delete-partner="${escapeHtml(partner.code || '')}" data-delete-name="${escapeHtml(partner.name || 'Partner')}">Delete</button>
          </div>
        </div>
        <div class="partner-profile-grid">
          <div class="admin-affiliate-field">
            <span class="admin-control-label">Brands</span>
            <div class="admin-affiliate-platform-grid">
              ${(partner.companies || []).map((company) => `<div class="admin-platform-choice"><span>${escapeHtml(company)}</span></div>`).join('')}
            </div>
          </div>
          <div class="admin-affiliate-field">
            <span class="admin-control-label">Products</span>
            <div class="admin-affiliate-platform-grid">
              ${Object.entries(partner.product_access || {}).flatMap(([brand, products]) => Object.entries(products || {}).map(([product, config]) => `
                <div class="admin-platform-choice">
                  <span>${escapeHtml(`${brand} · ${product}`)}</span>
                  <small>${escapeHtml((config.sizes || []).join(', '))}</small>
                </div>
              `)).join('')}
            </div>
          </div>
          <div class="admin-affiliate-field">
            <span class="admin-control-label">Selected SKUs</span>
            <div class="partner-access-tag-list">
              ${(partner.selected_sku_records || []).map((sku) => `
                <div class="partner-access-tag">
                  <strong>${escapeHtml(sku.sku || '')}</strong>
                  <span>${escapeHtml(sku.label || '')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </article>
    `).join('');
  };

  const loadPartners = async () => {
    const payload = await requestJson();
    state.partners = payload.database?.partners || [];
    state.skuCatalog = payload.sku_catalog || state.skuCatalog;
    renderPartners(state.partners);
    renderSelectionUi();
  };

  const closePartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = true;
    partnerForm?.reset();
    state.selections = { brands: [], products: [], skus: [] };
    state.activeProductId = '';
    state.activeStep = 'brands';
    setError('');
    renderSelectionUi();
  };

  const openPartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = false;
    state.activeStep = 'brands';
    state.activeProductId = '';
    renderSelectionUi();
  };

  document.querySelectorAll('[data-open-partner-modal]').forEach((button) => {
    button.addEventListener('click', openPartnerModal);
  });

  document.querySelectorAll('[data-close-partner-modal]').forEach((button) => {
    button.addEventListener('click', closePartnerModal);
  });

  document.querySelectorAll('[data-partner-next-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetStep = button.getAttribute('data-partner-next-step') || '';
      if (targetStep === 'products' && !state.selections.brands.length) {
        setError('Select at least one brand before continuing.');
        return;
      }
      setError('');
      openStep(targetStep);
    });
  });

  document.querySelectorAll('[data-partner-prev-step]').forEach((button) => {
    button.addEventListener('click', () => {
      setError('');
      openStep(button.getAttribute('data-partner-prev-step') || 'brands');
    });
  });

  [brandSearch, productSearch].forEach((input) => {
    input?.addEventListener('input', () => {
      state.search.brands = brandSearch?.value || '';
      state.search.products = productSearch?.value || '';
      renderSelectionUi();
    });
  });

  partnerModal?.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches('[data-partner-brand]')) {
      syncSelection('brands', Array.from(document.querySelectorAll('[data-partner-brand]:checked')).map((input) => input.value));
      return;
    }

    if (target.matches('[data-partner-product-toggle]')) {
      const product = filteredProducts().find((item) => item.id === target.value);
      if (!product) return;
      state.activeProductId = product.id;
      const nextSkus = new Set(state.selections.skus);
      productSkus(product).forEach((sku) => {
        if (target.checked) nextSkus.add(sku.sku);
        else nextSkus.delete(sku.sku);
      });
      state.selections.skus = [...nextSkus];
      syncSelectedProductsFromSkus();
      renderSelectionUi();
      return;
    }

    if (target.matches('[data-partner-sku]')) {
      const nextSkus = new Set(state.selections.skus);
      if (target.checked) nextSkus.add(target.value);
      else nextSkus.delete(target.value);
      state.selections.skus = [...nextSkus];
      syncSelectedProductsFromSkus();
      renderSelectionUi();
      return;
    }
  });

  partnerModal?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const productButton = target?.closest('[data-partner-product-select]');
    if (productButton instanceof HTMLButtonElement) {
      state.activeProductId = productButton.dataset.partnerProductSelect || '';
      renderSelectionUi();
      return;
    }

    const actionButton = target?.closest('[data-partner-product-action]');
    if (!(actionButton instanceof HTMLButtonElement)) return;
    const product = filteredProducts().find((item) => item.id === actionButton.dataset.productId);
    if (!product) return;
    const nextSkus = new Set(state.selections.skus);
    const shouldSelect = actionButton.dataset.partnerProductAction === 'select';
    productSkus(product).forEach((sku) => {
      if (shouldSelect) nextSkus.add(sku.sku);
      else nextSkus.delete(sku.sku);
    });
    state.activeProductId = product.id;
    state.selections.skus = [...nextSkus];
    syncSelectedProductsFromSkus();
    renderSelectionUi();
  });

  partnerList?.addEventListener('click', async (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-delete-partner]') : null;
    if (!(button instanceof HTMLButtonElement)) return;

    const confirmed = window.confirm(`Delete ${button.dataset.deleteName || 'this partner'}? This will remove the partner record.`);
    if (!confirmed) return;

    try {
      button.disabled = true;
      await requestJson({
        method: 'POST',
        body: {
          action: 'delete',
          code: button.dataset.deletePartner || ''
        }
      });
      await loadPartners();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to delete partner.');
    } finally {
      button.disabled = false;
    }
  });

  partnerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError('');

    if (!state.selections.brands.length) {
      setError('Select at least one brand.');
      openStep('brands');
      return;
    }
    if (!state.selections.products.length) {
      setError('Select at least one SKU.');
      openStep('products');
      return;
    }
    if (!state.selections.skus.length) {
      setError('Select at least one SKU.');
      openStep('products');
      return;
    }
    try {
      const formData = new window.FormData(partnerForm);
      await requestJson({
        method: 'POST',
        body: {
          action: 'create',
          name: formData.get('name'),
          partner_slug: formData.get('partner_slug'),
          portal_password: formData.get('portal_password'),
          selected_skus: selectedSkuPayload(),
          notes: formData.get('notes')
        }
      });
      closePartnerModal();
      await loadPartners();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create partner.');
    }
  });

  document.querySelector('[data-generate-portal-password]')?.addEventListener('click', () => {
    if (!(partnerForm instanceof HTMLFormElement)) return;
    partnerForm.elements.portal_password.value = generatePortalPassword();
  });

  loadPartners().catch((error) => {
    setError(error instanceof Error ? error.message : 'Unable to load partners.');
  });
});
