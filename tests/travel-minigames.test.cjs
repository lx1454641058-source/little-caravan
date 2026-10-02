// Original journey encounter and mini-game regressions. SPDX-License-Identifier: MIT
const test = require('node:test'), assert = require('node:assert/strict'), G = require('../engine.js');
function trip(kind) {
  for (let seed = 1; seed < 1000; seed++) { const s = G.fresh(seed); G.depart(s, 1, 'road'); if (s.challenge?.kind === kind) return s; }
  throw new Error(`No fixture for ${kind}`);
}
function begin(kind) { const s = trip(kind); G.startChallenge(s); return s; }
function proceed(s) { if (G.travelChallengePending(s)) G.skipChallenge(s); while (s.phase === 'event') { const choices = G.eventInfo(s).choices; G.resolve(s, choices.find(c => ['barter-keep','rest','water','leave','detour'].includes(c.id)).id); } }

test('every departure rolls a persisted optional encounter; both routes include all five games', () => {
  for (const route of ['road','trail']) {
    let count = 0; const kinds = new Set();
    for (let seed = 1; seed <= 500; seed++) {
      const s = G.fresh(seed); G.depart(s, 1, route); const restored = G.restore(s); assert.ok(restored); assert.deepEqual(restored.challenge, s.challenge);
      if (s.challenge) { count++; kinds.add(s.challenge.kind); assert.equal(s.challenge.origin, 'travel'); assert.equal(s.phase, 'event'); }
    }
    assert.equal(kinds.size, 5); assert.ok(count > 270 && count < 380, `encounters ${count}/500`);
  }
});
test('last travel day can still trigger a game and adjacent encounters never repeat', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = G.fresh(seed); s.gold = 1000; let last = null;
    for (let n = 0; n < 10; n++) {
      G.depart(s, (s.city + 1) % 3, 'trail');
      if (s.challenge) { assert.notEqual(s.challenge.kind, last); last = s.challenge.kind; }
      // Pay rather than detour so each leg consumes precisely one day.
      if (G.travelChallengePending(s)) G.skipChallenge(s);
      while (s.phase === 'event') G.resolve(s, G.eventInfo(s).choices.find(c => ['barter-keep','water','rest','leave','pay'].includes(c.id)).id);
      assert.ok(G.restore(s));
    }
  }
  const s = trip('memory'), first = s.challenge; const t = G.fresh(1); t.seed = s.seed; t.day = 11; t.journeys = 0; G.depart(t, 1, 'trail');
  assert.equal(t.day, 12); assert.ok(t.challenge); assert.equal(t.challenge.kind, first.kind);
});
test('offer, active state and reward cannot bypass the underlying trip or charge departure twice', () => {
  const s = trip('memory'), event = JSON.stringify(s.event), money = s.gold, day = s.day, cargo = JSON.stringify(s.items);
  assert.throws(() => G.resolve(s, 'rest')); G.startChallenge(s); assert.throws(() => G.depart(s, 2, 'road')); assert.throws(() => G.buy(s, 'tea'));
  let restored = G.restore(s); assert.ok(restored); G.skipChallenge(restored);
  assert.equal(restored.gold, money); assert.equal(restored.day, day); assert.equal(JSON.stringify(restored.event), event); assert.equal(JSON.stringify(restored.items), cargo);
  proceed(restored); assert.equal(restored.city, 1); assert.equal(restored.journeys, 1); assert.ok(G.restore(restored));
});
test('memory pairs survive reload, reject duplicate clicks and pay once when all four match', () => {
  let s = begin('memory'); const before = s.gold, deck = G.memoryDeck(s.challenge);
  for (let value = 0; value < 4; value++) {
    const pair = deck.flatMap((v, i) => v === value ? [i] : []), step = s.challenge.step;
    G.memoryPick(s, pair[0], step); assert.throws(() => G.memoryPick(s, pair[0], step)); s = G.restore(s); assert.ok(s);
    G.memoryPick(s, pair[1], step); assert.throws(() => G.memoryPick(s, pair[1], step)); assert.ok(G.restore(s));
    if (value < 3) G.memoryContinue(s);
  }
  assert.equal(s.gold, before + 32); assert.equal(s.reputation, 1); assert.equal(s.challenge.status, 'done');
  assert.throws(() => G.memoryPick(s, 0, 4)); const paid = G.restore(s); assert.equal(paid.gold, s.gold); proceed(paid); assert.equal(paid.city, 1);
});
test('eight failed memory pairs end without taking cash or cargo', () => {
  const s = begin('memory'), deck = G.memoryDeck(s.challenge), different = deck.findIndex(v => v !== deck[0]), before = s.gold;
  for (let n = 0; n < 8; n++) { G.memoryPick(s, 0, n); G.memoryPick(s, different, n); if (n < 7) G.memoryContinue(s); }
  assert.equal(s.challenge.status, 'done'); assert.equal(s.gold, before); assert.ok(G.restore(s));
});
test('every bridge is solvable within the rotation budget and saves after each move', () => {
  for (let seed = 1, checked = 0; checked < 80; seed++) {
    let s = G.fresh(seed); G.depart(s, 1, 'road'); if (s.challenge?.kind !== 'bridge') continue; checked++; G.startChallenge(s);
    assert.equal(G.bridgeSolved(s.challenge), false); const before = s.gold;
    for (const index of [3,0,1,2,5]) while (s.challenge.turns[index] !== 0) { G.rotateBridge(s, index, s.challenge.step); s = G.restore(s); assert.ok(s); }
    assert.ok(s.challenge.step <= 15); assert.ok(G.bridgeSolved(s.challenge)); G.submitBridge(s); assert.equal(s.gold, before + 32); assert.ok(G.restore(s)); assert.throws(() => G.submitBridge(s));
  }
});
test('bridge early submission and exhausting moves settle once even on failure', () => {
  const s = begin('bridge'), before = s.gold; G.submitBridge(s); assert.equal(s.gold, before); assert.equal(s.challenge.status, 'done'); assert.ok(G.restore(s));
  const t = begin('bridge'); for (let n = 0; n < 16; n++) G.rotateBridge(t, 4, n); assert.equal(t.challenge.status, 'done'); assert.ok(G.restore(t)); assert.throws(() => G.rotateBridge(t, 4, 16));
});
test('fishing awards three correct catches once; a late click cannot consume another cast', () => {
  let s = begin('fishing'); const before = s.gold;
  for (let step = 0; step < 3; step++) { G.setFishingDepth(s, G.fishingTarget(s.challenge)); G.castFishing(s, step); assert.throws(() => G.castFishing(s, step)); s = G.restore(s); assert.ok(s); }
  assert.equal(s.gold, before + 36); assert.equal(s.reputation, 1); assert.equal(s.challenge.status, 'done'); assert.throws(() => G.tickFishing(s));
});
test('fishing times out after 80 ticks per cast, pays nothing and preserves trip state', () => {
  let s = begin('fishing'); const before = s.gold, event = JSON.stringify(s.event);
  for (let n = 0; n < 240; n++) { G.tickFishing(s); s = G.restore(s); assert.ok(s); }
  assert.deepEqual(s.challenge.answers, [-1,-1,-1]); assert.equal(s.gold, before); assert.equal(JSON.stringify(s.event), event); proceed(s); assert.equal(s.city, 1);
});
test('invalid new challenge save fields are rejected; version four active games migrate intact', () => {
  for (const [kind, change] of [['memory', c => c.open = 9], ['memory', c => c.answers = [0,0]], ['bridge', c => c.turns[0] = 4], ['fishing', c => c.ticks = 80], ['fishing', c => c.answers = [30]]]) {
    const s = begin(kind); change(s.challenge); assert.equal(G.restore(s), null);
  }
  const old = G.fresh(13); G.startChallenge(old); G.advanceDrive(old); old.version = 4; delete old.lastChallenge; delete old.challenge.origin;
  const migrated = G.restore(old); assert.ok(migrated); assert.equal(migrated.challenge.step, 1); assert.equal(migrated.challenge.origin, 'town'); assert.equal(migrated.gold, old.gold); assert.deepEqual(G.restore(migrated), migrated);
});
