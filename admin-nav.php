<?php
declare(strict_types=1);

function render_admin_sidebar(string $activeSection = ''): void
{
    $activeSection = strtolower(trim($activeSection));
    $items = [
        [
            'key' => 'home',
            'href' => '../dashboard/',
            'label' => 'Home',
            'icon' => 'admin-rail-icon-overview',
            'aria' => 'Open executive dashboard homepage',
            'view' => 'overview',
        ],
        [
            'key' => 'campaigns',
            'href' => '../dashboard/?view=campaigns',
            'label' => 'Campaigns',
            'icon' => 'admin-rail-icon-campaigns',
            'aria' => 'Open campaigns dashboard',
            'view' => 'home',
        ],
        [
            'key' => 'website',
            'href' => '../dashboard/?view=website',
            'label' => 'Website',
            'icon' => 'admin-rail-icon-rocket',
            'aria' => 'Open website dashboard',
            'view' => 'website',
        ],
        [
            'key' => 'affiliate',
            'href' => '../affiliate-program/',
            'label' => 'Affiliate',
            'icon' => 'admin-rail-icon-affiliate',
            'aria' => 'Open affiliate program dashboard',
        ],
        [
            'key' => 'partner',
            'href' => '../partner-program/',
            'label' => 'Partner',
            'icon' => 'admin-rail-icon-partner',
            'aria' => 'Open partner program dashboard',
        ],
        [
            'key' => 'api',
            'href' => '../back-dash/',
            'label' => 'API',
            'icon' => 'admin-rail-icon-api',
            'aria' => 'Open API ingest workspace',
        ],
        [
            'key' => 'sku',
            'href' => '../sku-db/',
            'label' => 'SKU DB',
            'icon' => 'admin-rail-icon-sku',
            'icon_text' => 'SKU',
            'aria' => 'Open SKU database',
        ],
    ];

    $footerItems = [
        [
            'key' => 'settings',
            'href' => '../dashboard/?view=settings',
            'label' => 'Settings',
            'icon' => 'admin-rail-icon-settings',
            'aria' => 'Open admin settings',
            'view' => 'settings',
        ],
    ];

    echo '<aside class="admin-rail" aria-label="Admin navigation">';
    echo '<a class="admin-rail-brand" href="../dashboard/" aria-label="Executive Dashboard home">';
    echo '<span class="admin-rail-brand-mark" aria-hidden="true"><span class="admin-rail-brand-core"></span></span>';
    echo '<span class="admin-rail-brand-wordmark">ADMIN</span>';
    echo '</a>';
    echo '<nav class="admin-rail-nav">';
    foreach ($items as $item) {
        render_admin_sidebar_item($item, $activeSection);
    }
    echo '</nav>';
    echo '<div class="admin-rail-footer">';
    foreach ($footerItems as $item) {
        render_admin_sidebar_item($item, $activeSection);
    }
    echo '</div>';
    echo '</aside>';
}

function render_admin_sidebar_item(array $item, string $activeSection): void
{
    $isActive = $activeSection === strtolower((string) ($item['key'] ?? ''));
    $className = 'admin-rail-link' . ($isActive ? ' is-active' : '');
    $attributes = [
        'class="' . $className . '"',
        'href="' . htmlspecialchars((string) ($item['href'] ?? '../dashboard/'), ENT_QUOTES, 'UTF-8') . '"',
        'aria-label="' . htmlspecialchars((string) ($item['aria'] ?? ''), ENT_QUOTES, 'UTF-8') . '"',
        'data-dashboard-nav-section="' . htmlspecialchars((string) ($item['key'] ?? ''), ENT_QUOTES, 'UTF-8') . '"',
    ];

    $view = trim((string) ($item['view'] ?? ''));
    if ($view !== '') {
        $attributes[] = 'data-dashboard-view-link="' . htmlspecialchars($view, ENT_QUOTES, 'UTF-8') . '"';
    }
    if ($isActive) {
        $attributes[] = 'aria-current="page"';
    }

    $iconClass = htmlspecialchars((string) ($item['icon'] ?? 'admin-rail-icon-home'), ENT_QUOTES, 'UTF-8');
    $label = htmlspecialchars((string) ($item['label'] ?? ''), ENT_QUOTES, 'UTF-8');

    echo '<a ' . implode(' ', $attributes) . '>';
    $iconText = htmlspecialchars((string) ($item['icon_text'] ?? ''), ENT_QUOTES, 'UTF-8');
    echo '<span class="admin-rail-icon ' . $iconClass . '" aria-hidden="true"><span>' . $iconText . '</span></span>';
    echo '<span class="admin-rail-link-text">' . $label . '</span>';
    echo '</a>';
}
