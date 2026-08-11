<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/blog-builder-bootstrap.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Vary: Origin');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow, noarchive');

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function jg_public_blog_json(array $payload, int $status = 200, bool $sandbox = false): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: ' . ($sandbox ? 'no-store, max-age=0' : 'public, max-age=60, stale-while-revalidate=300'));
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_public_blog_base_url(): string
{
    $forwardedValues = explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    $forwarded = strtolower(trim((string) ($forwardedValues[0] ?? '')));
    $scheme = $forwarded === 'https' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = preg_replace('/[^a-z0-9.\-:\[\]]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? 'admin.jenanggemi.com')) ?: 'admin.jenanggemi.com';
    return $scheme . '://' . $host . '/api/public-blog/';
}

function jg_public_blog_prepare_post(array $post, bool $sandbox): array
{
    $base = jg_public_blog_base_url();
    $query = '&slug=' . rawurlencode((string) $post['slug']) . ($sandbox ? '&sandbox=1' : '');
    $assetUrl = static fn (int $id): string => $base . '?action=asset&id=' . $id . $query;
    $post['featured_image_url'] = !empty($post['featured_asset_id']) ? $assetUrl((int) $post['featured_asset_id']) : null;
    $post['body_html'] = (string) preg_replace_callback(
        '~src="/api/blogs/\?action=asset(?:&amp;|&)id=(\d+)"~i',
        static fn (array $match): string => 'src="' . htmlspecialchars($assetUrl((int) $match[1]), ENT_QUOTES, 'UTF-8') . '"',
        jg_blog_sanitize_html((string) ($post['body_html'] ?? ''))
    );
    unset($post['preview_enabled'], $post['preview_path'], $post['version'], $post['status']);
    return $post;
}

try {
    // Public reads avoid running schema DDL on every crawler and website request.
    // Opening Blog Studio or changing delivery mode performs the one-time migration.
    $pdo = jg_blog_db(false);
    $delivery = jg_blog_delivery($pdo);
    $sandboxRequested = filter_var($_GET['sandbox'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $sandboxActive = $sandboxRequested && in_array($delivery['mode'], ['sandbox', 'live'], true);
    $available = $delivery['mode'] === 'live' || $sandboxActive;
    $action = strtolower(trim((string) ($_GET['action'] ?? 'list')));

    if ($action === 'config') {
        jg_public_blog_json([
            'ok' => true,
            'available' => $available,
            'visibility' => $sandboxActive ? 'sandbox' : ($delivery['mode'] === 'live' ? 'live' : 'off'),
            'topics' => jg_blog_topics(),
        ], 200, $sandboxRequested);
    }

    if (!$available) {
        jg_public_blog_json([
            'ok' => true,
            'available' => false,
            'visibility' => 'off',
            'topics' => jg_blog_topics(),
            'posts' => [],
        ], 200, $sandboxRequested);
    }

    if ($action === 'asset') {
        $slug = (string) ($_GET['slug'] ?? '');
        $assetId = max(1, (int) ($_GET['id'] ?? 0));
        $post = jg_blog_delivery_post($pdo, $slug, $sandboxActive);
        if (!jg_blog_delivery_asset_allowed($post, $assetId)) {
            throw new OutOfBoundsException('Image not found.');
        }
        $asset = jg_blog_asset($pdo, $assetId);
        header('Content-Type: ' . $asset['mime_type']);
        header('Content-Length: ' . (int) $asset['size_bytes']);
        header('Cache-Control: ' . ($sandboxActive ? 'no-store, max-age=0' : 'public, max-age=86400, stale-while-revalidate=604800'));
        echo $asset['image_data'];
        exit;
    }

    if ($action === 'article') {
        $post = jg_blog_delivery_post($pdo, (string) ($_GET['slug'] ?? ''), $sandboxActive);
        jg_public_blog_json([
            'ok' => true,
            'available' => true,
            'visibility' => $sandboxActive ? 'sandbox' : 'live',
            'post' => jg_public_blog_prepare_post($post, $sandboxActive),
            'topics' => jg_blog_topics(),
        ], 200, $sandboxActive);
    }

    $posts = array_map(
        static fn (array $post): array => jg_public_blog_prepare_post($post, $sandboxActive),
        jg_blog_delivery_posts($pdo, $sandboxActive)
    );
    jg_public_blog_json([
        'ok' => true,
        'available' => true,
        'visibility' => $sandboxActive ? 'sandbox' : 'live',
        'topics' => jg_blog_topics(),
        'posts' => $posts,
        'generated_at' => gmdate(DATE_ATOM),
    ], 200, $sandboxActive);
} catch (OutOfBoundsException) {
    jg_public_blog_json(['ok' => false, 'error' => 'Article not found.'], 404, !empty($sandboxRequested));
} catch (Throwable $error) {
    error_log('ZERO public blog delivery: ' . $error->getMessage());
    jg_public_blog_json(['ok' => false, 'error' => 'Articles are temporarily unavailable.'], 500, !empty($sandboxRequested));
}
