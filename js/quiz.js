// ===========================================================================
// quiz.js — the in-air word challenge (3D perspective version).
//
// On a quiz-ramp launch, several Spanish word BUBBLES appear in the world at
// the apex height, spread ACROSS the track (lateral z). The player steers the
// cat laterally in the air to fly into the correct one. Bubbles are positioned
// in world coords {s, worldY, z}; the renderer projects them.
// ===========================================================================

// Lateral geometry of the word row, shared with player.js so the rider's
// steering reach and the bubble spread can never drift out of sync.
export const Z_SHIFT = 110;   // row centre, nudged right over the track
export const Z_REACH = 215;   // how far full steer carries the rider from centre

export class Quiz {
  constructor(particles) {
    this.particles = particles;
    this.active = false;
    this.bubbles = [];
    this.question = null;
    this.linger = 0;
    this.time = 0;
    this.resolved = null;
    this.hitZ = 80;
  }

  // `minWorldY` (optional) is a projection-derived line from game.js: the
  // highest world Y (smaller = higher) the row may sit at and still render
  // fully below the HUD and prompt. It's a world-Y line, NOT a height above the
  // launch — the launch happens on a ramp lip that is itself well above the
  // ground, so a height-based cap silently under-constrained the row.
  // `layout` (optional) is computed by game.js from the live viewport:
  // { zmax, radius, shift }. Without it the row is laid out in fixed world
  // units, which collapses on a narrow screen — see _answerLayout().
  start(question, player, minWorldY, layout) {
    this.question = question;
    this.active = true;
    this.linger = 0;
    this.resolved = null;
    this.time = 0;

    const n = question.options.length;
    // Spread the row so bubbles never touch (4-choice levels need more room),
    // but never wider than the rider can actually steer.
    // Screen-derived layout when game.js supplies one, else the desktop
    // defaults. The old fixed-world numbers put three 70px bubbles inside a
    // 49px span on a 375px phone — they overlapped almost completely.
    const zmax = layout ? layout.zmax : Math.min(Z_REACH, 78 * (n - 1));
    const zShift = layout ? layout.shift : Z_SHIFT;
    const radius = layout ? layout.radius : (n >= 4 ? 40 : 46);
    // Catch radius must never reach past the midpoint to the next bubble, or a
    // 4-choice row would score a word the player didn't actually fly into.
    const spacing = n > 1 ? (2 * zmax) / (n - 1) : 1e9;
    this.hitZ = Math.min(80, spacing * 0.46);
    // Word row height. Normally the apex — the rider arrives there at the TOP
    // of the arc, which is the moment they have the most time to read. Big
    // launches (BMX) and short browser windows would push the row up under the
    // HUD, so it's capped: by a world-space ceiling, and by `maxUp`, which the
    // renderer derives from the actual screen so nothing can ever overlap the
    // prompt. The rider still passes through a lowered row on the way up.
    const MAX_UP = 430;
    const up = Math.min(player.apexHeight, MAX_UP);
    // Never let the row go above the renderer's safe line, and never push it so
    // low the rider reaches it before the word is readable.
    let worldY = Math.max(
      player.launchY - up,
      Math.min(minWorldY ?? -Infinity, player.launchY - 120),
    );
    // Lift the row toward the top of the safe band so the words sit high on
    // screen rather than dead-centre (config VIEW.rowRaise). minWorldY is the
    // highest allowed line, so blending toward it raises the row.
    const raise = layout ? (layout.raise ?? 0) : 0;
    if (raise > 0 && minWorldY != null) worldY += (minWorldY - worldY) * raise;
    this.bubbles = question.options.map((opt, i) => ({
      es: opt.es,
      correct: opt.correct,
      tag: !!opt.tag,                 // English option -> drawn as a tag, not a ball
      review: !!question.review,      // a word you owed — worth double
      s: player.launchX,                                  // same forward slice as launch
      worldY,
      z: zShift + (n > 1 ? (-zmax + (i / (n - 1)) * 2 * zmax) : 0),
      r: radius,
      bobPhase: i * 1.7,
      hit: false,
      reveal: false,
      scale: 0,
    }));
  }

  update(realDt, player, onResolve) {
    this.time += realDt;
    for (const b of this.bubbles) b.scale += (1 - b.scale) * Math.min(1, realDt * 12);

    if (this.active) {
      // Fly into a bubble: match its height (arc) and lateral position (steer).
      for (const b of this.bubbles) {
        if (Math.abs(player.y - b.worldY) < 85 && Math.abs(player.z - b.z) < this.hitZ) {
          this._resolve(b, player, onResolve);
          break;
        }
      }
      if (this.active && player.mode === 'ground') this._resolveMiss(player, onResolve);
    } else if (this.bubbles.length) {
      this.linger -= realDt;
      if (this.linger <= 0) this.bubbles = [];
    }
  }

  // Answer a specific bubble directly (tap-to-answer). Same path as flying in.
  resolveTo(bubble, player, onResolve) {
    if (!this.active) return;
    this._resolve(bubble, player, onResolve);
  }

  _resolve(bubble, player, onResolve) {
    bubble.hit = true;
    this.active = false;
    this.linger = 0.5;
    this.resolved = { correct: bubble.correct };
    for (const b of this.bubbles) if (b.correct) b.reveal = true;

    player.resolveAnswer(bubble.correct);
    // Feedback burst near the cat (screen-projected by the renderer).
    if (bubble.correct) this.particles.confetti(player.x, player.y);
    else this.particles.burst(player.x, player.y, '#ff2fb9', 20);
    onResolve(bubble.correct);
  }

  _resolveMiss(player, onResolve) {
    this.active = false;
    this.linger = 0.4;
    this.resolved = { correct: false };
    for (const b of this.bubbles) if (b.correct) b.reveal = true;
    onResolve(false);
  }

  clear() {
    this.active = false;
    this.bubbles = [];
    this.question = null;
  }
}
