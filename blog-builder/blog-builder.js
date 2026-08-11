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
    font: root.querySelector('[data-article-font-select]'),
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
    inlineImageInput: root.querySelector('[data-inline-image-input]'),
    currentStatus: root.querySelector('[data-current-status]'),
    articleMeta: root.querySelector('[data-article-meta]'),
    slugPreview: root.querySelector('[data-slug-preview]'),
    saveState: root.querySelector('[data-save-state]'),
    saveStateWrap: root.querySelector('.blog-topbar-state'),
    toast: root.querySelector('[data-toast]'),
    moreMenu: root.querySelector('[data-more-menu]'),
    previewDialog: root.querySelector('[data-preview-dialog]'),
    shareDialog: root.querySelector('[data-share-dialog]'),
    shareUrl: root.querySelector('[data-share-url]'),
    shareLinkWrap: root.querySelector('[data-share-link-wrap]'),
    shareEmpty: root.querySelector('[data-share-empty]'),
    shareEnable: root.querySelector('[data-share-enable]'),
    shareOpen: root.querySelector('[data-share-open]'),
    shareManagement: root.querySelector('[data-share-management]'),
    shareButton: root.querySelector('[data-share-preview]'),
    undo: root.querySelector('[data-undo]'),
    redo: root.querySelector('[data-redo]'),
    imageLayout: root.querySelector('[data-image-layout]'),
    imageAlt: root.querySelector('[data-image-alt]'),
    historyDialog: root.querySelector('[data-history-dialog]'),
    historyList: root.querySelector('[data-history-list]'),
    deliveryControl: root.querySelector('[data-delivery-control]'),
    deliveryLabel: root.querySelector('[data-delivery-label]'),
    sandboxLink: root.querySelector('[data-sandbox-link]'),
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
    changeRevision: 0,
    slugTouched: false,
    saveTimer: 0,
    toastTimer: 0,
    loadSequence: 0,
    editorRange: null,
    selectedFigure: null,
    undoStack: [],
    redoStack: [],
    historySnapshot: null,
    historyTimer: 0,
    restoringHistory: false,
    imageInteraction: null,
    imageLayoutFrame: 0,
    delivery: null,
    deliverySaving: false
  };

  const HISTORY_LIMIT = 100;

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
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,video,audio').forEach((node) => node.remove());
    template.content.querySelectorAll('img').forEach((image) => {
      const src = image.getAttribute('src') || '';
      if (!/^\/api\/blogs\/?\?action=asset&id=\d+$/i.test(src)) {
        image.remove();
        return;
      }
      [...image.attributes].forEach((attribute) => {
        if (!['src', 'alt', 'loading', 'decoding'].includes(attribute.name)) image.removeAttribute(attribute.name);
      });
      image.setAttribute('loading', 'lazy');
      image.setAttribute('decoding', 'async');
    });
    template.content.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        const tag = node.tagName.toLowerCase();
        const allowed = tag === 'a' ? ['href', 'rel']
          : tag === 'img' ? ['src', 'alt', 'loading', 'decoding']
            : tag === 'figure' ? ['data-scale', 'data-shape', 'data-width', 'data-align', 'data-crop-top', 'data-crop-right', 'data-crop-bottom', 'data-crop-left', 'data-aspect']
              : tag === 'div' ? ['data-image-frame'] : [];
        if (!allowed.includes(attribute.name) || (attribute.name === 'href' && !/^(https?:|mailto:|#)/i.test(attribute.value))) node.removeAttribute(attribute.name);
      });
    });
    template.content.querySelectorAll('figure').forEach((figure) => {
      const scale = Number(figure.dataset.scale);
      const width = Number(figure.dataset.width || scale);
      figure.dataset.width = String(Number.isFinite(width) ? Math.min(100, Math.max(25, Math.round(width))) : 100);
      figure.dataset.shape = ['original', 'landscape', 'square', 'portrait'].includes(figure.dataset.shape) ? figure.dataset.shape : 'original';
      figure.dataset.align = ['left', 'center', 'right'].includes(figure.dataset.align) ? figure.dataset.align : 'center';
      ['Top', 'Right', 'Bottom', 'Left'].forEach((edge) => {
        const key = `crop${edge}`;
        const crop = Number(figure.dataset[key]);
        figure.dataset[key] = String(Number.isFinite(crop) ? Math.min(45, Math.max(0, Math.round(crop * 10) / 10)) : 0);
      });
      const aspect = Number(figure.dataset.aspect);
      figure.dataset.aspect = String(Number.isFinite(aspect) && aspect >= .1 && aspect <= 10 ? Math.round(aspect * 10000) / 10000 : 1.5);
      delete figure.dataset.scale;
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

  const renderDelivery = (delivery) => {
    if (!delivery || !elements.deliveryControl) return;
    state.delivery = delivery;
    const descriptions = {
      off: 'Off · public page hidden',
      sandbox: 'Sandbox · unlisted and noindex',
      live: 'Live · public and indexable'
    };
    elements.deliveryLabel.textContent = descriptions[delivery.mode] || delivery.label || 'Off';
    elements.deliveryControl.dataset.mode = delivery.mode;
    statusLabels.ready = delivery.mode === 'live' ? 'Published' : 'Ready in queue';
    const readyMetricLabel = root.querySelector('[data-library-status="ready"] span');
    if (readyMetricLabel) readyMetricLabel.textContent = statusLabels.ready;
    elements.deliveryControl.querySelectorAll('[data-delivery-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.deliveryMode === delivery.mode);
      button.setAttribute('aria-pressed', String(button.dataset.deliveryMode === delivery.mode));
      button.disabled = state.deliverySaving;
    });
    elements.sandboxLink.href = delivery.sandbox_url || 'https://zerofoods.id/articles/sandbox/';
    elements.sandboxLink.hidden = delivery.mode === 'off';
    if (state.posts.length) {
      renderStats();
      renderLibrary();
    }
  };

  const setDelivery = async (mode) => {
    if (state.deliverySaving || mode === state.delivery?.mode) return;
    state.deliverySaving = true;
    renderDelivery(state.delivery || { mode: 'off' });
    try {
      const response = await api('delivery', { method: 'POST', body: { mode } });
      state.deliverySaving = false;
      renderDelivery(response.delivery);
      showToast(mode === 'live'
        ? 'Articles are live and available for indexing.'
        : mode === 'sandbox'
          ? 'Sandbox is on. The preview URL stays out of site navigation and search indexes.'
          : 'Website articles are now hidden.');
    } catch (error) {
      state.deliverySaving = false;
      renderDelivery(state.delivery || { mode: 'off' });
      showToast(error.message, 'error');
    }
  };

  const rangeBelongsToEditor = (range) => Boolean(range && elements.body.contains(range.commonAncestorContainer));

  const rememberEditorRange = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (rangeBelongsToEditor(range)) state.editorRange = range.cloneRange();
    }
  };

  const rangeAtPoint = (x, y) => {
    let range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
    else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }
    return rangeBelongsToEditor(range) ? range : null;
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

  const previewUrl = (path) => path ? new URL(path, window.location.href).href : '';

  const renderShareState = (post = state.current) => {
    const enabled = Boolean(post?.preview_enabled && post?.preview_path);
    const url = enabled ? previewUrl(post.preview_path) : '';
    elements.shareButton.classList.toggle('is-active', enabled);
    elements.shareButton.setAttribute('aria-label', enabled ? 'Manage active private preview' : 'Share private preview');
    elements.shareLinkWrap.hidden = !enabled;
    elements.shareEmpty.hidden = enabled;
    elements.shareEnable.hidden = enabled;
    elements.shareOpen.hidden = !enabled;
    elements.shareManagement.hidden = !enabled;
    elements.shareUrl.value = url;
    elements.shareOpen.href = url || '#';
  };

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const applyFigureGeometry = (figure) => {
    if (!(figure instanceof HTMLElement)) return;
    const width = clamp(Math.round(Number(figure.dataset.width) || 100), 25, 100);
    const aspect = clamp(Number(figure.dataset.aspect) || 1.5, .1, 10);
    let top = clamp(Number(figure.dataset.cropTop) || 0, 0, 45);
    let right = clamp(Number(figure.dataset.cropRight) || 0, 0, 45);
    let bottom = clamp(Number(figure.dataset.cropBottom) || 0, 0, 45);
    let left = clamp(Number(figure.dataset.cropLeft) || 0, 0, 45);
    if (left + right > 75) right = 75 - left;
    if (top + bottom > 75) bottom = 75 - top;
    const visibleX = (100 - left - right) / 100;
    const visibleY = (100 - top - bottom) / 100;
    figure.dataset.width = String(width);
    figure.dataset.align = ['left', 'center', 'right'].includes(figure.dataset.align) ? figure.dataset.align : 'center';
    figure.dataset.cropTop = String(Math.round(top * 10) / 10);
    figure.dataset.cropRight = String(Math.round(right * 10) / 10);
    figure.dataset.cropBottom = String(Math.round(bottom * 10) / 10);
    figure.dataset.cropLeft = String(Math.round(left * 10) / 10);
    figure.dataset.aspect = String(Math.round(aspect * 10000) / 10000);
    figure.style.setProperty('--figure-width', `${width}%`);
    figure.style.setProperty('--crop-aspect', String(aspect * visibleX / visibleY));
    figure.style.setProperty('--crop-image-width', `${100 / visibleX}%`);
    figure.style.setProperty('--crop-image-height', `${100 / visibleY}%`);
    figure.style.setProperty('--crop-image-left', `${-left / visibleX}%`);
    figure.style.setProperty('--crop-image-top', `${-top / visibleY}%`);
  };

  const migrateLegacyShape = (figure, image) => {
    const shape = figure.dataset.shape;
    if (!['landscape', 'square', 'portrait'].includes(shape) || !image.naturalWidth || !image.naturalHeight) {
      delete figure.dataset.shape;
      return;
    }
    const aspect = image.naturalWidth / image.naturalHeight;
    const target = shape === 'landscape' ? 16 / 9 : (shape === 'portrait' ? 4 / 5 : 1);
    if (aspect > target) {
      const crop = (1 - target / aspect) * 50;
      figure.dataset.cropLeft = String(crop);
      figure.dataset.cropRight = String(crop);
    } else {
      const crop = (1 - aspect / target) * 50;
      figure.dataset.cropTop = String(crop);
      figure.dataset.cropBottom = String(crop);
    }
    delete figure.dataset.shape;
  };

  const addImageHandle = (frame, kind, edge) => {
    const handle = document.createElement('span');
    handle.className = `blog-image-handle is-${kind} is-${edge}`;
    handle.dataset.imageHandle = kind;
    handle.dataset.edge = edge;
    handle.setAttribute('aria-hidden', 'true');
    frame.append(handle);
  };

  const enhanceFigure = (figure) => {
    if (!(figure instanceof HTMLElement)) return;
    const image = figure.querySelector('img');
    if (!image) return;
    let frame = figure.querySelector('[data-image-frame]');
    if (!frame) {
      frame = document.createElement('div');
      frame.dataset.imageFrame = '';
      image.before(frame);
      frame.append(image);
    }
    frame.contentEditable = 'false';
    image.draggable = false;
    if (!figure.dataset.width) figure.dataset.width = figure.dataset.scale || '100';
    if (!figure.dataset.align) figure.dataset.align = 'center';
    ['Top', 'Right', 'Bottom', 'Left'].forEach((edge) => {
      const key = `crop${edge}`;
      if (!figure.dataset[key]) figure.dataset[key] = '0';
    });
    const finishImageSetup = () => {
      if (!figure.dataset.aspect || Number(figure.dataset.aspect) <= 0) figure.dataset.aspect = String(image.naturalWidth / image.naturalHeight || 1.5);
      migrateLegacyShape(figure, image);
      applyFigureGeometry(figure);
    };
    if (image.complete) finishImageSetup();
    else image.addEventListener('load', finishImageSetup, { once: true });
    frame.querySelectorAll('[data-image-handle], [data-crop-hint]').forEach((node) => node.remove());
    ['nw', 'ne', 'se', 'sw'].forEach((edge) => addImageHandle(frame, 'resize', edge));
    ['top', 'right', 'bottom', 'left'].forEach((edge) => addImageHandle(frame, 'crop', edge));
    const hint = document.createElement('span');
    hint.className = 'blog-crop-hint';
    hint.dataset.cropHint = '';
    hint.textContent = 'Drag image to reposition · drag a side to crop';
    frame.append(hint);
    applyFigureGeometry(figure);
  };

  const enhanceFigures = () => elements.body.querySelectorAll('figure').forEach(enhanceFigure);

  const serializedBodyHtml = () => {
    const clone = elements.body.cloneNode(true);
    clone.querySelectorAll('[data-image-handle], [data-crop-hint]').forEach((node) => node.remove());
    clone.querySelectorAll('figure').forEach((figure) => {
      figure.classList.remove('is-selected', 'is-cropping');
      figure.removeAttribute('contenteditable');
    });
    clone.querySelectorAll('[data-image-frame]').forEach((frame) => frame.removeAttribute('contenteditable'));
    clone.querySelectorAll('img').forEach((image) => image.removeAttribute('draggable'));
    return clone.innerHTML;
  };

  const positionImageLayout = () => {
    window.cancelAnimationFrame(state.imageLayoutFrame);
    state.imageLayoutFrame = window.requestAnimationFrame(() => {
      const figure = state.selectedFigure;
      const panel = elements.imageLayout;
      const frame = figure?.querySelector('[data-image-frame]');
      if (panel.hidden || !frame || !elements.body.contains(figure)) return;
      const editorRect = elements.form.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const panelWidth = Math.max(300, Math.min(560, editorRect.width - 24, window.innerWidth - 24));
      panel.style.width = `${panelWidth}px`;
      const panelHeight = panel.offsetHeight;
      const leftBoundary = Math.max(12, editorRect.left + 12);
      const rightBoundary = Math.min(window.innerWidth - 12, editorRect.right - 12);
      const topBoundary = Math.max(12, editorRect.top + 12);
      const bottomBoundary = Math.min(window.innerHeight - 12, editorRect.bottom - 12);
      const preferredLeft = frameRect.left + frameRect.width / 2 - panelWidth / 2;
      const left = clamp(preferredLeft, leftBoundary, Math.max(leftBoundary, rightBoundary - panelWidth));
      const above = frameRect.top - panelHeight - 12;
      const below = frameRect.bottom + 12;
      const top = above >= topBoundary
        ? above
        : (below + panelHeight <= bottomBoundary ? below : clamp(frameRect.top + 12, topBoundary, Math.max(topBoundary, bottomBoundary - panelHeight)));
      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
      panel.style.visibility = 'visible';
    });
  };

  const selectFigure = (figure = null) => {
    if (state.selectedFigure && state.selectedFigure !== figure) state.selectedFigure.classList.remove('is-selected', 'is-cropping');
    if (!(figure instanceof HTMLElement) || !elements.body.contains(figure)) {
      state.selectedFigure = null;
      elements.imageLayout.hidden = true;
      elements.imageLayout.removeAttribute('style');
      return;
    }
    if (figure.querySelector('[data-image-handle="resize"]')) applyFigureGeometry(figure);
    else enhanceFigure(figure);
    figure.classList.add('is-selected');
    state.selectedFigure = figure;
    elements.imageAlt.value = figure.querySelector('img')?.getAttribute('alt') || '';
    root.querySelectorAll('[data-image-align]').forEach((button) => button.classList.toggle('is-active', button.dataset.imageAlign === figure.dataset.align));
    root.querySelector('[data-image-reset-crop]').disabled = ['Top', 'Right', 'Bottom', 'Left'].every((edge) => Number(figure.dataset[`crop${edge}`]) === 0);
    if (elements.imageLayout.hidden) elements.imageLayout.style.visibility = 'hidden';
    elements.imageLayout.hidden = false;
    positionImageLayout();
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
    font_key: 'editorial',
    featured_asset_id: null,
    featured_image_url: null,
    preview_enabled: false,
    preview_path: null,
    scheduled_at: null,
    word_count: 0
  });

  const applyPost = (post, revisions = []) => {
    state.hydrating = true;
    state.current = post;
    state.revisions = revisions;
    state.changeRevision = 0;
    state.slugTouched = Boolean(post.id);
    elements.id.value = post.id || '';
    elements.version.value = post.version || 0;
    elements.title.value = post.title === 'Untitled article' && !post.id ? '' : (post.title || '');
    elements.excerpt.value = post.excerpt || '';
    elements.body.innerHTML = safePreviewHtml(post.body_html || '');
    enhanceFigures();
    elements.topic.value = post.topic || 'healthy-eating';
    elements.font.value = post.font_key || 'editorial';
    root.querySelector('.blog-writing-page').dataset.articleFont = elements.font.value;
    elements.status.value = post.status || 'draft';
    elements.author.value = post.author || 'ZERO Editorial';
    elements.slug.value = post.slug || '';
    elements.schedule.value = post.scheduled_at || '';
    elements.seoTitle.value = post.seo_title || '';
    elements.seoDescription.value = post.seo_description || '';
    setCover(post.featured_asset_id, post.featured_image_url);
    selectFigure(null);
    renderShareState(post);
    elements.form.hidden = false;
    elements.empty.hidden = true;
    elements.inspector.hidden = false;
    elements.workbench.classList.add('has-active-editor');
    state.dirty = false;
    resetHistory();
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
    body_html: serializedBodyHtml(),
    topic: elements.topic.value,
    status: elements.status.value,
    author: elements.author.value,
    seo_title: elements.seoTitle.value,
    seo_description: elements.seoDescription.value,
    font_key: elements.font.value,
    featured_asset_id: Number(elements.assetId.value) || null,
    scheduled_at: elements.schedule.value || null
  });

  const captureHistorySnapshot = () => ({
    title: elements.title.value,
    excerpt: elements.excerpt.value,
    body_html: serializedBodyHtml(),
    topic: elements.topic.value,
    font: elements.font.value,
    status: elements.status.value,
    author: elements.author.value,
    slug: elements.slug.value,
    slugTouched: state.slugTouched,
    schedule: elements.schedule.value,
    seoTitle: elements.seoTitle.value,
    seoDescription: elements.seoDescription.value,
    assetId: elements.assetId.value,
    coverUrl: elements.coverPreview.hidden ? '' : (elements.coverPreview.getAttribute('src') || '')
  });

  const sameHistorySnapshot = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  const updateHistoryButtons = () => {
    elements.undo.disabled = state.undoStack.length === 0;
    elements.redo.disabled = state.redoStack.length === 0;
    elements.undo.title = state.undoStack.length ? `Undo (Ctrl+Z) · ${state.undoStack.length} available` : 'Undo (Ctrl+Z)';
    elements.redo.title = state.redoStack.length ? `Redo (Ctrl+Shift+Z) · ${state.redoStack.length} available` : 'Redo (Ctrl+Shift+Z)';
  };

  const resetHistory = () => {
    window.clearTimeout(state.historyTimer);
    state.historyTimer = 0;
    state.undoStack = [];
    state.redoStack = [];
    state.historySnapshot = captureHistorySnapshot();
    updateHistoryButtons();
  };

  const commitHistoryCheckpoint = () => {
    window.clearTimeout(state.historyTimer);
    state.historyTimer = 0;
    if (state.restoringHistory || elements.form.hidden) return;
    const current = captureHistorySnapshot();
    if (!state.historySnapshot) {
      state.historySnapshot = current;
      updateHistoryButtons();
      return;
    }
    if (sameHistorySnapshot(current, state.historySnapshot)) return;
    state.undoStack.push(state.historySnapshot);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.splice(0, state.undoStack.length - HISTORY_LIMIT);
    state.historySnapshot = current;
    state.redoStack = [];
    updateHistoryButtons();
  };

  const queueHistoryCheckpoint = () => {
    if (!state.historyTimer) state.historyTimer = window.setTimeout(commitHistoryCheckpoint, 650);
  };

  const restoreHistorySnapshot = (snapshot) => {
    state.restoringHistory = true;
    elements.title.value = snapshot.title;
    elements.excerpt.value = snapshot.excerpt;
    elements.body.innerHTML = safePreviewHtml(snapshot.body_html);
    enhanceFigures();
    elements.topic.value = snapshot.topic;
    elements.font.value = snapshot.font;
    root.querySelector('.blog-writing-page').dataset.articleFont = snapshot.font;
    elements.status.value = snapshot.status;
    elements.author.value = snapshot.author;
    elements.slug.value = snapshot.slug;
    state.slugTouched = snapshot.slugTouched;
    elements.schedule.value = snapshot.schedule;
    elements.seoTitle.value = snapshot.seoTitle;
    elements.seoDescription.value = snapshot.seoDescription;
    setCover(snapshot.assetId, snapshot.coverUrl);
    selectFigure(null);
    state.restoringHistory = false;
    markDirty({ recordHistory: false });
    updateHistoryButtons();
  };

  const undo = () => {
    commitHistoryCheckpoint();
    if (!state.undoStack.length) return;
    const current = state.historySnapshot || captureHistorySnapshot();
    const previous = state.undoStack.pop();
    state.redoStack.push(current);
    if (state.redoStack.length > HISTORY_LIMIT) state.redoStack.shift();
    state.historySnapshot = previous;
    restoreHistorySnapshot(previous);
  };

  const redo = () => {
    commitHistoryCheckpoint();
    if (!state.redoStack.length) return;
    const current = state.historySnapshot || captureHistorySnapshot();
    const next = state.redoStack.pop();
    state.undoStack.push(current);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.historySnapshot = next;
    restoreHistorySnapshot(next);
  };

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
    const saveRevision = state.changeRevision;
    let saveSucceeded = false;
    state.saving = true;
    setSaveState('Saving…', 'saving');
    root.querySelectorAll('[data-save-draft], [data-schedule-post]').forEach((button) => { button.disabled = true; });
    try {
      const response = await api('save', { method: 'POST', body: payload });
      state.current = response.post;
      state.revisions = response.revisions || [];
      elements.id.value = response.post.id;
      elements.version.value = response.post.version;
      state.slugTouched = true;
      saveSucceeded = true;
      const hasNewerChanges = state.changeRevision !== saveRevision;
      if (!hasNewerChanges) {
        elements.slug.value = response.post.slug;
        elements.status.value = response.post.status;
        state.dirty = false;
      }
      upsertSummary(response.post);
      renderShareState(response.post);
      renderHistory();
      updateDerived();
      setSaveState(hasNewerChanges ? 'Saving latest changes…' : 'All changes saved', hasNewerChanges ? 'saving' : 'ready');
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
      if (saveSucceeded && state.dirty && state.changeRevision !== saveRevision) {
        window.clearTimeout(state.saveTimer);
        state.saveTimer = window.setTimeout(() => savePost(), 250);
      }
    }
  };

  const canAutosave = () => {
    if (!state.dirty || state.saving) return false;
    if (elements.status.value === 'in_review') return wordCount(plainText(elements.body.innerHTML)) >= 30 && elements.title.value.trim();
    if (elements.status.value === 'scheduled') return getChecklist().schedule && getChecklist().title && getChecklist().excerpt && getChecklist().body;
    return true;
  };

  const markDirty = ({ recordHistory = true } = {}) => {
    if (state.hydrating) return;
    if (recordHistory) queueHistoryCheckpoint();
    state.changeRevision += 1;
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
    elements.coverDrop.classList.remove('is-dragover');
    setSaveState('Uploading cover…', 'saving');
    try {
      const asset = await uploadAsset(file, elements.title.value.trim() || 'ZERO article cover');
      setCover(asset.id, asset.url);
      markDirty();
      showToast(`Cover uploaded · ${asset.width} × ${asset.height}px.`);
    } catch (error) {
      setSaveState('Upload failed', 'error');
      showToast(error.message, 'error');
    } finally {
      elements.coverInput.value = '';
    }
  };

  const uploadAsset = async (file, altText) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('alt_text', altText);
    const response = await api('upload', { method: 'POST', body: formData });
    return response.asset;
  };

  const insertInlineImage = (asset, requestedRange = null) => {
    const range = rangeBelongsToEditor(requestedRange)
      ? requestedRange
      : (rangeBelongsToEditor(state.editorRange) ? state.editorRange : document.createRange());
    if (!rangeBelongsToEditor(range)) {
      range.selectNodeContents(elements.body);
      range.collapse(false);
    }

    const figure = document.createElement('figure');
    const image = document.createElement('img');
    const caption = document.createElement('figcaption');
    image.setAttribute('src', asset.url);
    image.setAttribute('alt', elements.title.value.trim() || 'ZERO article image');
    image.setAttribute('loading', 'lazy');
    image.setAttribute('decoding', 'async');
    figure.dataset.width = '100';
    figure.dataset.align = 'center';
    figure.dataset.cropTop = '0';
    figure.dataset.cropRight = '0';
    figure.dataset.cropBottom = '0';
    figure.dataset.cropLeft = '0';
    if (asset.width && asset.height) figure.dataset.aspect = String(asset.width / asset.height);
    figure.append(image, caption);
    const continuation = document.createElement('p');
    continuation.append(document.createElement('br'));

    range.deleteContents();
    let anchor = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    while (anchor && anchor !== elements.body && anchor.parentElement !== elements.body) anchor = anchor.parentElement;
    if (anchor && anchor !== elements.body) {
      anchor.after(figure, continuation);
    } else {
      const reference = elements.body.childNodes[range.startOffset] || null;
      elements.body.insertBefore(figure, reference);
      figure.after(continuation);
    }
    const selection = window.getSelection();
    const typingRange = document.createRange();
    typingRange.setStart(continuation, 0);
    typingRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(typingRange);
    state.editorRange = typingRange.cloneRange();
    elements.body.focus();
    selectFigure(figure);
    markDirty();
    const nextInsertionRange = document.createRange();
    nextInsertionRange.setStartAfter(continuation);
    nextInsertionRange.collapse(true);
    return nextInsertionRange;
  };

  const uploadInlineImages = async (files, requestedRange = null) => {
    const images = [...(files || [])].filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      showToast('Drop a JPEG, PNG, WebP, or GIF image into the article.', 'error');
      return;
    }
    let insertionRange = requestedRange?.cloneRange?.() || state.editorRange?.cloneRange?.() || null;
    setSaveState(images.length > 1 ? `Uploading ${images.length} images…` : 'Uploading image…', 'saving');
    try {
      for (const file of images) {
        const asset = await uploadAsset(file, elements.title.value.trim() || 'ZERO article image');
        insertionRange = insertInlineImage(asset, insertionRange);
      }
      showToast(`${images.length} inline image${images.length === 1 ? '' : 's'} added.`);
    } catch (error) {
      setSaveState('Upload failed', 'error');
      showToast(error.message, 'error');
    } finally {
      elements.inlineImageInput.value = '';
      elements.body.classList.remove('is-image-dragover');
    }
  };

  const openPreview = () => {
    const topic = topics[elements.topic.value] || topics['healthy-eating'];
    root.querySelector('[data-preview-topic]').textContent = topic.label;
    root.querySelector('[data-preview-title]').textContent = elements.title.value.trim() || 'Untitled article';
    root.querySelector('[data-preview-excerpt]').textContent = elements.excerpt.value.trim();
    root.querySelector('[data-preview-author]').textContent = elements.author.value.trim() || 'ZERO Editorial';
    root.querySelector('[data-preview-reading]').textContent = `${Math.max(1, Math.ceil(wordCount(plainText(elements.body.innerHTML)) / 220))} min read`;
    root.querySelector('[data-preview-body]').innerHTML = serializedBodyHtml() || '<p>Start writing to see the article preview.</p>';
    root.querySelector('.blog-preview-article').dataset.articleFont = elements.font.value;
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

  const waitForSaveIdle = async () => {
    const started = Date.now();
    while (state.saving && Date.now() - started < 20000) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    return !state.saving;
  };

  const ensureLatestSaved = async () => {
    if (!(await waitForSaveIdle())) {
      showToast('The current save is taking too long. Try sharing again in a moment.', 'error');
      return null;
    }
    if (state.dirty || !Number(elements.id.value)) return savePost();
    return state.current;
  };

  const setShareBusy = (busy, label = '') => {
    root.querySelectorAll('[data-share-enable], [data-share-regenerate], [data-share-disable], [data-share-copy]').forEach((button) => { button.disabled = busy; });
    if (label) elements.shareEnable.textContent = label;
    else elements.shareEnable.textContent = 'Create preview link';
  };

  const enableSharedPreview = async (rotate = false) => {
    if (rotate && !window.confirm('Replace the preview link? The current link will stop working immediately.')) return;
    setShareBusy(true, rotate ? '' : 'Creating link…');
    try {
      const saved = await ensureLatestSaved();
      if (!saved) return;
      const response = await api('share_preview', { method: 'POST', body: { id: Number(elements.id.value), rotate } });
      state.current = response.post;
      upsertSummary(response.post);
      renderShareState(response.post);
      showToast(rotate ? 'Preview link replaced.' : 'Private preview link created.');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setShareBusy(false);
    }
  };

  const disableSharedPreview = async () => {
    if (!window.confirm('Turn off sharing? Anyone using the current preview link will immediately lose access.')) return;
    setShareBusy(true);
    try {
      const response = await api('disable_preview', { method: 'POST', body: { id: Number(elements.id.value) } });
      state.current = response.post;
      upsertSummary(response.post);
      renderShareState(response.post);
      showToast('Private preview sharing turned off.');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setShareBusy(false);
    }
  };

  const copySharedPreview = async () => {
    const url = elements.shareUrl.value;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch (_error) {
      elements.shareUrl.focus();
      elements.shareUrl.select();
      document.execCommand('copy');
    }
    showToast('Preview link copied.');
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

  const beginImageInteraction = (event, control, requestedKind = '') => {
    const figure = control.closest('figure');
    if (!figure) return;
    event.preventDefault();
    event.stopPropagation();
    selectFigure(figure);
    const kind = requestedKind || control.dataset.imageHandle;
    if (kind === 'crop' && !figure.classList.contains('is-cropping')) return;
    const frame = figure.querySelector('[data-image-frame]');
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();
    const editorRect = elements.body.getBoundingClientRect();
    const crop = {
      top: Number(figure.dataset.cropTop) || 0,
      right: Number(figure.dataset.cropRight) || 0,
      bottom: Number(figure.dataset.cropBottom) || 0,
      left: Number(figure.dataset.cropLeft) || 0
    };
    state.imageInteraction = {
      control,
      figure,
      kind,
      edge: control.dataset.edge || '',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: Number(figure.dataset.width) || 100,
      startAlign: figure.dataset.align || 'center',
      editorLeft: editorRect.left,
      editorWidth: editorRect.width || 1,
      frameWidth: frameRect.width || 1,
      frameHeight: frameRect.height || 1,
      crop,
      changed: false
    };
    control.setPointerCapture?.(event.pointerId);
    document.body.classList.add('is-adjusting-blog-image');
  };

  const moveImageInteraction = (event) => {
    const interaction = state.imageInteraction;
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    event.preventDefault();
    const { figure, edge, crop } = interaction;
    if (interaction.kind === 'resize') {
      const direction = edge.includes('e') ? 1 : -1;
      const width = interaction.startWidth + direction * (event.clientX - interaction.startX) / interaction.editorWidth * 100;
      const nextWidth = String(clamp(Math.round(width), 25, 100));
      interaction.changed ||= figure.dataset.width !== nextWidth;
      figure.dataset.width = nextWidth;
    } else if (interaction.kind === 'place') {
      if (Math.hypot(event.clientX - interaction.startX, event.clientY - interaction.startY) < 6) return;
      const horizontalPosition = clamp((event.clientX - interaction.editorLeft) / interaction.editorWidth, 0, 1);
      const nextAlign = horizontalPosition < .36 ? 'left' : (horizontalPosition > .64 ? 'right' : 'center');
      interaction.changed ||= figure.dataset.align !== nextAlign;
      figure.dataset.align = nextAlign;
      if (nextAlign !== 'center' && Number(figure.dataset.width) > 70) {
        figure.dataset.width = '50';
        interaction.changed = true;
      }
      figure.classList.add('is-being-placed');
      root.querySelectorAll('[data-image-align]').forEach((button) => button.classList.toggle('is-active', button.dataset.imageAlign === nextAlign));
    } else if (interaction.kind === 'pan') {
      const totalX = crop.left + crop.right;
      const totalY = crop.top + crop.bottom;
      const visibleX = (100 - totalX) / 100;
      const visibleY = (100 - totalY) / 100;
      const deltaX = (event.clientX - interaction.startX) / interaction.frameWidth * visibleX * 100;
      const deltaY = (event.clientY - interaction.startY) / interaction.frameHeight * visibleY * 100;
      const left = clamp(crop.left - deltaX, Math.max(0, totalX - 45), Math.min(45, totalX));
      const top = clamp(crop.top - deltaY, Math.max(0, totalY - 45), Math.min(45, totalY));
      const nextCrop = {
        left: Math.round(left * 10) / 10,
        right: Math.round((totalX - left) * 10) / 10,
        top: Math.round(top * 10) / 10,
        bottom: Math.round((totalY - top) * 10) / 10
      };
      interaction.changed ||= ['left', 'right', 'top', 'bottom'].some((side) => Number(figure.dataset[`crop${side[0].toUpperCase()}${side.slice(1)}`]) !== nextCrop[side]);
      Object.entries(nextCrop).forEach(([side, value]) => { figure.dataset[`crop${side[0].toUpperCase()}${side.slice(1)}`] = String(value); });
    } else {
      const visibleX = (100 - crop.left - crop.right) / 100;
      const visibleY = (100 - crop.top - crop.bottom) / 100;
      let value;
      if (edge === 'left' || edge === 'right') {
        const delta = (event.clientX - interaction.startX) / interaction.frameWidth * visibleX * 100;
        value = crop[edge] + (edge === 'left' ? delta : -delta);
        value = clamp(value, 0, Math.min(45, 75 - crop[edge === 'left' ? 'right' : 'left']));
      } else {
        const delta = (event.clientY - interaction.startY) / interaction.frameHeight * visibleY * 100;
        value = crop[edge] + (edge === 'top' ? delta : -delta);
        value = clamp(value, 0, Math.min(45, 75 - crop[edge === 'top' ? 'bottom' : 'top']));
      }
      const cropKey = `crop${edge[0].toUpperCase()}${edge.slice(1)}`;
      const nextValue = String(Math.round(value * 10) / 10);
      interaction.changed ||= figure.dataset[cropKey] !== nextValue;
      figure.dataset[cropKey] = nextValue;
    }
    applyFigureGeometry(figure);
    positionImageLayout();
    if (interaction.kind === 'crop' || interaction.kind === 'pan') root.querySelector('[data-image-reset-crop]').disabled = false;
  };

  const endImageInteraction = (event) => {
    const interaction = state.imageInteraction;
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    interaction.control.releasePointerCapture?.(event.pointerId);
    interaction.figure.classList.remove('is-being-placed');
    state.imageInteraction = null;
    document.body.classList.remove('is-adjusting-blog-image');
    if (interaction.changed) markDirty();
  };

  const bind = () => {
    elements.deliveryControl?.querySelectorAll('[data-delivery-mode]').forEach((button) => {
      button.addEventListener('click', () => setDelivery(button.dataset.deliveryMode));
    });
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
    [elements.title, elements.excerpt, elements.topic, elements.font, elements.status, elements.author, elements.slug, elements.schedule, elements.seoTitle, elements.seoDescription].forEach((control) => control.addEventListener('input', () => {
      if (control === elements.slug) state.slugTouched = true;
      if (control === elements.title && !state.slugTouched) elements.slug.value = slugify(elements.title.value);
      if (control === elements.font) root.querySelector('.blog-writing-page').dataset.articleFont = elements.font.value;
      markDirty();
    }));
    elements.body.addEventListener('input', markDirty);
    elements.body.addEventListener('click', (event) => selectFigure(event.target.closest('figure')));
    elements.body.addEventListener('dblclick', (event) => {
      const figure = event.target.closest('figure');
      if (!figure || !event.target.closest('[data-image-frame]')) return;
      event.preventDefault();
      selectFigure(figure);
      figure.classList.toggle('is-cropping');
    });
    elements.body.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('[data-image-handle]');
      if (handle) {
        beginImageInteraction(event, handle);
        return;
      }
      const frame = event.target.closest('[data-image-frame]');
      if (frame) beginImageInteraction(event, frame, frame.closest('figure')?.classList.contains('is-cropping') ? 'pan' : 'place');
    });
    document.addEventListener('pointermove', moveImageInteraction, { passive: false });
    document.addEventListener('pointerup', endImageInteraction);
    document.addEventListener('pointercancel', endImageInteraction);
    document.addEventListener('scroll', positionImageLayout, true);
    window.addEventListener('resize', positionImageLayout);
    ['keyup', 'mouseup', 'focus'].forEach((type) => elements.body.addEventListener(type, rememberEditorRange));
    elements.body.addEventListener('paste', (event) => {
      const images = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith('image/'));
      if (images.length) {
        event.preventDefault();
        uploadInlineImages(images, state.editorRange);
        return;
      }
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      const lines = text.split(/\r?\n/);
      const html = lines.map((line) => line ? escapeHtml(line) : '<br>').join('<br>');
      document.execCommand('insertHTML', false, html);
    });
    elements.body.addEventListener('dragover', (event) => {
      if ([...(event.dataTransfer?.items || [])].some((item) => item.kind === 'file')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        elements.body.classList.add('is-image-dragover');
      }
    });
    elements.body.addEventListener('dragleave', (event) => {
      if (!elements.body.contains(event.relatedTarget)) elements.body.classList.remove('is-image-dragover');
    });
    elements.body.addEventListener('drop', (event) => {
      const files = [...(event.dataTransfer?.files || [])];
      if (!files.length) return;
      event.preventDefault();
      const range = rangeAtPoint(event.clientX, event.clientY);
      uploadInlineImages(files, range);
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
    root.querySelector('[data-inline-image]').addEventListener('pointerdown', rememberEditorRange);
    root.querySelector('[data-inline-image]').addEventListener('click', () => elements.inlineImageInput.click());
    elements.inlineImageInput.addEventListener('change', () => uploadInlineImages(elements.inlineImageInput.files, state.editorRange));
    root.querySelectorAll('[data-image-align]').forEach((button) => button.addEventListener('click', () => {
      if (!state.selectedFigure) return;
      state.selectedFigure.dataset.align = button.dataset.imageAlign;
      applyFigureGeometry(state.selectedFigure);
      selectFigure(state.selectedFigure);
      markDirty();
    }));
    root.querySelector('[data-image-reset-crop]').addEventListener('click', () => {
      if (!state.selectedFigure) return;
      ['Top', 'Right', 'Bottom', 'Left'].forEach((edge) => { state.selectedFigure.dataset[`crop${edge}`] = '0'; });
      state.selectedFigure.classList.remove('is-cropping');
      applyFigureGeometry(state.selectedFigure);
      selectFigure(state.selectedFigure);
      markDirty();
    });
    elements.imageAlt.addEventListener('input', () => {
      const image = state.selectedFigure?.querySelector('img');
      if (!image) return;
      image.setAttribute('alt', elements.imageAlt.value);
      markDirty();
    });
    root.querySelector('[data-image-layout-close]').addEventListener('click', () => selectFigure(null));
    root.querySelector('[data-image-remove]').addEventListener('click', () => {
      if (!state.selectedFigure || !window.confirm('Remove this image from the article?')) return;
      const figure = state.selectedFigure;
      selectFigure(null);
      figure.remove();
      markDirty();
      showToast('Image removed from the article.');
    });

    elements.undo.addEventListener('click', undo);
    elements.redo.addEventListener('click', redo);
    elements.form.addEventListener('focusout', () => window.setTimeout(commitHistoryCheckpoint, 0));

    root.querySelector('[data-save-draft]').addEventListener('click', () => savePost({ forcedStatus: 'draft', announce: true }));
    root.querySelector('[data-schedule-post]').addEventListener('click', schedulePost);
    root.querySelector('[data-preview-post]').addEventListener('click', openPreview);
    root.querySelector('[data-preview-close]').addEventListener('click', () => elements.previewDialog.close());
    elements.previewDialog.addEventListener('click', (event) => { if (event.target === elements.previewDialog) elements.previewDialog.close(); });
    elements.shareButton.addEventListener('click', () => { renderShareState(); elements.shareDialog.showModal(); });
    root.querySelector('[data-share-close]').addEventListener('click', () => elements.shareDialog.close());
    elements.shareDialog.addEventListener('click', (event) => { if (event.target === elements.shareDialog) elements.shareDialog.close(); });
    elements.shareEnable.addEventListener('click', () => enableSharedPreview(false));
    root.querySelector('[data-share-regenerate]').addEventListener('click', () => enableSharedPreview(true));
    root.querySelector('[data-share-disable]').addEventListener('click', disableSharedPreview);
    root.querySelector('[data-share-copy]').addEventListener('click', copySharedPreview);

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
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const isEditingArticle = !elements.form.hidden && elements.form.contains(event.target);
      if (key === 'z' && !event.shiftKey && isEditingArticle) {
        event.preventDefault();
        undo();
      } else if (((key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey)) && isEditingArticle) {
        event.preventDefault();
        redo();
      } else if (key === 's') {
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
      renderDelivery(response.delivery || { mode: 'off', label: 'Off' });
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
