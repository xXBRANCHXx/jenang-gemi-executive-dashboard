# ZERO Commerce Sandbox Setup

This integration keeps Biteship and Duitku credentials on
`admin.jenanggemi.com`. The Official ZERO website only calls the public,
sanitized ZERO commerce routes.

## Flow

1. Browser searches `GET /api/zero-commerce/?action=areas`.
2. ZERO server calls Biteship `GET /v1/maps/areas`.
3. Browser requests `POST /api/zero-commerce/?action=rates`.
4. ZERO server validates SKUs, prices, vouchers, and configured weights, then
   calls Biteship `POST /v1/rates/couriers`.
5. Browser selects a signed 15-minute quote and requests
   `POST /api/zero-commerce/?action=checkout`.
6. ZERO server creates the website order and calls Duitku POP
   `POST /api/merchant/createInvoice`.
7. Duitku posts the verified payment result to
   `POST /api/zero-commerce/?action=duitku_callback`.
8. Only after a valid paid callback, ZERO calls Biteship `POST /v1/orders`.
9. Biteship posts `order.status`, `order.price`, and `order.waybill_id` events to
   `POST /api/zero-commerce/?action=biteship_webhook`.
10. An authenticated admin prints
   `GET /api/zero-commerce/?action=label&order=ORDER_ID` on A5.

Biteship does not provide a shipping-label API. The last endpoint is our own
label renderer built from the Biteship order response.

## Sandbox configuration

Add these values to the ignored deployment-only `config.runtime.php`:

```php
<?php
return [
    'zero_commerce_enabled' => 'true',
    'zero_commerce_mode' => 'sandbox',
    'zero_commerce_signing_secret' => 'generate-a-random-secret-at-least-32-characters',
    'zero_public_site_url' => 'https://zerofoods.id',
    'zero_commerce_api_url' => 'https://admin.jenanggemi.com/api/zero-commerce/',

    'biteship_api_token' => 'biteship_test.REPLACE_ME',
    'biteship_origin_area_id' => 'REPLACE_WITH_BITESHIP_AREA_ID',
    'biteship_origin_contact_name' => 'ZERO Fulfillment',
    'biteship_origin_contact_phone' => 'REPLACE_WITH_PICKUP_PHONE',
    'biteship_origin_address' => 'Jl. Jombor Tegal No.124 A, Sleman, Yogyakarta',
    'biteship_couriers' => 'jne,sicepat,anteraja,jnt,tiki',
    'biteship_webhook_header' => 'X-Zero-Webhook-Secret',
    'biteship_webhook_secret' => 'generate-a-random-webhook-secret',

    'duitku_merchant_code' => 'REPLACE_WITH_SANDBOX_MERCHANT_CODE',
    'duitku_merchant_key' => 'REPLACE_WITH_SANDBOX_MERCHANT_KEY',
    // Optional override. Defaults to Duitku's documented sandbox IPs.
    'duitku_callback_ip_allowlist' => '182.23.85.11,182.23.85.12,103.177.101.187,103.177.101.188',

    // Packed weights in grams. Replace every test estimate after weighing.
    'zero_shipping_weights_json' => json_encode([
        '5ml' => 30,
        '10ml' => 50,
        '30ml' => 100,
        '50ml' => 120,
        '100ml' => 220,
        '250ml' => 480,
        '550ml' => 900,
    ]),
];
```

The weights above are sandbox estimates, not approved production weights.
Weigh each packed SKU or size and replace them before production.

In the Biteship dashboard, add this HTTPS webhook:

```text
URL: https://admin.jenanggemi.com/api/zero-commerce/?action=biteship_webhook
Events: order.status, order.price, order.waybill_id
Headers Signature Key: X-Zero-Webhook-Secret
Headers Signature Secret: the random value in biteship_webhook_secret
```

The Biteship "Key" field is the HTTP header name; its "Secret" field is the
value sent in that header. Set the same header name and secret in
`config.runtime.php`. Use separate secrets for sandbox and production.
The endpoint returns HTTP 200 for Biteship's empty JSON installation probe;
non-empty shipment events still require the configured secret header.

Build the Official ZERO website with:

```dotenv
VITE_ZERO_COMMERCE_ENABLED=true
VITE_ZERO_COMMERCE_API_URL=https://admin.jenanggemi.com/api/zero-commerce/
```

## Sandbox test checklist

- Search at least one destination in Yogyakarta and one outside Java.
- Quote a single small bottle and a multi-bottle/carton order.
- Confirm the displayed total equals products + selected Biteship price.
- Confirm changing cart quantity invalidates the shipping quote.
- Complete a Duitku sandbox success, pending/close, failure, and expiry.
- Confirm the customer return page does not mark a payment paid by itself.
- Confirm one paid callback creates exactly one Biteship test order.
- Retry the same callback and confirm no second shipment is created.
- Replay each Biteship webhook event and confirm status, actual price, and
  waybill update without creating another shipment.
- Print the authenticated label at A5, 100% scale, with browser headers off.
- Scan the Code 128 waybill barcode and compare it to Biteship.
- Ask the test courier/Biteship support to confirm the custom A5 layout is
  accepted; use the dashboard-downloaded label if a courier requires its own
  official template.

## Production gate

Do not switch modes until:

- every packed weight is measured and configured;
- the Biteship live Order API is activated and the account has balance;
- the origin area/contact/address is verified;
- Duitku production verification is complete;
- callback URL is publicly reachable over HTTPS;
- provider credentials are changed to `biteship_live.*` and production Duitku
  credentials;
- sandbox orders, payments, labels, callback retries, and failure recovery have
  passed.

Production mode rejects a test Biteship token and refuses to use fallback
weights.
