<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';
require_once dirname(__DIR__) . '/blog-builder-bootstrap.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}
if (empty($_SESSION['jg_blog_csrf'])) {
    $_SESSION['jg_blog_csrf'] = bin2hex(random_bytes(24));
}
$csrfToken = (string) $_SESSION['jg_blog_csrf'];
jg_admin_release_session();

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageCssVersion = (string) @filemtime(__DIR__ . '/blog-builder.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/blog-builder.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <title>ZERO Blog Studio | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('website'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="./blog-builder.css?v=<?php echo urlencode($pageCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-blog-builder-page">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.98.0</div>
    <div class="admin-app admin-app-suite" data-blog-builder data-endpoint="../api/blogs/" data-csrf-token="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
        <div class="admin-shell">
            <?php render_admin_sidebar('blog-builder'); ?>
            <div class="admin-shell-main blog-builder-page">
                <header class="admin-topbar blog-builder-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand">
                            <span class="admin-panel-kicker">ZERO content</span>
                            <h1>Blog Studio</h1>
                        </div>
                    </div>
                    <div class="blog-topbar-state" aria-live="polite">
                        <span class="blog-save-dot" data-save-dot></span>
                        <strong data-save-state>Ready</strong>
                    </div>
                    <?php render_admin_topbar_actions('blog-builder'); ?>
                </header>

                <main class="blog-studio" aria-label="ZERO blog writing workspace">
                    <section class="blog-studio-intro">
                        <div>
                            <span class="blog-eyebrow">Editorial workspace</span>
                            <h2>Write useful stories. Schedule them with confidence.</h2>
                            <p>Create and review ZERO articles here. Scheduled articles stay in the dashboard queue until public-site publishing is connected.</p>
                        </div>
                        <div class="blog-connection-state" title="This release does not change the public ZERO website">
                            <span class="blog-connection-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/><path d="M8 2v3M2 8h3M16 19v3M19 16h3"/></svg>
                            </span>
                            <span><small>Public delivery</small><strong>Connection pending</strong></span>
                        </div>
                    </section>

                    <section class="blog-metric-strip" aria-label="Editorial overview">
                        <button type="button" class="blog-metric is-active" data-library-status="">
                            <span>All articles</span><strong data-stat="total">0</strong>
                        </button>
                        <button type="button" class="blog-metric" data-library-status="draft">
                            <span>Drafts</span><strong data-stat="draft">0</strong>
                        </button>
                        <button type="button" class="blog-metric" data-library-status="in_review">
                            <span>In review</span><strong data-stat="in_review">0</strong>
                        </button>
                        <button type="button" class="blog-metric" data-library-status="scheduled">
                            <span>Scheduled</span><strong data-stat="scheduled">0</strong>
                        </button>
                        <button type="button" class="blog-metric blog-metric-ready" data-library-status="ready">
                            <span>Ready in queue</span><strong data-stat="ready">0</strong>
                        </button>
                    </section>

                    <div class="blog-workbench">
                        <aside class="blog-library" aria-label="Article library">
                            <div class="blog-library-head">
                                <div><span class="blog-eyebrow">Library</span><h2>Articles</h2></div>
                                <button type="button" class="blog-new-button" data-new-post>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                                    <span>New</span>
                                </button>
                            </div>
                            <label class="blog-search-field">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
                                <input type="search" data-library-search placeholder="Search title, author or topic">
                            </label>
                            <div class="blog-library-filters">
                                <select data-library-topic aria-label="Filter articles by topic">
                                    <option value="">All topics</option>
<?php foreach (jg_blog_topics() as $topicKey => $topic): ?>
                                    <option value="<?php echo htmlspecialchars($topicKey, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($topic['label'], ENT_QUOTES, 'UTF-8'); ?></option>
<?php endforeach; ?>
                                </select>
                                <select data-library-sort aria-label="Sort articles">
                                    <option value="updated">Recently edited</option>
                                    <option value="scheduled">Schedule date</option>
                                    <option value="title">Title A–Z</option>
                                </select>
                            </div>
                            <div class="blog-library-list" data-library-list aria-live="polite">
                                <div class="blog-library-loading"><span></span><span></span><span></span></div>
                            </div>
                        </aside>

                        <section class="blog-editor-shell" data-editor-shell>
                            <div class="blog-editor-empty" data-editor-empty>
                                <span class="blog-empty-mark" aria-hidden="true">0</span>
                                <h2>Start a ZERO story</h2>
                                <p>Choose an article from the library, or create a new draft and shape it here.</p>
                                <button type="button" class="blog-primary-button" data-new-post>Create an article</button>
                            </div>

                            <form class="blog-editor" data-editor-form hidden>
                                <input type="hidden" name="id" value="">
                                <input type="hidden" name="version" value="0">
                                <input type="hidden" name="featured_asset_id" value="">
                                <div class="blog-editor-toolbar-top">
                                    <div class="blog-article-state">
                                        <span class="blog-status-badge" data-current-status>Draft</span>
                                        <span data-article-meta>New article</span>
                                    </div>
                                    <div class="blog-editor-actions">
                                        <button type="button" class="blog-icon-button" data-preview-post title="Preview article" aria-label="Preview article">
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                                        </button>
                                        <button type="button" class="blog-icon-button blog-share-button" data-share-preview title="Share private preview" aria-label="Share private preview">
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>
                                        </button>
                                        <button type="button" class="blog-secondary-button" data-save-draft>Save draft</button>
                                        <button type="button" class="blog-primary-button" data-schedule-post>Schedule</button>
                                        <button type="button" class="blog-more-button" data-more-toggle aria-expanded="false" aria-label="More article actions">
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                                        </button>
                                        <div class="blog-more-menu" data-more-menu hidden>
                                            <button type="button" data-duplicate-post>Duplicate article</button>
                                            <button type="button" data-history-toggle>Version history</button>
                                            <button type="button" class="is-danger" data-archive-post>Archive article</button>
                                        </div>
                                    </div>
                                </div>

                                <div class="blog-editor-scroll">
                                    <div class="blog-writing-page">
                                        <label class="blog-topic-field">
                                            <span>Article topic</span>
                                            <select name="topic">
<?php foreach (jg_blog_topics() as $topicKey => $topic): ?>
                                                <option value="<?php echo htmlspecialchars($topicKey, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($topic['label'], ENT_QUOTES, 'UTF-8'); ?></option>
<?php endforeach; ?>
                                            </select>
                                        </label>
                                        <textarea class="blog-title-input" name="title" rows="1" maxlength="240" placeholder="Write a clear, helpful title…" aria-label="Article title"></textarea>
                                        <div class="blog-slug-preview"><span>zerofoods.id/blog/</span><strong data-slug-preview>untitled-article</strong></div>
                                        <label class="blog-excerpt-field">
                                            <span>Summary</span>
                                            <textarea name="excerpt" rows="3" maxlength="400" placeholder="Tell readers what they will learn in one or two concise sentences."></textarea>
                                            <small><span data-excerpt-count>0</span>/400</small>
                                        </label>

                                        <div class="blog-format-toolbar" role="toolbar" aria-label="Article formatting">
                                            <label class="blog-font-control"><span>Font</span><select name="font_key" data-article-font-select aria-label="Article font">
<?php foreach (jg_blog_fonts() as $fontKey => $fontLabel): ?>
                                                <option value="<?php echo htmlspecialchars($fontKey, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($fontLabel, ENT_QUOTES, 'UTF-8'); ?></option>
<?php endforeach; ?>
                                            </select></label>
                                            <span></span>
                                            <button type="button" data-undo title="Undo (Ctrl+Z)" aria-label="Undo" disabled>
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5"/><path d="M20 17a7 7 0 0 0-7-7H4"/></svg>
                                            </button>
                                            <button type="button" data-redo title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled>
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 7 5 5-5 5"/><path d="M4 17a7 7 0 0 1 7-7h9"/></svg>
                                            </button>
                                            <span></span>
                                            <button type="button" data-format="formatBlock" data-value="p" title="Paragraph">P</button>
                                            <button type="button" data-format="formatBlock" data-value="h2" title="Heading 2">H2</button>
                                            <button type="button" data-format="formatBlock" data-value="h3" title="Heading 3">H3</button>
                                            <span></span>
                                            <button type="button" data-format="bold" title="Bold"><strong>B</strong></button>
                                            <button type="button" data-format="italic" title="Italic"><em>I</em></button>
                                            <button type="button" data-format="insertUnorderedList" title="Bulleted list">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                                            </button>
                                            <button type="button" data-format="insertOrderedList" title="Numbered list">1.</button>
                                            <button type="button" data-format="formatBlock" data-value="blockquote" title="Quote">“</button>
                                            <button type="button" data-add-link title="Add link">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg>
                                            </button>
                                            <button type="button" data-inline-image title="Insert image" aria-label="Insert image">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>
                                            </button>
                                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple data-inline-image-input hidden>
                                            <button type="button" data-format="removeFormat" title="Clear formatting">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 10 10M5 5h14M12 5l-4 14M17 17h4"/></svg>
                                            </button>
                                        </div>
                                        <section class="blog-image-layout" data-image-layout hidden contenteditable="false" aria-label="Selected image layout">
                                            <div class="blog-image-layout-head">
                                                <span><strong>Image layout</strong><small>Drag a corner to resize. Double-click, then drag the image to reposition or a side to crop.</small></span>
                                                <button type="button" data-image-layout-close aria-label="Close image controls">×</button>
                                            </div>
                                            <div class="blog-image-layout-controls">
                                                <div class="blog-image-flow" role="group" aria-label="Text flow around image">
                                                    <span>Text flow</span>
                                                    <button type="button" data-image-align="center">No wrap</button>
                                                    <button type="button" data-image-align="left">Text on right</button>
                                                    <button type="button" data-image-align="right">Text on left</button>
                                                </div>
                                                <button type="button" class="blog-image-reset-crop" data-image-reset-crop>Reset crop</button>
                                            </div>
                                            <label class="blog-image-alt"><span>Alt text</span><input type="text" maxlength="240" placeholder="Describe this image for accessibility" data-image-alt></label>
                                            <button type="button" class="blog-image-remove" data-image-remove>Remove image</button>
                                        </section>
                                        <div class="blog-body-editor" data-body-editor contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Begin with the idea your reader needs most. Drag images anywhere into the article, then use short paragraphs, useful headings, and practical steps…"></div>
                                        <footer class="blog-writing-footer">
                                            <span><strong data-word-count>0</strong> words</span>
                                            <span><strong data-read-time>1</strong> min read</span>
                                            <span>Autosave after changes</span>
                                        </footer>
                                    </div>
                                </div>
                            </form>
                        </section>

                        <aside class="blog-inspector" data-inspector hidden aria-label="Article settings">
                            <div class="blog-inspector-tabs" role="tablist">
                                <button type="button" class="is-active" data-inspector-tab="settings" role="tab" aria-selected="true">Settings</button>
                                <button type="button" data-inspector-tab="seo" role="tab" aria-selected="false">SEO</button>
                                <button type="button" data-inspector-tab="checklist" role="tab" aria-selected="false">Checks</button>
                            </div>

                            <div class="blog-inspector-panel is-active" data-inspector-panel="settings">
                                <label class="blog-field"><span>Status</span><select name="status" data-status-select><option value="draft">Draft</option><option value="in_review">In review</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label>
                                <label class="blog-field"><span>Author</span><input name="author" maxlength="120" value="ZERO Editorial" placeholder="Author name" data-author-input></label>
                                <label class="blog-field"><span>URL slug</span><div class="blog-prefix-input"><span>/blog/</span><input name="slug" maxlength="220" placeholder="article-url" data-slug-input></div></label>
                                <div class="blog-field">
                                    <span>Cover image</span>
                                    <label class="blog-cover-drop" data-cover-drop>
                                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-cover-input>
                                        <span class="blog-cover-empty" data-cover-empty>
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5M12 3v12M7 8l5-5 5 5"/></svg>
                                            <strong>Upload cover</strong><small>JPEG, PNG, WebP or GIF · max 5 MB</small>
                                        </span>
                                        <img data-cover-preview alt="" hidden>
                                        <span class="blog-cover-change" data-cover-change hidden>Change image</span>
                                    </label>
                                </div>
                                <div class="blog-field blog-schedule-card" data-schedule-card>
                                    <span>Schedule (WIB)</span>
                                    <input type="datetime-local" name="scheduled_at" data-schedule-input>
                                    <small>Jakarta time · the article will wait in the ready queue after this time.</small>
                                    <div class="blog-schedule-shortcuts">
                                        <button type="button" data-schedule-shortcut="tomorrow">Tomorrow 09:00</button>
                                        <button type="button" data-schedule-shortcut="monday">Next Monday</button>
                                    </div>
                                </div>
                                <div class="blog-distribution-note">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
                                    <p><strong>Builder only</strong><span>Scheduling is saved here, but this release will not upload anything to zerofoods.id.</span></p>
                                </div>
                            </div>

                            <div class="blog-inspector-panel" data-inspector-panel="seo" hidden>
                                <label class="blog-field"><span>SEO title</span><input name="seo_title" maxlength="240" placeholder="Defaults to article title" data-seo-title><small><b data-seo-title-count>0</b>/60 recommended</small></label>
                                <label class="blog-field"><span>Meta description</span><textarea name="seo_description" rows="5" maxlength="320" placeholder="A compelling summary for search results" data-seo-description></textarea><small><b data-seo-description-count>0</b>/160 recommended</small></label>
                                <article class="blog-serp-preview">
                                    <small>zerofoods.id › blog › <span data-serp-slug>untitled-article</span></small>
                                    <h3 data-serp-title>Untitled article</h3>
                                    <p data-serp-description>Add an SEO description or article summary to preview how the page may appear in search.</p>
                                </article>
                            </div>

                            <div class="blog-inspector-panel" data-inspector-panel="checklist" hidden>
                                <div class="blog-readiness-score"><span>Schedule readiness</span><strong data-readiness-score>0%</strong><div><i data-readiness-bar></i></div></div>
                                <ul class="blog-checklist" data-checklist>
                                    <li data-check="title"><span>✓</span><p><strong>Clear title</strong><small>At least 8 characters</small></p></li>
                                    <li data-check="excerpt"><span>✓</span><p><strong>Useful summary</strong><small>At least 40 characters</small></p></li>
                                    <li data-check="body"><span>✓</span><p><strong>Substantial article</strong><small>At least 100 words</small></p></li>
                                    <li data-check="author"><span>✓</span><p><strong>Author credited</strong><small>Name is present</small></p></li>
                                    <li data-check="schedule"><span>✓</span><p><strong>Future schedule</strong><small>WIB date and time selected</small></p></li>
                                    <li data-check="image"><span>✓</span><p><strong>Cover image</strong><small>Recommended, not required</small></p></li>
                                    <li data-check="seo"><span>✓</span><p><strong>Search description</strong><small>Recommended, not required</small></p></li>
                                </ul>
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
        </div>

        <dialog class="blog-preview-dialog" data-preview-dialog>
            <div class="blog-preview-frame">
                <header>
                    <div><span>ZERO website preview</span><strong>Desktop article</strong></div>
                    <button type="button" data-preview-close aria-label="Close preview">×</button>
                </header>
                <article class="blog-preview-article">
                    <span class="blog-preview-topic" data-preview-topic>Healthy Eating</span>
                    <h1 data-preview-title>Untitled article</h1>
                    <p class="blog-preview-excerpt" data-preview-excerpt></p>
                    <div class="blog-preview-byline"><span data-preview-author>ZERO Editorial</span><span data-preview-reading>1 min read</span></div>
                    <img data-preview-image alt="" hidden>
                    <div class="blog-preview-body" data-preview-body></div>
                </article>
            </div>
        </dialog>

        <dialog class="blog-share-dialog" data-share-dialog>
            <div class="blog-share-card">
                <header>
                    <span class="blog-share-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg></span>
                    <div><span class="blog-eyebrow">Private preview</span><h2>Share this draft</h2></div>
                    <button type="button" data-share-close aria-label="Close share preview">×</button>
                </header>
                <p class="blog-share-intro">Anyone with this unlisted link can read the latest saved version without signing into the dashboard. It will not appear on the public ZERO website.</p>
                <div class="blog-share-link" data-share-link-wrap hidden>
                    <label for="blog-share-url">Preview URL</label>
                    <div><input id="blog-share-url" type="url" readonly data-share-url><button type="button" data-share-copy>Copy link</button></div>
                    <span><i></i> Link active · saved draft changes appear automatically</span>
                </div>
                <div class="blog-share-empty" data-share-empty>
                    <strong>No preview link yet</strong>
                    <span>Create an unlisted link when you are ready to share this draft.</span>
                </div>
                <div class="blog-share-primary-actions">
                    <button type="button" class="blog-primary-button" data-share-enable>Create preview link</button>
                    <a class="blog-secondary-button" data-share-open target="_blank" rel="noopener" hidden>Open preview</a>
                </div>
                <footer data-share-management hidden>
                    <button type="button" data-share-regenerate>Replace link</button>
                    <button type="button" class="is-danger" data-share-disable>Turn off sharing</button>
                </footer>
            </div>
        </dialog>

        <dialog class="blog-history-dialog" data-history-dialog>
            <div class="blog-history-card">
                <header><div><span class="blog-eyebrow">Version history</span><h2>Earlier saved versions</h2></div><button type="button" data-history-close aria-label="Close history">×</button></header>
                <p>Restoring a version keeps your current content in history, so you can always move forward again.</p>
                <div class="blog-history-list" data-history-list><p class="blog-muted">No earlier versions yet.</p></div>
            </div>
        </dialog>

        <div class="blog-toast" data-toast role="status" aria-live="polite" hidden></div>
        <?php render_admin_notification_drawer(); ?>
    </div>
    <?php render_admin_chrome_script('../'); ?>
    <script type="module" src="./blog-builder.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
