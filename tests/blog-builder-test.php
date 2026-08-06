<?php
declare(strict_types=1);

require dirname(__DIR__) . '/blog-builder-bootstrap.php';

function blog_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

blog_expect(
    ['healthy-eating', 'keeping-fit', 'losing-weight', 'diabetes-remission'],
    array_keys(jg_blog_topics()),
    'The editorial taxonomy must expose exactly the four approved ZERO topics.'
);
blog_expect('makan-sehat-untuk-keluarga', jg_blog_slugify('Makan Sehat untuk Keluarga!'), 'Slugs should be URL safe.');
blog_expect('untitled-article', jg_blog_slugify('---'), 'Empty slugs need a stable fallback.');
blog_expect('2026-08-07 02:30:00', jg_blog_parse_wib_datetime('2026-08-07T09:30'), 'WIB schedules must persist as UTC.');
blog_expect('2026-08-07T09:30', jg_blog_wib_value('2026-08-07 02:30:00'), 'UTC schedules must return to the editor as WIB.');

$unsafeHtml = '<div onclick="steal()"><script>alert(1)</script><h2 style="color:red">Useful heading</h2><p>Hello <strong>reader</strong> <a href="javascript:alert(1)" onmouseover="bad()">bad</a> <a href="https://zerofoods.id/path">good</a>.</p></div>';
$safeHtml = jg_blog_sanitize_html($unsafeHtml);
blog_expect(false, str_contains($safeHtml, '<script'), 'Script nodes inside unwrapped containers must be removed.');
blog_expect(false, str_contains($safeHtml, 'onclick'), 'Event handlers must be removed.');
blog_expect(false, str_contains($safeHtml, 'javascript:'), 'Unsafe link protocols must be removed.');
blog_expect(true, str_contains($safeHtml, 'href="https://zerofoods.id/path"'), 'Safe links should remain available.');
blog_expect(true, str_contains($safeHtml, '<h2>Useful heading</h2>'), 'Supported editorial headings should be preserved.');

blog_expect(6, jg_blog_word_count('ZERO helps people eat better today.'), 'Word counting should support reading-time estimates.');

$body = '<p>' . implode(' ', array_fill(0, 105, 'helpful')) . '</p>';
$scheduled = jg_blog_validate_payload([
    'id' => 4,
    'title' => 'A practical guide to eating less sugar',
    'excerpt' => 'Simple, useful steps that make lower-sugar eating easier every day.',
    'body_html' => $body,
    'topic' => 'healthy-eating',
    'status' => 'scheduled',
    'author' => 'ZERO Editorial',
    'scheduled_at' => '2030-08-07T09:30',
]);
blog_expect('scheduled', $scheduled['status'], 'Complete articles should be schedulable.');
blog_expect(105, jg_blog_word_count($scheduled['body_text']), 'Sanitized article text should retain its words.');

$invalidTopicRejected = false;
try {
    jg_blog_validate_payload(['topic' => 'recipes', 'status' => 'draft']);
} catch (InvalidArgumentException) {
    $invalidTopicRejected = true;
}
blog_expect(true, $invalidTopicRejected, 'Unapproved topics must be rejected server-side.');

$incompleteScheduleRejected = false;
try {
    jg_blog_validate_payload([
        'title' => 'Short',
        'topic' => 'keeping-fit',
        'status' => 'scheduled',
        'scheduled_at' => '2030-08-07T09:30',
    ]);
} catch (InvalidArgumentException) {
    $incompleteScheduleRejected = true;
}
blog_expect(true, $incompleteScheduleRejected, 'Incomplete articles must not enter the schedule queue.');

$readyRow = ['status' => 'scheduled', 'scheduled_at' => '2020-01-01 00:00:00'];
blog_expect('ready', jg_blog_effective_state($readyRow), 'Elapsed schedules should become ready without claiming public publication.');
blog_expect(
    ['total' => 2, 'draft' => 1, 'in_review' => 0, 'scheduled' => 0, 'ready' => 1, 'archived' => 0],
    jg_blog_stats([['status' => 'draft', 'effective_status' => 'draft'], ['status' => 'scheduled', 'effective_status' => 'ready']]),
    'Editorial counts should distinguish scheduled and ready queue items.'
);

echo "blog builder tests passed\n";
