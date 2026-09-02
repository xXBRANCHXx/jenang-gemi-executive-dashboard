const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const php = fs.readFileSync(path.join(root, 'blog-builder/index.php'), 'utf8');
const js = fs.readFileSync(path.join(root, 'blog-builder/blog-builder.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/blogs/index.php'), 'utf8');
const publicApi = fs.readFileSync(path.join(root, 'api/public-blog/index.php'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'blog-builder-bootstrap.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'blog-builder/blog-builder.css'), 'utf8');
const sharedPreview = fs.readFileSync(path.join(root, 'blog-preview/index.php'), 'utf8');
const sharedPreviewCss = fs.readFileSync(path.join(root, 'blog-preview/blog-preview.css'), 'utf8');
const sharedPreviewJs = fs.readFileSync(path.join(root, 'blog-preview/blog-preview.js'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const topic of ['healthy-eating', 'keeping-fit', 'losing-weight', 'diabetes-remission']) {
  expect(bootstrap.includes(topic), `Builder must include topic ${topic}.`);
}

for (const control of [
  'data-body-editor', 'data-schedule-input', 'data-cover-input', 'data-preview-dialog',
  'data-history-dialog', 'data-seo-description', 'data-checklist', 'data-library-search',
  'data-inline-image', 'data-inline-image-input', 'data-share-preview', 'data-share-dialog',
  'data-undo', 'data-redo', 'data-image-align', 'data-image-reset-crop', 'data-article-font-select',
  'data-add-youtube', 'data-youtube-dialog', 'data-youtube-player-dialog', 'data-youtube-player-link',
  'data-delivery-control', 'data-delivery-mode="sandbox"', 'data-delivery-mode="live"'
]) {
  expect(php.includes(control), `Builder is missing ${control}.`);
}

expect(js.includes("'X-CSRF-Token'"), 'Mutation requests must send CSRF protection.');
expect(js.includes("beforeunload"), 'Unsaved work must be protected during navigation.');
expect(js.includes("action = 'list'"), 'The editor must use the authenticated API.');
expect(api.includes("'publishing_connected' => true") && api.includes("action === 'delivery'"), 'The authenticated API must expose the public delivery control.');
expect(publicApi.includes("'X-Robots-Tag: noindex, nofollow, noarchive'") && publicApi.includes('jg_blog_delivery_posts'), 'The public feed must expose eligible articles without making its JSON indexable.');
expect(publicApi.includes("$sandboxRequested") && publicApi.includes("'visibility' => 'off'"), 'The public feed must enforce sandbox and off modes.');
expect(nav.includes("'href' => '../blog-builder/'"), 'The Executive Dashboard navigation must expose Blog Studio.');
expect(!php.includes('Official ZERO website/'), 'The builder page must not write into the public website repository.');
expect(css.includes('grid-template-columns: minmax(0, 1fr) auto auto'), 'The Blog Studio header must keep title, save state, and action icons on one row.');
expect(css.includes(":root[data-admin-theme='light'] .blog-new-button"), 'Light mode must provide an explicit readable primary-button treatment.');
expect(!php.includes('blog-external-form'), 'Inspector fields must not be connected to a hidden form that can reload the page.');
expect(js.includes('state.changeRevision !== saveRevision'), 'Autosave must detect edits made while a save request is in flight.');
expect(!js.includes("elements.body.innerHTML = response.post.body_html"), 'Autosave responses must not replace the live editor DOM or reset the caret.');
expect(js.includes("elements.body.addEventListener('drop'"), 'The article body must accept dragged image files.');
expect(js.includes("event.clipboardData?.files"), 'The article body must accept pasted image files.');
expect(css.includes('--blog-paper: #fbfcf8'), 'The reader-facing writing paper must remain light in dark dashboard mode.');
expect(css.includes(':root[data-admin-theme] .blog-writing-page .blog-title-input'), 'Dashboard form colors must not override the light article title canvas.');
expect(css.includes(':root[data-admin-theme] .blog-writing-page .blog-excerpt-field textarea'), 'Dashboard form colors must not override the light article summary canvas.');
expect(css.includes('.blog-body-editor :is(p, h2, h3, ul, ol, li, strong, em)'), 'Dashboard themes must not recolor authored article HTML.');
expect(css.includes('.blog-preview-dialog .blog-preview-article :is(h1, h2, h3, p, ul, ol, li, strong, em)'), 'Dashboard themes must not recolor preview article HTML.');
expect(!php.includes('>•••</button>'), 'The more-actions control must use a consistently sized icon instead of font bullets.');
expect(php.includes('data-more-toggle') && css.includes('.blog-more-button svg'), 'The more-actions icon must have fixed SVG sizing.');
expect(api.includes("action === 'share_preview'") && api.includes("action === 'disable_preview'"), 'Authenticated editors must be able to create and revoke preview links.');
expect(sharedPreview.includes("X-Robots-Tag: noindex, nofollow, noarchive"), 'Shared drafts must stay out of search engines.');
expect(sharedPreview.includes('jg_blog_public_body_html'), 'Shared previews must render sanitized article HTML.');
expect(sharedPreview.includes('www.youtube-nocookie.com') && sharedPreview.includes('data-youtube-player-dialog'), 'Shared previews must permit the privacy-enhanced YouTube player and provide its focused dialog.');
expect(sharedPreviewJs.includes('youtube-nocookie.com/embed/') && sharedPreviewJs.includes('data-youtube-trigger'), 'Shared previews must open saved video cards in the focused YouTube player.');
expect(js.includes('enableSharedPreview') && js.includes('copySharedPreview'), 'The editor must create and copy private preview links.');
expect(js.includes('youtubeVideoId') && js.includes('youtube-nocookie.com/embed/') && js.includes('insertYoutubeVideo'), 'The editor must validate, insert, and preview YouTube video blocks.');
expect(js.includes('beginYoutubeResize') && js.includes("clamp(Math.round(width), 10, 100)"), 'YouTube cards must support direct resizing down to a compact ten-percent width.');
expect(js.includes('beginYoutubePlacement') && js.includes("position < .36 ? 'left'"), 'YouTube cards must support direct left, center, and right placement.');
expect(js.includes("[data-youtube-editor-control]") && js.includes('clone.querySelectorAll'), 'Editor-only YouTube controls must not be saved into article HTML.');
expect(!php.includes('data-image-scale') && !php.includes('type="range"'), 'Image sizing must use direct manipulation instead of a scale slider.');
expect(js.includes('const HISTORY_LIMIT = 100') && js.includes('const undo = () =>') && js.includes('const redo = () =>'), 'The editor must retain a conventional 100-step undo/redo history.');
expect(js.includes("key === 'z' && !event.shiftKey") && js.includes("key === 'z' && event.shiftKey"), 'Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z must operate article history.');
expect(js.includes("['nw', 'ne', 'se', 'sw']") && js.includes("['top', 'right', 'bottom', 'left']"), 'Images must expose corner resize and side crop handles.');
expect(js.includes("elements.body.addEventListener('dblclick'") && css.includes('figure.is-cropping'), 'Double-clicking an image must enable direct side cropping.');
expect(js.includes("requestedKind = ''") && js.includes("interaction.kind === 'pan'"), 'Crop mode must let editors drag the image within its crop frame.');
expect(js.includes("? 'pan' : 'place'") && js.includes("horizontalPosition < .36 ? 'left'"), 'Dragging the whole image must place it on the left, center, or right.');
expect(css.includes('.blog-image-layout { position: fixed;') && css.includes('z-index: 80') && js.includes('const positionImageLayout = () =>'), 'Selected image controls must float above and follow the selected image.');
expect(css.includes('.blog-body-editor { display: flow-root;') && css.includes('.blog-writing-footer { clear: both;'), 'Wrapped images must remain inside the writing paper and clear the article footer.');
expect(sharedPreviewCss.includes('figure[data-align="left"]') && sharedPreviewCss.includes('[data-image-frame]'), 'Shared previews must render text wrapping and saved crops.');
expect(css.includes('figure[data-youtube-id]') && sharedPreviewCss.includes('figure[data-youtube-id]'), 'YouTube previews must have a responsive landing-page treatment in the editor and shared preview.');
expect(css.includes('var(--youtube-width, 100%)') && sharedPreviewCss.includes('var(--youtube-width, 100%)'), 'Saved YouTube widths must render consistently in dashboard and shared previews.');
expect(css.includes('data-youtube-align="right"') && sharedPreviewCss.includes('data-youtube-align="right"'), 'Saved YouTube placement must render consistently in dashboard and shared previews.');
expect(bootstrap.includes('zero_blog_post_styles') && bootstrap.includes('function jg_blog_fonts'), 'Article font choices must persist independently from dashboard themes.');
expect(php.includes('class="blog-format-group"') && php.includes('aria-label="Links and media"'), 'Formatting controls must be grouped so they can wrap together at narrow widths.');
expect(/\.blog-format-toolbar\s*\{[^}]*flex-wrap:\s*wrap;/s.test(css), 'The formatting toolbar must wrap so every control remains visible at every editor width.');
expect(!css.includes('.blog-format-toolbar { overflow-x: auto; }'), 'The formatting toolbar must not hide controls behind horizontal scrolling.');

console.log('blog builder UI tests passed');
