// Original challenge and progression regression tests. SPDX-License-Identifier: MIT
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../engine.js');
function resolveSkippingChallenge(s, choice) { if (G.travelChallengePending(s)) G.skipChallenge(s); return G.resolve(s, choice); }
function arrive(s) {
  G.depart(s, (s.city + 1) % 3, 'road');
  while (s.phase === 'event') {
    const choice = G.eventInfo(s).choices.find(c => ['barter-keep', 'rest', 'water'].includes(c.id));
    resolveSkippingChallenge(s, choice.id);
  }
}
function appraisal(seed = 13) { const s = G.fresh(seed); s.challenge.kind = 'appraise'; G.startChallenge(s); return s; }

test('perfect driving rewards once, survives every save and leaves cargo untouched', () => {
  let s = G.fresh(13); const items = JSON.stringify(s.items); G.startChallenge(s);
  for (let n = 0; n < G.DRIVE_STEPS; n++) {
    const wave = G.driveWave(s.challenge); assert.notEqual(wave.rock, wave.coin);
    G.steer(s, wave.coin); G.advanceDrive(s); s = G.restore(s); assert.ok(s);
  }
  assert.equal(s.gold, 136); assert.equal(s.reputation, 1); assert.equal(s.day, 1);
  assert.equal(JSON.stringify(s.items), items); assert.equal(s.challenge.status, 'done');
  assert.throws(() => G.advanceDrive(s)); assert.throws(() => G.startChallenge(s)); assert.equal(s.gold, 136);
});
test('collisions and exiting never take original cash or cargo; active challenge locks trade', () => {
  const s = G.fresh(4), items = JSON.stringify(s.items); G.startChallenge(s);
  for (const action of [() => G.buy(s, 'herb'), () => G.finish(s), () => G.depart(s, 1, 'road'), () => G.installMod(s, 'wheels')]) assert.throws(action);
  for (let n = 0; n < G.DRIVE_STEPS; n++) { G.steer(s, G.driveWave(s.challenge).rock); G.advanceDrive(s); }
  assert.equal(s.gold, 106); assert.equal(s.reputation, 0); assert.equal(JSON.stringify(s.items), items);
  const t = G.fresh(4); G.startChallenge(t); G.steer(t, G.driveWave(t.challenge).coin); G.advanceDrive(t); G.skipChallenge(t);
  assert.equal(t.gold, 100); assert.equal(t.challenge.status, 'skipped'); assert.ok(G.restore(t)); assert.throws(() => G.startChallenge(t));
});
test('arrivals no longer create additional town challenges', () => {
  const s = G.fresh(13); assert.equal(s.challenge.kind, 'drive');
  for (let n = 0; n < 4; n++) { arrive(s); assert.ok(!s.challenge || s.challenge.status === 'skipped'); }
});
test('every appraisal puzzle has exactly one candidate matching both clues', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = appraisal(seed);
    for (let step = 0; step < 3; step++) {
      const round = G.appraisalRound(s.challenge);
      const matches = round.candidates.map(v => Object.keys(v).map(k => G.APPRAISAL_FEATURES[k][v[k]])).map(features => round.clues.every(c => features.includes(c)));
      assert.equal(matches.filter(Boolean).length, 1); assert.ok(matches[round.target]);
      assert.deepEqual(G.appraisalRound(G.restore(s).challenge), round);
      G.appraise(s, round.target, step); assert.ok(G.restore(s));
    }
  }
});
test('appraisal pays once after three rounds and ignores stale answer tokens', () => {
  for (const correct of [true, false]) {
    const s = appraisal(), before = s.gold, rep = s.reputation, items = JSON.stringify(s.items);
    for (let step = 0; step < 3; step++) {
      const target = G.appraisalRound(s.challenge).target; G.appraise(s, correct ? target : (target + 1) % 3, step);
      assert.throws(() => G.appraise(s, target, step));
      if (step < 2) assert.equal(s.gold, before);
    }
    assert.equal(s.gold, before + (correct ? 32 : 0)); assert.equal(s.reputation, rep + (correct ? 1 : 0));
    assert.equal(JSON.stringify(s.items), items); assert.throws(() => G.appraise(s, 0)); assert.ok(G.restore(s));
  }
});
test('modifications enforce cost, reputation, exclusivity and minimum road fee', () => {
  const s = G.fresh(13); assert.throws(() => G.installMod(s, 'cold'));
  G.installMod(s, 'wheels'); assert.equal(s.gold, 82); assert.equal(G.roadFee(s), 3);
  assert.throws(() => G.installMod(s, 'wheels')); s.reputation = 2;
  s.gold = 44; assert.throws(() => G.installMod(s, 'cold')); s.gold = 200;
  G.installMod(s, 'cold'); assert.equal(s.gold, 155); assert.throws(() => G.installMod(s, 'padding'));
  G.buy(s, 'compass'); assert.equal(G.roadFee(s), 1); assert.ok(G.restore(s));
});
test('specialized cargo protection applies without adjacency but does not waive padded orders', () => {
  for (const [mod, kind, route] of [['cold', 'fish', 'road'], ['padding', 'porcelain', 'trail']]) {
    const s = G.fresh(13); s.items = [{id: 4, kind, x: 0, y: 0, rotated: false, quality: 1}]; s.nextId = 5; s.gold = 500; s.reputation = 2;
    G.installMod(s, mod); assert.ok(G.protectedCargo(s, s.items[0]));
    s.forecast.trail = 'night'; G.depart(s, 1, route); resolveSkippingChallenge(s, route === 'trail' ? 'leave' : 'rest');
    assert.equal(s.items[0].quality, 1); assert.ok(G.restore(s));
    if (kind === 'porcelain') { s.order = { type: 6 }; assert.equal(G.orderItems(s).length, 0); }
  }
});
test('successful chapters carry actual inventory, reputation and improvements through three goals', () => {
  const s = G.fresh(13); assert.throws(() => G.continueJourney(s)); s.gold = 400; s.reputation = 6;
  G.installMod(s, 'wheels'); G.upgrade(s); const cargo = JSON.stringify(s.items), money = s.gold;
  G.finish(s); assert.ok(s.final.success); G.continueJourney(s);
  assert.equal(s.chapter, 2); assert.equal(G.goal(s), 600); assert.equal(s.gold, money); assert.equal(s.rows, 4);
  assert.equal(s.reputation, 6); assert.ok(s.mods.wheels); assert.equal(JSON.stringify(s.items), cargo); assert.equal(s.day, 1); assert.ok(G.restore(s));
  assert.equal(G.orderBonus(s, s.board[0]), s.board[0].bonus + 8);
  s.gold = 600; G.finish(s); G.continueJourney(s); assert.equal(G.goal(s), 900);
  s.gold = 900; G.finish(s); assert.throws(() => G.continueJourney(s)); assert.ok(G.restore(s));
  const failed = G.fresh(1); G.finish(failed); assert.throws(() => G.continueJourney(failed));
});
test('version two saves migrate without changing cash, cargo, orders or phase', () => {
  for (const phase of ['market', 'event', 'ended']) {
    const s = G.fresh(13); s.completedOrders = 3;
    if (phase === 'event') G.depart(s, 1, 'road'); if (phase === 'ended') G.finish(s);
    s.version = 2; for (const key of ['chapter', 'mods', 'reputation', 'challenge']) delete s[key];
    const original = JSON.stringify(s), restored = G.restore(s); assert.ok(restored); assert.equal(JSON.stringify(s), original);
    assert.equal(restored.gold, s.gold); assert.deepEqual(restored.items, s.items); assert.deepEqual(restored.order, s.order);
    assert.equal(restored.phase, phase); assert.equal(restored.reputation, 6); assert.equal(restored.chapter, 1);
  }
});
test('invalid challenge progress and mutually exclusive saved upgrades are rejected', () => {
  for (const change of [s => s.chapter = 4, s => s.mods.cold = s.mods.padding = true, s => s.challenge.step = 16, s => s.challenge.status = 'done', s => s.challenge.coins = 1, s => s.reputation = -1]) {
    const s = G.fresh(13); change(s); assert.equal(G.restore(s), null);
  }
});
