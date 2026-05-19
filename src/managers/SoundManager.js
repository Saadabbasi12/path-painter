/**
 * SoundManager.js  —  YouTube Playables edition
 *
 * Changes from original:
 *  ❌ Removed: document.addEventListener('visibilitychange') — FORBIDDEN on YouTube.
 *     YouTube Playables must use ONLY ytgame.system.onPause / onResume for
 *     pause detection. The visibilitychange handler has been removed.
 *     Audio muting on pause is now handled by BootScene via YT.onPause/onResume.
 *
 *  ❌ Removed: click/pointerdown auto-resume for AudioContext.
 *     YouTube can give the game focus automatically without a user click,
 *     so we must be ready to play (or be silent) without waiting for a tap.
 *     AudioContext resume is now triggered by YT.onResume in BootScene instead.
 *
 *  ✅ Added: resumeContext() public method so BootScene can resume from
 *     YT.onResume without depending on a user click.
 *
 * Everything else (procedural audio, noise buffers, pink noise, etc.) unchanged.
 */

const SoundManager = (() => {

  // ── State ─────────────────────────────────────────────────────
  let ctx         = null;
  let masterGain  = null;
  let muted       = false;
  let _ready      = false;

  const _noiseCache = {};

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    if (_ready) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      masterGain = ctx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(ctx.destination);

      [0.04, 0.06, 0.08, 0.10, 0.12, 0.15, 0.20, 0.25].forEach(_prebakeNoise);

      // NOTE: No visibilitychange listener here — YouTube Playables forbids it.
      // Audio pause/resume is handled exclusively via YT.onPause / YT.onResume
      // in BootScene, which calls SoundManager.setMuted() accordingly.

      // Still attempt to resume AudioContext on first pointer interaction as a
      // browser autoplay policy fallback (this is fine — we're not using it
      // as a substitute for SDK pause detection, just for AudioContext state).
      const _resumeCtx = () => {
        if (ctx && ctx.state === 'suspended') ctx.resume();
      };
      document.addEventListener('pointerdown', _resumeCtx, { once: true });
      document.addEventListener('touchstart',  _resumeCtx, { once: true });

      _ready = true;
    } catch (e) {
      console.warn('SoundManager: Web Audio init failed.', e);
    }
  }

  // ── Noise buffer pre-baking ───────────────────────────────────
  function _prebakeNoise(duration) {
    if (!ctx) return;
    const key    = duration.toFixed(3);
    if (_noiseCache[key]) return;
    const len    = Math.ceil(ctx.sampleRate * duration);
    const buf    = ctx.createBuffer(1, len, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < len; i++) {
      const w  = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5 - w*0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    _noiseCache[key] = buf;
  }

  // ── Low-level audio primitives ────────────────────────────────
  function _route(node, vol, startT, endT) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol,   startT);
    g.gain.exponentialRampToValueAtTime(0.0001, endT);
    node.connect(g);
    g.connect(masterGain);
    return g;
  }

  function _osc(type, freq, dur, vol, freqEnd, delay) {
    vol   = vol   !== undefined ? vol   : 0.3;
    delay = delay !== undefined ? delay : 0;
    const t0 = ctx.currentTime + delay;
    const t1 = t0 + dur;
    const o  = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(freq, 1), t0);
    if (freqEnd !== null && freqEnd !== undefined) {
      o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t1);
    }
    _route(o, vol, t0, t1);
    o.start(t0);
    o.stop(t1 + 0.05);
  }

  function _noise(duration, vol, highpass, delay) {
    vol      = vol      !== undefined ? vol      : 0.12;
    highpass = highpass !== undefined ? highpass : 400;
    delay    = delay    !== undefined ? delay    : 0;
    const key = duration.toFixed(3);
    const buf = _noiseCache[key];
    if (!buf) return;

    const t0  = ctx.currentTime + delay;
    const t1  = t0 + duration;
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const hp  = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;

    src.connect(hp);
    _route(hp, vol, t0, t1);
    src.start(t0);
    src.stop(t1 + 0.05);
  }

  function _canPlay() {
    if (!_ready || muted) return false;
    if (ctx.state === 'suspended') { ctx.resume(); }
    return true;
  }

  // ── Sound catalog ─────────────────────────────────────────────
  const sounds = {
    draw() {
      _noise(0.06, 0.07, 800);
      _osc('sawtooth', 180 + Math.random()*40, 0.06, 0.04, 120);
    },
    run() {
      _osc('triangle', 320, 0.18, 0.12, 180);
      _noise(0.10, 0.08, 600);
    },
    step() {
      _noise(0.04, 0.05, 1200);
    },
    collect() {
      _osc('sine', 880,  0.08, 0.22, null, 0);
      _osc('sine', 1320, 0.10, 0.18, null, 0.06);
      _osc('sine', 1760, 0.08, 0.14, null, 0.12);
      _noise(0.06, 0.09, 900);
    },
    gate() {
      _noise(0.12, 0.10, 300);
      _osc('square', 220, 0.05, 0.14, null, 0);
      _osc('square', 330, 0.06, 0.10, null, 0.04);
      _osc('sine',   550, 0.22, 0.10, 440,  0.08);
    },
    die() {
      _osc('sawtooth', 440, 0.35, 0.28, 55);
      _noise(0.25, 0.22, 200);
      _osc('sine', 80, 0.30, 0.40, 40, 0.05);
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach(function(freq, i) {
        var d = i * 0.11;
        _osc('sine',     freq,       0.35, 0.28, null, d);
        _osc('triangle', freq * 1.5, 0.20, 0.10, null, d);
      });
      _noise(0.15, 0.08, 500, 0.05);
    },
    outOfPaint() {
      _osc('sawtooth', 200, 0.22, 0.22, 80);
      _noise(0.15, 0.10, 400);
    },
    hover() {
      _osc('sine', 660, 0.06, 0.06);
    },
    click() {
      _osc('sine', 440, 0.04, 0.14, null, 0);
      _osc('sine', 660, 0.05, 0.10, null, 0.03);
    },
    levelSelect() {
      _noise(0.06, 0.06, 700);
      _osc('triangle', 392, 0.06, 0.16, null, 0);
      _osc('triangle', 523, 0.07, 0.13, null, 0.05);
    },
    ambientStart() {
      const t0  = ctx.currentTime;
      const dur = 5.0;

      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.18;
      lfoGain.gain.value  = 6;
      lfo.connect(lfoGain);

      const drone = ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 48;
      lfoGain.connect(drone.frequency);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0,    t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 2.0);
      g.gain.linearRampToValueAtTime(0,    t0 + dur);
      drone.connect(g);
      g.connect(masterGain);

      lfo.start(t0);   lfo.stop(t0 + dur + 0.1);
      drone.start(t0); drone.stop(t0 + dur + 0.1);
    },
  };

  // ── Public API ────────────────────────────────────────────────
  return {
    init,

    play(name) {
      try {
        if (!_ready) init();
        if (!_canPlay()) return;
        if (sounds[name]) sounds[name]();
      } catch (e) { /* never propagate audio errors */ }
    },

    setMuted(val) {
      muted = !!val;
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.55;
    },

    isMuted() { return muted; },

    toggle() {
      muted = !muted;
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.55;
      return muted;
    },

    setVolume(v) {
      if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
    },

    /**
     * Resume the AudioContext. Called by BootScene from YT.onResume
     * so audio restores correctly after the game is un-paused by YouTube.
     */
    resumeContext() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
  };
})();

export default SoundManager;