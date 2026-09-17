const assert = require('node:assert/strict');
const s = require('../shipment-schedule');
const now = new Date('2026-09-17T03:00:00Z'); // 10:00 WIB, independent of browser timezone.
const at = (hours, day = '17') => `2026-09-${day}T${String(hours).padStart(2, '0')}:00:00+07:00`;
const order = (id, values = {}) => ({ platform: 'shopee', account_key: 'zero-shopee', order_id: id, package_id: id,
  marketplace_status: 'PROCESSED', ship_by_at: at(23, '19'), handover_method: 'PICKUP', shipping_provider_name: 'J&T',
  pickup_start_at: at(11), pickup_end_at: at(13), label_ready: false, is_processed: false, ...values });
const classify = values => s.classify(order('test', values), now);
assert.equal(classify({}).key, 'soon', 'Approaching pickup matters even when ship-by is several days away.');
assert.equal(classify({ pickup_start_at: at(9) }).key, 'open');
assert.equal(classify({ pickup_start_at: at(8), pickup_end_at: at(10) }).key, 'missed', 'The end boundary is overdue.');
assert.equal(classify({ ship_by_at: at(10) }).key, 'overdue');
assert.equal(classify({ ship_by_at: at(12) }).key, 'due');
assert.equal(classify({ pickup_start_at: at(17), pickup_end_at: at(18) }).key, 'scheduled');
assert.equal(classify({ pickup_start_at: at(9), pickup_end_at: null }).key, 'open');
assert.equal(s.window(order('x', { pickup_end_at: null })).end, null, 'Never invent an end time.');
assert.equal(s.window(order('x', { pickup_end_at: at(8) })).end, null);
assert.equal(classify({ pickup_start_at: null, pickup_end_at: null, ship_by_at: null }).key, 'unbooked');
assert.equal(classify({ pickup_start_at: null, shipment_arranged: true }).key, 'unknown');
assert.equal(classify({ handover_method: 'DROP_OFF' }).key, 'dropoff', 'A drop-off is never shown as a courier window.');
assert.equal(classify({ marketplace_status: 'IN_CANCEL', ship_by_at: at(8) }).label, 'Cancellation pending');
assert.equal(classify({ last_error: 'Temporary failure', pickup_start_at: at(17) }).key, 'review');
assert.equal(classify({ pickup_confirmed: true, ship_by_at: at(5) }).key, 'complete');
assert.equal(s.confirmed(order('x', { is_processed: true, label_ready: true })), false, 'Prepared is not picked up.');
assert.equal(s.prepared(order('x', { is_processed: '1' })), true);
assert.equal(s.preparation(order('x', { label_ready: true })), 'Label ready · prepare order');
assert.equal(s.preparation(order('x', { is_processed: true, label_ready: false })), 'Prepared', 'Disposed labels must not make prepared orders look unfinished.');
assert.equal(s.confirmed(order('x', { marketplace_package_status: 'SHIPPED' })), true);
assert.equal(s.confirmed(order('x', { marketplace_status: 'IN_TRANSIT' })), false, 'Shopee in-transit alone is not authoritative.');
assert.equal(s.confirmed(order('x', { platform: 'tiktok', marketplace_status: 'IN_TRANSIT' })), true);
assert.equal(s.confirmed(order('x', { marketplace_status: 'CANCELLED', pickup_confirmed: true })), false);
assert.equal(s.parse('2026-09-17 03:00:00').toISOString(), now.toISOString());
assert.equal(s.parse('2026-09-17T10:00:00+0700').toISOString(), now.toISOString());
assert.equal(s.parse('invalid'), null);
assert.equal(s.dayKey(new Date('2026-09-16T18:00:00Z')), '2026-09-17');
for (const terminal of ['CANCEL', 'REFUNDED', 'RETURNED', 'REJECTED', 'FAILED', 'EXPIRED', 'CLOSED', 'TO_RETURN']) {
  assert.equal(s.excluded(order('terminal', {marketplace_status: terminal})), true);
}
const fixtures = [
  order('upcoming'), order('partial', { pickup_confirmed: true, pickup_confirmed_at: at(9) }),
  order('old-missed', { pickup_start_at: at(9, '15'), pickup_end_at: at(11, '15'), ship_by_at: at(18, '16') }),
  order('missing-times', { pickup_start_at: null, pickup_end_at: null, ship_by_at: null }),
  order('other-carrier', { shipping_provider_name: 'SPX' }),
  order('other-shop', { account_key: 'jenang-gemi-shopee' }),
  order('cancelled', { marketplace_status: 'CANCELLED' }), order('unpaid', { marketplace_status: 'UNPAID' }),
  order('tomorrow', { pickup_start_at: at(10, '18'), pickup_end_at: at(12, '18') }),
  order('overnight', { pickup_start_at: at(23, '16'), pickup_end_at: at(11) }),
  order('prepared-only', { is_processed: true }),
];
let model = s.build(fixtures, { now });
assert.equal(model.groups.length, 4, 'Keep courier and shop windows separate; overnight windows overlap the day.');
const group = model.groups.find(g => g.orders.some(o => o.order_id === 'upcoming'));
assert.equal(group.pickedUp, 1); assert.equal(group.pending, 2); assert.equal(group.prepared, 1);
assert.deepEqual(model.counts, { attention: 2, soon: 5, pending: 8, complete: 1 });
assert(model.other.some(o => o.order_id === 'old-missed'), 'Older missed handovers remain visible indefinitely.');
assert(model.other.some(o => o.order_id === 'missing-times'));
assert(model.other.some(o => o.order_id === 'tomorrow'), 'Later bookings remain inspectable.');
assert.equal(s.build([...fixtures, fixtures[0]], { now }).counts.pending, 8, 'Deduplicate page overlap by package identity.');
model = s.build(fixtures, { now, filter: 'attention' });
assert.equal(model.groups.length, 0); assert.equal(model.other.length, 2);
model = s.build(fixtures, { now, filter: 'complete' });
assert.equal(model.groups.length, 1); assert.equal(model.groups[0].orders.length, 3, 'Keep group progress truthful under filters.');
model = s.build(fixtures, { now, query: 'old-missed' });
assert.equal(model.other.length, 1); assert.equal(model.counts.pending, 1);
model = s.build(fixtures, { now, account: 'shopee|jenang-gemi-shopee' });
assert.equal(model.groups.length, 1); assert.equal(model.counts.pending, 1);
model = s.build(fixtures, { now, day: '2026-09-18' });
assert.equal(model.groups.length, 1); assert.equal(model.groups[0].orders[0].order_id, 'tomorrow');
assert(model.other.some(o => o.order_id === 'old-missed'), 'Changing date does not hide unresolved misses.');
console.log('Shipment schedule: classification, missing times, preparation, partial collection, filters, grouping, old misses and WIB boundaries passed.');
