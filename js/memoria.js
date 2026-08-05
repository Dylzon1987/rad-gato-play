// ===========================================================================
// memoria.js — the game's MEMORY of you.
//
// Every answer updates a per-word record; the record decides three things:
//   1. WHEN the word comes back (a real spaced-repetition schedule, on the
//      clock — forgetting isn't error-conditional, so review is scheduled for
//      every word, and mistakes only accelerate it)
//   2. HOW it comes back (see it -> hear it -> know what it means: the mode
//      escalates with the word's strength, so difficulty rises deliberately
//      instead of by dice roll)
//   3. WHICH wrong answers come with it (the distractor you actually fell for
//      last time is the discrimination you've demonstrably failed)
//
// Record: { s, r, w, L, due, aud, cf }
//   s   strength 0..4 (float). Fast-correct +1, slow-correct +0.5, wrong -2.
//   r/w right / wrong counts.  L  lesson index the word was taught in.
//   due epoch ms when it should next be seen.
//   aud times answered correctly in LISTENING mode (graduation requires one).
//   cf  { wrongWord: count } — confusion partners.
//
// Storage is per language: radgato.mem (es) / radgato.mem.it.
// ===========================================================================

const MIN = 60 * 1000, DAY = 24 * 60 * MIN;
// Interval by floor(strength). The first is deliberately short — a word you
// just fumbled should come back inside the same session.
const INTERVALS = [10 * MIN, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
const GRADUATED = 4;

export class Memoria {
  constructor(lang = 'es') {
    this.setLang(lang);
  }

  setLang(lang) {
    this.lang = lang;
    this.key = lang === 'es' ? 'radgato.mem' : `radgato.mem.${lang}`;
    try {
      this.data = JSON.parse(localStorage.getItem(this.key) || '{}');
    } catch { this.data = {}; }
  }

  get(es) { return this.data[es] || null; }

  _save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); }
      catch { /* private mode / quota — memory still works this session */ }
    }, 700);
  }

  /**
   * Fold one answer into the record.
   * @param {string} es      the target-language word (always, whatever the mode showed)
   * @param {object} o       { correct, fast, lesson, mode, picked }
   */
  record(es, o = {}) {
    if (!es) return;
    const rec = this.data[es] || (this.data[es] = { s: 0, r: 0, w: 0, L: o.lesson ?? 0, due: 0, aud: 0, cf: {} });
    if (o.lesson != null && rec.L == null) rec.L = o.lesson;
    if (o.correct) {
      rec.r++;
      // Latency matters: a slow correct in a 3-choice question is a shaky
      // word wearing a right answer, so it earns half credit.
      rec.s = Math.min(GRADUATED, rec.s + (o.fast ? 1 : 0.5));
      if (o.mode === 'audio') rec.aud++;
    } else {
      rec.w++;
      rec.s = Math.max(0, rec.s - 2);
      if (o.picked) rec.cf[o.picked] = (rec.cf[o.picked] || 0) + 1;
    }
    rec.due = Date.now() + INTERVALS[Math.max(0, Math.min(INTERVALS.length - 1, Math.floor(rec.s)))];
    this._save();
  }

  // A word is done when it's strong AND has survived at least one listening
  // question — reading it is not the same as knowing it.
  isGraduated(es) {
    const r = this.data[es];
    return !!r && r.s >= GRADUATED && r.aud > 0;
  }

  // Has this word ever been missed? (drives the study-card warning)
  isShaky(es) {
    const r = this.data[es];
    return !!r && r.w > 0 && r.s < 3;
  }

  /**
   * Words owed a review right now, best-first. Excludes the lesson currently
   * being taught (that one's already in front of you).
   * Falls back to the weakest words when nothing is technically due yet — a
   * brand-new player has no due dates, and review shouldn't sit idle for a day.
   */
  dueWords(excludeLesson, limit = 40) {
    const now = Date.now();
    const all = Object.entries(this.data)
      .filter(([, r]) => r.L !== excludeLesson && !(r.s >= GRADUATED && r.aud > 0));
    const due = all.filter(([, r]) => r.due <= now);
    const pool = due.length ? due : all.filter(([, r]) => r.s < 3);
    return pool
      .sort((a, b) => (a[1].s - b[1].s) || (a[1].due - b[1].due))
      .slice(0, limit)
      .map(([es, r]) => ({ es, rec: r }));
  }

  /**
   * The question mode this word has earned. Deliberate escalation:
   *   new/shaky -> read it (en)      : build the form-meaning link
   *   settling  -> hear it (audio)   : the skill reading can never teach
   *   solid     -> mean it (rev)     : recall meaning from the foreign form
   * `allowAudio` is false when the device is muted or the clip is missing —
   * a listening question you cannot hear is a coin flip that costs a life.
   */
  modeFor(es, allowAudio, i = 0) {
    const r = this.data[es];
    const s = r ? r.s : 0;
    if (s < 1) return 'en';
    if (s < 2.5) return allowAudio ? 'audio' : 'en';
    // Solid words are mostly LISTENING with an occasional meaning check:
    // reverse is the easiest direction and the most cognate-guessable, so it
    // stays a garnish (~1 in 4 of these) rather than a staple.
    if (!allowAudio) return (r && r.r > 0 && i % 4 === 3) ? 'rev' : 'en';
    return i % 4 === 3 ? 'rev' : 'audio';
  }

  // The distractor this learner actually fell for, if any.
  topConfusion(es) {
    const r = this.data[es];
    if (!r || !r.cf) return null;
    let best = null, n = 0;
    for (const [k, v] of Object.entries(r.cf)) if (v > n) { n = v; best = k; }
    return best;
  }

  // For the passport / progress readouts.
  stats() {
    const vals = Object.values(this.data);
    return {
      seen: vals.length,
      strong: vals.filter((r) => r.s >= GRADUATED && r.aud > 0).length,
      shaky: vals.filter((r) => r.w > 0 && r.s < 3).length,
    };
  }
}
