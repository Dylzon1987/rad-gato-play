// ===========================================================================
// levels.js — the 22-level WORLD TOUR campaign, restructured around TRICK
// PROGRESSION and the HALF-PIPE CHALLENGE.
//
// Each sport is one country's arc:
//   vocab level    -> win a NEW TRICK
//   vocab level    -> win a NEW TRICK
//   sentence level -> win a NEW TRICK
//   RETO (60-second half-pipe speed round) -> win the NEXT SPORT
// (the jetpack finale's reto is a RING time-trial instead of a half-pipe).
//
// `trickTier` caps how fancy the tricks can get on that level (0-4); each
// level's `awardTrick` is the move you unlock by clearing it, so the arsenal
// visibly grows level by level instead of everything being available at once.
//
// Levels stay in ONE place; `bgs` segments move you through different parts of
// that same city as you progress. `bg` is only the emergency stand-in if a
// segment's art is missing. Challenge levels' half-pipe art ships separately
// (hp_* / rings_* keys) — until then they run on that city's existing art.
//
// Difficulty: answerTime 8.5s -> 6.4s across the tour; challenges are rapid
// (~3s windows, ramps close together, misses cost time, not lives).
// ===========================================================================

export const LEVELS = [
  // ==================== MEXICO — SKATEBOARD ================================
  {
    id: 1, name: 'CIUDAD DE MÉXICO', vehicle: 'skateboard', region: true,
    tiers: [1], choices: 3, speed: 440, answerTime: 8.5, targetScore: 2200,
    trickTier: 1, awardTrick: 'KICKFLIP',
    rampGap: 620, palette: 'sunset', bg: 'rooftop', bgs: ['cdmx_a', 'cdmx_b'],
    tone: 'cdmx', props: ['cone', 'tire', 'crate'], bridgeEvery: 3,
    kicker: 155, laneColor: '#ffd36e', laneGlow: '#ff2fb9',
  },
  {
    id: 2, name: 'SELVA MAYA', vehicle: 'skateboard', region: true,
    tiers: [1, 2], choices: 3, speed: 480, answerTime: 8.2, targetScore: 2800,
    trickTier: 2, awardTrick: '360 FLIP',
    rampGap: 580, palette: 'park', bg: 'canyon', bgs: ['selva_a', 'selva_b'],
    tone: 'selva', props: ['crate', 'hay', 'tire'], bridgeEvery: 2,
    kicker: 175, laneColor: '#b6ff2b', laneGlow: '#21e6ff',
  },
  {
    id: 3, name: 'TULUM', vehicle: 'skateboard', region: true,
    mode: 'sentence', sentences: [1, 0], choices: 3, speed: 500,
    answerTime: 8.0, trickTier: 3, awardTrick: 'BACKFLIP',
    rampGap: 600, palette: 'sunset', bg: 'rooftop', bgs: ['tulum_a', 'tulum_b'],
    tone: 'tulum', props: ['cone', 'tire', 'barrel'], bridgeEvery: 2,
    kicker: 180, laneColor: '#21e6ff', laneGlow: '#ffe11a',
  },
  {
    id: 4, name: 'RETO: HALF-PIPE CDMX', vehicle: 'skateboard', region: true,
    mode: 'challenge', challenge: { time: 60, goal: 8, style: 'halfpipe' },
    tiers: [1, 2], choices: 3, speed: 500, answerTime: 3.4, trickTier: 4,
    unlocks: 'bmx',
    rampGap: 430, palette: 'sunset', bg: 'cdmx_a', bgs: ['hp_cdmx'],
    tone: 'cdmx', props: ['cone', 'tire'], bridgeEvery: 99,
    kicker: 165, laneColor: '#ffd36e', laneGlow: '#ff2fb9',
  },

  // ==================== COLOMBIA — BMX =====================================
  {
    id: 5, name: 'CARTAGENA', vehicle: 'bmx', region: true,
    tiers: [2, 3], choices: 3, speed: 470, answerTime: 7.8, targetScore: 3200,
    trickTier: 1, awardTrick: 'TAILWHIP',
    rampGap: 630, palette: 'carnival', bg: 'carnival', bgs: ['cartagena_a', 'cartagena_b'],
    tone: 'cartagena', props: ['barrel', 'crate', 'cone'], bridgeEvery: 2,
    kicker: 185, laneColor: '#ff7a1a', laneGlow: '#ffe11a',
  },
  {
    id: 6, name: 'MEDELLÍN', vehicle: 'bmx', region: true,
    tiers: [2, 3, 4], choices: 3, speed: 490, answerTime: 7.6, targetScore: 3600,
    trickTier: 2, awardTrick: 'DOUBLE WHIP',
    rampGap: 610, palette: 'subway', bg: 'subway', bgs: ['medellin_a', 'medellin_b'],
    tone: 'medellin', props: ['cone', 'crate', 'tire'], bridgeEvery: 2,
    kicker: 190, laneColor: '#b6ff2b', laneGlow: '#ff2fb9',
  },
  {
    id: 7, name: 'SUNSET ROOFTOPS', vehicle: 'bmx',
    mode: 'sentence', sentences: [4, 5], choices: 3, speed: 500,
    answerTime: 7.4, trickTier: 3, awardTrick: 'SUPERMAN',
    rampGap: 600, palette: 'sunset', bg: 'rooftop',
    bridgeEvery: 2, kicker: 185, laneColor: '#ffd36e', laneGlow: '#ff2fb9',
  },
  {
    id: 8, name: 'RETO: HALF-PIPE CARTAGENA', vehicle: 'bmx', region: true,
    mode: 'challenge', challenge: { time: 60, goal: 9, style: 'halfpipe' },
    tiers: [2, 3], choices: 3, speed: 500, answerTime: 3.3, trickTier: 4,
    unlocks: 'rollerblades',
    rampGap: 430, palette: 'carnival', bg: 'cartagena_a', bgs: ['hp_cartagena'],
    tone: 'cartagena', props: ['cone', 'barrel'], bridgeEvery: 99,
    kicker: 170, laneColor: '#ff7a1a', laneGlow: '#ffe11a',
  },

  // ==================== ARGENTINA — ROLLERBLADES ===========================
  {
    id: 9, name: 'BUENOS AIRES', vehicle: 'rollerblades', region: true,
    tiers: [3, 4], choices: 3, speed: 550, answerTime: 7.2, targetScore: 4000,
    trickTier: 1, awardTrick: 'MUTE GRAB',
    rampGap: 500, palette: 'park', bg: 'neon_park', bgs: ['bsas_a', 'bsas_b'],
    tone: 'bsas', props: ['cone', 'barrel', 'tire'], bridgeEvery: 2,
    kicker: 180, laneColor: '#7ec8ff', laneGlow: '#ffe11a',
  },
  {
    id: 10, name: 'CATARATAS DEL IGUAZÚ', vehicle: 'rollerblades', region: true,
    tiers: [3, 4], choices: 3, speed: 570, answerTime: 7.0, targetScore: 4200,
    trickTier: 2, awardTrick: 'SOUL GRIND',
    rampGap: 490, palette: 'skycity', bg: 'skycity', bgs: ['iguazu_a', 'iguazu_b'],
    tone: 'iguazu', props: ['hay', 'crate', 'tire'], bridgeEvery: 2,
    kicker: 185, laneColor: '#21e6ff', laneGlow: '#b6ff2b',
  },
  {
    id: 11, name: 'EL GRAN DESAFÍO', vehicle: 'rollerblades',
    mode: 'sentence', sentences: [3, 2, 6, 7], choices: 3, speed: 590,
    answerTime: 6.9, trickTier: 3, awardTrick: 'MISTY FLIP',
    rampGap: 470, palette: 'arena', bg: 'arena',
    bridgeEvery: 1, kicker: 205, laneColor: '#ffd700', laneGlow: '#ff2fb9',
  },
  {
    id: 12, name: 'RETO: NEON PARK', vehicle: 'rollerblades',
    mode: 'challenge', challenge: { time: 60, goal: 10, style: 'halfpipe' },
    tiers: [3, 4], choices: 3, speed: 560, answerTime: 3.2, trickTier: 4,
    unlocks: 'pogo',
    rampGap: 420, palette: 'park', bg: 'neon_park',
    tone: 'neon_park', props: ['cone', 'tire'], bridgeEvery: 99,
    kicker: 170, laneColor: '#3df0ff', laneGlow: '#ff2fb9',
  },

  // ==================== SPAIN — POGO STICK =================================
  {
    id: 13, name: 'RUNNING OF THE BULLS', vehicle: 'pogo', region: true,
    tiers: [3, 4], choices: 3, speed: 340, answerTime: 6.9, targetScore: 4200,
    trickTier: 1, awardTrick: 'SCISSOR KICK',
    rampGap: 700, palette: 'arena', bg: 'arena', bgs: ['pamplona_a', 'pamplona_b'],
    tone: 'pamplona', props: ['barrel', 'crate', 'hay'], bridgeEvery: 2,
    kicker: 150, laneColor: '#ff4040', laneGlow: '#fff6fb',
  },
  {
    id: 14, name: 'BARCELONA', vehicle: 'pogo', region: true,
    tiers: [4], choices: 3, speed: 350, answerTime: 6.8, targetScore: 4400,
    trickTier: 2, awardTrick: '360 SPIN',
    rampGap: 690, palette: 'skycity', bg: 'skycity', bgs: ['bcn_a', 'bcn_b'],
    tone: 'bcn', props: ['cone', 'crate', 'barrel'], bridgeEvery: 2,
    kicker: 150, laneColor: '#ffd36e', laneGlow: '#a12bff',
  },
  {
    id: 15, name: 'CARNAVAL DE NEÓN', vehicle: 'pogo',
    mode: 'sentence', sentences: [8, 9, 10, 11], choices: 3, speed: 330,
    answerTime: 6.7, trickTier: 3, awardTrick: 'POGO BACKFLIP',
    rampGap: 700, palette: 'carnival', bg: 'carnival',
    bridgeEvery: 2, kicker: 150, laneColor: '#ff2fb9', laneGlow: '#ffe11a',
  },
  {
    id: 16, name: 'RETO: HALF-PIPE PAMPLONA', vehicle: 'pogo', region: true,
    mode: 'challenge', challenge: { time: 60, goal: 10, style: 'halfpipe' },
    tiers: [3, 4], choices: 3, speed: 360, answerTime: 3.1, trickTier: 4,
    unlocks: 'dirtbike',
    rampGap: 460, palette: 'arena', bg: 'pamplona_b', bgs: ['hp_pamplona'],
    tone: 'pamplona', props: ['barrel', 'hay'], bridgeEvery: 99,
    kicker: 160, laneColor: '#ff4040', laneGlow: '#fff6fb',
  },

  // ==================== PERU — DIRTBIKE ====================================
  {
    id: 17, name: 'MACHU PICCHU', vehicle: 'dirtbike', region: true,
    tiers: [4, 5], choices: 3, speed: 620, answerTime: 6.6, targetScore: 4600,
    trickTier: 2, awardTrick: 'SUPERMAN',
    rampGap: 760, palette: 'canyon', bg: 'canyon', bgs: ['machu_a', 'machu_b'],
    tone: 'machu', props: ['hay', 'crate', 'tire'], bridgeEvery: 2,
    kicker: 210, laneColor: '#b6ff2b', laneGlow: '#ffe11a',
  },
  {
    id: 18, name: 'CAÑÓN DEL DIABLO', vehicle: 'dirtbike',
    tiers: [3, 4, 5], choices: 3, speed: 640, answerTime: 6.5, targetScore: 5000,
    trickTier: 3, awardTrick: 'DOUBLE BACKFLIP',
    rampGap: 760, palette: 'canyon', bg: 'canyon', bridgeEvery: 2,
    kicker: 215, laneColor: '#ff7a1a', laneGlow: '#ffe11a',
  },
  {
    id: 19, name: 'RETO: HALF-PIPE MACHU PICCHU', vehicle: 'dirtbike', region: true,
    mode: 'challenge', challenge: { time: 60, goal: 11, style: 'halfpipe' },
    tiers: [4, 5], choices: 3, speed: 600, answerTime: 3.0, trickTier: 4,
    unlocks: 'jetpack',
    rampGap: 460, palette: 'canyon', bg: 'machu_a', bgs: ['hp_machu'],
    tone: 'machu', props: ['hay', 'tire'], bridgeEvery: 99,
    kicker: 180, laneColor: '#b6ff2b', laneGlow: '#ffe11a',
  },

  // ==================== CUBA & THE SKY — JETPACK ===========================
  {
    id: 20, name: 'LA HABANA', vehicle: 'jetpack', region: true,
    tiers: [4, 5], choices: 3, speed: 500, answerTime: 6.5, targetScore: 4800,
    trickTier: 1, awardTrick: 'BARREL ROLL',
    rampGap: 720, palette: 'carnival', bg: 'carnival', bgs: ['havana_a', 'havana_b'],
    tone: 'havana', props: ['cone', 'barrel', 'crate'], bridgeEvery: 3,
    kicker: 170, laneColor: '#ff9a5c', laneGlow: '#21e6ff',
  },
  {
    id: 21, name: 'SOBRE LAS NUBES', vehicle: 'jetpack',
    mode: 'sentence', sentences: [12, 13, 14, 15], choices: 3, speed: 520,
    answerTime: 6.4, trickTier: 2, awardTrick: 'LOOP-THE-LOOP',
    rampGap: 720, palette: 'skycity', bg: 'skycity',
    bridgeEvery: 3, kicker: 170, laneColor: '#21e6ff', laneGlow: '#ff2fb9',
  },
  {
    id: 22, name: 'RETO FINAL: ANILLOS DE IGUAZÚ', vehicle: 'jetpack', region: true,
    mode: 'challenge', challenge: { time: 60, goal: 12, style: 'rings' },
    tiers: [4, 5], choices: 3, speed: 540, answerTime: 2.9, trickTier: 4,
    rampGap: 450, palette: 'skycity', bg: 'iguazu_b', bgs: ['rings_iguazu'],
    tone: 'iguazu', props: ['hay', 'tire'], bridgeEvery: 99,
    kicker: 175, laneColor: '#21e6ff', laneGlow: '#b6ff2b',
  },
];

// Background color themes per level (kept for compatibility; the photographic
// backdrops carry the look now).
export const PALETTES = {
  sunset: {
    skyTop: '#5a0f52', skyBot: '#ff2fb9',
    grid: 'rgba(33,230,255,0.18)', sun: '#ffe11a',
    hills: ['#7d1170', '#a3178f'],
  },
  park: {
    skyTop: '#12103f', skyBot: '#2b6bff',
    grid: 'rgba(182,255,43,0.18)', sun: '#21e6ff',
    hills: ['#1c2a6b', '#3d2f8f'],
  },
  downtown: {
    skyTop: '#3a0a2a', skyBot: '#a12bff',
    grid: 'rgba(255,225,26,0.16)', sun: '#ff7a1a',
    hills: ['#2a0a3f', '#5a1170'],
  },
  tokyo: {
    skyTop: '#1a0630', skyBot: '#ff2fb9',
    grid: 'rgba(33,230,255,0.20)', sun: '#ff4fd8',
    hills: ['#2b0b4f', '#5c1180'],
  },
  subway: {
    skyTop: '#04140c', skyBot: '#0f5c3a',
    grid: 'rgba(182,255,43,0.20)', sun: '#b6ff2b',
    hills: ['#07281a', '#0d4630'],
  },
  canyon: {
    skyTop: '#3a0a12', skyBot: '#ff7a1a',
    grid: 'rgba(255,225,26,0.18)', sun: '#ff7a1a',
    hills: ['#4a1010', '#8a2a12'],
  },
  skycity: {
    skyTop: '#050a2e', skyBot: '#21e6ff',
    grid: 'rgba(33,230,255,0.20)', sun: '#21e6ff',
    hills: ['#0a1046', '#141f7a'],
  },
  carnival: {
    skyTop: '#1a0333', skyBot: '#ff2fb9',
    grid: 'rgba(255,225,26,0.20)', sun: '#ffe11a',
    hills: ['#2d0846', '#6b0f5e'],
  },
  arena: {
    skyTop: '#2a0518', skyBot: '#ffd700',
    grid: 'rgba(255,215,0,0.18)', sun: '#ffd700',
    hills: ['#3d0a24', '#7a1046'],
  },
};

export function getLevel(index) {
  return LEVELS[Math.min(index, LEVELS.length - 1)];
}
