// Synthesized 8-bit sound for Historillion (WebAudio, no audio files, no licences, about 5 KB).
//
//   import { createSound } from "./sound.js";
//   const sound = createSound();            // mountScene() makes one for you: scene.sound
//   sound.play("tick");                     // an event name from the list below; never plays before the first tap or key press (browser rule) or while muted
//   sound.toggle();                         // mute / unmute; the choice is remembered in localStorage ("historillion.sound": "on" | "off"), default on
//   sound.muted; sound.onChange(fn)
//
// Events: tick (last 5 seconds), submit, wrong, hint, dig-brush, dig-pickaxe, dig-digger, dig-truck, dig-spoon, reveal-none, reveal-common, reveal-uncommon,
// reveal-rare, reveal-veryRare, rumble (build-up), clink, brushoff, next, finish. v7: hit (a pickaxe strike; play("hit", n): every n a half step higher), scrape (spoon),
// swell-rare / swell-veryRare (a rumble that rises for 3 / 5 s), heartbeat (one lub-dub; play("heartbeat", n): louder with n), thud (the camera push), and sound.hush(seconds) / sound.unhush(): the held breath, everything near silent. The scene plays the dig, reveal, rumble and next sounds itself; main.js only needs
// tick, submit, wrong, hint and finish. Sound has its own toggle and ignores prefers-reduced-motion (that setting is about movement).

const KEY = "historillion.sound";
const N = { C3: 131, C4: 262, E4: 330, G4: 392, C5: 523, E5: 659, G5: 784, C6: 1047, E6: 1319, G6: 1568, C7: 2093 };

export function createSound() {
  let ctx = null;
  let master = null;
  let unlocked = false;
  let muted = false;
  let noiseBuf = null;
  const listeners = new Set();
  try { muted = localStorage.getItem(KEY) === "off"; } catch { /* private mode: default on */ }

  // The context is only created by a user gesture (pointerdown or keydown), so nothing plays before the first tap.
  const unlock = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    unlocked = true;
  };
  addEventListener("pointerdown", unlock, { capture: true, passive: true });
  addEventListener("keydown", unlock, { capture: true, passive: true });

  const noiseBuffer = () => {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  };

  // one note: type, start frequency, optional end frequency (a slide), length, volume, delay
  const tone = (t, freq, dur, { type = "square", vol = 0.18, to = null, delay = 0 } = {}) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t + delay);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + delay + dur);
    g.gain.setValueAtTime(vol, t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
    o.connect(g).connect(master);
    o.start(t + delay);
    o.stop(t + delay + dur + 0.03);
  };
  // a burst of filtered noise (swishes, thuds, rumble, shimmer)
  const noise = (t, dur, { freq = 1000, q = 1, filter = "bandpass", vol = 0.2, to = null, delay = 0 } = {}) => {
    const s = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = noiseBuffer();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t + delay);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + delay + dur);
    g.gain.setValueAtTime(vol, t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t + delay);
    s.stop(t + delay + dur + 0.03);
  };
  const arp = (t, notes, step, opts) => notes.forEach((n, i) => tone(t, n, step * 1.6, { ...opts, delay: i * step }));

  const SOUNDS = {
    tick: (t) => tone(t, 880, 0.04, { vol: 0.12 }),
    submit: (t) => { tone(t, 660, 0.06, { type: "triangle" }); tone(t, 990, 0.09, { type: "triangle", delay: 0.06 }); },
    wrong: (t) => { tone(t, 180, 0.18, { type: "sawtooth", to: 90 }); tone(t, 140, 0.18, { type: "sawtooth", to: 70, delay: 0.12 }); },
    hint: (t) => { tone(t, 1320, 0.06, { type: "sine", vol: 0.12 }); tone(t, 1760, 0.06, { type: "sine", vol: 0.12, delay: 0.08 }); },
    "dig-brush": (t) => [0, 0.12, 0.24, 0.36].forEach((d) => noise(t, 0.09, { freq: 3500, filter: "highpass", vol: 0.1, delay: d })),
    "dig-pickaxe": (t) => {
      [0.1, 0.3].forEach((d) => { noise(t, 0.09, { freq: 600, filter: "lowpass", vol: 0.3, delay: d }); tone(t, 140, 0.1, { type: "triangle", to: 60, vol: 0.25, delay: d }); });
      tone(t, 1760, 0.06, { vol: 0.08, delay: 0.32 });
    },
    "dig-digger": (t) => { tone(t, 60, 0.45, { type: "sawtooth", to: 90, vol: 0.12 }); noise(t, 0.12, { freq: 900, vol: 0.2, delay: 0.32 }); tone(t, 220, 0.08, { type: "triangle", vol: 0.12, delay: 0.34 }); },
    "dig-truck": (t) => { noise(t, 0.6, { freq: 500, to: 200, filter: "lowpass", vol: 0.28 }); tone(t, 45, 0.55, { type: "sawtooth", vol: 0.12 }); },
    "dig-spoon": (t) => { [0.05, 0.2, 0.35].forEach((d) => tone(t, 2400, 0.04, { type: "triangle", vol: 0.08, delay: d })); tone(t, 300, 0.1, { type: "triangle", to: 600, vol: 0.12, delay: 0.45 }); },
    "reveal-none": (t) => { tone(t, 330, 0.35, { to: 110, vol: 0.16 }); tone(t, 220, 0.3, { to: 80, vol: 0.12, delay: 0.18 }); },
    "reveal-common": (t) => { tone(t, 660, 0.08, { type: "triangle" }); tone(t, 880, 0.12, { type: "triangle", delay: 0.08 }); },
    "reveal-uncommon": (t) => arp(t, [N.C5, N.E5, N.G5], 0.07, { vol: 0.14 }),
    "reveal-rare": (t) => { arp(t, [N.C5, N.E5, N.G5, N.C6, N.E6], 0.06, { vol: 0.14 }); noise(t, 0.35, { freq: 6000, filter: "highpass", vol: 0.04, delay: 0.2 }); },
    "reveal-veryRare": (t) => {
      [N.C4, N.E4, N.G4].forEach((n) => tone(t, n, 0.32, { type: "sawtooth", vol: 0.07 }));
      arp(t + 0.12, [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.C7], 0.06, { vol: 0.13 });
      noise(t, 0.7, { freq: 6000, filter: "highpass", vol: 0.05, delay: 0.3 });
    },
    hit: (t, n = 0) => { const k = 1.06 ** n; noise(t, 0.09, { freq: 600, filter: "lowpass", vol: 0.3 }); tone(t, 140, 0.1, { type: "triangle", to: 60, vol: 0.25 }); tone(t, 1400 * k, 0.07, { vol: 0.1, delay: 0.02 }); tone(t, 2100 * k, 0.08, { vol: 0.08, delay: 0.05 }); },
    scrape: (t, n = 0) => { noise(t, 0.14, { freq: 2200 + n * 200, q: 2, vol: 0.09 }); tone(t, 1800, 0.04, { type: "triangle", vol: 0.05, delay: 0.1 }); },
    "swell-rare": (t) => { noise(t, 3, { freq: 80, to: 420, filter: "lowpass", vol: 0.28 }); tone(t, 40, 3, { type: "sawtooth", to: 80, vol: 0.12 }); },
    "swell-veryRare": (t) => { noise(t, 5, { freq: 80, to: 600, filter: "lowpass", vol: 0.34 }); tone(t, 38, 5, { type: "sawtooth", to: 110, vol: 0.14 }); tone(t, 76, 5, { type: "triangle", to: 220, vol: 0.06 }); },
    heartbeat: (t, n = 0) => { const v = 0.22 + Math.min(n, 8) * 0.025; tone(t, 62, 0.14, { type: "sine", to: 40, vol: v }); tone(t, 55, 0.16, { type: "sine", to: 36, vol: v * 0.8, delay: 0.17 }); },
    thud: (t) => { tone(t, 90, 0.18, { type: "sine", to: 35, vol: 0.3 }); noise(t, 0.12, { freq: 300, filter: "lowpass", vol: 0.2 }); },
    clink: (t) => { tone(t, 2093, 0.06, { vol: 0.12 }); tone(t, 1568, 0.08, { vol: 0.1, delay: 0.03 }); noise(t, 0.05, { freq: 5000, filter: "highpass", vol: 0.1 }); },
    brushoff: (t) => [0, 0.12, 0.24, 0.36, 0.48].forEach((d) => noise(t, 0.08, { freq: 4000, filter: "highpass", vol: 0.07, delay: d })),
    rumble: (t) => { noise(t, 0.7, { freq: 120, filter: "lowpass", vol: 0.35 }); tone(t, 38, 0.7, { type: "sine", to: 52, vol: 0.25 }); },
    next: (t) => tone(t, 520, 0.03, { vol: 0.1 }),
    finish: (t) => { arp(t, [N.C5, N.E5, N.G5, N.C6], 0.1, { vol: 0.14 }); tone(t, N.C3, 0.5, { type: "triangle", vol: 0.16 }); tone(t, N.C6, 0.4, { vol: 0.12, delay: 0.3 }); },
  };

  return {
    play(name, n = 0) {
      if (!unlocked || muted || !ctx || !SOUNDS[name]) return;
      SOUNDS[name](ctx.currentTime + 0.01, n);
    },
    hush(seconds) {                                   // the held breath: the master volume dips to almost nothing (and comes back by itself after `seconds`)
      if (!ctx || !master) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.03, t + 0.08);
      master.gain.setValueAtTime(0.03, t + seconds);
      master.gain.linearRampToValueAtTime(0.5, t + seconds + 0.1);
    },
    unhush() {                                        // back to full volume at once (a beat was skipped)
      if (!ctx || !master) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.5, t + 0.05);
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? "off" : "on"); } catch { /* ignore */ }
      listeners.forEach((fn) => fn(muted));
      return muted;
    },
    get muted() { return muted; },
    onChange(fn) { listeners.add(fn); },
  };
}
