// ===========================================================================
// config.js — global constants, palette, and per-vehicle tuning.
// Vehicles (skateboard now; BMX / rollerblades / dirt bike later) share the
// SAME engine and only differ by these numbers + art, so new sports are cheap.
// ===========================================================================

export const COLORS = {
  pink:    '#ff2fb9',
  magenta: '#d6178f',
  cyan:    '#21e6ff',
  green:   '#b6ff2b',
  orange:  '#ff7a1a',
  yellow:  '#ffe11a',
  purple:  '#a12bff',
  blue:    '#2b6bff',
  ink:     '#17021a',
  white:   '#fff6fb',

  // cat / character palette (from the reference painting)
  fur:      '#e89438',
  furDark:  '#c8701f',
  furLight: '#f7c274',
  belly:    '#fff2df',
  cap:      '#ffb020',
  capDark:  '#e07d10',
  shades:   '#31d0ff',
  lensTop:  '#ff2fb9',
  lensBot:  '#ff9a1a',
};

// World physics (pixels / second). Tuned so a launch reads clearly.
export const PHYS = {
  gravity: 2400,        // downward accel while airborne
  groundStick: 1400,    // how hard the skater hugs the terrain
  maxFall: 2600,
};

// Slow-motion factor applied to simulation time during a trick window.
export const SLOWMO_SCALE = 0.16;

// ===========================================================================
// VIEW PROFILES — how the pseudo-3D camera is framed per screen shape.
//
// PORTRAIT is the primary target (phones held naturally, least friction).
// LANDSCAPE is kept fully working for desktop and tablets, and is here ready
// to go if we ever want to push a landscape phone build again — it is NOT
// dead code, it is what every wide screen uses.
//
// Everything is a fraction of the viewport, so both profiles are resolution
// independent. Renderer._recalc() picks one by aspect ratio.
//
//   nearX/vpX     horizontal anchors: near lane point and vanishing point
//   nearY/horizon vertical anchors: bottom of the lane, and the horizon
//   zs/hs         world→screen scale for lateral (z) and height (up)
//   sprite        multiplier on the rider's drawn size
//   rowSpan       share of screen width the answer row may occupy
//   rowShiftPx    how far right of centre the answer row sits
// ===========================================================================
export const VIEW = {
  portrait: {
    // Stronger horizontal skew = more side-scroller: the lane enters low-left
    // and recedes hard to the right instead of running almost straight up.
    nearX: 0.34, vpX: 0.74,
    nearY: 0.84, horizon: 0.42,  // horizon high: more course, less empty sky
    zs: 0.78, hs: 0.60,          // narrower track; tamer height so the arc fits
    sprite: 1.26,                // big enough to star, small enough to see the course
    rowSpan: 0.74,               // a touch tighter so the outer words never clip
    rowRaise: 0.52,              // words sit high, not centre-screen
  },
  landscape: {
    nearX: 0.42, vpX: 0.55,      // lane sits left, recedes up-and-right
    nearY: 0.90, horizon: 0.46,
    zs: 1.00, hs: 1.00,          // the original tuning, unchanged
    sprite: 1.00,
    rowSpan: 0.52,
    rowShiftPx: 38,
    rowRaise: 0.28,
  },
};

// A screen is "portrait" when it's taller than it is wide. Desktop and tablets
// land in `landscape` and keep exactly the framing they always had.
export function viewProfile(w, h) {
  return h > w ? VIEW.portrait : VIEW.landscape;
}

// The order sports UNLOCK in — this drives the sport-select landing page and
// the "next two locked / rest mystery" progression. It matches the campaign:
// each entry's last level carries an `unlocks` for the following sport.
export const SPORT_ORDER = ['skateboard', 'bmx', 'rollerblades', 'pogo', 'dirtbike', 'jetpack'];

// Vehicle definitions. Each level references one of these.
export const VEHICLES = {
  skateboard: {
    id: 'skateboard',
    name: 'SKATEBOARD',
    wheelColor: COLORS.green,
    launchBoost: 1.0,     // multiplier on ramp launch power
    airControl: 2100,     // lateral steering accel while airborne
    airDrag: 2.2,         // damping on lateral air velocity
    landForgiveness: 0.55, // radians of tilt still counted as a clean-ish land
    steerRate: 10,        // how fast the rider slides across the track in the air
    rideOffset: 26,       // how far the rider's centre sits above the ground line
    spriteScale: 1.0,
    apexHang: 0.15,
    showcase: 0.8,
  },

  // BMX — heavy and floaty. Big booming launches and long hang time, but it
  // drifts across the track more slowly, so you must commit to a word early.
  bmx: {
    id: 'bmx',
    name: 'BMX',
    wheelColor: COLORS.cyan,
    launchBoost: 1.22,
    airControl: 1700,
    airDrag: 2.8,
    landForgiveness: 0.7,
    steerRate: 7.5,       // heavier — slower to swing between word bubbles
    rideOffset: 34,       // bigger machine sits taller off the ground
    spriteScale: 1.18,
    apexHang: 0.18,
    showcase: 0.85,
  },

  // DIRTBIKE — the heavyweight. Fastest thing in the game and it launches
  // enormous, but it's sluggish to swing between words, so you have to read the
  // row early and commit. Punishes hesitation rather than reflexes.
  dirtbike: {
    id: 'dirtbike',
    name: 'DIRTBIKE',
    wheelColor: COLORS.orange,
    launchBoost: 1.32,
    airControl: 1600,
    airDrag: 3.0,
    landForgiveness: 0.75,
    steerRate: 6.5,       // heaviest steering in the game
    rideOffset: 38,
    spriteScale: 1.24,
    apexHang: 0.18,
    showcase: 0.95,
    dust: true,           // kicks up a rooster tail on the ground
  },

  // JETPACK — the finale, and the only vehicle with no ground contact. It
  // HOVERS above the course and falls at less than half gravity, so the arc is
  // enormous and lazy; the difficulty moves from reaction speed to precision.
  jetpack: {
    id: 'jetpack',
    name: 'JETPACK',
    wheelColor: COLORS.cyan,
    launchBoost: 1.1,
    gravityScale: 0.42,   // floats down — this is what sells flight
    airControl: 2600,
    airDrag: 1.6,
    landForgiveness: 0.9,
    steerRate: 16,        // most agile: you can re-aim late
    rideOffset: 24,
    spriteScale: 1.02,
    apexHang: 0.3,
    showcase: 1.15,
    hover: { height: 150, bob: 16, rate: 0.7 },   // cruising altitude + breathing
    flame: true,          // exhaust particle trail
  },

  // POGO STICK — the odd one out. It doesn't roll, it BOUNCES: slow forward
  // speed but enormous vertical pop, so ramps throw you sky-high and you hang
  // for ages. `hop` makes the rider physically bounce along the ground instead
  // of gliding, which is what sells it as a different sport rather than a reskin.
  pogo: {
    id: 'pogo',
    name: 'POGO STICK',
    wheelColor: COLORS.pink,
    launchBoost: 1.45,    // biggest air in the game
    airControl: 1900,
    airDrag: 2.4,
    landForgiveness: 0.8, // it lands on one point — be generous
    steerRate: 9,
    rideOffset: 30,
    spriteScale: 1.06,
    hop: { amp: 30, rate: 0.55 },   // ground bounce: height in px, cycles per bobPhase
    apexHang: 0.45,       // slows hardest at the very top of the arc
    showcase: 1.15,       // and holds slow-mo after the answer to show the trick
    launchAnim: 'flip',   // little backflip on the way up instead of a held pose
  },

  // ROLLERBLADES — light and twitchy. Lower pops and less hang time, but it
  // darts sideways fast, so late corrections are possible if you're sharp.
  rollerblades: {
    id: 'rollerblades',
    name: 'ROLLERBLADES',
    wheelColor: COLORS.yellow,
    launchBoost: 0.9,
    airControl: 2500,
    airDrag: 1.8,
    landForgiveness: 0.45,
    steerRate: 14,        // whippy — you can still save a bad line
    rideOffset: 22,
    spriteScale: 0.96,
    apexHang: 0.15,
    showcase: 0.8,
  },
};
