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
  const companyEmptyState = document.querySelector('[data-company-empty-state]');
  const deleteButton = document.querySelector('[data-delete-profile]');

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

  const checkedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);

  const syncCompanySections = () => {
    const selectedCompanies = new Set(checkedValues('companies[]'));
    document.querySelectorAll('[data-company-section]').forEach((section) => {
      const company = section.getAttribute('data-company-section') || '';
      const active = selectedCompanies.has(company);
      section.hidden = !active;
      section.querySelectorAll('input, select, textarea').forEach((field) => {
        field.disabled = !active;
      });
    });
    if (companyEmptyState) {
      companyEmptyState.hidden = selectedCompanies.size > 0;
    }
  };

  const setCheckedValues = (name, values) => {
    const wanted = new Set(values || []);
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = wanted.has(input.value);
    });
  };

  const setError = (message) => {
    if (!errorNode) return;
    errorNode.hidden = !message;
    errorNode.textContent = message || '';
  };

  const fillForm = (partner) => {
    if (!(form instanceof HTMLFormElement)) return;
    form.hidden = false;
    form.elements.code.value = partner.code || '';
    form.elements.name.value = partner.name || '';
    form.elements.partner_slug.value = partner.partner_slug || '';
    form.elements['pricing[Jenang Gemi][Bubur][15 Sachet]'].value = partner.pricing?.['Jenang Gemi']?.Bubur?.['15 Sachet'] ?? 0;
    form.elements['pricing[Jenang Gemi][Bubur][30 Sachet]'].value = partner.pricing?.['Jenang Gemi']?.Bubur?.['30 Sachet'] ?? 0;
    form.elements['pricing[Jenang Gemi][Bubur][60 Sachet]'].value = partner.pricing?.['Jenang Gemi']?.Bubur?.['60 Sachet'] ?? 0;
    form.elements['pricing[Jenang Gemi][Jamu][15 Sachet]'].value = partner.pricing?.['Jenang Gemi']?.Jamu?.['15 Sachet'] ?? 0;
    form.elements['pricing[Jenang Gemi][Jamu][30 Sachet]'].value = partner.pricing?.['Jenang Gemi']?.Jamu?.['30 Sachet'] ?? 0;
    form.elements['pricing[Jenang Gemi][Jamu][60 Sachet]'].value = partner.pricing?.['Jenang Gemi']?.Jamu?.['60 Sachet'] ?? 0;
    form.elements.notes.value = partner.notes || '';
    setCheckedValues('companies[]', partner.companies || []);
    setCheckedValues('product_access[Jenang Gemi][Bubur][sizes][]', partner.product_access?.['Jenang Gemi']?.Bubur?.sizes || []);
    setCheckedValues('product_access[Jenang Gemi][Jamu][sizes][]', partner.product_access?.['Jenang Gemi']?.Jamu?.sizes || []);
    const buburEnabled = !!partner.product_access?.['Jenang Gemi']?.Bubur?.enabled;
    const jamuEnabled = !!partner.product_access?.['Jenang Gemi']?.Jamu?.enabled;
    const buburEnabledInput = document.querySelector('input[name="product_access[Jenang Gemi][Bubur][enabled]"]');
    const jamuEnabledInput = document.querySelector('input[name="product_access[Jenang Gemi][Jamu][enabled]"]');
    if (buburEnabledInput instanceof HTMLInputElement) buburEnabledInput.checked = buburEnabled;
    if (jamuEnabledInput instanceof HTMLInputElement) jamuEnabledInput.checked = jamuEnabled;
    syncCompanySections();
    if (partnerName) partnerName.textContent = partner.name || partner.code || 'Partner';
    if (partnerCodeBadge) partnerCodeBadge.textContent = partner.code || 'Partner';
    if (codeNote) codeNote.textContent = partner.code || 'Pending';
    if (urlNote) urlNote.textContent = `https://partner.jenanggemi.com${partner.store_path || '/'}`;
    if (deleteButton) {
      deleteButton.hidden = false;
      deleteButton.dataset.partnerCode = partner.code || '';
      deleteButton.dataset.partnerName = partner.name || 'Partner';
    }
  };

  const loadPartner = async () => {
    if (!partnerCode) throw new Error('Missing partner code.');
    const payload = await requestJson(`${endpoint}?code=${encodeURIComponent(partnerCode)}`);
    fillForm(payload.partner || {});
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError('');
    try {
      const formData = new window.FormData(form);
      await requestJson(endpoint, {
        method: 'POST',
        body: {
          action: 'update',
          code: formData.get('code'),
          name: formData.get('name'),
          partner_slug: formData.get('partner_slug'),
          companies: checkedValues('companies[]'),
          product_access: {
            'Jenang Gemi': {
              Bubur: {
                enabled: !!document.querySelector('input[name="product_access[Jenang Gemi][Bubur][enabled]"]')?.checked,
                sizes: checkedValues('product_access[Jenang Gemi][Bubur][sizes][]')
              },
              Jamu: {
                enabled: !!document.querySelector('input[name="product_access[Jenang Gemi][Jamu][enabled]"]')?.checked,
                sizes: checkedValues('product_access[Jenang Gemi][Jamu][sizes][]')
              }
            }
          },
          pricing: {
            'Jenang Gemi': {
              Bubur: {
                '15 Sachet': formData.get('pricing[Jenang Gemi][Bubur][15 Sachet]'),
                '30 Sachet': formData.get('pricing[Jenang Gemi][Bubur][30 Sachet]'),
                '60 Sachet': formData.get('pricing[Jenang Gemi][Bubur][60 Sachet]')
              },
              Jamu: {
                '15 Sachet': formData.get('pricing[Jenang Gemi][Jamu][15 Sachet]'),
                '30 Sachet': formData.get('pricing[Jenang Gemi][Jamu][30 Sachet]'),
                '60 Sachet': formData.get('pricing[Jenang Gemi][Jamu][60 Sachet]')
              }
            }
          },
          notes: formData.get('notes')
        }
      });
      await loadPartner();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save partner.');
    }
  });

  document.querySelectorAll('input[name="companies[]"]').forEach((input) => {
    input.addEventListener('change', syncCompanySections);
  });

  deleteButton?.addEventListener('click', async () => {
    const code = deleteButton.dataset.partnerCode || '';
    const name = deleteButton.dataset.partnerName || 'this partner';
    const confirmed = window.confirm(`Delete ${name}? This will remove the partner record and its generated page.`);
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
