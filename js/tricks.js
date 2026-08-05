// ===========================================================================
// tricks.js — real skateboarding / BMX / blading tricks, THPS-style.
//
// On a correct answer the cat pops a trick. The trick chosen scales with the
// current combo, so a hot streak escalates from a kickflip up to a 900. Each
// trick defines how many rotations the sprite spins and which way, plus a
// score bonus that stacks on top of the base word points.
//
//   rot  = number of full rotations in the air (visual spin)
//   dir  = +1 / -1 spin direction
//   flip = 'board' (kick/heel/shove style) or 'body' (flip/spin)
//   bonus= extra points for landing the trick
//   anim = which sprite sheet plays it (see VEHICLE_SPRITES in render.js).
//
// Every sport has THREE sheets, and pickTrick only ever samples the top two
// unlocked tiers — so each TIER (not just each list) mixes all three anims.
// Otherwise a whole stretch of a run replays one animation: before this,
// `bar` lived only in BMX tier 1 and every tier-4 trick in every sport used
// the same sheet.
// ===========================================================================

export const TRICKS = [
  // tier 0 — warm up
  { name: 'OLLIE',           tier: 0, rot: 0.5, dir: 1,  flip: 'board', bonus: 0,   anim: 'flip' },
  { name: 'NOLLIE',          tier: 0, rot: 0.5, dir: -1, flip: 'board', bonus: 0,   anim: 'flip' },

  // tier 1 — the basics
  { name: 'KICKFLIP',        tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 50,  anim: 'flip' },
  { name: 'HEELFLIP',        tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 50,  anim: 'flip' },
  { name: 'POP SHOVE-IT',    tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 50,  anim: 'tre' },
  { name: 'INDY GRAB',       tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 55,  anim: 'christ' },

  // tier 2 — stepping up
  { name: '360 FLIP',        tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 120, anim: 'tre' },
  { name: 'VARIAL HEELFLIP', tier: 2, rot: 2,   dir: -1, flip: 'board', bonus: 120, anim: 'tre' },
  { name: 'VARIAL KICKFLIP', tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 115, anim: 'flip' },
  { name: 'BACKFLIP',        tier: 2, rot: 1,   dir: -1, flip: 'body',  bonus: 150, anim: 'christ' },
  { name: 'FRONTFLIP',       tier: 2, rot: 1,   dir: 1,  flip: 'body',  bonus: 150, anim: 'christ' },

  // tier 3 — pro
  { name: 'HARDFLIP',        tier: 3, rot: 2,   dir: 1,  flip: 'board', bonus: 220, anim: 'tre' },
  { name: 'LASER FLIP',      tier: 3, rot: 2,   dir: -1, flip: 'board', bonus: 230, anim: 'flip' },
  { name: '540 FLIP',        tier: 3, rot: 3,   dir: 1,  flip: 'body',  bonus: 260, anim: 'christ' },
  { name: 'IMPOSSIBLE',      tier: 3, rot: 2,   dir: -1, flip: 'board', bonus: 260, anim: 'tre' },

  // tier 4 — legendary
  { name: 'THE 900',         tier: 4, rot: 5,   dir: 1,  flip: 'body',  bonus: 500, anim: 'christ' },
  { name: 'TRE BOMB',        tier: 4, rot: 4,   dir: -1, flip: 'board', bonus: 400, anim: 'tre' },
  { name: 'CHRIST AIR',      tier: 4, rot: 3,   dir: 1,  flip: 'body',  bonus: 400, anim: 'christ' },
  { name: 'DOUBLE KICKFLIP', tier: 4, rot: 4,   dir: 1,  flip: 'board', bonus: 420, anim: 'flip' },

  // extra variety
  { name: 'FS BIGSPIN',      tier: 2, rot: 2,   dir: -1, flip: 'board', bonus: 125, anim: 'tre' },
  { name: 'BENIHANA',        tier: 3, rot: 1,   dir: 1,  flip: 'body',  bonus: 235, anim: 'christ' },
  { name: 'GAZELLE FLIP',    tier: 4, rot: 5,   dir: -1, flip: 'board', bonus: 460, anim: 'tre' },
];

// --- BMX: real park/street tricks ------------------------------------------
export const BMX_TRICKS = [
  { name: 'BUNNY HOP',    tier: 0, rot: 0.5, dir: 1,  flip: 'board', bonus: 0,   anim: 'whip' },
  { name: 'J-HOP',        tier: 0, rot: 0.5, dir: -1, flip: 'board', bonus: 0,   anim: 'bar' },

  { name: 'TAILWHIP',     tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 60,  anim: 'whip' },
  { name: 'BARSPIN',      tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 60,  anim: 'bar' },
  { name: 'X-UP',         tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 55,  anim: 'bar' },
  { name: 'ONE-HANDER',   tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 55,  anim: 'super' },

  { name: 'DOUBLE WHIP',  tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 140, anim: 'whip' },
  { name: 'TABLETOP',     tier: 2, rot: 1,   dir: -1, flip: 'board', bonus: 130, anim: 'whip' },
  { name: 'TURNDOWN',     tier: 2, rot: 1,   dir: -1, flip: 'board', bonus: 135, anim: 'bar' },
  { name: 'BACKFLIP',     tier: 2, rot: 1,   dir: -1, flip: 'body',  bonus: 170, anim: 'super' },

  { name: 'SUPERMAN',     tier: 3, rot: 1,   dir: 1,  flip: 'board', bonus: 240, anim: 'super' },
  { name: '360 TAILWHIP', tier: 3, rot: 2,   dir: 1,  flip: 'board', bonus: 260, anim: 'whip' },
  { name: '360 BARSPIN',  tier: 3, rot: 2,   dir: -1, flip: 'board', bonus: 255, anim: 'bar' },
  { name: 'FRONT FLIP',   tier: 3, rot: 1,   dir: 1,  flip: 'body',  bonus: 250, anim: 'super' },

  { name: 'FLAIR',        tier: 4, rot: 3,   dir: 1,  flip: 'body',  bonus: 480, anim: 'super' },
  { name: 'DOUBLE BACKFLIP', tier: 4, rot: 2, dir: -1, flip: 'body', bonus: 520, anim: 'super' },
  { name: 'SUPERMAN SEATGRAB', tier: 4, rot: 2, dir: 1, flip: 'board', bonus: 450, anim: 'super' },
  { name: 'TRIPLE WHIP',  tier: 4, rot: 3,   dir: 1,  flip: 'board', bonus: 470, anim: 'whip' },
  { name: 'BARSPIN FLAIR', tier: 4, rot: 3,  dir: -1, flip: 'body',  bonus: 540, anim: 'bar' },

  // extra variety
  { name: 'DECADE',       tier: 2, rot: 1,   dir: 1,  flip: 'body',  bonus: 150, anim: 'super' },
  { name: 'NOTHING',      tier: 3, rot: 1,   dir: -1, flip: 'board', bonus: 245, anim: 'super' },
  { name: '360 FLAIR',    tier: 4, rot: 3,   dir: 1,  flip: 'body',  bonus: 560, anim: 'whip' },
];

// --- Rollerblades: aggressive inline tricks ---------------------------------
export const BLADE_TRICKS = [
  { name: 'HOP',          tier: 0, rot: 0.5, dir: 1,  flip: 'board', bonus: 0,   anim: 'grab' },
  { name: 'STRIDE',       tier: 0, rot: 0.5, dir: -1, flip: 'board', bonus: 0,   anim: 'soul' },

  { name: 'MUTE GRAB',    tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 55,  anim: 'grab' },
  { name: 'SAFETY GRAB',  tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 55,  anim: 'grab' },
  { name: 'METHOD',       tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 60,  anim: 'soul' },
  { name: 'TOE GRAB',     tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 58,  anim: 'rocket' },

  { name: 'SOUL GRIND',   tier: 2, rot: 1,   dir: 1,  flip: 'board', bonus: 135, anim: 'soul' },
  { name: 'ROYALE',       tier: 2, rot: 1,   dir: -1, flip: 'board', bonus: 130, anim: 'soul' },
  { name: '360 MUTE',     tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 150, anim: 'grab' },
  { name: 'X-GRAB',       tier: 2, rot: 2,   dir: -1, flip: 'board', bonus: 145, anim: 'rocket' },

  { name: 'MISTY FLIP',   tier: 3, rot: 2,   dir: 1,  flip: 'body',  bonus: 250, anim: 'rocket' },
  { name: 'FISHBRAIN',    tier: 3, rot: 2,   dir: -1, flip: 'board', bonus: 230, anim: 'soul' },
  { name: '540 SOUL',     tier: 3, rot: 3,   dir: 1,  flip: 'board', bonus: 260, anim: 'soul' },
  { name: '540 MUTE',     tier: 3, rot: 3,   dir: -1, flip: 'board', bonus: 245, anim: 'grab' },

  { name: 'ROCKET AIR',   tier: 4, rot: 3,   dir: 1,  flip: 'body',  bonus: 460, anim: 'rocket' },
  { name: 'DOUBLE MISTY', tier: 4, rot: 4,   dir: -1, flip: 'body',  bonus: 520, anim: 'rocket' },
  { name: 'THE 1080',     tier: 4, rot: 6,   dir: 1,  flip: 'body',  bonus: 600, anim: 'rocket' },
  { name: 'TRUESPIN SOUL', tier: 4, rot: 3,  dir: -1, flip: 'board', bonus: 480, anim: 'soul' },
  { name: 'BIO 720',      tier: 4, rot: 4,   dir: 1,  flip: 'body',  bonus: 540, anim: 'grab' },

  // extra variety
  { name: 'TRUESPIN TOP', tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 148, anim: 'grab' },
  { name: 'DISASTER',     tier: 3, rot: 1,   dir: -1, flip: 'board', bonus: 240, anim: 'soul' },
  { name: 'DOUBLE ROCKET',tier: 4, rot: 4,   dir: 1,  flip: 'body',  bonus: 540, anim: 'rocket' },
];

// --- Pogo stick: air time is the whole point, so the list leans on big
// vertical tricks and no-footers rather than board flips.
export const POGO_TRICKS = [
  { name: 'HOP',           tier: 0, rot: 0.5, dir: 1,  flip: 'board', bonus: 0,   anim: 'boing' },
  { name: 'DOUBLE BOING',  tier: 0, rot: 0.5, dir: -1, flip: 'board', bonus: 0,   anim: 'boing' },

  { name: 'SCISSOR KICK',  tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 60,  anim: 'boing' },
  { name: 'ONE-HANDER',    tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 58,  anim: 'spin' },
  { name: 'NO-FOOTER',     tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 62,  anim: 'spin' },

  { name: 'SKY SCISSOR',   tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 140, anim: 'boing' },
  { name: '360 SPIN',      tier: 2, rot: 2,   dir: -1, flip: 'board', bonus: 145, anim: 'spin' },
  { name: 'POGO BACKFLIP', tier: 2, rot: 1,   dir: -1, flip: 'body',  bonus: 180, anim: 'flip' },

  { name: 'MOON HOP',      tier: 3, rot: 2,   dir: 1,  flip: 'board', bonus: 245, anim: 'boing' },
  { name: '540 NO-FOOTER', tier: 3, rot: 3,   dir: -1, flip: 'board', bonus: 260, anim: 'spin' },
  { name: 'FRONT FLIP',    tier: 3, rot: 1,   dir: 1,  flip: 'body',  bonus: 255, anim: 'flip' },

  { name: 'ORBIT',         tier: 4, rot: 4,   dir: 1,  flip: 'board', bonus: 470, anim: 'spin' },
  { name: 'DOUBLE BACKFLIP', tier: 4, rot: 2, dir: -1, flip: 'body',  bonus: 530, anim: 'flip' },
  { name: 'THE POGO 900',  tier: 4, rot: 5,   dir: 1,  flip: 'body',  bonus: 600, anim: 'flip' },
  { name: 'STRATOSPHERE',  tier: 4, rot: 3,   dir: 1,  flip: 'board', bonus: 490, anim: 'boing' },

  // extra variety
  { name: 'CANDYBAR',      tier: 2, rot: 1,   dir: 1,  flip: 'board', bonus: 138, anim: 'boing' },
  { name: 'BINDER SPIN',   tier: 3, rot: 3,   dir: -1, flip: 'board', bonus: 255, anim: 'spin' },
  { name: 'CORK 720',      tier: 4, rot: 4,   dir: 1,  flip: 'body',  bonus: 560, anim: 'flip' },
];

// --- Dirtbike: real motocross. Whips and scrubs low down, big freestyle
// inversions up top.
export const DIRT_TRICKS = [
  { name: 'WHEELIE',        tier: 0, rot: 0.5, dir: 1,  flip: 'board', bonus: 0,   anim: 'whip' },
  { name: 'HOLESHOT',       tier: 0, rot: 0.5, dir: -1, flip: 'board', bonus: 0,   anim: 'whip' },

  { name: 'SCRUB',          tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 65,  anim: 'whip' },
  { name: 'HEEL CLICKER',   tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 70,  anim: 'super' },
  { name: 'NAC NAC',        tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 68,  anim: 'super' },

  { name: 'BIG WHIP',       tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 150, anim: 'whip' },
  { name: 'CAN-CAN',        tier: 2, rot: 1,   dir: -1, flip: 'board', bonus: 145, anim: 'super' },
  { name: 'BACKFLIP',       tier: 2, rot: 1,   dir: -1, flip: 'body',  bonus: 190, anim: 'flip' },

  { name: 'SUPERMAN',       tier: 3, rot: 1,   dir: 1,  flip: 'board', bonus: 255, anim: 'super' },
  { name: 'STRIPPER WHIP',  tier: 3, rot: 2,   dir: 1,  flip: 'board', bonus: 265, anim: 'whip' },
  { name: 'FRONT FLIP',     tier: 3, rot: 1,   dir: 1,  flip: 'body',  bonus: 270, anim: 'flip' },

  { name: 'SUPERMAN SEATGRAB', tier: 4, rot: 2, dir: 1, flip: 'board', bonus: 480, anim: 'super' },
  { name: 'DOUBLE BACKFLIP',   tier: 4, rot: 2, dir: -1, flip: 'body', bonus: 560, anim: 'flip' },
  { name: 'CLIFFHANGER FLIP',  tier: 4, rot: 3, dir: -1, flip: 'body', bonus: 600, anim: 'flip' },
  { name: 'TSUNAMI WHIP',      tier: 4, rot: 3, dir: 1,  flip: 'board', bonus: 500, anim: 'whip' },

  // extra variety
  { name: 'ROCK SOLID',        tier: 2, rot: 1, dir: -1, flip: 'board', bonus: 148, anim: 'super' },
  { name: 'KISS OF DEATH',     tier: 3, rot: 1, dir: 1,  flip: 'body',  bonus: 275, anim: 'flip' },
  { name: 'VOLT WHIP',         tier: 4, rot: 3, dir: -1, flip: 'board', bonus: 510, anim: 'whip' },
];

// --- Jetpack: no board, no wheels — pure flight. Everything is an aerial
// manoeuvre, and the top tier is straight-up aerobatics.
export const JET_TRICKS = [
  { name: 'HOVER POP',      tier: 0, rot: 0.5, dir: 1,  flip: 'board', bonus: 0,   anim: 'boost' },
  { name: 'THRUSTER TAP',   tier: 0, rot: 0.5, dir: -1, flip: 'board', bonus: 0,   anim: 'boost' },

  { name: 'AFTERBURNER',    tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 70,  anim: 'boost' },
  { name: 'FLY-BY',         tier: 1, rot: 1,   dir: -1, flip: 'board', bonus: 72,  anim: 'fly' },
  { name: 'SONIC DIVE',     tier: 1, rot: 1,   dir: 1,  flip: 'board', bonus: 68,  anim: 'fly' },

  { name: 'BARREL ROLL',    tier: 2, rot: 2,   dir: 1,  flip: 'board', bonus: 155, anim: 'fly' },
  { name: 'ROCKET CLIMB',   tier: 2, rot: 2,   dir: -1, flip: 'board', bonus: 150, anim: 'boost' },
  { name: 'LOOP-THE-LOOP',  tier: 2, rot: 1,   dir: -1, flip: 'body',  bonus: 200, anim: 'loop' },

  { name: 'IMMELMANN',      tier: 3, rot: 2,   dir: 1,  flip: 'body',  bonus: 270, anim: 'loop' },
  { name: 'MACH CAT',       tier: 3, rot: 2,   dir: -1, flip: 'board', bonus: 265, anim: 'fly' },
  { name: 'VERTICAL BURN',  tier: 3, rot: 3,   dir: 1,  flip: 'board', bonus: 280, anim: 'boost' },

  { name: 'DOUBLE LOOP',    tier: 4, rot: 2,   dir: -1, flip: 'body',  bonus: 580, anim: 'loop' },
  { name: 'ORBIT BURN',     tier: 4, rot: 4,   dir: 1,  flip: 'board', bonus: 520, anim: 'boost' },
  { name: 'THE STRATOCAT',  tier: 4, rot: 5,   dir: 1,  flip: 'body',  bonus: 650, anim: 'loop' },
  { name: 'LIGHTSPEED',     tier: 4, rot: 3,   dir: -1, flip: 'board', bonus: 540, anim: 'fly' },

  // extra variety
  { name: 'SPLIT-S',        tier: 2, rot: 1,   dir: -1, flip: 'body',  bonus: 200, anim: 'loop' },
  { name: 'HAMMERHEAD',     tier: 3, rot: 2,   dir: 1,  flip: 'board', bonus: 275, anim: 'fly' },
  { name: 'COBRA CLIMB',    tier: 4, rot: 4,   dir: -1, flip: 'board', bonus: 530, anim: 'boost' },
];

const TRICK_SETS = {
  skateboard: TRICKS,
  bmx: BMX_TRICKS,
  rollerblades: BLADE_TRICKS,
  pogo: POGO_TRICKS,
  dirtbike: DIRT_TRICKS,
  jetpack: JET_TRICKS,
};

/**
 * Pick a trick appropriate to the current combo streak. Higher combo unlocks
 * fancier tricks; we sample from the top couple of unlocked tiers for variety.
 * `tierCap` is the level's trick ceiling (levels.js trickTier): early levels
 * only know the basics, and each level you clear AWARDS the next tier — so the
 * arsenal grows across a sport's arc instead of everything showing up at once.
 * @param {number} combo    current consecutive-correct count (1-based)
 * @param {string} vehicle  'skateboard' | 'bmx' | 'rollerblades' | ...
 * @param {number} rnd      a 0..1 random value (passed in so callers control RNG)
 * @param {number} tierCap  highest trick tier unlocked on this level (0-4)
 */
export function pickTrick(combo, vehicle = 'skateboard', rnd = Math.random(), tierCap = 4) {
  const set = TRICK_SETS[vehicle] || TRICKS;
  // Arsenal opens WIDE from answer one (tiers 0-1 immediately — five-plus
  // moves instead of two) and still climbs with the streak. The pool spans
  // three tiers so mid-run you see basics mixed with bangers, not the same
  // top-tier move on loop.
  const maxTier = Math.min(Math.max(0, tierCap), 1 + Math.floor((combo - 1) / 2));
  const minTier = Math.max(0, maxTier - 2);
  let pool = set.filter((t) => t.tier >= minTier && t.tier <= maxTier);
  // Anti-repeat: never the same trick as the last few unless we're out of
  // options — repetition is what made the reel feel monotonous.
  const fresh = pool.filter((t) => !_recentTricks.includes(t.name));
  if (fresh.length >= 2) pool = fresh;
  const trick = pool[Math.floor(rnd * pool.length)] || set[0];
  _recentTricks.push(trick.name);
  if (_recentTricks.length > 3) _recentTricks.shift();
  return trick;
}
const _recentTricks = [];
