// ===========================================================================
// player.js — the skater cat: momentum physics + tricks + landing quality.
//
// Modes:
//   'ground' : auto-rolls along the terrain, hugging its slope.
//   'quiz'   : airborne during the slow-mo word window; steering moves the cat
//              left/right so it can fly INTO the correct Spanish word bubble.
//   'air'    : normal airborne arc (after the word is resolved) until landing.
//
// Right answer  -> trick spin + clean, boosted landing.
// Wrong / none  -> wobble + sloppy landing that bleeds speed.
// ===========================================================================

import { PHYS } from './config.js';
import { Z_SHIFT, Z_REACH } from './quiz.js';

export class Player {
  constructor(level, terrain, particles) {
    this.level = level;
    this.terrain = terrain;
    this.particles = particles;
    this.veh = level._veh || {};
    this.r = 34;              // collision radius (for word bubbles)
    // Each machine sits at its own height and handles differently in the air.
    this.rideOffset = this.veh.rideOffset || 26;
    this.reset(120);
  }

  reset(x) {
    this.x = x;
    this.y = this.terrain.heightAt(x) - this.rideOffset;
    this.vx = this.effSpeed;
    this.vy = 0;
    this.angle = 0;
    this.angularVel = 0;
    this.mode = 'ground';
    this.prevX = x;
    this.launchX = x;
    this.launchY = this.y;
    this.cleanLanding = true;
    this.spinning = false;
    this.wobble = 0;
    this.stumble = 0;
    this.trailTimer = 0;
    this.answered = false;
    this.squash = 1;      // 1 = neutral; <1 = compressed (landing impact)
    this.bobPhase = 0;    // advances with distance rolled → subtle push/pump
    this.z = 0;           // lateral position across the track (for air steering)
    this.blinkTimer = 0;  // >0 = just wiped out, invincible + blinking
    this.trickTime = 0;   // clock for the frame-by-frame flip animation
    this.currentTrick = null;
    this.fallTime = -1;   // >=0 while the wipeout animation is playing
  }

  // Called on a missed word: the cat bails hard, then gets back up (blinking).
  wipeout() {
    this.fallTime = 0;        // drives the crash sprite sequence
    this.blinkTimer = 1.6;
    this.stumble = 0.7;
    this.squash = 0.6;
    this.vx = this.effSpeed * 0.28;      // scrub off speed on the bail
  }

  get airborne() { return this.mode !== 'ground'; }

  // Difficulty-scaled ride speed (game sets speedMult from the chosen tier).
  get effSpeed() { return this.level.speed * (this.speedMult || 1); }

  // Gravity for this vehicle. The jetpack falls slowly, which is most of what
  // makes it feel like flight rather than a big jump.
  get gravity() { return PHYS.gravity * (this.veh.gravityScale || 1); }

  // 0 at the moment of launch → 1 at the apex, then held at 1 on the way down.
  // Drives the launch animation so the rider actually does something on the way
  // up instead of holding a ground pose.
  get riseT() {
    if (!this.launchVy0 || !this.airborne) return 0;
    return Math.max(0, Math.min(1, 1 + this.vy / this.launchVy0));
  }

  // Launch off a ramp lip. `quiz` opens the slow-mo word window.
  launch(quiz) {
    // BMX launches big and floaty; blades pop lower and snappier.
    // The renderer's vertical framing is FIXED (the projection ignores camera
    // Y), so an apex above roughly this height simply flies out of frame — the
    // dirtbike's raw 843 put the rider off the top of the screen entirely.
    // Clamp the launch so every machine peaks near the answer row; "big air"
    // is then sold by hang TIME (gravityScale + apexHang), not by leaving view.
    // A hovering vehicle starts its climb already that far up, so its cruising
    // altitude eats into the same headroom.
    const MAX_APEX = 505;
    const headroom = MAX_APEX - (this.veh.hover ? this.veh.hover.height : 0);
    const raw = (1300 + this.level.speed * 0.35) * (this.veh.launchBoost || 1);
    const vy0 = Math.min(raw, Math.sqrt(2 * this.gravity * headroom));
    this.launchVy0 = vy0;      // reference for rise progress + apex hang
    this.vy = -vy0;
    this.launchX = this.x;
    this.launchY = this.y;
    this.mode = quiz ? 'quiz' : 'air';
    this.answered = false;
    this.cleanLanding = !quiz; // non-quiz jumps just land normally
    this.spinning = false;
    this.apexHeight = (vy0 * vy0) / (2 * this.gravity);
    // Un-slowed duration of the whole arc (up AND back down). game.js divides
    // the level's answerTime budget by this to get the slow-mo factor, so the
    // reaction window is a real number of seconds no matter how the vehicle
    // launches — a floaty BMX and a snappy blade both get the same think time.
    this.airTimeWorld = (2 * vy0) / this.gravity;
    // Keep the lateral line you set up on the ground — launching straight from
    // a pre-steered position is the point of ground steering. Non-quiz jumps
    // still recentre so the free-air arc reads cleanly.
    if (!quiz) this.z = 0;
    if (quiz) this.vx = 0;     // hold position; lateral steering takes over
    this.particles.burst(this.x, this.y + this.rideOffset, this.level.wheelColor || '#b6ff2b', 14);
  }

  // Called by the quiz system when the player flies into a word.
  resolveAnswer(correct) {
    this.answered = true;
    this.cleanLanding = correct;
    this.spinning = correct;
    this.mode = 'air';                 // resume the arc at normal speed
    this.vx = this.effSpeed * (correct ? 1.06 : 0.9);
    this.angularVel = correct ? 11 : 3.2;
    if (!correct) this.wobble = 1;
  }

  // Apply a specific named trick on a correct answer.
  //  - board tricks (kickflip / 360 flip …): the RIDER stays upright, the flip
  //    lives in the board sprite — NO pinwheel spin.
  //  - body tricks (backflip / the 900 …): a real controlled body rotation.
  applyTrick(trick) {
    this.currentTrick = trick;
    this.spinning = true;
    this.cleanLanding = true;
    this.trickTime = 0;               // restart the flip animation
    this.trickCycles = trick.rot >= 2 ? 2 : 1;   // 360-flips get an extra board spin
    const body = trick.flip === 'body';
    this.angularVel = body ? trick.dir * Math.max(1, trick.rot) * 7 : 0;
    if (!body) this.angle = 0;
  }

  // dt is ALREADY time-scaled by the game loop (slow-mo = smaller dt).
  // realDt is the unscaled frame time — used for anything that must play at
  // normal speed regardless of bullet-time.
  update(dt, input, realDt = dt) {
    this.prevX = this.x;
    const veh = this.level._veh;

    // Recover from landing squash toward neutral.
    this.squash += (1 - this.squash) * Math.min(1, dt * 9);
    if (this.landAnimT != null) {
      this.landAnimT += dt;
      if (this.landAnimT > 0.6) this.landAnimT = null;
    }
    if (this.blinkTimer > 0) this.blinkTimer -= dt;
    // The crash plays on REAL time, not slow-mo dt — a bail stretched out by
    // bullet-time reads as a bug rather than a joke.
    if (this.fallTime >= 0) this.fallTime += realDt;

    if (this.mode === 'ground') {
      this._updateGround(dt, input, realDt);
    } else if (this.mode === 'quiz') {
      this._updateQuiz(dt, input, veh, realDt);
    } else {
      this._updateAir(dt, veh);
    }

    // Roll trail while grounded and moving.
    this.trailTimer -= dt;
    if (this.mode === 'ground' && this.trailTimer <= 0) {
      this.trailTimer = 0.03;
      if (this.veh.dust) {
        // Dirtbike rooster tail: a fat spray of sandy grit thrown up behind
        // the rear knobbly, heavier and slower to settle than a wheel trail.
        this.particles.spawn(this.x - 26, this.y + this.rideOffset, {
          count: 2, color: '#c98f4a',
          speed: 190, dir: Math.PI * 0.86, spread: 0.9, life: 0.62, size: 6, gravity: 420,
        });
      } else {
        this.particles.spawn(this.x - 20, this.y + this.rideOffset, {
          count: 1, color: this.level.wheelColor || '#b6ff2b',
          speed: 60, dir: Math.PI, spread: 0.8, life: 0.35, size: 3, gravity: 200,
        });
      }
    }

    // Jetpack exhaust — always burning, grounded or airborne, because it never
    // actually lands. Falls slowly and fades, so it reads as a flame trail.
    if (this.veh.flame) {
      this.flameTimer = (this.flameTimer || 0) - dt;
      if (this.flameTimer <= 0) {
        this.flameTimer = 0.02;
        this.particles.spawn(this.x - 6, this.y + 16, {
          count: 2, color: Math.random() < 0.5 ? '#21e6ff' : '#ffe11a',
          speed: 150, dir: Math.PI * 0.5, spread: 0.5, life: 0.4, size: 5,
          gravity: -60, drag: 2.4,
        });
      }
    }
  }

  _updateGround(dt, input, realDt) {
    // Throttle: hold to boost (needed to outrun crumbling bridges).
    this.boosting = !!(input && input.held);
    const target = this.boosting ? this.effSpeed * 1.7 : this.effSpeed;
    const rate = this.boosting ? 3.5 : 1.5;
    this.vx += (target - this.vx) * Math.min(1, dt * rate);
    this.x += this.vx * dt;

    // Lateral steering on the ground: you can slide the cat left/right BEFORE a
    // ramp to pre-pick your line. `groundTargetZ` is set by the game from the
    // live pointer (or keys); the cat eases toward it and leans into the turn.
    const gz = (this.groundTargetZ != null) ? this.groundTargetZ : 0;
    this.z += (gz - this.z) * Math.min(1, (realDt || dt) * 22);
    this.leanZ = this.z;                        // render reads this for the tilt

    const gy = this.terrain.heightAt(this.x);
    this.y = gy - this.rideOffset;
    // A pogo doesn't glide along the ground, it hops. Lift the rider on a
    // rectified sine so he's airborne most of the time and only kisses the
    // deck at the bottom of each bounce.
    const hop = this.veh.hop;
    if (hop) this.y -= Math.abs(Math.sin(this.bobPhase * hop.rate)) * hop.amp;
    // The jetpack never touches down at all — it floats a fixed height above
    // the course and breathes up and down on its thrust.
    const hov = this.veh.hover;
    if (hov) this.y -= hov.height + Math.sin(this.bobPhase * hov.rate) * hov.bob;
    // Align to slope, with a little residual stumble shake.
    const slope = this.terrain.slopeAt(this.x);
    this.stumble *= Math.max(0, 1 - dt * 4);
    // Lean into the turn: a small bank proportional to how far off-centre he is.
    const bank = Math.max(-0.32, Math.min(0.32, (this.z / 150) * 0.32));
    this.angle = slope + this.stumble - bank;
    // Advance the push/pump cycle by distance travelled.
    this.bobPhase += Math.abs(this.vx) * dt * 0.02;
  }

  _updateQuiz(dt, input, veh, realDt) {
    // In the air, the cat slides LATERALLY across the track (z) to fly into the
    // correct word. `steerTargetZ` is set by the game every frame — from the
    // live pointer (absolute: the cat tracks your finger) or from the keyboard.
    // The arc (gravity) still plays out underneath.
    const lay = this.level._layout;
    const fallback = lay ? lay.shift + input.keySteer * lay.zmax
                         : Z_SHIFT + input.keySteer * Z_REACH;
    const targetZ = (this.steerTargetZ != null) ? this.steerTargetZ : fallback;
    // VERY responsive: the cat should feel stuck to your finger. Steering eases
    // on REAL time (realDt), not the slow-mo dt — during the word window dt is
    // scaled down hard, which is exactly why dragging the cat felt sluggish.
    const rate = Math.max(26, (this.veh.steerRate || 10) * 2.2);
    this.z += (targetZ - this.z) * Math.min(1, (realDt || dt) * rate);

    // Finger height flies the cat directly (game sets flyTargetY from the
    // live pointer). Gravity only runs while no finger is down, so you can
    // swipe him straight up into a word.
    if (this.flyTargetY != null) {
      this.y += (this.flyTargetY - this.y) * Math.min(1, (realDt || dt) * 12);
      this.vy = 0;
    } else {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;
    }

    // Bank toward the direction of travel for readability.
    const dir = Math.max(-1, Math.min(1, (targetZ - this.z) / 40));
    this.angle += (dir * 0.28 - this.angle) * Math.min(1, dt * 10);
  }

  _updateAir(dt, veh) {
    // Advance the flip animation clock while spinning (slows with bullet-time dt).
    if (this.spinning) this.trickTime += dt;
    // Slight steer authority for style; not required to land.
    if (!this.answered) {
      const steer = input?.steer || 0;
      this.vx += steer * 400 * dt;
    }
    this.vy += this.gravity * dt;
    if (this.vy > PHYS.maxFall) this.vy = PHYS.maxFall;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += (0 - this.z) * Math.min(1, dt * 3);   // drift back to centre
    this.angle += this.angularVel * dt;
    this.angularVel *= Math.max(0, 1 - dt * 0.6);

    // Air trail sparkle.
    this.particles.spawn(this.x, this.y, {
      count: 1, color: this.spinning ? '#21e6ff' : 'rgba(255,255,255,0.5)',
      speed: 30, life: 0.3, size: 3, gravity: 0, drag: 2,
    });
  }

  // Has the cat touched down this frame? Returns landing info or null.
  checkLanding() {
    if (this.mode === 'ground') return null;
    // Rest height must include the hover offset, or a jetpack would "land"
    // at wheel height and snap down through its own cruising altitude.
    const hov = this.veh.hover;
    const gy = this.terrain.heightAt(this.x) - this.rideOffset - (hov ? hov.height : 0);
    if (this.y >= gy && this.vy >= 0) {
      this.y = gy;
      const clean = this.cleanLanding;
      this.mode = 'ground';
      this.vy = 0;
      this.z = 0;
      this.angularVel = 0;
      this.angle = this.terrain.slopeAt(this.x);
      if (clean) {
        this.vx = Math.max(this.vx, this.effSpeed * 1.05);
        this.squash = 0.84;                 // crisp little impact squash
        this.particles.burst(this.x, this.y + this.rideOffset, '#b6ff2b', 16);
      } else {
        this.vx = this.effSpeed * 0.5;      // land like shit -> lose speed
        this.stumble = 0.5;
        this.squash = 0.68;                 // heavier squash on a sloppy landing
        this.particles.burst(this.x, this.y + this.rideOffset, '#ff2fb9', 22);
      }
      // Landing off a real trick starts the compress/roll-away beat (the
      // renderer plays TRICK_LAND frames 4-7 against this clock).
      this.landAnimT = (this.spinning && clean) ? 0 : null;
      this.spinning = false;
      this.wobble = 0;
      return { clean };
    }
    return null;
  }
}
