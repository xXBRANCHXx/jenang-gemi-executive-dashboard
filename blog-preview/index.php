<?php
declare(strict_types=1);

require dirname(__DIR__) . '/blog-builder-bootstrap.php';

header('Cache-Control: no-store, max-age=0');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

$token = strtolower(trim((string) ($_GET['token'] ?? '')));
$post = null;
try {
    $post = jg_blog_shared_post(jg_blog_db(), $token);
} catch (Throwable $error) {
    if (!($error instanceof OutOfBoundsException)) {
        error_log('ZERO blog preview: ' . $error->getMessage());
    }
}

if (!is_array($post)) {
    http_response_code(404);
}

$escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$topics = jg_blog_topics();
$topic = is_array($post) ? ($topics[$post['topic']] ?? $topics['healthy-eating']) : $topics['healthy-eating'];
$bodyHtml = is_array($post) ? jg_blog_public_body_html((string) $post['body_html'], $token) : '';
$coverUrl = is_array($post) && !empty($post['featured_asset_id'])
    ? '/blog-preview/asset.php?token=' . rawurlencode($token) . '&amp;id=' . (int) $post['featured_asset_id']
    : '';
$updatedLabel = '';
if (is_array($post) && !empty($post['updated_at'])) {
    try {
        $updatedLabel = (new DateTimeImmutable((string) $post['updated_at']))
            ->setTimezone(new DateTimeZone(JG_BLOG_TIMEZONE))
            ->format('j M Y, H:i') . ' WIB';
    } catch (Throwable) {
        $updatedLabel = '';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <title><?php echo $post ? $escape($post['title']) . ' · Private ZERO preview' : 'Preview unavailable · ZERO'; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap">
    <link rel="stylesheet" href="./blog-preview.css?v=<?php echo urlencode((string) (@filemtime(__DIR__ . '/blog-preview.css') ?: '1')); ?>">
</head>
<body>
<?php if (!$post): ?>
    <main class="preview-unavailable">
        <span class="preview-brand">ZERO</span>
        <div class="preview-unavailable-mark">×</div>
        <h1>This preview is unavailable</h1>
        <p>The link may have been replaced or sharing may have been turned off. Ask the ZERO team for a new preview link.</p>
    </main>
<?php else: ?>
    <header class="preview-bar">
        <a class="preview-brand" aria-label="ZERO private article preview">ZERO</a>
        <div class="preview-bar-copy"><strong>Private article preview</strong><span>Not published · Please don’t forward without permission</span></div>
        <span class="preview-status"><i></i> Preview</span>
    </header>
    <main>
        <article class="preview-article" data-article-font="<?php echo $escape($post['font_key']); ?>" data-topic="<?php echo $escape($post['topic']); ?>">
            <header class="preview-article-header">
                <span class="preview-topic"><?php echo $escape($topic['label']); ?></span>
                <h1><?php echo $escape($post['title']); ?></h1>
                <?php if ((string) $post['excerpt'] !== ''): ?><p class="preview-excerpt"><?php echo $escape($post['excerpt']); ?></p><?php endif; ?>
                <div class="preview-meta">
                    <span><?php echo $escape($post['author']); ?></span>
                    <span><?php echo (int) $post['reading_minutes']; ?> min read</span>
                    <?php if ($updatedLabel !== ''): ?><span>Updated <?php echo $escape($updatedLabel); ?></span><?php endif; ?>
                </div>
            </header>
            <?php if ($coverUrl !== ''): ?><img class="preview-cover" src="<?php echo $coverUrl; ?>" alt="<?php echo $escape($post['title']); ?>" loading="eager"><?php endif; ?>
            <div class="preview-body"><?php echo $bodyHtml !== '' ? $bodyHtml : '<p class="preview-empty">This draft does not have article content yet.</p>'; ?></div>
        </article>
    </main>
    <footer class="preview-footer"><strong>ZERO private preview</strong><span>This draft is not live on the ZERO website.</span></footer>
<?php endif; ?>
</body>
</html>
