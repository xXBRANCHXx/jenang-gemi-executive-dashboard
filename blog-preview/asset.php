<?php
declare(strict_types=1);

require dirname(__DIR__) . '/blog-builder-bootstrap.php';

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

try {
    $token = strtolower(trim((string) ($_GET['token'] ?? '')));
    $id = max(1, (int) ($_GET['id'] ?? 0));
    $post = jg_blog_shared_post(jg_blog_db(), $token);
    if (!in_array($id, jg_blog_post_asset_ids($post), true)) {
        throw new OutOfBoundsException('Image not found.');
    }
    $asset = jg_blog_asset(jg_blog_db(), $id);
    header('Content-Type: ' . $asset['mime_type']);
    header('Content-Length: ' . (int) $asset['size_bytes']);
    header('Cache-Control: private, max-age=3600');
    echo $asset['image_data'];
} catch (Throwable $error) {
    if (!($error instanceof OutOfBoundsException)) {
        error_log('ZERO shared preview asset: ' . $error->getMessage());
    }
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    echo 'Image unavailable';
}
