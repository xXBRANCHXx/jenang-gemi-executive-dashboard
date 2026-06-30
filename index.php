<?php
declare(strict_types=1);

$adminCssVersion = (string) @filemtime(__DIR__ . '/admin.css');
$launchItems = [
    [
        'label' => 'Executive Dashboard',
        'href' => './dashboard/?view=overview',
        'class' => 'admin-launch-card-executive',
        'mark' => 'ED',
        'meta' => 'Secure',
    ],
    [
        'label' => 'Store Ops',
        'href' => 'https://store.jenanggemi.com/',
        'class' => 'admin-launch-card-store',
        'mark' => 'SO',
        'meta' => 'Secure',
    ],
    [
        'label' => 'Jenang Gemi Website',
        'href' => 'https://jenanggemi.com/',
        'class' => 'admin-launch-card-jenang',
        'mark' => 'JG',
        'meta' => 'Website',
    ],
    [
        'label' => 'ZERO Website',
        'href' => 'https://zerofoods.id/',
        'class' => 'admin-launch-card-zero',
        'mark' => 'ZF',
        'meta' => 'Website',
    ],
];
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="launch-pad">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>Launch Pad | Jenang Gemi</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="./admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-launch-pad">
    <main class="admin-launch-pad" aria-labelledby="launch-pad-title">
        <div class="admin-launch-shell">
            <header class="admin-launch-header">
                <div>
                    <span class="admin-launch-eyebrow">Jenang Gemi Admin</span>
                    <h1 id="launch-pad-title">Launch Pad</h1>
                </div>
                <span class="admin-launch-status">Public Entry</span>
            </header>

            <section class="admin-launch-grid" aria-label="Launch Pad destinations">
                <?php foreach ($launchItems as $item): ?>
                    <a
                        class="admin-launch-card <?php echo htmlspecialchars($item['class'], ENT_QUOTES, 'UTF-8'); ?>"
                        href="<?php echo htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8'); ?>"
                        aria-label="Open <?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?>"
                    >
                        <span class="admin-launch-card-meta"><?php echo htmlspecialchars($item['meta'], ENT_QUOTES, 'UTF-8'); ?></span>
                        <span class="admin-launch-mark" aria-hidden="true"><?php echo htmlspecialchars($item['mark'], ENT_QUOTES, 'UTF-8'); ?></span>
                        <span class="admin-launch-card-title"><?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                        <span class="admin-launch-open" aria-hidden="true">Open</span>
                    </a>
                <?php endforeach; ?>
            </section>
        </div>
    </main>
</body>
</html>
