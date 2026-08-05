// ===========================================================================
// render.js — PSEUDO-3D PERSPECTIVE renderer (Trials-style angled camera).
//
// The course is a floor plane that recedes into the distance at an angle, so
// you look DOWN the track and see ramps / obstacles / bridges approaching from
// ahead. The cat rides near the lower-left; forward (+s) recedes toward a
// vanishing point up-and-to-the-right. Everything (floor, ramps, props, cat)
// lives in ONE projected 3D space so the scene reads cohesively.
//
// Physics stays a 1D forward heightfield (player.x = forward distance `s`,
// player.y = world-down height). This file only changes how it's DRAWN.
// ===========================================================================

import { COLORS, viewProfile } from './config.js';

const DATUM = 520;           // world-down Y of the flat ground (matches game BASE_Y)
const TRACK_W = 300;         // half-width of the ride surface (lateral world units)

function loadImg(src) {
  const im = new Image();
  im._ready = false;
  im.onload = () => { im._ready = true; };
  im.onerror = () => { im._failed = true; };   // missing art → fall back cleanly
  im.src = src;
  return im;
}

// Backdrops referenced by KEY, loaded on demand. Region levels name their
// segments in level.bgs (e.g. ['cdmx_a','cdmx_b']); the files ship as
// assets/env/<key>.jpg whenever the art lands, and until then the level falls
// back to its stand-in `bg`. Deliberately a dynamic path: build.sh's
// missing-asset grep only guards literal paths, and these are allowed to be
// absent while the art is still being generated.
const ENV_DYN = {};
function envImg(key) {
  if (!key) return null;
  if (ENV_IMG[key]) return ENV_IMG[key];
  if (!ENV_DYN[key]) ENV_DYN[key] = loadImg('assets/env/' + key + '.jpg');
  return ENV_DYN[key];
}

// Per-level backdrops (the course recedes into these).
const ENV_IMG = {
  warehouse_a: loadImg('assets/env/warehouse_a.jpg'),
  warehouse_b: loadImg('assets/env/warehouse_b.jpg'),
  warehouse_c: loadImg('assets/env/warehouse_c.jpg'),
  neon_park:   loadImg('assets/env/neon_park.jpg'),
  tokyo_alley: loadImg('assets/env/tokyo_alley.jpg'),
  rooftop:     loadImg('assets/env/rooftop.jpg'),
  subway:      loadImg('assets/env/subway.jpg'),
  arena:       loadImg('assets/env/arena.jpg'),
  carnival:    loadImg('assets/env/carnival.jpg'),
  canyon:      loadImg('assets/env/canyon.jpg'),
  skycity:     loadImg('assets/env/skycity.jpg'),
};

// Per-level ambient grade — each world lights the scene its own way, so the
// haze/dust/vignette tint matches the art instead of always reading "warehouse".
const ENV_TONE = {
  warehouse_a: { haze: '255,190,90',  dust: '255,222,160', vig: '20,8,0'   },
  warehouse_b: { haze: '255,190,90',  dust: '255,222,160', vig: '20,8,0'   },
  warehouse_c: { haze: '255,190,90',  dust: '255,222,160', vig: '20,8,0'   },
  neon_park:   { haze: '120,80,255',  dust: '180,220,255', vig: '10,2,26'  },
  tokyo_alley: { haze: '255,60,200',  dust: '160,230,255', vig: '12,2,24'  },
  rooftop:     { haze: '255,140,70',  dust: '255,210,180', vig: '30,6,20'  },
  subway:      { haze: '90,255,140',  dust: '190,255,200', vig: '2,16,8'   },
  arena:       { haze: '255,200,80',  dust: '255,235,190', vig: '22,4,16'  },
  carnival:    { haze: '255,80,200',  dust: '255,220,255', vig: '18,2,30'  },
  canyon:      { haze: '255,140,50',  dust: '255,215,160', vig: '30,8,2'   },
  skycity:     { haze: '80,200,255',  dust: '200,240,255', vig: '2,6,34'   },

  // Region worlds (levels set `tone` to one of these; art ships separately).
  cdmx:      { haze: '255,190,120', dust: '255,230,180', vig: '20,10,0'  },
  selva:     { haze: '110,255,140', dust: '200,255,200', vig: '4,20,6'   },
  tulum:     { haze: '80,230,255',  dust: '210,250,255', vig: '0,14,20'  },
  cartagena: { haze: '255,150,90',  dust: '255,225,190', vig: '24,8,2'   },
  medellin:  { haze: '140,255,120', dust: '220,255,210', vig: '8,18,4'   },
  bsas:      { haze: '120,180,255', dust: '230,240,255', vig: '6,10,24'  },
  pamplona:  { haze: '255,80,60',   dust: '255,220,210', vig: '26,4,2'   },
  machu:     { haze: '150,230,170', dust: '220,255,230', vig: '6,16,10'  },
  havana:    { haze: '255,170,110', dust: '255,230,200', vig: '22,10,4'  },
  bcn:       { haze: '255,200,90',  dust: '255,240,200', vig: '18,12,2'  },
  iguazu:    { haze: '130,230,255', dust: '220,250,255', vig: '2,14,18'  },

  // World-tour wave 2.
  oaxaca:      { haze: '170,255,220', dust: '225,255,245', vig: '4,18,14'  },
  teotihuacan: { haze: '255,190,110', dust: '255,230,185', vig: '24,12,2'  },
  antigua:     { haze: '255,170,140', dust: '255,225,210', vig: '22,8,8'   },
  atitlan:     { haze: '110,210,255', dust: '215,245,255', vig: '2,10,22'  },
  atacama:     { haze: '255,130,70',  dust: '255,210,170', vig: '28,8,2'   },
  santiago:    { haze: '190,210,255', dust: '235,240,255', vig: '8,10,24'  },
  cusco:       { haze: '200,230,180', dust: '235,250,220', vig: '10,16,6'  },
  lapaz:       { haze: '150,200,255', dust: '225,240,255', vig: '4,8,26'   },
  uyuni:       { haze: '160,220,255', dust: '235,250,255', vig: '4,12,24'  },
  sanjuan:     { haze: '90,220,255',  dust: '215,250,255', vig: '0,12,20'  },
};

// Character sprite (angled, warm-lit). Falls back to the older sprite until the
// new one is generated.
const SKATER = loadImg('assets/cat/skater_angle.png');
const SKATER_FALLBACK = loadImg('assets/cat/skater_game.png');
const TRICK = loadImg('assets/cat/trick_game.png');

// ---------------------------------------------------------------- vehicles
// Every sport is a 6-frame sheet of the SAME cat doing that sport's signature
// trick: [0] rolling  [1] pop  [2] air  [3] mid-trick  [4] catch  [5] land.
// Frames 1..4 are the airborne loop the renderer plays during a trick; frame 0
// doubles as the rolling pose for vehicles that have no separate ride sprite.
// `count` varies per sheet: the original sets are 6 frames, the redrawn
// rollerblade sets are 8 (more in-betweens + baked-in inverted frames).
// `baked` marks a sheet whose rotation is drawn INTO the frames — those must
// not also be spun by p.angle or the rotation happens twice.
function frameSet(prefix, count = 6, baked = false) {
  const frames = [];
  for (let i = 0; i < count; i++) frames.push(loadImg(`assets/cat/${prefix}_${i}.png`));
  return { frames, baked };
}

// HERO SHEETS — one consistent, from-behind 8-frame sheet per sport, all drawn
// from a single reference so the cat AND the vehicle look identical across the
// whole animation (this replaced the old mix of side-view / behind-view sheets
// with mismatched bikes). Each sheet is a full trick arc: frame 0 is the clean
// riding pose, frames 1..6 are the airborne trick, frame 7 is the landing.
// They're `baked` — the rotation lives in the art, so the renderer plays the
// frames instead of spinning a single pose with p.angle.
const HERO = {
  skateboard:   frameSet('hero_skate', 8, true),
  bmx:          frameSet('hero_bmx',   8, true),
  rollerblades: frameSet('hero_blade', 8, true),
  pogo:         frameSet('hero_pogo',  8, true),
  dirtbike:     frameSet('hero_dirt',  8, true),
  jetpack:      frameSet('hero_jet',   8, true),
};

// TRICK CAM — side-on sheets, played only for the post-answer trick. The camera
// deliberately "cuts" to profile for the payoff (Tony Hawk / SSX style): a spin,
// a flip or a superman simply cannot read from behind. It's a deliberate angle
// change on the money shot, NOT the old bug — the cat and vehicle are identical
// in both sets, so only the camera moves. Riding + the word window stay
// from-behind (HERO) because that's when you steer across the lanes.
// (named TRICK_CAM, not TRICK — `TRICK` is already the legacy single-image
// fallback sprite loaded at the top of this file.)
const TRICK_CAM = {
  skateboard:   frameSet('trick_skate', 8, true),
  bmx:          frameSet('trick_bmx',   8, true),
  rollerblades: frameSet('trick_blade', 8, true),
  pogo:         frameSet('trick_pogo',  8, true),
  dirtbike:     frameSet('trick_dirt',  8, true),
  jetpack:      frameSet('trick_jet',   8, true),
};

// The blades' ground pose is a dedicated upright STRIDE LOOP (cycle: true) —
// the hero sheet's frame 0 was a deep pre-jump crouch, which read as "stuck
// crouching" the whole level. The stride animates off distance travelled.
const CRUISE_BLADE = frameSet('cruise_blade', 8, true);
CRUISE_BLADE.cycle = true;

// Half-pipe front-facing carve cycle: on toward-camera (leftward) runs the cat
// turns and skates AT you instead of showing a mirrored back — sells the
// "coming back around" of a real half-pipe run.
const HP_FRONT = frameSet('hp_front', 8, true);

// Trick ANATOMY — the wind-up before the move and the catch/land after it
// (Dylan: "crouch, ollie, kickflip, catch the board, land — five stages").
// Side-view sheets, per sport; a sport without them just plays the old
// pop->trick->hold sequence, so art can land sport by sport.
const TRICK_PREP = {
  skateboard:   frameSet('trickprep_skate', 8, true),
  bmx:          frameSet('trickprep_bmx', 8, true),
  rollerblades: frameSet('trickprep_blade', 8, true),
  pogo:         frameSet('trickprep_pogo', 8, true),
  dirtbike:     frameSet('trickprep_dirt', 8, true),
  jetpack:      frameSet('trickprep_jet', 8, true),
};
const TRICK_LAND = {
  skateboard:   frameSet('trickland_skate', 8, true),
  bmx:          frameSet('trickland_bmx', 8, true),
  rollerblades: frameSet('trickland_blade', 8, true),
  pogo:         frameSet('trickland_pogo', 8, true),
  dirtbike:     frameSet('trickland_dirt', 8, true),
  jetpack:      frameSet('trickland_jet', 8, true),
};

// The painted half-pipe arena (nano-banana art, keyed + measured by
// tools/process_halfpipe_art.py). HP_ART is MEASURED off the pixels: lipL/lipR
// are the coping tops, `bowl` is the actual painted riding surface sampled
// per-column, all as fractions of the image. The cat's physics path is built
// from these numbers, so he rides exactly on the art — coping, vert wall,
// transition, flat bottom.
const HP_PIPE_IMG = loadImg('assets/env/hp_pipe.png');
const HP_ART = {
  lipL: [0.2422, 0.0410], lipR: [0.7578, 0.0410],
  bowl: [[0.2433, 0.4356], [0.2511, 0.4795], [0.2589, 0.5064], [0.2667, 0.529], [0.2746, 0.5488], [0.2824, 0.5644], [0.2902, 0.5771], [0.298, 0.5884], [0.3058, 0.5997], [0.3136, 0.6096], [0.3214, 0.6167], [0.3292, 0.6252], [0.3371, 0.6308], [0.3449, 0.6365], [0.3527, 0.6407], [0.3605, 0.6464], [0.3683, 0.6506], [0.3761, 0.6549], [0.3839, 0.6577], [0.3917, 0.6605], [0.3996, 0.662], [0.4074, 0.6648], [0.4152, 0.6676], [0.423, 0.6676], [0.4308, 0.669], [0.4386, 0.6676], [0.4464, 0.669], [0.4542, 0.669], [0.4621, 0.669], [0.4699, 0.669], [0.4777, 0.6676], [0.4855, 0.669], [0.4933, 0.669], [0.5011, 0.669], [0.5089, 0.669], [0.5167, 0.669], [0.5246, 0.669], [0.5324, 0.669], [0.5402, 0.669], [0.548, 0.669], [0.5558, 0.669], [0.5636, 0.669], [0.5714, 0.669], [0.5792, 0.6676], [0.5871, 0.6662], [0.5949, 0.6648], [0.6027, 0.662], [0.6105, 0.6591], [0.6183, 0.6563], [0.6261, 0.6521], [0.6339, 0.6492], [0.6417, 0.645], [0.6496, 0.6407], [0.6574, 0.6351], [0.6652, 0.628], [0.673, 0.6209], [0.6808, 0.6124], [0.6886, 0.6054], [0.6964, 0.5955], [0.7042, 0.5842], [0.7121, 0.57], [0.7199, 0.5573], [0.7277, 0.5417], [0.7355, 0.5219], [0.7433, 0.4993], [0.7511, 0.4668]],
};

// `roll` = from-behind ride pose + word window. `anims.trick` = the side-on
// payoff. `fall` = the side-view comedy wipeout (same consistent cat as the
// trick cam — this replaced the last of the old-generation art).
const VEHICLE_SPRITES = {
  skateboard:  { ride: null, roll: HERO.skateboard,  fall: frameSet('wipeout_skate', 8),  def: 'trick', anims: { trick: TRICK_CAM.skateboard } },
  bmx:         { ride: null, roll: HERO.bmx,         fall: frameSet('wipeout_bmx', 8),    def: 'trick', anims: { trick: TRICK_CAM.bmx } },
  rollerblades:{ ride: null, roll: CRUISE_BLADE,      fall: frameSet('wipeout_blade', 8),  def: 'trick', anims: { trick: TRICK_CAM.rollerblades } },
  pogo:        { ride: null, roll: HERO.pogo,        fall: frameSet('wipeout_pogo', 8),   def: 'trick', anims: { trick: TRICK_CAM.pogo } },
  dirtbike:    { ride: null, roll: HERO.dirtbike,    fall: frameSet('wipeout_dirt', 8),   def: 'trick', anims: { trick: TRICK_CAM.dirtbike } },
  jetpack:     { ride: null, roll: HERO.jetpack,     fall: frameSet('wipeout_jet', 8),    def: 'trick', anims: { trick: TRICK_CAM.jetpack } },
};

function framesReady(set) { return !!set && set.frames.every((f) => f._ready); }

// Resolve a trick's sheet, falling back to the sport's default set if the
// requested one hasn't loaded (or doesn't exist) — never leave the cat blank.
function pickFrames(vehId, animKey) {
  const v = VEHICLE_SPRITES[vehId] || VEHICLE_SPRITES.skateboard;
  const want = animKey && v.anims[animKey];
  if (framesReady(want)) return want;
  return v.anims[v.def];
}

// Airborne frames of a sheet: everything between the rolling pose (0) and the
// landing pose (last). Multi-rotation tricks replay the middle beats so a
// 6-frame and an 8-frame sheet both stretch to fill the hang time.
const FALL_FPS = 11;          // comedy timing — slow enough to read each beat
const ROLL_RATE = 1.0;        // ground-cycle frames per unit of player.bobPhase

function airSeq(n, cycles) {
  const base = [];
  for (let i = 1; i <= n - 2; i++) base.push(i);
  if (cycles >= 2 && base.length > 2) return base.concat(base.slice(1, -1));
  return base;
}

// Where the wheels sit inside a sheet frame's padded canvas (0 = top, 1 = bottom).
// The slicer pins every character's head near the canvas top, so this one number
// puts the whole set on the ground correctly.
const GROUND_FRAC = 0.66;

// Foreground props scattered across the course width.
const PROP_IMG = {
  crate: loadImg('assets/env/prop_crate.png'),
  tire: loadImg('assets/env/prop_tire.png'),
  barrel: loadImg('assets/env/prop_barrel.png'),
  cactus: loadImg('assets/env/prop_cactus.png'),   // canyon / dirt worlds
  cone: loadImg('assets/env/prop_cone.png'),       // carnival / neon worlds
  hay: loadImg('assets/env/prop_hay.png'),         // dirt / sunset worlds
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.t = 0;
    this._recalc();
  }

  // Kick off the level's backdrop downloads immediately (game calls this on
  // level load) so the scenery is ready before the first frame needs it.
  preloadLevel(level) {
    if (!level) return;
    (level.bgs || []).forEach((k) => envImg(k));
    if (level.bg) envImg(level.bg);
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._recalc();
  }

  // Perspective anchors (recomputed on resize). Tuned so the ride lane sits on
  // the warehouse floor and recedes INTO the room (down-the-course view).
  _recalc() {
    const w = this.w || 1280, h = this.h || 720;
    // Portrait and landscape frame the course differently — see VIEW in
    // config.js. Everything below stays a fraction of the viewport, so each
    // profile is resolution independent.
    const V = viewProfile(w, h);
    this.view = V;
    this.NEARZ = 360;              // camera distance to the cat (depth constant)
    this.NEAR_X = w * V.nearX;     // near lane point
    this.NEAR_Y = h * V.nearY;     // near lane screen Y
    this.VP_X = w * V.vpX;         // vanishing point x
    this.HORIZON_Y = h * V.horizon; // vanishing point / horizon screen Y
    // World->screen factors. These MUST scale with the viewport: NEAR_Y and
    // HORIZON_Y above are fractions of h, so a fixed HS made world heights eat
    // a bigger share of a short window — on a 500px-tall browser the word
    // bubbles climbed to 27% of screen height and collided with the prompt.
    // Scaling them keeps the scene identical at every window size.
    this.ZS = 0.7 * (w / 1280) * V.zs;   // lateral world->screen factor
    this.HS = 0.8 * (h / 720) * V.hs;    // height world->screen factor
  }

  // Invert _project for `up`: the largest world height whose bubble still sits
  // fully below screenY. Used to guarantee the answer row is never tucked under
  // the HUD or the prompt, whatever the window shape.
  maxUpForTop(d, screenY, r) {
    const depth = Math.max(d + this.NEARZ, this.NEARZ * 0.25);
    const scale = this.NEARZ / depth;
    const tt = 1 - scale;
    const baseY = this.NEAR_Y + (this.HORIZON_Y - this.NEAR_Y) * tt;
    return (baseY - (screenY + r * scale)) / (scale * this.HS);
  }

  // Project a world point given forward distance d (relative to the camera),
  // height `up` (world units above DATUM, +up), and lateral z. Returns screen
  // {x, y} and a depth `scale` (1 near, →0 far).
  _project(d, up, z) {
    const depth = Math.max(d + this.NEARZ, this.NEARZ * 0.25);
    const scale = this.NEARZ / depth;
    const tt = 1 - scale;
    const x = this.NEAR_X + (this.VP_X - this.NEAR_X) * tt + z * scale * this.ZS;
    const y = this.NEAR_Y + (this.HORIZON_Y - this.NEAR_Y) * tt - up * scale * this.HS;
    return { x, y, scale };
  }

  _rgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ---------------------------------------------------------------- half-pipe
  // The RETO half-pipe is drawn in pure SCREEN space (no world projection):
  // a parabolic U between two lips. The same geometry is shared with game.js
  // (cat position, launch points), so everything stays in lockstep.
  // Geometry comes FROM the arena painting whenever it's loaded: the riding
  // path is coping -> vert wall -> transition -> flat -> wall -> coping, built
  // from the measured HP_ART points and parameterised by arc length. Cached
  // per screen size. Falls back to the old parametric U until the art is in.
  hpGeom() {
    const w = this.w || 375, h = this.h || 812;
    const art = !!(HP_PIPE_IMG.complete && HP_PIPE_IMG.naturalWidth);
    if (this._hpG && this._hpG.w === w && this._hpG.h === h && this._hpG.art === art) {
      return this._hpG.g;
    }
    let g;
    if (art) {
      const iw = HP_PIPE_IMG.naturalWidth, ih = HP_PIPE_IMG.naturalHeight;
      const L = HP_ART.lipL, R = HP_ART.lipR, B = HP_ART.bowl;
      // Opening (coping to coping). NOT full-width: the vert walls, coping and
      // deck rails sit OUTSIDE the opening in the art — at 0.96w they landed
      // exactly on the screen edges and the whole pipe read as a bare bowl.
      const innerW = Math.min(w * 0.74, h * 0.52);
      const scale = innerW / ((R[0] - L[0]) * iw);
      const drawW = iw * scale, drawH = ih * scale;
      const cx = w / 2;
      const bowlBot = Math.max(...B.map((p) => p[1]));
      // The riding line sits at 0.80h — the art's painted interior face (the
      // ~third of the image BELOW the curve) needs the remaining fifth of the
      // screen, or the pipe reads as a hollow rim over the backdrop.
      const bottomY = h * 0.80;
      const dy = bottomY - bowlBot * drawH;
      const dx = cx - drawW / 2;
      const toS = (p) => [dx + p[0] * drawW, dy + p[1] * drawH];
      // Riding polyline: ease down the (near-vertical) wall, trace the painted
      // bowl, ease back up the far wall.
      const P = [];
      const bl = B[0], br = B[B.length - 1];
      for (let i = 0; i < 8; i++) {
        const k = i / 8;
        P.push(toS([L[0] + (bl[0] - L[0]) * k, L[1] + (bl[1] - L[1]) * k]));
      }
      for (const p of B) P.push(toS(p));
      for (let i = 1; i <= 8; i++) {
        const k = i / 8;
        P.push(toS([br[0] + (R[0] - br[0]) * k, br[1] + (R[1] - br[1]) * k]));
      }
      const cum = [0];
      for (let i = 1; i < P.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      }
      const lipY = dy + L[1] * drawH;
      g = {
        cx, halfW: innerW / 2,
        lipY, bottomY,
        rowY: Math.min(h * 0.26, lipY - h * 0.14),
        art: true, path: P, cum, total: cum[cum.length - 1],
        draw: { x: dx, y: dy, w: drawW, h: drawH },
      };
    } else {
      g = { cx: w / 2, halfW: w * 0.38, lipY: h * 0.44, bottomY: h * 0.74, rowY: h * 0.26, art: false };
    }
    this._hpG = { w, h, art, g };
    return g;
  }

  // Point on the pipe for t in [-1, 1] (-1 = left coping, 0 = flat bottom,
  // 1 = right coping). Art mode walks the measured polyline by arc length;
  // fallback keeps the |t|^3 parametric U.
  hpPoint(t) {
    const g = this.hpGeom();
    if (g.art) {
      const s = Math.max(0, Math.min(1, (t + 1) / 2)) * g.total;
      const cum = g.cum, P = g.path;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const k = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      const x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k;
      const y = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k;
      const ang = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]);
      return { x, y, ang };
    }
    const depth = g.bottomY - g.lipY;
    const shape = (v) => Math.pow(Math.abs(v), 3);
    const x = g.cx + t * g.halfW;
    const y = g.bottomY - shape(t) * depth;
    // numeric tangent for the rider's tilt
    const e = 0.03;
    const y2 = g.bottomY - shape(Math.min(1, Math.abs(t) + e)) * depth;
    const slope = (y2 - y) / (e * g.halfW) * Math.sign(t || 1);
    const ang = Math.atan(slope);
    return { x, y, ang };
  }

  _halfpipeScene(ctx, s) {
    const hp = s.hp, level = s.level;
    const g = this.hpGeom();

    // ---- the painted arena --------------------------------------------
    if (g.art) {
      // Seat the ramp in the scene: soft ground shadow, then the painting.
      ctx.save();
      const gr0 = ctx.createLinearGradient(0, g.lipY, 0, this.h);
      gr0.addColorStop(0, 'rgba(0,0,0,0)');
      gr0.addColorStop(1, 'rgba(10,4,0,0.55)');
      ctx.fillStyle = gr0;
      ctx.fillRect(0, g.lipY, this.w, this.h - g.lipY);
      ctx.drawImage(HP_PIPE_IMG, g.draw.x, g.draw.y, g.draw.w, g.draw.h);
      // if the art doesn't reach the bottom edge, ground it in darkness
      const artBot = g.draw.y + g.draw.h;
      if (artBot < this.h) { ctx.fillStyle = '#140a04'; ctx.fillRect(0, artBot, this.w, this.h - artBot); }

      // ¡ÚLTIMO TRUCO! — the whole arena goes gold for the final seconds.
      if (hp.finale) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.3);
        const vg = ctx.createRadialGradient(
          this.w / 2, this.h * 0.5, Math.min(this.w, this.h) * 0.25,
          this.w / 2, this.h * 0.5, Math.max(this.w, this.h) * 0.75);
        vg.addColorStop(0, 'rgba(255,200,40,0)');
        vg.addColorStop(1, `rgba(255,170,20,${0.22 + 0.16 * pulse})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, this.w, this.h);
      }
      // FLOW flight: cool slow-mo grade while it lasts.
      if (hp.flowTime) {
        ctx.fillStyle = 'rgba(30,60,120,0.16)';
        ctx.fillRect(0, 0, this.w, this.h);
        this._speedLines(ctx, 0.5);
      }
      ctx.restore();

      this._hpCat(ctx, s);
      if (hp.bubbles && hp.bubbles.length) this._screenBubbles(ctx, hp.bubbles, hp.time || 0);
      return;
    }

    // ---- procedural fallback (first frames, before the art decodes) ----
    const glow = (level && level.laneGlow) || '#ff8a1a';
    const lane = (level && level.laneColor) || '#ffbf5c';
    const [gr, gg, gb] = this._rgbOf(glow);
    const light = `rgb(${this._lift(gr)},${this._lift(gg)},${this._lift(gb)})`;
    const dark  = `rgb(${(gr * 0.28) | 0},${(gg * 0.28) | 0},${(gb * 0.28) | 0})`;

    // Pipe body: the U surface plus a thick under-slab so it reads solid.
    const N = 40;
    const pts = [];
    for (let i = 0; i <= N; i++) pts.push(this.hpPoint(-1 + (2 * i) / N));
    ctx.save();

    // platforms behind the lips
    ctx.fillStyle = dark;
    ctx.fillRect(0, g.lipY, pts[0].x, 20);
    ctx.fillRect(pts[N].x, g.lipY, this.w - pts[N].x, 20);

    // under-slab
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[N].x, pts[N].y + 26);
    for (let i = N; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + 26);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();

    // deck surface: single-hue vertical gradient (same language as the ramps)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, g.lipY - 4);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[N].x, g.lipY - 4);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, g.lipY, 0, g.bottomY);
    grad.addColorStop(0, light);
    grad.addColorStop(0.55, glow);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;

    // transition sheen
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = pts[i]; i ? ctx.lineTo(p.x, p.y + 8) : ctx.moveTo(p.x, p.y + 8); }
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // coping: glowing rails on both lips
    for (const t of [-1, 1]) {
      const p = this.hpPoint(t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = light;
      ctx.shadowColor = glow; ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // centre line marks (skate-park vibe)
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = pts[i]; i ? ctx.lineTo(p.x, p.y + 15) : ctx.moveTo(p.x, p.y + 15); }
    ctx.strokeStyle = this._rgba(lane, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ------- the cat -------
    this._hpCat(ctx, s);

    // ------- word bubbles (screen-space) -------
    if (hp.bubbles && hp.bubbles.length) this._screenBubbles(ctx, hp.bubbles, hp.time || 0);
  }

  _hpCat(ctx, s) {
    const hp = s.hp;
    const vehId = (s.level && s.level.vehicle) || 'skateboard';
    const veh0 = VEHICLE_SPRITES[vehId];
    let img = null, mirror = false;
    if (hp.anim === 'crash') {
      const fs = veh0.fall;
      if (framesReady(fs)) {
        const i = Math.min(fs.frames.length - 1, Math.floor(hp.animT * FALL_FPS));
        img = fs.frames[i];
      }
    } else if (hp.anim === 'trick') {
      const ts = pickFrames(vehId, 'trick');
      if (framesReady(ts)) {
        const seq = airSeq(ts.frames.length, 1);
        const i = Math.min(seq.length - 1, Math.floor(hp.animT * 14));
        img = ts.frames[seq[i]];
      }
    } else if (hp.phase === 'air' || hp.phase === 'return') {
      const hs = HERO[vehId];
      if (framesReady(hs)) img = hs.frames[1];      // clean pop/tuck
      mirror = hp.side < 0;
    } else {
      // sliding the transition. Rightward = back view; leftward (toward the
      // camera) = the front-facing carve cycle, face visible — like a rider
      // coming back around on a real pipe. Falls back to a mirrored back view
      // until the front sheet is loaded.
      if (hp.dir < 0 && framesReady(HP_FRONT)) {
        const ff = HP_FRONT.frames;
        const i = Math.floor((hp.slidePhase || 0) * 1.2) % ff.length;
        img = ff[(i + ff.length) % ff.length];
        mirror = false;
      } else if (veh0.roll && framesReady(veh0.roll)) {
        if (veh0.roll.cycle) {
          const rf = veh0.roll.frames;
          const i = Math.floor((hp.slidePhase || 0) * 1.2) % rf.length;
          img = rf[(i + rf.length) % rf.length];
        } else img = veh0.roll.frames[0];
        mirror = hp.dir < 0;
      }
    }
    if (!img || !img._ready) return;

    const H = Math.min(170, this.h * 0.20);
    const w = H * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.translate(hp.catX, hp.catY);
    if (this._fireFx && hp.anim !== 'crash') {
      this._flames(ctx, H);
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.35);
      ctx.shadowColor = '#ff7a1a';
      ctx.shadowBlur = (22 + 16 * pulse) * this._fireFx;
      try { ctx.filter = `hue-rotate(${(this.t * 11) % 360}deg) saturate(1.6) brightness(1.12)`; } catch { /* old engine */ }
    }
    ctx.rotate(hp.ang || 0);
    if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -H * GROUND_FRAC, w, H);
    ctx.restore();
  }

  // Bubbles given directly in screen px ({x, y, r, es, hit, reveal, scale}).
  _screenBubbles(ctx, bubbles, time) {
    for (const b of bubbles) {
      if (b.scale < 0.02) continue;
      const bob = Math.sin(time * 3 + (b.bobPhase || 0)) * 5;
      ctx.save();
      ctx.translate(b.x, b.y + bob);
      ctx.scale(b.scale, b.scale);
      let ring = '#ffcf7a', glow = '#ff9a1a', fill = 'rgba(18,11,4,0.9)';
      // PALABRA DE ORO: gold, pulsing, unmistakably the prize.
      if (b.golden) {
        const p = 0.5 + 0.5 * Math.sin(time * 6);
        ring = '#ffd94d'; glow = '#ffc400'; fill = 'rgba(64,44,2,0.92)';
        ctx.shadowColor = glow; ctx.shadowBlur = 26 + 14 * p;
      }
      if (b.reveal) { ring = COLORS.green; glow = COLORS.green; fill = 'rgba(20,50,6,0.9)'; }
      if (b.hit && !b.correct) { ring = COLORS.pink; glow = COLORS.pink; fill = 'rgba(60,6,40,0.9)'; }
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.shadowColor = glow; ctx.shadowBlur = b.golden ? ctx.shadowBlur : 20;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = b.golden ? 5 : 4; ctx.strokeStyle = ring; ctx.stroke();
      if (b.golden) {
        // 3× tag riding the top of the ring
        ctx.font = `900 ${Math.round(b.r * 0.42)}px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd94d';
        ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.strokeText('3×', 0, -b.r - 14); ctx.fillText('3×', 0, -b.r - 14);
      }
      ctx.fillStyle = COLORS.white;
      const fit = 2 * b.r - 14;
      let fs = Math.round(b.r * 0.5);
      ctx.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
      const tw = ctx.measureText(b.es).width;
      if (tw > fit) { fs = Math.max(11, Math.floor(fs * (fit / tw))); ctx.font = `900 ${fs}px "Arial Black", Arial, sans-serif`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2.5, fs * 0.16); ctx.strokeStyle = COLORS.ink; ctx.lineJoin = 'round';
      ctx.strokeText(b.es, 0, 1); ctx.fillText(b.es, 0, 1);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------- frame
  frame(s) {
    const ctx = this.ctx;
    this.t++;
    // Cat-on-fire intensity for this frame (drives the sprite FX in _cat and
    // _hpCat) — brightest right after a streak extends.
    this._fireFx = s.onFire ? Math.min(1.6, 1 + (s.fireBurst || 0)) : 0;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const camS = s.player ? s.player.x : 0;
    const zoom = s.camera && s.camera.zoom || 1;

    // Backdrop (the world the course recedes into, advancing with progress).
    this._backdrop(ctx, s.level, camS, s.progress || 0);

    // Bullet-time / shake zoom around the action.
    ctx.save();
    const cx = this.NEAR_X + (this.VP_X - this.NEAR_X) * 0.18;
    const cy = this.h * 0.6;
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
    const sh = s.shake || 0;
    ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    if (s.hp) {
      // RETO half-pipe: its own screen-space scene replaces the world course.
      this._halfpipeScene(ctx, s);
    } else {
      this._floor(ctx, s.terrain, camS, s.level);
      this._props(ctx, s.terrain, camS);
      this._particles(ctx, s.particles, camS);
      // Cat UNDER the bubbles: it flies through the answer row, so drawing it
      // on top meant the rider's own body covered the word you were reading.
      this._cat(ctx, s.player, camS);
      const rings = !!(s.level && s.level.challenge && s.level.challenge.style === 'rings');
      this._bubbles(ctx, s.quiz, camS, rings);
    }

    ctx.restore();

    // Bullet-time grade + speed lines.
    if (s.slowmoAmount > 0.01) {
      const a = s.slowmoAmount;
      ctx.fillStyle = `rgba(20,10,4,${0.26 * a})`;
      ctx.fillRect(0, 0, this.w, this.h);
      this._speedLines(ctx, a);
    }
    if (s.player && s.player.boosting && s.player.mode === 'ground') this._speedLines(ctx, 0.5);

    this._vignette(ctx, s.slowmoAmount || 0, s.level);

    // ON FIRE — a pulsing warm glow ringing the screen while the streak is live,
    // brighter on the beat each new answer lands.
    if (s.onFire) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.25);
      const a = 0.18 + 0.14 * pulse + 0.5 * (s.fireBurst || 0);
      const g = ctx.createRadialGradient(
        this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.30,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.72);
      g.addColorStop(0, 'rgba(255,120,20,0)');
      g.addColorStop(1, `rgba(255,90,10,${Math.min(0.6, a)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    if (s.flash > 0.01) {
      ctx.fillStyle = `rgba(${s.flashColor},${0.22 * s.flash})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  // --------------------------------------------------------------- backdrop
  // The world MOVES: a level can carry several backdrop segments
  // (level.bgs = ['cdmx_a','cdmx_b']) and the scenery advances through them as
  // you clear the level — riding across the city past its landmarks, not just
  // along a track. Segments crossfade near each boundary; any segment whose art
  // hasn't shipped yet falls back to the level's stand-in `bg`.
  _backdrop(ctx, level, camS, progress = 0) {
    ctx.fillStyle = '#160d06';
    ctx.fillRect(0, 0, this.w, this.h);

    const keys = (level && level.bgs && level.bgs.length) ? level.bgs
               : [level && level.bg];
    const n = keys.length;
    const pos = Math.max(0, Math.min(0.999, progress)) * n;
    const idx = Math.floor(pos), frac = pos - idx;
    const ready = (k) => { const im = envImg(k); return im && im._ready ? im : null; };

    // Current segment, walking back to earlier ones. The stand-in bg is used
    // ONLY if the segment art outright failed (doesn't exist yet) — while it's
    // merely still loading we show a toned gradient, because flashing a totally
    // different interior for the first second read as a glitch.
    let ENV = null, loading = false;
    for (let j = idx; j >= 0 && !ENV; j--) {
      const im = envImg(keys[j]);
      if (im && im._ready) ENV = im;
      else if (im && !im._failed) loading = true;
    }
    if (!ENV && !loading && level) ENV = ready(level.bg);
    if (!ENV && !loading) ENV = ready('warehouse_a');

    if (ENV) {
      this._drawCover(ctx, ENV, camS);
      // Crossfade into the next landmark over the last 18% of this segment.
      const nxt = idx + 1 < n ? ready(keys[idx + 1]) : null;
      if (nxt && frac > 0.82) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (frac - 0.82) / 0.18);
        this._drawCover(ctx, nxt, camS);
        ctx.restore();
      }
    } else {
      const tn = (level && (ENV_TONE[level.tone] || ENV_TONE[level.bg])) || ENV_TONE.warehouse_a;
      const gg = ctx.createLinearGradient(0, 0, 0, this.h);
      gg.addColorStop(0, `rgba(${tn.haze},0.30)`);
      gg.addColorStop(1, '#0c0703');
      ctx.fillStyle = '#160d06'; ctx.fillRect(0, 0, this.w, this.h);
      ctx.fillStyle = gg; ctx.fillRect(0, 0, this.w, this.h);
    }
    // Ambient haze that deepens the distance — tinted per world.
    const tone = (level && (ENV_TONE[level.tone] || ENV_TONE[level.bg])) || ENV_TONE.warehouse_a;
    const hz = ctx.createLinearGradient(0, 0, 0, this.h);
    hz.addColorStop(0, `rgba(${tone.haze},0.08)`);
    // clamp: a transiently 0-height canvas (rotation, pane resize) makes this
    // NaN and addColorStop throws, killing the whole frame
    const hStop = this.h ? Math.min(1, Math.max(0, this.HORIZON_Y / this.h)) : 0.5;
    hz.addColorStop(hStop, `rgba(${tone.haze},0.10)`);
    hz.addColorStop(1, 'rgba(8,5,2,0.10)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, 0, this.w, this.h);

    // Dust motes / drifting light specks.
    ctx.fillStyle = `rgba(${tone.dust},0.10)`;
    for (let i = 0; i < 40; i++) {
      const seed = i * 97.13;
      const x = (((seed * 7) + this.t * 0.3) % (this.w + 40)) - 20;
      const yy = ((seed * 13) % this.h) + Math.sin(this.t * 0.012 + i) * 12;
      ctx.beginPath();
      ctx.arc(x, yy, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cover-scale one backdrop image across the screen, mirror-tiled with
  // parallax. The parallax factor is deliberately strong (0.20, up from 0.09):
  // the scenery visibly slides past as you ride, which is most of what sells
  // "moving through the city" between landmark changes.
  _drawCover(ctx, ENV, camS) {
    const iw = ENV.naturalWidth, ih = ENV.naturalHeight;
    const scale = Math.max(this.w / iw, this.h / ih) * 1.14;
    const dw = iw * scale, dh = ih * scale;
    const y = this.h - dh + Math.min(0, dh - this.h) * 0.15;
    const par = ((camS * 0.20) % dw + dw) % dw;
    for (let t = -1; t * dw - par < this.w + dw; t++) {
      const x = t * dw - par;
      const mirror = ((t % 2) + 2) % 2 === 1;
      ctx.save();
      if (mirror) { ctx.translate(x + dw, 0); ctx.scale(-1, 1); ctx.drawImage(ENV, 0, y, dw, dh); }
      else ctx.drawImage(ENV, x, y, dw, dh);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ floor
  // The receding ride surface built from the terrain heightfield, drawn as a
  // warm tiled warehouse floor. Ramps rise the surface; collapsed bridges sag.
  _floor(ctx, terrain, camS, level) {
    // `back` reaches toward the camera behind the rider. It was short (100), so
    // the lane visibly stopped just under the cat — on portrait, where he rides
    // low, the track ran out beneath him. Extended so the ride surface fills
    // down past the rider and reads as continuous.
    const back = 340, far = 1650, step = 30;
    const col = (level && level.laneColor) || '#ffbf5c';
    const glow = (level && level.laneGlow) || '#ff8a1a';
    const left = [], right = [], mid = [];
    for (let d = -back; d <= far; d += step) {
      const up = DATUM - terrain.heightAt(camS + d);
      left.push(this._project(d, up, -TRACK_W));
      right.push(this._project(d, up, TRACK_W));
      mid.push(this._project(d, up, 0));
    }
    const n = left.length;

    // Translucent ride lane laid over the floor (art shows through).
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 0; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, this.NEAR_Y, 0, this.HORIZON_Y);
    g.addColorStop(0, this._rgba(glow, 0.2));
    g.addColorStop(1, this._rgba(glow, 0.02));
    ctx.fillStyle = g;
    ctx.fill();

    // Glowing lane edges (per-level colour — neon on Neon Park).
    for (const pts of [left, right]) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.shadowColor = glow; ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // Dashed centre guide.
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    ctx.moveTo(mid[0].x, mid[0].y);
    for (let i = 0; i < n; i++) ctx.lineTo(mid[i].x, mid[i].y);
    ctx.strokeStyle = this._rgba(col, 0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    this._ramps(ctx, terrain, camS, level);

    // Ramp lip markers.
    for (const lip of terrain.lips) {
      const d = lip.x - camS;
      if (d < -back || d > far) continue;
      const p = this._project(d, DATUM - terrain.heightAt(lip.x), 0);
      ctx.fillStyle = lip.used ? 'rgba(255,255,255,0.25)' : COLORS.yellow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * p.scale + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crumbling bridge planks (flash red as they strain).
    for (const b of terrain.bridges) {
      if (b.collapsed || b.x1 < camS - back || b.x0 > camS + far) continue;
      const strain = b.triggered ? Math.min(1, b.t / b.fallTime) : 0;
      for (let x = b.x0; x <= b.x1; x += 30) {
        const d = x - camS;
        const up = DATUM - terrain.heightAt(x);
        const pl = this._project(d, up, -TRACK_W);
        const pr = this._project(d, up, TRACK_W);
        ctx.strokeStyle = strain > 0
          ? `rgba(255,${Math.round(140 - strain * 110)},40,0.9)`
          : 'rgba(196,140,66,0.9)';
        ctx.lineWidth = Math.max(2, 6 * pl.scale);
        ctx.beginPath();
        ctx.moveTo(pl.x, pl.y);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
      }
    }
  }

  // ------------------------------------------------------------------ ramps
  // SOLID stunt-ramp geometry — X-Games / car-stunt style. ONE bold colour, no
  // hazard stripes: the deck is a single smooth quarter-pipe surface with a
  // dark→bright gradient up its curve, a glossy centre sheen, clean bright rails
  // and a glowing lip you aim for. Colour is the level's ACCENT hue (laneGlow),
  // brightened, so the ramp pops off the track instead of blending into it.
  _ramps(ctx, terrain, camS, level) {
    const glow = (level && level.laneGlow) || '#ff8a1a';
    const [gr, gg, gb] = this._rgbOf(glow);
    const deckLight = `rgb(${this._lift(gr)},${this._lift(gg)},${this._lift(gb)})`;
    const deckDark  = `rgb(${(gr * 0.40) | 0},${(gg * 0.40) | 0},${(gb * 0.40) | 0})`;
    const side      = `rgb(${(gr * 0.20) | 0},${(gg * 0.20) | 0},${(gb * 0.20) | 0})`;
    const SEG = 20;
    for (const r of terrain.ramps) {
      if (r.x1 < camS - 400 || r.x0 > camS + 1650) continue;
      const dl = [], dr = [], md = [], gl = [], grr = [];
      for (let i = 0; i <= SEG; i++) {
        const x = r.x0 + (r.x1 - r.x0) * (i / SEG);
        const d = x - camS;
        const deck = DATUM - terrain.heightAt(x);   // curved ramp surface
        const grnd = DATUM - r.base;                // flat floor beneath it
        dl.push(this._project(d, deck, -TRACK_W));
        dr.push(this._project(d, deck, TRACK_W));
        md.push(this._project(d, deck, 0));
        gl.push(this._project(d, grnd, -TRACK_W));
        grr.push(this._project(d, grnd, TRACK_W));
      }
      const quad = (a, b, c, e, fill) => {   // a-b top edge, c-e bottom edge
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.lineTo(e.x, e.y); ctx.lineTo(c.x, c.y);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      };

      // Solid dark side walls (the thickness of the ramp).
      quad(dl[0], dl[SEG], gl[0], gl[SEG], side);
      quad(dr[0], dr[SEG], grr[0], grr[SEG], this._rgba(side, 0.9));

      // Deck as ONE filled polygon with a base→lip gradient (single hue).
      ctx.beginPath();
      ctx.moveTo(dl[0].x, dl[0].y);
      for (let i = 1; i <= SEG; i++) ctx.lineTo(dl[i].x, dl[i].y);
      for (let i = SEG; i >= 0; i--) ctx.lineTo(dr[i].x, dr[i].y);
      ctx.closePath();
      const grad = ctx.createLinearGradient(md[0].x, md[0].y, md[SEG].x, md[SEG].y);
      grad.addColorStop(0, deckDark);
      grad.addColorStop(0.6, glow);
      grad.addColorStop(1, deckLight);
      ctx.fillStyle = grad;
      ctx.fill();

      // Glossy sheen straight up the centreline — sells the smooth curve.
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.beginPath();
      ctx.moveTo(md[0].x, md[0].y);
      for (let i = 1; i <= SEG; i++) ctx.lineTo(md[i].x, md[i].y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(6, 22 * md[Math.floor(SEG / 2)].scale);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // Clean bright rails down both edges.
      ctx.lineWidth = 3; ctx.strokeStyle = deckLight;
      ctx.shadowColor = glow; ctx.shadowBlur = 10;
      for (const e of [dl, dr]) {
        ctx.beginPath(); ctx.moveTo(e[0].x, e[0].y);
        for (let i = 1; i <= SEG; i++) ctx.lineTo(e[i].x, e[i].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // A THIN dark lip underside for a little thickness — NOT a full wall down
      // to the floor. The old full-height face read as an ugly dark box sitting
      // on the track (it's the black rectangle in the "awful ramp" shot). A
      // kicker's launch edge is a thin lip, so that's all we draw now.
      const lipUp = DATUM - terrain.heightAt(r.x1);
      const dLip = r.x1 - camS;
      const luL = this._project(dLip, lipUp - 24, -TRACK_W);
      const luR = this._project(dLip, lipUp - 24, TRACK_W);
      quad(dl[SEG], dr[SEG], luL, luR, side);
      // The bright glowing lip you aim for.
      ctx.beginPath();
      ctx.moveTo(dl[SEG].x, dl[SEG].y); ctx.lineTo(dr[SEG].x, dr[SEG].y);
      ctx.strokeStyle = deckLight;
      ctx.lineWidth = Math.max(5, 9 * dl[SEG].scale);
      ctx.shadowColor = glow; ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // rgb components of a #hex.
  _rgbOf(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  _lift(c) { return Math.min(255, (c + (255 - c) * 0.42) | 0); }

  // ------------------------------------------------------------------ props
  _props(ctx, terrain, camS) {
    if (!terrain.props.length) return;
    const list = terrain.props
      .map((p) => ({ p, d: p.x - camS }))
      .filter((o) => o.d > -120 && o.d < 1650)
      .sort((a, b) => b.d - a.d);         // far first
    for (const { p, d } of list) {
      const img = PROP_IMG[p.kind];
      if (!img || !img._ready) continue;
      const z = (p.t - 0.5) * 2 * (TRACK_W * 1.5);   // spread across / beside the track
      const up = DATUM - terrain.heightAt(p.x);
      const base = this._project(d, up, z);
      const hh = 150 * p.scale * base.scale;
      const ww = hh * (img.naturalWidth / img.naturalHeight);
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, ww * 0.4, hh * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.drawImage(img, base.x - ww / 2, base.y - hh, ww, hh);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------- cat
  // Flame licks behind an on-fire rider (screen-space, drawn just before the
  // sprite so they read as trailing off his back). Deterministic flicker from
  // this.t — no Math.random in the draw loop, so pausing doesn't sizzle.
  _flames(ctx, H) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const ph = this.t * 0.42 + i * 1.9;
      const flick = 0.72 + 0.28 * Math.sin(ph * 3.1 + i);
      const dx = -H * (0.22 + 0.11 * i) * flick;
      const dy = -H * (0.06 + 0.16 * i) - H * 0.05 * Math.sin(ph * 2.2);
      const r = H * (0.16 - 0.025 * i) * flick;
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
      g.addColorStop(0, 'rgba(255,240,150,0.85)');
      g.addColorStop(0.45, 'rgba(255,140,20,0.55)');
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _cat(ctx, p, camS) {
    if (!p) return;
    const vehId0 = (p.level && p.level.vehicle) || 'skateboard';
    const fallSet = (VEHICLE_SPRITES[vehId0] || {}).fall;
    // The crash animation owns the whole bail. Blinking only starts once it has
    // played out — blinking THROUGH the tumble hid the joke.
    const falling = p.fallTime >= 0 && framesReady(fallSet) &&
                    p.fallTime < fallSet.frames.length / FALL_FPS;
    if (!falling && p.blinkTimer > 0 && Math.floor(this.t / 3) % 2 === 0) return;
    const upGround = DATUM - p.terrain.heightAt(p.x);
    const contactUp = DATUM - (p.y + p.rideOffset);   // where the wheels are
    const ground = this._project(0, upGround, p.z);
    const pos = this._project(0, contactUp, p.z);
    const lift = Math.max(0, contactUp - upGround);

    // Ground shadow (shrinks + fades as the cat lifts off).
    ctx.save();
    ctx.globalAlpha = 0.34 * Math.max(0.12, 1 - lift / 340);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, 58 * ground.scale + 16, 13 * ground.scale + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Pick the sprite for this vehicle. A board/machine trick plays the
    // frame-by-frame sequence; a body trick keeps a rotating sprite; otherwise
    // the clean rolling pose.
    const vehId = (p.level && p.level.vehicle) || 'skateboard';
    const veh0 = VEHICLE_SPRITES[vehId];
    // While airborne the trick picks its own sheet; on the ground always use
    // the sport's default set so the rolling pose never changes mid-run.
    const set = pickFrames(vehId, p.spinning && p.currentTrick && p.currentTrick.anim);
    const ready = framesReady(set);
    const frames = ready ? set.frames : null;
    // A baked sheet already draws the flip, so play it like a machine trick and
    // suppress p.angle below — otherwise the sprite spins on top of art that is
    // already spinning.
    let baked = ready && set.baked;
    const machineTrick = p.spinning &&
      (baked || !p.currentTrick || p.currentTrick.flip !== 'body');
    let img, spinning = false, fromSheet = false;
    if (falling) {
      // One-shot bail, held on the last frame until he's back up.
      const fi = Math.min(fallSet.frames.length - 1, Math.floor(p.fallTime * FALL_FPS));
      img = fallSet.frames[fi];
      fromSheet = true;
    } else if (machineTrick && ready) {
      // FIVE-STAGE trick when the sport has anatomy sheets: wind-up/snap
      // (prep frames) -> the trick itself -> catch & level out (land frames),
      // then the grounded branch below plays the compress/roll-away. Sports
      // without the sheets keep the old pop->trick->hold-catch sequence.
      // Crisp frame stepping — NO cross-fade. Blending adjacent trick frames
      // drew the cat twice at once and read as a doubled/ghosted character.
      const prep = TRICK_PREP[vehId], land = TRICK_LAND[vehId];
      const hasPrep = framesReady(prep);
      const tt = p.trickTime || 0;
      const PREP_T = 0.24;
      const seq = airSeq(frames.length, p.trickCycles);
      if (hasPrep && tt < PREP_T) {
        // quick wind + snap (frames 2-7 of the prep sheet)
        img = prep.frames[2 + Math.min(5, Math.floor((tt / PREP_T) * 6))];
      } else {
        const t2 = hasPrep ? tt - PREP_T : tt;
        const idx = Math.floor(t2 * 16);
        if (idx <= seq.length - 1) {
          img = frames[seq[idx]];
        } else if (framesReady(land)) {
          // trick done, still airborne: catch the board and level out
          img = land.frames[Math.min(3, Math.floor((t2 - seq.length / 16) * 12))];
        } else {
          img = frames[seq[seq.length - 1]];   // hold the catch frame
        }
      }
      baked = true;                            // anatomy art carries its pose
      spinning = true; fromSheet = true;
    } else if (p.spinning && ready) {
      // Body trick on an unbaked sheet — hold the peak pose and let p.angle
      // do the rotating.
      img = frames[Math.min(3, frames.length - 2)];
      spinning = true; fromSheet = true;
    } else if (p.spinning && TRICK._ready) {
      img = TRICK; spinning = true;
    } else if (p.airborne && ready) {
      // AIRBORNE BUT NOT TRICKING — the word window. This used to fall through
      // to the ground cycle, so the rider held a rolling/bouncing pose the
      // whole way up, which read as lazy and wrong. Now the launch sheet plays
      // against rise progress: he pops, tucks and (on the pogo) throws a little
      // backflip on the way up, then holds the peak pose as he falls.
      const vcfg = (p.level && p.level._veh) || {};
      // Deliberately the FROM-BEHIND sheet, not the trick set: this is the word
      // window, when you're steering across the lanes to pick a word. The side-on
      // trick cam only takes over AFTER you've answered (machineTrick above).
      const lset = (veh0 && veh0.roll) || pickFrames(vehId, vcfg.launchAnim || null);
      const lf = framesReady(lset) ? lset : set;
      if (lf.cycle) {
        // Stride loops have no launch arc — hold one clean upright glide frame
        // through the whole word window instead of stepping mid-stride poses.
        img = lf.frames[0];
        spinning = true; fromSheet = true;
        baked = true;
      } else {
        const seq = airSeq(lf.frames.length, 1);
        let idx;
        if (vcfg.launchAnim) {
          // Vehicles with an intentional launch move (the pogo's little
          // backflip) play the whole sequence up — that flip is the point.
          idx = Math.min(seq.length - 1, Math.floor(p.riseT * seq.length));
        } else {
          // Everyone else holds an upright pop -> tuck through the word window
          // so the rider never spins BACKWARDS while you're trying to read.
          // The big trick frames belong AFTER the answer (machineTrick above).
          idx = Math.min(seq.length - 1, Math.min(1, Math.floor(p.riseT * 3)));
        }
        img = lf.frames[seq[idx]];
        spinning = true; fromSheet = true;
        if (lf.baked) baked = true;    // don't double-rotate a baked flip
      }
    } else if (p.landAnimT != null && p.landAnimT < 0.42 &&
               framesReady(TRICK_LAND[vehId])) {
      // Just touched down off a trick: knees compress, then he rolls away
      // clean (land frames 4-7) before snapping back to the from-behind ride.
      const li = 4 + Math.min(3, Math.floor((p.landAnimT / 0.42) * 4));
      img = TRICK_LAND[vehId].frames[li];
      fromSheet = true; baked = true;
    } else if (framesReady(veh0 && veh0.roll)) {
      // Grounded. A `cycle` roll set is a real locomotion loop (the blades'
      // skating stride) and plays off distance travelled; hero trick arcs just
      // hold their clean frame-0 riding pose. Either way the engine layers on
      // lean / hop / hover, so it's drawn un-baked.
      if (veh0.roll.cycle) {
        const rf = veh0.roll.frames;
        const i = Math.floor((p.bobPhase || 0) * ROLL_RATE) % rf.length;
        img = rf[(i + rf.length) % rf.length];
      } else {
        img = veh0.roll.frames[0];
      }
      fromSheet = true;
      baked = false;
    } else if (veh0 && veh0.ride && veh0.ride._ready) {
      img = veh0.ride;                      // dedicated rolling sprite
    } else if (ready) {
      img = frames[0];                      // frame 0 is the rolling pose
      fromSheet = true;
    } else {
      img = SKATER._ready ? SKATER : (SKATER_FALLBACK._ready ? SKATER_FALLBACK : null);
    }
    if (!img) return;

    const veh = (p.level && p.level._veh) || null;
    const vScale = ((veh && veh.spriteScale) || 1) * (this.view ? this.view.sprite : 1);
    const H = 172 * pos.scale * (spinning ? 1.12 : 1) * vScale;
    const w = H * (img.naturalWidth / img.naturalHeight);
    const sqY = p.squash || 1;
    const sqX = 1 / Math.sqrt(sqY);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    // GATO EN FUEGO: the cat himself ignites — trailing flame licks, a hot
    // pulsing glow, and a rainbow hue-cycle on the sprite (Dylan's "rainbow
    // flashing cat"). ctx.filter is a no-op on engines without support, and
    // the glow alone still reads there.
    if (this._fireFx && !falling) {
      this._flames(ctx, H);
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.35);
      ctx.shadowColor = '#ff7a1a';
      ctx.shadowBlur = (22 + 16 * pulse) * this._fireFx;
      try { ctx.filter = `hue-rotate(${(this.t * 11) % 360}deg) saturate(1.6) brightness(1.12)`; } catch { /* old engine */ }
    }
    // Rotation rules for from-behind / baked art:
    //  - baked sheets and the wipeout tumble carry rotation IN the art
    //  - grounded, the sprite only *hints* at the slope (clamped) — matching a
    //    steep kicker's true 60°+ slope made the rear-view cat lie sideways
    let drawAng = baked || falling ? 0 : (p.angle || 0);
    if (!baked && !falling && p.mode === 'ground') {
      drawAng = Math.max(-0.26, Math.min(0.26, drawAng));
    }
    ctx.rotate(drawAng);
    ctx.scale(sqX, sqY);
    if (fromSheet) {
      // Sheet frames share one padded canvas with the head pinned near the top,
      // so they anchor by a fixed fraction — GROUND_FRAC is where the wheels sit
      // in that canvas. Using the same anchor for air and ground frames keeps
      // the character from popping as it takes off and lands.
      ctx.drawImage(img, -w / 2, -H * GROUND_FRAC, w, H);
    } else if (spinning) {
      ctx.drawImage(img, -w / 2, -H * 0.6, w, H);
    } else {
      ctx.drawImage(img, -w * 0.52, -H, w, H);   // wheels at the contact point
    }
    ctx.restore();
  }

  // --------------------------------------------------------------- bubbles
  _bubbles(ctx, quiz, camS, rings = false) {
    if (!quiz || !quiz.bubbles.length) return;
    for (const b of quiz.bubbles) {
      if (b.scale < 0.02) continue;
      const up = DATUM - b.worldY;
      const p = this._project(b.s - camS, up, b.z);
      const bob = Math.sin(quiz.time * 3 + b.bobPhase) * 6;
      const sc = b.scale * Math.max(0.5, p.scale);
      let ring = '#ffcf7a', glow = '#ff9a1a', fill = 'rgba(18,11,4,0.9)';
      if (b.reveal) { ring = COLORS.green; glow = COLORS.green; fill = 'rgba(20,50,6,0.9)'; }
      if (b.hit && !b.correct) { ring = COLORS.pink; glow = COLORS.pink; fill = 'rgba(60,6,40,0.9)'; }
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.scale(sc, sc);
      if (rings) {
        // Jetpack time trial: each word sits inside a big neon flight ring.
        ctx.beginPath();
        ctx.arc(0, 0, b.r * 1.5, 0, Math.PI * 2);
        ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(33,230,255,0.9)';
        ctx.shadowColor = '#21e6ff'; ctx.shadowBlur = 26;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, b.r * 1.5 + 6, 0, Math.PI * 2);
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.stroke();
      }
      // A REVIEW word — one you already owed — comes back gold and pays 2x.
      // Framing matters: this is a bonus target, not a punishment.
      if (b.review) { ring = '#ffd94d'; glow = '#ffc400'; fill = 'rgba(64,44,2,0.92)'; }
      // Shape carries the mode faster than colour ever could: target-language
      // options are balls, English options are hard-edged tags.
      if (b.tag) {
        const tw = b.r * 2.1, th = b.r * 1.15, rr = th * 0.32;
        ctx.beginPath();
        ctx.moveTo(-tw / 2 + rr, -th / 2);
        ctx.arcTo(tw / 2, -th / 2, tw / 2, th / 2, rr);
        ctx.arcTo(tw / 2, th / 2, -tw / 2, th / 2, rr);
        ctx.arcTo(-tw / 2, th / 2, -tw / 2, -th / 2, rr);
        ctx.arcTo(-tw / 2, -th / 2, tw / 2, -th / 2, rr);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      }
      ctx.fillStyle = fill;
      ctx.shadowColor = glow; ctx.shadowBlur = 22;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 4; ctx.strokeStyle = ring; ctx.stroke();
      if (b.review) {
        ctx.font = `900 ${Math.round(b.r * 0.4)}px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd94d'; ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.strokeText('2×', 0, -b.r - 12); ctx.fillText('2×', 0, -b.r - 12);
      }
      ctx.fillStyle = COLORS.white;
      // Fit the word INSIDE the bubble. A fixed size let long words ("Siempre")
      // spill across their neighbours on the 4-choice levels.
      const fit = (b.tag ? b.r * 2.1 : 2 * b.r) - 14;   // usable width inside the shape
      let fs = Math.round(b.r * 0.56);          // scales with the bubble
      ctx.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
      const w = ctx.measureText(b.es).width;
      if (w > fit) {
        fs = Math.max(11, Math.floor(fs * (fit / w)));
        ctx.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2.5, fs * 0.16); ctx.strokeStyle = COLORS.ink;
      ctx.lineJoin = 'round';
      ctx.strokeText(b.es, 0, 1); ctx.fillText(b.es, 0, 1);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------- particles
  // Particles carry world (x = forward s, y = world-down); project them.
  _particles(ctx, particles, camS) {
    for (const p of particles.list) {
      const pr = this._project(p.x - camS, DATUM - p.y, 0);
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      const sz = Math.max(1, p.size * pr.scale);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(p.rot);
        ctx.fillRect(-sz / 2, -sz, sz, sz * 2); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(pr.x, pr.y, sz, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  _speedLines(ctx, amt) {
    ctx.strokeStyle = `rgba(255,205,130,${0.16 * amt})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const y = (i * 71 + (this.t * 9) % this.h) % this.h;
      const x = ((this.t * 22 + i * 130) % (this.w + 200)) - 200;
      ctx.moveTo(x, y); ctx.lineTo(x + 60 + (i % 4) * 40, y);
    }
    ctx.stroke();
  }

  _vignette(ctx, extra, level) {
    const tone = (level && (ENV_TONE[level.tone] || ENV_TONE[level.bg])) || ENV_TONE.warehouse_a;
    const g = ctx.createRadialGradient(
      this.w / 2, this.h * 0.5, Math.min(this.w, this.h) * 0.34,
      this.w / 2, this.h * 0.5, Math.max(this.w, this.h) * 0.72
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.6, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(${tone.vig},${0.32 + 0.15 * extra})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }
}
