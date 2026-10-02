// Original regression tests. SPDX-License-Identifier: MIT
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');
function resolveSkippingChallenge(s, choice) { if (G.travelChallengePending(s)) G.skipChallenge(s); return G.resolve(s, choice); }
function empty() { const s = G.fresh(42); s.rows = 5; s.items = []; s.nextId = 1; s.gold = 1000; return s; }
function insert(s, kind, x, y, rotated = false) { const i = { id: s.nextId++, kind, x, y, rotated, quality: 1 }; assert.ok(G.fits(s, i, x, y)); s.items.push(i); return i; }
function resolveSafely(s) { while (s.phase === 'event') { const options = G.eventInfo(s).choices; const choice = options.find(c => ['commission-claim','barter-keep', 'rest', 'water', 'guard', 'pay', 'leave'].includes(c.id) && G.available(s, c)) || options.find(c => G.available(s, c)); resolveSkippingChallenge(s, choice.id); } }
function arrive(s, destination, route = 'road') { G.depart(s, destination, route); resolveSafely(s); }
test('three distinct offers, prices and forecasts persist across reloads', () => {
  const s = G.fresh(13); assert.equal(s.board.length, 3);
  assert.equal(new Set(s.board.map(o => o.type)).size, 3);
  assert.deepEqual(G.restore(s), G.fresh(13));
  assert.notDeepEqual(G.fresh(14).board, s.board);
});
test('only one order can be accepted per stop; abandoning preserves goods and money', () => {
  const s = G.fresh(1); G.acceptOrder(s, s.board[0].id);
  assert.throws(() => G.acceptOrder(s, s.board[1].id));
  const items = JSON.stringify(s.items), gold = s.gold;
  G.abandonOrder(s); assert.equal(s.gold, gold); assert.equal(JSON.stringify(s.items), items);
  assert.equal(s.failedOrders, 1); assert.throws(() => G.acceptOrder(s, s.board[1].id));
  arrive(s, 1); G.acceptOrder(s, s.board[0].id); assert.ok(s.order);
});
test('orders require destination and a whole shipment, with a single bonus payout', () => {
  const s = empty(); G.acceptOrder(s, s.board[0].id);
  const quantity = s.order.quantity, bonus = s.order.bonus;
  for (let x = 0; x < quantity; x++) insert(s, 'herb', x, 0);
  assert.throws(() => G.deliverOrder(s));
  arrive(s, 1); assert.ok(G.orderStatus(s).ready);
  const sold = s.items[0]; G.sell(s, sold.id);
  assert.equal(s.completedOrders, 0); const raw = JSON.stringify(s);
  assert.throws(() => G.deliverOrder(s)); assert.equal(JSON.stringify(s), raw);
  insert(s, 'herb', sold.x, sold.y); const start = s.gold;
  const receipt = G.deliverOrder(s); assert.equal(receipt.bonus, bonus);
  assert.equal(s.gold, start + receipt.sale + bonus); assert.equal(s.completedOrders, 1);
  assert.equal(s.items.length, 0); assert.throws(() => G.deliverOrder(s));
  assert.ok(G.restore(s));
});
test('deadline includes the stated day; a detour expires an urgent order without taking cargo', () => {
  for (const detour of [false, true]) {
    const s = empty(); G.acceptOrder(s, s.board[2].id);
    for (let x = 0; x < s.order.quantity; x++) insert(s, 'fruit', x, 0);
    s.forecast.trail = 'bandit'; G.depart(s, 1, 'trail');
    resolveSkippingChallenge(s, detour ? 'detour' : 'pay');
    if (detour) { assert.equal(s.order, null); assert.equal(s.failedOrders, 1); assert.ok(s.items.length >= 2); }
    else { assert.equal(s.day, 2); assert.ok(G.orderStatus(s).ready); G.deliverOrder(s); }
    assert.ok(G.restore(s));
  }
});
test('scented tea order requires every delivered tea to touch spice', () => {
  const s = empty(); G.acceptOrder(s, s.board[1].id);
  const quantity = s.order.quantity;
  const tea = [insert(s, 'tea', 0, 0), insert(s, 'tea', 2, 0)];
  if (quantity === 3) tea.push(insert(s, 'tea', 1, 2, true));
  const spice = insert(s, 'spice', 1, 0); arrive(s, 2);
  assert.equal(G.orderStatus(s).count, 2);
  G.move(s, spice.id, 1, 1); assert.ok(G.orderStatus(s).ready);
  tea[0].quality = .99; assert.equal(G.orderStatus(s).ready, false);
  tea[0].quality = 1; G.deliverOrder(s); assert.equal(s.items.length, 1);
});
test('porcelain order requires silk padding even after a safe road trip', () => {
  const s = empty(); arrive(s, 2); G.acceptOrder(s, s.board[0].id);
  const quantity = s.order.quantity;
  const pots = [insert(s, 'porcelain', 0, 0), insert(s, 'porcelain', 3, 0)];
  if (quantity === 3) pots.push(insert(s, 'porcelain', 1, 2, true));
  arrive(s, 0); assert.equal(G.orderStatus(s).ready, false);
  insert(s, 'silk', 1, 0); assert.ok(G.orderStatus(s).ready);
  G.deliverOrder(s); assert.equal(s.items.length, 1);
});
test('equipment sale persists mid-trip and removing ice changes actual arrival quality', () => {
  for (const sell of [false, true]) {
    let s = empty(); const fish = insert(s, 'fish', 0, 0), ice = insert(s, 'ice', 2, 0);
    G.depart(s, 1, 'road'); assert.equal(s.event.key, 'barter');
    assert.equal(fish.quality, 1); const before = s.gold, quote = s.event.offer.price;
    s = G.restore(s); assert.ok(s);
    resolveSkippingChallenge(s, sell ? 'barter-sell' : 'barter-keep');
    assert.equal(s.gold, before + (sell ? quote : 0)); assert.equal(G.has(s, 'ice'), !sell);
    assert.throws(() => resolveSkippingChallenge(s, 'barter-sell')); s = G.restore(s); assert.ok(s);
    resolveSafely(s); assert.equal(s.items.find(i => i.id === fish.id).quality, sell ? .65 : 1);
    assert.ok(G.restore(s));
  }
});
test('selling shield removes guard option in the following encounter', () => {
  const s = empty(); insert(s, 'shield', 0, 0); s.forecast.trail = 'bandit';
  G.depart(s, 1, 'trail'); resolveSkippingChallenge(s, 'barter-sell');
  const guard = G.eventInfo(s).choices.find(c => c.id === 'guard');
  assert.equal(G.available(s, guard), false); assert.throws(() => resolveSkippingChallenge(s, 'guard'));
  resolveSkippingChallenge(s, 'pay'); assert.ok(G.restore(s));
});
test('first-equipment discount is consumed once and cannot profit from immediate resale', () => {
  const s = empty(), kind = s.deal.kind, standard = G.purchasePrice(s, kind), discount = G.buyPrice(s, kind);
  const item = G.buy(s, kind); assert.ok(discount < standard);
  assert.equal(G.buyPrice(s, kind), standard); assert.ok(G.salePrice(s, item) < discount);
  assert.ok(G.restore(s));
});
test('expanding the starting bag costs 45 then 70, and cannot exceed 30 cells', () => {
  const s = G.fresh(1); G.upgrade(s); assert.equal(s.rows, 4); assert.equal(s.gold, 55);
  assert.throws(() => G.upgrade(s)); s.gold = 70; G.upgrade(s);
  assert.equal(s.rows, 5); assert.equal(s.gold, 0); assert.throws(() => G.upgrade(s));
});
test('tampered order bonuses and equipment quotes are rejected', () => {
  const s = empty(); s.board[0].bonus++; assert.equal(G.restore(s), null);
  const t = empty(); insert(t, 'ice', 0, 0); G.depart(t, 1, 'road');
  t.event.offer.price++; assert.equal(G.restore(t), null);
  const old = G.fresh(1); old.version = 1; assert.equal(G.restore(old), null);
});
test('a full game can reach 300 using only player actions and the initial 18-cell bag', () => {
  const s = G.fresh(13);
  const finishTrip = () => {
    while (s.phase === 'event') {
      const choices = G.eventInfo(s).choices;
      const preferred = choices.find(c => ['commission-claim','barter-sell', 'rest', 'water'].includes(c.id) && G.available(s, c));
      resolveSkippingChallenge(s, preferred.id);
    }
    G.deliverOrder(s);
    for (const item of [...s.items]) G.sell(s, item.id);
    assert.ok(G.restore(s));
  };
  G.acceptOrder(s, s.board[0].id);
  for (let n = 0; n < 4; n++) G.buy(s, 'herb');
  G.buy(s, 'lantern'); G.depart(s, 1, 'road'); finishTrip();
  G.acceptOrder(s, s.board.find(o => o.type === 5).id);
  for (let n = 0; n < 4; n++) G.buy(s, 'fish');
  G.buy(s, 'ration'); G.depart(s, 2, 'road'); finishTrip();
  G.acceptOrder(s, s.board.find(o => o.type === 8).id);
  for (let n = 0; n < 4; n++) G.buy(s, 'porcelain');
  G.buy(s, 'ration'); G.depart(s, 0, 'road'); finishTrip();
  const result = G.finish(s);
  assert.equal(s.rows, 3); assert.equal(result.contracts, 3);
  assert.ok(result.success, `final assets ${result.total}`); assert.ok(G.restore(s));
});
test('new game has legal inventory, enough initial money and a valid save', () => { const s = G.fresh(1); assert.equal(s.rows, 3); assert.equal(s.gold, 100); assert.equal(s.items.length, 3); assert.deepEqual(G.restore(JSON.stringify(s)), s); });
test('buy debits exactly the price and consumes finite shop stock', () => { const s = empty(), price = G.purchasePrice(s, 'tea'); G.buy(s, 'tea'); assert.equal(s.gold, 1000 - price); assert.equal(s.stock.tea, 3); assert.ok(G.restore(s)); });
test('insufficient money and a full bag leave state unchanged', () => { const s = empty(); s.gold = 0; let raw = JSON.stringify(s); assert.throws(() => G.buy(s, 'tea')); assert.equal(JSON.stringify(s), raw); s.gold = 100; for (let y = 0; y < s.rows; y++) for (let x = 0; x < 6; x++) insert(s, 'fruit', x, y); raw = JSON.stringify(s); assert.throws(() => G.buy(s, 'fruit')); assert.equal(JSON.stringify(s), raw); });
test('move rejects overlap, fractions and out-of-bounds without corruption', () => { const s = empty(), tea = insert(s, 'tea', 0, 0); insert(s, 'herb', 1, 0); const raw = JSON.stringify(s); for (const [x, y] of [[1, 0], [6, 0], [-1, 0], [.5, 0], [0, 4]]) assert.throws(() => G.move(s, tea.id, x, y)); assert.equal(JSON.stringify(s), raw); G.move(s, tea.id, 2, 2, true); assert.deepEqual(G.dimensions(tea), [2, 1]); });
test('adjacency is edge contact, not diagonal contact, and tea bonuses update', () => { const s = empty(), tea = insert(s, 'tea', 0, 0), spice = insert(s, 'spice', 1, 2); const base = G.salePrice(s, tea); assert.equal(G.near(s, tea, 'spice'), false); G.move(s, spice.id, 1, 1); assert.ok(G.near(s, tea, 'spice')); assert.ok(G.salePrice(s, tea) > base); });
test('buying and reselling cannot generate money at any city even with spice bonus', () => { const s = empty(); for (let city = 0; city < 3; city++) { s.city = city; for (const kind of Object.keys(G.GOODS)) { s.items = []; const i = insert(s, kind, 0, 0); if (kind === 'tea') insert(s, 'spice', 1, 0); assert.ok(G.salePrice(s, i) < G.purchasePrice(s, kind), `${city}/${kind}`); } } });
test('ice protects adjacent fish but unprotected fish deteriorate on travel', () => { const s = empty(); const protectedFish = insert(s, 'fish', 0, 0), otherFish = insert(s, 'fish', 3, 3); insert(s, 'ice', 2, 0); arrive(s, 1, 'road'); assert.equal(protectedFish.quality, 1); assert.equal(otherFish.quality, .65); assert.ok(G.restore(s)); });
test('silk prevents porcelain damage on the trail', () => { const s = empty(), safe = insert(s, 'porcelain', 0, 0), fragile = insert(s, 'porcelain', 5, 0); insert(s, 'silk', 1, 0); arrive(s, 1, 'trail'); assert.equal(safe.quality, 1); assert.equal(fragile.quality, .75); });
test('provisions are consumed once, compass reduces road fees', () => { const s = empty(); insert(s, 'ration', 0, 0); insert(s, 'compass', 2, 0); assert.equal(G.travelCost(s, 'road'), 1); G.depart(s, 1, 'road'); assert.equal(s.gold, 999); assert.equal(G.has(s, 'ration'), false); assert.equal(G.travelCost(s, 'road'), 9); });
test('trade is locked during an event and events cannot pay out twice', () => { const s = empty(); G.depart(s, 1, 'road'); assert.throws(() => G.buy(s, 'tea')); const event = G.EVENTS[s.event.key], choice = event.choices.find(c => G.available(s, c)); resolveSkippingChallenge(s, choice.id); const raw = JSON.stringify(s); assert.equal(s.city, 1); assert.throws(() => resolveSkippingChallenge(s, choice.id)); assert.equal(JSON.stringify(s), raw); assert.ok(G.restore(s)); });
test('deadline prevents new trips but leaves final-day trading available', () => { const s = G.fresh(5); s.day = 12; assert.throws(() => G.depart(s, 1, 'trail')); G.sell(s, s.items[0].id); const f = G.finish(s); assert.equal(f.total, G.worth(s)); assert.equal(s.phase, 'ended'); assert.throws(() => G.buy(s, 'tea')); assert.ok(G.restore(s)); });
test('corrupt saves, overlapping items and unknown goods are rejected', () => { assert.equal(G.restore('broken'), null); for (const change of [s => s.items[1].x = s.items[0].x, s => s.gold = -1, s => s.rows = 999, s => s.items[0].kind = '__proto__', s => s.phase = 'hack', s => s.stock.tea = -1, s => s.items[0].quality = null]) { const s = G.fresh(1); if (change.toString().includes('items[1]')) s.items[1].y = 0; change(s); assert.equal(G.restore(s), null); } });
test('a damaged or edited final score is recomputed when restored', () => { const s = G.fresh(1); G.finish(s); s.final.total = 9999; s.final.success = true; const restored = G.restore(s); assert.equal(restored.final.total, G.worth(restored)); assert.equal(restored.final.success, false); });
test('repeated randomized legal actions preserve invariants and save validity', () => { for (let seed = 1; seed <= 40; seed++) { const s = G.fresh(seed); let r = seed; const rand = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296); for (let n = 0; n < 60; n++) { if (s.phase === 'event') { const options = G.eventInfo(s).choices.filter(c => G.available(s, c)); resolveSkippingChallenge(s, options[Math.floor(rand() * options.length)].id); } else { try { const action = Math.floor(rand() * 7); if (action === 0) { const stock = G.CITIES[s.city].stock; G.buy(s, stock[Math.floor(rand() * stock.length)]); } else if (action === 1 && s.items.length) G.sell(s, s.items[Math.floor(rand() * s.items.length)].id); else if (action === 2 && s.items.length) { const item = s.items[Math.floor(rand() * s.items.length)]; G.move(s, item.id, Math.floor(rand() * 6), Math.floor(rand() * s.rows), rand() > .5); } else if (action === 3 && !s.order && s.board.length) G.acceptOrder(s, s.board[Math.floor(rand() * s.board.length)].id); else if (action === 4 && s.order) G.deliverOrder(s); else if (action === 5 && s.order) G.abandonOrder(s); else if (s.day < 12) G.depart(s, (s.city + 1) % 3, rand() > .5 ? 'road' : 'trail'); } catch {} } assert.ok(s.gold >= 0); assert.ok(G.restore(s), `invalid save seed ${seed}, action ${n}`); } } });
