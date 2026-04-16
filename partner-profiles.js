document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-profiles]');
  if (!root) return;

  const endpoint = root.dataset.partnersEndpoint || '../api/partners/';
  const partnerList = document.querySelector('[data-partner-list]');
  const partnerModal = document.querySelector('[data-partner-modal]');
  const partnerForm = document.querySelector('[data-partner-form]');
  const partnerFormError = document.querySelector('[data-partner-form-error]');
  const companyEmptyState = document.querySelector('[data-company-empty-state]');
  const partnerSiteOrigin = 'https://partner.jenanggemi.com';

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

  const checkedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);

  const syncCompanySections = (scope) => {
    const selectedCompanies = new Set(Array.from(scope.querySelectorAll('input[name="companies[]"]:checked')).map((input) => input.value));
    scope.querySelectorAll('[data-company-section]').forEach((section) => {
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

  const productAccessPayload = (scope) => ({
    'Jenang Gemi': {
      Bubur: {
        enabled: !!scope.querySelector('input[name="product_access[Jenang Gemi][Bubur][enabled]"]')?.checked,
        sizes: Array.from(scope.querySelectorAll('input[name="product_access[Jenang Gemi][Bubur][sizes][]"]:checked')).map((input) => input.value)
      },
      Jamu: {
        enabled: !!scope.querySelector('input[name="product_access[Jenang Gemi][Jamu][enabled]"]')?.checked,
        sizes: Array.from(scope.querySelectorAll('input[name="product_access[Jenang Gemi][Jamu][sizes][]"]:checked')).map((input) => input.value)
      }
    }
  });

  const pricingPayload = (formData) => ({
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
  });

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
        <div class="admin-affiliate-field">
          <span class="admin-control-label">Companies</span>
          <div class="admin-affiliate-platform-grid">
            ${(partner.companies || []).map((company) => `<div class="admin-platform-choice"><span>${escapeHtml(company)}</span></div>`).join('')}
          </div>
        </div>
        <div class="admin-affiliate-field">
          <span class="admin-control-label">Enabled Jenang Gemi Products</span>
          <div class="admin-affiliate-platform-grid">
            ${Object.entries(partner.product_access?.['Jenang Gemi'] || {}).filter(([, config]) => config?.enabled).map(([product, config]) => `<div class="admin-platform-choice"><span>${escapeHtml(`${product}: ${(config.sizes || []).join(', ')}`)}</span></div>`).join('')}
          </div>
        </div>
      </article>
    `).join('');
  };

  const loadPartners = async () => {
    const payload = await requestJson();
    renderPartners(payload.database?.partners || []);
  };

  const deletePartner = async (code, name) => {
    const confirmed = window.confirm(`Delete ${name}? This will remove the partner record and its generated page.`);
    if (!confirmed) return;

    await requestJson({
      method: 'POST',
      body: {
        action: 'delete',
        code
      }
    });

    await loadPartners();
  };

  const closePartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = true;
    partnerForm?.reset();
    if (partnerForm) syncCompanySections(partnerForm);
    if (partnerFormError) {
      partnerFormError.hidden = true;
      partnerFormError.textContent = '';
    }
  };

  const openPartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = false;
  };

  document.querySelectorAll('[data-open-partner-modal]').forEach((button) => {
    button.addEventListener('click', openPartnerModal);
  });

  document.querySelectorAll('[data-close-partner-modal]').forEach((button) => {
    button.addEventListener('click', closePartnerModal);
  });

  partnerList?.addEventListener('click', async (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-delete-partner]') : null;
    if (!(button instanceof HTMLButtonElement)) return;

    if (partnerFormError) {
      partnerFormError.hidden = true;
      partnerFormError.textContent = '';
    }

    try {
      button.disabled = true;
      await deletePartner(button.dataset.deletePartner || '', button.dataset.deleteName || 'this partner');
    } catch (error) {
      if (partnerFormError) {
        partnerFormError.hidden = false;
        partnerFormError.textContent = error instanceof Error ? error.message : 'Unable to delete partner.';
      }
    } finally {
      button.disabled = false;
    }
  });

  partnerForm?.querySelectorAll('input[name="companies[]"]').forEach((input) => {
    input.addEventListener('change', () => syncCompanySections(partnerForm));
  });

  partnerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (partnerFormError) {
      partnerFormError.hidden = true;
      partnerFormError.textContent = '';
    }

    try {
      const formData = new window.FormData(partnerForm);
      await requestJson({
        method: 'POST',
        body: {
          action: 'create',
          name: formData.get('name'),
          partner_slug: formData.get('partner_slug'),
          companies: checkedValues('companies[]'),
          product_access: productAccessPayload(partnerForm),
          pricing: pricingPayload(formData),
          notes: formData.get('notes')
        }
      });
      closePartnerModal();
      await loadPartners();
    } catch (error) {
      if (partnerFormError) {
        partnerFormError.hidden = false;
        partnerFormError.textContent = error instanceof Error ? error.message : 'Unable to create partner.';
      }
    }
  });

  loadPartners().catch((error) => {
    if (partnerFormError) {
      partnerFormError.hidden = false;
      partnerFormError.textContent = error instanceof Error ? error.message : 'Unable to load partners.';
    }
  });

  if (partnerForm) syncCompanySections(partnerForm);
});
