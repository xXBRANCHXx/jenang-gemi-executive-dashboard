const root = document.querySelector('[data-pnl-expense-page]');

if (root) {
  const endpoint = root.dataset.accountingEndpoint || '../../api/accounting/';
  const bucketLabels = {
    product_cost: 'Accounting product purchase (reconciliation)',
    packing_cost: 'Accounting packing purchase (reconciliation)',
    ad_cost: 'Marketing / platform ads',
    marketing: 'Other marketing',
    payroll: 'Payroll / labor',
    operations: 'Operations / tax',
    fees: 'Bank / payment fees',
    exclude: 'Excluded from Net Profit'
  };
  const state = { categories: [], dirty: false };
  const refs = {
    status: root.querySelector('[data-expense-status]'),
    total: root.querySelector('[data-expense-total]'),
    included: root.querySelector('[data-expense-included]'),
    excluded: root.querySelector('[data-expense-excluded]'),
    save: root.querySelector('[data-expense-save]'),
    search: root.querySelector('[data-expense-search]'),
    inclusionFilter: root.querySelector('[data-expense-inclusion-filter]'),
    bucketFilter: root.querySelector('[data-expense-bucket-filter]'),
    visibleCount: root.querySelector('[data-expense-visible-count]'),
    rows: root.querySelector('[data-expense-rows]')
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || payload.details || `HTTP ${response.status}`);
    return payload;
  };
  const categoryDisplay = (category) => {
    const rawName = String(category?.name || 'Category').trim();
    const leafName = rawName.includes(' | ') ? rawName.split(' | ').at(-1).trim() : rawName;
    const codeMatch = leafName.match(/(?:\s+[–—-]\s*|\s+)([0-9]{4,}(?:-[A-Za-z0-9]+)?)\s*$/);
    const code = String(category?.account_code || codeMatch?.[1] || '').trim();
    const withoutCode = codeMatch ? leafName.slice(0, codeMatch.index).trim() : leafName;
    const translationMatch = withoutCode.match(/\(([^()]*)\)\s*$/);
    const translation = String(translationMatch?.[1] || '').trim();
    const title = (translationMatch ? withoutCode.slice(0, translationMatch.index) : withoutCode).trim() || withoutCode || 'Category';
    const rawParent = String(category?.parent_name || '').trim();
    const parentLeaf = rawParent.includes(' | ') ? rawParent.split(' | ').at(-1).trim() : rawParent;
    const parentTranslation = parentLeaf.match(/\(([^()]*)\)\s*$/);
    const parent = (parentTranslation ? parentLeaf.slice(0, parentTranslation.index) : parentLeaf).trim() || 'Other';
    return { title, translation, code, parent, rawName, rawParent };
  };
  const normalize = (value) => String(value || '').toLocaleLowerCase().trim();
  const categorySearchText = (category) => {
    const display = categoryDisplay(category);
    return normalize([
      display.title,
      display.translation,
      display.code,
      display.parent,
      display.rawName,
      display.rawParent,
      category.type,
      bucketLabels[category.pnl_bucket]
    ].join(' '));
  };
  const filteredCategories = () => {
    const query = normalize(refs.search?.value);
    const inclusion = refs.inclusionFilter?.value || 'all';
    const bucket = refs.bucketFilter?.value || 'all';
    return state.categories.filter((category) => {
      if (query && !categorySearchText(category).includes(query)) return false;
      if (inclusion === 'included' && !category.include_in_net_profit) return false;
      if (inclusion === 'excluded' && category.include_in_net_profit) return false;
      if (bucket !== 'all' && String(category.pnl_bucket) !== bucket) return false;
      return true;
    });
  };
  const setStatus = (message, isError = false) => {
    if (!refs.status) return;
    refs.status.textContent = message;
    refs.status.classList.toggle('is-error', isError);
  };
  const updateSummary = () => {
    const included = state.categories.filter((category) => category.include_in_net_profit).length;
    if (refs.total) refs.total.textContent = state.categories.length.toLocaleString('id-ID');
    if (refs.included) refs.included.textContent = included.toLocaleString('id-ID');
    if (refs.excluded) refs.excluded.textContent = (state.categories.length - included).toLocaleString('id-ID');
    if (refs.save) refs.save.disabled = !state.dirty;
  };
  const makeText = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  };
  const createCategoryRow = (category) => {
    const display = categoryDisplay(category);
    const row = document.createElement('article');
    row.className = `pnl-expense-page-row${category.include_in_net_profit ? ' is-included' : ''}`;
    row.dataset.categoryId = String(category.category_id);

    const identity = document.createElement('div');
    identity.className = 'pnl-expense-page-identity';
    identity.append(makeText('h3', '', display.title));
    const details = [display.translation, display.code ? `Code ${display.code}` : '', category.is_active ? '' : 'Inactive'].filter(Boolean);
    identity.append(makeText('p', '', details.join(' · ') || 'Accounting category'));
    identity.title = `${display.rawParent}${display.rawParent ? ' · ' : ''}${display.rawName}`;

    const group = document.createElement('div');
    group.className = 'pnl-expense-page-group';
    group.append(makeText('strong', '', display.parent));
    group.append(makeText('small', '', String(category.type || 'other').replaceAll('_', ' ')));

    const toggle = document.createElement('label');
    toggle.className = 'pnl-expense-page-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(category.include_in_net_profit);
    checkbox.dataset.categoryInclude = String(category.category_id);
    const toggleText = makeText('span', '', checkbox.checked ? 'Yes' : 'No');
    toggle.append(checkbox, toggleText);

    const select = document.createElement('select');
    select.dataset.categoryBucket = String(category.category_id);
    select.setAttribute('aria-label', `P&L treatment for ${display.title}`);
    Object.entries(bucketLabels).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = String(category.pnl_bucket) === value;
      select.append(option);
    });

    row.append(identity, group, toggle, select);
    return row;
  };
  const renderRows = () => {
    if (!refs.rows) return;
    const categories = filteredCategories();
    if (refs.visibleCount) refs.visibleCount.textContent = `${categories.length.toLocaleString('id-ID')} shown`;
    if (!categories.length) {
      const empty = makeText('p', 'pnl-expense-page-empty', state.categories.length
        ? 'No categories match those filters.'
        : 'Accounting returned no editable categories.');
      refs.rows.replaceChildren(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    categories
      .sort((a, b) => categoryDisplay(a).title.localeCompare(categoryDisplay(b).title, undefined, { numeric: true }))
      .forEach((category) => fragment.append(createCategoryRow(category)));
    refs.rows.replaceChildren(fragment);
  };
  const markDirty = () => {
    state.dirty = true;
    updateSummary();
    setStatus('Unsaved changes');
  };
  const load = async () => {
    setStatus('Loading Accounting categories…');
    try {
      const payload = await requestJson(`${endpoint}?action=pnl_category_settings`);
      const settings = Array.isArray(payload?.data?.category_settings) ? payload.data.category_settings : [];
      state.categories = settings.filter((category) => !category.is_group).map((category) => ({ ...category }));
      state.dirty = false;
      updateSummary();
      renderRows();
      setStatus(`${state.categories.length.toLocaleString('id-ID')} categories loaded`);
    } catch (error) {
      state.categories = [];
      updateSummary();
      renderRows();
      setStatus(error?.message || 'Unable to load Accounting categories.', true);
    }
  };
  const save = async () => {
    if (!state.dirty || !refs.save) return;
    refs.save.disabled = true;
    setStatus('Saving category settings…');
    try {
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_pnl_category_settings',
          settings: state.categories.map((category) => ({
            category_id: category.category_id,
            include_in_net_profit: Boolean(category.include_in_net_profit),
            pnl_bucket: category.pnl_bucket
          }))
        })
      });
      state.dirty = false;
      updateSummary();
      setStatus('Saved. Profit & Loss will use these settings immediately.');
    } catch (error) {
      refs.save.disabled = false;
      setStatus(error?.message || 'Unable to save category settings.', true);
    }
  };

  Object.entries(bucketLabels).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    refs.bucketFilter?.append(option);
  });
  refs.search?.addEventListener('input', renderRows);
  refs.inclusionFilter?.addEventListener('change', renderRows);
  refs.bucketFilter?.addEventListener('change', renderRows);
  refs.save?.addEventListener('click', save);
  refs.rows?.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLSelectElement)) return;
    const categoryId = control instanceof HTMLInputElement ? control.dataset.categoryInclude : control.dataset.categoryBucket;
    const category = state.categories.find((item) => String(item.category_id) === String(categoryId || ''));
    if (!category) return;
    const row = control.closest('[data-category-id]');
    if (control instanceof HTMLInputElement) {
      category.include_in_net_profit = control.checked;
      if (control.checked && category.pnl_bucket === 'exclude') category.pnl_bucket = 'operations';
    } else {
      category.pnl_bucket = control.value;
      if (control.value === 'exclude') category.include_in_net_profit = false;
    }
    const rowToggle = row?.querySelector('[data-category-include]');
    const rowSelect = row?.querySelector('[data-category-bucket]');
    if (rowToggle instanceof HTMLInputElement) {
      rowToggle.checked = Boolean(category.include_in_net_profit);
      const label = rowToggle.nextElementSibling;
      if (label) label.textContent = rowToggle.checked ? 'Yes' : 'No';
    }
    if (rowSelect instanceof HTMLSelectElement) rowSelect.value = category.pnl_bucket;
    row?.classList.toggle('is-included', Boolean(category.include_in_net_profit));
    markDirty();
    if ((refs.inclusionFilter?.value || 'all') !== 'all' || (refs.bucketFilter?.value || 'all') !== 'all') renderRows();
  });
  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  });

  load();
}
