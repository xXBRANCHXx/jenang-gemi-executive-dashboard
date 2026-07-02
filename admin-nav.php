<?php
declare(strict_types=1);

function render_admin_initial_theme_script(): void
{
    echo <<<'HTML'
    <script>
        (() => {
            const key = 'jg-admin-theme';
            const normalizePreference = (theme) => {
                if (theme === 'minimal-white' || theme === 'classic-white' || theme === 'light') return 'light';
                if (theme === 'minimal-black' || theme === 'prism' || theme === 'dark') return 'dark';
                if (theme === 'system') return 'system';
                return 'dark';
            };
            const resolvePreference = (theme) => {
                const preference = normalizePreference(theme);
                if (preference !== 'system') return preference;
                return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            };
            try {
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const cookieMatch = document.cookie.match(new RegExp('(?:^|; )' + escapedKey + '=([^;]*)'));
                const cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
                const preference = normalizePreference(window.localStorage.getItem(key) || cookieTheme);
                document.documentElement.dataset.adminTheme = resolvePreference(preference);
                document.documentElement.dataset.adminThemeMode = preference;
            } catch (_error) {
                document.documentElement.dataset.adminTheme = 'dark';
                document.documentElement.dataset.adminThemeMode = 'dark';
            }
        })();
    </script>

HTML;
}

function admin_quick_menu_definitions(): array
{
    return [
        'home' => [
            'href' => '../dashboard/?view=overview',
            'view' => 'overview',
            'icon' => 'home',
            'label' => 'Home',
            'description' => 'Executive sales overview',
        ],
        'daily' => [
            'href' => '../dashboard/?view=daily',
            'view' => 'daily',
            'icon' => 'calendar',
            'label' => 'Daily',
            'description' => 'Daily platform Qty and Rp',
        ],
        'orders' => [
            'href' => '../dashboard/?view=orders',
            'view' => 'orders',
            'icon' => 'orders',
            'label' => 'Orders',
            'description' => 'Order detail and fulfillment facts',
        ],
        'campaigns' => [
            'href' => '../dashboard/?view=campaigns',
            'view' => 'home',
            'icon' => 'campaigns',
            'label' => 'Campaigns',
            'description' => 'Landing-page analytics',
        ],
        'back-dash' => [
            'href' => '../back-dash/',
            'icon' => 'back-dash',
            'label' => 'Back Dash',
            'description' => 'Marketplace control workspace',
        ],
        'context' => [
            'href' => '../dashboard/?view=context',
            'view' => 'context',
            'icon' => 'context',
            'label' => 'Context',
            'description' => 'Operational context and live signals',
        ],
        'hard-set' => [
            'href' => '../dashboard/?view=hard-set',
            'view' => 'hard-set',
            'icon' => 'hard-set',
            'label' => 'Hard Set',
            'description' => 'Website order cutover control',
        ],
        'settings' => [
            'href' => '../dashboard/?view=settings',
            'view' => 'settings',
            'icon' => 'settings',
            'label' => 'Settings',
            'description' => 'Appearance and lock controls',
        ],
        'affiliates' => [
            'href' => '../affiliate-program/',
            'icon' => 'affiliate',
            'label' => 'Affiliates',
            'description' => 'Affiliate performance control room',
        ],
        'affiliate-profiles' => [
            'href' => '../affiliate-profiles/',
            'icon' => 'users',
            'label' => 'Affiliate Profiles',
            'description' => 'Affiliate directory and edit area',
        ],
        'partners' => [
            'href' => '../partner-program/',
            'icon' => 'partner',
            'label' => 'Partners',
            'description' => 'Partner program management',
        ],
        'partner-profiles' => [
            'href' => '../partner-profiles/',
            'icon' => 'users',
            'label' => 'Partner Profiles',
            'description' => 'Partner registry and edit area',
        ],
        'api' => [
            'href' => '../api-health/',
            'icon' => 'api',
            'label' => 'API',
            'description' => 'Operational health checks',
        ],
        'sku-db' => [
            'href' => '../sku-db/',
            'icon' => 'sku',
            'label' => 'SKU DB',
            'description' => 'SKU source-of-truth records',
        ],
    ];
}

function admin_quick_menu_context_map(): array
{
    return [
        'overview' => ['daily', 'orders', 'campaigns', 'back-dash', 'context', 'settings'],
        'daily' => ['home', 'orders', 'campaigns', 'back-dash', 'context', 'settings'],
        'orders' => ['home', 'daily', 'campaigns', 'back-dash', 'context', 'settings'],
        'campaigns' => ['home', 'orders', 'affiliates', 'back-dash', 'context', 'settings'],
        'back-dash' => ['home', 'api', 'context', 'hard-set', 'settings'],
        'context' => ['home', 'api', 'back-dash', 'settings'],
        'settings' => ['home', 'daily', 'orders', 'campaigns', 'context'],
        'affiliates' => ['home', 'affiliate-profiles', 'campaigns', 'daily', 'orders', 'settings'],
        'affiliate-profiles' => ['home', 'affiliates', 'campaigns', 'daily', 'orders', 'settings'],
        'hard-set' => ['home', 'settings'],
        'profit-loss' => ['home', 'daily', 'orders', 'campaigns', 'context', 'settings'],
        'website' => ['home', 'daily', 'orders', 'campaigns', 'affiliates', 'settings'],
        'partners' => ['home', 'partner-profiles', 'daily', 'orders', 'campaigns', 'settings'],
        'api' => ['home', 'back-dash', 'context', 'hard-set', 'settings'],
        'sku-db' => ['home', 'daily', 'orders', 'back-dash', 'settings'],
        'partner-profiles' => ['home', 'partners', 'daily', 'orders', 'campaigns', 'settings'],
    ];
}

function admin_normalize_quick_menu_context(string $context): string
{
    $normalized = strtolower(trim($context));
    $aliases = [
        '' => 'overview',
        'dashboard' => 'overview',
        'homepage' => 'overview',
        'home' => 'overview',
        'campaign' => 'campaigns',
        'campaigns-dashboard' => 'campaigns',
        'affiliate' => 'affiliates',
        'affiliate-program' => 'affiliates',
        'affiliate-profile' => 'affiliate-profiles',
        'partner' => 'partners',
        'partner-program' => 'partners',
        'partner-profile' => 'partner-profiles',
        'sku' => 'sku-db',
        'api-health' => 'api',
        'p&l' => 'profit-loss',
        'profit-and-loss' => 'profit-loss',
    ];
    $context = $aliases[$normalized] ?? $normalized;

    return array_key_exists($context, admin_quick_menu_context_map()) ? $context : 'overview';
}

function admin_dashboard_view_menu_context(): string
{
    $requestedView = strtolower(trim((string) ($_GET['view'] ?? 'overview')));
    $aliases = [
        '' => 'overview',
        'overview' => 'overview',
        'executive' => 'overview',
        'homepage' => 'overview',
        'daily' => 'daily',
        'orders' => 'orders',
        'home' => 'campaigns',
        'campaign' => 'campaigns',
        'campaigns' => 'campaigns',
        'context' => 'context',
        'open-context' => 'context',
        'website' => 'website',
        'hardset' => 'hard-set',
        'hard-set' => 'hard-set',
        'settings' => 'settings',
    ];

    return $aliases[$requestedView] ?? 'overview';
}

function admin_current_menu_context(): string
{
    $path = strtolower((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH));
    if (str_contains($path, '/dashboard/')) {
        return admin_dashboard_view_menu_context();
    }
    if (str_contains($path, '/affiliate-profile/')) {
        return 'affiliate-profiles';
    }
    if (str_contains($path, '/affiliate-profiles/')) {
        return 'affiliate-profiles';
    }
    if (str_contains($path, '/affiliate-program/')) {
        return 'affiliates';
    }
    if (str_contains($path, '/partner-profile/')) {
        return 'partner-profiles';
    }
    if (str_contains($path, '/partner-profiles/')) {
        return 'partner-profiles';
    }
    if (str_contains($path, '/partner-program/')) {
        return 'partners';
    }
    if (str_contains($path, '/back-dash/')) {
        return 'back-dash';
    }
    if (str_contains($path, '/api-health/')) {
        return 'api';
    }
    if (str_contains($path, '/sku-db/')) {
        return 'sku-db';
    }
    if (str_contains($path, '/profit-loss/')) {
        return 'profit-loss';
    }

    return 'overview';
}

function admin_quick_menu_keys_for_context(string $context): array
{
    $context = admin_normalize_quick_menu_context($context);
    $contextMap = admin_quick_menu_context_map();

    return $contextMap[$context] ?? $contextMap['overview'];
}

function admin_favicon_assets(): array
{
    return [
        'home' => [
            'light' => '/assets/admin-icons/executive-dashboard-favicon-light.svg',
            'dark' => '/assets/admin-icons/executive-dashboard-favicon-dark.svg',
        ],
        'settings' => [
            'light' => '/assets/admin-icons/favicon-settings-light.svg',
            'dark' => '/assets/admin-icons/favicon-settings-dark.svg',
        ],
        'sku-db' => [
            'light' => '/assets/admin-icons/favicon-sku-db-light.svg',
            'dark' => '/assets/admin-icons/favicon-sku-db-dark.svg',
        ],
        'api' => [
            'light' => '/assets/admin-icons/favicon-api-light.svg',
            'dark' => '/assets/admin-icons/favicon-api-dark.svg',
        ],
        'partners' => [
            'light' => '/assets/admin-icons/favicon-partners-light.svg',
            'dark' => '/assets/admin-icons/favicon-partners-dark.svg',
        ],
        'affiliates' => [
            'light' => '/assets/admin-icons/favicon-affiliates-light.svg',
            'dark' => '/assets/admin-icons/favicon-affiliates-dark.svg',
        ],
        'hard-set' => [
            'light' => '/assets/admin-icons/favicon-hard-set-light.svg',
            'dark' => '/assets/admin-icons/favicon-hard-set-dark.svg',
        ],
        'website' => [
            'light' => '/assets/admin-icons/favicon-website-light.svg',
            'dark' => '/assets/admin-icons/favicon-website-dark.svg',
        ],
        'campaigns' => [
            'light' => '/assets/admin-icons/favicon-campaigns-light.svg',
            'dark' => '/assets/admin-icons/favicon-campaigns-dark.svg',
        ],
        'orders' => [
            'light' => '/assets/admin-icons/favicon-orders-ops-light.svg',
            'dark' => '/assets/admin-icons/favicon-orders-ops-dark.svg',
        ],
        'profit-loss' => [
            'light' => '/assets/admin-icons/favicon-profit-loss-light.svg',
            'dark' => '/assets/admin-icons/favicon-profit-loss-dark.svg',
        ],
        'back-dash' => [
            'light' => '/assets/admin-icons/favicon-back-dash-light.svg',
            'dark' => '/assets/admin-icons/favicon-back-dash-dark.svg',
        ],
    ];
}

function admin_normalize_favicon_key(string $key): string
{
    $normalized = strtolower(trim($key));
    $aliases = [
        '' => 'home',
        'overview' => 'home',
        'homepage' => 'home',
        'dashboard' => 'home',
        'daily' => 'home',
        'context' => 'home',
        'store-ops' => 'orders',
        'ops' => 'orders',
        'affiliate' => 'affiliates',
        'affiliate-program' => 'affiliates',
        'affiliate-profile' => 'affiliates',
        'affiliate-profiles' => 'affiliates',
        'partner' => 'partners',
        'partner-program' => 'partners',
        'partner-profile' => 'partners',
        'partner-profiles' => 'partners',
        'api-health' => 'api',
        'sku' => 'sku-db',
        'p&l' => 'profit-loss',
        'profit-and-loss' => 'profit-loss',
    ];
    $key = $aliases[$normalized] ?? $normalized;

    return array_key_exists($key, admin_favicon_assets()) ? $key : 'home';
}

function admin_dashboard_view_favicon_key(): string
{
    $requestedView = strtolower(trim((string) ($_GET['view'] ?? 'overview')));
    $aliases = [
        '' => 'home',
        'overview' => 'home',
        'executive' => 'home',
        'homepage' => 'home',
        'daily' => 'home',
        'orders' => 'orders',
        'store-ops' => 'orders',
        'home' => 'campaigns',
        'campaign' => 'campaigns',
        'campaigns' => 'campaigns',
        'context' => 'home',
        'website' => 'website',
        'hardset' => 'hard-set',
        'hard-set' => 'hard-set',
        'settings' => 'settings',
    ];

    return $aliases[$requestedView] ?? 'home';
}

function render_admin_favicons(string $pageKey = 'home'): void
{
    $assets = admin_favicon_assets()[admin_normalize_favicon_key($pageKey)] ?? admin_favicon_assets()['home'];
    echo '    <link rel="icon" type="image/svg+xml" href="' . htmlspecialchars($assets['light'], ENT_QUOTES, 'UTF-8') . '" media="(prefers-color-scheme: light)" data-admin-favicon="light">' . "\n";
    echo '    <link rel="icon" type="image/svg+xml" href="' . htmlspecialchars($assets['dark'], ENT_QUOTES, 'UTF-8') . '" media="(prefers-color-scheme: dark)" data-admin-favicon="dark">' . "\n";
}

function render_admin_sidebar(string $activeSection = ''): void
{
    $activeSection = strtolower(trim($activeSection));
    $items = [
        [
            'key' => 'home',
            'href' => '../dashboard/?view=overview',
            'label' => 'Home',
            'icon' => 'admin-rail-icon-home',
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
            'key' => 'orders',
            'href' => '../dashboard/?view=orders',
            'label' => 'Orders',
            'icon' => 'admin-rail-icon-orders',
            'aria' => 'Open marketplace orders',
            'view' => 'orders',
        ],
        [
            'key' => 'website',
            'href' => '../dashboard/?view=website',
            'label' => 'Website',
            'icon' => 'admin-rail-icon-globe',
            'aria' => 'Open website dashboard',
            'view' => 'website',
        ],
        [
            'key' => 'profit-loss',
            'href' => '../profit-loss/',
            'label' => 'P&L',
            'icon' => 'admin-rail-icon-profit-loss',
            'aria' => 'Open profit and loss workspace',
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
            'href' => '../api-health/',
            'label' => 'API',
            'icon' => 'admin-rail-icon-api',
            'aria' => 'Open API health dashboard',
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
    echo '<a class="admin-rail-brand" href="../dashboard/?view=overview" aria-label="Executive Dashboard home">';
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
        'data-nav-label="' . htmlspecialchars((string) ($item['label'] ?? ''), ENT_QUOTES, 'UTF-8') . '"',
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

function render_admin_topbar_actions(string $menuContext = ''): void
{
    echo '<div class="admin-topbar-actions" data-admin-home-chrome>';
    render_admin_topbar_action_buttons($menuContext);
    echo '</div>';
}

function render_admin_topbar_action_buttons(string $menuContext = ''): void
{
    $menuContext = $menuContext === '' ? admin_current_menu_context() : $menuContext;
    echo '<div class="admin-search-shell admin-search-shell-topbar" data-dashboard-search-shell data-admin-chrome data-website-orders-endpoint="../api/website-orders/">';
    echo '<div class="admin-search-surface" aria-hidden="true">';
    echo '<div class="admin-search-surface-glow"></div>';
    echo '<div class="admin-search-topline"></div>';
    echo '</div>';
    echo '<div class="admin-search-sweep" aria-hidden="true"></div>';
    echo '<button type="button" class="admin-search-icon-button" data-dashboard-search-open aria-label="Open dashboard search" aria-expanded="false">';
    echo '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4.5 4.5"/></svg>';
    echo '</button>';
    echo '<form class="admin-search-form" data-dashboard-search-form role="search" aria-label="Search Executive Dashboard">';
    echo '<input type="search" class="admin-search-input" data-dashboard-search-input placeholder="Search" autocomplete="off">';
    echo '</form>';
    echo '<button type="button" class="admin-search-close-button" data-dashboard-search-close aria-label="Close dashboard search">';
    echo '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    echo '</button>';
    echo '<div class="admin-search-focus-ring" aria-hidden="true"></div>';
    echo '<div class="admin-search-results" data-dashboard-search-results hidden></div>';
    echo '</div>';

    echo '<button type="button" class="admin-notification-button" data-notification-toggle aria-label="Open website order notifications" aria-expanded="false">';
    echo '<span class="admin-notification-button-icon">';
    echo '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
    echo '<span data-notification-count hidden>0</span>';
    echo '</span>';
    echo '<span class="admin-notification-button-copy"><strong>Order verification</strong><small data-notification-summary>No website orders pending</small></span>';
    echo '</button>';

    echo '<div class="admin-menu-shell" data-menu-shell>';
    echo '<button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">';
    echo '<svg class="admin-menu-open-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    echo '<svg class="admin-menu-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    echo '</button>';
    echo '<div class="admin-menu-panel" data-menu-panel aria-label="Executive Dashboard navigation" hidden>';

    render_admin_topbar_menu_items($menuContext);
    echo '</div>';
    echo '</div>';
}

function render_admin_topbar_menu_items(string $menuContext): void
{
    $definitions = admin_quick_menu_definitions();
    foreach (admin_quick_menu_keys_for_context($menuContext) as $key) {
        if (!isset($definitions[$key])) {
            continue;
        }
        render_admin_topbar_menu_item($definitions[$key]);
    }
}

function render_admin_dashboard_topbar_menu_items(string $initialContext = ''): void
{
    $initialContext = admin_normalize_quick_menu_context($initialContext);
    $definitions = admin_quick_menu_definitions();
    $contextMap = admin_quick_menu_context_map();
    $orderedKeys = admin_quick_menu_keys_for_context($initialContext);
    foreach ($contextMap as $keys) {
        foreach ($keys as $key) {
            if (!in_array($key, $orderedKeys, true)) {
                $orderedKeys[] = $key;
            }
        }
    }

    foreach ($orderedKeys as $key) {
        if (!isset($definitions[$key])) {
            continue;
        }
        $contexts = [];
        foreach ($contextMap as $context => $keys) {
            if (in_array($key, $keys, true)) {
                $contexts[] = $context;
            }
        }
        render_admin_topbar_menu_item($definitions[$key], [
            'as_button' => isset($definitions[$key]['view']),
            'hidden' => !in_array($initialContext, $contexts, true),
            'attributes' => [
                'data-quick-menu-key' => $key,
                'data-quick-menu-contexts' => implode(' ', $contexts),
            ],
        ]);
    }
}

function render_admin_topbar_menu_item(array $item, array $options = []): void
{
    $asButton = (bool) ($options['as_button'] ?? false);
    $href = htmlspecialchars((string) ($item['href'] ?? '../dashboard/?view=overview'), ENT_QUOTES, 'UTF-8');
    $label = htmlspecialchars((string) ($item['label'] ?? ''), ENT_QUOTES, 'UTF-8');
    $description = htmlspecialchars((string) ($item['description'] ?? ''), ENT_QUOTES, 'UTF-8');
    $view = trim((string) ($item['view'] ?? ''));
    $viewAttribute = $view !== '' && !$asButton
        ? ' data-dashboard-view-link="' . htmlspecialchars($view, ENT_QUOTES, 'UTF-8') . '"'
        : '';
    $attributes = $options['attributes'] ?? [];
    $extraAttributes = [];
    foreach ($attributes as $name => $value) {
        $extraAttributes[] = htmlspecialchars((string) $name, ENT_QUOTES, 'UTF-8') . '="' . htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8') . '"';
    }
    if (!empty($options['hidden'])) {
        $extraAttributes[] = 'hidden';
    }

    if ($asButton) {
        $buttonView = $view !== '' ? $view : 'overview';
        echo '<button type="button" class="admin-menu-item" data-view-switch="' . htmlspecialchars($buttonView, ENT_QUOTES, 'UTF-8') . '" ' . implode(' ', $extraAttributes) . '>';
    } else {
        echo '<a class="admin-menu-item admin-link-btn" href="' . $href . '"' . $viewAttribute . ($extraAttributes ? ' ' . implode(' ', $extraAttributes) : '') . '>';
    }
    echo '<span class="admin-menu-icon" aria-hidden="true">' . admin_topbar_menu_icon((string) ($item['icon'] ?? 'home')) . '</span>';
    echo '<span><strong>' . $label . '</strong><small>' . $description . '</small></span>';
    echo $asButton ? '</button>' : '</a>';
}

function admin_topbar_menu_icon(string $icon): string
{
    $icons = [
        'home' => '<svg viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
        'calendar' => '<svg viewBox="0 0 24 24"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>',
        'orders' => '<svg viewBox="0 0 24 24"><path d="M13 16H8"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/></svg>',
        'campaigns' => '<svg viewBox="0 0 24 24"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/><path d="M8 6v8"/></svg>',
        'profit-loss' => '<svg viewBox="0 0 24 24"><path d="M12 16v5"/><path d="M16 14.639V21"/><path d="M20 10.656V21"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/><path d="M4 18.463V21"/><path d="M8 14.656V21"/></svg>',
        'back-dash' => '<svg viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
        'context' => '<svg viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
        'website' => '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
        'hard-set' => '<svg viewBox="0 0 24 24"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>',
        'affiliate' => '<svg viewBox="0 0 24 24"><path d="M18 18.72a9 9 0 0 0 3-6.72 9 9 0 1 0-18 0 9 9 0 0 0 3 6.72"/><path d="M7 20c1.2-2 2.9-3 5-3s3.8 1 5 3"/><circle cx="12" cy="10" r="3"/></svg>',
        'users' => '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        'partner' => '<svg viewBox="0 0 24 24"><path d="m11 17 2 2a2.8 2.8 0 0 0 4 0l3-3a2.8 2.8 0 0 0 0-4l-1-1"/><path d="m13 7-2-2a2.8 2.8 0 0 0-4 0L4 8a2.8 2.8 0 0 0 0 4l1 1"/><path d="m8 12 8-8"/><path d="m16 12-8 8"/></svg>',
        'api' => '<svg viewBox="0 0 24 24"><path d="M22 12h-4"/><path d="M6 12H2"/><path d="M12 6V2"/><path d="M12 22v-4"/><circle cx="12" cy="12" r="4"/><path d="m16.24 7.76 2.83-2.83"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M4.93 4.93 7.76 7.76"/></svg>',
        'sku' => '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>',
        'settings' => '<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>',
        'theme' => '<svg viewBox="0 0 24 24"><path d="M12 3a6.5 6.5 0 1 0 9 9 8 8 0 1 1-9-9z"/></svg>',
        'lock' => '<svg viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    ];

    return $icons[$icon] ?? $icons['home'];
}

function render_admin_notification_drawer(): void
{
    echo '<aside class="admin-notification-drawer" data-notification-drawer role="dialog" aria-label="Website order verification" aria-hidden="true">';
    echo '<div class="admin-notification-head">';
    echo '<div class="admin-notification-head-main">';
    echo '<button type="button" class="admin-notification-round-btn admin-notification-back" data-notification-back aria-label="Back to website orders" hidden>';
    echo '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    echo '</button>';
    echo '<span class="admin-notification-store-icon" aria-hidden="true">';
    echo '<svg viewBox="0 0 24 24"><path d="M4 9h16l-1.5-5h-13zM5 9v11h14V9M9 20v-6h6v6"/><path d="M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0"/></svg>';
    echo '</span>';
    echo '<div><h2>Website orders</h2><p class="admin-notification-mode" data-notification-mode>Loading Hard Set state...</p></div>';
    echo '</div>';
    echo '<button type="button" class="admin-orders-icon-btn" data-notification-close aria-label="Close notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    echo '</div>';
    echo '<div class="admin-notification-list" data-notification-list aria-live="polite"><p class="admin-empty">Loading website orders...</p></div>';
    echo '</aside>';
    echo '<div class="admin-notification-backdrop" data-notification-backdrop hidden></div>';
}

function render_admin_chrome_script(string $prefix = '../'): void
{
    $version = (string) @filemtime(__DIR__ . '/admin-chrome.js');
    $src = $prefix . 'admin-chrome.js?v=' . rawurlencode($version ?: '1');
    echo '<script type="module" src="' . htmlspecialchars($src, ENT_QUOTES, 'UTF-8') . '"></script>';
}
