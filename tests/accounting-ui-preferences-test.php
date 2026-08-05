<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function preferences_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_ui_preferences (preference_key TEXT PRIMARY KEY, preference_json TEXT NOT NULL, updated_at TEXT NOT NULL)');

$defaults = jg_accounting_ui_preferences($pdo);
preferences_expect('Liquid assets', $defaults['terms']['liquid_assets'] ?? null, 'Default accounting terminology must remain available.');
preferences_expect('Shopee', $defaults['lists']['channels'][1]['label'] ?? null, 'Default dropdown choices must remain available.');

$saved = jg_accounting_save_ui_preferences($pdo, [
    'preferences' => [
        'terms' => ['liquid_assets' => 'Ready + incoming money'],
        'lists' => [
            'channels' => [
                ['value' => 'Wholesale', 'label' => 'Wholesale partners', 'active' => true],
                ['value' => 'Offline', 'label' => 'Store', 'active' => false],
            ],
        ],
    ],
]);
preferences_expect('Ready + incoming money', $saved['preferences']['terms']['liquid_assets'] ?? null, 'Terminology changes must be saved.');
preferences_expect(false, $saved['preferences']['lists']['channels'][1]['active'] ?? null, 'Archived dropdown choices must stay archived.');

$reloaded = jg_accounting_ui_preferences($pdo);
preferences_expect('Ready + incoming money', $reloaded['terms']['liquid_assets'] ?? null, 'Accounting preferences must survive a reload.');
preferences_expect('Expense paid', $reloaded['lists']['entry_types'][0]['label'] ?? null, 'Saving one list must preserve every other dropdown group.');

fwrite(STDOUT, "accounting-ui-preferences-test: ok\n");
