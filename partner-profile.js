document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-profile]');
  if (!root) return;

  const endpoint = root.dataset.partnersEndpoint || '../api/partners/';
  const partnerCode = root.dataset.partnerCode || '';
  const form = document.querySelector('[data-profile-form]');
  const errorNode = document.querySelector('[data-profile-error]');
  const partnerName = document.querySelector('[data-partner-name]');
  const partnerCodeBadge = document.querySelector('[data-partner-code-badge]');
  const codeNote = document.querySelector('[data-note-code]');
  const urlNote = document.querySelector('[data-note-url]');
  const deleteButton = document.querySelector('[data-delete-profile]');

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
    skuCatalog: {
      brands: [],
      skus: []
    },
    partner: null,
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

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
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

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const setError = (message) => {
    if (!errorNode) return;
    errorNode.hidden = !message;
    errorNode.textContent = message || '';
  };

  const catalogBrands = () => state.skuCatalog.brands || [];
  const catalogSkus = () => state.skuCatalog.skus || [];
  const selectedBrandRecords = () => catalogBrands().filter((brand) => state.selections.brands.includes(brand.id));
  const filteredProducts = () => selectedBrandRecords()
    .flatMap((brand) => (brand.products || []).map((product) => ({ ...product, brand_id: brand.id, brand_name: brand.name })));
  const selectedProductRecords = () => filteredProducts().filter((product) => state.selections.products.includes(product.id));
  const filteredSkus = () => {
    const allowedBrands = new Set(state.selections.brands);
    const allowedProducts = new Set(state.selections.products);
    return catalogSkus().filter((sku) => allowedBrands.has(sku.brand_id) && allowedProducts.has(sku.product_id));
  };

  const matchesSearch = (value, searchTerm) => String(value || '').toLowerCase().includes(searchTerm.trim().toLowerCase());

  const hydrateSelections = () => {
    const validBrandIds = new Set(catalogBrands().map((brand) => brand.id));
    state.selections.brands = state.selections.brands.filter((brandId) => validBrandIds.has(brandId));

    const validProductIds = new Set(filteredProducts().map((product) => product.id));
    state.selections.products = state.selections.products.filter((productId) => validProductIds.has(productId));

    const validSkuCodes = new Set(filteredSkus().map((sku) => sku.sku));
    state.selections.skus = state.selections.skus.filter((skuCode) => validSkuCodes.has(skuCode));
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
          <span class="partner-access-choice-meta">${escapeHtml(product.brand_name || '')} · ${escapeHtml(product.code || '--')} · ${Number(product.sku_count || 0)} SKUs in catalog</span>
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

  const openStep = (step) => {
    state.activeStep = step;
    renderStepState();
  };

  const fillForm = (partner) => {
    if (!(form instanceof HTMLFormElement)) return;
    state.partner = partner;
    form.hidden = false;
    form.elements.code.value = partner.code || '';
    form.elements.name.value = partner.name || '';
    form.elements.partner_slug.value = partner.partner_slug || '';
    form.elements.notes.value = partner.notes || '';

    state.selections = {
      brands: [...new Set(partner.selected_brand_ids || [])],
      products: [...new Set(partner.selected_product_ids || [])],
      skus: [...new Set(partner.selected_skus || [])]
    };

    if (partnerName) partnerName.textContent = partner.name || partner.code || 'Partner';
    if (partnerCodeBadge) partnerCodeBadge.textContent = partner.code || 'Partner';
    if (codeNote) codeNote.textContent = partner.code || 'Pending';
    if (urlNote) urlNote.textContent = `https://partner.jenanggemi.com${partner.store_path || '/'}`;
    if (deleteButton) {
      deleteButton.hidden = false;
      deleteButton.dataset.partnerCode = partner.code || '';
      deleteButton.dataset.partnerName = partner.name || 'Partner';
    }

    renderSelectionUi();
  };

  const loadPartner = async () => {
    if (!partnerCode) throw new Error('Missing partner code.');
    const payload = await requestJson(`${endpoint}?code=${encodeURIComponent(partnerCode)}`);
    state.skuCatalog = payload.sku_catalog || state.skuCatalog;
    fillForm(payload.partner || {});
  };

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

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches('[data-partner-brand]')) {
      state.selections.brands = Array.from(document.querySelectorAll('[data-partner-brand]:checked')).map((input) => input.value);
      renderSelectionUi();
      return;
    }

    if (target.matches('[data-partner-product]')) {
      state.selections.products = Array.from(document.querySelectorAll('[data-partner-product]:checked')).map((input) => input.value);
      renderSelectionUi();
      return;
    }

    if (target.matches('[data-partner-sku]')) {
      state.selections.skus = Array.from(document.querySelectorAll('[data-partner-sku]:checked')).map((input) => input.value);
      renderSelectionUi();
    }
  });

  form?.addEventListener('submit', async (event) => {
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
      const formData = new window.FormData(form);
      await requestJson(endpoint, {
        method: 'POST',
        body: {
          action: 'update',
          code: formData.get('code'),
          name: formData.get('name'),
          partner_slug: formData.get('partner_slug'),
          selected_skus: [...new Set(state.selections.skus)],
          notes: formData.get('notes')
        }
      });
      await loadPartner();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save partner.');
    }
  });

  deleteButton?.addEventListener('click', async () => {
    const code = deleteButton.dataset.partnerCode || '';
    const name = deleteButton.dataset.partnerName || 'this partner';
    const confirmed = window.confirm(`Delete ${name}? This will remove the partner record.`);
    if (!confirmed) return;

    setError('');

    try {
      deleteButton.disabled = true;
      await requestJson(endpoint, {
        method: 'POST',
        body: {
          action: 'delete',
          code
        }
      });
      window.location.href = '../partner-profiles/';
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to delete partner.');
      deleteButton.disabled = false;
    }
  });

  loadPartner().catch((error) => {
    setError(error instanceof Error ? error.message : 'Unable to load partner.');
  });
});
