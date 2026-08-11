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

$imageHtml = jg_blog_sanitize_html('<figure class="bad" data-scale="70" data-shape="square"><img src="/api/blogs/?action=asset&amp;id=42" alt="Healthy plate" onerror="bad()"><figcaption>A balanced lunch</figcaption></figure><img src="https://example.com/tracker.gif">');
blog_expect(true, str_contains($imageHtml, 'src="/api/blogs/?action=asset&amp;id=42"'), 'Uploaded inline article images should be preserved.');
blog_expect(true, str_contains($imageHtml, '<figcaption>A balanced lunch</figcaption>'), 'Inline image captions should be preserved.');
blog_expect(true, str_contains($imageHtml, 'data-scale="70"'), 'Validated inline image scale should be preserved.');
blog_expect(true, str_contains($imageHtml, 'data-shape="square"'), 'Validated inline image shape should be preserved.');
blog_expect(false, str_contains($imageHtml, 'onerror'), 'Inline images must not retain event attributes.');
blog_expect(false, str_contains($imageHtml, 'tracker.gif'), 'External image sources must be rejected.');

$croppedImageHtml = jg_blog_sanitize_html('<figure data-width="52" data-align="left" data-aspect="1.7778" data-crop-top="5" data-crop-right="12.5" data-crop-bottom="10" data-crop-left="7.5" style="position:fixed"><div data-image-frame><img src="/api/blogs/?action=asset&amp;id=42" alt="Healthy plate"></div><figcaption>Wrapped image</figcaption></figure>');
blog_expect(true, str_contains($croppedImageHtml, 'data-width="52"'), 'Direct image widths should survive sanitization.');
blog_expect(true, str_contains($croppedImageHtml, 'data-align="left"'), 'Image text-flow alignment should survive sanitization.');
blog_expect(true, str_contains($croppedImageHtml, 'data-crop-right="12.5"'), 'Precise crop edges should survive sanitization.');
blog_expect(true, str_contains($croppedImageHtml, 'data-image-frame'), 'The safe crop viewport should survive sanitization.');
blog_expect(false, str_contains($croppedImageHtml, 'position:fixed'), 'Authored image styles must be replaced by validated geometry.');
blog_expect(true, str_contains($croppedImageHtml, '--figure-width:52%'), 'Validated image geometry should be emitted for public previews.');

$shareToken = str_repeat('a', 64);
blog_expect(true, jg_blog_valid_share_token($shareToken), 'Private preview tokens must use a full 256 bits of hex data.');
blog_expect(false, jg_blog_valid_share_token('short-token'), 'Malformed private preview tokens must be rejected.');
$publicImageHtml = jg_blog_public_body_html($imageHtml, $shareToken);
blog_expect(true, str_contains($publicImageHtml, '/blog-preview/asset.php?token=' . $shareToken . '&amp;id=42'), 'Shared previews must use token-protected image URLs.');

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
blog_expect('editorial', $scheduled['font_key'], 'Articles should use the ZERO Editorial font by default.');
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
