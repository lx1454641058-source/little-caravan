// Original chapter economy and migration regression tests. SPDX-License-Identifier: MIT
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');
function resolveSkippingChallenge(s, choice) { if (G.travelChallengePending(s)) G.skipChallenge(s); return G.resolve(s, choice); }
function settleRoad(s, destination) {
  G.depart(s, destination, 'road');
  while (s.phase === 'event') resolveSkippingChallenge(s, s.event.commissionFind?'commission-claim':s.event.key === 'barter' ? 'barter-keep' : s.event.key === 'road' ? 'rest' : 'water');
}
function chapterTwo(seed = 13) { const s = G.fresh(seed); s.gold = 400; G.finish(s); G.continueJourney(s); return s; }
function clearCargo(s) { for (const i of [...s.items]) G.sell(s, i.id); }
function loadNewOrder(s) {
  clearCargo(s); const o = s.board.find(o => o.type >= 9); G.acceptOrder(s, o.id);
  const type = G.ORDER_TYPES[o.type], first = G.buy(s, type.kind), second = G.buy(s, type.kind);
  if (type.kind === 'honey') { const herb = G.buy(s, 'herb'); G.move(s, herb.id, 1, 1, true); }
  if (type.kind === 'glass') {
    G.move(s, second.id, 3, 0); const lantern = G.buy(s, 'lantern'); G.move(s, lantern.id, 2, 0);
  }
  assert.equal(G.orderItems(s).length, 2); assert.ok(G.restore(s)); return {type, first, second};
}

test('second chapter unlocks three local goods, three new contracts and preserves a three-offer board', () => {
  const first = G.fresh(13); assert.ok(!G.shopKinds(first).includes('honey')); assert.throws(() => G.buy(first, 'honey'));
  const s = chapterTwo();
  for (const [city, kind, type] of [[0, 'honey', 9], [1, 'wood', 10], [2, 'glass', 11]]) {
    if (s.city !== city) settleRoad(s, city);
    assert.ok(G.shopKinds(s).includes(kind)); assert.equal(s.board.length, 3); assert.ok(s.board.some(o => o.type === type));
    assert.equal(new Set(s.board.map(o => o.id)).size, 3); assert.ok(G.restore(s));
  }
});
test('new orders are actually deliverable with the original 18-cell bag and reward exactly once', () => {
  const s = chapterTwo();
  for (let trip = 0; trip < 3; trip++) {
    const {type} = loadNewOrder(s); settleRoad(s, type.city); assert.equal(G.orderStatus(s).ready, true);
    const before = s.gold, expected = G.orderBonus(s, s.order), receipt = G.deliverOrder(s);
    assert.equal(receipt.bonus, expected); assert.equal(s.gold, before + receipt.sale + expected);
    assert.throws(() => G.deliverOrder(s)); assert.equal(s.rows, 3); assert.ok(G.restore(s));
  }
});
test('honey and glass combinations improve price but never allow same-stop resale profit', () => {
  for (let city = 0; city < 3; city++) for (const [kind, partner] of [['honey','herb'], ['glass','lantern']]) {
    const s = chapterTwo(); s.city = city;
    const cargo = {id: 1, kind, x: 0, y: 0, rotated: false, quality: 1}; s.items = [cargo];
    const base = G.salePrice(s, cargo); s.items.push({id: 2, kind: partner, x: 2, y: 0, rotated: false, quality: 1});
    assert.ok(G.combo(s, cargo)); assert.ok(G.salePrice(s, cargo) > base); assert.ok(G.salePrice(s, cargo) < G.purchasePrice(s, kind));
  }
});
test('removing supporting herbs or lanterns invalidates the matching new contract', () => {
  for (const city of [0, 2]) {
    const s = chapterTwo(); if (city) settleRoad(s, city); loadNewOrder(s);
    const partner = s.items.find(i => i.kind === (city ? 'lantern' : 'herb')); G.sell(s, partner.id);
    assert.equal(G.orderItems(s).length, 0); assert.ok(G.restore(s));
  }
});
test('glass suffers trail damage unless cargo specialization protects it', () => {
  for (const protectedGlass of [false, true]) {
    const s = chapterTwo(); settleRoad(s, 2); clearCargo(s); const glass = G.buy(s, 'glass');
    s.reputation = 2; if (protectedGlass) G.installMod(s, 'padding'); s.forecast.trail = 'night';
    G.depart(s, 0, 'trail'); resolveSkippingChallenge(s, 'leave'); assert.equal(glass.quality, protectedGlass ? 1 : .75); assert.ok(G.restore(s));
  }
});
test('third chapter fair rotates predictably and only rewards orders delivered at its current venue', () => {
  const s = chapterTwo(); s.gold = 700; G.finish(s); G.continueJourney(s);
  assert.equal(G.fairCity(s), 0); assert.equal(G.fairCity(s, 1), 0);
  const order = s.board[0]; assert.equal(G.orderBonus(s, order), order.bonus);
  settleRoad(s, 1); assert.equal(G.fairCity(s), 0); assert.equal(G.fairCity(s, 1), 1);
  settleRoad(s, 0); assert.equal(G.fairCity(s), 1);
  const {type} = loadNewOrder(s); settleRoad(s, type.city);
  assert.equal(G.fairCity(s), 1); const bonus = s.order.bonus + G.rank(s).bonus + 15;
  assert.equal(G.deliverOrder(s).bonus, bonus); assert.ok(G.restore(s));
});
test('old upgrade price differences are refunded once, preserving active progress and the source save', () => {
  const s = chapterTwo(); s.mods.wheels = true; s.mods.padding = true; s.version = 3;
  delete s.stock.honey; G.startChallenge(s); G.appraise(s, G.appraisalRound(s.challenge).target);
  const raw = JSON.stringify(s), upgraded = G.restore(s); assert.ok(upgraded);
  assert.equal(upgraded.gold, s.gold + 47); assert.equal(upgraded.stock.honey, 0); assert.deepEqual(upgraded.board, s.board);
  assert.deepEqual(upgraded.challenge, s.challenge); assert.equal(JSON.stringify(s), raw);
  assert.deepEqual(G.restore(upgraded), upgraded); assert.equal(G.restore(upgraded).gold, s.gold + 47);
});
test('wheel savings recover its price after nine unequipped road trips', () => {
  const s = G.fresh(13), base = G.roadFee(s); G.installMod(s, 'wheels');
  assert.equal((base - G.roadFee(s)) * 9, G.MODS.wheels.price);
  G.buy(s, 'compass'); assert.equal(G.roadFee(s), 1);
});
test('a legal three-chapter playthrough reaches 900 without fabricated income or challenge rewards', () => {
  const s = G.fresh(13);
  for (let trip = 0; trip < 5 && G.worth(s) < 300; trip++) {
    clearCargo(s); const preferred = s.board.find(o => o.type === [0, 5, 8][s.city]); G.acceptOrder(s, preferred.id);
    const kind = G.ORDER_TYPES[preferred.type].kind;
    for (let n = 0; n < 4; n++) G.buy(s, kind);
    G.buy(s, 'ration'); settleRoad(s, G.ORDER_TYPES[preferred.type].city); G.deliverOrder(s); clearCargo(s); assert.ok(G.restore(s));
  }
  assert.ok(G.finish(s).success, `first chapter ${G.worth(s)}`); G.continueJourney(s);
  G.installMod(s, 'wheels');
  for (const chapter of [2, 3]) {
    for (let trip = 0; trip < 5 && G.worth(s) < G.goal(s); trip++) {
      const {type} = loadNewOrder(s); settleRoad(s, type.city); G.deliverOrder(s); clearCargo(s); assert.ok(G.restore(s));
    }
    assert.ok(G.finish(s).success, `chapter ${chapter}: ${G.worth(s)}`);
    if (chapter < 3) G.continueJourney(s);
  }
  assert.equal(s.chapter, 3); assert.ok(G.worth(s) >= 900); assert.ok(s.mods.wheels); assert.ok(G.restore(s));
  const collection=structuredClone(s.collection),gold=s.gold;G.startFreeTravel(s);
  for(let trip=0;trip<12;trip++)settleRoad(s,(s.city+1)%3);
  assert.ok(s.day>12);assert.equal(s.mode,'free');assert.ok(s.gold>=gold);assert.deepEqual(s.collection,collection);assert.ok(G.restore(s));
});
