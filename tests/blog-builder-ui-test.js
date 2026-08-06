const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const php = fs.readFileSync(path.join(root, 'blog-builder/index.php'), 'utf8');
const js = fs.readFileSync(path.join(root, 'blog-builder/blog-builder.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/blogs/index.php'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'blog-builder-bootstrap.php'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const topic of ['healthy-eating', 'keeping-fit', 'losing-weight', 'diabetes-remission']) {
  expect(bootstrap.includes(topic), `Builder must include topic ${topic}.`);
}

for (const control of [
  'data-body-editor', 'data-schedule-input', 'data-cover-input', 'data-preview-dialog',
  'data-history-dialog', 'data-seo-description', 'data-checklist', 'data-library-search'
]) {
  expect(php.includes(control), `Builder is missing ${control}.`);
}

expect(js.includes("'X-CSRF-Token'"), 'Mutation requests must send CSRF protection.');
expect(js.includes("beforeunload"), 'Unsaved work must be protected during navigation.');
expect(js.includes("action = 'list'"), 'The editor must use the authenticated API.');
expect(api.includes("'publishing_connected' => false"), 'This release must explicitly keep public publishing disconnected.');
expect(nav.includes("'href' => '../blog-builder/'"), 'The Executive Dashboard navigation must expose Blog Studio.');
expect(!php.includes('Official ZERO website/'), 'The builder page must not write into the public website repository.');

console.log('blog builder UI tests passed');
