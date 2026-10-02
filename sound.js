/* Original synthesized game cues, no samples or external assets. SPDX-License-Identifier: MIT */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CaravanSound = factory().create(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // [pitch, start offset, duration, waveform, end pitch]. All cues are short and bounded.
  const CUES = {
    sail: [[320, 0, .10, 'sine', 470], [550, .05, .12, 'sine', 320]],
    tea: [[650, 0, .045, 'sine', 460], [380, .025, .07, 'triangle', 260]],
    buy: [[420, 0, .09, 'triangle'], [600, .06, .12, 'sine']],
    coin: [[880, 0, .10, 'sine'], [1320, .07, .16, 'sine']],
    success: [[523, 0, .16, 'sine'], [659, .12, .16, 'sine'], [784, .24, .25, 'sine']],
    hoof: [[160, 0, .07, 'triangle', 65], [125, .13, .07, 'triangle', 55], [160, .3, .07, 'triangle', 65], [125, .43, .07, 'triangle', 55]],
    hit: [[130, 0, .16, 'triangle', 45]],
    wrong: [[260, 0, .12, 'sine'], [196, .1, .16, 'sine']],
    upgrade: [[392, 0, .12, 'triangle'], [523, .1, .12, 'triangle'], [784, .2, .24, 'sine']]
  };
  function create(env) {
    let enabled = true, volume = .35, context = null, master = null, generation = 0;
    const active = new Set(), recent = new Map();
    const Context = env.AudioContext || env.webkitAudioContext;
    try {
      const settings = JSON.parse(env.localStorage.getItem('caravan-audio'));
      if (typeof settings?.enabled === 'boolean') enabled = settings.enabled;
      if (typeof settings?.volume === 'number' && Number.isFinite(settings.volume)) volume = Math.max(0, Math.min(1, settings.volume));
    } catch {}
    function persist() { try { env.localStorage.setItem('caravan-audio', JSON.stringify({ enabled, volume })); } catch {} }
    function stop() {
      generation++;
      for (const node of active) { try { node.stop(); node.disconnect(); } catch {} }
      active.clear(); recent.clear();
    }
    function updateGain() { if (master) master.gain.setValueAtTime(enabled ? volume * .25 : 0, context.currentTime); }
    async function unlock() {
      if (!enabled || !Context || env.document?.hidden) return false;
      try {
        if (!context) { context = new Context(); master = context.createGain(); master.connect(context.destination); updateGain(); }
        if (context.state === 'suspended') await context.resume();
        return context.state === 'running';
      } catch { return false; }
    }
    async function play(name) {
      if (!CUES[name] || !enabled || volume === 0 || env.document?.hidden) return false;
      const token = generation;
      if (!await unlock() || token !== generation || !enabled || env.document?.hidden) return false;
      const now = context.currentTime;
      if (active.size >= 24 || now - (recent.get(name) ?? -Infinity) < .06) return false;
      recent.set(name, now);
      try {
        for (const [pitch, offset, length, type, endPitch] of CUES[name]) {
          const oscillator = context.createOscillator(), gain = context.createGain(), start = now + offset;
          oscillator.type = type; oscillator.frequency.setValueAtTime(pitch, start);
          if (endPitch) oscillator.frequency.exponentialRampToValueAtTime(endPitch, start + length);
          gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.6, start + .008);
          gain.gain.exponentialRampToValueAtTime(.001, start + length);
          oscillator.connect(gain); gain.connect(master); active.add(oscillator);
          oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
          oscillator.start(start); oscillator.stop(start + length + .02);
        }
        return true;
      } catch { stop(); return false; } // Sound failure must never prevent a game action.
    }
    return {
      unlock, play, stop,
      settings: () => ({ enabled, volume, supported: !!Context }),
      setEnabled(value) { enabled = !!value; if (!enabled) stop(); updateGain(); persist(); },
      setVolume(value) { if (!Number.isFinite(value)) return; volume = Math.max(0, Math.min(1, value)); if (!volume) stop(); updateGain(); persist(); }
    };
  }
  return { create, CUES };
});
