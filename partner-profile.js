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
    form.elements.jenang_gemi_bubur.value = partner.pricing?.jenang_gemi_bubur ?? 0;
    form.elements.jenang_gemi_jamu.value = partner.pricing?.jenang_gemi_jamu ?? 0;
    form.elements.notes.value = partner.notes || '';
    setCheckedValues('companies[]', partner.companies || []);
    setCheckedValues('allowed_brands[]', partner.allowed_brands || []);
    setCheckedValues('products[]', partner.products || []);
    if (partnerName) partnerName.textContent = partner.name || partner.code || 'Partner';
    if (partnerCodeBadge) partnerCodeBadge.textContent = partner.code || 'Partner';
    if (codeNote) codeNote.textContent = partner.code || 'Pending';
    if (urlNote) urlNote.textContent = `https://partner.jenanggemi.com${partner.store_path || '/'}`;
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
          allowed_brands: checkedValues('allowed_brands[]'),
          products: checkedValues('products[]'),
          pricing: {
            jenang_gemi_bubur: formData.get('jenang_gemi_bubur'),
            jenang_gemi_jamu: formData.get('jenang_gemi_jamu')
          },
          notes: formData.get('notes')
        }
      });
      await loadPartner();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save partner.');
    }
  });

  loadPartner().catch((error) => {
    setError(error instanceof Error ? error.message : 'Unable to load partner.');
  });
});
