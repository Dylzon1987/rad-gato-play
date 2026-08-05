// ===========================================================================
// particles.js — lightweight particle system for juice (trails, confetti,
// impact bursts). Everything lives in world space and is drawn by render.js.
// ===========================================================================

export class Particles {
  constructor() {
    this.list = [];
  }

  spawn(x, y, opts = {}) {
    const {
      count = 1,
      color = '#fff',
      speed = 200,
      spread = Math.PI * 2,
      dir = 0,
      life = 0.6,
      size = 4,
      gravity = 900,
      drag = 1,
      shape = 'square',
    } = opts;

    for (let i = 0; i < count; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const sp = speed * (0.5 + Math.random() * 0.8);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * (0.7 + Math.random() * 0.6),
        maxLife: life,
        color,
        size: size * (0.6 + Math.random() * 0.8),
        gravity,
        drag,
        shape,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  burst(x, y, color, count = 18) {
    this.spawn(x, y, { count, color, speed: 380, life: 0.7, size: 6, gravity: 1200 });
  }

  confetti(x, y) {
    const colors = ['#ff2fb9', '#21e6ff', '#b6ff2b', '#ffe11a', '#a12bff', '#ff7a1a'];
    for (let i = 0; i < 34; i++) {
      this.spawn(x, y, {
        count: 1,
        color: colors[i % colors.length],
        speed: 520,
        spread: Math.PI * 2,
        life: 1.1,
        size: 8,
        gravity: 1100,
        drag: 1.4,
        shape: 'rect',
      });
    }
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  clear() { this.list.length = 0; }
}
