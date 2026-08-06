const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const php = fs.readFileSync(path.join(root, 'blog-builder/index.php'), 'utf8');
const js = fs.readFileSync(path.join(root, 'blog-builder/blog-builder.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/blogs/index.php'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'blog-builder-bootstrap.php'), 'utf8');
const css = fs.readFileSync(path.join(root, 'blog-builder/blog-builder.css'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const topic of ['healthy-eating', 'keeping-fit', 'losing-weight', 'diabetes-remission']) {
  expect(bootstrap.includes(topic), `Builder must include topic ${topic}.`);
}

for (const control of [
  'data-body-editor', 'data-schedule-input', 'data-cover-input', 'data-preview-dialog',
  'data-history-dialog', 'data-seo-description', 'data-checklist', 'data-library-search',
  'data-inline-image', 'data-inline-image-input'
]) {
  expect(php.includes(control), `Builder is missing ${control}.`);
}

expect(js.includes("'X-CSRF-Token'"), 'Mutation requests must send CSRF protection.');
expect(js.includes("beforeunload"), 'Unsaved work must be protected during navigation.');
expect(js.includes("action = 'list'"), 'The editor must use the authenticated API.');
expect(api.includes("'publishing_connected' => false"), 'This release must explicitly keep public publishing disconnected.');
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

console.log('blog builder UI tests passed');
