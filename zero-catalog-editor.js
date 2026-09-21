const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Number(value) || 0)}`;
const products = {syrup: 'ZERO Syrup', drops: 'ZERO Drops', 'maple-topping': 'ZERO Maple Topping', 'fiber-syrup': 'ZFIT Fiber Syrup', acvs: 'ZFIT ACVS'};
const photos = {syrup: '/ZERO Media/ZERO Syrup Renders/Plain.png', drops: '/ZERO Media/ZERO Drops Hero.png', 'maple-topping': '/ZERO Media/ZERO Maple Topping Hero.png', 'fiber-syrup': '/ZERO Media/ZFIT/Fiber Syrup Carousel/Fiber Syrup 1.jpg', acvs: '/ZERO Media/ZFIT/ACVS Carousel/ACVS 1.jpg'};
const imageUrl = (item) => { const url = item.image_url || photos[item.product_slug] || ''; return url.startsWith('/') ? `https://zerofoods.id${url}` : url; };
const salePrice = (item, discounts) => {
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const discount = discounts.filter(d => Number(d.is_active) === 1 && d.starts_on <= today && d.ends_on >= today && (d.item_keys || []).includes(item.item_key)).sort((a,b) => Number(b.id)-Number(a.id))[0];
  return Math.round(Math.max(0, discount ? (discount.discount_type === 'percent' ? Number(item.price)*(1-Math.min(100,Number(discount.amount))/100) : Number(item.price)-Number(discount.amount)) : Number(item.price)) * 100) / 100;
};

export function initZeroCatalogEditor(root, post, onSaved) {
  if (!root) return null;
  let items = [], discounts = [], candidates = [], selected = '', dirty = false, busy = false;
  const $ = (s) => root.querySelector(s);
  const list = $('[data-catalog-list]'), form = $('[data-catalog-editor-form]'), status = $('[data-catalog-status]');
  const dialog = $('[data-catalog-add-dialog]');
  const notify = (text, error = false) => { status.textContent = text; status.classList.toggle('is-error', error); };
  const groups = () => [...new Map(items.map(i => [`${i.product_slug}:${i.option_id}`, i])).entries()];
  const currentRows = () => items.filter(i => `${i.product_slug}:${i.option_id}` === selected).sort((a,b) => parseFloat(a.size_id)-parseFloat(b.size_id));
  const renderList = () => {
    const query = $('[data-catalog-search]').value.trim().toLowerCase(), product = $('[data-catalog-product]').value;
    const visible = groups().filter(([,i]) => (!product || product === i.product_slug) && [i.option_name, i.product_name, ...items.filter(r => r.option_id === i.option_id && r.product_slug === i.product_slug).map(r=>r.sku)].join(' ').toLowerCase().includes(query));
    $('[data-catalog-count]').textContent = `${visible.length} flavors · ${items.filter(i=>Number(i.is_active)===1).length} visible sizes`;
    list.innerHTML = visible.length ? visible.map(([key,item]) => {
      const rows = items.filter(i => `${i.product_slug}:${i.option_id}` === key);
      const active = rows.filter(i=>Number(i.is_active)===1).length;
      return `<button type="button" class="zero-catalog-flavor${selected===key?' is-selected':''}" data-catalog-select="${escape(key)}" aria-pressed="${selected===key}"><span><strong>${escape(item.option_name)}</strong><small>${escape(item.product_name)} · ${rows.length} sizes</small></span><span class="zero-catalog-visibility">${active ? `${active} visible` : 'Hidden'}</span></button>`;
    }).join('') : '<p class="admin-empty">No flavors match. Add a flavor from the SKU Database.</p>';
  };
  const renderEditor = () => {
    const rows = currentRows(), item = rows[0];
    if (!item) { form.innerHTML='<p class="admin-empty">Select a flavor to edit its sizes, image and website prices.</p>'; return; }
    form.innerHTML = `<div class="zero-catalog-editor-head"><img src="${escape(imageUrl(item))}" alt=""/><div><small>${escape(item.product_name)}</small><h4>${escape(item.option_name)}</h4><p>Prices and stock stay connected to the SKU Database.</p></div></div>
      <div class="zero-catalog-fields"><label>Flavor name<input name="option_name" value="${escape(item.option_name)}" maxlength="160" required></label><label>Flavor group<select name="option_group"><option value="">Keep existing group</option>${['Coffee Flavors','Other Flavors','Topping','Fiber Syrup','ACVS'].map(g=>`<option${g===item.option_group?' selected':''}>${g}</option>`).join('')}</select></label><label class="zero-catalog-full">Product image URL<input name="image_url" value="${escape(item.image_url)}" maxlength="1000" placeholder="Leave blank to keep the existing product image"><small>Paste an HTTPS image link, or keep the current website photo.</small></label></div>
      <div class="zero-catalog-sizes">${rows.map(row => `<div class="zero-catalog-size" data-catalog-size="${escape(row.item_key)}"><div class="zero-catalog-size-head"><strong>${escape(row.size_label)}</strong><span>${row.sku_linked?`${Number(row.stock)} in stock`:'SKU not linked'}</span><label class="zero-catalog-check"><input name="visible" type="checkbox"${Number(row.is_active)===1?' checked':''}>Visible</label></div><small class="zero-catalog-sku">SKU ${escape(row.sku || 'not linked')}</small><div class="zero-catalog-size-fields"><label>Price source<select name="price_source"><option value="sku"${row.price_source==='sku'?' selected':''}>Use SKU price · ${money(row.sku_price)}</option><option value="website"${row.price_source==='website'?' selected':''}>Website override</option></select></label><label data-override-field>Website override<input name="site_price" type="number" min="0" step="0.01" value="${Number(row.site_price)||0}"${row.price_source==='sku'?' disabled':''}></label></div><p class="zero-catalog-price-preview" data-price-preview></p></div>`).join('')}</div>
      <div class="zero-catalog-save"><span data-catalog-dirty>All changes saved</span><button type="button" class="admin-soft-btn" data-catalog-reset disabled>Discard changes</button><button type="submit" class="admin-primary-btn" disabled>Save flavor</button></div>`;
    refreshPrices();
  };
  function refreshPrices() {
    form.querySelectorAll('[data-catalog-size]').forEach(el => {
      const row = items.find(i=>i.item_key===el.dataset.catalogSize), source=el.querySelector('[name=price_source]').value;
      const input=el.querySelector('[name=site_price]'); input.disabled=source==='sku';
      el.querySelector('[data-override-field]').hidden=source==='sku';
      const base=source==='sku' && Number(row.sku_price)>0 ? Number(row.sku_price) : Number(input.value);
      const net=salePrice({...row,price:base},discounts);
      el.querySelector('[data-price-preview]').innerHTML=`Customers pay <strong>${money(net)}</strong>${net<base?` <s>${money(base)}</s> after scheduled discount`:''}${source==='sku' && !Number(row.sku_price)?' · SKU price is not set; using saved website price':''}`;
    });
  }
  const markDirty = (value) => {
    dirty=value;
    form.querySelector('[data-catalog-dirty]')?.replaceChildren(document.createTextNode(value?'Unsaved changes':'All changes saved'));
    form.querySelectorAll('button').forEach(b => b.disabled=!value || busy);
  };
  const adopt = data => { items=data.items||[]; discounts=data.discounts||[]; candidates=data.available_skus||[]; if(!selected || !groups().some(([k])=>k===selected)) selected=groups()[0]?.[0]||''; renderList(); renderEditor(); };
  root.addEventListener('click', event => {
    if (busy) return;
    const select=event.target.closest('[data-catalog-select]');
    if (select?.dataset.catalogSelect === selected) return;
    if(select) { if(dirty && select.dataset.catalogSelect!==selected) { notify('Save or discard your changes before selecting another flavor.',true); return; } selected=select.dataset.catalogSelect;renderList();renderEditor(); }
    if(event.target.closest('[data-catalog-reset]')) {markDirty(false);renderEditor();notify('Changes discarded.');}
    if(event.target.closest('[data-catalog-add]')) {if(dirty){notify('Save or discard your flavor changes first.',true);return;} renderCandidates();dialog.showModal();}
    if(event.target.closest('[data-catalog-add-close]')) dialog.close();
  });
  form.addEventListener('input',()=>{markDirty(true);refreshPrices();});
  form.addEventListener('change',()=>{markDirty(true);refreshPrices();});
  $('[data-catalog-search]').addEventListener('input',renderList);
  $('[data-catalog-product]').addEventListener('change',renderList);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if(busy || !dirty) return;
    const row=currentRows()[0];if(!row)return;
    const payload={product_slug:row.product_slug,option_id:row.option_id,option_name:form.elements.option_name.value,image_url:form.elements.image_url.value,option_group:form.elements.option_group.value,items:[...form.querySelectorAll('[data-catalog-size]')].map(el=>({item_key:el.dataset.catalogSize,price_source:el.querySelector('[name=price_source]').value,site_price:el.querySelector('[name=site_price]').value,is_active:el.querySelector('[name=visible]').checked}))};
    busy=true;form.inert=true;form.setAttribute('aria-busy','true');markDirty(true);notify('Saving flavor…');
    try { const data=await post('save_variant',payload);dirty=false;adopt(data);onSaved(data);notify('Flavor saved. The website will use these settings on its next load.'); }
    catch(error){notify(error.message,true);} finally {busy=false;form.inert=false;form.removeAttribute('aria-busy');markDirty(dirty);}
  });
  function renderCandidates() {
    const linked=new Set(items.map(i=>i.sku));
    const available=candidates.filter(i=>!linked.has(i.sku) && !items.some(r=>r.item_key===`${i.product_slug}:${i.option_id}:${i.size_id}`));
    $('[data-catalog-candidates]').innerHTML=available.length?available.map(i=>`<label class="zero-catalog-candidate" data-candidate-text="${escape(`${products[i.product_slug]} ${i.option_name} ${i.size_id} ${i.sku}`.toLowerCase())}"><input type="checkbox" name="skus" value="${escape(i.sku)}"><span><strong>${escape(i.option_name || 'Plain')} · ${escape(i.size_id)}</strong><small>${escape(products[i.product_slug])} · ${escape(i.sku)}</small></span><span>${money(i.sku_price)}</span></label>`).join(''):'<p class="admin-empty">All eligible SKUs are already in the catalog. Create a flavor and its sizes in the SKU Database, then reload this page.</p>';
    $('[data-catalog-candidate-search]').value='';
    $('[data-catalog-add-status]').textContent='New sizes are added hidden so you can review their image and price before making them visible.';
  }
  $('[data-catalog-candidate-search]').addEventListener('input',event=>{
    const query=event.target.value.toLowerCase();dialog.querySelectorAll('[data-candidate-text]').forEach(el=>el.hidden=!el.dataset.candidateText.includes(query));
  });
  $('[data-catalog-add-form]').addEventListener('submit', async event=>{
    event.preventDefault();if(busy)return;
    const skus=[...dialog.querySelectorAll('[name=skus]:checked')].map(i=>i.value);
    const message=$('[data-catalog-add-status]');if(!skus.length){message.textContent='Select at least one SKU size.';return;}
    busy=true;const button=event.submitter;button.disabled=true;
    try{const data=await post('add_skus',{skus});const row=data.items.find(i=>i.sku===skus[0]);if(row)selected=`${row.product_slug}:${row.option_id}`;adopt(data);onSaved(data);dialog.close();notify('Sizes added. Review the flavor, enable Visible, then save.');}
    catch(error){message.textContent=error.message;}finally{busy=false;button.disabled=false;}
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  return {setData(data){if(!dirty && !busy)adopt(data);}};
}
