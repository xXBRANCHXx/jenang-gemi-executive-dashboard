const root = document.querySelector('[data-blog-builder]');

if (root) {
  const endpoint = root.dataset.endpoint || '../api/blogs/';
  const csrfToken = root.dataset.csrfToken || '';
  const topics = {
    'healthy-eating': { label: 'Healthy Eating', accent: '#9dff00' },
    'keeping-fit': { label: 'Keeping Fit', accent: '#22d3ee' },
    'losing-weight': { label: 'Losing Weight', accent: '#ffd400' },
    'diabetes-remission': { label: 'Diabetes Remission', accent: '#a78bfa' }
  };
  const statusLabels = { draft: 'Draft', in_review: 'In review', scheduled: 'Scheduled', ready: 'Ready in queue', archived: 'Archived' };

  const elements = {
    form: root.querySelector('[data-editor-form]'),
    empty: root.querySelector('[data-editor-empty]'),
    inspector: root.querySelector('[data-inspector]'),
    library: root.querySelector('[data-library-list]'),
    search: root.querySelector('[data-library-search]'),
    topicFilter: root.querySelector('[data-library-topic]'),
    sort: root.querySelector('[data-library-sort]'),
    body: root.querySelector('[data-body-editor]'),
    title: root.querySelector('[name="title"]'),
    excerpt: root.querySelector('[name="excerpt"]'),
    topic: root.querySelector('[name="topic"]'),
    id: root.querySelector('[name="id"]'),
    version: root.querySelector('[name="version"]'),
    assetId: root.querySelector('[name="featured_asset_id"]'),
    status: root.querySelector('[data-status-select]'),
    author: root.querySelector('[data-author-input]'),
    slug: root.querySelector('[data-slug-input]'),
    schedule: root.querySelector('[data-schedule-input]'),
    seoTitle: root.querySelector('[data-seo-title]'),
    seoDescription: root.querySelector('[data-seo-description]'),
    coverInput: root.querySelector('[data-cover-input]'),
    coverDrop: root.querySelector('[data-cover-drop]'),
    coverEmpty: root.querySelector('[data-cover-empty]'),
    coverPreview: root.querySelector('[data-cover-preview]'),
    coverChange: root.querySelector('[data-cover-change]'),
    currentStatus: root.querySelector('[data-current-status]'),
    articleMeta: root.querySelector('[data-article-meta]'),
    slugPreview: root.querySelector('[data-slug-preview]'),
    saveState: root.querySelector('[data-save-state]'),
    saveStateWrap: root.querySelector('.blog-topbar-state'),
    toast: root.querySelector('[data-toast]'),
    moreMenu: root.querySelector('[data-more-menu]'),
    previewDialog: root.querySelector('[data-preview-dialog]'),
    historyDialog: root.querySelector('[data-history-dialog]'),
    historyList: root.querySelector('[data-history-list]'),
    workbench: root.querySelector('.blog-workbench')
  };

  const state = {
    posts: [],
    current: null,
    revisions: [],
    statusFilter: '',
    dirty: false,
    saving: false,
    hydrating: false,
    slugTouched: false,
    saveTimer: 0,
    toastTimer: 0,
    loadSequence: 0
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const slugify = (value) => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'untitled-article';

  const plainText = (html) => {
    const holder = document.createElement('div');
    holder.innerHTML = html || '';
    return (holder.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const wordCount = (value) => (String(value || '').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;

  const safePreviewHtml = (html) => {
    const template = document.createElement('template');
    template.innerHTML = html || '';
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,img,video,audio').forEach((node) => node.remove());
    template.content.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        if (attribute.name.startsWith('on') || (attribute.name === 'href' && !/^(https?:|mailto:|#)/i.test(attribute.value))) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    return template.innerHTML;
  };

  const api = async (action = 'list', options = {}) => {
    const requestUrl = new URL(endpoint, window.location.href);
    requestUrl.searchParams.set('action', action);
    Object.entries(options.query || {}).forEach(([key, value]) => requestUrl.searchParams.set(key, value));
    const request = {
      method: options.method || 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) }
    };
    if (request.method !== 'GET') request.headers['X-CSRF-Token'] = csrfToken;
    if (options.body instanceof FormData) {
      request.body = options.body;
    } else if (options.body !== undefined) {
      request.headers['Content-Type'] = 'application/json';
      request.body = JSON.stringify(options.body);
    }
    const response = await fetch(requestUrl, request);
    let payload = {};
    try { payload = await response.json(); } catch (_error) { /* handled below */ }
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.conflict = Boolean(payload.conflict);
      throw error;
    }
    return payload;
  };

  const showToast = (message, type = 'success') => {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle('is-error', type === 'error');
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, type === 'error' ? 5000 : 2600);
  };

  const setSaveState = (label, mode = 'ready') => {
    elements.saveState.textContent = label;
    elements.saveStateWrap.classList.toggle('is-saving', mode === 'saving');
    elements.saveStateWrap.classList.toggle('is-error', mode === 'error');
  };

  const relativeTime = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const ranges = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
    for (const [range, unit] of ranges) {
      if (Math.abs(seconds) >= range) return formatter.format(Math.round(seconds / range), unit);
    }
    return 'Just now';
  };

  const formatSchedule = (value) => {
    if (!value) return '';
    const date = new Date(`${value}:00+07:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date) + ' WIB';
  };

  const currentEffectiveStatus = () => {
    if (elements.status.value === 'scheduled' && elements.schedule.value) {
      const timestamp = new Date(`${elements.schedule.value}:00+07:00`).getTime();
      if (Number.isFinite(timestamp) && timestamp <= Date.now()) return 'ready';
    }
    return elements.status.value || 'draft';
  };

  const renderStats = () => {
    const stats = { total: 0, draft: 0, in_review: 0, scheduled: 0, ready: 0, archived: 0 };
    state.posts.forEach((post) => {
      stats.total += 1;
      const status = post.effective_status || post.status;
      if (status in stats) stats[status] += 1;
    });
    root.querySelectorAll('[data-stat]').forEach((node) => { node.textContent = String(stats[node.dataset.stat] || 0); });
  };

  const filteredPosts = () => {
    const query = elements.search.value.trim().toLowerCase();
    const topic = elements.topicFilter.value;
    const posts = state.posts.filter((post) => {
      const haystack = `${post.title} ${post.author} ${topics[post.topic]?.label || post.topic} ${post.excerpt}`.toLowerCase();
      const effectiveStatus = post.effective_status || post.status;
      return (!query || haystack.includes(query)) && (!topic || post.topic === topic) && (!state.statusFilter || effectiveStatus === state.statusFilter);
    });
    if (elements.sort.value === 'title') posts.sort((a, b) => a.title.localeCompare(b.title));
    if (elements.sort.value === 'scheduled') posts.sort((a, b) => String(a.scheduled_at || '9999').localeCompare(String(b.scheduled_at || '9999')));
    if (elements.sort.value === 'updated') posts.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    return posts;
  };

  const renderLibrary = () => {
    const posts = filteredPosts();
    if (!posts.length) {
      elements.library.innerHTML = `<div class="blog-library-empty">${state.posts.length ? 'No articles match these filters.' : 'No articles yet. Create the first ZERO story when you are ready.'}</div>`;
      return;
    }
    elements.library.innerHTML = posts.map((post) => {
      const topic = topics[post.topic] || topics['healthy-eating'];
      const effectiveStatus = post.effective_status || post.status;
      const timing = effectiveStatus === 'scheduled' || effectiveStatus === 'ready' ? formatSchedule(post.scheduled_at) : `Edited ${relativeTime(post.updated_at)}`;
      return `<button type="button" class="blog-library-item${Number(elements.id.value) === post.id ? ' is-active' : ''}" data-post-id="${post.id}">
        <span class="blog-library-item-meta"><span class="blog-status-pill" data-status="${escapeHtml(effectiveStatus)}">${escapeHtml(statusLabels[effectiveStatus] || effectiveStatus)}</span><span class="blog-topic-pill" style="--topic-color:${topic.accent}">${escapeHtml(topic.label)}</span></span>
        <strong>${escapeHtml(post.title || 'Untitled article')}</strong>
        <small>${escapeHtml(timing)} · ${Number(post.word_count || 0).toLocaleString()} words</small>
      </button>`;
    }).join('');
  };

  const renderHistory = () => {
    if (!state.revisions.length) {
      elements.historyList.innerHTML = '<p class="blog-muted">No earlier versions yet. A version is added whenever saved content changes.</p>';
      return;
    }
    elements.historyList.innerHTML = state.revisions.map((revision) => `<div class="blog-history-item"><span><strong>Version ${revision.version}</strong><small>${escapeHtml(new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(revision.created_at)))} WIB</small></span><button type="button" data-restore-revision="${revision.id}">Restore</button></div>`).join('');
  };

  const resizeTitle = () => {
    elements.title.style.height = 'auto';
    elements.title.style.height = `${Math.max(55, elements.title.scrollHeight)}px`;
  };

  const getChecklist = () => {
    const words = wordCount(plainText(elements.body.innerHTML));
    const scheduleTime = elements.schedule.value ? new Date(`${elements.schedule.value}:00+07:00`).getTime() : 0;
    return {
      title: elements.title.value.trim().length >= 8,
      excerpt: elements.excerpt.value.trim().length >= 40,
      body: words >= 100,
      author: elements.author.value.trim().length >= 2,
      schedule: scheduleTime > Date.now() + 60000,
      image: Number(elements.assetId.value) > 0,
      seo: (elements.seoDescription.value.trim() || elements.excerpt.value.trim()).length >= 50
    };
  };

  const updateDerived = () => {
    const bodyText = plainText(elements.body.innerHTML);
    const words = wordCount(bodyText);
    const slug = slugify(elements.slug.value || elements.title.value);
    const effectiveStatus = currentEffectiveStatus();
    const topic = topics[elements.topic.value] || topics['healthy-eating'];
    elements.slugPreview.textContent = slug;
    root.querySelector('[data-serp-slug]').textContent = slug;
    root.querySelector('[data-word-count]').textContent = words.toLocaleString();
    root.querySelector('[data-read-time]').textContent = String(Math.max(1, Math.ceil(words / 220)));
    root.querySelector('[data-excerpt-count]').textContent = String(elements.excerpt.value.length);
    root.querySelector('[data-seo-title-count]').textContent = String(elements.seoTitle.value.length);
    root.querySelector('[data-seo-description-count]').textContent = String(elements.seoDescription.value.length);
    root.querySelector('[data-serp-title]').textContent = elements.seoTitle.value.trim() || elements.title.value.trim() || 'Untitled article';
    root.querySelector('[data-serp-description]').textContent = elements.seoDescription.value.trim() || elements.excerpt.value.trim() || 'Add an SEO description or article summary to preview how the page may appear in search.';
    elements.currentStatus.textContent = statusLabels[effectiveStatus] || effectiveStatus;
    elements.currentStatus.dataset.status = effectiveStatus;
    elements.articleMeta.textContent = elements.id.value ? `Version ${elements.version.value} · ${topic.label}` : `New article · ${topic.label}`;

    const checks = getChecklist();
    root.querySelectorAll('[data-check]').forEach((item) => item.classList.toggle('is-complete', Boolean(checks[item.dataset.check])));
    const required = ['title', 'excerpt', 'body', 'author', 'schedule'];
    const complete = required.filter((key) => checks[key]).length;
    const score = Math.round((complete / required.length) * 100);
    root.querySelector('[data-readiness-score]').textContent = `${score}%`;
    root.querySelector('[data-readiness-bar]').style.width = `${score}%`;
    resizeTitle();
  };

  const setCover = (assetId, url) => {
    elements.assetId.value = assetId || '';
    elements.coverPreview.hidden = !url;
    elements.coverEmpty.hidden = Boolean(url);
    elements.coverChange.hidden = !url;
    if (url) elements.coverPreview.src = url;
  };

  const blankPost = () => ({
    id: null,
    version: 0,
    title: '',
    slug: '',
    excerpt: '',
    body_html: '',
    topic: 'healthy-eating',
    status: 'draft',
    author: 'ZERO Editorial',
    seo_title: '',
    seo_description: '',
    featured_asset_id: null,
    featured_image_url: null,
    scheduled_at: null,
    word_count: 0
  });

  const applyPost = (post, revisions = []) => {
    state.hydrating = true;
    state.current = post;
    state.revisions = revisions;
    state.slugTouched = Boolean(post.id);
    elements.id.value = post.id || '';
    elements.version.value = post.version || 0;
    elements.title.value = post.title === 'Untitled article' && !post.id ? '' : (post.title || '');
    elements.excerpt.value = post.excerpt || '';
    elements.body.innerHTML = safePreviewHtml(post.body_html || '');
    elements.topic.value = post.topic || 'healthy-eating';
    elements.status.value = post.status || 'draft';
    elements.author.value = post.author || 'ZERO Editorial';
    elements.slug.value = post.slug || '';
    elements.schedule.value = post.scheduled_at || '';
    elements.seoTitle.value = post.seo_title || '';
    elements.seoDescription.value = post.seo_description || '';
    setCover(post.featured_asset_id, post.featured_image_url);
    elements.form.hidden = false;
    elements.empty.hidden = true;
    elements.inspector.hidden = false;
    elements.workbench.classList.add('has-active-editor');
    state.dirty = false;
    setSaveState(post.id ? 'All changes saved' : 'New draft');
    updateDerived();
    renderLibrary();
    renderHistory();
    requestAnimationFrame(() => { state.hydrating = false; elements.title.focus(); });
  };

  const gatherPost = () => ({
    id: Number(elements.id.value) || 0,
    version: Number(elements.version.value) || 0,
    title: elements.title.value,
    slug: elements.slug.value,
    excerpt: elements.excerpt.value,
    body_html: elements.body.innerHTML,
    topic: elements.topic.value,
    status: elements.status.value,
    author: elements.author.value,
    seo_title: elements.seoTitle.value,
    seo_description: elements.seoDescription.value,
    featured_asset_id: Number(elements.assetId.value) || null,
    scheduled_at: elements.schedule.value || null
  });

  const upsertSummary = (post) => {
    const summary = { ...post };
    delete summary.body_html;
    delete summary.body_text;
    const index = state.posts.findIndex((item) => item.id === post.id);
    if (index >= 0) state.posts[index] = summary;
    else state.posts.unshift(summary);
    renderStats();
    renderLibrary();
  };

  const savePost = async ({ forcedStatus = null, announce = false } = {}) => {
    if (state.saving || !elements.form || elements.form.hidden) return null;
    window.clearTimeout(state.saveTimer);
    const previousStatus = elements.status.value;
    if (forcedStatus) elements.status.value = forcedStatus;
    updateDerived();
    const payload = gatherPost();
    state.saving = true;
    setSaveState('Saving…', 'saving');
    root.querySelectorAll('[data-save-draft], [data-schedule-post]').forEach((button) => { button.disabled = true; });
    try {
      const response = await api('save', { method: 'POST', body: payload });
      state.current = response.post;
      state.revisions = response.revisions || [];
      elements.id.value = response.post.id;
      elements.version.value = response.post.version;
      elements.slug.value = response.post.slug;
      elements.status.value = response.post.status;
      elements.body.innerHTML = response.post.body_html || '';
      state.slugTouched = true;
      state.dirty = false;
      upsertSummary(response.post);
      renderHistory();
      updateDerived();
      setSaveState('All changes saved');
      if (announce) showToast(response.post.status === 'scheduled' ? `Scheduled for ${formatSchedule(response.post.scheduled_at)}.` : 'Draft saved.');
      return response.post;
    } catch (error) {
      if (forcedStatus) elements.status.value = previousStatus;
      updateDerived();
      setSaveState(error.conflict ? 'Reload required' : 'Save failed', 'error');
      if (announce || error.conflict) showToast(error.message, 'error');
      return null;
    } finally {
      state.saving = false;
      root.querySelectorAll('[data-save-draft], [data-schedule-post]').forEach((button) => { button.disabled = false; });
    }
  };

  const canAutosave = () => {
    if (!state.dirty || state.saving) return false;
    if (elements.status.value === 'in_review') return wordCount(plainText(elements.body.innerHTML)) >= 30 && elements.title.value.trim();
    if (elements.status.value === 'scheduled') return getChecklist().schedule && getChecklist().title && getChecklist().excerpt && getChecklist().body;
    return true;
  };

  const markDirty = () => {
    if (state.hydrating) return;
    state.dirty = true;
    setSaveState('Unsaved changes', 'saving');
    updateDerived();
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(() => { if (canAutosave()) savePost(); }, 1400);
  };

  const maybeSaveBeforeSwitch = async () => {
    if (!state.dirty || !canAutosave()) return true;
    return Boolean(await savePost());
  };

  const loadPost = async (id) => {
    const sequence = ++state.loadSequence;
    if (!(await maybeSaveBeforeSwitch())) return;
    setSaveState('Opening article…', 'saving');
    try {
      const response = await api('get', { query: { id } });
      if (sequence !== state.loadSequence) return;
      applyPost(response.post, response.revisions || []);
    } catch (error) {
      setSaveState('Could not open', 'error');
      showToast(error.message, 'error');
    }
  };

  const newPost = async () => {
    if (!(await maybeSaveBeforeSwitch())) return;
    applyPost(blankPost(), []);
  };

  const uploadCover = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('alt_text', elements.title.value.trim() || 'ZERO article cover');
    elements.coverDrop.classList.remove('is-dragover');
    setSaveState('Uploading cover…', 'saving');
    try {
      const response = await api('upload', { method: 'POST', body: formData });
      setCover(response.asset.id, response.asset.url);
      markDirty();
      showToast(`Cover uploaded · ${response.asset.width} × ${response.asset.height}px.`);
    } catch (error) {
      setSaveState('Upload failed', 'error');
      showToast(error.message, 'error');
    } finally {
      elements.coverInput.value = '';
    }
  };

  const openPreview = () => {
    const topic = topics[elements.topic.value] || topics['healthy-eating'];
    root.querySelector('[data-preview-topic]').textContent = topic.label;
    root.querySelector('[data-preview-title]').textContent = elements.title.value.trim() || 'Untitled article';
    root.querySelector('[data-preview-excerpt]').textContent = elements.excerpt.value.trim();
    root.querySelector('[data-preview-author]').textContent = elements.author.value.trim() || 'ZERO Editorial';
    root.querySelector('[data-preview-reading]').textContent = `${Math.max(1, Math.ceil(wordCount(plainText(elements.body.innerHTML)) / 220))} min read`;
    root.querySelector('[data-preview-body]').innerHTML = safePreviewHtml(elements.body.innerHTML) || '<p>Start writing to see the article preview.</p>';
    const previewImage = root.querySelector('[data-preview-image]');
    previewImage.hidden = !elements.coverPreview.src || elements.coverPreview.hidden;
    if (!previewImage.hidden) previewImage.src = elements.coverPreview.src;
    elements.previewDialog.showModal();
  };

  const setScheduleShortcut = (kind) => {
    const now = new Date();
    const jakartaParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type) => jakartaParts.find((item) => item.type === type)?.value || '';
    const local = new Date(`${part('year')}-${part('month')}-${part('day')}T09:00:00+07:00`);
    if (kind === 'tomorrow') local.setUTCDate(local.getUTCDate() + 1);
    if (kind === 'monday') {
      const jakartaDay = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', weekday: 'short' }).formatToParts(now).find((item) => item.type === 'weekday') ? local.getUTCDay() : local.getUTCDay());
      let days = (1 - jakartaDay + 7) % 7;
      if (days === 0) days = 7;
      local.setUTCDate(local.getUTCDate() + days);
    }
    const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    elements.schedule.value = formatter.format(local).replace(' ', 'T');
    markDirty();
  };

  const schedulePost = async () => {
    const checks = getChecklist();
    const missing = [];
    if (!checks.title) missing.push('a clear title');
    if (!checks.excerpt) missing.push('a 40-character summary');
    if (!checks.body) missing.push('at least 100 words');
    if (!checks.author) missing.push('an author');
    if (!checks.schedule) missing.push('a future WIB schedule');
    if (missing.length) {
      root.querySelector('[data-inspector-tab="checklist"]').click();
      showToast(`Before scheduling, add ${missing.join(', ')}.`, 'error');
      return;
    }
    await savePost({ forcedStatus: 'scheduled', announce: true });
  };

  const archivePost = async () => {
    if (!Number(elements.id.value)) {
      applyPost(blankPost(), []);
      return;
    }
    if (!window.confirm('Archive this article? It will stay in the library and can be restored to Draft later.')) return;
    try {
      const response = await api('archive', { method: 'POST', body: { id: Number(elements.id.value), version: Number(elements.version.value) } });
      applyPost(response.post, []);
      upsertSummary(response.post);
      showToast('Article archived.');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const duplicatePost = async () => {
    const saved = state.dirty || !Number(elements.id.value) ? await savePost() : state.current;
    if (!saved) return;
    try {
      const response = await api('duplicate', { method: 'POST', body: { id: Number(elements.id.value) } });
      upsertSummary(response.post);
      applyPost(response.post, []);
      showToast('Draft copy created.');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const restoreRevision = async (revisionId) => {
    if (!window.confirm('Restore this earlier version? Your current version will remain in history.')) return;
    try {
      const response = await api('restore', { method: 'POST', body: { id: Number(elements.id.value), revision_id: Number(revisionId), version: Number(elements.version.value) } });
      const detail = await api('get', { query: { id: response.post.id } });
      applyPost(detail.post, detail.revisions || []);
      upsertSummary(detail.post);
      elements.historyDialog.close();
      showToast('Earlier version restored.');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const bind = () => {
    root.querySelectorAll('[data-new-post]').forEach((button) => button.addEventListener('click', newPost));
    elements.library.addEventListener('click', (event) => {
      const item = event.target.closest('[data-post-id]');
      if (item) loadPost(Number(item.dataset.postId));
    });
    [elements.search, elements.topicFilter, elements.sort].forEach((control) => control.addEventListener('input', renderLibrary));
    root.querySelectorAll('[data-library-status]').forEach((button) => button.addEventListener('click', () => {
      state.statusFilter = button.dataset.libraryStatus || '';
      root.querySelectorAll('[data-library-status]').forEach((item) => item.classList.toggle('is-active', item === button));
      renderLibrary();
    }));

    elements.form.addEventListener('submit', (event) => event.preventDefault());
    [elements.title, elements.excerpt, elements.topic, elements.status, elements.author, elements.slug, elements.schedule, elements.seoTitle, elements.seoDescription].forEach((control) => control.addEventListener('input', () => {
      if (control === elements.slug) state.slugTouched = true;
      if (control === elements.title && !state.slugTouched) elements.slug.value = slugify(elements.title.value);
      markDirty();
    }));
    elements.body.addEventListener('input', markDirty);
    elements.body.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      const lines = text.split(/\r?\n/);
      const html = lines.map((line) => line ? escapeHtml(line) : '<br>').join('<br>');
      document.execCommand('insertHTML', false, html);
    });

    root.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => {
      elements.body.focus();
      document.execCommand(button.dataset.format, false, button.dataset.value || null);
      markDirty();
    }));
    root.querySelector('[data-add-link]').addEventListener('click', () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        showToast('Select the words you want to link first.', 'error');
        return;
      }
      const href = window.prompt('Paste an https:// link or email address:');
      if (!href) return;
      const safe = /^(https?:\/\/|mailto:)/i.test(href) ? href : `https://${href}`;
      elements.body.focus();
      document.execCommand('createLink', false, safe);
      markDirty();
    });

    root.querySelector('[data-save-draft]').addEventListener('click', () => savePost({ forcedStatus: 'draft', announce: true }));
    root.querySelector('[data-schedule-post]').addEventListener('click', schedulePost);
    root.querySelector('[data-preview-post]').addEventListener('click', openPreview);
    root.querySelector('[data-preview-close]').addEventListener('click', () => elements.previewDialog.close());
    elements.previewDialog.addEventListener('click', (event) => { if (event.target === elements.previewDialog) elements.previewDialog.close(); });

    root.querySelector('[data-more-toggle]').addEventListener('click', (event) => {
      event.stopPropagation();
      elements.moreMenu.hidden = !elements.moreMenu.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!elements.moreMenu.hidden));
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-more-menu], [data-more-toggle]')) elements.moreMenu.hidden = true;
    });
    root.querySelector('[data-duplicate-post]').addEventListener('click', duplicatePost);
    root.querySelector('[data-archive-post]').addEventListener('click', archivePost);
    root.querySelector('[data-history-toggle]').addEventListener('click', () => { renderHistory(); elements.historyDialog.showModal(); });
    root.querySelector('[data-history-close]').addEventListener('click', () => elements.historyDialog.close());
    elements.historyDialog.addEventListener('click', (event) => { if (event.target === elements.historyDialog) elements.historyDialog.close(); });
    elements.historyList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-restore-revision]');
      if (button) restoreRevision(button.dataset.restoreRevision);
    });

    root.querySelectorAll('[data-inspector-tab]').forEach((button) => button.addEventListener('click', () => {
      root.querySelectorAll('[data-inspector-tab]').forEach((tab) => { tab.classList.toggle('is-active', tab === button); tab.setAttribute('aria-selected', String(tab === button)); });
      root.querySelectorAll('[data-inspector-panel]').forEach((panel) => { panel.hidden = panel.dataset.inspectorPanel !== button.dataset.inspectorTab; panel.classList.toggle('is-active', !panel.hidden); });
    }));
    root.querySelectorAll('[data-schedule-shortcut]').forEach((button) => button.addEventListener('click', () => setScheduleShortcut(button.dataset.scheduleShortcut)));

    elements.coverInput.addEventListener('change', () => uploadCover(elements.coverInput.files?.[0]));
    ['dragenter', 'dragover'].forEach((type) => elements.coverDrop.addEventListener(type, (event) => { event.preventDefault(); elements.coverDrop.classList.add('is-dragover'); }));
    ['dragleave', 'drop'].forEach((type) => elements.coverDrop.addEventListener(type, (event) => { event.preventDefault(); elements.coverDrop.classList.remove('is-dragover'); }));
    elements.coverDrop.addEventListener('drop', (event) => uploadCover(event.dataTransfer?.files?.[0]));

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        savePost({ announce: true });
      }
    });
    window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  };

  const init = async () => {
    bind();
    try {
      const response = await api('list');
      state.posts = response.posts || [];
      renderStats();
      renderLibrary();
      setSaveState('Ready');
    } catch (error) {
      elements.library.innerHTML = '<div class="blog-library-empty">The article library could not be loaded. Refresh to try again.</div>';
      setSaveState('Workspace offline', 'error');
      showToast(error.message, 'error');
    }
  };

  init();
}
