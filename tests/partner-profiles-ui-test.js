const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'partner-profiles/index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'partner-profiles.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'partner-access.css'), 'utf8');

assert.doesNotMatch(page, /partner-directory-metrics/, 'Summary metric cards should not be rendered.');
assert.doesNotMatch(page, /<span class="admin-chip">Partner Profiles<\/span>/, 'The duplicate header chip should be removed.');
assert.match(page, /partner-add-button[\s\S]*?<svg/, 'Add Partner should include its profile-plus icon.');

assert.match(script, /partnerFaviconEndpoint/, 'Partner rows should load partner favicons.');
assert.match(script, /data-favicon-theme="light"[\s\S]*data-favicon-theme="dark"/, 'Both favicon theme variants should be rendered.');
assert.match(script, /partner-directory-favicon-fallback[\s\S]*<circle[\s\S]*<path/, 'Missing favicons should use a generic profile icon.');
assert.match(script, /Open<\/a>[\s\S]*partner-edit-button[\s\S]*partner-delete-button/, 'Open should precede the edit and delete icon actions.');

assert.match(styles, /data-admin-theme='light'[\s\S]*data-favicon-theme='light'/, 'Light mode should select the light favicon.');
assert.match(styles, /data-admin-theme='dark'[\s\S]*data-favicon-theme='dark'/, 'Dark mode should select the dark favicon.');
assert.match(styles, /partner-primary-text/, 'White primary surfaces should use their contrasting theme text token.');
assert.match(styles, /partner-directory-icon-btn[\s\S]*border: 0;[\s\S]*background: transparent;/, 'Row actions should be bare icons without pills or cards.');

console.log('Partner Profiles UI tests passed.');
