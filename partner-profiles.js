document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-partner-profiles]');
  if (!root) return;

  const endpoint = root.dataset.partnersEndpoint || '../api/partners/';
  const partnerList = document.querySelector('[data-partner-list]');
  const partnerModal = document.querySelector('[data-partner-modal]');
  const partnerForm = document.querySelector('[data-partner-form]');
  const partnerFormError = document.querySelector('[data-partner-form-error]');

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
          </div>
        </div>
        <div class="admin-affiliate-field">
          <span class="admin-control-label">Companies</span>
          <div class="admin-affiliate-platform-grid">
            ${(partner.companies || []).map((company) => `<div class="admin-platform-choice"><span>${escapeHtml(company)}</span></div>`).join('')}
          </div>
        </div>
        <div class="admin-affiliate-field">
          <span class="admin-control-label">Allowed brands</span>
          <div class="admin-affiliate-platform-grid">
            ${(partner.allowed_brands || []).map((brand) => `<div class="admin-platform-choice"><span>${escapeHtml(brand)}</span></div>`).join('')}
          </div>
        </div>
        <div class="admin-affiliate-field">
          <span class="admin-control-label">Products</span>
          <div class="admin-affiliate-platform-grid">
            ${(partner.products || []).map((product) => `<div class="admin-platform-choice"><span>${escapeHtml(product)}</span></div>`).join('')}
          </div>
        </div>
      </article>
    `).join('');
  };

  const loadPartners = async () => {
    const payload = await requestJson();
    renderPartners(payload.database?.partners || []);
  };

  const closePartnerModal = () => {
    if (!partnerModal) return;
    partnerModal.hidden = true;
    partnerForm?.reset();
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
          allowed_brands: checkedValues('allowed_brands[]'),
          products: checkedValues('products[]'),
          pricing: {
            jenang_gemi_bubur: formData.get('jenang_gemi_bubur'),
            jenang_gemi_jamu: formData.get('jenang_gemi_jamu')
          },
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
});
