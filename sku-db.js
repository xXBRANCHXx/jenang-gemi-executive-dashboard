document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-sku-db]');
  if (!root) return;

  const endpoint = root.dataset.skuDbEndpoint || '../api/sku-db/';
  const role = root.dataset.skuRole || 'requester';
  const username = root.dataset.skuUsername || '';
  const themeStorageKey = 'jg-admin-theme';
  const themeCookieMaxAge = 60 * 60 * 24 * 365 * 2;
  const brandSessionStorageKey = 'jg-sku-db-selected-brand';

  const masterError = document.querySelector('[data-master-form-error]');
  const requestError = document.querySelector('[data-request-error]');
  const requestSubmitError = document.querySelector('[data-request-submit-error]');
  const setupError = document.querySelector('[data-setup-error]');
  const applyError = document.querySelector('[data-apply-error]');
  const cogsError = document.querySelector('[data-cogs-error]');
  const salePriceError = document.querySelector('[data-sale-price-error]');
  const productNameError = document.querySelector('[data-product-name-error]');
  const astraError = document.querySelector('[data-astra-error]');
  const inventoryError = document.querySelector('[data-inventory-error]');
  const approvalError = document.querySelector('[data-approval-error]');
  const skuPreview = document.querySelector('[data-sku-preview]');
  const skuSegmentStrip = document.querySelector('[data-sku-segment-strip]');
  const applyPreview = document.querySelector('[data-apply-preview]');
  const applyPanel = document.querySelector('[data-apply-panel]');
  const setupForm = document.querySelector('[data-setup-form]');
  const applyForm = document.querySelector('[data-apply-form]');
  const requestForm = document.querySelector('[data-request-form]');
  const cogsModal = document.querySelector('[data-cogs-modal]');
  const cogsForm = document.querySelector('[data-cogs-form]');
  const salePriceModal = document.querySelector('[data-sale-price-modal]');
  const salePriceForm = document.querySelector('[data-sale-price-form]');
  const productNameModal = document.querySelector('[data-product-name-modal]');
  const productNameForm = document.querySelector('[data-product-name-form]');
  const astraModal = document.querySelector('[data-astra-modal]');
  const astraForm = document.querySelector('[data-astra-form]');
  const inventoryModal = document.querySelector('[data-inventory-modal]');
  const inventoryForm = document.querySelector('[data-inventory-form]');
  const inventoryAction = inventoryForm?.querySelector('[data-inventory-action]');
  const approvalModal = document.querySelector('[data-approval-modal]');
  const approvalForm = document.querySelector('[data-approval-form]');
  const approvalSummary = document.querySelector('[data-approval-summary]');
  const approvalRequester = document.querySelector('[data-approval-requester]');
  const deleteModal = document.querySelector('[data-delete-modal]');
  const deleteForm = document.querySelector('[data-delete-form]');
  const deleteSummary = document.querySelector('[data-delete-summary]');
  const deleteError = document.querySelector('[data-delete-error]');
  const branchTierModal = document.querySelector('[data-branch-tier-modal]');
  const branchTierKeyInput = document.querySelector('[data-branch-tier-key]');
  const requestList = document.querySelector('[data-request-list]');
  const tableBody = document.querySelector('[data-sku-table-body]');
  const approvedLivePdfButton = document.querySelector('[data-download-approved-live-pdf]');
  const brandList = document.querySelector('[data-brand-list]');
  const unitList = document.querySelector('[data-unit-list]');
  const flavorList = document.querySelector('[data-flavor-list]');
  const productList = document.querySelector('[data-product-list]');
  const searchInput = document.querySelector('[data-sku-search]');
  const visibleCountNode = document.querySelector('[data-sku-visible-count]');
  const filterBrand = document.querySelector('[data-filter-brand]');
  const filterUnit = document.querySelector('[data-filter-unit]');
  const filterFlavor = document.querySelector('[data-filter-flavor]');
  const filterProduct = document.querySelector('[data-filter-product]');
  const shopeePricePreviewButton = document.querySelector('[data-shopee-price-preview]');
  const shopeePriceApplyButton = document.querySelector('[data-shopee-price-apply]');
  const shopeePriceSiteSyncButton = document.querySelector('[data-shopee-price-site-sync]');
  const shopeePriceStatus = document.querySelector('[data-shopee-price-status]');
  const shopeePriceError = document.querySelector('[data-shopee-price-error]');
  const shopeePriceBody = document.querySelector('[data-shopee-price-body]');
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
    activeApprovalRequestId: null,
    pendingDelete: null,
    shopeePrice: {
      loading: false,
      applying: false,
      syncing: false,
      siteSyncReady: false,
      suggestions: [],
      meta: null
    }
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

  const copyMessage = document.createElement('div');
  let copyMessageTimer = 0;
  let copyMessageCleanupTimer = 0;
  copyMessage.className = 'admin-sku-copy-message';
  copyMessage.setAttribute('role', 'status');
  copyMessage.setAttribute('aria-live', 'polite');
  copyMessage.hidden = true;
  root.append(copyMessage);

  const showCopyMessage = (message, isError = false, placement = 'corner') => {
    copyMessage.textContent = message;
    copyMessage.classList.remove('is-hiding');
    copyMessage.classList.toggle('is-error', isError);
    copyMessage.classList.toggle('is-center', placement === 'center');
    copyMessage.hidden = false;
    window.clearTimeout(copyMessageTimer);
    window.clearTimeout(copyMessageCleanupTimer);
    copyMessageTimer = window.setTimeout(() => {
      copyMessage.classList.add('is-hiding');
      copyMessageCleanupTimer = window.setTimeout(() => {
        copyMessage.hidden = true;
        copyMessage.classList.remove('is-center', 'is-hiding');
      }, 360);
    }, 1700);
  };

  const pdfByteLength = (value) => new Blob([value]).size;

  const normalizePdfText = (value) => String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');

  const escapePdfString = (value) => normalizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  const truncatePdfText = (value, maxCharacters) => {
    const normalized = normalizePdfText(value).replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxCharacters) return normalized;
    return `${normalized.slice(0, Math.max(0, maxCharacters - 3))}...`;
  };

  const buildPdfDocument = (pageContents) => {
    const pageCount = pageContents.length;
    const fontObjectNumber = 3 + (pageCount * 2);
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${pageContents.map((_, index) => `${3 + (index * 2)} 0 R`).join(' ')}] /Count ${pageCount} >>`
    ];

    pageContents.forEach((content, index) => {
      const pageObjectNumber = 3 + (index * 2);
      const contentObjectNumber = pageObjectNumber + 1;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
      objects.push(`<< /Length ${pdfByteLength(content)} >>\nstream\n${content}\nendstream`);
    });

    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((body, index) => {
      offsets[index + 1] = pdfByteLength(pdf);
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = pdfByteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  };

  const buildApprovedLivePdf = (rows) => {
    const pageWidth = 842;
    const pageHeight = 595;
    const margin = 32;
    const rowHeight = 18;
    const rowsPerPage = 24;
    const generatedAt = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const columns = [
      { label: 'SKU', width: 75, value: (row) => row.sku, chars: 14 },
      { label: 'TAG', width: 100, value: (row) => row.tag, chars: 21 },
      { label: 'Product Name', width: 110, value: (row) => row.product_name, chars: 24 },
      { label: 'Brand', width: 80, value: (row) => row.brand_name, chars: 17 },
      { label: 'Flavor', width: 70, value: (row) => row.flavor_name, chars: 15 },
      { label: 'Unit', width: 50, value: (row) => row.unit_name, chars: 10 },
      { label: 'Vol', width: 35, value: (row) => row.volume, chars: 7 },
      { label: 'ASTRA', width: 40, value: (row) => row.astra ?? '', chars: 8 },
      { label: 'Stock', width: 40, value: (row) => row.current_stock ?? row.starting_stock ?? 0, chars: 8 },
      { label: 'Trigger', width: 40, value: (row) => row.stock_trigger ?? 0, chars: 8 },
      { label: 'COGS', width: 60, value: (row) => row.cogs ?? 0, chars: 11 },
      { label: 'Sale', width: 65, value: (row) => row.sale_price ?? 0, chars: 12 }
    ];
    const tableWidth = columns.reduce((total, column) => total + column.width, 0);

    const drawText = (commands, text, x, y, size = 7) => {
      commands.push(`0 0 0 rg BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfString(text)}) Tj ET`);
    };

    const drawMutedText = (commands, text, x, y, size = 7) => {
      commands.push(`0.35 0.35 0.35 rg BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfString(text)}) Tj ET`);
    };

    const drawRule = (commands, x1, y, x2) => {
      commands.push(`0.80 0.80 0.80 RG 0.5 w ${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`);
    };

    const drawHeader = (commands, pageNumber, pageTotal) => {
      drawText(commands, 'Approved Live SKU Database', margin, pageHeight - 38, 16);
      drawMutedText(commands, `Generated ${generatedAt} | Version ${state.database.meta?.version || '1.00.00'} | ${rows.length} approved live SKUs`, margin, pageHeight - 56, 8);
      drawMutedText(commands, `Page ${pageNumber} of ${pageTotal}`, pageWidth - margin - 72, pageHeight - 56, 8);
      drawRule(commands, margin, pageHeight - 72, pageWidth - margin);
    };

    const drawTableHeader = (commands, y) => {
      commands.push(`0.92 0.94 0.90 rg ${margin.toFixed(2)} ${(y - 5).toFixed(2)} ${tableWidth.toFixed(2)} 17 re f`);
      let x = margin;
      columns.forEach((column) => {
        drawText(commands, column.label, x + 3, y, 7);
        x += column.width;
      });
      drawRule(commands, margin, y - 8, margin + tableWidth);
    };

    const drawRow = (commands, row, y, index) => {
      if (index % 2 === 1) {
        commands.push(`0.98 0.98 0.96 rg ${margin.toFixed(2)} ${(y - 5).toFixed(2)} ${tableWidth.toFixed(2)} 16 re f`);
      }

      let x = margin;
      columns.forEach((column) => {
        drawText(commands, truncatePdfText(column.value(row), column.chars), x + 3, y, 7);
        x += column.width;
      });
      drawRule(commands, margin, y - 8, margin + tableWidth);
    };

    const sortedRows = rows.slice().sort((a, b) => String(a.sku || '').localeCompare(String(b.sku || '')));
    const pageTotal = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
    const pageContents = [];

    for (let pageIndex = 0; pageIndex < pageTotal; pageIndex += 1) {
      const commands = [];
      const pageRows = sortedRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
      drawHeader(commands, pageIndex + 1, pageTotal);
      drawTableHeader(commands, pageHeight - 102);

      if (!pageRows.length) {
        drawMutedText(commands, 'No approved live SKUs are currently available.', margin, pageHeight - 132, 9);
      } else {
        pageRows.forEach((row, rowIndex) => {
          drawRow(commands, row, pageHeight - 125 - (rowIndex * rowHeight), rowIndex);
        });
      }

      pageContents.push(commands.join('\n'));
    }

    return buildPdfDocument(pageContents);
  };

  const downloadApprovedLivePdf = () => {
    const rows = state.database.skus || [];
    if (!rows.length) {
      showCopyMessage('No approved live SKUs to download.', true, 'center');
      return;
    }

    try {
      const blob = buildApprovedLivePdf(rows);
      const date = new Date().toISOString().slice(0, 10);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jenang-gemi-approved-live-skus-${date}.pdf`;
      link.style.display = 'none';
      root.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      showCopyMessage('Approved Live PDF downloaded.', false, 'center');
    } catch (_error) {
      showCopyMessage('Unable to create Approved Live PDF.', true, 'center');
    }
  };

  const copyTextToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-999px';
    textarea.style.left = '-999px';
    document.body.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
      throw new Error('Clipboard copy failed.');
    }
  };

  const closeSkuRowMenus = () => {
    document.querySelectorAll('[data-sku-row-menu]').forEach((menu) => {
      const trigger = menu.querySelector('[data-sku-row-menu-trigger]');
      const panel = menu.querySelector('[data-sku-row-menu-panel]');
      if (trigger instanceof HTMLButtonElement) {
        trigger.setAttribute('aria-expanded', 'false');
      }
      if (panel instanceof HTMLElement) {
        panel.hidden = true;
      }
    });
  };

  const closeMasterRemoveTokens = (exceptToken = null) => {
    document.querySelectorAll('[data-master-token].is-remove-open').forEach((token) => {
      if (exceptToken && token === exceptToken) return;
      token.classList.remove('is-remove-open');
      token.setAttribute('aria-expanded', 'false');
    });
  };

  const setRequired = (field, required) => {
    if (field && 'required' in field) field.required = required;
  };

  const syncCogsFields = () => {
    if (!(cogsForm instanceof HTMLFormElement)) return;
    setRequired(cogsForm.elements.po_number, true);
  };

  const syncInventoryFields = () => {
    if (!(inventoryForm instanceof HTMLFormElement)) return;
    const mode = String(inventoryAction?.value || 'set_total');
    const newStockWrap = inventoryForm.querySelector('[name="new_stock"]')?.closest('label');
    const addWrap = inventoryForm.querySelector('[data-inventory-add-wrap]');
    const poWrap = inventoryForm.querySelector('[data-inventory-po-wrap]');
    const newStock = inventoryForm.elements.new_stock;
    const quantityToAdd = inventoryForm.elements.quantity_to_add;
    const poNumber = inventoryForm.elements.po_number;

    if (newStockWrap instanceof HTMLElement) newStockWrap.hidden = mode === 'add_stock';
    if (addWrap instanceof HTMLElement) addWrap.hidden = mode !== 'add_stock';
    if (poWrap instanceof HTMLElement) poWrap.hidden = mode !== 'add_stock';

    setRequired(newStock, mode !== 'add_stock');
    setRequired(quantityToAdd, mode === 'add_stock');
    setRequired(poNumber, mode === 'add_stock');

    if (mode !== 'add_stock') {
      quantityToAdd.value = '';
      poNumber.value = '';
    } else {
      newStock.value = '';
    }
  };

  const normalizeTheme = (theme) => {
    if (theme === 'minimal-white' || theme === 'classic-white' || theme === 'light') return 'light';
    if (theme === 'minimal-black' || theme === 'prism' || theme === 'dark') return 'dark';
    return 'dark';
  };

  const readThemeCookie = () => {
    const escapedKey = themeStorageKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedKey}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  };

  const writeThemeCookie = (theme) => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${themeStorageKey}=${encodeURIComponent(theme)}; Path=/; SameSite=Lax; Max-Age=${themeCookieMaxAge}${secure}`;
  };

  const readStoredTheme = () => {
    try {
      return window.localStorage.getItem(themeStorageKey) || readThemeCookie();
    } catch (_error) {
      return readThemeCookie();
    }
  };

  const writeStoredTheme = (theme) => {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch (_error) {
      // Cookies keep the device preference when localStorage is unavailable.
    }
    writeThemeCookie(theme);
  };

  const applyTheme = (theme) => {
    const normalizedTheme = normalizeTheme(theme);
    document.documentElement.dataset.adminTheme = normalizedTheme;
    writeStoredTheme(normalizedTheme);
  };

  const buildOptions = (items, placeholder) => [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...items.map((item) => `<option value="${escapeHtml(item.id || '')}">${escapeHtml(item.code || '--')} · ${escapeHtml(item.name || '')}</option>`)
  ].join('');

  const buildEntityFilterOptions = (items, placeholder) => [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...items
      .filter((item) => item?.id && item?.name)
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .map((item) => `<option value="${escapeHtml(item.id || '')}">${escapeHtml(item.name || '')}</option>`)
  ].join('');

  const setSelectValue = (select, value, isValid) => {
    if (!select) return '';
    const normalizedValue = isValid ? value : '';
    select.value = normalizedValue;
    return normalizedValue;
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
      astra: String(form.elements.astra?.value || '').trim(),
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
    if (!values) return '------------';

    const brand = findBrand(values.brand_id);
    const unit = state.database.units.find((item) => item.id === values.unit_id);
    const flavor = brand?.flavors?.find((item) => item.id === values.flavor_id);
    const product = brand?.products?.find((item) => item.id === values.product_id);
    const volumeDigits = /^\d{1,3}(\.\d)?$/.test(values.volume)
      ? String(Math.round(Number(values.volume) * 10)).padStart(4, '0')
      : '----';

    return `${brand?.code || '--'}${unit?.code || '--'}${volumeDigits}${flavor?.code || '--'}${product?.code || '--'}`;
  };

  const isPrimarySelectionComplete = () => {
    const values = getPrimarySelections();
    if (!values || !/^\d{1,3}(\.\d)?$/.test(values.volume)) return false;

    const brand = findBrand(values.brand_id);
    const unit = state.database.units.find((item) => item.id === values.unit_id);
    const flavor = brand?.flavors?.find((item) => item.id === values.flavor_id);
    const product = brand?.products?.find((item) => item.id === values.product_id);

    return !!(brand && unit && flavor && product);
  };

  const getPreviewSegments = () => {
    const values = getPrimarySelections();
    const brand = values ? findBrand(values.brand_id) : null;
    const unit = values ? state.database.units.find((item) => item.id === values.unit_id) : null;
    const flavor = values ? brand?.flavors?.find((item) => item.id === values.flavor_id) : null;
    const product = values ? brand?.products?.find((item) => item.id === values.product_id) : null;
    const volumeDigits = values && /^\d{1,3}(\.\d)?$/.test(values.volume)
      ? String(Math.round(Number(values.volume) * 10)).padStart(4, '0')
      : '----';

    return [
      { label: 'BR', value: brand?.code || '--', name: brand?.name || 'Brand' },
      { label: 'UN', value: unit?.code || '--', name: unit?.name || 'Unit' },
      { label: 'VOL', value: volumeDigits, name: values?.volume || 'Volume' },
      { label: 'FL', value: flavor?.code || '--', name: flavor?.name || 'Flavor' },
      { label: 'PR', value: product?.code || '--', name: product?.name || 'Product' }
    ];
  };

  const renderPreviewSegments = () => {
    if (!skuSegmentStrip) return;
    skuSegmentStrip.innerHTML = getPreviewSegments().map((segment) => `
      <span>
        <b>${escapeHtml(segment.label)}</b>
        <em>${escapeHtml(segment.value)}</em>
        <small>${escapeHtml(segment.name)}</small>
      </span>
    `).join('');
  };

  const renderPreview = () => {
    const preview = computeSkuPreview();
    if (skuPreview) skuPreview.textContent = preview;
    if (applyPreview) applyPreview.textContent = preview;
    renderPreviewSegments();
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
    if (approvedLivePdfButton instanceof HTMLButtonElement) {
      approvedLivePdfButton.disabled = state.database.skus.length === 0;
    }
  };

  const renderMasterChildToken = (kind, brand, item) => {
    const brandId = escapeHtml(brand.id || '');
    const itemId = escapeHtml(item.id || '');
    const itemName = escapeHtml(item.name || '');
    return `
      <div
        class="admin-sku-reference-row admin-sku-reference-row-action"
        data-master-token
        tabindex="0"
        aria-expanded="false"
      >
        <code>${escapeHtml(item.code || '--')}</code>
        <span>${itemName}</span>
        ${role === 'branch'
          ? `<button
              type="button"
              class="admin-sku-token-remove"
              data-delete-master-kind="${kind}"
              data-delete-master-brand-id="${brandId}"
              data-delete-master-brand-name="${escapeHtml(brand.name || '')}"
              data-delete-master-item-id="${itemId}"
              data-delete-master-item-name="${itemName}"
              aria-label="Remove ${kind} ${itemName}"
            >Remove</button>`
          : ''}
      </div>
    `;
  };

  const renderMasterLists = () => {
    if (brandList) {
      brandList.innerHTML = state.database.brands.length
        ? state.database.brands.map((brand) => `
            <div class="admin-sku-reference-row">
              <code>${escapeHtml(brand.code || '--')}</code>
              <span>${escapeHtml(brand.name || '')}</span>
            </div>
          `).join('')
        : '<p class="admin-empty">No brands yet.</p>';
    }

    if (unitList) {
      unitList.innerHTML = state.database.units.length
        ? state.database.units.map((unit) => `
            <div class="admin-sku-reference-row">
              <code>${escapeHtml(unit.code || '--')}</code>
              <span>${escapeHtml(unit.name || '')}</span>
            </div>
          `).join('')
        : '<p class="admin-empty">No units yet.</p>';
    }

    if (flavorList) {
      flavorList.innerHTML = state.database.brands.length
        ? state.database.brands.map((brand) => `
            <div class="admin-sku-brand-block">
              <strong>${escapeHtml(brand.name || '')}</strong>
              <div class="admin-sku-reference-list">
                ${(brand.flavors || []).length
                  ? (brand.flavors || []).map((item) => renderMasterChildToken('flavor', brand, item)).join('')
                  : '<p class="admin-empty">No flavors yet.</p>'}
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
              <div class="admin-sku-reference-list">
                ${(brand.products || []).length
                  ? (brand.products || []).map((item) => renderMasterChildToken('product', brand, item)).join('')
                  : '<p class="admin-empty">No products yet.</p>'}
              </div>
            </div>
          `).join('')
        : '<p class="admin-empty">No products yet.</p>';
    }
  };

  const filteredSkus = () => {
    const search = String(searchInput?.value || '').trim().toLowerCase();
    const brandId = String(filterBrand?.value || '');
    const unitId = String(filterUnit?.value || '');
    const flavorId = String(filterFlavor?.value || '');
    const productId = String(filterProduct?.value || '');

    return state.database.skus.filter((row) => {
      if (brandId && row.brand_id !== brandId) return false;
      if (unitId && row.unit_id !== unitId) return false;
      if (flavorId && row.flavor_id !== flavorId) return false;
      if (productId && row.product_id !== productId) return false;
      if (!search) return true;

      const haystack = [
        row.sku,
        row.tag,
        row.brand_name,
        row.base_product_name,
        row.product_name,
        row.flavor_name,
        row.unit_name,
        row.astra,
        row.sale_price
      ].join(' ').toLowerCase();

      return haystack.includes(search);
    });
  };

  const renderFilters = () => {
    const selectedBrandId = String(filterBrand?.value || '');
    const selectedUnitId = String(filterUnit?.value || '');
    const selectedFlavorId = String(filterFlavor?.value || '');
    const selectedProductId = String(filterProduct?.value || '');
    const brand = findBrand(selectedBrandId);

    if (filterBrand) {
      filterBrand.innerHTML = buildEntityFilterOptions(state.database.brands || [], 'All brands');
      setSelectValue(
        filterBrand,
        selectedBrandId,
        state.database.brands.some((item) => item.id === selectedBrandId)
      );
    }

    if (filterUnit) {
      filterUnit.innerHTML = buildEntityFilterOptions(state.database.units || [], 'All units');
      setSelectValue(
        filterUnit,
        selectedUnitId,
        state.database.units.some((item) => item.id === selectedUnitId)
      );
    }

    if (filterFlavor) {
      filterFlavor.disabled = !brand;
      filterFlavor.classList.toggle('admin-select-needs-brand', !brand);
      filterFlavor.innerHTML = brand
        ? buildEntityFilterOptions(brand.flavors || [], 'All flavors')
        : '<option value="">select a brand</option>';
      setSelectValue(
        filterFlavor,
        selectedFlavorId,
        !!brand && (brand.flavors || []).some((item) => item.id === selectedFlavorId)
      );
    }

    if (filterProduct) {
      filterProduct.disabled = !brand;
      filterProduct.classList.toggle('admin-select-needs-brand', !brand);
      filterProduct.innerHTML = brand
        ? buildEntityFilterOptions(brand.products || [], 'All products')
        : '<option value="">select a brand</option>';
      setSelectValue(
        filterProduct,
        selectedProductId,
        !!brand && (brand.products || []).some((item) => item.id === selectedProductId)
      );
    }
  };

  const skuStockState = (row) => {
    const stock = Number(row.current_stock ?? row.starting_stock ?? 0);
    const trigger = Number(row.stock_trigger ?? 0);
    if (trigger > 0 && stock <= trigger) return 'is-low';
    if (trigger > 0 && stock <= trigger * 1.5) return 'is-watch';
    return 'is-ok';
  };

  const skuStockLabel = (stateName) => {
    if (stateName === 'is-low') return 'Low';
    if (stateName === 'is-watch') return 'Watch';
    return 'OK';
  };

  const renderTable = () => {
    if (!tableBody) return;
    const rows = filteredSkus();
    if (visibleCountNode) visibleCountNode.textContent = String(rows.length);

    if (!rows.length) {
      tableBody.innerHTML = `<tr><td colspan="14" class="admin-empty">${state.database.skus.length ? 'No SKUs match the current filters.' : 'No approved SKUs yet.'}</td></tr>`;
      return;
    }

    tableBody.innerHTML = rows.map((row) => {
      const stock = row.current_stock ?? row.starting_stock ?? 0;
      const trigger = row.stock_trigger ?? 0;
      const stockState = skuStockState(row);
      const skipScan = !!row.skip_scan;

      return `
      <tr class="admin-sku-row ${stockState}">
        <td data-col="SKU">
          <button
            type="button"
            class="admin-sku-tag-copy"
            data-copy-sku="${escapeHtml(row.sku || '')}"
            aria-label="Copy SKU ${escapeHtml(row.sku || '')}"
          ><span class="admin-sku-row-code">${escapeHtml(row.sku || '')}</span></button>
        </td>
        <td data-col="TAG">
          <button
            type="button"
            class="admin-sku-tag-copy"
            data-copy-sku-tag="${escapeHtml(row.tag || '')}"
            aria-label="Copy item tag ${escapeHtml(row.tag || '')}"
          >${escapeHtml(row.tag || '')}</button>
        </td>
        <td data-col="Brand"><span class="admin-sku-brand-text">${escapeHtml(row.brand_name || '')}</span></td>
        <td data-col="Product">${escapeHtml(row.product_name || '')}</td>
        <td data-col="Flavor">${escapeHtml(row.flavor_name || '')}</td>
        <td data-col="Unit">${escapeHtml(row.unit_name || '')}</td>
        <td data-col="Vol">${escapeHtml(row.volume || '')}</td>
        <td data-col="ASTRA">${escapeHtml(row.astra || '')}</td>
        <td data-col="Skip">
          <label class="admin-sku-switch" title="Skip Scan">
            <input
              type="checkbox"
              data-change-skip-scan="${escapeHtml(row.sku || '')}"
              ${skipScan ? 'checked' : ''}
              ${role === 'branch' ? '' : 'disabled'}
              aria-label="Skip Scan for SKU ${escapeHtml(row.sku || '')}"
            >
            <span></span>
          </label>
        </td>
        <td data-col="Stock">
          <span class="admin-sku-stock-pill ${stockState}">
            <strong>${escapeHtml(stock)}</strong>
            <small>${escapeHtml(skuStockLabel(stockState))}</small>
          </span>
        </td>
        <td data-col="Trigger">${escapeHtml(trigger)}</td>
        <td data-col="COGS">${escapeHtml(row.cogs ?? 0)}</td>
        <td data-col="Sale">
          <input
            type="number"
            class="admin-sku-cell-input admin-sku-sale-price-input"
            data-inline-sale-price="${escapeHtml(row.sku || '')}"
            data-current-sale-price="${escapeHtml(row.sale_price ?? 0)}"
            min="0"
            step="0.01"
            value="${escapeHtml(row.sale_price ?? 0)}"
            aria-label="Sale price for SKU ${escapeHtml(row.sku || '')}"
          >
        </td>
        <td data-col="Action">
          <div class="admin-sku-row-menu" data-sku-row-menu>
            <button
              type="button"
              class="admin-ghost-btn admin-sku-row-menu-trigger"
              data-sku-row-menu-trigger
              aria-expanded="false"
              aria-label="Open SKU action menu"
            >Actions</button>
            <div class="admin-sku-row-menu-panel" data-sku-row-menu-panel hidden>
              <button type="button" class="admin-menu-item" data-change-product-name="${escapeHtml(row.sku || '')}">Product Name</button>
              ${role === 'branch' ? `<button type="button" class="admin-menu-item" data-change-astra="${escapeHtml(row.sku || '')}">ASTRA</button>` : ''}
              <button type="button" class="admin-menu-item" data-change-inventory="${escapeHtml(row.sku || '')}">Inventory</button>
              <button type="button" class="admin-menu-item" data-change-cogs="${escapeHtml(row.sku || '')}">COGS</button>
              <button type="button" class="admin-menu-item" data-change-sale-price="${escapeHtml(row.sku || '')}">Sale Price</button>
              ${role === 'branch' ? `<button type="button" class="admin-menu-item admin-menu-item-danger" data-delete-sku="${escapeHtml(row.sku || '')}">Delete SKU</button>` : ''}
            </div>
          </div>
        </td>
      </tr>
    `;
    }).join('');
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
                <button type="button" class="admin-primary-btn admin-sku-action-btn" data-approve-request="${request.id}">
                  <span>Approve</span>
                </button>
                <button type="button" class="admin-ghost-btn admin-sku-action-btn" data-deny-request="${request.id}">
                  <span>Deny</span>
                </button>
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

  const shopeePriceRows = () => Array.isArray(state.shopeePrice.suggestions)
    ? state.shopeePrice.suggestions
    : [];

  const renderShopeePriceSync = () => {
    if (!shopeePriceBody) return;
    const rows = shopeePriceRows();
    const changedRows = rows.filter((row) => !!row.changed);
    const busy = state.shopeePrice.loading || state.shopeePrice.applying || state.shopeePrice.syncing;

    if (shopeePricePreviewButton) {
      shopeePricePreviewButton.disabled = busy;
      shopeePricePreviewButton.textContent = state.shopeePrice.loading ? 'Scanning...' : 'Scan Shopee';
    }
    if (shopeePriceApplyButton) {
      shopeePriceApplyButton.disabled = busy || !changedRows.length;
      shopeePriceApplyButton.textContent = state.shopeePrice.applying ? 'Saving...' : 'Save selected to SKU DB';
    }
    if (shopeePriceSiteSyncButton) {
      shopeePriceSiteSyncButton.disabled = busy || !state.shopeePrice.siteSyncReady;
      shopeePriceSiteSyncButton.textContent = state.shopeePrice.syncing ? 'Syncing...' : 'Sync SKU prices to site';
    }

    if (shopeePriceStatus) {
      const meta = state.shopeePrice.meta || {};
      shopeePriceStatus.textContent = rows.length
        ? `${rows.length} Shopee TAG matches / ${changedRows.length} price changes / ${meta.order_rows_scanned || 0} order rows scanned`
        : 'Scan Shopee before changing website-facing prices.';
    }

    if (!rows.length) {
      shopeePriceBody.innerHTML = '<tr><td colspan="7" class="admin-empty">No Shopee scan yet.</td></tr>';
      return;
    }

    shopeePriceBody.innerHTML = rows.map((row, index) => {
      const checked = row.changed ? 'checked' : '';
      const disabled = row.changed ? '' : 'disabled';
      const evidence = [
        row.source_path || '',
        row.latest_order_at || '',
        row.observation_count ? `${row.observation_count} observations` : ''
      ].filter(Boolean).join(' / ');
      return `
        <tr>
          <td>
            <input
              type="checkbox"
              data-shopee-price-select="${index}"
              ${checked}
              ${disabled}
              aria-label="Use Shopee price for ${escapeHtml(row.sku || '')}"
            >
          </td>
          <td><strong>${escapeHtml(row.sku || '')}</strong><small class="admin-table-note">${escapeHtml(row.product_name || '')}</small></td>
          <td>${escapeHtml(row.tag || '')}</td>
          <td>${escapeHtml(row.current_sale_price || '0.00')}</td>
          <td>
            <input
              type="number"
              class="admin-sku-cell-input"
              min="0"
              step="0.01"
              data-shopee-price-value="${index}"
              value="${escapeHtml(row.suggested_sale_price || '0.00')}"
              ${disabled}
            >
          </td>
          <td>${escapeHtml(row.confidence || 'review')}</td>
          <td><small class="admin-table-note">${escapeHtml(evidence || 'Shopee JSON')}</small></td>
        </tr>
      `;
    }).join('');
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
    renderShopeePriceSync();
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

  const normalizeSalePriceInput = (value) => {
    const amount = Number(String(value ?? '').trim());
    if (!Number.isFinite(amount) || amount < 0) return null;
    return amount.toFixed(2);
  };

  const saveInlineSalePrice = async (input) => {
    const sku = input.dataset.inlineSalePrice || '';
    if (!sku || input.dataset.salePriceSaving === '1') return;

    const previousValue = input.dataset.currentSalePrice || '0.00';
    const nextValue = normalizeSalePriceInput(input.value);
    if (nextValue === null) {
      input.value = previousValue;
      showCopyMessage('Sale price must be zero or higher.', true, 'center');
      return;
    }

    input.value = nextValue;
    if (nextValue === normalizeSalePriceInput(previousValue)) return;

    input.dataset.salePriceSaving = '1';
    input.disabled = true;

    try {
      await postAction({
        action: 'change_sale_price',
        sku,
        sale_price: nextValue
      });
      showCopyMessage(`Sale price saved for ${sku}.`, false, 'center');
    } catch (error) {
      input.value = previousValue;
      showCopyMessage(error instanceof Error ? error.message : 'Unable to change sale price.', true, 'center');
    } finally {
      input.disabled = false;
      delete input.dataset.salePriceSaving;
    }
  };

  const previewShopeeSalePrices = async () => {
    if (role !== 'branch') return;
    setError(shopeePriceError, '');
    state.shopeePrice.loading = true;
    state.shopeePrice.siteSyncReady = false;
    renderShopeePriceSync();
    try {
      const payload = await requestJson({
        method: 'POST',
        body: { action: 'preview_shopee_sale_prices' }
      });
      state.shopeePrice.suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
      state.shopeePrice.meta = payload.meta || null;
      showCopyMessage(`Shopee scan found ${state.shopeePrice.suggestions.length} TAG matches.`, false, 'center');
    } catch (error) {
      setError(shopeePriceError, error instanceof Error ? error.message : 'Unable to scan Shopee prices.');
    } finally {
      state.shopeePrice.loading = false;
      renderShopeePriceSync();
    }
  };

  const selectedShopeePriceUpdates = () => {
    if (!shopeePriceBody) return [];
    return Array.from(shopeePriceBody.querySelectorAll('[data-shopee-price-select]:checked')).map((checkbox) => {
      const index = Number(checkbox.getAttribute('data-shopee-price-select'));
      const row = shopeePriceRows()[index] || {};
      const input = shopeePriceBody.querySelector(`[data-shopee-price-value="${index}"]`);
      const salePrice = input instanceof HTMLInputElement ? normalizeSalePriceInput(input.value) : normalizeSalePriceInput(row.suggested_sale_price);
      return salePrice === null ? null : {
        sku: row.sku,
        sale_price: salePrice
      };
    }).filter(Boolean);
  };

  const applyShopeeSalePrices = async () => {
    if (role !== 'branch') return;
    const updates = selectedShopeePriceUpdates();
    if (!updates.length) {
      setError(shopeePriceError, 'Choose at least one Shopee price to save.');
      return;
    }
    setError(shopeePriceError, '');
    state.shopeePrice.applying = true;
    renderShopeePriceSync();
    try {
      const payload = await requestJson({
        method: 'POST',
        body: { action: 'apply_shopee_sale_prices', updates }
      });
      state.database = payload.database || state.database;
      const applied = Array.isArray(payload.applied) ? payload.applied : updates;
      const appliedMap = new Map(applied.map((item) => [String(item.sku || ''), String(item.sale_price || '')]));
      state.shopeePrice.suggestions = shopeePriceRows().map((row) => {
        const appliedPrice = appliedMap.get(String(row.sku || ''));
        return appliedPrice
          ? { ...row, current_sale_price: appliedPrice, suggested_sale_price: appliedPrice, changed: false }
          : row;
      });
      state.shopeePrice.siteSyncReady = applied.length > 0;
      renderAll();
      showCopyMessage(`Saved ${applied.length} Shopee prices to SKU DB.`, false, 'center');
    } catch (error) {
      setError(shopeePriceError, error instanceof Error ? error.message : 'Unable to save Shopee prices.');
    } finally {
      state.shopeePrice.applying = false;
      renderShopeePriceSync();
    }
  };

  const syncSalePricesToSite = async () => {
    if (role !== 'branch') return;
    setError(shopeePriceError, '');
    state.shopeePrice.syncing = true;
    renderShopeePriceSync();
    try {
      const payload = await requestJson({
        method: 'POST',
        body: { action: 'sync_sale_prices_to_site' }
      });
      state.database = payload.database || state.database;
      state.shopeePrice.siteSyncReady = false;
      renderAll();
      showCopyMessage(`Synced ${payload.updated || 0} website prices.`, false, 'center');
    } catch (error) {
      setError(shopeePriceError, error instanceof Error ? error.message : 'Unable to sync SKU prices to site.');
    } finally {
      state.shopeePrice.syncing = false;
      renderShopeePriceSync();
    }
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
    syncCogsFields();
    setError(cogsError, '');
  };

  const closeSalePriceModal = () => {
    if (!salePriceModal) return;
    salePriceModal.hidden = true;
    salePriceForm?.reset();
    setError(salePriceError, '');
  };

  const closeProductNameModal = () => {
    if (!productNameModal) return;
    productNameModal.hidden = true;
    productNameForm?.reset();
    setError(productNameError, '');
  };

  const closeAstraModal = () => {
    if (!astraModal) return;
    astraModal.hidden = true;
    astraForm?.reset();
    setError(astraError, '');
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
    cogsForm.elements.po_number.value = '';
    syncCogsFields();
    setError(cogsError, '');
    cogsModal.hidden = false;
  };

  const openSalePriceModal = (sku) => {
    if (!(salePriceForm instanceof HTMLFormElement) || !salePriceModal) return;
    const row = state.database.skus.find((item) => item.sku === sku);
    if (!row) return;

    salePriceForm.elements.sku.value = row.sku || '';
    salePriceForm.elements.sku_display.value = row.sku || '';
    salePriceForm.elements.sale_price.value = String(row.sale_price ?? 0);
    setError(salePriceError, '');
    salePriceModal.hidden = false;
  };

  const openProductNameModal = (sku) => {
    if (!(productNameForm instanceof HTMLFormElement) || !productNameModal) return;
    const row = state.database.skus.find((item) => item.sku === sku);
    if (!row) return;

    productNameForm.elements.sku.value = row.sku || '';
    productNameForm.elements.brand_display.value = row.brand_name || '';
    productNameForm.elements.flavor_display.value = row.flavor_name || '';
    productNameForm.elements.base_product_name.value = row.base_product_name || row.product_name || '';
    productNameForm.elements.product_name.value = row.product_name || row.base_product_name || '';
    setError(productNameError, '');
    productNameModal.hidden = false;
  };

  const openAstraModal = (sku) => {
    if (!(astraForm instanceof HTMLFormElement) || !astraModal) return;
    const row = state.database.skus.find((item) => item.sku === sku);
    if (!row) return;

    astraForm.elements.sku.value = row.sku || '';
    astraForm.elements.sku_display.value = row.sku || '';
    astraForm.elements.volume_display.value = String(row.volume || '');
    astraForm.elements.astra.value = String(row.astra || row.volume || '');
    setError(astraError, '');
    astraModal.hidden = false;
  };

  const openInventoryModal = (sku) => {
    if (!(inventoryForm instanceof HTMLFormElement) || !inventoryModal) return;
    const row = state.database.skus.find((item) => item.sku === sku);
    if (!row) return;

    inventoryForm.elements.sku.value = row.sku || '';
    inventoryForm.elements.sku_display.value = row.sku || '';
    if (inventoryForm.elements.base_stock_sku_display) {
      inventoryForm.elements.base_stock_sku_display.value = String(row.base_stock_sku || row.sku || '');
    }
    if (inventoryForm.elements.base_stock_display) {
      inventoryForm.elements.base_stock_display.value = String(row.base_current_stock ?? row.current_stock ?? row.starting_stock ?? 0);
    }
    inventoryForm.elements.current_stock_display.value = String(row.current_stock ?? row.starting_stock ?? 0);
    if (inventoryAction instanceof HTMLSelectElement) inventoryAction.value = 'set_total';
    inventoryForm.elements.new_stock.value = String(row.base_current_stock ?? row.current_stock ?? row.starting_stock ?? 0);
    inventoryForm.elements.quantity_to_add.value = '';
    inventoryForm.elements.po_number.value = '';
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

  const closeDeleteModal = () => {
    if (!deleteModal) return;
    deleteModal.hidden = true;
    deleteForm?.reset();
    state.pendingDelete = null;
    if (deleteSummary) deleteSummary.textContent = 'Waiting for selection';
    setError(deleteError, '');
  };

  const openBranchTierModal = () => {
    if (!branchTierModal) return;
    branchTierModal.hidden = false;
    if (branchTierKeyInput instanceof HTMLInputElement) {
      window.setTimeout(() => branchTierKeyInput.focus(), 0);
    }
  };

  const closeBranchTierModal = () => {
    if (!branchTierModal) return;
    branchTierModal.hidden = true;
    if (branchTierKeyInput instanceof HTMLInputElement) branchTierKeyInput.value = '';
  };

  const openDeleteModal = (pendingDelete) => {
    if (!(deleteForm instanceof HTMLFormElement) || !deleteModal) return;
    state.pendingDelete = pendingDelete;
    deleteForm.reset();
    if (deleteSummary) deleteSummary.textContent = pendingDelete.summary || 'Confirm removal';
    setError(deleteError, '');
    deleteModal.hidden = false;
    deleteForm.elements.password?.focus();
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
    approvalForm.elements.astra.value = request.astra || request.volume || '';
    approvalForm.elements.cogs.value = '';
    approvalForm.elements.sale_price.value = '';
    approvalForm.elements.po_number.value = '';
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
    if (!isPrimarySelectionComplete()) return false;
    if (!(setupForm instanceof HTMLFormElement)) return false;
    if (String(setupForm.elements.astra?.value || '').trim() === '') return false;
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
  inventoryAction?.addEventListener('change', syncInventoryFields);
  unitSelect?.addEventListener('change', renderPreview);
  flavorSelect?.addEventListener('change', renderPreview);
  productSelect?.addEventListener('change', renderPreview);

  document.querySelector('[data-continue-apply]')?.addEventListener('click', () => {
    setError(setupError, '');
    if (!setupIsComplete()) {
      setError(setupError, 'Complete brand, unit, volume, ASTRA, flavor, product, and TAG before continuing.');
      return;
    }

    if (applyPanel) {
      applyPanel.hidden = false;
      const applyCollapse = applyPanel.querySelector('.admin-sku-collapse');
      if (applyCollapse instanceof HTMLDetailsElement) applyCollapse.open = true;
    }
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
        astra: setupData.get('astra'),
        flavor_id: setupData.get('flavor_id'),
        product_id: setupData.get('product_id'),
        tag: String(setupData.get('tag') || '').toUpperCase().replace(/\s+/g, '_'),
        starting_stock: applyData.get('starting_stock'),
        stock_trigger: applyData.get('stock_trigger'),
        cogs: applyData.get('cogs'),
        sale_price: applyData.get('sale_price'),
        po_number: String(applyData.get('po_number') || '').toUpperCase()
      });

      applyForm.reset();
      applySharedBrandSelection(resolveSelectedBrandId());
      refreshBrandBoundSelects();
      renderPreview();
      showCopyMessage('SKU pushed to the live database.', false, 'center');
    } catch (error) {
      setError(applyError, error instanceof Error ? error.message : 'Unable to create SKU.');
    }
  });

  requestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(requestSubmitError, '');

    if (!(requestForm instanceof HTMLFormElement)) return;
    if (!isPrimarySelectionComplete()) {
      setError(requestSubmitError, 'Complete brand, unit, volume, ASTRA, flavor, and product before submitting.');
      return;
    }

    try {
      const formData = new window.FormData(requestForm);
      await postAction({
        action: 'submit_request',
        brand_id: formData.get('brand_id'),
        unit_id: formData.get('unit_id'),
        volume: formData.get('volume'),
        astra: formData.get('astra'),
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

  tableBody?.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const copySkuButton = target.closest('[data-copy-sku]');
    if (copySkuButton instanceof HTMLButtonElement) {
      closeSkuRowMenus();
      const sku = copySkuButton.dataset.copySku || '';
      if (!sku) return;

      try {
        await copyTextToClipboard(sku);
        showCopyMessage(`Copied SKU: ${sku}`, false, 'center');
      } catch (_error) {
        showCopyMessage('Unable to copy SKU.', true, 'center');
      }
      return;
    }

    const copyTagButton = target.closest('[data-copy-sku-tag]');
    if (copyTagButton instanceof HTMLButtonElement) {
      closeSkuRowMenus();
      const itemTag = copyTagButton.dataset.copySkuTag || '';
      if (!itemTag) return;

      try {
        await copyTextToClipboard(itemTag);
        showCopyMessage(`Copied item tag: ${itemTag}`, false, 'center');
      } catch (_error) {
        showCopyMessage('Unable to copy item tag.', true, 'center');
      }
      return;
    }

    const rowMenuTrigger = target.closest('[data-sku-row-menu-trigger]');
    if (rowMenuTrigger instanceof HTMLButtonElement) {
      const menu = rowMenuTrigger.closest('[data-sku-row-menu]');
      const panel = menu?.querySelector('[data-sku-row-menu-panel]');
      const willOpen = panel instanceof HTMLElement ? panel.hidden : false;
      closeSkuRowMenus();
      if (panel instanceof HTMLElement && willOpen) {
        panel.hidden = false;
        rowMenuTrigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    const productNameButton = target.closest('[data-change-product-name]');
    if (productNameButton instanceof HTMLButtonElement) {
      closeSkuRowMenus();
      openProductNameModal(productNameButton.dataset.changeProductName || '');
      return;
    }

    const astraButton = target.closest('[data-change-astra]');
    if (astraButton instanceof HTMLButtonElement) {
      closeSkuRowMenus();
      openAstraModal(astraButton.dataset.changeAstra || '');
      return;
    }

    const inventoryButton = target.closest('[data-change-inventory]');
    if (inventoryButton instanceof HTMLButtonElement) {
      closeSkuRowMenus();
      openInventoryModal(inventoryButton.dataset.changeInventory || '');
      return;
    }

    const cogsButton = target.closest('[data-change-cogs]');
    if (cogsButton instanceof HTMLButtonElement) {
      closeSkuRowMenus();
      openCogsModal(cogsButton.dataset.changeCogs || '');
      return;
    }

    const salePriceButton = target.closest('[data-change-sale-price]');
    if (salePriceButton instanceof HTMLButtonElement) {
      closeSkuRowMenus();
      openSalePriceModal(salePriceButton.dataset.changeSalePrice || '');
      return;
    }

    const deleteButton = target.closest('[data-delete-sku]');
    if (!(deleteButton instanceof HTMLButtonElement)) return;
    closeSkuRowMenus();
    const sku = deleteButton.dataset.deleteSku || '';
    const row = state.database.skus.find((item) => item.sku === sku);
    const label = row ? `${row.sku} (${row.tag || row.product_name || 'untagged'})` : sku;
    openDeleteModal({
      action: 'delete_sku',
      sku,
      summary: `Delete approved SKU ${label}. This removes it from the live SKU database and deletes its COGS history.`
    });
  });

  tableBody?.addEventListener('change', async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const salePriceInput = target?.closest('[data-inline-sale-price]');
    if (salePriceInput instanceof HTMLInputElement) {
      await saveInlineSalePrice(salePriceInput);
      return;
    }

    const skipScanInput = target?.closest('[data-change-skip-scan]');
    if (!(skipScanInput instanceof HTMLInputElement) || role !== 'branch') return;

    const sku = skipScanInput.dataset.changeSkipScan || '';
    const nextValue = skipScanInput.checked;
    skipScanInput.disabled = true;
    setError(requestError, '');

    try {
      await postAction({
        action: 'change_skip_scan',
        sku,
        skip_scan: nextValue
      });
      showCopyMessage(`Skip Scan ${nextValue ? 'enabled' : 'disabled'} for ${sku}.`, false, 'center');
    } catch (error) {
      skipScanInput.checked = !nextValue;
      setError(requestError, error instanceof Error ? error.message : 'Unable to update Skip Scan.');
    } finally {
      skipScanInput.disabled = false;
    }
  });

  tableBody?.addEventListener('focusin', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const salePriceInput = target?.closest('[data-inline-sale-price]');
    if (salePriceInput instanceof HTMLInputElement) {
      salePriceInput.select();
    }
  });

  tableBody?.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const salePriceInput = target?.closest('[data-inline-sale-price]');
    if (!(salePriceInput instanceof HTMLInputElement)) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      void saveInlineSalePrice(salePriceInput);
      salePriceInput.blur();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      salePriceInput.value = salePriceInput.dataset.currentSalePrice || '0.00';
      salePriceInput.blur();
    }
  });

  [flavorList, productList].forEach((list) => {
    list?.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const button = target.closest('[data-delete-master-kind]');
      if (!(button instanceof HTMLButtonElement)) {
        const token = target.closest('[data-master-token]');
        if (!(token instanceof HTMLElement)) return;

        const willOpen = !token.classList.contains('is-remove-open');
        closeMasterRemoveTokens(token);
        token.classList.toggle('is-remove-open', willOpen);
        token.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        return;
      }

      const kind = button.dataset.deleteMasterKind || '';
      if (!['flavor', 'product'].includes(kind)) return;

      const itemName = button.dataset.deleteMasterItemName || 'this item';
      const brandName = button.dataset.deleteMasterBrandName || 'this brand';
      closeMasterRemoveTokens();
      openDeleteModal({
        action: kind === 'flavor' ? 'delete_flavor' : 'delete_product',
        brand_id: button.dataset.deleteMasterBrandId || '',
        item_id: button.dataset.deleteMasterItemId || '',
        summary: `Remove ${kind} ${itemName} from ${brandName}. This only works when it is not used by live SKUs or SKU requests.`
      });
    });

    list?.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      const token = event.target instanceof Element ? event.target.closest('[data-master-token]') : null;
      if (!(token instanceof HTMLElement)) return;

      event.preventDefault();
      const willOpen = !token.classList.contains('is-remove-open');
      closeMasterRemoveTokens(token);
      token.classList.toggle('is-remove-open', willOpen);
      token.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
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
        po_number: String(formData.get('po_number') || '').toUpperCase()
      });
      closeCogsModal();
    } catch (error) {
      setError(cogsError, error instanceof Error ? error.message : 'Unable to change COGS.');
    }
  });

  salePriceForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(salePriceForm instanceof HTMLFormElement)) return;
    setError(salePriceError, '');

    try {
      const formData = new window.FormData(salePriceForm);
      await postAction({
        action: 'change_sale_price',
        sku: formData.get('sku'),
        sale_price: formData.get('sale_price')
      });
      closeSalePriceModal();
    } catch (error) {
      setError(salePriceError, error instanceof Error ? error.message : 'Unable to change sale price.');
    }
  });

  productNameForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(productNameForm instanceof HTMLFormElement)) return;
    setError(productNameError, '');

    try {
      const formData = new window.FormData(productNameForm);
      await postAction({
        action: 'change_product_name',
        sku: formData.get('sku'),
        product_name: formData.get('product_name')
      });
      closeProductNameModal();
    } catch (error) {
      setError(productNameError, error instanceof Error ? error.message : 'Unable to change Product Name.');
    }
  });

  astraForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(astraForm instanceof HTMLFormElement)) return;
    setError(astraError, '');

    try {
      const formData = new window.FormData(astraForm);
      await postAction({
        action: 'change_astra',
        sku: formData.get('sku'),
        astra: formData.get('astra')
      });
      closeAstraModal();
    } catch (error) {
      setError(astraError, error instanceof Error ? error.message : 'Unable to change ASTRA.');
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
        po_number: String(formData.get('po_number') || '').toUpperCase()
      });
      closeInventoryModal();
    } catch (error) {
      setError(inventoryError, error instanceof Error ? error.message : 'Unable to change inventory.');
    }
  });

  deleteForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(deleteForm instanceof HTMLFormElement) || !state.pendingDelete) return;
    setError(deleteError, '');

    try {
      const formData = new window.FormData(deleteForm);
      await postAction({
        ...state.pendingDelete,
        password: formData.get('password')
      });
      closeDeleteModal();
      showCopyMessage('Removed from the SKU database.', false, 'center');
    } catch (error) {
      setError(deleteError, error instanceof Error ? error.message : 'Unable to remove item.');
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
        astra: formData.get('astra'),
        cogs: formData.get('cogs'),
        sale_price: formData.get('sale_price'),
        po_number: String(formData.get('po_number') || '').toUpperCase(),
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

  document.querySelectorAll('[data-close-sale-price-modal]').forEach((button) => {
    button.addEventListener('click', closeSalePriceModal);
  });

  document.querySelectorAll('[data-close-product-name-modal]').forEach((button) => {
    button.addEventListener('click', closeProductNameModal);
  });

  document.querySelectorAll('[data-close-astra-modal]').forEach((button) => {
    button.addEventListener('click', closeAstraModal);
  });

  document.querySelectorAll('[data-close-inventory-modal]').forEach((button) => {
    button.addEventListener('click', closeInventoryModal);
  });

  document.querySelectorAll('[data-close-approval-modal]').forEach((button) => {
    button.addEventListener('click', closeApprovalModal);
  });

  document.querySelectorAll('[data-close-delete-modal]').forEach((button) => {
    button.addEventListener('click', closeDeleteModal);
  });

  document.querySelector('[data-branch-tier-open]')?.addEventListener('click', openBranchTierModal);

  document.querySelectorAll('[data-close-branch-tier-modal]').forEach((button) => {
    button.addEventListener('click', closeBranchTierModal);
  });

  if (branchTierModal && !branchTierModal.hidden && branchTierKeyInput instanceof HTMLInputElement) {
    window.setTimeout(() => branchTierKeyInput.focus(), 0);
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!tableBody?.contains(target)) {
      closeSkuRowMenus();
    }
    if (!flavorList?.contains(target) && !productList?.contains(target)) {
      closeMasterRemoveTokens();
    }
  });

  searchInput?.addEventListener('input', renderTable);
  filterBrand?.addEventListener('change', () => {
    if (filterFlavor) filterFlavor.value = '';
    if (filterProduct) filterProduct.value = '';
    renderFilters();
    renderTable();
  });
  [filterUnit, filterFlavor, filterProduct].forEach((node) => {
    node?.addEventListener('change', renderTable);
  });
  approvedLivePdfButton?.addEventListener('click', downloadApprovedLivePdf);
  shopeePricePreviewButton?.addEventListener('click', previewShopeeSalePrices);
  shopeePriceApplyButton?.addEventListener('click', applyShopeeSalePrices);
  shopeePriceSiteSyncButton?.addEventListener('click', syncSalePricesToSite);

  syncCogsFields();
  syncInventoryFields();
  applyTheme(readStoredTheme() || 'dark');

  loadDatabase().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unable to load the SKU database.';
    setError(setupError, message);
    setError(applyError, message);
    setError(requestSubmitError, message);
    setError(requestError, message);
  });
});
