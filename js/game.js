// ===========================================================================
// game.js — orchestrates everything: state machine, main loop, scoring,
// slow-mo, camera, and the level flow (3 skateboard levels for Phase 1).
// ===========================================================================

import { VEHICLES, SPORT_ORDER } from './config.js';
import { getCampaign } from './campaign.js';
import { CURRICULUM } from './curriculum-data.js';
import { Memoria } from './memoria.js';
import { makeQuestion, makeQuestionForEs, makeLessonQuestion, makeLessonQuestionForEs, makeSentenceQuestion, getSentence, syllableCount, buildQuestion } from './words.js';
import { pickTrick } from './tricks.js';
import { Terrain } from './terrain.js';
import { Player } from './player.js';
import { Quiz } from './quiz.js';
import { Particles } from './particles.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Music } from './music.js';

const BASE_Y = 520;

// Difficulty profiles — chosen on the title screen, persisted, applied as a
// multiplier on every level's answer window (the campaign already ramps within
// itself; the profile shifts the whole ramp).
// Each tier changes FOUR things so they audition as genuinely different games:
// answer window, lives, ride speed, and the reto goals.
// Difficulty is the SPANISH, nothing else: every tier rides the same game —
// same speed, same 9 lives, same word windows. The picker chooses which
// thousand words you're learning (see curriculum-data.js).
const DIFFS = {
  facil: { label: 'PRINCIPIANTE', icon: '🐣', tag: 'Your first 1,000 words · A1→A2',        mult: 1.0, lives: 9, speed: 1.0, goalD: 0 },
  medio: { label: 'INTERMEDIO',   icon: '🔥', tag: 'The second 1,000 · A2→B1',              mult: 1.0, lives: 9, speed: 1.0, goalD: 0 },
  jefe:  { label: 'EL JEFE',      icon: '💀', tag: 'The third 1,000 · slang y subjuntivo',  mult: 1.0, lives: 9, speed: 1.0, goalD: 0 },
};

// Bullet-time punch-in. _answerCeiling has to compensate for it to keep the
// answer row clear of the HUD, so it lives here rather than inline.
const QUIZ_ZOOM = 1.1;        // punch-in during the word window

export class Game {
  constructor(canvas, dom) {
    this.canvas = canvas;
    this.dom = dom;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.audio = new Audio();
    this.music = new Music((title) => this._showNowPlaying(title));
    // Voice over music: whenever the announcer talks, dip the soundtrack.
    this.audio.onVoice = (ms) => this.music.duck(ms);

    // LANGUAGE: which world tour + word bank this player is on. Spanish is
    // the default; Italian unlocks when its curriculum ships (CURRICULUM.it).
    this.lang = (localStorage.getItem('radgato.lang') === 'it' && CURRICULUM.it) ? 'it' : 'es';
    this.LEVELS = getCampaign(this.lang);
    this.audio.voLang = this.lang;
    // MEMORIA: the per-word memory that decides what comes back, when, and in
    // which retrieval mode. Per language, like everything else.
    this.memoria = new Memoria(this.lang);
    this.particles = new Particles();
    this.quiz = new Quiz(this.particles);

    this.state = 'title';
    this.levelIndex = 0;
    this.timeScale = 1;

    // How many sports the player has unlocked (>=1). Drives the sport-select
    // landing page: unlocked sports are playable, the next two show locked, the
    // rest are mysteries. Persisted so progress survives a reload.
    this.unlockedCount = this._loadProgress();
    // Difficulty (title-screen pick) + saved campaign position.
    this.difficulty = (() => {
      try { const d = localStorage.getItem('radgato.difficulty'); if (DIFFS[d]) return d; } catch {}
      return 'medio';
    })();
    this.cam = { x: 0, y: BASE_Y - 560, zoom: 1 };
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '182,255,43';
    this.recent = new Set();
    this.showcase = 0;      // seconds of post-answer slow-mo left
    this.paused = false;    // pause screen up (tap centre / ⏸ button)
    this._celebT = null;    // rAF handle for the unlock confetti
    this.onFire = false;    // combo >= 3 — flames, announcer, screen glow
    this.fireBurst = 0;     // brief flash when the streak ticks up while on fire

    // Let input time-gate taps with the same clock we run on (no Date.now()).
    this.input.setNow(() => performance.now());

    this._last = 0;
    this._raf = null;

    this.resize();
    this._buildWorld(0);   // build a live scene behind the title screen
    this.showTitle();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.renderer.resize(w, h, dpr);
    this.w = w; this.h = h;
  }

  // ------------------------------------------------------------- level flow
  // Build the terrain/player/state for a level WITHOUT starting play (used for
  // the title-screen backdrop and by loadLevel).
  _buildWorld(index) {
    const level = this.LEVELS[Math.min(index, this.LEVELS.length - 1)];
    level._veh = VEHICLES[level.vehicle];
    level.wheelColor = level._veh.wheelColor;

    this.level = level;
    this.levelIndex = index;
    this.terrain = new Terrain(level, BASE_Y);
    this.player = new Player(level, this.terrain, this.particles);
    this.quiz.clear();
    this.particles.clear();
    this.recent.clear();

    // THE CURRICULUM HOOK: the difficulty picker chooses which 1,000-word
    // track this run rides through. Every campaign level names a lesson index
    // (0-99); the lesson is 10 themed words and doubles as the level's MISIÓN.
    const bank = CURRICULUM[this.lang] || CURRICULUM.es;
    const track = bank[this.difficulty] ? this.difficulty : 'medio';
    this.lesson = (level.lesson != null && bank[track])
      ? bank[track].lessons[level.lesson] : null;
    // Flat bank of the whole track: distant distractors while a word is still
    // being learned (semantically clustered neighbours interfere at that
    // stage), and the lookup used to rebuild a review word's own lesson.
    this._trackLessons = (bank[track] && bank[track].lessons) || [];
    this._wordIndex = new Map();
    for (let li = 0; li < this._trackLessons.length; li++) {
      for (const w of this._trackLessons[li].words) {
        if (!this._wordIndex.has(w.es)) this._wordIndex.set(w.es, { w, li });
      }
    }
    this.redeemed = 0;      // review words re-earned this level
    this.qCount = 0;        // question counter (drives mode alternation)
    this._lastMode = 'en';

    // Sentence levels assemble Spanish sentences across the whole level, one
    // word per ramp, in order. A level runs through several before it clears.
    // Everything else is a normal vocab level. Campaign levels pull their
    // sentences from the difficulty's own track.
    this.sentenceMode = level.mode === 'sentence';
    this.sentences = this.sentenceMode
      ? (level.lesson != null && bank[track])
        ? (level.sentences || [0]).map((i) => bank[track].sentences[i % bank[track].sentences.length])
        : (level.sentences || [level.sentenceIndex || 0]).map(getSentence)
      : [];
    this.sentenceIdx = 0;       // which sentence of the level
    this.sentence = this.sentences[0] || null;
    // Sentence progress is a SET of solved slot indices, not a linear cursor, so
    // a missed word can be deferred and re-asked LATER instead of immediately
    // (see _chooseSentenceSlot). `curSlot` is the slot currently being asked.
    this.solved = new Set();
    this.curSlot = 0;
    this.lastMissedSlot = -1;

    // Vocab levels defer a missed word too: it's re-asked after a couple of
    // other questions rather than right away. This holds { es, wait }.
    this.reask = null;
    this.currentQ = null;

    // RETO (challenge) levels: a 60-second speed round. Misses cost time (the
    // wipeout recovery), never lives; you pass by hitting `goal` right answers.
    const D = DIFFS[this.difficulty] || DIFFS.medio;
    this.challenge = level.mode === 'challenge'
      ? { ...level.challenge, goal: Math.max(3, level.challenge.goal + (D.goalD || 0)) }
      : null;
    this.rushTime = this.challenge ? this.challenge.time : 0;
    this.rushCount = 0;
    this._rushHudT = 0;

    // HALF-PIPE retos are a whole different machine: the cat swings wall to
    // wall inside a screen-space pipe, launches off each lip into a word row,
    // and you fly him freely along the row. (The jetpack finale keeps the
    // forward ring-run instead.)
    this.hp = (this.challenge && this.challenge.style === 'halfpipe') ? {
      phi: -Math.PI / 2 + 0.05,   // pendulum phase; sin(phi) = position across pipe
      dir: 1, side: -1,
      phase: 'slide',             // slide | air | return | stunned
      catX: 0, catY: 0, ang: 0, targetX: 0,
      airT: 0, animT: 0, anim: null, slidePhase: 0,
      q: null, bubbles: [], time: 0, resolveY: 0,
      // --- the arcade layer ---
      aimX: null,                 // pre-aimed x (tap a bubble while sliding)
      flow: 0,                    // banked clean landings (0..3)
      flowTime: false,            // this flight is a slow-mo FLOW flight
      qCount: 0,                  // questions asked (every 4th is golden)
      golden: false,              // current question is a PALABRA DE ORO
      finale: false,              // last-5-seconds ¡ÚLTIMO TRUCO! mode
    } : null;

    // Landscape docks the prompt out of the bubble row's way on pipe levels.
    if (this.dom.prompt) this.dom.prompt.classList.toggle('hp', !!this.hp);

    this.score = 0;
    this.combo = 0;
    this.lives = D.lives;       // 12 / 9 / 6 by difficulty
    this.player.speedMult = D.speed;
    this.wordsRight = 0;
    this.wordsTotal = 0;
    this.timeScale = 1;
    this.showcase = 0;
    this.speedBurst = 0;
    this._burstAfterShowcase = false;
    this.onFire = false;
    this.fireBurst = 0;
    this.cam.x = this.player.x - this.w * 0.32;
    this.cam.y = BASE_Y - this.h * 0.72;
    this.cam.zoom = 1;
  }

  // Warm the announcer's EVENT lines once (they're small and used everywhere).
  // Word clips are warmed per level by _warmLevelVo — with a 1,000-word track
  // per difficulty, preloading the whole bank up front is no longer sane.
  _warmVo() {
    if (this._voWarmed) return;
    this._voWarmed = true;
    ['¡Felicidades! Ganaste la BMX', '¡Felicidades! Ganaste los patines',
     '¡Felicidades! Ganaste el pogo', '¡Felicidades! Ganaste la moto',
     '¡Felicidades! Ganaste el jetpack', '¡Nuevo truco!',
     '¡Último truco!', '¡Palabra de oro!'].forEach((t) => this.audio.preloadVo(t));
  }

  // Warm this level's own words (10 lesson words / the sentence strings), so
  // the first pronunciation is instant. A missing clip stays silent by design
  // (only the current 22-level word set is recorded until the VO batch runs).
  _warmLevelVo() {
    if (this.lesson) {
      for (const w of this.lesson.words) if (syllableCount(w.es) >= 2) this.audio.preloadVo(w.es);
    }
    // Review words come from earlier lessons, so their clips aren't warm —
    // without this they could never earn a listening question.
    if (this.memoria && this.level && this.level.lesson != null) {
      for (const d of this.memoria.dueWords(this.level.lesson, 16)) this.audio.preloadVo(d.es);
    }
    for (const s of this.sentences || []) {
      this.audio.preloadVo(s.words.map((w) => w.es).join(' '));
      for (const w of s.words) if (syllableCount(w.es) >= 2) this.audio.preloadVo(w.es);
    }
  }

  loadLevel(index, opts = {}) {
    this._buildWorld(index);
    this.dismissUnlock();          // never carry a reward card into a new level
    this._warmVo();
    this._warmLevelVo();
    // Start the backdrop downloads NOW — otherwise the first seconds of a
    // region level flashed the old interior stand-in while the city loaded.
    this.renderer.preloadLevel(this.level);
    // ESTUDIA first: every level opens on its glossary — the 10 words (or the
    // sentences) you're about to ride, with tap-to-hear. One tap of ¡VAMOS!
    // and you're in. Dev jumps (level list) skip straight to play.
    if (opts.skipStudy || (!this.lesson && !this.sentenceMode)) this._beginLevel();
    else this._showStudy();
  }

  _beginLevel() {
    // New level = next song. This is what stops a replay sounding identical:
    // the bag advances every time you start a level, not just when a song ends.
    // start() already begins a track; advancing again immediately here killed
    // the music on the FIRST level (two tracks created, the first faded out).
    // Soundtrack context BEFORE advancing: Italy's opening arcs are scored
    // Italian-only so the first thing the tour does is put you there; from
    // arc 3 on the Italian tracks are sprinkled through the whole library.
    this.music.setContext(this.lang, (this.level.lesson ?? 0) < 8);
    if (this.music.started) {
      if (this._skipTrackAdvance) this._skipTrackAdvance = false;
      else this.music.playNext();
    }
    this.state = 'playing';
    this.dom.hud.classList.remove('hidden');
    this.dom.overlay.classList.add('hidden');
    this.dom.hero.classList.add('hidden');
    this.dom.prompt.classList.add('hidden');
    this._showTouchHint();
    this._flashMission();
    this._updateHud();
  }

  // The pre-level glossary: MISIÓN + every word of the lesson, Spanish left,
  // English right, tap a row to hear Roman say it. This is the "how am I
  // supposed to know these?" fix — you STUDY the ten, then you ride them.
  _showStudy() {
    document.querySelector('.overlay-card').classList.remove('title-compact');
    this.state = 'study';
    const L = this.level;
    let rows, tag;
    if (this.sentenceMode) {
      tag = `${this.S().mision}: ${this.S().frases}`;
      rows = this.sentences.map((s) => {
        const es = s.words.map((w) => w.es).join(' ');
        return `<div class="gloss-row" data-es="${es}"><b>${es}</b><span>${s.en}</span></div>`;
      }).join('');
    } else {
      // Spanish theme + its English gloss — a non-speaker must never face a
      // card they can't read (Dylan's screenshot note).
      const en = this.lesson.themeEn ? ` · ${this.lesson.themeEn}` : '';
      tag = `${this.S().mision}: ${this.lesson.theme}${en}`;
      rows = this.lesson.words.map((w) => {
        const shaky = this.memoria.isShaky(w.es);
        return `<div class="gloss-row${shaky ? ' shaky' : ''}" data-es="${w.es}">` +
          `<b>${w.es}${shaky ? ' ⚠' : ''}</b><span>${w.en}</span></div>`;
      }).join('');
    }
    const retoNote = this.challenge
      ? `<p class="gloss-reto">RETO: ${this.challenge.goal} aciertos en ${this.challenge.time}s · get ${this.challenge.goal} right in ${this.challenge.time}s — these are your words.</p>` : '';
    this.dom.overlayTag.textContent = tag;
    this.dom.overlayBody.innerHTML =
      `<p class="gloss-hint">STUDY — tap any word to hear it 🔊</p>` +
      `<div class="gloss">${rows}</div>` + retoNote;
    this.dom.overlayBtn.textContent = '¡VAMOS!';
    this.dom.overlayHint.textContent = `${L.name} · NIVEL ${L.id}`;
    this.dom.hud.classList.add('hidden');
    this.dom.hero.classList.add('hidden');
    this.dom.prompt.classList.add('hidden');
    this.dom.overlay.classList.remove('hidden');
  }

  // Tap-to-hear from the glossary. Uses the announcer path (master mute only).
  sayGloss(es) {
    this.audio.unlock();
    this.audio.say(es);
  }

  _showTouchHint() {
    this.dom.touchHint.classList.remove('hidden');
    clearTimeout(this._hintT);
    this._hintT = setTimeout(() => this.dom.touchHint.classList.add('hidden'), 4200);
  }

  // Jump straight to any level from the title screen. Everything is unlocked —
  // this is a dev/playtest convenience so a level can be tried without
  // replaying the campaign to reach it.
  _levelSelectHtml() {
    const SPORT = { skateboard: 'SKATE', bmx: 'BMX', rollerblades: 'BLADES',
                    pogo: 'POGO', dirtbike: 'DIRTBIKE', jetpack: 'JETPACK' };
    const st = this._stars();
    const btns = this.LEVELS.map((L, i) =>
      `<button class="lvl-btn" data-level="${i}">` +
      `<span class="lvl-n">${L.id}</span>` +
      `<span class="lvl-name">${L.name}${st[i] ? ' ' + '★'.repeat(st[i]) : ''}</span>` +
      `<span class="lvl-sport">${SPORT[L.vehicle] || ''}${L.mode === 'sentence' ? ' · FRASE' : ''}</span>` +
      `</button>`).join('');
    return `<div class="lvl-select"><div class="lvl-select-h">JUMP TO LEVEL</div>` +
           `<div class="lvl-grid">${btns}</div></div>`;
  }

  // Called by main.js when a level-select button is clicked.
  jumpToLevel(index) {
    this.audio.unlock();
    if (!this.music.started) { this.music.start(); this._skipTrackAdvance = true; }
    this.loadLevel(index, { skipStudy: true });   // dev jump — straight to play
  }

  // CHOOSE YOUR LANGUAGE — the very first decision. Italian goes live the
  // moment its curriculum ships (CURRICULUM.it stops being null).
  _languageHtml() {
    const itReady = !!CURRICULUM.it;
    const b = (lang, flag, name, tag, on) =>
      `<button class="diff-btn lang-btn${this.lang === lang ? ' sel' : ''}" data-lang="${lang}"${on ? '' : ' disabled'}>` +
      `<span class="diff-icon">${flag}</span>` +
      `<span><span class="diff-name">${name}</span><span class="diff-tag">${tag}</span></span></button>`;
    return `<div class="diff-select"><div class="lvl-select-h">CHOOSE YOUR LANGUAGE · ELIGE TU IDIOMA</div>` +
      `<div class="lang-row">` +
      b('es', '🇲🇽', 'ESPAÑOL', 'the Latin American world tour', true) +
      b('it', '🇮🇹', 'ITALIANO', itReady ? 'the Italian world tour' : 'in arrivo · coming soon', itReady) +
      `</div></div>`;
  }

  _difficultyHtml() {
    const rows = Object.entries(DIFFS).map(([k, d]) => {
      const label = (k === 'jefe' && this.lang === 'it') ? 'IL CAPO' : d.label;
      return `<button class="diff-btn${k === this.difficulty ? ' sel' : ''}" data-diff="${k}">` +
      `<span class="diff-icon">${d.icon}</span>` +
      `<span><span class="diff-name">${label}</span><span class="diff-tag">${d.tag}</span></span>` +
      `</button>`;
    }).join('');
    return `<div class="diff-select"><div class="lvl-select-h">ELIGE TU DIFICULTAD</div>` +
           `<div class="diff-grid">${rows}</div></div>`;
  }

  setDifficulty(d) {
    if (!DIFFS[d]) return;
    this.difficulty = d;
    try { localStorage.setItem('radgato.difficulty', d); } catch { /* ignore */ }
    if (this.state === 'title') this.showTitle();   // refresh selection highlight
  }

  // Per-language localStorage key ('radgato.resume' stays the Spanish legacy
  // key so nobody loses their place in the upgrade).
  _lsKey(base) {
    return this.lang === 'es' ? `radgato.${base}` : `radgato.${base}.${this.lang}`;
  }

  // Switch world tour + word bank. Progress, resume point and stars are all
  // per-language, so flipping back and forth loses nothing.
  setLanguage(lang) {
    if (lang === 'it' && !CURRICULUM.it) return;      // not shipped yet
    this.lang = lang;
    try { localStorage.setItem('radgato.lang', lang); } catch { /* ignore */ }
    this.LEVELS = getCampaign(lang);
    this.audio.voLang = lang;
    this.memoria.setLang(lang);
    if (this.state === 'title') this.showTitle();
  }

  // UI/announcer strings that follow the language.
  S() {
    return this.lang === 'it' ? {
      oro: "Parola d'oro!", oroBanner: "PAROLA D'ORO! 3× · +3s",
      ultimo: 'Ultimo trucco!', ultimoBanner: 'ULTIMO TRUCCO! — DOUBLE POINTS',
      nuevoTruco: 'Nuovo trucco!', mision: 'MISSIONE', frases: 'componi le frasi · build the sentences',
      retoRush: 'HALF-PIPE SPEED ROUND', kickerTrick: 'NUOVO TRUCCO!',
      win: { bmx: 'Complimenti! Hai vinto la BMX', rollerblades: 'Complimenti! Hai vinto i pattini',
             pogo: 'Complimenti! Hai vinto il pogo', dirtbike: 'Complimenti! Hai vinto la moto',
             jetpack: 'Complimenti! Hai vinto il jetpack' },
      winEn: 'Congratulations! You won',
    } : {
      oro: '¡Palabra de oro!', oroBanner: '¡PALABRA DE ORO! 3× · +3s',
      ultimo: '¡Último truco!', ultimoBanner: '¡ÚLTIMO TRUCO! — DOUBLE POINTS',
      nuevoTruco: '¡Nuevo truco!', mision: 'MISIÓN', frases: 'arma las frases · build the sentences',
      retoRush: 'HALF-PIPE SPEED ROUND', kickerTrick: '¡NUEVO TRUCO!',
      win: { bmx: '¡Felicidades! Ganaste la BMX', rollerblades: '¡Felicidades! Ganaste los patines',
             pogo: '¡Felicidades! Ganaste el pogo', dirtbike: '¡Felicidades! Ganaste la moto',
             jetpack: '¡Felicidades! Ganaste el jetpack' },
      winEn: 'Congratulations! You won',
    };
  }

  // One passport stamp per city arc; the RETO (4th level) seals it. Derived
  // entirely from the star records — no separate save.
  _arcStamps() {
    const st = this._stars();
    const stamps = [];
    for (let a = 0; a * 4 + 3 < this.LEVELS.length; a++) {
      const starSum = [0, 1, 2, 3].reduce((n, k) => n + (st[a * 4 + k] || 0), 0);
      stamps.push({
        a, name: this.LEVELS[a * 4].name,
        done: !!st[a * 4 + 3], stars: starSum,
      });
    }
    return stamps;
  }

  showPassport() {
    document.querySelector('.overlay-card').classList.remove('title-compact');
    this.state = 'passport';
    const it = this.lang === 'it';
    const stamps = this._arcStamps();
    const n = stamps.filter((x) => x.done).length;
    this.dom.overlayTag.textContent = `${it ? 'PASSAPORTO' : 'PASAPORTE'} 🛂 ${n}/${stamps.length}`;
    this.dom.overlayBody.innerHTML =
      `<p class="gloss-hint">${it ? 'un timbro per ogni sfida superata' : 'a stamp for every RETO conquered'}</p>` +
      `<div class="passport">` + stamps.map((x) =>
        `<div class="stamp${x.done ? ' got' : ''}" style="--rot:${((x.a * 47) % 13) - 6}deg">` +
        `<span class="stamp-city">${x.name}</span>` +
        `<span class="stamp-mark">${x.done
          ? '★'.repeat(Math.max(1, Math.min(3, Math.round(x.stars / 4))))
          : '· · ·'}</span>` +
        `</div>`).join('') + `</div>`;
    this.dom.overlayBtn.textContent = it ? '◀ INDIETRO' : '◀ VOLVER';
    this.dom.overlayHint.textContent = '';
    this.dom.hero.classList.add('hidden');
    this.dom.hud.classList.add('hidden');
    this.dom.overlay.classList.remove('hidden');
  }

  _stars() {
    try { return JSON.parse(localStorage.getItem(this._lsKey('stars')) || '{}'); }
    catch { return {}; }
  }
  _saveStars(i, n) {
    try {
      const st = this._stars();
      if ((st[i] || 0) < n) { st[i] = n; localStorage.setItem(this._lsKey('stars'), JSON.stringify(st)); }
    } catch { /* ignore */ }
  }

  // Saved campaign position (the App-Store save-your-place requirement).
  _resumeIndex() {
    try {
      const n = parseInt(localStorage.getItem(this._lsKey('resume')), 10);
      if (n >= 0 && n < this.LEVELS.length) return n;
    } catch { /* ignore */ }
    return 0;
  }

  _saveResume(index) {
    try { localStorage.setItem(this._lsKey('resume'), String(Math.min(index, this.LEVELS.length - 1))); } catch { /* ignore */ }
  }

  // Exit to the main menu from anywhere in a run.
  exitToMenu() {
    this.resume();
    this.dismissUnlock();
    this.dom.prompt.classList.add('hidden');
    if (this.dom.sentenceFlash) this.dom.sentenceFlash.classList.add('hidden');
    if (this.dom.sentenceBar) this.dom.sentenceBar.classList.add('hidden');
    this.showTitle();
  }

  // ------------------------------------------------------- sport progression
  _loadProgress() {
    try {
      const n = parseInt(localStorage.getItem('radgato.progress'), 10);
      if (n >= 1 && n <= SPORT_ORDER.length) return n;
    } catch { /* ignore */ }
    return 1;   // skateboard only, to start
  }

  _saveProgress() {
    try { localStorage.setItem('radgato.progress', String(this.unlockedCount)); } catch { /* ignore */ }
  }

  // Unlock every sport up to and including `sportId`. Called when a level's
  // reward fires, so finishing BMX's last level lights up rollerblades on the
  // landing page for good.
  _unlockSport(sportId) {
    const idx = SPORT_ORDER.indexOf(sportId);
    if (idx >= 0 && idx + 1 > this.unlockedCount) {
      this.unlockedCount = idx + 1;
      this._saveProgress();
    }
  }

  // First campaign level index that rides a given sport.
  _sportFirstLevel(sportId) {
    const i = this.LEVELS.findIndex((L) => L.vehicle === sportId);
    return i < 0 ? 0 : i;
  }

  // The sport-select landing page. Unlocked sports are playable cards; the next
  // two are shown but LOCKED (you can see what's coming); everything past that
  // is a mystery with a big "?" over it.
  _sportSelectHtml() {
    const TAG = {
      skateboard:   'Where it all starts — pop, flip, learn.',
      bmx:          'Big floaty launches. Commit early.',
      rollerblades: 'Light and whippy — save it late.',
      pogo:         'It bounces. Sky-high hang time.',
      dirtbike:     'Fastest, heaviest, biggest air.',
      jetpack:      'Never lands. Pure flight.',
    };
    const ART = {
      skateboard:   'assets/cat/hero_skate_0.png',
      bmx:          'assets/cat/hero_bmx_0.png',
      rollerblades: 'assets/cat/hero_blade_0.png',
      pogo:         'assets/cat/hero_pogo_0.png',
      dirtbike:     'assets/cat/hero_dirt_0.png',
      jetpack:      'assets/cat/hero_jet_0.png',
    };
    const cards = SPORT_ORDER.map((sid, i) => {
      const name = (VEHICLES[sid] && VEHICLES[sid].name) || sid.toUpperCase();
      if (i < this.unlockedCount) {
        return `<button class="sport-btn" data-sport="${i}">` +
               `<img class="sport-art" src="${ART[sid]}" alt="" />` +
               `<span class="sport-txt"><span class="sport-name">${name}</span>` +
               `<span class="sport-tag">${TAG[sid] || ''}</span></span>` +
               `<span class="sport-go">▶</span></button>`;
      }
      if (i < this.unlockedCount + 2) {
        return `<div class="sport-btn locked" aria-disabled="true">` +
               `<img class="sport-art" src="${ART[sid]}" alt="" />` +
               `<span class="sport-txt"><span class="sport-name">${name}</span>` +
               `<span class="sport-tag">Clear the previous sport to unlock</span></span>` +
               `<span class="sport-lock">🔒</span></div>`;
      }
      return `<div class="sport-btn mystery" aria-disabled="true">` +
             `<span class="sport-q">?</span>` +
             `<span class="sport-txt"><span class="sport-name">???</span>` +
             `<span class="sport-tag">A mystery ride</span></span></div>`;
    }).join('');
    return `<div class="sport-select"><div class="sport-select-h">CHOOSE YOUR RIDE</div>` +
           `<div class="sport-grid">${cards}</div></div>`;
  }

  // Tapping a sport now opens ITS level list (the level selector is back),
  // rather than dropping you straight into the first level.
  jumpToSport(i) {
    if (i < 0 || i >= this.unlockedCount) return;
    this.showSportLevels(i);
  }

  // Second page of the title flow: every level of the chosen sport. All of the
  // sport's levels are pickable — replaying an earlier level is always allowed.
  showSportLevels(i) {
    const sid = SPORT_ORDER[i];
    this._sportView = i;
    const rows = this.LEVELS
      .map((L, gi) => ({ L, gi }))
      .filter((o) => o.L.vehicle === sid)
      .map(({ L, gi }) =>
        `<button class="lvl-btn" data-level="${gi}">` +
        `<span class="lvl-n">${L.id}</span>` +
        `<span class="lvl-name">${L.name}${L.region ? ' 🌍' : ''}</span>` +
        `<span class="lvl-sport">${L.mode === 'sentence' ? 'FRASE' : L.mode === 'challenge' ? 'RETO 60s' : 'VOCAB'}</span>` +
        `</button>`).join('');
    this.dom.overlayTag.textContent = (VEHICLES[sid] && VEHICLES[sid].name) || sid;
    this.dom.overlayBody.innerHTML =
      `<div class="lvl-select"><div class="lvl-select-h">PICK A LEVEL</div>` +
      `<div class="lvl-grid">${rows}</div></div>`;
    this.dom.overlayBtn.textContent = '◀ SPORTS';
    this.dom.overlayHint.textContent = '';
    this.dom.hero.classList.add('hidden');
    this.dom.overlay.classList.remove('hidden');
  }

  // ------------------------------------------------------------- overlays
  showTitle() {
    this.state = 'title';
    document.querySelector('.overlay-card').classList.add('title-compact');
    this._sportView = null;
    this.dom.hud.classList.add('hidden');
    this.dom.prompt.classList.add('hidden');
    this.dom.overlayTag.textContent = 'Land tricks. Learn Spanish.';
    // First screen = pick your difficulty, then START. The sport picker is
    // shelved for returning players later; the full level list stays as a
    // collapsed dev tool.
    this.dom.overlayBody.innerHTML =
      `<p>Hit the ramp, then <b>steer into the correct word</b> in slow-mo.</p>` +
      this._languageHtml() +
      this._difficultyHtml() +
      `<button class="passport-btn">🛂 ${this.lang === 'it' ? 'PASSAPORTO' : 'PASAPORTE'} · ` +
        `${this._arcStamps().filter((x) => x.done).length}/${Math.floor(this.LEVELS.length / 4)}</button>` +
      `<p class="legal"><a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></p>` +
      (localStorage.getItem('radgato.dev') === '1'
        ? `<details class="dev-levels"><summary>NIVELES · DEV</summary>${this._levelSelectHtml()}</details>`
        : '');
    const resume = this._resumeIndex();
    this.dom.overlayBtn.textContent = resume > 0 ? `CONTINUAR · NIVEL ${resume + 1}` : 'START';
    this.dom.overlayHint.textContent = '';
    this.dom.hero.classList.remove('hidden');
    this.dom.overlay.classList.remove('hidden');
  }

  showLevelComplete() {
    document.querySelector('.overlay-card').classList.remove('title-compact');
    this.state = 'levelComplete';
    this._saveResume(this.levelIndex + 1);   // save-your-place
    this.audio.levelUp();
    const acc = this.wordsTotal ? Math.round((this.wordsRight / this.wordsTotal) * 100) : 0;
    const last = this.levelIndex >= this.LEVELS.length - 1;
    // STARS: clear = 1, sharp (85%+ accuracy) = 2, flawless = 3 (no lives
    // lost, or 8s+ left on a reto clock). Best per level is saved per
    // language — the replay hook is "perfect the place", not just pass it.
    const flawless = this.challenge ? this.rushTime >= 8
      : this.lives >= (DIFFS[this.difficulty] || DIFFS.medio).lives;
    const stars = 1 + (acc >= 85 ? 1 : 0) + (flawless ? 1 : 0);
    this._saveStars(this.levelIndex, stars);
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.dom.overlayTag.textContent =
      `${starStr}  ${last ? '¡Campeón!' : '¡Nivel completado!'}`;

    if (this.sentenceMode) {
      // The payoff: every sentence you built this level, spelled out.
      const list = this.sentences
        .map((s) => `<div class="sentence-win">${s.words.map((w) => w.es).join(' ')}</div>` +
                    `<p class="sentence-win-en">“${s.en}”</p>`)
        .join('');
      const words = this.sentences.reduce((n, s) => n + s.words.length, 0);
      this.dom.overlayTag.textContent = `${starStr}  ¡Frases completas!`;
      this.dom.overlayBody.innerHTML =
        list +
        `<p>You just learned <span class="stat">${this.sentences.length}</span> sentences ` +
        `(<span class="stat">${words}</span> words) · ` +
        `<span class="stat">${this.score}</span> pts · ` +
        `<span class="stat">${acc}%</span> accuracy</p>`;
    } else {
      const mision = this.lesson
        ? `<p class="sentence-win-en">MISIÓN CUMPLIDA: ${this.lesson.theme} ✓</p>` : '';
      const red = this.redeemed
        ? `<p class="redeemed">🔥 ${this.redeemed} ${this.lang === 'it' ? 'parole riscattate · words redeemed' : 'palabras redimidas · words redeemed'}</p>` : '';
      this.dom.overlayBody.innerHTML =
        `<div class="big">${this.score}</div>` + mision + red +
        `<p><span class="stat">${this.wordsRight}/${this.wordsTotal}</span> words · ` +
        `<span class="stat">${acc}%</span> accuracy</p>` +
        (last ? `<p>You cleared every level and every machine. ¡Increíble!</p>` : '');
    }

    // A conquered RETO seals that city's passport stamp — slam it on the card.
    if (this.challenge) {
      const cityName = this.LEVELS[Math.floor(this.levelIndex / 4) * 4].name;
      this.dom.overlayBody.innerHTML =
        `<div class="stamp stamp-slam got" style="--rot:-7deg">` +
        `<span class="stamp-city">${cityName}</span>` +
        `<span class="stamp-mark">${this.lang === 'it' ? 'TIMBRATO' : 'SELLADO'} ✔</span></div>` +
        this.dom.overlayBody.innerHTML;
    }

    // Clearing a sport's last level hands you the next machine; every other
    // level awards a NEW TRICK instead — the arsenal grows level by level.
    if (this.level.unlocks) { this._unlockSport(this.level.unlocks); this._showUnlock(this.level.unlocks); }
    else if (this.level.awardTrick) this._showTrickAward(this.level.awardTrick);

    this.dom.overlayBtn.textContent = last ? 'PLAY AGAIN' : 'NEXT LEVEL';
    const next = last ? null : this.LEVELS[this.levelIndex + 1];
    this.dom.overlayHint.textContent = last
      ? ''
      : `Up next: ${next.name} · ${VEHICLES[next.vehicle].name}`;
    this.dom.hero.classList.add('hidden');
    this.dom.overlay.classList.remove('hidden');
    this.dom.hud.classList.add('hidden');
  }

  // The "new wheels" reward card. Sits on top of the level-complete card and
  // has to be dismissed first, so the unlock always gets its own beat.
  _showUnlock(vehId) {
    const v = VEHICLES[vehId];
    if (!v || !this.dom.unlock) return;
    const ART = {
      bmx: 'assets/cat/hero_bmx_3.png',
      rollerblades: 'assets/cat/hero_blade_3.png',
      pogo: 'assets/cat/hero_pogo_4.png',
      dirtbike: 'assets/cat/hero_dirt_3.png',
      jetpack: 'assets/cat/hero_jet_2.png',
    };
    const BLURB = {
      bmx: 'Big floaty launches. Heavy in the air — commit to your word early.',
      rollerblades: 'Light and whippy. You can still save a bad line late.',
      pogo: 'It bounces instead of rolling. Slowest ride, biggest air — ramps throw you sky-high and you hang there.',
      dirtbike: 'Fastest and heaviest. It launches enormous but steers like a truck — pick your word early and commit.',
      jetpack: 'It never lands. Falls at 42% gravity and turns on a dime — the most hang time and the most control in the game.',
    };
    const S = this.S();
    const win = { es: S.win[vehId] || '', en: `${S.winEn} the ${(VEHICLES[vehId] || {}).name || vehId}` };
    const kick = this.dom.unlock.querySelector('.unlock-kicker');
    if (kick) kick.textContent = 'NUEVO EQUIPO';
    this.dom.unlockName.textContent = v.name;
    this.dom.unlockBlurb.textContent = BLURB[vehId] || '';
    this.dom.unlockArt.src = ART[vehId] || 'assets/cat/mascot_game.png';
    if (this.dom.unlockEs) this.dom.unlockEs.textContent = win.es;
    if (this.dom.unlockEn) this.dom.unlockEn.textContent = win.en;
    this.dom.unlock.classList.remove('hidden');
    this.dom.unlock.classList.remove('pop');
    void this.dom.unlock.offsetWidth;         // restart the entrance animation
    this.dom.unlock.classList.add('pop');
    // Reward beat: fanfare + fireworks + the announcer telling you, in Spanish,
    // what you just won. The variant changes per sport so it isn't identical
    // every time. Confetti keeps running until ¡VAMOS! is pressed.
    const variant = Math.max(0, SPORT_ORDER.indexOf(vehId));
    this.audio.fanfare(variant);
    // say(), not speakWord() — the award callout must fire even when per-word
    // narration is toggled off. 900ms lets the fanfare peak clear first.
    setTimeout(() => this.audio.say(win.es), 900);
    this._startCelebration(variant);
  }

  dismissUnlock() {
    this._stopCelebration();
    if (this.dom.unlock) this.dom.unlock.classList.add('hidden');
  }

  // "¡NUEVO TRUCO!" — the reward card for clearing a non-unlock level. Same
  // celebration machinery as new gear, but the prize is a move: it becomes
  // available on the next level (trickTier steps up per level in levels.js).
  _showTrickAward(trickName) {
    if (!this.dom.unlock) return;
    const ART = {
      skateboard: 'assets/cat/trick_skate_3.png',
      bmx: 'assets/cat/trick_bmx_3.png',
      rollerblades: 'assets/cat/trick_blade_3.png',
      pogo: 'assets/cat/trick_pogo_3.png',
      dirtbike: 'assets/cat/trick_dirt_3.png',
      jetpack: 'assets/cat/trick_jet_3.png',
    };
    const kicker = this.dom.unlock.querySelector('.unlock-kicker');
    if (kicker) kicker.textContent = this.S().kickerTrick;
    this.dom.unlockName.textContent = trickName;
    if (this.dom.unlockEs) this.dom.unlockEs.textContent = `${this.S().nuevoTruco} ${trickName}`;
    if (this.dom.unlockEn) this.dom.unlockEn.textContent = `New trick unlocked: ${trickName}`;
    this.dom.unlockBlurb.textContent = 'Land answers on the next level to throw it.';
    this.dom.unlockArt.src = ART[this.level.vehicle] || 'assets/cat/mascot_game.png';
    this.dom.unlock.classList.remove('hidden', 'pop');
    void this.dom.unlock.offsetWidth;
    this.dom.unlock.classList.add('pop');
    const variant = Math.max(0, SPORT_ORDER.indexOf(this.level.vehicle));
    this.audio.fanfare(variant);
    setTimeout(() => this.audio.say(this.S().nuevoTruco), 900);
    this._startCelebration(variant);
  }

  // The full sentence you just completed, flashed centre-screen.
  _flashSentence(sent) {
    const el = this.dom.sentenceFlash;
    if (!el || !sent) return;
    this.dom.sentenceFlashEs.textContent = sent.words.map((w) => w.es).join(' ');
    this.dom.sentenceFlashEn.textContent = sent.en;
    el.classList.remove('hidden', 'pop');
    void el.offsetWidth;
    el.classList.add('pop');
    this.audio.levelUp();
    if (this.audio.narrate) setTimeout(() => this.audio.speakWord(this.dom.sentenceFlashEs.textContent), 260);
    clearTimeout(this._sflashT);
    this._sflashT = setTimeout(() => el.classList.add('hidden'), 2100);
  }

  // MISIÓN card at level start: the level isn't "level 23", it's a rideable
  // skill — "MISIÓN: la comida callejera · CARTAGENA". Theme comes straight
  // from the lesson; reuses the sentence-flash element (same styling beat).
  _flashMission() {
    const el = this.dom.sentenceFlash;
    if (!el || !this.lesson) return;
    this.dom.sentenceFlashEs.textContent = `${this.S().mision}: ${this.lesson.theme}`;
    this.dom.sentenceFlashEn.textContent = this.lesson.themeEn
      ? `${this.lesson.themeEn} · ${this.level.name}` : this.level.name;
    el.classList.remove('hidden', 'pop');
    void el.offsetWidth;
    el.classList.add('pop');
    clearTimeout(this._sflashT);
    this._sflashT = setTimeout(() => el.classList.add('hidden'), 2400);
  }

  // ------------------------------------------------------- celebration FX
  // Confetti + fireworks on the unlock card, running until it's dismissed.
  _startCelebration(variant = 0) {
    const cv = this.dom.celebrate;
    if (!cv) return;
    this._stopCelebration();
    const ctx = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const fit = () => {
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const W = () => cv.width / dpr, H = () => cv.height / dpr;
    const PAL = [
      ['#ff2fb9', '#21e6ff', '#b6ff2b', '#ffe11a', '#a12bff'],
      ['#ffe11a', '#ff7a1a', '#ff2fb9', '#fff6fb', '#21e6ff'],
      ['#21e6ff', '#b6ff2b', '#fff6fb', '#a12bff', '#ff2fb9'],
    ][variant % 3];
    const pick = () => PAL[(Math.random() * PAL.length) | 0];
    const conf = [], spark = [];
    const addConfetti = (n) => {
      for (let i = 0; i < n; i++) conf.push({
        x: Math.random() * W(), y: -20 - Math.random() * H() * 0.6,
        vx: (Math.random() - 0.5) * 70, vy: 90 + Math.random() * 150,
        s: 6 + Math.random() * 9, rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 9, c: pick(),
      });
    };
    const burst = (x, y) => {
      const c = pick();
      for (let i = 0; i < 44; i++) {
        const a = Math.random() * 6.283, sp = 90 + Math.random() * 240;
        spark.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c });
      }
      this.audio.firework(0);
    };
    addConfetti(100);
    let last = performance.now(), nextFw = 0.3;
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W(), H());
      nextFw -= dt;
      if (nextFw <= 0) {
        burst(W() * (0.14 + Math.random() * 0.72), H() * (0.12 + Math.random() * 0.42));
        nextFw = 0.75 + Math.random() * 0.95;
      }
      if (conf.length < 80) addConfetti(22);
      for (let i = conf.length - 1; i >= 0; i--) {
        const p = conf[i];
        p.vy += 130 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > H() + 30) { conf.splice(i, 1); continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s * 0.35, p.s, p.s * 0.7);
        ctx.restore();
      }
      for (let i = spark.length - 1; i >= 0; i--) {
        const p = spark[i];
        p.life -= dt * 0.85;
        if (p.life <= 0) { spark.splice(i, 1); continue; }
        p.vy += 230 * dt; p.vx *= (1 - dt * 1.2); p.vy *= (1 - dt * 0.55);
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      this._celebT = requestAnimationFrame(step);
    };
    this._celebT = requestAnimationFrame(step);
  }

  _stopCelebration() {
    if (this._celebT) cancelAnimationFrame(this._celebT);
    this._celebT = null;
    const cv = this.dom.celebrate;
    if (cv) { const c = cv.getContext('2d'); if (c) c.clearRect(0, 0, cv.width, cv.height); }
  }

  onOverlayButton() {
    // From a sport's level list, the big button goes BACK to the sport picker.
    if (this._sportView != null && this.state === 'title') {
      this._sportView = null;
      this.showTitle();
      return;
    }
    this.audio.unlock();
    // This click IS the user gesture browsers require before audio can play.
    if (!this.music.started) { this.music.start(); this._skipTrackAdvance = true; }
    if (this.state === 'passport') {
      this.showTitle();
      return;
    }
    if (this.state === 'study') {
      this._beginLevel();
    } else if (this.state === 'title') {
      this.loadLevel(this._resumeIndex());
    } else if (this.state === 'levelComplete') {
      const last = this.levelIndex >= this.LEVELS.length - 1;
      this.loadLevel(last ? 0 : this.levelIndex + 1);
    } else if (this.state === 'gameOver') {
      this.loadLevel(this.levelIndex);   // retry the same level
    }
  }

  // ------------------------------------------------------------- main loop
  start() {
    this._last = performance.now();
    const tick = (t) => {
      let dt = (t - this._last) / 1000;
      this._last = t;
      if (dt > 0.05) dt = 0.05;   // clamp big frame gaps
      this.update(dt);
      this.render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  update(dt) {

    // Ease slow-mo toward its target — a deeper, more dramatic dip during the
    // word window (bullet-time), snapping back out fast afterward.
    // After a correct answer the quiz closes instantly, and time used to snap
    // back to 1.0 before the trick had played a single frame. `showcase` holds
    // a softer slow-mo for a beat so you actually get to watch the trick land.
    if (this.showcase > 0) {
      this.showcase -= dt;
      // Showcase just ended -> pay it off with a short speed burst.
      if (this.showcase <= 0 && this._burstAfterShowcase) {
        this._burstAfterShowcase = false;
        this.speedBurst = 0.55;
      }
    }
    if (this.speedBurst > 0) this.speedBurst -= dt;
    let targetScale = this.quiz.active ? this._quizTimeScale()
                      : this.showcase > 0 ? 0.42
                      : this.speedBurst > 0 ? 1.35
                      : 1;
    // Know the answer already? Hold your finger UP toward the words and the
    // cat rockets up to the row instead of floating through full bullet-time.
    // The boost cuts out on final approach so the catch stays controllable.
    if (this.quiz.active) {
      const ptr = this.input.pointer;
      const cat = this._catScreenPos();
      // Finger above the cat -> he shoots up toward the words. Scales with how
      // far above you're pointing (up to 6x), works through the whole rise and
      // hang, and eases off automatically on final approach to the row.
      if (ptr.active && cat && ptr.y < cat.y - 60 && this.player.vy < 160) {
        const k = Math.min(1, (cat.y - 60 - ptr.y) / 220);
        targetScale = Math.min(1, targetScale * (2.5 + 3.5 * k));
      }
    }
    const ease = (this.quiz.active || this.showcase > 0) ? dt * 14 : dt * 8;
    this.timeScale += (targetScale - this.timeScale) * Math.min(1, ease);
    const simDt = dt * this.timeScale;

    if (this.state === 'playing' && !this.paused && this.hp) this._updateHalfpipe(dt);
    else if (this.state === 'playing' && !this.paused) this._updatePlaying(simDt, dt);

    this.particles.update(this.state === 'playing' ? simDt : dt);
    this.shake += (0 - this.shake) * Math.min(1, dt * 8);
    this.flash += (0 - this.flash) * Math.min(1, dt * 6);
  }

  // How hard to slow time so the word window lasts level.answerTime REAL
  // seconds. Stretching the arc is what buys think time, so the factor is just
  // (un-slowed arc length) / (seconds we want it to take).
  _effAnswerTime() {
    const base = (this.level ? this.level.answerTime : 7) * (DIFFS[this.difficulty] || DIFFS.medio).mult;
    const q = this.currentQ;
    if (!q || !this.quiz.active) return base;
    // Listening always gets the top of the range (you can't skim a sound), and
    // a question whose mode just changed buys a beat so a switch never costs a
    // streak — the fire streak is the game's dopamine, it must not pay for
    // variety.
    let mult = 1;
    if (q.mode === 'audio') mult *= 1.35;
    if (q._switched) mult *= 1.12;
    return base * mult;
  }

  _quizTimeScale() {
    const world = this.player.airTimeWorld;
    const want = this._effAnswerTime();
    if (!world || !want) return 0.3;
    const base = Math.max(0.06, Math.min(1, world / want));
    // Hang at the top. Time dips hardest as vertical speed approaches zero, so
    // the apex — the moment you're actually choosing a word — gets the most
    // room, while the rise and fall stay snappy. This makes the effective
    // window a little LONGER than answerTime, which is the point.
    const p = this.player;
    const hang = (this.level._veh && this.level._veh.apexHang) || 0;
    const apexNess = p.launchVy0 ? 1 - Math.min(1, Math.abs(p.vy) / p.launchVy0) : 0;
    return Math.max(0.04, base * (1 - hang * apexNess));
  }

  // =============================================================== HALF-PIPE
  // Runs on REAL time — the clock IS the pressure. The loop is a
  // call-and-response rhythm: read the word while you carve (the bubbles are
  // up the whole time), launch off a lip, STEER into your answer at the apex,
  // land the trick. Nothing resolves on its own: an untouched flight goes
  // straight up off the lip, comes straight back down, and costs you clock.
  _updateHalfpipe(dt) {
    const hp = this.hp, r = this.renderer, g = r.hpGeom();
    hp.time += dt;
    hp.animT += dt;
    if (this.fireBurst > 0) this.fireBurst -= dt;

    // countdown + HUD + end conditions
    this.rushTime -= dt;
    this._rushHudT -= dt;
    if (this._rushHudT <= 0) { this._rushHudT = 0.2; this._updateRushHud(); }
    if (this.rushCount >= this.challenge.goal) { this.showLevelComplete(); return; }
    if (this.rushTime <= 0) { this._timeUp(); return; }

    // ¡ÚLTIMO TRUCO! — the last five seconds slow the whole pipe down and pay
    // double. One huge readable finale launch instead of a panicked scramble.
    if (!hp.finale && this.rushTime <= 5) {
      hp.finale = true;
      this.audio.say(this.S().ultimo);
      this.flash = 1; this.flashColor = '255,200,40';
    }

    // Serve the next word: instantly at round start, after a short beat
    // following a resolve (so the green reveal on the old bubbles lands).
    if (!hp.q) {
      if (hp.qDelay > 0) { hp.qDelay -= dt; if (hp.qDelay <= 0) this._hpNewQuestion(); }
      else if (!hp.qCount && hp.phase === 'slide') this._hpNewQuestion();
    }

    this._handleTap();

    for (const b of hp.bubbles) b.scale += (1 - b.scale) * Math.min(1, dt * 10);

    // FLOW time and the finale both stretch the moment: pendulum + flight run
    // slower, so skilled play literally buys breathing room.
    const stretch = (hp.flowTime ? 0.62 : 1) * (hp.finale ? 0.62 : 1);

    if (hp.phase === 'slide') {
      // pendulum across the pipe: s = sin(phi), walls at phi = ±π/2
      hp.phi += hp.dir * 2.3 * ((DIFFS[this.difficulty] || DIFFS.medio).speed) * dt * (hp.finale ? 0.7 : 1);
      let launch = 0;
      if (hp.phi >= Math.PI / 2) { hp.phi = Math.PI / 2; launch = 1; }
      if (hp.phi <= -Math.PI / 2) { hp.phi = -Math.PI / 2; launch = -1; }
      const t = Math.sin(hp.phi);
      const p = r.hpPoint(t);
      hp.catX = p.x; hp.catY = p.y;
      // ±1.5 rad: the painted walls are genuinely vertical, so the cat tilts
      // all the way to horizontal riding up them — that's the whole show.
      hp.ang = Math.max(-1.5, Math.min(1.5, p.ang));
      hp.slidePhase += dt * 7;
      if (launch) this._hpTakeoff(launch);
    } else if (hp.phase === 'air') {
      hp.airT += dt * stretch;
      const lip = r.hpPoint(hp.side);
      const RISE = 0.5, HANG = 0.85;                    // seconds up, seconds floating
      const apexY = g.rowY;
      if (hp.airT < RISE) {
        const k = hp.airT / RISE;
        hp.catY = lip.y + (apexY - lip.y) * (1 - (1 - k) * (1 - k));   // ease out
      } else {
        hp.catY = apexY + Math.sin((hp.airT - RISE) * 6) * 4;          // float at the row
      }
      hp.ang *= Math.max(0, 1 - dt * 8);
      // Steering is the game: drag = the cat IS your finger; a tap pre-aimed
      // (or aims now) at a bubble. NO input means a straight up-and-down
      // flight from the lip — which reaches nothing. That's on purpose.
      const ptr = this.input.pointer;
      if (ptr.active) hp.aimX = null,
        hp.targetX = Math.max(g.cx - g.halfW + 20, Math.min(g.cx + g.halfW - 20, ptr.x));
      else if (hp.aimX != null) hp.targetX = hp.aimX;
      hp.catX += (hp.targetX - hp.catX) * Math.min(1, dt * 12);
      if (hp.q) {
        // fly into a word — you have to actually be ON it
        for (const b of hp.bubbles) {
          if (Math.abs(hp.catX - b.x) < b.r * 0.85 && Math.abs(hp.catY - b.y) < b.r * 0.9) {
            this._hpResolve(b);
            break;
          }
        }
      }
      // hang over -> drop back to the same lip, question still live
      if (hp.phase === 'air' && hp.airT > RISE + HANG) {
        hp.resolveY = hp.catY;
        hp.phase = 'return'; hp.airT = 0;
        if (hp.flowTime) { hp.flowTime = false; hp.flow = 0; }   // flow spent
      }
    } else if (hp.phase === 'return') {
      hp.airT += dt;
      const lip = r.hpPoint(hp.side);
      const k = Math.min(1, hp.airT / 0.45);
      hp.catY = hp.resolveY + (lip.y - hp.resolveY) * k * k;
      hp.catX += (lip.x - hp.catX) * Math.min(1, dt * 7);
      if (k >= 1) {
        if (hp.anim === 'crash') { hp.phase = 'stunned'; hp.animT = 0; }
        else {
          hp.phase = 'slide'; hp.anim = null;
          hp.dir = -hp.side;                       // drop back in, swing across
          hp.phi = hp.side * (Math.PI / 2 - 0.02);
        }
      }
    } else if (hp.phase === 'stunned') {
      // sit dazed at the lip for a beat after a crash — the time cost of a miss
      if (hp.animT > 1.0) {
        hp.phase = 'slide'; hp.anim = null;
        hp.dir = -hp.side;
        hp.phi = hp.side * (Math.PI / 2 - 0.02);
      }
    }
  }

  // Serve the next word. The bubbles hang over the pipe the whole time — you
  // read WHILE carving, that's the reading window — and the English prompt
  // stays on screen until the word is actually answered. Every 4th question
  // is a PALABRA DE ORO: one golden bubble, higher and smaller, worth 3× and
  // +3 seconds — pure air control under a spotlight.
  _hpNewQuestion() {
    const hp = this.hp, g = this.renderer.hpGeom();
    hp.qCount++;
    hp.golden = hp.qCount % 4 === 0;
    hp.aimX = null;
    const q = this.lesson
      ? makeLessonQuestion(this.lesson, this.level.choices || 3, this.recent)
      : makeQuestion(this.level.tiers, this.level.choices || 3, this.recent);
    this._noteRecent(q.answer);
    this.currentQ = q;
    hp.q = q;
    // Sized against the (narrower) art opening: three bubbles at ±0.6·halfW
    // must not touch each other, and a straight-up lip flight must miss the
    // outer one — both checked against r below.
    const R = Math.min(40, (this.w || 375) * 0.104);
    // PALABRA DE ORO is a normal 3-choice question — same skill, everything
    // gold, triple points +3s on a catch. (It used to be a single lone bubble;
    // that read as "where did my options go?" no matter how it was dressed.)
    const xs = [-0.6, 0, 0.6].map((t) => g.cx + t * g.halfW);
    hp.bubbles = q.options.map((opt, i) => ({
      es: opt.es, correct: opt.correct, golden: hp.golden,
      x: xs[i % xs.length], y: g.rowY, r: R,
      bobPhase: i * 1.7, hit: false, reveal: false, scale: 0,
    }));
    if (hp.golden) {
      this.audio.say(this.S().oro);
      this._showTrick(this.S().oroBanner, 0, true);
      this.flash = 1; this.flashColor = '255,200,40';
    }
    this._setPrompt(q.prompt);
    this.dom.prompt.classList.remove('hidden');
  }

  // Off the lip: straight up, from wherever the lip is. Flow bank full? This
  // flight is the payoff — slow-mo, double points, spend the bar.
  _hpTakeoff(side) {
    const hp = this.hp, r = this.renderer;
    hp.phase = 'air'; hp.side = side; hp.airT = 0; hp.anim = 'air'; hp.animT = 0;
    hp.targetX = r.hpPoint(side).x;
    hp.flowTime = hp.flow >= 3;
    this.audio.launch(this.level.vehicle);
    this.audio.whoosh();
  }

  _hpResolve(bubble) {
    const hp = this.hp;
    const correct = !!(bubble && bubble.correct);
    if (bubble) bubble.hit = true;
    for (const b of hp.bubbles) if (b.correct) b.reveal = true;
    const wasGolden = hp.golden, wasFlow = hp.flowTime;
    hp.q = null; hp.golden = false;
    hp.resolveY = hp.catY;
    hp.phase = 'return'; hp.airT = 0; hp.animT = 0;
    if (hp.flowTime) { hp.flowTime = false; hp.flow = 0; }       // flow spent
    this.wordsTotal++;
    const answerEs = this.currentQ ? this.currentQ.answer : null;
    this._narrate(answerEs, correct ? 160 : 700);
    if (answerEs) {
      this.memoria.record(answerEs, {
        correct, fast: correct, lesson: this.level.lesson, mode: 'en',
        picked: !correct && bubble ? bubble.es : null,
      });
    }
    if (correct) {
      this.wordsRight++;
      this.rushCount++;
      this.combo++;
      hp.flow = Math.min(3, hp.flow + 1);
      const mult = Math.min(this.combo, 5);
      const trick = pickTrick(this.combo, this.level.vehicle, Math.random(), this.level.trickTier ?? 4);
      const value = (wasGolden ? 3 : 1) * (wasFlow ? 2 : 1) * (hp.finale ? 2 : 1);
      const pts = (100 * mult + (trick.bonus || 0)) * value;
      this.score += pts;
      let label = trick.name;
      if (wasGolden) { this.rushTime += 3; label += ' · +3s'; }
      if (wasFlow) label = 'FLOW · ' + label;
      this.flash = 1; this.flashColor = wasGolden ? '255,200,40' : '182,255,43';
      this.audio.correct(this.combo);
      this._popCombo();
      this._onStreak();
      this._showTrick(label, pts, true);
      hp.anim = 'trick';
    } else {
      this.combo = 0;
      hp.flow = 0;
      if (this.onFire) { this.onFire = false; }
      this.flash = 1; this.flashColor = '255,47,185';
      this.shake = 12;
      this.audio.wrong();
      setTimeout(() => this.audio.meow(), 180);
      this._showTrick('WIPEOUT!', 0, false);
      hp.anim = 'crash';
    }
    this._updateHud();
    // next word after a beat — long enough to see the reveal, short enough
    // that you're reading the new one on the way back down
    hp.qDelay = 0.9;
  }

  _updatePlaying(simDt, realDt) {
    const p = this.player;
    const wasGround = p.mode === 'ground';

    // Turn the live pointer / keys into a lateral target the cat eases toward.
    this._applyPointerSteering();
    if (this.fireBurst > 0) this.fireBurst -= realDt;

    p.update(simDt, this.input, realDt);

    // Launch off a ramp lip we just crossed.
    if (wasGround && p.mode === 'ground') {
      const lip = this.terrain.crossedLip(p.prevX, p.x);
      if (lip) {
        lip.used = true;
        p.launch(lip.quiz);
        this.audio.launch(this.level.vehicle);
        // No new word while still recovering from a wipeout.
        if (lip.quiz && p.blinkTimer <= 0) this._startQuiz();
      }
    }

    // Crumbling bridges strain and collapse under you.
    this._updateBridges(simDt);

    // Landing (may also close an unanswered quiz as a miss).
    const land = p.checkLanding();
    if (land) this.audio.land();

    // A tap answers a word, or pauses if it's a mid-screen tap while riding.
    this._handleTap();

    // Word resolution / miss.
    this.quiz.update(realDt, p, (correct) => this._onAnswer(correct));

    // Keep the course generated ahead (deep enough for the perspective view).
    this.terrain.ensure(p.x + 2200);
    this.terrain.prune(p.x - 400);

    this._updateCamera(realDt);

    // RETO: real-seconds countdown; goal met -> instant clear, time out -> retry.
    if (this.challenge) {
      this.rushTime -= realDt;
      this._rushHudT -= realDt;
      if (this._rushHudT <= 0) { this._rushHudT = 0.2; this._updateRushHud(); }
      if (this.rushCount >= this.challenge.goal) { this.showLevelComplete(); return; }
      if (this.rushTime <= 0) { this._timeUp(); return; }
      return;   // challenges never end on score/sentences
    }

    // Sentence levels end when the sentence is finished; vocab levels on score.
    const cleared = this.sentenceMode
      ? (this.sentenceIdx >= this.sentences.length - 1 &&
         this.solved.size >= this.sentence.words.length)
      : this.score >= this.level.targetScore;
    if (cleared) this.showLevelComplete();
  }

  // Bridges the skater is on strain, shed debris, then drop into a pit.
  _updateBridges(dt) {
    const p = this.player;
    const base = this.terrain.baseY;
    for (const b of this.terrain.bridges) {
      if (b.collapsed) continue;
      if (!b.triggered && p.mode === 'ground' && p.x > b.x0 + 30 && p.x < b.x1) {
        b.triggered = true;
      }
      if (!b.triggered) continue;
      b.t += dt;
      if (Math.random() < 0.35) {
        this.particles.spawn(b.x0 + Math.random() * (b.x1 - b.x0), base, {
          count: 1, color: '#7a4a1a', speed: 70, dir: Math.PI * 0.5, spread: 1.2,
          life: 0.5, size: 4, gravity: 900,
        });
      }
      if (b.t >= b.fallTime) {
        b.collapsed = true;
        this.audio.wrong();
        this.shake = Math.max(this.shake, 9);
        for (let i = 0; i < 6; i++) {
          this.particles.spawn(b.x0 + (i / 6) * (b.x1 - b.x0), base, {
            count: 3, color: '#6a3d16', speed: 320, spread: Math.PI, dir: Math.PI * 0.5,
            life: 1.0, size: 6, gravity: 1300,
          });
        }
      }
    }
  }

  // Highest the answer row may sit, in world units, so no bubble ever renders
  // under the HUD or behind the English prompt. Measured from the real DOM, so
  // it adapts to any window shape instead of trusting a hardcoded percentage.
  // Returns a world-Y LINE (smaller = higher), not a height.
  _answerCeiling() {
    const r = this.renderer;
    if (!r.h) return Infinity;
    // Deliberately NOT measured from the DOM. Two reasons this has to be pure
    // canvas geometry:
    //   1. _startQuiz calls this BEFORE unhiding #prompt, so the element is
    //      display:none and every rect reads 0.
    //   2. the DOM and the canvas don't necessarily share a pixel scale, so a
    //      CSS-pixel bottom edge isn't comparable to a projected canvas Y.
    // Instead the HUD + prompt own a reserved band at the top of the canvas
    // (TOP_BAND), and the answer row is kept below it. style.css pins #prompt
    // inside the same fraction, so the two agree by construction.
    const TOP_BAND = 0.30;
    let safeTop = r.h * TOP_BAND;

    // Undo the bullet-time punch-in. frame() scales by `zoom` about y = 0.6h,
    // which lifts everything above that point — so the row has to clear a
    // STRICTER pre-zoom line than the one we actually care about on screen.
    const cy = r.h * 0.6;
    safeTop = cy + (safeTop - cy) / QUIZ_ZOOM;

    // The row is drawn relative to the PLAYER, on the player's own launch
    // slice — so d is 0, not a camera-relative distance.
    const d = 0;
    const lay = this._answerLayout();
    const radius = (lay ? lay.radius : (this.level.choices >= 4 ? 40 : 46)) * QUIZ_ZOOM;
    // maxUpForTop works in heights above the ground datum; convert to the world
    // Y line quiz.js clamps against.
    return BASE_Y - r.maxUpForTop(d, safeTop, radius);
  }

  // Lay the answer row out in SCREEN space, then convert back to world units.
  //
  // The projection scales lateral distance by ZS ∝ viewport width, but a
  // bubble's radius only scales with depth. On desktop that's fine; on a 375px
  // phone the spacing collapsed to 24px while the bubbles stayed 70px across,
  // so all three sat on top of each other. Deriving the row from the actual
  // viewport keeps it readable at any width, and the steering reach is derived
  // from the same number so the outer words stay reachable.
  _answerLayout() {
    const r = this.renderer;
    const n = this.level.choices || 3;
    if (!r.w || !r.ZS) return null;

    // render.frame() projects everything relative to the PLAYER's x, not the
    // camera's — and the bubbles are placed on the player's own launch slice.
    // So they always draw at d = 0, scale = 1, whatever the camera is doing.
    // (Assuming a camera-relative distance here put the predicted layout 67%
    // off from what actually got drawn.)
    const scale = 1;
    const worldPerPx = 1 / (scale * r.ZS);

    const V = r.view || {};
    let half = (r.w * (V.rowSpan ?? 0.52)) / 2;
    // Radius in real screen pixels, so bubbles stay chunky on a small display.
    // 0.36 of a slot leaves ~28% of it as clear space between edges.
    const radiusOf = (h) => Math.min(46, (2 * h / n) * 0.36);

    // The row is CENTRED ON THE SCREEN, not on the track's near point. Anchoring
    // it to the track meant that steepening the camera angle (nearX) dragged the
    // row left until the first word hung off the edge. Screen-centred keeps the
    // three words symmetric no matter how side-on the track gets.
    const centreZ = (r.w / 2 - r.NEAR_X) / r.ZS;

    // Bullet-time scales the row about cx AFTER this runs, so solve the edge
    // clamp in post-zoom screen space — that's what the player actually sees.
    const Z = QUIZ_ZOOM;
    const cx = r.NEAR_X + (r.VP_X - r.NEAR_X) * 0.18;
    const zc = cx + (r.w / 2 - cx) * Z;             // row centre after the zoom
    const MARGIN = 14;
    const maxE = Math.max(30, Math.min((zc - MARGIN) / Z, (r.w - MARGIN - zc) / Z));
    if (half + radiusOf(half) > maxE) {
      half = maxE / (1 + 0.72 / n);                 // radius still slot-driven
      if (half + radiusOf(half) > maxE) half = Math.max(20, maxE - radiusOf(half));
    }

    return {
      zmax: half * worldPerPx,
      radius: radiusOf(half) / scale,    // back into the units _bubbles draws in
      shift: centreZ,
      raise: V.rowRaise ?? 0.2,          // how far to lift the row toward the top
    };
  }

  // ------------------------------------------------------------- steering
  // Invert the projection: a screen X → the world lane `z` whose bubble draws
  // there. The answer row and cat both sit on the launch slice (d = 0,
  // scale = 1), so screenX = cx + (NEAR_X + z*ZS - cx) * zoom. Solve for z.
  _pointerToZ(clientX) {
    const r = this.renderer;
    const cx = r.NEAR_X + (r.VP_X - r.NEAR_X) * 0.18;
    const Z = this.cam.zoom || 1;
    return (((clientX - cx) / Z) - r.NEAR_X + cx) / r.ZS;
  }

  // Each frame: the cat's lateral target follows the finger absolutely (so it
  // feels like you're holding him) or the keyboard, clamped to what's reachable.
  _applyPointerSteering() {
    const p = this.player;
    const ptr = this.input.pointer;
    const lay = this.level._layout;

    if (this.quiz.active) {
      let z = null;
      if (ptr.active) z = this._pointerToZ(ptr.x);
      else if (this.input.keySteer && lay) z = lay.shift + this.input.keySteer * lay.zmax;
      if (z != null && lay) z = Math.max(lay.shift - lay.zmax, Math.min(lay.shift + lay.zmax, z));
      p.steerTargetZ = z;
      p.groundTargetZ = null;
      // FULL 2D CONTROL: while your finger is down, its HEIGHT flies the cat
      // too — swipe up to the row and he goes there. Release and gravity takes
      // back over. (Invert the projection: clientY -> world height at d=0.)
      if (ptr.active && this.quiz.bubbles.length) {
        const r = this.renderer, Z = this.cam.zoom || 1, cy = r.h * 0.6;
        const yPre = cy + (ptr.y - cy) / Z;
        const up = (r.NEAR_Y - yPre) / r.HS;
        const rowY = this.quiz.bubbles[0].worldY;
        p.flyTargetY = Math.max(rowY - 30, Math.min(p.launchY, BASE_Y - up));
      } else {
        p.flyTargetY = null;
      }
    } else {
      p.flyTargetY = null;
      p.steerTargetZ = null;
      // Pre-steer on the ground: limited range, same absolute feel.
      const RANGE = 130;
      let gz;
      if (ptr.active) gz = Math.max(-RANGE, Math.min(RANGE, this._pointerToZ(ptr.x)));
      else gz = this.input.keySteer * RANGE;
      p.groundTargetZ = gz;
    }
  }

  // Route a tap: during the word window it answers, otherwise a tap in the
  // middle of the screen (and not on the cat) pauses.
  _handleTap() {
    const tap = this.input.takeTap();
    if (!tap) return;
    if (this.hp) {
      if (this.hp.q) {
        // A tap AIMS — it never answers. Tap a bubble while carving and the
        // cat flies at it off the next lip; tap mid-air to re-aim. The only
        // way a word resolves is the cat physically reaching it.
        let best = null, bestD = Infinity;
        for (const b of this.hp.bubbles) {
          const d = Math.hypot(tap.x - b.x, tap.y - b.y);
          if (d < b.r * 1.8 && d < bestD) { bestD = d; best = b; }
        }
        if (best) { this.hp.aimX = best.x; this.audio.push(); }
      }
      return;
    }
    if (this.quiz.active) { this._tapAnswer(tap); return; }
    // NOTE: no tap-anywhere-to-pause. It kept eating answer taps (especially
    // in the beat right after a word resolved, when no bubbles are live).
    // Pause is the HUD button / P / Esc — deliberate inputs only.
  }

  // Where the cat currently draws, in screen px (so a tap can avoid him).
  _catScreenPos() {
    const p = this.player, r = this.renderer;
    if (!p || !r.h) return null;
    const Z = this.cam.zoom || 1;
    const cx = r.NEAR_X + (r.VP_X - r.NEAR_X) * 0.18, cy = r.h * 0.6;
    const pr = r._project(0, BASE_Y - (p.y + p.rideOffset), p.z);
    return { x: cx + (pr.x - cx) * Z, y: cy + (pr.y - cy) * Z };
  }

  // ------------------------------------------------------------------ pause
  togglePause() { this.paused ? this.resume() : this.pause(); }

  pause() {
    if (this.state !== 'playing' || this.paused) return;
    this.paused = true;
    if (this.dom.pauseScreen) this.dom.pauseScreen.classList.remove('hidden');
    this.music.setMuted(true);
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.dom.pauseScreen) this.dom.pauseScreen.classList.add('hidden');
    this.music.setMuted(this.audio.muted);   // restore whatever the toggle says
    this._last = performance.now();          // don't bank a huge dt
  }

  // A quick tap on a word answers it directly — no need to fly the cat in.
  _tapAnswer(tap) {
    if (!this.quiz.active) return;
    const r = this.renderer, camS = this.player.x, Z = this.cam.zoom || 1;
    const cx = r.NEAR_X + (r.VP_X - r.NEAR_X) * 0.18, cy = r.h * 0.6;
    let best = null, bestD = Infinity;
    for (const b of this.quiz.bubbles) {
      const pr = r._project(b.s - camS, BASE_Y - b.worldY, b.z);
      const sx = cx + (pr.x - cx) * Z;
      const sy = cy + (pr.y - cy) * Z;
      const rad = b.r * Math.max(0.5, pr.scale) * Z;
      const d = Math.hypot(tap.x - sx, tap.y - sy);
      if (d < rad * 1.4 && d < bestD) { bestD = d; best = b; }   // forgiving
    }
    if (best) this.quiz.resolveTo(best, this.player, (c) => this._onAnswer(c));
  }


  // Prompt text with length-aware sizing: curriculum prompts run long
  // ("TO PRESCRIBE", "THE CLIMATE CHANGE") and must shrink, never clip.
  _setPrompt(text) {
    const el = this.dom.promptWord;
    const t = text.toUpperCase();
    el.textContent = t;
    el.style.fontSize = t.length > 16 ? 'clamp(17px, 4.6vw, 32px)'
                      : t.length > 9  ? 'clamp(22px, 6.4vw, 44px)' : '';
  }

  _startQuiz() {
    let q;
    if (this.sentenceMode) {
      this.curSlot = this._chooseSentenceSlot();
      q = makeSentenceQuestion(this.sentence, this.curSlot, this.level.choices);
    } else {
      q = this._nextVocabQuestion();
    }
    this.currentQ = q;
    // The rider's steering reach must match the row it has to reach, so both
    // come from the same layout.
    const layout = this._answerLayout();
    this.level._layout = layout;
    this.quiz.start(q, this.player, this._answerCeiling(), layout);
    this.audio.whoosh();
    this._presentQuestion(q);
    this.dom.prompt.classList.remove('hidden');
    this.dom.touchHint.classList.add('hidden');
  }

  // Show the question in its mode. The prompt frame IS the telegraph: colour,
  // icon and label all change together, so the kind of question reads in a
  // glance without parsing any words.
  _presentQuestion(q) {
    const mode = q.mode || 'en';
    const it = this.lang === 'it';
    const el = this.dom.prompt;
    el.classList.remove('mode-audio', 'mode-rev', 'mode-review');
    const label = el.querySelector('.prompt-label');
    if (mode === 'audio') {
      el.classList.add('mode-audio');
      if (label) label.innerHTML = (it ? 'COSA HAI SENTITO?' : '¿QUÉ ESCUCHASTE?') +
        '<span class="lbl-en">what did you hear?</span>';
      this._setPrompt('🔊');
      // Said TWICE, hands-free. The thumb is the steering stick — making the
      // player tap to replay would cost them their line in mid-air.
      this.audio.say(q.answer);
      clearTimeout(this._replayT);
      this._replayT = setTimeout(() => {
        if (this.quiz.active && this.currentQ === q) this.audio.say(q.answer);
      }, 1500);
    } else if (mode === 'rev') {
      el.classList.add('mode-rev');
      if (label) label.innerHTML = (it ? 'COSA SIGNIFICA?' : '¿QUÉ SIGNIFICA?') +
        '<span class="lbl-en">what does it mean?</span>';
      this._setPrompt(q.prompt);
    } else {
      if (label) label.innerHTML = it ? 'DILLO IN ITALIANO<span class="lbl-en">say it in italian</span>'
                                      : 'SAY IT IN SPANISH';
      this._setPrompt(q.prompt);
    }
    if (q.review) el.classList.add('mode-review');
    q._switched = mode !== this._lastMode;
    if (q._switched) this.audio.modeSting(mode);
    this._lastMode = mode;
  }

  // Next vocab question, honoring the deferred re-ask of a missed word: the
  // missed word is held out for a couple of questions, then forced back so it
  // actually gets practiced again — just never right after the miss.
  _nextVocabQuestion() {
    if (this.reask) {
      if (this.reask.wait <= 0) {
        const forced = this.lesson
          ? makeLessonQuestionForEs(this.reask.es, this.lesson, this.level.choices)
          : makeQuestionForEs(this.reask.es, this.level.tiers, this.level.choices);
        this.reask = null;
        if (forced) { this._noteRecent(forced.answer); return forced; }
      } else {
        this.reask.wait--;
      }
    }
    const avoid = new Set(this.recent);
    if (this.reask) avoid.add(this.reask.es);          // don't draw it while cooling down
    if (!this.lesson) {
      const q = makeQuestion(this.level.tiers, this.level.choices, avoid);
      this._noteRecent(q.answer);
      return q;
    }

    this.qCount++;
    // ~1 question in 3 is a word you already owe — drawn by the schedule, not
    // by whether you got it wrong (forgetting isn't error-conditional).
    let answer = null, review = false;
    if (this.qCount % 3 === 0) {
      const due = this.memoria.dueWords(this.level.lesson, 24)
        .filter((d) => !avoid.has(d.es) && this._wordIndex.has(d.es));
      if (due.length) {
        answer = this._wordIndex.get(due[Math.floor(Math.random() * Math.min(6, due.length))].es).w;
        review = true;
      }
    }
    if (!answer) {
      const bank = this.lesson.words.filter((w) => !avoid.has(w.es));
      const pool = bank.length ? bank : this.lesson.words;
      answer = pool[Math.floor(Math.random() * pool.length)];
    }

    const rec = this.memoria.get(answer.es);
    const strength = rec ? rec.s : 0;
    // Listening only when it can genuinely be heard. Levels 1-2 of a track stay
    // pure read-it so a new player learns the interface before the modes.
    const canHear = this.audio.hasVo(answer.es);
    const mode = (this.level.lesson < 2) ? 'en'
               : this.memoria.modeFor(answer.es, canHear, this.qCount);
    const q = buildQuestion(answer, this._distractorsFor(answer, strength),
                            this.level.choices, mode);
    q.review = review;
    this._noteRecent(q.answer);
    return q;
  }

  /**
   * Distractors chosen from what this learner has actually confused.
   *  - the wrong bubble they fell for last time, when there is one
   *  - while a word is still forming (strength < 2), DISTANT words: same-theme
   *    neighbours interfere with the form-meaning link at that stage
   *  - once it's solid, same-theme words, because fine discrimination is
   *    exactly what's left to learn
   */
  _distractorsFor(answer, strength) {
    const out = [], seen = new Set([answer.es]);
    const push = (w) => { if (w && !seen.has(w.es)) { seen.add(w.es); out.push(w); } };

    const cf = this.memoria.topConfusion(answer.es);
    if (cf) push(this._findWord(cf));

    const own = this._wordIndex.get(answer.es);
    const home = own ? this._trackLessons[own.li] : this.lesson;
    const near = (home ? home.words : this.lesson.words).filter((w) => w.es !== answer.es);
    const far = [];
    for (let i = 0; i < 14 && this._trackLessons.length; i++) {
      const L = this._trackLessons[Math.floor(Math.random() * this._trackLessons.length)];
      const w = L.words[Math.floor(Math.random() * L.words.length)];
      if (w.es !== answer.es) far.push(w);
    }
    const shuffled = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);
    for (const w of strength < 2 ? shuffled(far).concat(shuffled(near))
                                 : shuffled(near).concat(shuffled(far))) push(w);
    return out;
  }

  _findWord(text) {
    if (this._wordIndex.has(text)) return this._wordIndex.get(text).w;
    for (const { w } of this._wordIndex.values()) if (w.en === text) return w;
    return null;
  }

  _noteRecent(es) {
    this.recent.add(es);
    if (this.recent.size > 6) this.recent.delete([...this.recent][0]);
  }

  // Which sentence slot to ask next. Normally the lowest unsolved slot (so the
  // sentence assembles in order); but if that's the slot you JUST missed and
  // another word is open, ask that one first — the missed word returns one
  // question later instead of immediately.
  _chooseSentenceSlot() {
    const words = this.sentence.words;
    const open = [];
    for (let i = 0; i < words.length; i++) if (!this.solved.has(i)) open.push(i);
    if (!open.length) return this.curSlot;
    if (open[0] === this.lastMissedSlot && open.length > 1) return open[1];
    return open[0];
  }

  // Speak a Spanish word aloud a beat after it resolves — but only if it's worth
  // hearing (2+ syllables), so single-syllable function words don't chirp.
  _narrate(es, delay) {
    if (!es || syllableCount(es) < 2) return;
    setTimeout(() => this.audio.speakWord(es), delay);
  }


  _onAnswer(correct) {
    this.wordsTotal++;
    this.dom.prompt.classList.add('hidden');
    const q = this.currentQ;
    const answerEs = q ? q.answer : null;
    // Read the correct Spanish word aloud (the lesson): promptly on a win,
    // after the buzzer + MEOW on a miss so it lands as "the answer was …".
    this._narrate(answerEs, correct ? 160 : 700);
    // Fold the answer into MEMORIA: latency separates a known word from a
    // lucky guess, and the bubble they actually fell for becomes that word's
    // distractor next time.
    if (answerEs) {
      const picked = !correct && this.quiz.bubbles
        ? (this.quiz.bubbles.find((b) => b.hit && !b.correct) || {}).es : null;
      this.memoria.record(answerEs, {
        correct,
        fast: this.quiz.time > 0 && this.quiz.time < this._effAnswerTime() * 0.6,
        lesson: this.level.lesson,
        mode: q ? q.mode : 'en',
        picked,
      });
      if (correct && q && q.review) this.redeemed++;
    }

    // Sentence bookkeeping tracks a SET of solved slots so a miss can be
    // deferred. A right answer solves the slot; a wrong one flags it as the
    // just-missed slot so _chooseSentenceSlot asks something else next.
    if (this.sentenceMode) {
      if (correct) {
        this.solved.add(this.curSlot);
        this.lastMissedSlot = -1;
        if (this.solved.size >= this.sentence.words.length) {
          // Whole sentence done — throw it up big so the lesson lands before
          // the next question starts.
          this._flashSentence(this.sentence);
          if (this.sentenceIdx < this.sentences.length - 1) {
            this.sentenceIdx++;
            this.sentence = this.sentences[this.sentenceIdx];
            this.solved = new Set();
            this.lastMissedSlot = -1;
            this.curSlot = 0;
          }
        }
      } else {
        this.lastMissedSlot = this.curSlot;
      }
    } else if (!correct && answerEs) {
      // Vocab miss: re-ask this word later in the level, not next question.
      this.reask = { es: answerEs, wait: 2 };
    }

    if (correct) {
      this.wordsRight++;
      if (this.challenge) this.rushCount++;
      this.combo++;
      const mult = Math.min(this.combo, 5);
      const trick = pickTrick(this.combo, this.level.vehicle, Math.random(),
                              this.level.trickTier ?? 4);
      this.player.applyTrick(trick);
      const rev = !!(this.currentQ && this.currentQ.review);
      const pts = (100 * mult + (trick.bonus || 0)) * (rev ? 2 : 1);
      this.score += pts;
      this.flash = 1; this.flashColor = rev ? '255,200,40' : '182,255,43';
      this.shake = 6 + Math.min(10, trick.rot * 2);
      this.audio.correct(this.combo);
      // WATCH THE TRICK: slow-mo holds long enough for the whole move — bigger
      // rotations earn a longer look — then _burstAfterShowcase speed-ramps
      // back OUT (brief fast-forward) so the rhythm goes slow-BANG-fast
      // instead of the same flat beat every answer.
      this.showcase = Math.max(
        (this.level._veh && this.level._veh.showcase) || 0.8,
        0.55 + 0.18 * (trick.rot || 1));
      this._burstAfterShowcase = true;
      this._popCombo();
      this._onStreak();                       // ON FIRE handling
      this._showTrick(rev ? `${trick.name} · 2×` : trick.name, pts, true);
    } else {
      this.combo = 0;
      if (this.onFire) { this.onFire = false; this._showTrick('STREAK LOST', 0, false); }
      // Speed rounds don't take lives — the wipeout's lost seconds ARE the cost.
      // Neither do REVIEW words: they're deliberately harder and older, and
      // charging a life for meeting one would punish exactly the behaviour the
      // whole system exists to encourage.
      if (!this.challenge && !(this.currentQ && this.currentQ.review)) this.lives -= 1;
      this.player.wipeout();
      this.flash = 1; this.flashColor = '255,47,185';
      this.shake = 16;
      this.audio.wrong();
      // The MEOW lands a beat later, as he's actually falling — on top of the
      // buzzer it just sounds like noise.
      setTimeout(() => this.audio.meow(), 180);
      this._showTrick(this.currentQ && this.currentQ.review ? 'REPASO — sin castigo' : 'WIPEOUT!', 0, false);
      if (!this.challenge && this.lives <= 0) this._gameOver();
    }
    this._updateHud();
  }

  // Streak rewards. 3-in-a-row lights the cat ON FIRE — flames, a screen-edge
  // glow, a rising SFX and a Spanish announcer call. Later milestones escalate.
  _onStreak() {
    const c = this.combo;
    if (c < 3) return;
    this.fireBurst = 0.5;
    if (!this.onFire) {
      this.onFire = true;
      this.audio.announce('fuego');         // ¡Gato en fuego!
      this.audio.fireStinger();
      this._bannerFire('¡EN FUEGO!');
    } else if (c === 5) {
      this.audio.announce('increible');     // ¡Increíble!
      this.audio.fireStinger();
      this._bannerFire('¡INCREÍBLE!');
    } else if (c === 7 || (c > 7 && c % 3 === 1)) {
      this.audio.announce('imparable');     // ¡Imparable!
      this.audio.fireStinger();
      this._bannerFire('¡IMPARABLE!');
    }
    // A puff of embers off the rider on every on-fire answer (world levels
    // only — the half-pipe draws in screen space, so a world burst lands
    // somewhere meaningless).
    if (!this.hp) this.particles.burst(this.player.x, this.player.y, '#ff7a1a', 18);
  }

  _bannerFire(text) {
    const el = this.dom.fireBanner;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden', 'pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  _gameOver() {
    this.state = 'gameOver';
    this.audio.wrong();
    this.dom.overlayTag.textContent = '¡Te caíste!';
    this.dom.overlayBody.innerHTML =
      `<div class="big">OUT OF LIVES</div><p>You reached <span class="stat">${this.score}</span> points.</p>`;
    this.dom.overlayBtn.textContent = 'TRY AGAIN';
    this.dom.overlayHint.textContent = `Level ${this.level.id}: ${this.level.name}`;
    this.dom.hero.classList.add('hidden');
    this.dom.overlay.classList.remove('hidden');
    this.dom.hud.classList.add('hidden');
  }

  // THPS-style trick / bail callout.
  _showTrick(name, pts, good) {
    const el = this.dom.trickPopup;
    if (!el) return;
    el.innerHTML = `<span class="tname">${name}</span>` +
      (pts > 0 ? `<span class="tpts">+${pts}</span>` : '');
    el.classList.toggle('bad', !good);
    el.classList.remove('hidden', 'pop');
    void el.offsetWidth;          // restart the CSS animation
    el.classList.add('pop');
    clearTimeout(this._trickT);
    this._trickT = setTimeout(() => el.classList.add('hidden'), 1150);
  }

  _updateCamera(dt) {
    const p = this.player;
    // Freeze horizontal framing during a quiz so the bubbles hold still and
    // the cat visibly flies into them.
    const lead = this.quiz.active
      ? 0
      : Math.min(170, p.vx * 0.06 + Math.max(0, p.vx - this.level.speed) * 0.35);
    const targetX = this.quiz.active
      ? p.launchX - this.w * 0.30
      : p.x - this.w * 0.30 + lead;
    const baseView = BASE_Y - this.h * 0.72;
    const targetY = Math.min(baseView, p.y - this.h * 0.5);
    const targetZoom = this.quiz.active ? QUIZ_ZOOM : 1;   // bullet-time punch-in

    this.cam.x += (targetX - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (targetY - this.cam.y) * Math.min(1, dt * 8);
    this.cam.zoom += (targetZoom - this.cam.zoom) * Math.min(1, dt * 6);
  }

  // ------------------------------------------------------------- HUD
  _updateHud() {
    this.dom.hudLevel.textContent = `NIVEL ${this.level.id}`;
    this.dom.hudScore.textContent = this.score;
    const mult = Math.max(1, Math.min(this.combo, 5));
    this.dom.hudCombo.textContent = `x${mult}`;
    // A paw + the number: nine paws in a row would overflow the pill, and the
    // count is the point — the player needs to see how many lives remain.
    if (this.dom.hudLives) this.dom.hudLives.textContent = '🐾 ' + Math.max(0, this.lives);
    this.dom.progressFill.style.width = Math.min(100, this._progressPct() * 100) + '%';
    this._updateSentenceBar();
  }

  // Level progress 0..1. Drives the HUD bar AND the travelling backdrop — as
  // you clear the level, the scenery advances through the city's landmarks.
  // Spans EVERY sentence in a sentence level, not just the current one —
  // otherwise it resets to zero four times and reads as lost progress.
  _progressPct() {
    if (!this.level) return 0;
    if (this.challenge) {
      return this.challenge.goal ? Math.min(1, this.rushCount / this.challenge.goal) : 0;
    }
    if (this.sentenceMode) {
      const total = this.sentences.reduce((n, s) => n + s.words.length, 0);
      const done = this.sentences
        .slice(0, this.sentenceIdx)
        .reduce((n, s) => n + s.words.length, 0) + this.solved.size;
      return total ? Math.min(1, done / total) : 0;
    }
    return this.level.targetScore ? Math.min(1, this.score / this.level.targetScore) : 0;
  }

  _updateRushHud() {
    const bar = this.dom.sentenceBar;
    if (!bar || !this.challenge) return;
    bar.classList.remove('hidden');
    const t = Math.max(0, this.rushTime);
    const m = Math.floor(t / 60), sec = Math.floor(t % 60);
    // FLOW pips: bank three clean landings, the next launch runs in slow-mo
    // at double points. The bar is the player's own earned breathing room.
    const flow = this.hp
      ? `  <span class="sw ${this.hp.flow >= 3 ? 'done' : 'todo'}">FLOW ${'●'.repeat(this.hp.flow)}${'○'.repeat(Math.max(0, 3 - this.hp.flow))}</span>`
      : '';
    this.dom.sentenceWords.innerHTML =
      `<span class="sw done">✔ ${this.rushCount}/${this.challenge.goal}</span>` +
      `  <span class="sw ${t < 11 ? 'now' : 'todo'}">${m}:${String(sec).padStart(2, '0')}</span>` + flow;
    this.dom.sentenceEn.textContent = this.hp && this.hp.finale
      ? this.S().ultimoBanner
      : this.challenge.style === 'rings'
        ? 'FLY THE RINGS — BEAT THE CLOCK' : 'HALF-PIPE SPEED ROUND';
    this.dom.progressFill.style.width =
      Math.min(100, (this.rushCount / this.challenge.goal) * 100) + '%';
  }

  // Time ran out on a RETO — show the retry card (lives are irrelevant here).
  _timeUp() {
    this.state = 'gameOver';
    this.audio.wrong();
    this.dom.overlayTag.textContent = '¡SE ACABÓ EL TIEMPO!';
    this.dom.overlayBody.innerHTML =
      `<div class="big">${this.rushCount}/${this.challenge.goal}</div>` +
      `<p>Get <span class="stat">${this.challenge.goal}</span> right in ` +
      `<span class="stat">${this.challenge.time}s</span> to pass the reto.</p>`;
    this.dom.overlayBtn.textContent = 'TRY AGAIN';
    this.dom.overlayHint.textContent = `Level ${this.level.id}: ${this.level.name}`;
    this.dom.hero.classList.add('hidden');
    this.dom.overlay.classList.remove('hidden');
    this.dom.hud.classList.add('hidden');
    this.dom.prompt.classList.add('hidden');
  }

  // The sentence assembling live: solved words locked in, the current one
  // pulsing, the rest as blanks. This IS the lesson — keep it readable.
  _updateSentenceBar() {
    const bar = this.dom.sentenceBar;
    if (!bar) return;
    if (this.challenge) { this._updateRushHud(); return; }
    if (!this.sentenceMode) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    this.dom.sentenceWords.innerHTML = this.sentence.words
      .map((w, i) => {
        if (this.solved.has(i)) return `<span class="sw done">${w.es}</span>`;
        if (i === this.curSlot)  return `<span class="sw now">${'·'.repeat(Math.max(2, w.es.length))}</span>`;
        return `<span class="sw todo">${'·'.repeat(Math.max(2, w.es.length))}</span>`;
      })
      .join(' ');
    const n = this.sentences.length;
    this.dom.sentenceEn.textContent = n > 1
      ? `${this.sentence.en}   ·   ${this.sentenceIdx + 1} / ${n}`
      : this.sentence.en;
  }

  // ------------------------------------------------------------- music
  _showNowPlaying(title) {
    const el = this.dom.nowPlaying;
    if (!el) return;
    el.textContent = `♪ ${title}`;
    el.classList.remove('hidden', 'show');
    void el.offsetWidth;            // restart the CSS animation
    el.classList.add('show');
  }

  // Master sound toggle: music AND the synth SFX. Muting only the music still
  // left the game chirping on every launch, land and answer.
  setMuted(muted) {
    this.music.setMuted(muted);
    this.audio.muted = muted;
    if (this.dom.muteBtn) {
      this.dom.muteBtn.classList.toggle('off', muted);
      this.dom.muteBtn.textContent = muted ? '🔇' : '🔊';
      this.dom.muteBtn.title = muted ? 'Sound on (M)' : 'Sound off (M)';
    }
    return muted;
  }

  toggleMute() { return this.setMuted(!this.music.muted); }

  // Word-narration toggle (the announcer reading each Spanish answer aloud).
  // Separate from the master mute so a player can keep music + SFX but silence
  // the voice. The glyph stays the same; the .off class dims it.
  setNarrate(on) {
    const v = this.audio.setNarrate(on);
    if (this.dom.narrateBtn) {
      this.dom.narrateBtn.classList.toggle('off', !v);
      this.dom.narrateBtn.title = v ? 'Word voice: on (N)' : 'Word voice: off (N)';
    }
    return v;
  }
  toggleNarrate() { return this.setNarrate(!this.audio.narrate); }

  _popCombo() {
    this.dom.hudCombo.classList.add('pop');
    setTimeout(() => this.dom.hudCombo.classList.remove('pop'), 130);
  }

  // ------------------------------------------------------------- render
  render() {
    const slowmoAmount = this.state === 'playing' ? (1 - this.timeScale) / 0.85 : 0;
    this.renderer.frame({
      level: this.level || this.LEVELS[0],
      terrain: this.terrain,
      player: this.player,
      quiz: this.quiz,
      particles: this.particles,
      camera: this.cam,
      shake: this.shake,
      flash: this.flash,
      flashColor: this.flashColor,
      slowmoAmount: Math.max(0, Math.min(1, slowmoAmount)),
      onFire: this.onFire,
      fireBurst: Math.max(0, this.fireBurst),
      progress: this.state === 'playing' ? this._progressPct() : 0,
      hp: this.hp,
    });
  }
}
