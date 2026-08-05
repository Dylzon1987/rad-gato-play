// ===========================================================================
// input.js — keyboard + touch/mouse, unified.
//
// Two ways to answer, both handled here as raw signals the game interprets:
//
//   DRAG THE CAT   the cat tracks your finger/cursor horizontally (absolute,
//                  not relative) so it feels like you're holding him. `pointer`
//                  exposes the live position; the game maps it to a track lane.
//   TAP THE WORD   a quick press on a bubble answers it directly. `takeTap()`
//                  hands the game one fresh press to hit-test against the words.
//
// Keyboard (desktop): ← → / A D steer, Space / W / ↑ push. `keySteer` is the
// keyboard-only axis so it never fights the pointer.
//
// Everything is in CLIENT pixels, which equal renderer CSS pixels (the canvas
// is full-window), so the game can compare them to projected positions directly.
// ===========================================================================

const TAP_MOVE_PX = 14;    // a press that moves less than this is a tap, not a drag
const TAP_TIME_MS = 320;   // ...and is released within this long

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.action = false;

    // Live pointer. x/y are client px; active is true while pressed.
    this.pointer = { active: false, x: 0, y: 0 };

    this._downX = 0; this._downY = 0; this._downT = 0; this._moved = 0;
    this._pendingTap = null;   // {x, y} of a completed tap, consumed by takeTap()

    addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key === 'ArrowUp') this.action = true;
    }, { passive: false });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    // stampMs is passed in so this module stays free of Date.now() (which the
    // harness forbids); the game supplies performance.now() via setNow().
    this._now = () => 0;

    const down = (x, y) => {
      this.pointer.active = true;
      this.pointer.x = x; this.pointer.y = y;
      this._downX = x; this._downY = y; this._downT = this._now(); this._moved = 0;
      this.action = true;
    };
    const move = (x, y) => {
      if (!this.pointer.active) return;
      this._moved = Math.max(this._moved, Math.hypot(x - this._downX, y - this._downY));
      this.pointer.x = x; this.pointer.y = y;
    };
    const up = () => {
      if (this.pointer.active &&
          this._moved <= TAP_MOVE_PX &&
          this._now() - this._downT <= TAP_TIME_MS) {
        this._pendingTap = { x: this._downX, y: this._downY };   // it was a tap
      }
      this.pointer.active = false;
    };

    canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; down(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove',  (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend',   (e) => { up(); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchcancel',(e) => { this.pointer.active = false; }, { passive: false });

    canvas.addEventListener('mousedown', (e) => down(e.clientX, e.clientY));
    addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    addEventListener('mouseup', () => up());
  }

  // The game hands us its clock so taps can be time-gated without Date.now().
  setNow(fn) { this._now = fn; }

  // Keyboard-only steering axis (−1..+1). The pointer is handled separately so
  // the two input methods never cancel each other out.
  get keySteer() {
    let k = 0;
    if (this.keys.has('arrowleft') || this.keys.has('a')) k -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) k += 1;
    return k;
  }

  // Legacy combined axis, still used by the light air-steer after an answer.
  get steer() { return this.keySteer; }

  get held() {
    return this.pointer.active ||
      this.keys.has(' ') || this.keys.has('arrowup') || this.keys.has('w');
  }

  // One fresh tap, or null. Read once per frame; clears itself.
  takeTap() {
    const t = this._pendingTap;
    this._pendingTap = null;
    return t;
  }

  consumeAction() {
    const a = this.action;
    this.action = false;
    return a;
  }
}
