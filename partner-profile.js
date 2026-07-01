document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-profile]');
  if (!root) return;

  const endpoint = root.dataset.partnersEndpoint || '../api/partners/';
  const branchTierEndpoint = root.dataset.branchTierEndpoint || '../api/branch-tier/';
  const form = document.querySelector('[data-profile-form]');
  const loadingNode = document.querySelector('[data-profile-loading]');
  const errorNode = document.querySelector('[data-profile-error]');
  const toastNode = document.querySelector('[data-profile-toast]');
  const branchTierModal = document.querySelector('[data-branch-tier-modal]');
  const branchTierForm = document.querySelector('[data-branch-tier-form]');
  const branchTierPasswordInput = document.querySelector('[data-branch-tier-password]');
  const branchTierError = document.querySelector('[data-branch-tier-error]');
  const branchProtectedControls = document.querySelectorAll('[data-branch-protected-control]');
  const partnerName = document.querySelector('[data-partner-name]');
  const partnerCodeBadge = document.querySelector('[data-partner-code-badge]');
  const passwordNote = document.querySelector('[data-note-password]');
  const urlNote = document.querySelector('[data-note-url]');
  const deleteButton = document.querySelector('[data-delete-profile]');
  const regenerateCodeButton = document.querySelector('[data-regenerate-partner-code]');
  const generatePortalPasswordButton = document.querySelector('[data-generate-portal-password]');
  const createPasswordResetKeyButton = document.querySelector('[data-create-password-reset-key]');
  const branchUnlockButton = document.querySelector('[data-unlock-branch-tier]');
  const copyCodeButton = document.querySelector('[data-copy-partner-code]');
  const saveButtons = document.querySelectorAll('[data-save-profile]');
  const portalLinks = document.querySelectorAll('[data-partner-portal-link]');

  const brandFilterList = document.querySelector('[data-brand-filter-list]');
  const productFilterList = document.querySelector('[data-product-filter-list]');
  const skuSearch = document.querySelector('[data-sku-search]');
  const skuList = document.querySelector('[data-sku-list]');
  const selectedSkuList = document.querySelector('[data-partner-selected-skus]');

  const accessCount = document.querySelector('[data-partner-access-count]');
  const productCount = document.querySelector('[data-partner-product-count]');
  const brandCount = document.querySelector('[data-partner-brand-count]');
  const selectedCount = document.querySelector('[data-partner-selected-count]');
  const selectedSummary = document.querySelector('[data-partner-selected-summary]');
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
    pricing: {},
    activeBrandId: 'all',
    activeProductId: 'all',
    skuSearch: '',
    currentPartnerCode: root.dataset.partnerCode || '',
    branchUnlocked: false
  };

  const generatePartnerCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint32Array(12);
    window.crypto.getRandomValues(bytes);
    const chars = Array.from(bytes, (value) => alphabet[value % alphabet.length]);
    return `JGP-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
  };

  const generatePortalPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = new Uint32Array(14);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
  };

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

  const skuUnitLabel = (sku = {}) => {
    const volume = formatNumber(sku.volume || 0);
    const unit = String(sku.unit_name || '').trim();
    return `${volume}${unit ? ` ${unit}` : ''}`.trim() || '1 unit';
  };

  const setError = (message) => {
    if (!errorNode) return;
    errorNode.hidden = !message;
    errorNode.textContent = message || '';
  };

  const setBranchError = (message) => {
    if (!branchTierError) return;
    branchTierError.hidden = !message;
    branchTierError.textContent = message || '';
  };

  const renderBranchProtection = () => {
    branchProtectedControls.forEach((control) => {
      if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement)) return;
      control.disabled = !state.branchUnlocked;
    });

    if (form instanceof HTMLFormElement) {
      const passwordInput = form.elements.portal_password;
      if (passwordInput instanceof HTMLInputElement) {
        passwordInput.placeholder = state.branchUnlocked ? 'Configured' : 'Unlock Branch-tier access';
      }
    }

    if (branchUnlockButton instanceof HTMLButtonElement) {
      branchUnlockButton.disabled = state.branchUnlocked;
      branchUnlockButton.classList.toggle('is-unlocked', state.branchUnlocked);
      branchUnlockButton.setAttribute('aria-label', state.branchUnlocked ? 'Branch-tier password controls unlocked' : 'Unlock Branch-tier password controls');
      branchUnlockButton.title = state.branchUnlocked ? 'Branch-tier password controls unlocked' : 'Unlock Branch-tier password controls';
    }
  };

  const openBranchTierModal = () => {
    if (!(branchTierModal instanceof HTMLElement) || !(branchTierForm instanceof HTMLFormElement)) return;
    branchTierModal.hidden = false;
    branchTierForm.reset();
    setBranchError('');
    branchTierPasswordInput?.focus();
  };

  const closeBranchTierModal = () => {
    if (!(branchTierModal instanceof HTMLElement) || !(branchTierForm instanceof HTMLFormElement)) return;
    branchTierModal.hidden = true;
    branchTierForm.reset();
    setBranchError('');
  };

  const showToast = () => {
    if (!toastNode) return;
    toastNode.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toastNode.hidden = true;
    }, 1500);
  };

  const setSaving = (saving) => {
    saveButtons.forEach((button) => {
      button.disabled = saving;
      button.textContent = saving ? 'Saving...' : 'Save profile';
    });
  };

  const catalogBrands = () => Array.isArray(state.skuCatalog.brands) ? state.skuCatalog.brands : [];
  const catalogSkus = () => Array.isArray(state.skuCatalog.skus) ? state.skuCatalog.skus : [];

  const productRecords = () => catalogBrands().flatMap((brand) => (
    Array.isArray(brand.products) ? brand.products : []
  ).map((product) => ({
    ...product,
    brand_id: brand.id,
    brand_name: brand.name
  })));

  const selectedSkuSet = () => new Set(state.selections.skus);
  const productSkus = (productId) => catalogSkus().filter((sku) => sku.product_key === productId);

  const selectedSkuRecords = () => {
    const selected = selectedSkuSet();
    return catalogSkus().filter((sku) => selected.has(sku.sku));
  };

  const deriveSelectionsFromSkus = () => {
    const selectedRecords = selectedSkuRecords();
    state.selections.brands = [...new Set(selectedRecords.map((sku) => sku.brand_id).filter(Boolean))];
    state.selections.products = [...new Set(selectedRecords.map((sku) => sku.product_key).filter(Boolean))];
  };

  const visibleProducts = () => productRecords().filter((product) => (
    state.activeBrandId === 'all' || product.brand_id === state.activeBrandId
  ));

  const hydrateSelections = () => {
    const validSkuCodes = new Set(catalogSkus().map((sku) => sku.sku));
    state.selections.skus = [...new Set(state.selections.skus)]
      .filter((skuCode) => validSkuCodes.has(skuCode));

    const nextPricing = {};
    state.selections.skus.forEach((skuCode) => {
      nextPricing[skuCode] = Math.max(0, Number(state.pricing[skuCode] || 0));
    });
    state.pricing = nextPricing;
    deriveSelectionsFromSkus();

    const visibleProductIds = new Set(visibleProducts().map((product) => product.id));
    if (state.activeProductId !== 'all' && !visibleProductIds.has(state.activeProductId)) {
      state.activeProductId = 'all';
    }
  };

  const visibleSkus = () => {
    const query = state.skuSearch.trim().toLowerCase();
    return catalogSkus().filter((sku) => {
      if (state.activeBrandId !== 'all' && sku.brand_id !== state.activeBrandId) return false;
      if (state.activeProductId !== 'all' && sku.product_key !== state.activeProductId) return false;
      if (!query) return true;
      return [
        sku.sku,
        sku.tag,
        sku.label,
        sku.product_name,
        sku.base_product_name,
        sku.flavor_name,
        sku.brand_name
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  };

  const selectedBrandCount = () => state.selections.brands.length;
  const selectedProductCount = () => state.selections.products.length;

  const brandSkuStats = (brandId) => {
    const skus = brandId === 'all'
      ? catalogSkus()
      : catalogSkus().filter((sku) => sku.brand_id === brandId);
    const selected = selectedSkuSet();
    return {
      total: skus.length,
      selected: skus.filter((sku) => selected.has(sku.sku)).length
    };
  };

  const productSkuStats = (productId) => {
    const skus = productId === 'all'
      ? visibleProducts().flatMap((product) => productSkus(product.id))
      : productSkus(productId);
    const selected = selectedSkuSet();
    return {
      total: skus.length,
      selected: skus.filter((sku) => selected.has(sku.sku)).length
    };
  };

  const renderStats = () => {
    const skuCount = state.selections.skus.length;
    if (accessCount) accessCount.textContent = skuCount.toLocaleString('id-ID');
    if (selectedCount) selectedCount.textContent = skuCount.toLocaleString('id-ID');
    if (productCount) productCount.textContent = selectedProductCount().toLocaleString('id-ID');
    if (brandCount) brandCount.textContent = `across ${selectedBrandCount().toLocaleString('id-ID')} brands`;
    if (brandSummary) brandSummary.textContent = selectedBrandCount().toLocaleString('id-ID');
    if (productSummary) productSummary.textContent = selectedProductCount().toLocaleString('id-ID');
    if (skuSummary) skuSummary.textContent = skuCount.toLocaleString('id-ID');
    if (selectedSummary) {
      selectedSummary.textContent = skuCount
        ? `${skuCount.toLocaleString('id-ID')} selected SKU links. Product toggles can still adjust groups.`
        : 'Product toggles select all matching SKUs. Individual SKUs and prices can still be adjusted.';
    }
  };

  const renderBrandFilters = () => {
    if (!brandFilterList) return;
    const brands = catalogBrands();
    const allStats = brandSkuStats('all');
    const brandRows = brands.map((brand) => {
      const stats = brandSkuStats(brand.id);
      const active = state.activeBrandId === brand.id;
      return `
        <button type="button" class="partner-profile-filter-choice${active ? ' is-active' : ''}" data-brand-filter="${escapeHtml(brand.id || '')}">
          <span>${escapeHtml(brand.name || 'Unnamed brand')}</span>
          <strong>${stats.selected}/${stats.total}</strong>
        </button>
      `;
    }).join('');

    brandFilterList.innerHTML = `
      <button type="button" class="partner-profile-filter-choice${state.activeBrandId === 'all' ? ' is-active' : ''}" data-brand-filter="all">
        <span>All brands</span>
        <strong>${allStats.selected}/${allStats.total}</strong>
      </button>
      ${brandRows || '<div class="partner-access-empty">No brands are available.</div>'}
    `;
  };

  const renderProductFilters = () => {
    if (!productFilterList) return;
    const products = visibleProducts();
    const allStats = productSkuStats('all');
    const productRows = products.map((product) => {
      const stats = productSkuStats(product.id);
      const active = state.activeProductId === product.id;
      const allSelected = stats.total > 0 && stats.selected === stats.total;
      return `
        <div class="partner-profile-product-row${active ? ' is-active' : ''}">
          <button type="button" class="partner-profile-product-filter" data-product-filter="${escapeHtml(product.id || '')}">
            <span>${escapeHtml(product.display_name || product.name || 'Unnamed product')}</span>
            <small>${escapeHtml(product.brand_name || '')} &middot; ${stats.selected}/${stats.total}</small>
          </button>
          <button type="button" class="partner-profile-check-btn${allSelected ? ' is-selected' : ''}" data-product-toggle="${escapeHtml(product.id || '')}" aria-label="Toggle ${escapeHtml(product.name || 'product')} access">${allSelected ? '&#10003;' : ''}</button>
        </div>
      `;
    }).join('');

    productFilterList.innerHTML = `
      <button type="button" class="partner-profile-filter-choice${state.activeProductId === 'all' ? ' is-active' : ''}" data-product-filter="all">
        <span>All products</span>
        <strong>${allStats.selected}/${allStats.total}</strong>
      </button>
      ${productRows || '<div class="partner-access-empty">No products match this brand.</div>'}
    `;
  };

  const renderSkuList = () => {
    if (!skuList) return;
    const rows = visibleSkus();
    const selected = selectedSkuSet();
    if (!rows.length) {
      skuList.innerHTML = `<div class="partner-access-empty">${state.skuSearch ? 'No SKUs match that search.' : 'No SKU records match this filter.'}</div>`;
      return;
    }

    skuList.innerHTML = rows.map((sku) => {
      const isSelected = selected.has(sku.sku);
      const price = Math.max(0, Number(state.pricing[sku.sku] || 0));
      return `
        <div class="partner-profile-sku-row${isSelected ? ' is-selected' : ''}">
          <button type="button" class="partner-profile-check-btn${isSelected ? ' is-selected' : ''}" data-toggle-sku="${escapeHtml(sku.sku || '')}" aria-label="Toggle ${escapeHtml(sku.label || sku.sku || 'SKU')}">${isSelected ? '&#10003;' : ''}</button>
          <div class="partner-profile-sku-main">
            <strong>${escapeHtml(sku.label || sku.product_name || sku.sku || '')}</strong>
            <small>${escapeHtml(sku.sku || '')}</small>
          </div>
          <span>${escapeHtml(sku.flavor_name || 'Default')}</span>
          <span>${escapeHtml(skuUnitLabel(sku))}</span>
          <label class="partner-profile-price">
            <input type="number" min="0" step="100" inputmode="decimal" value="${escapeHtml(price)}" data-partner-sku-price="${escapeHtml(sku.sku || '')}" aria-label="Partner unit price for ${escapeHtml(sku.label || sku.sku || 'SKU')}">
          </label>
        </div>
      `;
    }).join('');
  };

  const renderSelectedSkus = () => {
    if (!selectedSkuList) return;
    const rows = selectedSkuRecords();
    if (!rows.length) {
      selectedSkuList.innerHTML = '<div class="partner-access-empty">Selected SKU links will show here.</div>';
      return;
    }

    selectedSkuList.innerHTML = rows.map((sku) => {
      const unitPrice = Math.max(0, Number(state.pricing[sku.sku] || 0));
      const skuPrice = unitPrice * skuUnitCount(sku);
      return `
        <article class="partner-profile-selected-card">
          <div class="partner-profile-selected-icon">SKU</div>
          <div>
            <strong>${escapeHtml(sku.label || sku.product_name || sku.sku || '')}</strong>
            <small>${escapeHtml(sku.sku || '')}</small>
            <span>SKU price ${escapeHtml(formatCurrency(skuPrice))}</span>
          </div>
          <button type="button" class="partner-profile-remove-btn" data-toggle-sku="${escapeHtml(sku.sku || '')}" aria-label="Remove ${escapeHtml(sku.label || sku.sku || 'SKU')}">Remove</button>
        </article>
      `;
    }).join('');
  };

  const renderAll = () => {
    hydrateSelections();
    renderStats();
    renderBrandFilters();
    renderProductFilters();
    renderSkuList();
    renderSelectedSkus();
  };

  const toggleSku = (skuCode) => {
    const selected = selectedSkuSet();
    if (selected.has(skuCode)) {
      selected.delete(skuCode);
    } else {
      selected.add(skuCode);
    }
    state.selections.skus = [...selected];
    renderAll();
  };

  const toggleProduct = (productId) => {
    const skus = productSkus(productId);
    if (!skus.length) return;
    const selected = selectedSkuSet();
    const allSelected = skus.every((sku) => selected.has(sku.sku));
    skus.forEach((sku) => {
      if (allSelected) {
        selected.delete(sku.sku);
      } else {
        selected.add(sku.sku);
      }
    });
    state.selections.skus = [...selected];
    renderAll();
  };

  const fillForm = (partner) => {
    if (!(form instanceof HTMLFormElement)) return;
    state.partner = partner;
    form.hidden = false;
    if (loadingNode) loadingNode.hidden = true;
    form.elements.code.value = partner.code || '';
    form.elements.partner_code.value = partner.code || '';
    form.elements.name.value = partner.name || '';
    form.elements.partner_slug.value = partner.partner_slug || '';
    form.elements.portal_password.value = '';
    form.elements.notes.value = partner.notes || '';

    state.selections.skus = [...new Set(partner.selected_skus || [])];
    state.pricing = { ...(partner.pricing || {}) };

    const title = partner.name || partner.code || 'Partner';
    if (partnerName) partnerName.textContent = `Edit ${title}`;
    if (partnerCodeBadge) partnerCodeBadge.textContent = partner.code || 'Partner';
    if (passwordNote) {
      const passwordStatus = partner.password_configured
        ? `Configured${partner.password_updated_at ? `; updated ${partner.password_updated_at}` : ''}`
        : 'Not configured. Set a new password here.';
      passwordNote.textContent = partner.password_reset_key_active
        ? `${passwordStatus}. One-time reset key active${partner.password_reset_key_created_at ? ` since ${partner.password_reset_key_created_at}` : ''}.`
        : passwordStatus;
    }

    const portalHref = `https://partner.jenanggemi.com${partner.store_path || '/'}`;
    portalLinks.forEach((link) => {
      link.href = portalHref;
    });
    if (urlNote) urlNote.textContent = portalHref;

    if (deleteButton) {
      deleteButton.hidden = false;
      deleteButton.dataset.partnerCode = partner.code || '';
      deleteButton.dataset.partnerName = partner.name || 'Partner';
    }

    renderBranchProtection();
    renderAll();
  };

  const showSavedPortalPassword = (password) => {
    if (!(form instanceof HTMLFormElement) || !password) return;
    form.elements.portal_password.value = password;
    if (passwordNote) {
      passwordNote.textContent = `Password reset saved: ${password}`;
    }
  };

  const showCreatedResetKey = (resetKey) => {
    if (!resetKey || !passwordNote) return;
    passwordNote.textContent = `One-time reset key: ${resetKey}. It is valid for 24 hours and will only be shown here once.`;
  };

  const loadPartner = async () => {
    if (!state.currentPartnerCode) throw new Error('Missing partner code.');
    const payload = await requestJson(`${endpoint}?code=${encodeURIComponent(state.currentPartnerCode)}`);
    state.skuCatalog = payload.sku_catalog || state.skuCatalog;
    fillForm(payload.partner || {});
  };

  const loadBranchTierState = async () => {
    const payload = await requestJson(branchTierEndpoint);
    state.branchUnlocked = Boolean(payload.branch_unlocked);
    renderBranchProtection();
  };

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const brandButton = target.closest('[data-brand-filter]');
    if (brandButton) {
      state.activeBrandId = brandButton.getAttribute('data-brand-filter') || 'all';
      state.activeProductId = 'all';
      renderAll();
      return;
    }

    const productFilter = target.closest('[data-product-filter]');
    if (productFilter) {
      state.activeProductId = productFilter.getAttribute('data-product-filter') || 'all';
      renderAll();
      return;
    }

    const productToggle = target.closest('[data-product-toggle]');
    if (productToggle) {
      toggleProduct(productToggle.getAttribute('data-product-toggle') || '');
      return;
    }

    const skuToggle = target.closest('[data-toggle-sku]');
    if (skuToggle) {
      toggleSku(skuToggle.getAttribute('data-toggle-sku') || '');
      return;
    }

    if (target.closest('[data-clear-selection]')) {
      state.selections.skus = [];
      renderAll();
    }
  });

  skuSearch?.addEventListener('input', () => {
    state.skuSearch = skuSearch.value || '';
    renderSkuList();
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const skuCode = target.getAttribute('data-partner-sku-price');
    if (!skuCode) return;
    state.pricing[skuCode] = Math.max(0, Number(target.value || 0));
    renderSelectedSkus();
  });

  regenerateCodeButton?.addEventListener('click', () => {
    if (!(form instanceof HTMLFormElement)) return;
    form.elements.partner_code.value = generatePartnerCode();
    if (partnerCodeBadge) partnerCodeBadge.textContent = form.elements.partner_code.value;
  });

  generatePortalPasswordButton?.addEventListener('click', () => {
    if (!(form instanceof HTMLFormElement)) return;
    if (!state.branchUnlocked) return;
    form.elements.portal_password.value = generatePortalPassword();
  });

  branchUnlockButton?.addEventListener('click', () => {
    if (state.branchUnlocked) return;
    openBranchTierModal();
  });

  document.querySelectorAll('[data-close-branch-tier-modal]').forEach((button) => {
    button.addEventListener('click', closeBranchTierModal);
  });

  branchTierForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setBranchError('');

    const password = branchTierPasswordInput instanceof HTMLInputElement ? branchTierPasswordInput.value : '';
    try {
      const submitButton = branchTierForm.querySelector('button[type="submit"]');
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = 'Unlocking...';
      }

      const payload = await requestJson(branchTierEndpoint, {
        method: 'POST',
        body: { password }
      });
      state.branchUnlocked = Boolean(payload.branch_unlocked);
      renderBranchProtection();
      closeBranchTierModal();
    } catch (error) {
      setBranchError(error instanceof Error ? error.message : 'Branch Tier Access password is invalid.');
    } finally {
      const submitButton = branchTierForm.querySelector('button[type="submit"]');
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = 'Unlock';
      }
    }
  });

  createPasswordResetKeyButton?.addEventListener('click', async () => {
    if (!state.branchUnlocked) return;
    const code = String(state.currentPartnerCode || '').trim();
    if (!code) {
      setError('Save the partner profile before creating a reset key.');
      return;
    }

    setError('');
    try {
      createPasswordResetKeyButton.disabled = true;
      createPasswordResetKeyButton.textContent = 'Creating...';
      const payload = await requestJson(endpoint, {
        method: 'POST',
        body: {
          action: 'create_password_reset_key',
          code
        }
      });
      if (payload.partner) {
        fillForm(payload.partner);
      }
      showCreatedResetKey(payload.password_reset_key || '');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create reset key.');
    } finally {
      createPasswordResetKeyButton.disabled = false;
      createPasswordResetKeyButton.textContent = 'Create one-time reset key';
    }
  });

  copyCodeButton?.addEventListener('click', async () => {
    if (!(form instanceof HTMLFormElement)) return;
    const code = String(form.elements.partner_code.value || '').trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      copyCodeButton.textContent = 'Copied';
      window.setTimeout(() => {
        copyCodeButton.textContent = 'Copy';
      }, 900);
    } catch (_) {
      copyCodeButton.textContent = 'Copy failed';
      window.setTimeout(() => {
        copyCodeButton.textContent = 'Copy';
      }, 900);
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError('');
    hydrateSelections();

    if (!state.selections.skus.length) {
      setError('Select at least one SKU for this partner.');
      return;
    }

    try {
      setSaving(true);
      const formData = new window.FormData(form);
      const savedPortalPassword = String(formData.get('portal_password') || '').trim();
      const payload = await requestJson(endpoint, {
        method: 'POST',
        body: {
          action: 'update',
          current_code: state.currentPartnerCode,
          code: formData.get('partner_code'),
          name: formData.get('name'),
          partner_slug: formData.get('partner_slug'),
          portal_password: formData.get('portal_password'),
          selected_skus: [...new Set(state.selections.skus)],
          pricing: state.pricing,
          notes: formData.get('notes')
        }
      });
      state.skuCatalog = payload.sku_catalog || state.skuCatalog;
      const savedPartner = payload.partner || {};
      const nextCode = String(savedPartner.code || formData.get('partner_code') || '').trim();
      if (nextCode) {
        state.currentPartnerCode = nextCode;
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('code', nextCode);
        window.history.replaceState({}, '', nextUrl.toString());
      }
      fillForm(savedPartner);
      showSavedPortalPassword(savedPortalPassword);
      showToast();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save partner.');
    } finally {
      setSaving(false);
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

  loadBranchTierState().catch(() => {
    state.branchUnlocked = false;
    renderBranchProtection();
  });

  loadPartner().catch((error) => {
    if (loadingNode) loadingNode.hidden = true;
    setError(error instanceof Error ? error.message : 'Unable to load partner.');
  });
});
