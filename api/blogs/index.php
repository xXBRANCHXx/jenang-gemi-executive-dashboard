<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';

jg_admin_start_session();
if (!jg_admin_is_authenticated()) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}
$csrfToken = (string) ($_SESSION['jg_blog_csrf'] ?? '');
jg_admin_release_session();

require dirname(__DIR__, 2) . '/blog-builder-bootstrap.php';

function jg_blog_api_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_blog_api_json(): array
{
    $raw = file_get_contents('php://input');
    $payload = json_decode(is_string($raw) ? $raw : '', true);
    if (!is_array($payload)) {
        throw new InvalidArgumentException('Send a valid JSON request.');
    }
    return $payload;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = strtolower(trim((string) ($_GET['action'] ?? ($method === 'GET' ? 'list' : 'save'))));

if ($method !== 'GET') {
    $providedToken = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '');
    if ($csrfToken === '' || !hash_equals($csrfToken, $providedToken)) {
        jg_blog_api_response(['ok' => false, 'error' => 'Your session token expired. Refresh the page and try again.'], 419);
    }
}

try {
    $pdo = jg_blog_db();

    if ($method === 'GET' && $action === 'asset') {
        $asset = jg_blog_asset($pdo, max(1, (int) ($_GET['id'] ?? 0)));
        header('Content-Type: ' . $asset['mime_type']);
        header('Content-Length: ' . (int) $asset['size_bytes']);
        header('Cache-Control: private, max-age=86400');
        header('X-Content-Type-Options: nosniff');
        echo $asset['image_data'];
        exit;
    }

    if ($method === 'GET' && $action === 'get') {
        $id = max(1, (int) ($_GET['id'] ?? 0));
        jg_blog_api_response([
            'ok' => true,
            'post' => jg_blog_post($pdo, $id),
            'revisions' => jg_blog_revisions($pdo, $id),
        ]);
    }

    if ($method === 'GET') {
        $posts = jg_blog_list($pdo);
        jg_blog_api_response([
            'ok' => true,
            'posts' => $posts,
            'stats' => jg_blog_stats($posts),
            'topics' => jg_blog_topics(),
            'statuses' => jg_blog_statuses(),
            'publishing_connected' => false,
            'timezone' => JG_BLOG_TIMEZONE,
        ]);
    }

    if ($method === 'POST' && $action === 'upload') {
        jg_blog_api_response([
            'ok' => true,
            'asset' => jg_blog_store_asset($pdo, $_FILES['image'] ?? [], (string) ($_POST['alt_text'] ?? '')),
        ], 201);
    }

    $payload = jg_blog_api_json();
    if ($method === 'POST' && $action === 'duplicate') {
        jg_blog_api_response(['ok' => true, 'post' => jg_blog_duplicate($pdo, (int) ($payload['id'] ?? 0))], 201);
    }
    if ($method === 'POST' && $action === 'restore') {
        jg_blog_api_response(['ok' => true, 'post' => jg_blog_restore_revision(
            $pdo,
            (int) ($payload['id'] ?? 0),
            (int) ($payload['revision_id'] ?? 0),
            (int) ($payload['version'] ?? 0)
        )]);
    }
    if ($method === 'POST' && $action === 'archive') {
        jg_blog_api_response(['ok' => true, 'post' => jg_blog_archive(
            $pdo,
            (int) ($payload['id'] ?? 0),
            (int) ($payload['version'] ?? 0)
        )]);
    }
    if ($method === 'POST' && $action === 'share_preview') {
        jg_blog_api_response(['ok' => true, 'post' => jg_blog_enable_preview(
            $pdo,
            (int) ($payload['id'] ?? 0),
            !empty($payload['rotate'])
        )]);
    }
    if ($method === 'POST' && $action === 'disable_preview') {
        jg_blog_api_response(['ok' => true, 'post' => jg_blog_disable_preview(
            $pdo,
            (int) ($payload['id'] ?? 0)
        )]);
    }
    if ($method === 'POST' && $action === 'save') {
        $post = jg_blog_save($pdo, $payload);
        jg_blog_api_response(['ok' => true, 'post' => $post, 'revisions' => jg_blog_revisions($pdo, $post['id'])], (int) ($payload['id'] ?? 0) ? 200 : 201);
    }

    jg_blog_api_response(['ok' => false, 'error' => 'Unsupported blog builder action.'], 405);
} catch (InvalidArgumentException $error) {
    jg_blog_api_response(['ok' => false, 'error' => $error->getMessage()], 422);
} catch (OutOfBoundsException $error) {
    jg_blog_api_response(['ok' => false, 'error' => $error->getMessage()], 404);
} catch (UnexpectedValueException $error) {
    jg_blog_api_response(['ok' => false, 'error' => $error->getMessage(), 'conflict' => true], 409);
} catch (Throwable $error) {
    error_log('ZERO blog builder: ' . $error->getMessage());
    jg_blog_api_response(['ok' => false, 'error' => 'The blog workspace could not complete that request. Try again.'], 500);
}
