// Original synthesized audio lifecycle tests. SPDX-License-Identifier: MIT
const test = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('../sound.js');
function harness({pending = false, unsupported = false, saved = null} = {}) {
  let contexts = 0, release; const notes = [], values = [], store = new Map([['caravan-audio', saved]]);
  const parameter = () => ({setValueAtTime: (n, t) => values.push([n,t]), linearRampToValueAtTime: (n,t) => values.push([n,t]), exponentialRampToValueAtTime: (n,t) => values.push([n,t])});
  class Context {
    constructor() { contexts++; this.currentTime = 10; this.state = pending ? 'suspended' : 'running'; this.destination = {}; }
    resume() { return new Promise(resolve => { release = () => { this.state = 'running'; resolve(); }; if (!pending) release(); }); }
    createGain() { return {gain: parameter(), connect() {}, disconnect() {}}; }
    createOscillator() { const note = {frequency: parameter(), connect() {}, disconnect() {}, start(t) {this.startTime = t;}, stop(t) {this.endTime = t; this.stopped = true;}}; notes.push(note); return note; }
  }
  const env = {AudioContext: unsupported ? undefined : Context, document: {hidden: false}, localStorage: {getItem: k => store.get(k), setItem: (k,v) => store.set(k,v)}};
  return {audio: create(env), env, notes, values, store, contexts: () => contexts, resume: () => release()};
}
test('audio initializes only on interaction and produces bounded, fading notes', async () => {
  const h = harness(); assert.equal(h.contexts(), 0); assert.ok(await h.audio.play('coin')); assert.equal(h.contexts(), 1); assert.equal(h.notes.length, 2);
  assert.ok(h.notes.every(n => n.endTime > n.startTime && n.endTime - n.startTime < .3));
  assert.ok(h.values.every(([v,t]) => Number.isFinite(v) && Number.isFinite(t)));
  assert.equal(await h.audio.play('coin'), false); assert.equal(h.notes.length, 2);
});
test('muting during a pending browser resume prevents delayed sound and preserves settings', async () => {
  const h = harness({pending: true}); const result = h.audio.play('success'); h.audio.setEnabled(false); h.resume();
  assert.equal(await result, false); assert.equal(h.notes.length, 0); assert.equal(h.audio.settings().enabled, false);
  assert.equal(JSON.parse(h.store.get('caravan-audio')).enabled, false);
});
test('hidden pages, muted audio, zero volume and unsupported browsers are silent', async () => {
  const h = harness(); h.env.document.hidden = true; assert.equal(await h.audio.play('buy'), false); assert.equal(h.contexts(), 0);
  h.env.document.hidden = false; h.audio.setVolume(0); assert.equal(await h.audio.play('buy'), false);
  h.audio.setVolume(.5); h.audio.setEnabled(false); assert.equal(await h.audio.play('buy'), false);
  const unsupported = harness({unsupported: true}); assert.equal(await unsupported.audio.play('coin'), false);
});
test('volume is clamped, bad preferences are ignored, and background stop cancels active nodes', async () => {
  const h = harness({saved: '{invalid'}); assert.equal(h.audio.settings().volume, .35);
  h.audio.setVolume(2); assert.equal(h.audio.settings().volume, 1); h.audio.setVolume(NaN); assert.equal(h.audio.settings().volume, 1);
  await h.audio.play('hoof'); h.audio.stop(); assert.ok(h.notes.every(n => n.stopped));
  const restored = harness({saved: JSON.stringify({enabled: false, volume: .2})}); assert.equal(restored.audio.settings().enabled, false); assert.equal(restored.audio.settings().volume, .2);
});
