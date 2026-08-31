<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function jg_marketplace_auth_base_url(): string
{
    $url = jg_dashboard_marketplace_api_base_url();
    $parts = parse_url($url);
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));
    $localHttp = $scheme === 'http' && in_array($host, ['127.0.0.1', 'localhost', '::1'], true);
    if (($scheme !== 'https' && !$localHttp) || $host === '') {
        throw new RuntimeException('Marketplace API URL must use HTTPS.');
    }
    return rtrim($url, '/');
}

/**
 * @param array<string,mixed> $body
 * @return array{status:int,payload:array<string,mixed>}
 */
function jg_marketplace_auth_upstream(string $method, string $path, array $body = []): array
{
    $token = jg_dashboard_marketplace_api_setup_token();
    if ($token === '') {
        throw new RuntimeException('Marketplace API authentication is not configured.');
    }

    $method = strtoupper($method);
    if (!in_array($method, ['GET', 'POST'], true)) {
        throw new RuntimeException('Unsupported marketplace authorization request method.');
    }
    if (!in_array($path, ['/shopee/auth/dashboard/status', '/shopee/auth/dashboard/session'], true)) {
        throw new RuntimeException('Unsupported marketplace authorization request path.');
    }

    $url = jg_marketplace_auth_base_url() . $path;
    $json = $body === [] ? '' : json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($body !== [] && !is_string($json)) {
        throw new RuntimeException('Unable to encode marketplace authorization request.');
    }
    $headers = [
        'Accept: application/json',
        'Authorization: Bearer ' . $token,
        'X-JG-API-Token: ' . $token,
    ];
    if ($json !== '') {
        $headers[] = 'Content-Type: application/json';
    }

    $response = '';
    $status = 0;
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        if ($curl === false) {
            throw new RuntimeException('Unable to initialize marketplace authorization request.');
        }
        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_MAXREDIRS => 0,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ]);
        if ($json !== '') {
            curl_setopt($curl, CURLOPT_POSTFIELDS, $json);
        }
        $raw = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        if (!is_string($raw)) {
            throw new RuntimeException($error !== '' ? $error : 'Marketplace authorization API is unavailable.');
        }
        $response = $raw;
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => $method,
                'header' => implode("\r\n", $headers) . "\r\n",
                'content' => $json,
                'timeout' => 20,
                'ignore_errors' => true,
                'follow_location' => 0,
            ],
        ]);
        $raw = @file_get_contents($url, false, $context);
        if (!is_string($raw)) {
            throw new RuntimeException('Marketplace authorization API is unavailable.');
        }
        $response = $raw;
        foreach (($http_response_header ?? []) as $header) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $header, $match) === 1) {
                $status = (int) $match[1];
                break;
            }
        }
    }

    $payload = json_decode($response, true);
    if (!is_array($payload)) {
        throw new RuntimeException('Marketplace authorization API returned an invalid response.');
    }

    return [
        'status' => $status > 0 ? $status : 502,
        'payload' => $payload,
    ];
}
