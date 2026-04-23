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
  const skuChoiceGrid = document.querySelector('[data-sku-choice-grid]');
  const brandSearch = document.querySelector('[data-brand-search]');
  const productSearch = document.querySelector('[data-product-search]');
  const skuSearch = document.querySelector('[data-sku-search]');
  const selectedSkuList = document.querySelector('[data-partner-selected-skus]');
  const brandSummary = document.querySelector('[data-partner-brand-summary]');
  const productSummary = document.querySelector('[data-partner-product-summary]');
  const skuSummary = document.querySelector('[data-partner-sku-summary]');

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
      products: '',
      skus: ''
    },
    activeStep: 'brands'
  };

  const stepOrder = ['brands', 'products', 'skus'];

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
  const selectedProductRecords = () => {
    const brandIds = new Set(state.selections.brands);
    return selectedBrandRecords()
      .flatMap((brand) => (brand.products || []).map((product) => ({ ...product, brand_id: brand.id, brand_name: brand.name })))
      .filter((product) => brandIds.has(product.brand_id) && state.selections.products.includes(product.id));
  };

  const filteredProducts = () => selectedBrandRecords()
    .flatMap((brand) => (brand.products || []).map((product) => ({ ...product, brand_id: brand.id, brand_name: brand.name })));

  const filteredSkus = () => {
    const allowedBrands = new Set(state.selections.brands);
    const allowedProducts = new Set(state.selections.products);
    return catalogSkus().filter((sku) => allowedBrands.has(sku.brand_id) && allowedProducts.has(sku.product_key));
  };

  const matchesSearch = (value, searchTerm) => String(value || '').toLowerCase().includes(searchTerm.trim().toLowerCase());

  const hydrateSelections = () => {
    const validBrandIds = new Set(catalogBrands().map((brand) => brand.id));
    state.selections.brands = state.selections.brands.filter((brandId) => validBrandIds.has(brandId));

    const validProducts = new Set(filteredProducts().map((product) => product.id));
    state.selections.products = state.selections.products.filter((productId) => validProducts.has(productId));

    const validSkus = new Set(filteredSkus().map((sku) => sku.sku));
    state.selections.skus = state.selections.skus.filter((skuCode) => validSkus.has(skuCode));
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

    productChoiceGrid.innerHTML = products.map((product) => `
      <label class="partner-access-choice">
        <input type="checkbox" data-partner-product value="${escapeHtml(product.id || '')}" ${state.selections.products.includes(product.id) ? 'checked' : ''}>
        <span class="partner-access-choice-body">
          <span class="partner-access-choice-title">${escapeHtml(product.display_name || product.name || '')}</span>
        </span>
      </label>
    `).join('');
  };

  const renderSkus = () => {
    if (!skuChoiceGrid) return;
    const skus = filteredSkus().filter((sku) => {
      if (!state.search.skus) return true;
      return [sku.product_name, sku.base_product_name, sku.sku, sku.flavor_name, sku.size_label, sku.label].some((value) => matchesSearch(value, state.search.skus));
    });
    if (!state.selections.products.length) {
      skuChoiceGrid.innerHTML = '<div class="partner-access-empty">Select a product first.</div>';
      return;
    }
    if (!skus.length) {
      skuChoiceGrid.innerHTML = `<div class="partner-access-empty">${state.search.skus ? 'No SKUs match that search.' : 'No SKUs match the current brand and product selection.'}</div>`;
      return;
    }

    skuChoiceGrid.innerHTML = skus.map((sku) => `
      <label class="partner-access-choice">
        <input type="checkbox" data-partner-sku value="${escapeHtml(sku.sku || '')}" ${state.selections.skus.includes(sku.sku) ? 'checked' : ''}>
        <span class="partner-access-choice-body">
          <span class="partner-access-choice-title">${escapeHtml(sku.product_name || sku.label || sku.sku || '')}</span>
          <span class="partner-access-choice-meta">${escapeHtml(sku.sku || '')} · ${escapeHtml(sku.flavor_name || 'No flavor')} · ${escapeHtml(sku.size_label || '')} · Stock ${escapeHtml(sku.current_stock ?? 0)}</span>
        </span>
      </label>
    `).join('');
  };

  const renderSummary = () => {
    const brands = selectedBrandRecords();
    const products = selectedProductRecords();
    const skuRecords = catalogSkus().filter((sku) => state.selections.skus.includes(sku.sku));

    if (brandSummary) {
      brandSummary.textContent = brands.length ? brands.map((brand) => brand.name).join(', ') : 'None selected';
    }
    if (productSummary) {
      productSummary.textContent = products.length ? products.map((product) => product.name).join(', ') : 'None selected';
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
    renderSkus();
    renderSummary();
  };

  const syncSelection = (type, values) => {
    state.selections[type] = [...new Set(values)];
    if (type === 'brands') {
      hydrateSelections();
    }
    if (type === 'products') {
      hydrateSelections();
    }
    renderSelectionUi();
  };

  const selectedSkuPayload = () => [...new Set(state.selections.skus)];

  const openStep = (step) => {
    state.activeStep = step;
    renderStepState();
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
    state.activeStep = 'brands';
    setError('');
    renderSelectionUi();
  };

  const openPartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = false;
    state.activeStep = 'brands';
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
      if (targetStep === 'skus' && !state.selections.products.length) {
        setError('Select at least one product before continuing.');
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

  [brandSearch, productSearch, skuSearch].forEach((input) => {
    input?.addEventListener('input', () => {
      state.search.brands = brandSearch?.value || '';
      state.search.products = productSearch?.value || '';
      state.search.skus = skuSearch?.value || '';
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

    if (target.matches('[data-partner-product]')) {
      syncSelection('products', Array.from(document.querySelectorAll('[data-partner-product]:checked')).map((input) => input.value));
      return;
    }

    if (target.matches('[data-partner-sku]')) {
      syncSelection('skus', Array.from(document.querySelectorAll('[data-partner-sku]:checked')).map((input) => input.value));
    }
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
      setError('Select at least one product.');
      openStep('products');
      return;
    }
    if (!state.selections.skus.length) {
      setError('Select at least one SKU.');
      openStep('skus');
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

  loadPartners().catch((error) => {
    setError(error instanceof Error ? error.message : 'Unable to load partners.');
  });
});
