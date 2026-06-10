/* G.audio — synthesized WebAudio sfx + music for The Quiet Archipelago.
   Contract: G.audio = { sfx(name), music(id), setEnabled(bool), enabled() }.
   All synthesized (oscillators + noise buffers), no samples, no network.
   AudioContext is created lazily and resumed on the first user gesture.
   Everything that the game can call is wrapped in try/catch so a missing or
   failed AudioContext can never throw into the game loop.

   Sound architecture:

       voices/sends --> sfxBus --------\
                                        +--> masterFilter (lowpass ~3.5k)
       musicGain ---> [crossfade] -----/        |
                                                 +--> master gain (~0.5)
       delaySend --> delay (0.28s, fb 0.25, lowpassed) --> masterFilter

   Music is a small lookahead sequencer (the "tale of two clocks" pattern):
   a setInterval timer wakes every ~80ms and schedules any notes whose start
   time falls within the next ~200ms onto the precise AudioContext clock.
   Patterns are plain data; only active notes are scheduled; oscillators are
   stopped AND disconnected when they finish so no nodes leak.

   Leitmotif: one main theme (a rising 4-note hook, scale degrees 1-2-3-5)
   recurs across the islands — full & bright on the shore, minor in the rain
   of the strait, augmented & noble at the beacon, warmly resolved at the
   ending. Reusing one motif is what makes the whole archipelago feel like
   one place. */
(function () {
'use strict';

// ----------------------------------------------------------------------------
// Core graph (all created lazily on first real use)
// ----------------------------------------------------------------------------
var actx = null;          // the AudioContext (or null until first sound)
var master = null;        // final gain -> destination
var masterFilter = null;  // global lowpass, keeps chiptune voices soft
var sfxBus = null;        // all sfx route here
var delay = null;         // feedback delay (space send)
var delayFb = null;       // delay feedback gain
var delayFilt = null;     // lowpass inside the delay loop
var delaySend = null;     // send gain feeding the delay
var gestureHooked = false;
var enabled = true;

var MASTER_GAIN = 0.5;

// midi -> Hz
function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// Build (once) the shared graph. Returns false if WebAudio is unavailable.
function ensureGraph() {
  if (actx) return true;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  actx = new AC();

  master = actx.createGain();
  master.gain.value = MASTER_GAIN;

  masterFilter = actx.createBiquadFilter();
  masterFilter.type = 'lowpass';
  masterFilter.frequency.value = 3500;
  masterFilter.Q.value = 0.4;
  masterFilter.connect(master);
  master.connect(actx.destination);

  // Global feedback delay used as a "space" send.
  delay = actx.createDelay(1.0);
  delay.delayTime.value = 0.28;
  delayFb = actx.createGain();
  delayFb.gain.value = 0.25;
  delayFilt = actx.createBiquadFilter();
  delayFilt.type = 'lowpass';
  delayFilt.frequency.value = 2200;
  delaySend = actx.createGain();
  delaySend.gain.value = 1.0;
  // send -> delay -> filter -> (back into delay) and out to masterFilter
  delaySend.connect(delay);
  delay.connect(delayFilt);
  delayFilt.connect(delayFb);
  delayFb.connect(delay);
  delayFilt.connect(masterFilter);

  // sfx bus
  sfxBus = actx.createGain();
  sfxBus.gain.value = 1.0;
  sfxBus.connect(masterFilter);

  return true;
}

// Lazily get (and resume) the context. Hooks a one-time gesture resumer.
function ctx() {
  if (!ensureGraph()) return null;
  if (actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
  hookGesture();
  return actx;
}

// One-time document listener: many browsers start the context suspended until
// a user gesture. Resume on the first click/keydown, then remove the listeners.
function hookGesture() {
  if (gestureHooked || typeof document === 'undefined') return;
  gestureHooked = true;
  var resume = function () {
    try { if (actx && actx.state === 'suspended') actx.resume(); } catch (e) {}
    document.removeEventListener('click', resume, true);
    document.removeEventListener('keydown', resume, true);
    document.removeEventListener('touchstart', resume, true);
  };
  try {
    document.addEventListener('click', resume, true);
    document.addEventListener('keydown', resume, true);
    document.addEventListener('touchstart', resume, true);
  } catch (e) {}
}

// ----------------------------------------------------------------------------
// Noise buffer (shared, for splash/quake/step texture and percussion)
// ----------------------------------------------------------------------------
var noiseBuf = null;
function noiseBuffer() {
  if (noiseBuf) return noiseBuf;
  var len = Math.floor(actx.sampleRate * 0.5);
  var b = actx.createBuffer(1, len, actx.sampleRate);
  var d = b.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return noiseBuf;
}

// A short noise burst with a band/low/high pass and gain envelope.
function noise(dur, gain, filterType, freq, dest, delayT) {
  var ac = actx;
  var t = ac.currentTime + (delayT || 0);
  var src = ac.createBufferSource();
  src.buffer = noiseBuffer();
  src.loop = true;
  var f = ac.createBiquadFilter();
  f.type = filterType || 'bandpass';
  f.frequency.value = freq || 1000;
  f.Q.value = 0.8;
  var g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest || sfxBus);
  src.start(t);
  src.stop(t + dur + 0.02);
  src.onended = function () {
    try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {}
  };
}

// A simple enveloped oscillator tone for sfx. peakGain stays <= 0.08.
function tone(freq, dur, delayT, type, peakGain, dest, sendAmt) {
  var ac = actx;
  var t = ac.currentTime + (delayT || 0);
  var o = ac.createOscillator();
  var g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  var pk = Math.min(peakGain == null ? 0.04 : peakGain, 0.08);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pk, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest || sfxBus);
  if (sendAmt && delaySend) {
    var s = ac.createGain();
    s.gain.value = sendAmt;
    g.connect(s); s.connect(delaySend);
    // s is short-lived; disconnect with the oscillator below.
  }
  o.start(t);
  o.stop(t + dur + 0.03);
  o.onended = function () {
    try { o.disconnect(); g.disconnect(); } catch (e) {}
  };
  return o;
}

// A tone with a small downward/upward pitch glide (for sweeps like zap/sail).
function glide(f0, f1, dur, delayT, type, peakGain, dest) {
  var ac = actx;
  var t = ac.currentTime + (delayT || 0);
  var o = ac.createOscillator();
  var g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  var pk = Math.min(peakGain == null ? 0.04 : peakGain, 0.08);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pk, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.03);
  o.onended = function () {
    try { o.disconnect(); g.disconnect(); } catch (e) {}
  };
}

// ----------------------------------------------------------------------------
// SFX definitions — charming, short, gentle. peaks <= 0.08.
// ----------------------------------------------------------------------------
var SFX = {
  // soft footstep: a low triangle tick + a whisper of filtered noise
  step: function () {
    tone(180 + Math.random() * 30, 0.05, 0, 'triangle', 0.02);
    noise(0.04, 0.012, 'lowpass', 400);
  },
  // dull thud against a wall
  bump: function () {
    glide(150, 90, 0.09, 0, 'triangle', 0.05);
    noise(0.05, 0.02, 'lowpass', 300);
  },
  // VERY quiet pitch-jittered blip for typewriter text (fires every ~50ms)
  talk: function () {
    tone(560 + Math.random() * 180, 0.022, 0, 'square', 0.012);
  },
  // moving the cursor over a dialogue choice
  choice: function () {
    tone(680, 0.05, 0, 'square', 0.03);
  },
  // confirming a choice / menu select
  select: function () {
    tone(720, 0.04, 0, 'square', 0.035);
    tone(1080, 0.05, 0.03, 'square', 0.025);
  },
  // opening a menu / box: little rising two-note
  open: function () {
    tone(520, 0.06, 0, 'triangle', 0.035);
    tone(700, 0.08, 0.05, 'triangle', 0.03);
  },
  // closing: falling two-note
  close: function () {
    tone(700, 0.05, 0, 'triangle', 0.03);
    tone(460, 0.07, 0.045, 'triangle', 0.03);
  },
  // puzzle solved: bright ascending arpeggio jingle (<=900ms)
  solve: function () {
    var seq = [659, 784, 988, 1319];
    for (var i = 0; i < seq.length; i++) tone(seq[i], 0.16, i * 0.09, 'square', 0.05, sfxBus, 0.18);
    tone(1568, 0.4, 0.36, 'sine', 0.04, sfxBus, 0.25);
  },
  // gentle "nope": two soft falling minor tones
  fail: function () {
    glide(300, 240, 0.14, 0, 'triangle', 0.045);
    glide(240, 180, 0.18, 0.11, 'triangle', 0.045);
  },
  // a spark collected: shimmery high ping with delay tail
  spark: function () {
    tone(1175, 0.08, 0, 'sine', 0.05, sfxBus, 0.3);
    tone(1568, 0.12, 0.06, 'sine', 0.04, sfxBus, 0.35);
  },
  // a door/gate opening: woody two-note + airy noise
  door: function () {
    tone(300, 0.1, 0, 'triangle', 0.05);
    tone(450, 0.12, 0.08, 'triangle', 0.045);
    noise(0.12, 0.02, 'bandpass', 900, sfxBus, 0.04);
  },
  // water splash: filtered noise sweep
  splash: function () {
    noise(0.16, 0.05, 'bandpass', 1400);
    noise(0.1, 0.03, 'highpass', 2200, sfxBus, 0.06);
  },
  // setting sail: soft sine swell with delay
  sail: function () {
    glide(330, 392, 0.22, 0, 'sine', 0.045, sfxBus, 0.2);
    tone(196, 0.24, 0, 'triangle', 0.025);
  },
  // electric zap: quick descending saw with a touch of noise
  zap: function () {
    glide(1200, 300, 0.07, 0, 'sawtooth', 0.05);
    noise(0.05, 0.02, 'highpass', 2500);
  },
  // ground rumble: very low saw + low noise
  quake: function () {
    glide(80, 45, 0.45, 0, 'sawtooth', 0.06);
    noise(0.4, 0.04, 'lowpass', 160);
  },
  // beacon relight: warm rising fanfare jingle (<=900ms)
  beacon: function () {
    var seq = [392, 523, 659, 784, 1047];
    for (var i = 0; i < seq.length; i++) {
      tone(seq[i], 0.22, i * 0.12, 'triangle', 0.05, sfxBus, 0.22);
    }
    tone(1319, 0.5, 0.6, 'sine', 0.045, sfxBus, 0.3);
  },
  // new hat earned: cute little three-note flourish (<=900ms)
  hat: function () {
    var seq = [784, 988, 1319];
    for (var i = 0; i < seq.length; i++) tone(seq[i], 0.12, i * 0.09, 'square', 0.045, sfxBus, 0.2);
  },
  // save chime: quiet sine ping
  save: function () {
    tone(880, 0.06, 0, 'sine', 0.025, sfxBus, 0.15);
    tone(1175, 0.08, 0.05, 'sine', 0.02, sfxBus, 0.15);
  },
};

// ----------------------------------------------------------------------------
// MUSIC — lookahead pattern sequencer with one recurring main theme.
// ----------------------------------------------------------------------------
//
// Voices:
//   'lead'  square wave with subtle vibrato
//   'bass'  triangle wave, short
//   'pad'   sine with slow attack, sustained
//   'perc'  noise tick
//
// Patterns are arrays of { beat, note (midi), dur (in beats), voice, vel }.
// A track has { bpm, beats (loop length), pattern, send (delay amount) }.
//
// The MAIN THEME hook (rising) as scale degrees over a tonic: 1, 2, 3, 5.
// We render it transposed/rescaled per island so the leitmotif stays audible.

// Build a note from a root midi + scale-degree offsets within a given scale.
function deg(root, scale, d) {
  // d is a 0-based scale degree, may exceed an octave (wraps with +12 per octave)
  var oct = Math.floor(d / scale.length);
  var idx = ((d % scale.length) + scale.length) % scale.length;
  return root + 12 * oct + scale[idx];
}

var SCALES = {
  major:  [0, 2, 4, 5, 7, 9, 11],
  minor:  [0, 2, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

// Music graph state -----------------------------------------------------------
var currentId = null;
var schedTimer = null;
var lookahead = 0.08;      // setInterval period (s)  -> 80ms
var scheduleAhead = 0.2;   // schedule window (s)     -> 200ms

// Each "deck" plays one track and has its own gain for crossfading.
var decks = []; // { id, gain, def, nextNoteTime, beatPos, alive }

function makeDeckGain() {
  var g = actx.createGain();
  g.gain.value = 0.0;
  g.connect(masterFilter);
  return g;
}

// Schedule one note onto the precise clock; returns nothing, self-cleans.
function scheduleNote(deck, n, when) {
  var ac = actx;
  var g = deck.gain;
  var vel = (n.vel == null ? 0.7 : n.vel);
  var dur = n.dur * deck.secPerBeat;
  if (n.voice === 'perc') {
    // percussion tick: short filtered noise, no pitch
    var src = ac.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    var f = ac.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    var pg = ac.createGain();
    var pAmp = 0.035 * vel;
    pg.gain.setValueAtTime(0.0001, when);
    pg.gain.exponentialRampToValueAtTime(pAmp, when + 0.004);
    pg.gain.exponentialRampToValueAtTime(0.0001, when + Math.min(dur, 0.08));
    src.connect(f); f.connect(pg); pg.connect(g);
    src.start(when);
    src.stop(when + Math.min(dur, 0.1) + 0.02);
    src.onended = function () { try { src.disconnect(); f.disconnect(); pg.disconnect(); } catch (e) {} };
    return;
  }

  var freq = mtof(n.note);
  var o = ac.createOscillator();
  var g2 = ac.createGain();
  var amp;
  var atk, rel;

  if (n.voice === 'bass') {
    o.type = 'triangle';
    amp = 0.10 * vel;
    atk = 0.01; rel = Math.min(dur, 0.18);
  } else if (n.voice === 'pad') {
    o.type = 'sine';
    amp = 0.055 * vel;
    atk = Math.min(dur * 0.45, 0.6);  // slow attack
    rel = Math.min(dur * 0.6, 1.2);
  } else { // 'lead'
    o.type = 'square';
    amp = 0.06 * vel;
    atk = 0.012; rel = Math.min(dur * 0.7, 0.4);
    // subtle vibrato via a tiny LFO on the lead's frequency
    var lfo = ac.createOscillator();
    var lfoG = ac.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 5.2;
    lfoG.gain.value = freq * 0.006; // ~0.6% vibrato depth
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    lfo.start(when);
    lfo.stop(when + dur + 0.05);
    lfo.onended = function () { try { lfo.disconnect(); lfoG.disconnect(); } catch (e) {} };
  }

  o.frequency.setValueAtTime(freq, when);
  var endA = when + atk;
  var endN = when + dur;
  g2.gain.setValueAtTime(0.0001, when);
  g2.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp), endA);
  // gentle hold then release to near-zero
  g2.gain.setValueAtTime(Math.max(0.0002, amp), Math.max(endA, endN - rel));
  g2.gain.exponentialRampToValueAtTime(0.0001, endN);

  o.connect(g2);
  g2.connect(g);

  // per-voice delay send for space
  if (deck.def.send && delaySend) {
    var sg = ac.createGain();
    sg.gain.value = deck.def.send * (n.voice === 'lead' ? 1.0 : 0.5);
    g2.connect(sg); sg.connect(delaySend);
    o.onended = function () { try { o.disconnect(); g2.disconnect(); sg.disconnect(); } catch (e) {} };
  } else {
    o.onended = function () { try { o.disconnect(); g2.disconnect(); } catch (e) {} };
  }

  o.start(when);
  o.stop(endN + 0.05);
}

// The scheduler: advance each alive deck, scheduling notes within the window.
function scheduler() {
  if (!actx) return;
  var horizon = actx.currentTime + scheduleAhead;
  for (var d = 0; d < decks.length; d++) {
    var deck = decks[d];
    if (!deck.alive) continue;
    var def = deck.def;
    while (deck.nextNoteTime < horizon) {
      // Schedule every note whose beat falls in the current bar position.
      var loopStart = deck.nextNoteTime;
      var pat = def.pattern;
      for (var i = 0; i < pat.length; i++) {
        var n = pat[i];
        var when = loopStart + n.beat * deck.secPerBeat;
        if (when >= actx.currentTime - 0.01 && when < horizon) {
          scheduleNote(deck, n, when);
        }
      }
      // advance by one full loop
      deck.nextNoteTime += def.beats * deck.secPerBeat;
    }
  }
}

function startScheduler() {
  if (schedTimer != null) return;
  schedTimer = setInterval(scheduler, lookahead * 1000);
}
function stopSchedulerIfIdle() {
  var any = false;
  for (var i = 0; i < decks.length; i++) if (decks[i].alive) any = true;
  if (!any && schedTimer != null) { clearInterval(schedTimer); schedTimer = null; }
}

// Fade a deck's gain and retire it after the fade.
function retireDeck(deck, fadeT) {
  var ac = actx;
  var t = ac.currentTime;
  try {
    deck.gain.gain.cancelScheduledValues(t);
    deck.gain.gain.setValueAtTime(deck.gain.gain.value, t);
    deck.gain.gain.linearRampToValueAtTime(0.0001, t + fadeT);
  } catch (e) {}
  deck.fadingOutUntil = t + fadeT;
  // Mark not-alive shortly after fade so no further notes schedule, then drop.
  setTimeout(function () {
    deck.alive = false;
    try { deck.gain.disconnect(); } catch (e) {}
    var ix = decks.indexOf(deck);
    if (ix >= 0) decks.splice(ix, 1);
    stopSchedulerIfIdle();
  }, Math.ceil(fadeT * 1000) + 60);
}

function startDeck(id, def, fadeT, level) {
  var ac = actx;
  var deck = {
    id: id,
    def: def,
    gain: makeDeckGain(),
    secPerBeat: 60 / def.bpm,
    nextNoteTime: 0,
    alive: true,
  };
  // align the loop start to a tidy point a hair in the future
  deck.nextNoteTime = ac.currentTime + 0.06;
  decks.push(deck);
  var t = ac.currentTime;
  deck.gain.gain.cancelScheduledValues(t);
  deck.gain.gain.setValueAtTime(0.0001, t);
  deck.gain.gain.linearRampToValueAtTime(level == null ? 0.85 : level, t + fadeT);
  startScheduler();
  return deck;
}

var CROSSFADE = 1.5;

function switchMusic(id) {
  if (!ensureGraph()) return;
  if (id === currentId) return; // no-op when already on this track
  // fade out all current decks
  for (var i = 0; i < decks.length; i++) {
    if (decks[i].alive) retireDeck(decks[i], CROSSFADE);
  }
  currentId = id;
  if (id == null) { stopSchedulerIfIdle(); return; }
  var def = TRACKS[id];
  if (!def) { return; }
  startDeck(id, def, CROSSFADE);
}

// Stop everything (used when sound is disabled).
function stopAllMusic() {
  for (var i = decks.length - 1; i >= 0; i--) {
    try { decks[i].gain.disconnect(); } catch (e) {}
    decks[i].alive = false;
  }
  decks.length = 0;
  if (schedTimer != null) { clearInterval(schedTimer); schedTimer = null; }
  currentId = null;
}

// ----------------------------------------------------------------------------
// TRACK DATA — one main theme transformed across the islands.
// ----------------------------------------------------------------------------
//
// Helper builders keep the pattern data terse. We compose patterns from a
// bass line, a pad, the main-theme lead, and percussion, all as data.

// The main theme hook as scale degrees (1,2,3,5 rising, then a turn).
// Returned as note events given (root, scale, startBeat, beatLen, voice, vel).
function themeHook(root, scale, start, step, voice, vel, octave) {
  var o = (octave || 0) * 7;
  var degs = [0, 1, 2, 4, 2, 4, 6, 4]; // 1 2 3 5 3 5 7 5 — rising hook + gentle fall
  var out = [];
  for (var i = 0; i < degs.length; i++) {
    out.push({ beat: start + i * step, note: deg(root, scale, degs[i] + o), dur: step * 0.9, voice: voice, vel: vel });
  }
  return out;
}

// A simple alternating bass on roots/fifths.
function bassLine(root, scale, beats, step, degsArr, vel) {
  var out = [];
  var b = 0, i = 0;
  while (b < beats) {
    var dg = degsArr[i % degsArr.length];
    out.push({ beat: b, note: deg(root, scale, dg) - 12, dur: step, voice: 'bass', vel: vel == null ? 0.7 : vel });
    b += step; i++;
  }
  return out;
}

// A sustained pad chord (root, third, fifth) held for `len` beats from `start`.
function padChord(root, scale, start, len, chordDegs, vel) {
  var out = [];
  for (var i = 0; i < chordDegs.length; i++) {
    out.push({ beat: start, note: deg(root, scale, chordDegs[i]), dur: len, voice: 'pad', vel: vel == null ? 0.6 : vel });
  }
  return out;
}

// Percussion ticks on a list of beats.
function percAt(beatsArr, vel) {
  var out = [];
  for (var i = 0; i < beatsArr.length; i++) out.push({ beat: beatsArr[i], note: 0, dur: 0.1, voice: 'perc', vel: vel == null ? 0.7 : vel });
  return out;
}

function concat() {
  var out = [];
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    for (var j = 0; j < a.length; j++) out.push(a[j]);
  }
  return out;
}

// Roots are absolute MIDI note numbers (C4 = 60).
var C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69;

// Build all tracks. Each is an 8-bar-ish loop in 4/4 (forest is 3/4).
var TRACKS = (function () {
  var T = {};

  // --- TITLE: sparse wonder, slow, the rising hook stated alone, with space.
  // 8 beats per loop, 96 bpm. Lead states 1-2-3-5; pad underneath; barely any perc.
  T.title = {
    bpm: 96, beats: 16, send: 0.4,
    pattern: concat(
      // sparse pad on the tonic then on the relative IV
      padChord(A4 - 12, SCALES.major, 0, 8, [0, 2, 4], 0.5),
      padChord(D4 - 12, SCALES.major, 8, 8, [0, 2, 4], 0.45),
      // the hook, slow, high and clear
      [
        { beat: 1, note: deg(A4, SCALES.major, 0), dur: 1.5, voice: 'lead', vel: 0.6 },
        { beat: 3, note: deg(A4, SCALES.major, 1), dur: 1.5, voice: 'lead', vel: 0.6 },
        { beat: 5, note: deg(A4, SCALES.major, 2), dur: 1.5, voice: 'lead', vel: 0.65 },
        { beat: 7, note: deg(A4, SCALES.major, 4), dur: 2.0, voice: 'lead', vel: 0.7 },
        { beat: 11, note: deg(A4, SCALES.major, 4), dur: 1.0, voice: 'lead', vel: 0.55 },
        { beat: 13, note: deg(A4, SCALES.major, 2), dur: 3.0, voice: 'lead', vel: 0.6 },
      ],
      bassLine(A4 - 24, SCALES.major, 16, 4, [0, 3], 0.55),
      percAt([0, 8], 0.4)
    ),
  };

  // --- SHORE: bright major, gentle, the main theme in full + light groove.
  // 16 beats, 116 bpm.
  T.shore = {
    bpm: 116, beats: 16, send: 0.3,
    pattern: concat(
      themeHook(C4 + 12, SCALES.major, 0, 1, 'lead', 0.7, 0),
      themeHook(C4 + 12, SCALES.major, 8, 1, 'lead', 0.7, 0),
      bassLine(C4, SCALES.major, 16, 2, [0, 4, 5, 4], 0.65),
      padChord(C4, SCALES.major, 0, 8, [0, 2, 4], 0.5),
      padChord(F4, SCALES.major, 8, 4, [0, 2, 4], 0.5),
      padChord(G4, SCALES.major, 12, 4, [0, 2, 4], 0.5),
      percAt([0, 2, 4, 6, 8, 10, 12, 14], 0.55),
      percAt([1, 3, 5, 7, 9, 11, 13, 15], 0.3)
    ),
  };

  // --- DUNES: airy lydian (raised 4th), lighter percussion, floaty.
  T.dunes = {
    bpm: 110, beats: 16, send: 0.45,
    pattern: concat(
      themeHook(D4 + 12, SCALES.lydian, 0, 1, 'lead', 0.6, 0),
      // sparse echo of the hook up an octave-ish
      [
        { beat: 9, note: deg(D4 + 12, SCALES.lydian, 4), dur: 1.0, voice: 'lead', vel: 0.5 },
        { beat: 11, note: deg(D4 + 12, SCALES.lydian, 6), dur: 1.0, voice: 'lead', vel: 0.5 },
        { beat: 13, note: deg(D4 + 12, SCALES.lydian, 7), dur: 2.0, voice: 'lead', vel: 0.55 },
      ],
      bassLine(D4 - 12, SCALES.lydian, 16, 4, [0, 4], 0.55),
      padChord(D4, SCALES.lydian, 0, 8, [0, 3, 6], 0.45),  // lydian shimmer (raised 4)
      padChord(G4, SCALES.lydian, 8, 8, [0, 2, 4], 0.45),
      percAt([0, 6, 8, 14], 0.4)
    ),
  };

  // --- FOREST: folk WALTZ in 3/4, warm, dorian-ish. 12 beats (4 bars of 3).
  T.forest = {
    bpm: 126, beats: 12, send: 0.3,
    pattern: concat(
      // lilting lead line that nods to the hook (1 2 3 5)
      [
        { beat: 0, note: deg(G4, SCALES.dorian, 0), dur: 1.0, voice: 'lead', vel: 0.65 },
        { beat: 1, note: deg(G4, SCALES.dorian, 1), dur: 0.8, voice: 'lead', vel: 0.55 },
        { beat: 2, note: deg(G4, SCALES.dorian, 2), dur: 0.8, voice: 'lead', vel: 0.55 },
        { beat: 3, note: deg(G4, SCALES.dorian, 4), dur: 1.6, voice: 'lead', vel: 0.7 },
        { beat: 6, note: deg(G4, SCALES.dorian, 3), dur: 1.0, voice: 'lead', vel: 0.6 },
        { beat: 7, note: deg(G4, SCALES.dorian, 2), dur: 0.8, voice: 'lead', vel: 0.55 },
        { beat: 9, note: deg(G4, SCALES.dorian, 1), dur: 1.0, voice: 'lead', vel: 0.55 },
        { beat: 10, note: deg(G4, SCALES.dorian, 0), dur: 2.0, voice: 'lead', vel: 0.6 },
      ],
      // waltz bass: root on 1, chord-ish on 2 & 3
      [
        { beat: 0, note: deg(G4 - 12, SCALES.dorian, 0) - 12, dur: 0.9, voice: 'bass', vel: 0.7 },
        { beat: 3, note: deg(G4 - 12, SCALES.dorian, 0) - 12, dur: 0.9, voice: 'bass', vel: 0.7 },
        { beat: 6, note: deg(G4 - 12, SCALES.dorian, 3) - 12, dur: 0.9, voice: 'bass', vel: 0.7 },
        { beat: 9, note: deg(G4 - 12, SCALES.dorian, 4) - 12, dur: 0.9, voice: 'bass', vel: 0.7 },
      ],
      padChord(G4, SCALES.dorian, 0, 6, [0, 2, 4], 0.4),
      padChord(C4 + 12, SCALES.dorian, 6, 6, [0, 2, 4], 0.4),
      // waltz "oom-pah-pah" tick on beats 2 and 3 of each bar
      percAt([1, 2, 4, 5, 7, 8, 10, 11], 0.35)
    ),
  };

  // --- STRAIT: minor, rain mood, slower, the main theme IN MINOR.
  T.strait = {
    bpm: 100, beats: 16, send: 0.4,
    pattern: concat(
      themeHook(A4, SCALES.minor, 0, 1, 'lead', 0.55, 0),  // hook, minor
      themeHook(A4, SCALES.minor, 8, 1, 'lead', 0.5, 0),
      bassLine(A4 - 24, SCALES.minor, 16, 4, [0, 5, 3, 5], 0.6),
      padChord(A4 - 12, SCALES.minor, 0, 8, [0, 2, 4], 0.5),
      padChord(D4, SCALES.minor, 8, 4, [0, 2, 4], 0.45),
      padChord(E4, SCALES.minor, 12, 4, [0, 2, 4], 0.45),
      // sparse "rain" ticks (high noise) scattered
      percAt([0, 2.5, 4, 5.5, 8, 9.5, 12, 13.5, 14.5], 0.28)
    ),
  };

  // --- CAVERNS: very sparse, echoing single notes (delay does the work).
  T.caverns = {
    bpm: 92, beats: 16, send: 0.75,
    pattern: concat(
      // lonely notes, lots of space, hook fragments far apart
      [
        { beat: 0, note: deg(E4, SCALES.minor, 0), dur: 1.5, voice: 'lead', vel: 0.5 },
        { beat: 4, note: deg(E4, SCALES.minor, 2), dur: 1.5, voice: 'lead', vel: 0.45 },
        { beat: 9, note: deg(E4, SCALES.minor, 4), dur: 1.5, voice: 'lead', vel: 0.5 },
        { beat: 13, note: deg(E4, SCALES.minor, 1), dur: 2.0, voice: 'lead', vel: 0.4 },
      ],
      // deep slow drone pad
      padChord(E4 - 24, SCALES.minor, 0, 16, [0, 4], 0.4),
      bassLine(E4 - 24, SCALES.minor, 16, 8, [0, 3], 0.5),
      percAt([0, 8], 0.25)
    ),
  };

  // --- SPIRES: dreamy, slow arps, soft 7th chords, dusk.
  T.spires = {
    bpm: 108, beats: 16, send: 0.55,
    pattern: concat(
      // gentle ascending arpeggio (a 7th chord spelled out) repeated
      [
        { beat: 0, note: deg(F4, SCALES.major, 0), dur: 0.9, voice: 'lead', vel: 0.45 },
        { beat: 1, note: deg(F4, SCALES.major, 2), dur: 0.9, voice: 'lead', vel: 0.45 },
        { beat: 2, note: deg(F4, SCALES.major, 4), dur: 0.9, voice: 'lead', vel: 0.45 },
        { beat: 3, note: deg(F4, SCALES.major, 6), dur: 0.9, voice: 'lead', vel: 0.5 },
        { beat: 4, note: deg(F4 + 12, SCALES.major, 0), dur: 1.2, voice: 'lead', vel: 0.5 },
        { beat: 8, note: deg(D4, SCALES.major, 0), dur: 0.9, voice: 'lead', vel: 0.45 },
        { beat: 9, note: deg(D4, SCALES.major, 2), dur: 0.9, voice: 'lead', vel: 0.45 },
        { beat: 10, note: deg(D4, SCALES.major, 4), dur: 0.9, voice: 'lead', vel: 0.45 },
        { beat: 11, note: deg(D4, SCALES.major, 6), dur: 0.9, voice: 'lead', vel: 0.5 },
        { beat: 12, note: deg(D4 + 12, SCALES.major, 0), dur: 1.5, voice: 'lead', vel: 0.5 },
      ],
      // soft 7th-chord pads (root, third, fifth, seventh)
      padChord(F4 - 12, SCALES.major, 0, 8, [0, 2, 4, 6], 0.4),
      padChord(D4 - 12, SCALES.major, 8, 8, [0, 2, 4, 6], 0.4),
      bassLine(F4 - 24, SCALES.major, 16, 8, [0, 5], 0.45),
      percAt([0, 4, 8, 12], 0.22)
    ),
  };

  // --- BEACON: noble, slow build, the main theme AUGMENTED (doubled lengths).
  T.beacon = {
    bpm: 104, beats: 16, send: 0.4,
    pattern: concat(
      // augmented hook: each note twice as long, stately
      [
        { beat: 0, note: deg(C4 + 12, SCALES.major, 0), dur: 2.0, voice: 'lead', vel: 0.65 },
        { beat: 2, note: deg(C4 + 12, SCALES.major, 1), dur: 2.0, voice: 'lead', vel: 0.65 },
        { beat: 4, note: deg(C4 + 12, SCALES.major, 2), dur: 2.0, voice: 'lead', vel: 0.7 },
        { beat: 6, note: deg(C4 + 12, SCALES.major, 4), dur: 2.0, voice: 'lead', vel: 0.75 },
        { beat: 8, note: deg(C4 + 12, SCALES.major, 4), dur: 2.0, voice: 'lead', vel: 0.6 },
        { beat: 10, note: deg(C4 + 12, SCALES.major, 6), dur: 2.0, voice: 'lead', vel: 0.7 },
        { beat: 12, note: deg(C4 + 24, SCALES.major, 0), dur: 4.0, voice: 'lead', vel: 0.75 },
      ],
      // strong tonic-dominant bass, noble
      bassLine(C4 - 24, SCALES.major, 16, 4, [0, 4, 0, 4], 0.7),
      padChord(C4, SCALES.major, 0, 8, [0, 2, 4], 0.55),
      padChord(G4, SCALES.major, 8, 4, [0, 2, 4], 0.55),
      padChord(C4, SCALES.major, 12, 4, [0, 2, 4], 0.55),
      percAt([0, 4, 8, 12], 0.5)
    ),
  };

  // --- ENDING: warm resolution of the main theme, major, gentle, full cadence.
  T.ending = {
    bpm: 100, beats: 16, send: 0.45,
    pattern: concat(
      themeHook(C4 + 12, SCALES.major, 0, 1, 'lead', 0.65, 0),
      // resolve up to the tonic and hold
      [
        { beat: 9, note: deg(C4 + 12, SCALES.major, 4), dur: 1.0, voice: 'lead', vel: 0.55 },
        { beat: 11, note: deg(C4 + 12, SCALES.major, 2), dur: 1.0, voice: 'lead', vel: 0.55 },
        { beat: 13, note: deg(C4 + 24, SCALES.major, 0), dur: 3.0, voice: 'lead', vel: 0.65 },
      ],
      // warm plagal-ish cadence: I - IV - I
      bassLine(C4 - 24, SCALES.major, 16, 4, [0, 3, 4, 0], 0.6),
      padChord(C4, SCALES.major, 0, 6, [0, 2, 4], 0.55),
      padChord(F4, SCALES.major, 6, 4, [0, 2, 4], 0.5),
      padChord(G4, SCALES.major, 10, 2, [0, 2, 4], 0.5),
      padChord(C4, SCALES.major, 12, 4, [0, 2, 4], 0.55),
      percAt([0, 4, 8, 12], 0.4)
    ),
  };

  return T;
})();

// ----------------------------------------------------------------------------
// Public surface — every call try/caught so audio can never crash the game.
// ----------------------------------------------------------------------------
G.audio = {
  enabled: function () { return enabled; },

  setEnabled: function (b) {
    try {
      enabled = !!b;
      G.save.data.sound = enabled;
      G.save.persist();
      if (!enabled) {
        // disabled: stop all music immediately, future sfx are silent
        if (actx) stopAllMusic();
      } else {
        // re-enabling does not auto-resume a track; caller will call music()
      }
    } catch (e) {}
  },

  sfx: function (name) {
    try {
      if (!enabled) return;
      var fn = SFX[name];
      if (!fn) return;
      if (!ctx()) return;       // also resumes + hooks gesture
      fn();
    } catch (e) { /* never throw into the game */ }
  },

  music: function (id) {
    try {
      if (!enabled) { currentId = id == null ? null : id; if (actx) stopAllMusic(); return; }
      if (!ctx()) return;       // ensures graph, resume, gesture hook
      switchMusic(id == null ? null : id);
    } catch (e) { /* never throw into the game */ }
  },
};

// Respect persisted preference on load (default on unless explicitly false).
try { enabled = (G.save && G.save.data && G.save.data.sound !== false); } catch (e) { enabled = true; }

})();
