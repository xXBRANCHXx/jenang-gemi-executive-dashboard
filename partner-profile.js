document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-profile]');
  if (!root) return;

  const endpoint = root.dataset.partnersEndpoint || '../api/partners/';
  const form = document.querySelector('[data-profile-form]');
  const errorNode = document.querySelector('[data-profile-error]');
  const partnerName = document.querySelector('[data-partner-name]');
  const partnerCodeBadge = document.querySelector('[data-partner-code-badge]');
  const codeNote = document.querySelector('[data-note-code]');
  const urlNote = document.querySelector('[data-note-url]');
  const deleteButton = document.querySelector('[data-delete-profile]');
  const regenerateCodeButton = document.querySelector('[data-regenerate-partner-code]');

  const brandChoiceGrid = document.querySelector('[data-brand-choice-grid]');
  const productChoiceGrid = document.querySelector('[data-product-choice-grid]');
  const brandSearch = document.querySelector('[data-brand-search]');
  const productSearch = document.querySelector('[data-product-search]');
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
      products: ''
    },
    activeStep: 'brands',
    currentPartnerCode: root.dataset.partnerCode || ''
  };

  const generatePartnerCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint32Array(12);
    window.crypto.getRandomValues(bytes);
    const chars = Array.from(bytes, (value) => alphabet[value % alphabet.length]);
    return `JGP-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
  };

  const stepOrder = ['brands', 'products'];

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

  const matchesSearch = (value, searchTerm) => String(value || '').toLowerCase().includes(searchTerm.trim().toLowerCase());

  const hydrateSelections = () => {
    const validBrandIds = new Set(catalogBrands().map((brand) => brand.id));
    state.selections.brands = state.selections.brands.filter((brandId) => validBrandIds.has(brandId));

    const validSkuCodes = new Set(visibleBrandSkus().map((sku) => sku.sku));
    state.selections.skus = state.selections.skus.filter((skuCode) => validSkuCodes.has(skuCode));
    syncSelectedProductsFromSkus();
  };

  const syncSelectedProductsFromSkus = () => {
    const selected = selectedSkuSet();
    state.selections.products = filteredProducts()
      .filter((product) => productSkus(product).some((sku) => selected.has(sku.sku)))
      .map((product) => product.id);
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
    productChoiceGrid.innerHTML = products.map((product) => {
      const skus = productSkus(product);
      const selectedCount = skus.filter((sku) => selected.has(sku.sku)).length;
      const isChecked = skus.length > 0 && selectedCount === skus.length;
      const isPartial = selectedCount > 0 && selectedCount < skus.length;
      return `
        <article class="partner-product-toggle ${selectedCount > 0 ? 'has-selection' : ''}">
          <label class="partner-product-toggle-head">
            <input type="checkbox" data-partner-product-toggle value="${escapeHtml(product.id || '')}" ${isChecked ? 'checked' : ''} ${isPartial ? 'data-indeterminate="true"' : ''}>
            <span>
              <strong>${escapeHtml(product.display_name || product.name || '')}</strong>
              <small>${escapeHtml(product.brand_name || '')} · ${selectedCount}/${skus.length} SKUs</small>
            </span>
          </label>
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
        </article>
      `;
    }).join('');

    productChoiceGrid.querySelectorAll('[data-indeterminate="true"]').forEach((input) => {
      if (input instanceof HTMLInputElement) input.indeterminate = true;
    });
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
    form.elements.partner_code.value = partner.code || '';
    form.elements.name.value = partner.name || '';
    form.elements.partner_slug.value = partner.partner_slug || '';
    form.elements.notes.value = partner.notes || '';

    state.selections = {
      brands: [...new Set(partner.selected_brand_ids || [])],
      products: [...new Set(partner.selected_product_keys || partner.selected_product_ids || [])],
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
    if (!state.currentPartnerCode) throw new Error('Missing partner code.');
    const payload = await requestJson(`${endpoint}?code=${encodeURIComponent(state.currentPartnerCode)}`);
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

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches('[data-partner-brand]')) {
      state.selections.brands = Array.from(document.querySelectorAll('[data-partner-brand]:checked')).map((input) => input.value);
      renderSelectionUi();
      return;
    }

    if (target.matches('[data-partner-product-toggle]')) {
      const product = filteredProducts().find((item) => item.id === target.value);
      if (!product) return;
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

  form?.addEventListener('submit', async (event) => {
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
      const formData = new window.FormData(form);
      await requestJson(endpoint, {
        method: 'POST',
        body: {
          action: 'update',
          current_code: state.currentPartnerCode,
          code: formData.get('partner_code'),
          name: formData.get('name'),
          partner_slug: formData.get('partner_slug'),
          selected_skus: [...new Set(state.selections.skus)],
          notes: formData.get('notes')
        }
      });
      const nextCode = String(formData.get('partner_code') || '').trim();
      if (nextCode) {
        state.currentPartnerCode = nextCode;
        state.partner = { ...(state.partner || {}), code: nextCode };
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('code', nextCode);
        window.history.replaceState({}, '', nextUrl.toString());
      }
      await loadPartner();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save partner.');
    }
  });

  regenerateCodeButton?.addEventListener('click', () => {
    if (!(form instanceof HTMLFormElement)) return;
    form.elements.partner_code.value = generatePartnerCode();
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
