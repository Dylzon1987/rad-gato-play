// ===========================================================================
// words.js — the Spanish vocabulary bank + quiz generation.
//
// Words are grouped by theme and difficulty tier (1 = easiest). A level pulls
// from a set of tiers, so early levels only draw easy words and later levels
// mix in harder ones. Distractors (wrong choices) are pulled from the same
// tier band so wrong answers stay plausible — that's what makes it a real quiz.
// ===========================================================================

// { en, es, tier, theme }
// NOTE: 'gato' and 'agua' are deliberately NOT here — too easy for a standalone
// vocab round. They still appear inside SENTENCES, which carry their own words.
export const WORDS = [
  // --- Tier 1: colors -------------------------------------------------------
  { en: 'red',    es: 'rojo',    tier: 1, theme: 'colors' },
  { en: 'blue',   es: 'azul',    tier: 1, theme: 'colors' },
  { en: 'green',  es: 'verde',   tier: 1, theme: 'colors' },
  { en: 'yellow', es: 'amarillo',tier: 1, theme: 'colors' },
  { en: 'black',  es: 'negro',   tier: 1, theme: 'colors' },
  { en: 'white',  es: 'blanco',  tier: 1, theme: 'colors' },
  { en: 'pink',   es: 'rosa',    tier: 1, theme: 'colors' },
  { en: 'orange', es: 'naranja', tier: 1, theme: 'colors' },

  // --- Tier 1: numbers ------------------------------------------------------
  { en: 'one',    es: 'uno',     tier: 1, theme: 'numbers' },
  { en: 'two',    es: 'dos',     tier: 1, theme: 'numbers' },
  { en: 'three',  es: 'tres',    tier: 1, theme: 'numbers' },
  { en: 'four',   es: 'cuatro',  tier: 1, theme: 'numbers' },
  { en: 'five',   es: 'cinco',   tier: 1, theme: 'numbers' },
  { en: 'six',    es: 'seis',    tier: 1, theme: 'numbers' },

  // --- Tier 2: animals ------------------------------------------------------
  { en: 'dog',    es: 'perro',   tier: 2, theme: 'animals' },
  { en: 'bird',   es: 'pájaro',  tier: 2, theme: 'animals' },
  { en: 'fish',   es: 'pez',     tier: 2, theme: 'animals' },
  { en: 'horse',  es: 'caballo', tier: 2, theme: 'animals' },
  { en: 'cow',    es: 'vaca',    tier: 2, theme: 'animals' },
  { en: 'duck',   es: 'pato',    tier: 2, theme: 'animals' },
  { en: 'mouse',  es: 'ratón',   tier: 2, theme: 'animals' },

  // --- Tier 2: food ---------------------------------------------------------
  { en: 'bread',  es: 'pan',     tier: 2, theme: 'food' },
  { en: 'milk',   es: 'leche',   tier: 2, theme: 'food' },
  { en: 'apple',  es: 'manzana', tier: 2, theme: 'food' },
  { en: 'egg',    es: 'huevo',   tier: 2, theme: 'food' },
  { en: 'cheese', es: 'queso',   tier: 2, theme: 'food' },

  // --- Tier 3: everyday -----------------------------------------------------
  { en: 'house',  es: 'casa',    tier: 3, theme: 'things' },
  { en: 'sun',    es: 'sol',     tier: 3, theme: 'things' },
  { en: 'moon',   es: 'luna',    tier: 3, theme: 'things' },
  { en: 'street', es: 'calle',   tier: 3, theme: 'things' },
  { en: 'friend', es: 'amigo',   tier: 3, theme: 'things' },
  { en: 'school', es: 'escuela', tier: 3, theme: 'things' },
  { en: 'book',   es: 'libro',   tier: 3, theme: 'things' },
  { en: 'day',    es: 'día',     tier: 3, theme: 'things' },

  // --- Tier 3: verbs --------------------------------------------------------
  { en: 'to run',   es: 'correr', tier: 3, theme: 'verbs' },
  { en: 'to jump',  es: 'saltar', tier: 3, theme: 'verbs' },
  { en: 'to eat',   es: 'comer',  tier: 3, theme: 'verbs' },
  { en: 'to speak', es: 'hablar', tier: 3, theme: 'verbs' },

  // --- Tier 4: describing words (BMX / blade levels) ------------------------
  { en: 'fast',   es: 'rápido',  tier: 4, theme: 'describe' },
  { en: 'slow',   es: 'lento',   tier: 4, theme: 'describe' },
  { en: 'big',    es: 'grande',  tier: 4, theme: 'describe' },
  { en: 'small',  es: 'pequeño', tier: 4, theme: 'describe' },
  { en: 'high',   es: 'alto',    tier: 4, theme: 'describe' },
  { en: 'low',    es: 'bajo',    tier: 4, theme: 'describe' },
  { en: 'strong', es: 'fuerte',  tier: 4, theme: 'describe' },
  { en: 'happy',  es: 'feliz',   tier: 4, theme: 'describe' },

  // --- Tier 4: places & time ------------------------------------------------
  { en: 'city',      es: 'ciudad',  tier: 4, theme: 'places' },
  { en: 'park',      es: 'parque',  tier: 4, theme: 'places' },
  { en: 'beach',     es: 'playa',   tier: 4, theme: 'places' },
  { en: 'mountain',  es: 'montaña', tier: 4, theme: 'places' },
  { en: 'night',     es: 'noche',   tier: 4, theme: 'places' },
  { en: 'morning',   es: 'mañana',  tier: 4, theme: 'places' },

  // --- Tier 5: action verbs (finale) ---------------------------------------
  { en: 'to fly',    es: 'volar',    tier: 5, theme: 'verbs2' },
  { en: 'to fall',   es: 'caer',     tier: 5, theme: 'verbs2' },
  { en: 'to win',    es: 'ganar',    tier: 5, theme: 'verbs2' },
  { en: 'to learn',  es: 'aprender', tier: 5, theme: 'verbs2' },
  { en: 'to speak',  es: 'decir',    tier: 5, theme: 'verbs2' },
  { en: 'to live',   es: 'vivir',    tier: 5, theme: 'verbs2' },
];

// ===========================================================================
// SENTENCES — the "hard" levels. Instead of isolated words, a whole Spanish
// sentence is assembled ONE WORD AT A TIME across the level: each ramp asks
// for the next word in order, and the sentence builds up in the HUD. Clear the
// last word and you've genuinely learned a full, usable sentence.
//
// Each slot carries its own `wrong` list so the distractors are grammatically
// tempting (right part of speech, wrong meaning) rather than random noise.
// ===========================================================================
export const SENTENCES = [
  {
    en: 'The red cat jumps very high',
    words: [
      { es: 'El',    en: 'The',   wrong: ['La', 'Los', 'Un'] },
      { es: 'gato',  en: 'cat',   wrong: ['perro', 'pájaro', 'ratón'] },
      { es: 'rojo',  en: 'red',   wrong: ['azul', 'verde', 'negro'] },
      { es: 'salta', en: 'jumps', wrong: ['corre', 'come', 'habla'] },
      { es: 'muy',   en: 'very',  wrong: ['más', 'poco', 'bien'] },
      { es: 'alto',  en: 'high',  wrong: ['bajo', 'lento', 'grande'] },
    ],
  },
  {
    en: 'I want to eat an apple',
    words: [
      { es: 'Yo',      en: 'I',      wrong: ['Tú', 'Él', 'Ella'] },
      { es: 'quiero',  en: 'want',   wrong: ['tengo', 'puedo', 'voy'] },
      { es: 'comer',   en: 'to eat', wrong: ['beber', 'correr', 'hablar'] },
      { es: 'una',     en: 'an',     wrong: ['un', 'la', 'el'] },
      { es: 'manzana', en: 'apple',  wrong: ['naranja', 'queso', 'leche'] },
    ],
  },
  {
    en: 'My friend runs in the street at night',
    words: [
      { es: 'Mi',     en: 'My',     wrong: ['Tu', 'Su', 'El'] },
      { es: 'amigo',  en: 'friend', wrong: ['perro', 'gato', 'libro'] },
      { es: 'corre',  en: 'runs',   wrong: ['salta', 'come', 'vive'] },
      { es: 'en',     en: 'in',     wrong: ['con', 'por', 'de'] },
      { es: 'la',     en: 'the',    wrong: ['el', 'los', 'un'] },
      { es: 'calle',  en: 'street', wrong: ['casa', 'escuela', 'playa'] },
      { es: 'de',     en: 'at',     wrong: ['en', 'a', 'con'] },
      { es: 'noche',  en: 'night',  wrong: ['mañana', 'día', 'sol'] },
    ],
  },
  {
    en: 'Today I am going to learn to fly very fast',
    words: [
      { es: 'Hoy',      en: 'Today',    wrong: ['Ayer', 'Nunca', 'Siempre'] },
      { es: 'voy',      en: 'I am going',wrong: ['tengo', 'quiero', 'puedo'] },
      { es: 'a',        en: 'to',       wrong: ['de', 'en', 'con'] },
      { es: 'aprender', en: 'learn',    wrong: ['ganar', 'vivir', 'decir'] },
      { es: 'a',        en: 'to',       wrong: ['el', 'la', 'un'] },
      { es: 'volar',    en: 'fly',      wrong: ['caer', 'correr', 'comer'] },
      { es: 'muy',      en: 'very',     wrong: ['poco', 'más', 'bien'] },
      { es: 'rápido',   en: 'fast',     wrong: ['lento', 'alto', 'fuerte'] },
    ],
  },
  {
    en: 'The dog drinks water in the house',
    words: [
      { es: 'El',     en: 'The',    wrong: ['La', 'Los', 'Un'] },
      { es: 'perro',  en: 'dog',    wrong: ['gato', 'pájaro', 'pez'] },
      { es: 'bebe',   en: 'drinks', wrong: ['come', 'corre', 'duerme'] },
      { es: 'agua',   en: 'water',  wrong: ['leche', 'pan', 'queso'] },
      { es: 'en',     en: 'in',     wrong: ['con', 'de', 'por'] },
      { es: 'la',     en: 'the',    wrong: ['el', 'los', 'un'] },
      { es: 'casa',   en: 'house',  wrong: ['calle', 'escuela', 'playa'] },
    ],
  },
  {
    en: 'My sister reads a green book',
    words: [
      { es: 'Mi',      en: 'My',    wrong: ['Tu', 'Su', 'La'] },
      { es: 'hermana', en: 'sister',wrong: ['amiga', 'madre', 'maestra'] },
      { es: 'lee',     en: 'reads', wrong: ['escribe', 'habla', 'canta'] },
      { es: 'un',      en: 'a',     wrong: ['una', 'el', 'la'] },
      { es: 'libro',   en: 'book',  wrong: ['papel', 'lápiz', 'mapa'] },
      { es: 'verde',   en: 'green', wrong: ['rojo', 'azul', 'negro'] },
    ],
  },
  {
    en: 'We always eat bread with cheese and milk',
    words: [
      { es: 'Nosotros', en: 'We',     wrong: ['Ellos', 'Ustedes', 'Yo'] },
      { es: 'siempre',  en: 'always', wrong: ['nunca', 'ayer', 'hoy'] },
      { es: 'comemos',  en: 'eat',    wrong: ['bebemos', 'corremos', 'vivimos'] },
      { es: 'pan',      en: 'bread',  wrong: ['queso', 'agua', 'carne'] },
      { es: 'con',      en: 'with',   wrong: ['sin', 'de', 'en'] },
      { es: 'queso',    en: 'cheese', wrong: ['pan', 'leche', 'fruta'] },
      { es: 'y',        en: 'and',    wrong: ['o', 'pero', 'que'] },
      { es: 'leche',    en: 'milk',   wrong: ['agua', 'jugo', 'café'] },
    ],
  },
  {
    en: 'Tomorrow my friends are going to swim in the sea',
    words: [
      { es: 'Mañana', en: 'Tomorrow',    wrong: ['Ayer', 'Hoy', 'Ahora'] },
      { es: 'mis',    en: 'my',          wrong: ['sus', 'tus', 'los'] },
      { es: 'amigos', en: 'friends',     wrong: ['hermanos', 'gatos', 'vecinos'] },
      { es: 'van',    en: 'are going',   wrong: ['vamos', 'voy', 'vas'] },
      { es: 'a',      en: 'to',          wrong: ['de', 'en', 'con'] },
      { es: 'nadar',  en: 'swim',        wrong: ['volar', 'correr', 'saltar'] },
      { es: 'en',     en: 'in',          wrong: ['a', 'con', 'por'] },
      { es: 'el',     en: 'the',         wrong: ['la', 'los', 'un'] },
      { es: 'mar',    en: 'sea',         wrong: ['sol', 'río', 'cielo'] },
    ],
  },
  {
    en: 'The cat jumps higher than the moon',
    words: [
      { es: 'El',     en: 'The',    wrong: ['La', 'Los', 'Un'] },
      { es: 'gato',   en: 'cat',    wrong: ['perro', 'pájaro', 'pez'] },
      { es: 'salta',  en: 'jumps',  wrong: ['corre', 'nada', 'vuela'] },
      { es: 'más',    en: 'more',   wrong: ['muy', 'poco', 'tan'] },
      { es: 'alto',   en: 'high',   wrong: ['bajo', 'lento', 'fuerte'] },
      { es: 'que',    en: 'than',   wrong: ['de', 'con', 'por'] },
      { es: 'la',     en: 'the',    wrong: ['el', 'los', 'un'] },
      { es: 'luna',   en: 'moon',   wrong: ['sol', 'mar', 'calle'] },
    ],
  },
  {
    en: 'I can fly when I am happy',
    words: [
      { es: 'Yo',      en: 'I',      wrong: ['Tú', 'Él', 'Ella'] },
      { es: 'puedo',   en: 'can',    wrong: ['quiero', 'tengo', 'voy'] },
      { es: 'volar',   en: 'fly',    wrong: ['nadar', 'correr', 'saltar'] },
      { es: 'cuando',  en: 'when',   wrong: ['donde', 'porque', 'como'] },
      { es: 'estoy',   en: 'I am',   wrong: ['soy', 'está', 'eres'] },
      { es: 'feliz',   en: 'happy',  wrong: ['triste', 'rápido', 'grande'] },
    ],
  },
  {
    en: 'Today we are going to win the big race',
    words: [
      { es: 'Hoy',       en: 'Today',       wrong: ['Ayer', 'Mañana', 'Nunca'] },
      { es: 'vamos',     en: 'we are going',wrong: ['voy', 'van', 'vas'] },
      { es: 'a',         en: 'to',          wrong: ['de', 'en', 'con'] },
      { es: 'ganar',     en: 'win',         wrong: ['perder', 'jugar', 'correr'] },
      { es: 'la',        en: 'the',         wrong: ['el', 'los', 'un'] },
      { es: 'gran',      en: 'big',         wrong: ['poco', 'alta', 'nueva'] },
      { es: 'carrera',   en: 'race',        wrong: ['escuela', 'calle', 'fiesta'] },
    ],
  },
  {
    en: 'My friend and I always jump very high',
    words: [
      { es: 'Mi',       en: 'My',      wrong: ['Tu', 'Su', 'El'] },
      { es: 'amigo',    en: 'friend',  wrong: ['hermano', 'gato', 'perro'] },
      { es: 'y',        en: 'and',     wrong: ['o', 'pero', 'que'] },
      { es: 'yo',       en: 'I',       wrong: ['tú', 'él', 'ella'] },
      { es: 'siempre',  en: 'always',  wrong: ['nunca', 'hoy', 'ayer'] },
      { es: 'saltamos', en: 'jump',    wrong: ['corremos', 'comemos', 'vivimos'] },
      { es: 'muy',      en: 'very',    wrong: ['más', 'poco', 'tan'] },
      { es: 'alto',     en: 'high',    wrong: ['bajo', 'lento', 'fuerte'] },
    ],
  },
  {
    en: 'I am not afraid of the sky',
    words: [
      { es: 'Yo',      en: 'I',       wrong: ['Tú', 'Él', 'Ella'] },
      { es: 'no',      en: 'not',     wrong: ['sí', 'ni', 'nunca'] },
      { es: 'tengo',   en: 'have',    wrong: ['soy', 'estoy', 'voy'] },
      { es: 'miedo',   en: 'fear',    wrong: ['sueño', 'hambre', 'frío'] },
      { es: 'del',     en: 'of the',  wrong: ['al', 'en', 'con'] },
      { es: 'cielo',   en: 'sky',     wrong: ['mar', 'sol', 'río'] },
    ],
  },
  {
    en: 'The city is very beautiful at night',
    words: [
      { es: 'La',      en: 'The',      wrong: ['El', 'Los', 'Un'] },
      { es: 'ciudad',  en: 'city',     wrong: ['casa', 'calle', 'playa'] },
      { es: 'es',      en: 'is',       wrong: ['está', 'son', 'era'] },
      { es: 'muy',     en: 'very',     wrong: ['más', 'poco', 'tan'] },
      { es: 'bonita',  en: 'beautiful',wrong: ['fea', 'grande', 'rápida'] },
      { es: 'de',      en: 'at',       wrong: ['en', 'a', 'con'] },
      { es: 'noche',   en: 'night',    wrong: ['día', 'mañana', 'tarde'] },
    ],
  },
  {
    en: 'We are flying over the clouds together',
    words: [
      { es: 'Estamos', en: 'We are',   wrong: ['Somos', 'Están', 'Estoy'] },
      { es: 'volando', en: 'flying',   wrong: ['corriendo', 'nadando', 'saltando'] },
      { es: 'sobre',   en: 'over',     wrong: ['bajo', 'entre', 'desde'] },
      { es: 'las',     en: 'the',      wrong: ['los', 'la', 'unas'] },
      { es: 'nubes',   en: 'clouds',   wrong: ['estrellas', 'calles', 'olas'] },
      { es: 'juntos',  en: 'together', wrong: ['solos', 'lejos', 'rápido'] },
    ],
  },
  {
    en: 'Now I know how to speak a new language',
    words: [
      { es: 'Ahora',   en: 'Now',      wrong: ['Ayer', 'Nunca', 'Luego'] },
      { es: 'yo',      en: 'I',        wrong: ['tú', 'él', 'ella'] },
      { es: 'sé',      en: 'know how', wrong: ['veo', 'digo', 'creo'] },
      { es: 'hablar',  en: 'to speak', wrong: ['comer', 'correr', 'volar'] },
      { es: 'un',      en: 'a',        wrong: ['una', 'el', 'la'] },
      { es: 'idioma',  en: 'language', wrong: ['libro', 'juego', 'camino'] },
      { es: 'nuevo',   en: 'new',      wrong: ['viejo', 'lento', 'pequeño'] },
    ],
  },
];

// Deterministic-ish shuffle helper (Fisher–Yates using Math.random).
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pool(tiers) {
  return WORDS.filter((w) => tiers.includes(w.tier));
}

/**
 * Build a single quiz question.
 * @param {number[]} tiers   difficulty tiers this level draws from
 * @param {number}   choices number of answer bubbles (incl. the correct one)
 * @param {Set}      recent  es-strings recently asked (to avoid repeats)
 * @returns {{ prompt, answer, options }}
 */
export function makeQuestion(tiers, choices, recent = new Set()) {
  const candidates = pool(tiers);
  const fresh = candidates.filter((w) => !recent.has(w.es));
  const bank = fresh.length >= 1 ? fresh : candidates;

  const answer = bank[Math.floor(Math.random() * bank.length)];

  // Distractors: prefer same theme (more confusable), then anything in-tier.
  const sameTheme = candidates.filter(
    (w) => w.es !== answer.es && w.theme === answer.theme
  );
  const otherTier = candidates.filter(
    (w) => w.es !== answer.es && w.theme !== answer.theme
  );
  const distractors = shuffle(sameTheme)
    .concat(shuffle(otherTier))
    .slice(0, choices - 1);

  const options = shuffle([answer, ...distractors]).map((w) => ({
    es: w.es,
    correct: w.es === answer.es,
  }));

  return { prompt: answer.en, answer: answer.es, options };
}

/**
 * Build a question whose ANSWER is a specific word. Used to re-ask a word the
 * player just got wrong — but LATER in the level, not immediately (see the
 * deferral queue in game.js). Distractors are drawn the same way makeQuestion
 * does, so the retry looks like any other question.
 * @param {string}   es      the Spanish answer to force
 * @param {number[]} tiers   difficulty tiers this level draws from
 * @param {number}   choices number of answer bubbles
 */
export function makeQuestionForEs(es, tiers, choices) {
  const answer = WORDS.find((w) => w.es === es);
  if (!answer) return null;
  const candidates = pool(tiers.includes(answer.tier) ? tiers : [...tiers, answer.tier]);
  const sameTheme = candidates.filter((w) => w.es !== answer.es && w.theme === answer.theme);
  const otherTier = candidates.filter((w) => w.es !== answer.es && w.theme !== answer.theme);
  const distractors = shuffle(sameTheme).concat(shuffle(otherTier)).slice(0, choices - 1);
  const options = shuffle([answer, ...distractors]).map((w) => ({
    es: w.es, correct: w.es === answer.es,
  }));
  return { prompt: answer.en, answer: answer.es, options };
}

/**
 * Build a question in any RETRIEVAL MODE. The answer is always the
 * target-language word — only the presentation changes:
 *   'en'    prompt = English gloss,   bubbles = target words   (read it)
 *   'audio' prompt = a speaker,       bubbles = target words   (hear it)
 *   'rev'   prompt = the target word, bubbles = English glosses (mean it)
 *
 * @param {object}   answer      { es, en } the word being tested
 * @param {object[]} distractors candidate wrong words (already chosen by the
 *                               caller, which knows the learner's history)
 * @param {number}   choices     bubbles on screen
 * @param {string}   mode        'en' | 'audio' | 'rev'
 */
export function buildQuestion(answer, distractors, choices, mode = 'en') {
  const rev = mode === 'rev';
  // In reverse mode the bubbles read in ENGLISH, so they have to be
  // distinguishable AS English — two options glossed "to leave" is not a
  // question, it's a trap. Dedupe on the visible text, prefer short glosses
  // (three long phrases can't be read in a half-second glance mid-air).
  const seen = new Set([rev ? answer.en.toLowerCase() : answer.es.toLowerCase()]);
  const picked = [];
  const ranked = rev ? [...distractors].sort((a, b) => a.en.length - b.en.length) : distractors;
  for (const w of ranked) {
    const text = (rev ? w.en : w.es).toLowerCase();
    if (seen.has(text)) continue;
    seen.add(text);
    picked.push(w);
    if (picked.length >= choices - 1) break;
  }
  const options = shuffle([answer, ...picked]).map((w) => ({
    es: rev ? w.en : w.es,        // what the bubble SHOWS
    correct: w.es === answer.es,
    tag: rev,                     // English options draw as tags, not circles
  }));
  return {
    prompt: mode === 'audio' ? '' : (rev ? answer.es : answer.en),
    answer: answer.es,            // ALWAYS the target word (VO + memory)
    options, mode,
  };
}

/**
 * Lesson-based question: the pool is the level's own 10 curriculum words, so
 * every distractor is theme-matched by construction (they were authored as one
 * themed set). This is the 100-level campaign's question maker; the tier-based
 * makeQuestion above stays as the fallback.
 */
export function makeLessonQuestion(lesson, choices, recent = new Set()) {
  const bank0 = lesson.words;
  const fresh = bank0.filter((w) => !recent.has(w.es));
  const bank = fresh.length ? fresh : bank0;
  const answer = bank[Math.floor(Math.random() * bank.length)];
  const distractors = shuffle(bank0.filter((w) => w.es !== answer.es)).slice(0, choices - 1);
  const options = shuffle([answer, ...distractors]).map((w) => ({
    es: w.es, correct: w.es === answer.es,
  }));
  return { prompt: answer.en, answer: answer.es, options };
}

/** Lesson-based re-ask of a specific missed word. */
export function makeLessonQuestionForEs(es, lesson, choices) {
  const answer = lesson.words.find((w) => w.es === es);
  if (!answer) return null;
  const distractors = shuffle(lesson.words.filter((w) => w.es !== es)).slice(0, choices - 1);
  const options = shuffle([answer, ...distractors]).map((w) => ({
    es: w.es, correct: w.es === answer.es,
  }));
  return { prompt: answer.en, answer: answer.es, options };
}

// Rough Spanish syllable count: number of vowel GROUPS. Good enough to tell the
// narrator which words are worth speaking — the ask is "2+ syllables", so
// one-syllable function words (y, de, un, no, sol…) are skipped.
export function syllableCount(es) {
  if (!es) return 0;
  const groups = es.toLowerCase().match(/[aeiouáéíóúüy]+/g);
  return groups ? groups.length : 0;
}

/**
 * Build the question for ONE slot of a sentence level.
 * @param {object} sentence  an entry from SENTENCES
 * @param {number} slot      which word of the sentence we're asking for
 * @param {number} choices   number of answer bubbles
 * @returns {{ prompt, answer, options, slot, sentence }}
 */
export function makeSentenceQuestion(sentence, slot, choices) {
  const w = sentence.words[slot];
  const distractors = shuffle(w.wrong).slice(0, Math.max(1, choices - 1));
  const options = shuffle([w.es, ...distractors]).map((es) => ({
    es,
    correct: es === w.es,
  }));
  return { prompt: w.en, answer: w.es, options, slot, sentence };
}

/** Pick the sentence a level should teach (levels name it by index). */
export function getSentence(index) {
  return SENTENCES[Math.min(index, SENTENCES.length - 1)];
}
