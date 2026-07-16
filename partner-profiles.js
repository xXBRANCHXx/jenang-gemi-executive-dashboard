document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-profiles]');
  if (!root) return;

  const endpoint = root.dataset.partnersEndpoint || '../api/partners/';
  const partnerList = document.querySelector('[data-partner-list]');
  const partnerSearch = document.querySelector('[data-partner-search]');
  const partnerCount = document.querySelector('[data-partner-count]');
  const partnerBrandTotal = document.querySelector('[data-partner-brand-total]');
  const partnerProductTotal = document.querySelector('[data-partner-product-total]');
  const partnerSkuTotal = document.querySelector('[data-partner-sku-total]');
  const partnerModal = document.querySelector('[data-partner-modal]');
  const partnerForm = document.querySelector('[data-partner-form]');
  const partnerFormError = document.querySelector('[data-partner-form-error]');
  const partnerSiteOrigin = 'https://partner.jenanggemi.com';
  const partnerNameInput = document.querySelector('[data-partner-name-input]');
  const partnerSlugInput = document.querySelector('[data-partner-slug-input]');
  const partnerPasswordInput = document.querySelector('[data-partner-password-input]');
  const partnerPreviewName = document.querySelector('[data-partner-preview-name]');
  const partnerPreviewSlug = document.querySelector('[data-partner-preview-slug]');
  const partnerPreviewPassword = document.querySelector('[data-partner-preview-password]');
  const partnerCreateStage = document.querySelector('[data-partner-create-stage]');
  const partnerCreateReady = document.querySelector('[data-partner-create-ready]');

  const brandChoiceGrid = document.querySelector('[data-brand-choice-grid]');
  const productChoiceGrid = document.querySelector('[data-product-choice-grid]');
  const brandSearch = document.querySelector('[data-brand-search]');
  const productSearch = document.querySelector('[data-product-search]');
  const selectedSkuList = document.querySelector('[data-partner-selected-skus]');
  const brandSummary = document.querySelector('[data-partner-brand-summary]');
  const productSummary = document.querySelector('[data-partner-product-summary]');
  const skuSummary = document.querySelector('[data-partner-sku-summary]');
  const pricingList = document.querySelector('[data-partner-pricing-list]');
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
    pricing: {},
    search: {
      partners: '',
      brands: '',
      products: ''
    },
    activeStep: 'brands',
    activeProductId: '',
    slugManuallyEdited: false
  };

  const stepOrder = ['brands', 'products'];

  const generatePortalPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = new Uint32Array(14);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
  };

  const slugify = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);

  const updateCreatePreview = () => {
    const name = partnerNameInput?.value.trim() || 'New partner';
    const slug = partnerSlugInput?.value.trim() || slugify(name);
    const passwordReady = Boolean(partnerPasswordInput?.value.trim());

    if (partnerPreviewName) partnerPreviewName.textContent = name;
    if (partnerPreviewSlug) partnerPreviewSlug.textContent = slug ? `/${slug}/` : '/';
    if (partnerPreviewPassword) partnerPreviewPassword.textContent = passwordReady ? 'Password ready' : 'Password pending';
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const formatNumber = (value) => {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return '0';
    return number.toLocaleString('id-ID', {
      maximumFractionDigits: number % 1 === 0 ? 0 : 2
    });
  };

  const skuUnitCount = (sku = {}) => Math.max(1, Number(sku.unit_count || 1));

  const skuUnitFormula = (sku = {}) => {
    const astra = Number(sku.astra_value || 0);
    const volume = Number(sku.volume || 0);
    if (!astra || !volume) return `${formatNumber(skuUnitCount(sku))} billable unit`;
    return `${formatNumber(volume)} / ASTRA ${formatNumber(astra)} = ${formatNumber(skuUnitCount(sku))} units`;
  };

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

  const partnerBrands = (partner = {}) => Array.isArray(partner.companies) ? partner.companies : [];

  const partnerProductEntries = (partner = {}) => Object.entries(partner.product_access || {})
    .flatMap(([brand, products]) => Object.entries(products || {}).map(([product, config]) => ({
      brand,
      product,
      sizes: Array.isArray(config?.sizes) ? config.sizes : []
    })));

  const partnerSkuRecords = (partner = {}) => Array.isArray(partner.selected_sku_records) ? partner.selected_sku_records : [];

  const partnerMatchesDirectorySearch = (partner = {}) => {
    const term = state.search.partners.trim().toLowerCase();
    if (!term) return true;
    const products = partnerProductEntries(partner);
    const skus = partnerSkuRecords(partner);
    const haystack = [
      partner.name,
      partner.code,
      partner.store_path,
      ...partnerBrands(partner),
      ...products.flatMap((entry) => [entry.brand, entry.product, ...entry.sizes]),
      ...skus.flatMap((sku) => [sku.sku, sku.label, sku.product_name])
    ].join(' ').toLowerCase();
    return haystack.includes(term);
  };

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

  const selectedSkuRecords = () => catalogSkus().filter((sku) => state.selections.skus.includes(sku.sku));

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
    if (partnerCreateStage) {
      partnerCreateStage.textContent = state.activeStep === 'products' ? 'Access' : 'Brand';
    }
  };

  const renderBrands = () => {
    if (!brandChoiceGrid) return;
    const brands = catalogBrands().filter((brand) => {
      if (!state.search.brands) return true;
      return [brand.name, brand.code].some((value) => matchesSearch(value, state.search.brands));
    });
    if (!brands.length) {
      brandChoiceGrid.innerHTML = `<div class="partner-access-empty">${state.search.brands ? 'No matches.' : 'No brands.'}</div>`;
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
      productChoiceGrid.innerHTML = '<div class="partner-access-empty">Select a brand.</div>';
      return;
    }
    if (!products.length) {
      productChoiceGrid.innerHTML = `<div class="partner-access-empty">${state.search.products ? 'No matches.' : 'No products.'}</div>`;
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
          ${currentProduct ? renderSkuPane(currentProduct, selected) : '<div class="partner-access-empty">Select a product.</div>'}
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
    const skuRecords = selectedSkuRecords();

    if (brandSummary) {
      brandSummary.textContent = String(brands.length);
    }
    if (productSummary) {
      productSummary.textContent = String(products.length);
    }
    if (skuSummary) {
      skuSummary.textContent = String(skuRecords.length);
    }
    if (partnerCreateReady) {
      partnerCreateReady.textContent = `${skuRecords.length} SKU${skuRecords.length === 1 ? '' : 's'}`;
    }

    if (!selectedSkuList) return;
    if (!skuRecords.length) {
      selectedSkuList.innerHTML = '<div class="partner-access-empty">No SKU links.</div>';
      return;
    }

    selectedSkuList.innerHTML = skuRecords.map((sku) => `
      <div class="partner-access-tag">
        <strong>${escapeHtml(sku.sku || '')}</strong>
        <span>${escapeHtml(sku.product_name || sku.label || '')}</span>
      </div>
    `).join('');
  };

  const syncPricing = () => {
    const nextPricing = {};
    selectedSkuSet().forEach((skuCode) => {
      nextPricing[skuCode] = Number(state.pricing[skuCode] || 0);
    });
    state.pricing = nextPricing;
  };

  const renderPricing = () => {
    if (!pricingList) return;
    const skuRecords = selectedSkuRecords();
    if (!skuRecords.length) {
      pricingList.innerHTML = '<div class="partner-access-empty">No prices.</div>';
      return;
    }

    pricingList.innerHTML = skuRecords.map((sku) => {
      const skuPrice = Number(state.pricing[sku.sku] || 0);
      return `
      <label class="partner-pricing-row">
        <span>
          <strong>${escapeHtml(sku.label || sku.product_name || sku.sku || '')}</strong>
          <small>${escapeHtml(sku.sku || '')} · ${escapeHtml(skuUnitFormula(sku))}</small>
        </span>
        <span class="partner-pricing-control">
          <input type="number" min="0" step="100" inputmode="decimal" value="${escapeHtml(skuPrice)}" data-partner-sku-price="${escapeHtml(sku.sku || '')}" aria-label="Partner SKU price for ${escapeHtml(sku.label || sku.sku || '')}">
          <small class="partner-pricing-derived">SKU price ${escapeHtml(formatCurrency(skuPrice))}</small>
        </span>
      </label>
    `;
    }).join('');
  };

  const syncPriceInput = (input) => {
    const skuCode = input.getAttribute('data-partner-sku-price');
    if (!skuCode) return false;
    const skuPrice = Math.max(0, Number(input.value || 0));
    state.pricing[skuCode] = skuPrice;
    const derived = input.closest('.partner-pricing-control')?.querySelector('.partner-pricing-derived');
    if (derived instanceof HTMLElement) {
      derived.textContent = `SKU price ${formatCurrency(skuPrice)}`;
    }
    return true;
  };

  const renderSelectionUi = () => {
    hydrateSelections();
    syncPricing();
    renderStepState();
    renderBrands();
    renderProducts();
    renderSummary();
    renderPricing();
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

  const renderDirectoryTotals = (partners) => {
    const brandNames = new Set();
    const productNames = new Set();
    let skuTotal = 0;

    partners.forEach((partner) => {
      partnerBrands(partner).forEach((brand) => brandNames.add(brand));
      partnerProductEntries(partner).forEach((entry) => productNames.add(`${entry.brand}:${entry.product}`));
      skuTotal += partnerSkuRecords(partner).length;
    });

    if (partnerCount) partnerCount.textContent = String(partners.length);
    if (partnerBrandTotal) partnerBrandTotal.textContent = String(brandNames.size);
    if (partnerProductTotal) partnerProductTotal.textContent = String(productNames.size);
    if (partnerSkuTotal) partnerSkuTotal.textContent = String(skuTotal);
  };

  const renderPartners = (partners = state.partners) => {
    if (!partnerList) return;
    const visiblePartners = partners.filter(partnerMatchesDirectorySearch);
    renderDirectoryTotals(visiblePartners);

    if (!visiblePartners.length) {
      partnerList.innerHTML = `<div class="admin-empty">${state.search.partners ? 'No matches.' : 'No partners.'}</div>`;
      return;
    }

    partnerList.innerHTML = visiblePartners.map((partner) => {
      const brands = partnerBrands(partner);
      const products = partnerProductEntries(partner);
      const skus = partnerSkuRecords(partner);
      const brandPreview = brands.slice(0, 3);
      const extraBrands = Math.max(0, brands.length - brandPreview.length);
      return `
        <article class="partner-directory-row">
          <div class="partner-directory-partner">
            <strong>${escapeHtml(partner.name || 'Partner')}</strong>
            <span>${escapeHtml(partner.code || '')}</span>
          </div>
          <div class="partner-directory-row-stats">
            <span><strong>${products.length}</strong><small>Products</small></span>
            <span><strong>${skus.length}</strong><small>SKUs</small></span>
          </div>
          <div class="partner-directory-brand-strip">
            ${brandPreview.length ? brandPreview.map((company) => `<span>${escapeHtml(company)}</span>`).join('') : '<span>None</span>'}
            ${extraBrands ? `<span>+${extraBrands}</span>` : ''}
          </div>
          <div class="partner-directory-row-actions">
            <a class="admin-primary-btn admin-link-btn" href="../partner-profile/?code=${encodeURIComponent(partner.code || '')}">Edit</a>
            <a class="admin-ghost-btn admin-link-btn" href="${escapeHtml(`${partnerSiteOrigin}${partner.store_path || '/'}`)}" target="_blank" rel="noopener">Open</a>
            <button type="button" class="admin-danger-btn" data-delete-partner="${escapeHtml(partner.code || '')}" data-delete-name="${escapeHtml(partner.name || 'Partner')}">Delete</button>
          </div>
        </article>
      `;
    }).join('');
  };

  partnerSearch?.addEventListener('input', () => {
    state.search.partners = partnerSearch.value || '';
    renderPartners();
  });

  const loadPartners = async () => {
    const payload = await requestJson();
    state.partners = payload.database?.partners || [];
    state.skuCatalog = payload.sku_catalog || state.skuCatalog;
    renderPartners();
    renderSelectionUi();
  };

  const closePartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = true;
    partnerForm?.reset();
    state.selections = { brands: [], products: [], skus: [] };
    state.pricing = {};
    state.activeProductId = '';
    state.activeStep = 'brands';
    state.slugManuallyEdited = false;
    setError('');
    renderSelectionUi();
    updateCreatePreview();
  };

  const openPartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = false;
    state.selections = { brands: [], products: [], skus: [] };
    state.pricing = {};
    state.activeStep = 'brands';
    state.activeProductId = '';
    state.slugManuallyEdited = false;
    if (partnerForm instanceof HTMLFormElement) {
      partnerForm.reset();
      partnerForm.elements.portal_password.value = generatePortalPassword();
    }
    renderSelectionUi();
    updateCreatePreview();
    partnerNameInput?.focus();
  };

  partnerNameInput?.addEventListener('input', () => {
    if (!state.slugManuallyEdited && partnerSlugInput instanceof HTMLInputElement) {
      partnerSlugInput.value = slugify(partnerNameInput.value);
    }
    updateCreatePreview();
  });

  partnerSlugInput?.addEventListener('input', () => {
    state.slugManuallyEdited = true;
    partnerSlugInput.value = slugify(partnerSlugInput.value);
    updateCreatePreview();
  });

  partnerPasswordInput?.addEventListener('input', updateCreatePreview);

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

    if (syncPriceInput(target)) {
      return;
    }
  });

  partnerModal?.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      syncPriceInput(target);
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
          pricing: state.pricing,
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
    updateCreatePreview();
  });

  loadPartners().catch((error) => {
    setError(error instanceof Error ? error.message : 'Unable to load partners.');
  });
});
