// ===========================================================================
// music.js — the soundtrack.
//
// Picking a track with Math.random() every time means you WILL hear the same
// song twice in a row, often. This uses a shuffle bag instead: shuffle all the
// tracks, play through the whole list, then reshuffle. You hear every track
// once before any repeats, and the reshuffle refuses to open with the song
// that just finished, so there's no repeat across the seam either.
//
// The bag's position survives a page reload (localStorage), so relaunching the
// game doesn't drop you back onto the same opening track every time.
// ===========================================================================

// `lang` marks a track as belonging to one tour. Untagged tracks are the
// house band and play everywhere.
// Each track declares where it belongs:
//   (no lang)          the house band — plays on every tour
//   lang: 'it' | 'es'  that tour's home turf, always in rotation there
//   strict: true       too on-the-nose to travel: never plays on another
//                      tour (a tarantella has no business in Cartagena, and
//                      Sabor y Fuego has none in Rome)
const TRACKS = [
  // --- house band (plays everywhere) ---
  { file: 'glass-staircase.mp3',      title: 'Glass Staircase' },
  { file: 'glass-staircase-2.mp3',    title: 'Glass Staircase (alt)' },
  { file: 'horn-bounce-groove.mp3',   title: 'Horn Bounce Groove' },
  { file: 'horn-bounce-groove-2.mp3', title: 'Horn Bounce Groove (alt)' },
  { file: 'mirrorball-circuit.mp3',   title: 'Mirrorball Circuit' },
  { file: 'mirrorball-circuit-2.mp3', title: 'Mirrorball Circuit (alt)' },

  // --- unmistakably Latin: the Spanish tour only ---
  { file: 'sabor-y-fuego.mp3',        title: 'Sabor y Fuego',   lang: 'es', strict: true },
  { file: 'sabor-y-fuego-2.mp3',      title: 'Sabor y Fuego (alt)', lang: 'es', strict: true },

  // --- unmistakably Italian: the Italian tour only ---
  { file: 'it-sole-di-marea.mp3',     title: 'Sole di Marea',   lang: 'it', strict: true },
  { file: 'it-sole-di-marea-2.mp3',   title: 'Sole di Marea (alt)', lang: 'it', strict: true },
  { file: 'it-mare-di-luce.mp3',      title: 'Mare di Luce',    lang: 'it', strict: true },
  { file: 'it-mare-di-luce-2.mp3',    title: 'Mare di Luce (alt)', lang: 'it', strict: true },
  { file: 'it-sotto-il-sole-di-capri.mp3', title: 'Sotto il Sole di Capri', lang: 'it', strict: true },
  { file: 'it-vespa-boom-bap.mp3',    title: 'Vespa Boom Bap',  lang: 'it', strict: true },

  // --- Italian at heart but neon/electronic enough to travel ---
  { file: 'it-neon-roma.mp3',         title: 'Neon Roma',       lang: 'it' },
  { file: 'it-neon-napoli-nights.mp3',   title: 'Neon Napoli Nights', lang: 'it' },
  { file: 'it-neon-napoli-nights-2.mp3', title: 'Neon Napoli Nights (alt)', lang: 'it' },
  { file: 'it-midnight-in-rome.mp3',  title: 'Midnight in Rome', lang: 'it' },
];

const DIR = 'assets/music/';
const VOLUME = 0.42;          // sits under the SFX, which are synth blips
const FADE_MS = 500;
const LS_BAG = 'radgato.musicbag';
const LS_MUTE = 'radgato.muted';

function shuffled(n) {
  const a = [...Array(n).keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Music {
  constructor(onTrack) {
    this.onTrack = onTrack || (() => {});
    this.el = null;
    this.bag = [];
    this.pos = 0;
    this.last = -1;             // index of the track that just played
    this.current = null;
    this.poolKey = 'es';
    this.pool = TRACKS.map((t, i) => i).filter((i) => !TRACKS[i].lang);
    this.muted = localStorage.getItem(LS_MUTE) === '1';
    this.started = false;
    this._restore();
  }

  /**
   * Which songs this stretch of the game draws from.
   *  - Spanish tour: the original house set.
   *  - Italy, opening arcs: ITALIAN ONLY — the first thing the game should do
   *    is put you in Italy.
   *  - Italy, later arcs: everything, so the Italian tracks stay special by
   *    being sprinkled among the rest instead of hammered.
   */
  setContext(lang, immersive) {
    // An immersive opening needs enough home-tour songs to feel like a
    // soundtrack rather than one track on loop. Only Italy opens immersive.
    const home = TRACKS.filter((t) => t.lang === lang).length;
    if (lang !== 'it' || home < 3) immersive = false;
    const key = `${lang}${immersive ? '-pure' : '-mix'}`;
    if (key === this.poolKey) return;
    this.poolKey = key;
    const allowed = (t) => {
      if (immersive) return t.lang === lang;   // home turf only
      if (!t.lang) return true;                // house band
      if (t.lang === lang) return true;        // home tour
      return !t.strict;                        // visiting, if it travels well
    };
    this.pool = TRACKS.map((t, i) => i).filter((i) => allowed(TRACKS[i]));
    if (!this.pool.length) this.pool = TRACKS.map((t, i) => i).filter((i) => !TRACKS[i].lang);
    this._restore();
  }

  // ---- shuffle bag -------------------------------------------------------
  _restore() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_BAG + '.' + this.poolKey) || 'null');
      if (s && Array.isArray(s.bag) && s.bag.length === this.pool.length) {
        this.bag = s.bag; this.pos = s.pos | 0; this.last = s.last ?? -1;
        return;
      }
    } catch { /* corrupt or absent — just deal a fresh bag */ }
    this._refill();
  }

  _save() {
    try {
      localStorage.setItem(LS_BAG + '.' + this.poolKey,
        JSON.stringify({ bag: this.bag, pos: this.pos, last: this.last }));
    } catch { /* private mode — the bag just won't survive a reload */ }
  }

  _refill() {
    // The bag holds POOL positions, not global track ids.
    this.bag = shuffled(this.pool.length);
    // Don't open a fresh bag with the song that just ended.
    if (this.bag[0] === this.last && this.bag.length > 1) {
      [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
    }
    this.pos = 0;
  }

  _next() {
    if (this.pos >= this.bag.length) this._refill();
    const slot = this.bag[this.pos++];
    this.last = slot;
    this._save();
    return this.pool[slot];
  }

  // ---- playback ----------------------------------------------------------
  // Call from a user gesture — browsers block audio before one.
  start() {
    this.started = true;
    this.playNext();
  }

  // Move to the next track in the bag. Called on level start (so a replay
  // sounds different) and when a track runs out.
  playNext() {
    if (!this.started) return;
    const idx = this._next();
    const t = TRACKS[idx];
    this.current = t;

    // createElement, not `new Audio(...)` — the game has its own Audio class
    // (the SFX synth), and one stray import would silently shadow the global.
    const el = document.createElement('audio');
    el.src = DIR + t.file;
    el.volume = 0;
    el.preload = 'auto';
    el.addEventListener('ended', () => this.playNext());
    // A missing/undecodable file must not kill the soundtrack — skip on.
    el.addEventListener('error', () => { if (this.el === el) this.playNext(); });

    const old = this.el;
    this.el = el;
    const p = el.play();
    if (p && p.catch) p.catch(() => { /* gesture not registered yet */ });

    this._fade(el, this.muted ? 0 : VOLUME);
    if (old) this._fade(old, 0, () => { old.pause(); old.src = ''; });
    this.onTrack(t.title);
  }

  // Timer-driven, NOT requestAnimationFrame: rAF halts in a background tab, so
  // tabbing away mid-fade would strand the volume at 0 and the music would
  // never come back. setInterval still fires (throttled) and we always land
  // exactly on the target value.
  _fade(el, to, done) {
    clearInterval(el._fadeT);
    const from = el.volume;
    const t0 = Date.now();
    const set = (v) => { try { el.volume = Math.max(0, Math.min(1, v)); } catch { /* detached */ } };
    el._fadeT = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / FADE_MS);
      set(from + (to - from) * k);
      if (k >= 1) {
        clearInterval(el._fadeT);
        set(to);                       // guarantee the exact endpoint
        if (done) done();
      }
    }, 40);
  }

  // Dip under the announcer's voice for `ms`, then swell back. Repeat calls
  // extend the dip (each voice clip re-ducks), so back-to-back lines hold the
  // music down instead of pumping it.
  duck(ms) {
    if (!this.el || this.muted) return;
    this._fade(this.el, VOLUME * 0.30);
    clearTimeout(this._duckT);
    this._duckT = setTimeout(() => {
      if (this.el && !this.muted) this._fade(this.el, VOLUME);
    }, ms + 250);
  }

  setMuted(muted) {
    this.muted = !!muted;
    try { localStorage.setItem(LS_MUTE, this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.el) this._fade(this.el, this.muted ? 0 : VOLUME);
    return this.muted;
  }

  toggleMute() { return this.setMuted(!this.muted); }
}
