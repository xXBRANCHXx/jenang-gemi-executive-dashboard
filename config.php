<?php
declare(strict_types=1);

function jg_dashboard_load_local_config(): array
{
    static $config = null;

    if (is_array($config)) {
        return $config;
    }

    $config = [];
    $configFiles = [
        __DIR__ . '/config.local.php',
        '/public_html/config.local.php',
    ];

    foreach ($configFiles as $configFile) {
        if (!file_exists($configFile)) {
            continue;
        }

        $loaded = require $configFile;
        if (is_array($loaded)) {
            $config = array_merge($config, $loaded);
        }
    }

    return $config;
}

function jg_dashboard_env_value(string $key): string
{
    $value = getenv($key);
    if (is_string($value) && trim($value) !== '') {
        return trim($value);
    }

    $serverValue = $_SERVER[$key] ?? null;
    if (is_string($serverValue) && trim($serverValue) !== '') {
        return trim($serverValue);
    }

    $envValue = $_ENV[$key] ?? null;
    if (is_string($envValue) && trim($envValue) !== '') {
        return trim($envValue);
    }

    return '';
}

function jg_dashboard_upstream_base_url(): string
{
    $config = jg_dashboard_load_local_config();

    $baseUrl = jg_dashboard_env_value('JG_ANALYTICS_BASE_URL')
        ?: jg_dashboard_env_value('JG_PRIMARY_SITE_URL')
        ?: trim((string) ($config['analytics_base_url'] ?? ''))
        ?: trim((string) ($config['primary_site_url'] ?? ''))
        ?: 'https://jenanggemi.com';

    return rtrim($baseUrl, '/');
}

function jg_dashboard_upstream_url(string $path): string
{
    return jg_dashboard_upstream_base_url() . '/' . ltrim($path, '/');
}
