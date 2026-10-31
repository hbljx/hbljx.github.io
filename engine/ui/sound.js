// Every sound here is synthesized; there are no audio files. A soft tick for
// the switches, a two-note chirp for the phone, a thwip for the web, ticks for
// the Vertec's vanes, the shelf door, thunder after a flash, and the pool's
// splashes, drips and bubbles. Rain follows the weather: a soft wash and the
// patter of separate drops outdoors, dull under the glass roof, a deep hush
// under the pool's surface with now and then a drop above.
// Activity effects also use synthesis: no audio downloads or network requests.
// The visitor's sound preference is remembered by the existing sound switch.

const KEY = 'terryhome-sound';

export function createSound() {
  let ctx = null, bus = null, tone = null, clear = null, room = null, white = null, rumble = null, master = null;
  let activityLoop = null, played = 0, last = null, focused = true, unlocked = false, tvBuffer = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch {}

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Everything meets in one bus, passes a gentle low-pass (which closes
    // right down under water) and a soft limiter, so thunder and a splash
    // together never blare.
    bus = ctx.createGain();
    bus.gain.value = 0.5;
    tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 6500;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -16; limit.knee.value = 10; limit.ratio.value = 4; limit.attack.value = 0.004; limit.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = on ? 1 : 0;
    bus.connect(tone).connect(limit).connect(master).connect(ctx.destination);
    // Sounds right beside them under water (their breath, drops just overhead)
    // keep a little of their shape.
    clear = ctx.createBiquadFilter();
    clear.type = 'lowpass'; clear.frequency.value = 1800;
    clear.connect(limit);
    // A short, dark room tail gives the house some air.
    room = ctx.createConvolver();
    room.buffer = impulse(1.1, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.14;
    room.connect(wet).connect(bus);
    white = noiseBuffer(2);
    return ctx;
  }

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * 0.5;
    }
    return buffer;
  }
  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate), d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buffer;
  }
  // A one-shot from a shared buffer, starting somewhere different each time.
  function voice(buffer, t, until, from = Math.random() * buffer.duration * 0.5) {
    const s = ctx.createBufferSource();
    s.buffer = buffer; s.start(t, from); s.stop(until);
    return s;
  }

  // Output node: dry to `to` (the bus, or the clear path under water), a
  // little into the room.
  function out(level = 1, space = 1, to = bus) {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(to);
    if (space > 0) {
      const send = ctx.createGain();
      send.gain.value = space;
      g.connect(send).connect(room);
    }
    return g;
  }
  function env(gain, t, attack, decay, peak) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  // A short tone gliding from one pitch to another: a click, a note, a drop
  // or a bubble (a bubble's ring rises as it closes).
  function chirp(dest, t, from, to, length, level, type = 'sine') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + length);
    env(g, t, 0.003, length, level);
    o.connect(g).connect(dest); o.start(t); o.stop(t + length + 0.02);
  }
  // A burst of noise through a filter, shaped by an envelope.
  function hiss(dest, t, type, freq, q, attack, decay, level, to = null) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    env(g, t, attack, decay, level);
    voice(white, t, t + attack + decay + 0.02).connect(f).connect(g).connect(dest);
  }

  const sounds = {
    // A Vertec vane flicked aside: a light plastic tick.
    vane() {
      const t = ctx.currentTime;
      hiss(out(0.13, 0.2), t, 'bandpass', 2400 + Math.random() * 1200, 2.5, 0.001, 0.03, 0.9);
    },
    // A body going into the water (or bursting out of it): the slap of the
    // surface breaking, a low whump as the body goes under, the water thrown
    // up falling back, then a few bubbles. Bigger is louder and brighter.
    splash(power = 1) {
      const t = ctx.currentTime, p = Math.min(1.2, power), dest = out(0.35 + 0.35 * p, 0.35);
      hiss(dest, t, 'bandpass', 1700, 0.9, 0.002, 0.07, 0.7 * p + 0.1);
      chirp(dest, t + 0.01, 130, 52, 0.28, 0.45 * p);
      hiss(dest, t + 0.03, 'lowpass', 900 + 1500 * p, 0.7, 0.05, 0.8, 0.5, 280);
      for (let i = 0; i < 3; i++) { const f = 240 + Math.random() * 220; chirp(dest, t + 0.2 + i * 0.08 + Math.random() * 0.06, f, f * 1.8, 0.05, 0.12); }
    },
    // Climbing out: water running off, then drops falling back into the pool.
    drip() {
      const t = ctx.currentTime, dest = out(0.14, 0.25);
      hiss(dest, t, 'bandpass', 1100, 0.7, 0.04, 0.5, 0.45);
      for (let i = 0; i < 5; i++) { const f = 700 + Math.random() * 900; chirp(dest, t + 0.2 + i * 0.11 + Math.random() * 0.09, f, f * 1.6, 0.045, 0.18 + Math.random() * 0.18); }
    },
    // A breath let out under water: a soft, uneven burble.
    bubbles() {
      const t = ctx.currentTime, dest = out(0.08, 0, clear);
      for (let i = 0, n = 6 + Math.floor(Math.random() * 3); i < n; i++) {
        const f = 140 + Math.random() * 220;
        chirp(dest, t + i * 0.055 + Math.random() * 0.06, f, f * (2.2 + Math.random()), 0.03 + Math.random() * 0.03, 0.3 + Math.random() * 0.5);
      }
    },
    // The camera going under: a low gulp as the world closes over.
    under() {
      const t = ctx.currentTime;
      hiss(out(0.25, 0.2), t, 'lowpass', 1500, 0.7, 0.01, 0.42, 0.7, 140);
    },
    // The switches: a short, warm tick.
    click() {
      chirp(out(0.1, 0), ctx.currentTime, 1150, 760, 0.028, 0.6, 'triangle');
    },
    door() {
      const t = ctx.currentTime, dest = out(0.42, 0.7);
      hiss(dest, t, 'lowpass', 380, 0.7, 0.04, 0.5, 0.6);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(74, t); o.frequency.linearRampToValueAtTime(56, t + 0.45);
      env(og, t, 0.02, 0.45, 0.35);
      o.connect(og).connect(dest); o.start(t); o.stop(t + 0.5);
    },
    // A web shooting out: a short bright hiss falling in pitch ("thwip").
    web() {
      hiss(out(0.2, 0.12), ctx.currentTime, 'bandpass', 3200, 2.4, 0.003, 0.13, 0.75, 850);
    },
    // The phone coming up (rising pair) or going away (falling pair).
    phone(up = true) {
      const t = ctx.currentTime, dest = out(0.11, 0.08);
      (up ? [988, 1319] : [1319, 988]).forEach((f, i) => chirp(dest, t + i * 0.075, f, f, 0.09, 0.5));
    },
    // Thunder arrives after the flash, later the further off it struck. A
    // near strike cracks first; then the roll swells and fades a few times
    // as the sound comes back from the sky's different reaches.
    thunder(level = 1, delay = 0) {
      const t = ctx.currentTime + delay, near = Math.min(1, Math.max(0, level)), dest = out(0.5 * Math.max(0.25, level), 0.6);
      rumble ||= loopBuffer(7, fillBrown, 1);
      const lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300 + 1500 * near, t); lp.frequency.exponentialRampToValueAtTime(110, t + 1); lp.frequency.exponentialRampToValueAtTime(55, t + 4.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.05 + 0.25 * (1 - near));
      let at = t + 0.3;
      for (let k = 0; k < 4; k++) { at += 0.3 + Math.random() * 0.5; g.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.65, at); }
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
      voice(rumble, t, at + 1.5, Math.random()).connect(lp).connect(g).connect(dest);
      if (near > 0.65) hiss(dest, t, 'highpass', 700, 0.7, 0.002, 0.2, 0.9 * (near - 0.5));
    },
  };

  function play(name, ...args) {
    if (!on || !unlocked || document.hidden || !focused || !sounds[name]) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    sounds[name](...args);
    played++; last = name;
  }

  // Short, deliberately quiet Foley. Noise and pitch are varied slightly so
  // repeated steps and movements do not become a machine-gun sample loop.
  const strength = value => Math.max(.1, Math.min(1.5, Number.isFinite(value) ? value : 1));
  function step(run = false, value = 1) {
    const t = ctx.currentTime, dest = out((run ? .15 : .1) * strength(value), .08);
    chirp(dest, t, 105 + Math.random() * 20, 54, .07, .5);
    hiss(dest, t + .01, 'lowpass', 950 + Math.random() * 450, .7, .002, .055, .32);
  }
  function cloth(up = false) {
    const t = ctx.currentTime, dest = out(.16, .12);
    hiss(dest, t, 'bandpass', up ? 1100 : 650, .7, .018, .2, .5, up ? 650 : 350);
    chirp(dest, t + .045, up ? 95 : 150, up ? 150 : 75, .12, .18);
  }
  function notes(pitches, level = .11, spacing = .075) {
    const t = ctx.currentTime, dest = out(level, .12);
    for (let i = 0; i < pitches.length; i++) chirp(dest, t + i * spacing, pitches[i], pitches[i], .12, .5, 'triangle');
  }
  Object.assign(sounds, {
    step(value = 1) { step(false, value); },
    run(value = 1) { step(true, value); },
    sit() { cloth(false); },
    stand() { cloth(true); },
    jump() {
      const t = ctx.currentTime, dest = out(.1, .08);
      hiss(dest, t, 'bandpass', 750, .7, .008, .13, .3, 1300);
    },
    land(value = 1) { step(true, value); },
    sleep() {
      const t = ctx.currentTime, dest = out(.09, .22);
      hiss(dest, t, 'bandpass', 330, 1.3, .28, .55, .5, 180);
      chirp(dest, t + .1, 76, 52, .55, .22);
    },
    page() {
      const t = ctx.currentTime, dest = out(.15, .1);
      hiss(dest, t, 'highpass', 1400, .7, .008, .11, .5, 900);
      hiss(dest, t + .09, 'bandpass', 2200, .8, .004, .075, .3);
    },
    tv() { notes([659, 880], .075, .05); },
    coffee() {
      const t = ctx.currentTime, dest = out(.13, .13);
      hiss(dest, t, 'bandpass', 700, 1.4, .04, .3, .3, 1200);
      chirp(dest, t + .25, 370, 640, .065, .22);
      chirp(dest, t + .38, 1300, 900, .055, .15);
    },
    shot() {
      const t = ctx.currentTime, dest = out(.16, .12);
      hiss(dest, t, 'bandpass', 1100, 1.3, .012, .18, .45, 340);
    },
    bounce(value = 1) {
      const t = ctx.currentTime, dest = out(.24 * strength(value), .35);
      chirp(dest, t, 190, 57, .18, .65);
      hiss(dest, t, 'bandpass', 1500, 1.2, .001, .022, .3);
    },
    score() { notes([523, 659, 784], .15); },
    'game-point'() { notes([988, 1319], .09, .045); },
    'game-hit'() {
      const t = ctx.currentTime, dest = out(.12, 0);
      chirp(dest, t, 240, 85, .16, .35, 'square');
      hiss(dest, t, 'lowpass', 1500, .7, .002, .08, .22);
    },
    cast() {
      const t = ctx.currentTime, dest = out(.17, .08);
      hiss(dest, t, 'bandpass', 2200, 1.4, .025, .3, .5, 450);
    },
    reel() {
      const t = ctx.currentTime, dest = out(.1, .08);
      for (let i = 0; i < 6; i++) chirp(dest, t + i * .045, 900 + i * 60, 470, .018, .35, 'triangle');
    },
    bite() { notes([880, 1175], .13, .13); },
    catch() {
      sounds.splash(.35);
      notes([523, 784, 1047], .13, .1);
    },
    chop() {
      const t = ctx.currentTime, dest = out(.17, .14);
      chirp(dest, t, 380, 115, .055, .5);
      hiss(dest, t, 'bandpass', 1700, .8, .001, .035, .32);
    },
    stir() {
      const t = ctx.currentTime, dest = out(.11, .1);
      hiss(dest, t, 'bandpass', 900, 1.5, .03, .2, .45, 450);
      chirp(dest, t + .17, 1600, 1300, .04, .1);
    },
    ready() { notes([784, 988, 1175], .13, .12); },
    start() { notes([392, 523], .075, .055); },
    stop() { notes([523, 392], .065, .055); },
  });
  const aliases = {
    walk: 'step', footstep: 'step', snore: 'sleep', book: 'page', sip: 'coffee',
    'tv-change': 'tv', 'game-start': 'start', 'game-over': 'stop', 'game-score': 'game-point',
    'basketball-shot': 'shot', 'basketball-bounce': 'bounce', 'basketball-score': 'score',
    'fishing-cast': 'cast', 'fishing-splash': 'splash', 'fishing-reel': 'reel', 'fishing-bite': 'bite', 'fishing-catch': 'catch',
    'cooking-chop': 'chop', 'cooking-stir': 'stir', 'cooking-ready': 'ready',
  };
  function effect(name, value = 1) { play(aliases[name] || name, value); }

  // Exactly one activity loop exists at a time. Calling this every frame only
  // changes existing AudioParams; stopping disconnects all loop nodes.
  function stopLoop() {
    if (!activityLoop) return;
    const previous = activityLoop; activityLoop = null;
    for (const source of previous.sources) { try { source.stop(); } catch {} }
    for (const node of previous.nodes) node.disconnect();
  }
  function loop(name, intensity = 1) {
    if (!name || !on || !unlocked || document.hidden || !focused) { stopLoop(); return; }
    if (!['engine', 'sizzle', 'treadmill', 'tv'].includes(name) || !ensure()) return;
    if (ctx.state !== 'running') return;
    const amount = Math.max(0, Math.min(1, Number.isFinite(intensity) ? intensity : 1));
    if (activityLoop?.name !== name) {
      stopLoop();
      const level = ctx.createGain(), filter = ctx.createBiquadFilter(), source = ctx.createBufferSource();
      level.gain.value = 0; filter.type = name === 'sizzle' ? 'highpass' : 'lowpass';
      filter.frequency.value = name === 'sizzle' ? 1100 : 420;
      if (name === 'tv' && !tvBuffer) {
        // An original eight-second pentatonic bed for the pixel TV. Build it
        // once, and let the loop source repeat it without any JS timers.
        tvBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 8), ctx.sampleRate);
        const data = tvBuffer.getChannelData(0), pitches = [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 261.63];
        for (let i = 0; i < data.length; i++) {
          const second = i / ctx.sampleRate, beat = second % 1;
          const envelope = Math.min(1, beat * 20) * Math.pow(1 - beat, 2);
          data[i] = Math.sin(2 * Math.PI * pitches[Math.floor(second)] * second) * envelope * .35;
        }
      }
      source.buffer = name === 'tv' ? tvBuffer : white; source.loop = true;
      source.connect(filter).connect(level).connect(bus); source.start();
      const sources = [source], nodes = [source, filter, level];
      let motor = null;
      if (name === 'engine' || name === 'treadmill') {
        motor = ctx.createOscillator(); const motorGain = ctx.createGain();
        motor.type = 'triangle'; motor.frequency.value = 44; motorGain.gain.value = .36;
        motor.connect(motorGain).connect(level); motor.start();
        sources.push(motor); nodes.push(motor, motorGain);
      }
      activityLoop = { name, sources, nodes, level, filter, motor, intensity: amount };
    }
    const t = ctx.currentTime, current = activityLoop;
    current.intensity = amount;
    current.level.gain.setTargetAtTime(name === 'tv' ? .055 : name === 'sizzle' ? .045 + amount * .035 : .035 + amount * .055, t, .12);
    if (current.motor) current.motor.frequency.setTargetAtTime(name === 'engine' ? 38 + amount * 64 : 70 + amount * 28, t, .1);
    if (name !== 'sizzle') current.filter.frequency.setTargetAtTime(210 + amount * 700, t, .12);
  }

  // ---------- Rain, and being under the water ----------
  // Long stereo loops made once: a soft wash of pink noise, the patter of
  // separate drops (each with its own pitch, loudness and side, a few of them
  // the round plop of a drop on water), and a low brown hum for under the
  // surface. Their lengths share no beat, so the mix never audibly repeats;
  // each loop's end is folded into its start, so it has no seam.
  function loopBuffer(seconds, fill, channels = 2, peak = 0) {
    const rate = ctx.sampleRate, n = Math.floor(seconds * rate), fold = Math.floor(0.5 * rate);
    const buffer = ctx.createBuffer(channels, n, rate), raw = Array.from({ length: channels }, () => new Float32Array(n + fold));
    fill(raw, rate);
    let sum = 0, top = 0;
    raw.forEach((r, c) => {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = r[i];
      for (let i = 0; i < fold; i++) { const k = i / fold; d[i] = r[i] * Math.sqrt(k) + r[n + i] * Math.sqrt(1 - k); }
      for (let i = 0; i < n; i++) { sum += d[i] * d[i]; top = Math.max(top, Math.abs(d[i])); }
    });
    // Steady loops leave here equally loud; drops are set by their loudest,
    // so no single one can crack. The mix sets the levels.
    const scale = peak ? peak / (top || 1) : 0.25 / Math.sqrt(sum / (channels * n) || 1);
    for (let c = 0; c < channels; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < n; i++) d[i] *= scale; }
    return buffer;
  }
  // Pink noise (Paul Kellet's filter), softened above 2 kHz and below 160 Hz.
  function fillWash(raw, rate) {
    const low = Math.exp(-2 * Math.PI * 2000 / rate), high = Math.exp(-2 * Math.PI * 160 / rate);
    for (const d of raw) {
      let b0 = 0, b1 = 0, b2 = 0, lp = 0, hp = 0, prev = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        lp = lp * low + (b0 + b1 + b2 + w * 0.1848) * (1 - low);
        hp = high * (hp + lp - prev); prev = lp;
        d[i] = hp;
      }
    }
  }
  function fillPatter(raw, rate) {
    const [left, right] = raw, total = left.length;
    for (let k = 0, count = Math.floor(total / rate * 55); k < count; k++) {
      const start = Math.floor(Math.random() * total), len = Math.min(total - start, Math.floor(0.035 * rate));
      const level = Math.pow(Math.random(), 2.5) * 0.45 + 0.03, pan = Math.random(), gl = Math.sqrt(1 - pan), gr = Math.sqrt(pan);
      let e = level;
      if (Math.random() < 0.12) {
        // A drop on water: a round plop whose pitch rises as its bubble closes.
        const f = 500 + Math.random() * 900, decay = Math.exp(-1 / ((0.008 + Math.random() * 0.008) * rate));
        let phase = 0;
        for (let i = 0; i < len; i++, e *= decay) {
          phase += 2 * Math.PI * f * (1 + 0.6 * i / len) / rate;
          const s = Math.sin(phase) * e * 0.6;
          left[start + i] += s * gl; right[start + i] += s * gr;
        }
      } else {
        // A drop on stone, leaf or glass: a tick of noise, duller or brighter.
        const bright = Math.exp(-2 * Math.PI * (900 + Math.random() * 2300) / rate), decay = Math.exp(-1 / ((0.0015 + Math.random() * 0.005) * rate));
        let y = 0;
        for (let i = 0; i < len; i++, e *= decay) {
          y = y * bright + (Math.random() * 2 - 1) * (1 - bright);
          const s = y * e;
          left[start + i] += s * gl; right[start + i] += s * gr;
        }
      }
    }
  }
  // Brown noise: deep, for the hum under water and the roll of thunder.
  function fillBrown(raw) {
    for (const d of raw) {
      let b = 0;
      for (let i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b; }
    }
  }

  let bed = null, was = null, plinkIn = 0, clock = 0;
  function makeBed() {
    const loop = (buffer, gain) => { const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; s.connect(gain); s.start(); return s; };
    const shade = ctx.createBiquadFilter(), level = ctx.createGain(), washGain = ctx.createGain(), patterGain = ctx.createGain();
    shade.type = 'lowpass'; shade.frequency.value = 4200;
    washGain.gain.value = patterGain.gain.value = 0;
    washGain.connect(shade); patterGain.connect(shade); shade.connect(level).connect(bus);
    loop(loopBuffer(7.3, fillWash), washGain);
    loop(loopBuffer(6.1, fillPatter, 2, 0.5), patterGain);
    const humShade = ctx.createBiquadFilter(), humGain = ctx.createGain();
    humShade.type = 'lowpass'; humShade.frequency.value = 120; humGain.gain.value = 0;
    humShade.connect(humGain).connect(bus);
    loop(loopBuffer(5.3, fillBrown), humShade);
    return { shade, level, washGain, patterGain, humGain, drops: out(1, 0, clear) };
  }
  function ambience(rain = 0, under = false, indoor = false) {
    if (!on || !ctx) {
      if (bed) { bed.level.gain.setTargetAtTime(0, ctx.currentTime, 0.05); bed.humGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }
      return;
    }
    if (!bed && (rain > 0.01 || under)) bed = makeBed();
    const t = ctx.currentTime, dt = Math.min(0.1, t - clock);
    clock = t;
    if (was !== null && under !== was) play(under ? 'under' : 'splash', 0.3);
    was = under;
    tone.frequency.setTargetAtTime(under ? 520 : 6500, t, 0.06);
    if (!bed) return;
    // Outdoors the wash and the patter; under the glass roof both dull and
    // quieter; under water the wash becomes a deep hush and the patter a murmur.
    const r = Math.min(1, rain), [shade, wash, patter] = under ? [450, 0.8, 0.16] : indoor ? [900, 0.7, 0.8] : [4200, 1, 1];
    bed.level.gain.setTargetAtTime(1, t, 0.1);
    bed.shade.frequency.setTargetAtTime(shade, t, 0.08);
    bed.washGain.gain.setTargetAtTime(0.13 * Math.pow(r, 1.3) * wash, t, 0.2);
    bed.patterGain.gain.setTargetAtTime(0.155 * Math.pow(r, 0.7) * patter, t, 0.2);
    bed.humGain.gain.setTargetAtTime(under ? 0.03 : 0, t, 0.25);
    // Now and then a drop just overhead: a soft plip, rising.
    if (!under || r < 0.02) return;
    for (plinkIn -= dt; plinkIn <= 0; plinkIn += -Math.log(1 - Math.random()) / (1.5 + 4 * r)) {
      const f = 380 + Math.random() * 520;
      chirp(bed.drops, t + Math.random() * 0.05, f, f * 1.5, 0.06, 0.012 + Math.random() * 0.018);
    }
  }
  // A hidden tab goes quiet; the rain does not keep falling in the background.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { stopLoop(); ctx.suspend().catch(() => {}); }
    else if (on) ctx.resume().catch(() => {});
  });
  addEventListener('blur', () => { focused = false; stopLoop(); });
  addEventListener('focus', () => { focused = true; });
  // Browsers let sound start only from a gesture: the first one wakes the
  // rain for a visitor who left the sound on last time.
  const wake = () => { unlocked = true; if (on) { ensure(); ctx?.resume().catch(() => {}); } };
  addEventListener('pointerdown', wake, { once: true });
  addEventListener('keydown', wake, { once: true });

  function setOn(value) {
    on = !!value;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
    if (on) { unlocked = true; ensure(); ctx?.resume().catch(() => {}); }
    else stopLoop();
    if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .015);
  }

  return {
    play, effect, loop, ambience, setOn, get on() { return on; },
    status() { return { on, unlocked, focused, context: ctx?.state || 'uninitialized', loop: activityLoop?.name || null, intensity: activityLoop?.intensity || 0, played, last }; },
  };
}
