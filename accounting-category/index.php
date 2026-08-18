<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';
require_once dirname(__DIR__) . '/accounting-bootstrap.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$categoryId = filter_var($_GET['category_id'] ?? $_GET['id'] ?? null, FILTER_VALIDATE_INT);
$detail = null;
$loadError = '';
try {
    if ($categoryId !== false && (int) $categoryId > 0) {
        $pdo = analyticsDb();
        jg_accounting_ensure_schema($pdo);
        $detail = jg_accounting_category_guidance($pdo, (int) $categoryId);
    }
} catch (Throwable) {
    $loadError = 'The category guide could not be loaded right now.';
}
if ($detail === null && $loadError === '') {
    http_response_code(404);
    $loadError = 'That accounting category was not found.';
}

$category = is_array($detail['category'] ?? null) ? $detail['category'] : [];
$guidance = is_array($detail['guidance'] ?? null) ? $detail['guidance'] : [];
$name = trim((string) ($category['name'] ?? 'Category guide')) ?: 'Category guide';
$parentName = trim((string) ($category['parent_name'] ?? 'General')) ?: 'General';
$code = trim((string) ($guidance['account_code'] ?? ''));
$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');

function jg_category_guide_text(mixed $value): string
{
    return htmlspecialchars(trim((string) $value), ENT_QUOTES, 'UTF-8');
}

function jg_category_guide_references(string $references): void
{
    foreach (preg_split('/\R/u', trim($references)) ?: [] as $line) {
        $line = trim($line);
        if ($line === '') continue;
        $parts = array_map('trim', explode('|', $line, 2));
        $label = $parts[0] ?: 'Reference';
        $url = $parts[1] ?? '';
        if ($url !== '' && filter_var($url, FILTER_VALIDATE_URL) && in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)) {
            echo '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" target="_blank" rel="noopener noreferrer"><span>'
                . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</span><small>'
                . htmlspecialchars((string) parse_url($url, PHP_URL_HOST), ENT_QUOTES, 'UTF-8') . '</small><b aria-hidden="true">↗</b></a>';
        } else {
            echo '<p><span>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</span>'
                . ($url !== '' ? '<small>' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '</small>' : '') . '</p>';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo jg_category_guide_text($name); ?> | Accounting category guide</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('accounting'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-accounting">
<div class="admin-app admin-app-suite admin-category-guide-page">
    <div class="admin-shell">
        <?php render_admin_sidebar('accounting'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar admin-accounting-topbar admin-finance-page-head">
                <div class="admin-topbar-brand">
                    <span class="admin-admin-mark">Accounting reference</span>
                    <h1>Category guide</h1>
                    <p>What this category means, when to use it, and what evidence to keep.</p>
                </div>
                <?php render_admin_topbar_actions('accounting'); ?>
            </header>

            <main class="admin-category-guide">
                <a class="admin-category-guide-back" href="../profit-loss/">← Back to Accounting</a>
                <?php if ($loadError !== ''): ?>
                    <section class="admin-category-guide-error">
                        <span class="admin-panel-kicker">Unable to open guide</span>
                        <h2><?php echo jg_category_guide_text($loadError); ?></h2>
                        <p>Return to Accounting and try the category information icon again.</p>
                    </section>
                <?php else: ?>
                    <section class="admin-category-guide-hero">
                        <div>
                            <span class="admin-panel-kicker"><?php echo jg_category_guide_text($parentName); ?></span>
                            <h2><?php echo jg_category_guide_text($name); ?></h2>
                            <p><?php echo jg_category_guide_text($guidance['hover_summary'] ?? ''); ?></p>
                        </div>
                        <dl>
                            <div><dt>Account code</dt><dd><?php echo $code !== '' ? jg_category_guide_text($code) : 'Not assigned'; ?></dd></div>
                            <div><dt>Money direction</dt><dd><?php echo (($category['flow'] ?? 'expense') === 'income') ? 'Money in' : 'Money out'; ?></dd></div>
                            <div><dt>Reporting type</dt><dd><?php echo jg_category_guide_text(str_replace('_', ' ', (string) ($category['type'] ?? 'other'))); ?></dd></div>
                            <div><dt>Guidance</dt><dd><?php echo !empty($guidance['is_customized']) ? 'Accountant edited' : 'Researched default'; ?></dd></div>
                        </dl>
                    </section>

                    <aside class="admin-category-guide-disclaimer">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>
                        <div><strong>Internal code, practical guidance</strong><p>The code identifies Jenang Gemi’s own chart of accounts. It is not assumed to have the same meaning in another company or government chart. Tax and employment notes are review prompts, not a substitute for advice on the specific transaction.</p></div>
                    </aside>

                    <div class="admin-category-guide-grid">
                        <article class="admin-category-guide-card is-wide"><span>Definition</span><h3>What it is and what it means</h3><p><?php echo jg_category_guide_text($guidance['definition'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card"><span>Include</span><h3>When to use it</h3><p><?php echo jg_category_guide_text($guidance['when_to_use'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card"><span>Exclude</span><h3>When not to use it</h3><p><?php echo jg_category_guide_text($guidance['when_not_to_use'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card is-wide"><span>Examples</span><h3>Real-world classification examples</h3><p><?php echo jg_category_guide_text($guidance['examples'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card"><span>Evidence</span><h3>Documents to keep</h3><p><?php echo jg_category_guide_text($guidance['documentation'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card"><span>Posting</span><h3>Accounting treatment</h3><p><?php echo jg_category_guide_text($guidance['accounting_treatment'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card"><span>Compliance</span><h3>Tax and legal review</h3><p><?php echo jg_category_guide_text($guidance['tax_legal_notes'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card"><span>Month-end</span><h3>Controls and reviewer checks</h3><p><?php echo jg_category_guide_text($guidance['controls'] ?? ''); ?></p></article>
                        <article class="admin-category-guide-card is-wide"><span>Sources</span><h3>References and governing documents</h3><div class="admin-category-guide-references"><?php jg_category_guide_references((string) ($guidance['references'] ?? '')); ?></div></article>
                    </div>

                    <footer class="admin-category-guide-footer">
                        <div><strong>See something outdated?</strong><p>Edit every section in Accounting → Settings → Categories. Changes update both this page and the hover explanation.</p></div>
                        <a href="../profit-loss/?settings=categories&amp;category_id=<?php echo (int) ($category['id'] ?? 0); ?>">Open Accounting settings</a>
                    </footer>
                <?php endif; ?>
            </main>
        </div>
    </div>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
</body>
</html>
