// ===========================================================================
// audio.js — tiny WebAudio SFX synth (no asset files). All sounds are
// generated on the fly. Guarded so the game runs fine if audio is blocked.
// Must be unlocked by a user gesture (handled on first tap/start).
// ===========================================================================

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.muted = false;   // master mute, driven by the HUD sound toggle
    // Word narration: the announcer reads each Spanish answer out loud (see
    // speakWord). It's a SEPARATE toggle from the master mute so a player can
    // keep the music + SFX but silence the voice. Restored from a prior session.
    // NOTE the storage key is v2: the old key dates from the robotic-TTS era —
    // players (and Dylan) turned the voice OFF back then and the flag stuck,
    // which read as "the announcer is broken" once the studio voice shipped.
    // A new key resets everyone to ON exactly once.
    this.narrate = (typeof localStorage !== 'undefined' &&
                    localStorage.getItem('radgato.narrate2') === '0') ? false : true;
    this._voice = null;
    // Called with (durationMs) whenever a voice clip actually starts — the game
    // wires this to music.duck() so the announcer sits ON TOP of the soundtrack
    // instead of underneath it.
    this.onVoice = null;
    // DEV ONLY: localStorage radgato.silenttest=1 forces every clip/utterance
    // to volume 0 while still *playing* — automated tests can verify audio
    // fired without a laptop ever making a sound. Never set in production.
    this.silentTest = (typeof localStorage !== 'undefined' &&
                       localStorage.getItem('radgato.silenttest') === '1');
  }

  setNarrate(on) {
    this.narrate = !!on;
    try { localStorage.setItem('radgato.narrate2', this.narrate ? '1' : '0'); } catch { /* ignore */ }
    if (!this.narrate && typeof speechSynthesis !== 'undefined') {
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    return this.narrate;
  }

  // Speak a Spanish word aloud with the browser's on-device TTS. Free, needs no
  // audio assets, and pronounces any word correctly — exactly what a language
  // game wants. Gated by BOTH the master mute and the narration toggle. The
  // game only calls this for words worth hearing (2+ syllables); short function
  // words ("y", "de", "un") are skipped by the caller.
  speakWord(text, opts) {
    if (this.muted || !this.narrate || !text) return;
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    // Reserve the voice lane for roughly how long this will take to say, and
    // wait out whatever is already talking (e.g. the ¡EN FUEGO! call).
    const durMs = 550 + text.length * 85;
    const delay = this._laneDelay(durMs);
    setTimeout(() => {
      if (this.muted || !this.narrate) return;
      // STUDIO CLIPS ONLY. Every word/line the game speaks has a recorded male
      // clip; if one is somehow missing we stay SILENT rather than let the
      // device's (often female, always robotic) TTS voice leak through.
      this._playVo(text, durMs);
    }, delay);
  }

  // Announcer line for game EVENTS (new trick, new gear, last trick). Unlike
  // speakWord this is NOT gated by the word-narration toggle — turning off
  // per-word pronunciation shouldn't also mute the hype man. Master mute only.
  say(text) {
    if (this.muted || !text) return;
    const durMs = 550 + text.length * 85;
    const delay = this._laneDelay(durMs);
    setTimeout(() => { if (!this.muted) this._playVo(text, durMs); }, delay);
  }

  // Big celebratory fanfare for unlocking new gear — rising arpeggio, a shimmer
  // and a couple of firework "thumps". Varied by `variant` so the reward beat
  // isn't identical every single time.
  fanfare(variant = 0) {
    if (!this.ctx || this.muted) return;
    const sets = [
      [523, 659, 784, 1047, 1319, 1568],
      [440, 554, 659, 880, 1109, 1319],
      [587, 740, 880, 1175, 1480, 1760],
    ];
    const notes = sets[variant % sets.length];
    notes.forEach((f, i) => this._tone(f, 0.22, 'square', 0.17, i * 0.085));
    notes.forEach((f, i) => this._tone(f * 2, 0.16, 'triangle', 0.08, 0.05 + i * 0.085));
    for (let i = 0; i < 3; i++) this.firework(0.5 + i * 0.42);
  }

  // A firework: low thump + a noise burst that sparkles out.
  firework(when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    this._tone(90, 0.18, 'sine', 0.22, when, 40);           // thump
    const D = 0.7;
    const len = Math.floor(this.ctx.sampleRate * D);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.setValueAtTime(2, t0);
    bp.frequency.setValueAtTime(2600, t0);
    bp.frequency.exponentialRampToValueAtTime(900, t0 + D);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
    src.connect(bp).connect(g).connect(this.ctx.destination);
    src.start(t0); src.stop(t0 + D);
  }

  // Prefer a MALE Spanish system voice — the pre-recorded announcer ("¡Gato en
  // fuego!" etc.) is male, and the default es-ES pick (Mónica) is female, so
  // the two read as different people. Voice objects carry no gender flag, so we
  // match known male Spanish voice names; if only a female voice exists we drop
  // the utterance pitch to keep the announcer consistent-ish. Voices populate
  // asynchronously on some browsers, so this may return null on the first call.
  _pickVoice() {
    if (this._voice) return this._voice;
    try {
      const list = speechSynthesis.getVoices() || [];
      const es = list.filter((v) => /^es(-|_)/i.test(v.lang) || /spanish|espa/i.test(v.name));
      // Classic male Spanish names + Apple's male multilingual voices (Eddy,
      // Reed, Rocko ship in es-ES / es-MX flavours on iOS and macOS).
      const MALE = /jorge|diego|juan|carlos|andr[eé]s|enrique|pablo|luis|miguel|antonio|[aá]lvaro|mateo|dami[aá]n|eddy|reed|rocko|grandpa/i;
      const male = es.find((v) => MALE.test(v.name));
      this._deepen = !male;                       // no male voice → pitch down
      this._voice = male || es[0] || null;
    } catch { this._voice = null; }
    return this._voice;
  }

  // Warm a clip without playing it, so the FIRST time a word is spoken it's
  // already the studio voice (otherwise call #1 fell back to TTS while the
  // mp3 probed). The whole VO set is ~1.7MB — cheaper than one backdrop.
  preloadVo(text) {
    const slug = text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ ]/g, '').trim().replace(/ +/g, '_');
    if (!slug) return;
    this._vo = this._vo || {};
    const ck = `${this.voLang || 'es'}:${slug}`;
    if (this._vo[ck]) return;
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.src = `${this._voDir()}/${slug}.mp3`;
    el.onerror = () => { this._vo[ck] = 'missing'; };
    this._vo[ck] = el;
    el.load();
  }

  // Pre-recorded word VO. Slugs are lowercase ASCII (¡gato! -> gato). A clip
  // that 404s is remembered as missing so we only ever probe each word once.
  _playVo(text, durMs = 1200) {
    const slug = text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ ]/g, '').trim().replace(/ +/g, '_');
    if (!slug) return false;
    this._vo = this._vo || {};
    const ck = `${this.voLang || 'es'}:${slug}`;
    let el = this._vo[ck];
    if (el === 'missing') return false;
    if (!el) {
      el = document.createElement('audio');
      el.src = `${this._voDir()}/${slug}.mp3`;
      el.volume = 1.0;
      el.onerror = () => { this._vo[ck] = 'missing'; };
      this._vo[ck] = el;
    }
    if (el.error) { this._vo[ck] = 'missing'; return false; }
    if (el.readyState === 0 && !el._probed) { el._probed = true; el.load(); return false; }
    try {
      el.volume = this.silentTest ? 0 : 1.0;
      el.muted = !!this.silentTest;
      this._boost(el);
      el.currentTime = 0;
      const pr = el.play(); if (pr && pr.catch) pr.catch(() => {});
      if (!this.silentTest && this.onVoice) this.onVoice(durMs);
      return true;
    }
    catch { return false; }
  }

  // Route a clip element through WebAudio with gain > 1. The recorded clips
  // peak well below full scale, so at element volume 1.0 they still sat under
  // the 0.42 music bed — an <audio> element can't go louder than 1.0, but a
  // GainNode can. Each element is wired exactly once (createMediaElementSource
  // is one-shot per element); before the ctx exists we just skip the boost.
  _boost(el, gain = 1.9) {
    // ONLY when the context is actually RUNNING. createMediaElementSource is
    // permanent — wiring an element into a suspended context (iOS loves to
    // suspend) reroutes its sound into a dead graph and the clip goes silent
    // forever. Skipping the boost just means native volume; never silence.
    if (!this.ctx || this.ctx.state !== 'running' || el._boosted) return;
    try {
      const src = this.ctx.createMediaElementSource(el);
      const g = this.ctx.createGain();
      g.gain.value = this.silentTest ? 0 : gain;
      src.connect(g).connect(this.ctx.destination);
      el._boosted = true;
    } catch { el._boosted = true; /* CORS or reuse — element keeps its native path */ }
  }

  // Is this word's clip actually available RIGHT NOW? Listening questions are
  // only served when the answer can truly be heard — muted device, narration
  // off, or a missing/unloaded clip must never produce a silent question that
  // costs a life.
  hasVo(text) {
    if (this.muted || !this.narrate || !text) return false;
    const slug = text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ ]/g, '').trim().replace(/ +/g, '_');
    const el = this._vo && this._vo[`${this.voLang || 'es'}:${slug}`];
    return !!(el && el !== 'missing' && !el.error && el.readyState >= 2);
  }

  // Two-note sting that tells you what KIND of question just started, before
  // you've read anything: rising = listen, falling = meaning.
  modeSting(mode) {
    if (mode === 'audio') { this._tone(880, 0.09, 'sine', 0.10, 0); this._tone(1320, 0.10, 'sine', 0.10, 0.08); }
    else if (mode === 'rev') { this._tone(1180, 0.09, 'triangle', 0.09, 0); this._tone(740, 0.11, 'triangle', 0.09, 0.08); }
  }

  // Language-suffixed clip locations (es = the original dirs/names).
  _voDir() { return this.voLang === 'it' ? 'assets/audio/vo-it' : 'assets/audio/vo'; }

  // One shared "voice lane" for everything spoken (WAV announcer + TTS words).
  // Each speaker reserves the lane for its duration; the next one waits it out
  // instead of talking over it — that was the fuego-call-vs-word-pileup.
  _laneDelay(durMs) {
    const now = performance.now();
    const start = Math.max(now, this._laneUntil || 0);
    this._laneUntil = start + durMs;
    return start - now;
  }

  unlock() {
    this._primeSpeech();          // must happen inside the user gesture
    if (this.ctx) {
      // iOS suspends the context whenever it feels like it (backgrounding,
      // route changes). Every user gesture is a chance to wake it back up.
      if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch { /* ignore */ } }
      return;
    }
    if (!this.enabled) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { this.enabled = false; }
  }

  // Speech has to be kicked off once from a real user gesture or Safari/iOS
  // silently drops every later utterance — and ours fire from the game loop
  // (answering a word), never from a tap. So we speak one silent utterance on
  // the first gesture to open the gate. This is why the announcer was mute.
  _primeSpeech() {
    if (this._speechPrimed) return;
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; u.lang = 'es-ES';
      speechSynthesis.speak(u);
      this._speechPrimed = true;
    } catch { /* ignore */ }
  }

  _tone(freq, dur, type = 'square', gain = 0.18, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;   // one gate for every SFX below
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  push()   { this._tone(180, 0.09, 'square', 0.12, 0, 120); }

  // Launch gets a per-vehicle voice so each sport sounds like itself: a spring
  // twang, a revving engine, or a rocket. Falls back to the original pop.
  launch(vehId) {
    if (vehId === 'pogo')     return this._tone(240, 0.3, 'triangle', 0.16, 0, 1150);
    if (vehId === 'dirtbike') return this._engine();
    if (vehId === 'jetpack')  return this._rocket();
    this._tone(300, 0.25, 'sawtooth', 0.14, 0, 720);
  }

  // Two detuned saws swept upward = a two-stroke winding out.
  _engine() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime, D = 0.45;
    for (const [mult, gain] of [[1, 0.11], [1.005, 0.09], [0.5, 0.07]]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(120 * mult, t0);
      o.frequency.exponentialRampToValueAtTime(420 * mult, t0 + D);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
      o.connect(g).connect(this.ctx.destination);
      o.start(t0); o.stop(t0 + D + 0.05);
    }
  }

  // Filtered noise = thrust. A tone alone sounds like a whistle, not a rocket.
  _rocket() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime, D = 0.6;
    const len = Math.floor(this.ctx.sampleRate * D);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.setValueAtTime(1.4, t0);
    bp.frequency.setValueAtTime(300, t0);
    bp.frequency.exponentialRampToValueAtTime(2400, t0 + 0.25);
    bp.frequency.exponentialRampToValueAtTime(700, t0 + D);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.26, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
    src.connect(bp).connect(g).connect(this.ctx.destination);
    src.start(t0); src.stop(t0 + D);
  }
  whoosh() { this._tone(600, 0.3, 'sine', 0.06, 0, 200); }

  correct(combo = 1) {
    // Bright arpeggio that climbs a little higher each time the streak grows,
    // so a hot streak literally sounds like it's rising.
    const step = Math.min(6, Math.max(0, combo - 1));
    const semis = Math.pow(2, step / 12);
    const notes = [523, 659, 784, 1047].map((f) => f * semis);
    if (combo >= 5) notes.push(1319 * semis);
    notes.forEach((f, i) => this._tone(f, 0.14, 'square', 0.16, i * 0.055));
  }

  // A rising celebratory whoosh for hitting / extending ON FIRE.
  fireStinger() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime, D = 0.5;
    for (const [type, f0, f1, g] of [['sawtooth', 220, 1400, 0.12], ['square', 330, 2100, 0.08]]) {
      const o = this.ctx.createOscillator(), gg = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + D);
      gg.gain.setValueAtTime(0.0001, t0);
      gg.gain.exponentialRampToValueAtTime(g, t0 + 0.05);
      gg.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
      o.connect(gg).connect(this.ctx.destination);
      o.start(t0); o.stop(t0 + D + 0.03);
    }
    // A sparkle on top.
    [1568, 2093, 2637].forEach((f, i) => this._tone(f, 0.18, 'triangle', 0.1, 0.12 + i * 0.05));
  }

  // Spanish announcer one-shots (assets/audio/announce_<key>.mp3). Preloaded on
  // first use. createElement, not `new Audio()` — this class shadows the global.
  announce(key) {
    if (this.muted) return;
    this._voices = this._voices || {};
    const ak = `${this.voLang || 'es'}:${key}`;
    let el = this._voices[ak];
    if (!el) {
      el = document.createElement('audio');
      el.src = `assets/audio/announce_${key}${this.voLang === 'it' ? '_it' : ''}.wav`;
      el.volume = this.silentTest ? 0 : 0.95;
      el.muted = !!this.silentTest;
      this._voices[ak] = el;
    }
    // The WAV calls run ~1.2-1.4s; reserve the shared voice lane so a word
    // pronunciation queued at the same moment waits instead of overlapping.
    const delay = this._laneDelay(1500);
    setTimeout(() => {
      if (this.muted) return;
      this._boost(el);
      try { el.currentTime = 0; const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ }
      if (!this.silentTest && this.onVoice) this.onVoice(1500);
    }, delay);
  }
  wrong() {
    this._tone(200, 0.3, 'sawtooth', 0.16, 0, 90);
    this._tone(150, 0.32, 'square', 0.1, 0.02, 70);
  }
  land()  { this._tone(120, 0.12, 'sine', 0.14, 0, 60); }

  // A cartoon MEOW for blowing the word. Synthesised rather than sampled so it
  // costs nothing to ship: a sawtooth whose pitch swoops up then droops down
  // (the "me-OW" contour), pushed through a bandpass that sweeps like a mouth
  // opening and closing, plus a little vibrato so it wobbles instead of beeping.
  meow() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const D = 0.55;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(430, t0);
    osc.frequency.exponentialRampToValueAtTime(760, t0 + 0.13);   // "me-"
    osc.frequency.setValueAtTime(760, t0 + 0.19);
    osc.frequency.exponentialRampToValueAtTime(300, t0 + D);      // "-ow"

    // Vibrato — a flat glide reads as a synth siren, not an animal.
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(15, t0);
    lfoGain.gain.setValueAtTime(22, t0);
    lfo.connect(lfoGain).connect(osc.frequency);

    // Formant sweep: bright and open on the "me", closing down on the "ow".
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.setValueAtTime(4.5, t0);
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.exponentialRampToValueAtTime(1900, t0 + 0.15);
    bp.frequency.exponentialRampToValueAtTime(650, t0 + D);

    const g = this.ctx.createGain();
    // Loud and proud — the wipeout MEOW is the joke, so it sits well above the
    // rest of the synth SFX (which peak ~0.18). Bumped from 0.3.
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.62, t0 + 0.05);
    g.gain.setValueAtTime(0.62, t0 + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + D);

    osc.connect(bp).connect(g).connect(this.ctx.destination);
    osc.start(t0); lfo.start(t0);
    osc.stop(t0 + D + 0.05); lfo.stop(t0 + D + 0.05);
  }
  levelUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone(f, 0.18, 'square', 0.16, i * 0.09));
  }
}
