// ===========================================================================
// terrain.js — procedural skate course.
//
// The course is a polyline "heightfield": a list of control nodes (x, y) with
// straight segments between them. Mostly flat baseline with periodic KICKER
// ramps. Each kicker ends in a lip flagged as a quiz trigger — riding over it
// launches the skater and (for quiz lips) opens the slow-mo word window.
//
// Terrain is generated lazily as the skater advances, so a run can be any
// length (levels end on score, not distance).
// ===========================================================================

// Which obstacle props dress each world. Keeps the course looking like the
// place it's set instead of always a warehouse.
const PROPSETS = {
  warehouse_a: ['crate', 'tire', 'barrel'],
  warehouse_b: ['crate', 'tire', 'barrel'],
  warehouse_c: ['crate', 'tire', 'barrel'],
  neon_park:   ['cone', 'tire', 'crate'],
  tokyo_alley: ['cone', 'crate', 'tire'],
  rooftop:     ['crate', 'cone', 'tire'],
  subway:      ['tire', 'crate', 'cone'],
  arena:       ['tire', 'barrel', 'cone'],
  carnival:    ['cone', 'tire', 'barrel'],
  canyon:      ['cactus', 'hay', 'tire'],
  skycity:     ['cone', 'crate', 'barrel'],
};

export class Terrain {
  constructor(level, baseY) {
    this.level = level;
    this.baseY = baseY;          // ground line in world Y (px, +down)
    this.nodes = [];             // { x, y }
    this.lips = [];              // { x, angle, quiz, used }
    this.bridges = [];           // collapsing spans: { x0, x1, pitY, triggered, collapsed, t, fallTime }
    this.props = [];             // decorative env props: { x, kind, t (depth 0..1), scale }
    this.ramps = [];             // solid kicker geometry for the renderer: { x0, x1, base, top }
    this.cursor = 0;             // x position of the generator head
    this._featureIndex = 0;

    // Opening flat so the player can settle before the first ramp.
    this._push(-400, baseY);
    this._push(0, baseY);
    this.cursor = 0;
    this.ensure(1600);
  }

  _push(x, y, meta) {
    this.nodes.push({ x, y, ...(meta || {}) });
  }

  // Generate one kicker feature starting at this.cursor.
  _feature() {
    const L = this.level;
    const base = this.baseY;
    const gap = L.rampGap;

    // Flat run-up, then a ramp up to a lip, then a step back to baseline
    // (the step is where the skater leaves the ground).
    const runUp = gap - 190;
    const rampLen = 150;
    const kickerH = (this.level.kicker || 150) + (this._featureIndex % 3) * 22;

    const x0 = this.cursor;

    // Every other feature, the run-up is a CRUMBLING BRIDGE: it collapses into
    // a pit shortly after you roll onto it, so you must boost across in time.
    const be = this.level.bridgeEvery || 2;
    if (this._featureIndex % be === be - 1 && runUp > 260) {
      const bx0 = x0 + 60;
      const bx1 = bx0 + Math.min(320, runUp - 120);
      this.bridges.push({
        x0: bx0, x1: bx1,
        pitY: base + 230,
        triggered: false, collapsed: false, t: 0,
        fallTime: 0.52,        // tuned so base speed drops in but a boost clears it
      });
    }

    const rampX0 = x0 + runUp;
    this._push(rampX0, base);                      // end of flat
    const lipX = rampX0 + rampLen;
    const lipY = base - kickerH;

    // A real kicker is CONCAVE — it leaves the flat with zero slope and curves
    // up to the lip. A single straight segment read as a triangular wedge, so
    // the ramp is emitted as a curve of sub-nodes: h(t) = kickerH * t², whose
    // slope is 0 at the base and steepest at the lip.
    const SEGS = 12;
    for (let i = 1; i <= SEGS; i++) {
      const t = i / SEGS;
      this._push(rampX0 + rampLen * t, base - kickerH * t * t);
    }

    // Launch angle is the curve's tangent AT the lip, not the wedge's average.
    const angle = Math.atan2(2 * kickerH, rampLen);
    this.lips.push({ x: lipX, angle, quiz: true, used: false });
    this.ramps.push({ x0: rampX0, x1: lipX, base, top: lipY, kickerH });

    // Step back down to baseline just past the lip.
    this._push(lipX + 8, base);

    // Scatter obstacles down the run-up. Each world has its own prop set
    // (canyon gets cactus + hay, carnival gets cones, …) so the course dresses
    // itself to the level instead of always looking like a warehouse. Density
    // is up from the old 1-2: the track feels populated now.
    const kinds = (L.props && L.props.length) ? L.props
                : (PROPSETS[L.bg] || ['crate', 'tire', 'barrel']);
    const nProps = 2 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
    for (let i = 0; i < nProps; i++) {
      // Fully OFF the ride surface: the old 0.28 offset put cones ON the track
      // (and sometimes inside the ramp), which read as broken. 0.46+ keeps every
      // prop beyond the lane edge, dressing the course instead of blocking it.
      const edge = Math.random() < 0.5 ? -1 : 1;
      const t = 0.5 + edge * (0.46 + Math.random() * 0.34);
      this.props.push({
        x: x0 + 70 + Math.random() * Math.max(80, runUp - 120),
        kind: kinds[Math.floor(Math.random() * kinds.length)],
        t,                                   // lateral placement (0..1 across width)
        scale: 0.7 + Math.random() * 0.5,    // tamer sizes — cones were cat-sized
      });
    }

    this.cursor = lipX + 8;
    this._featureIndex++;
  }

  // Make sure terrain exists at least up to worldX (+ margin).
  ensure(worldX) {
    let guard = 0;
    while (this.cursor < worldX + 1400 && guard++ < 500) {
      this._feature();
    }
  }

  // Ground height at world X, including any collapsed bridges (which sag into
  // a pit with sloped edges so the skater drops in and can ride back out).
  heightAt(x) {
    let h = this._nodeHeightAt(x);
    for (const b of this.bridges) {
      if (b.collapsed && x > b.x0 && x < b.x1) {
        const edge = 46;
        let drop = 1;
        if (x < b.x0 + edge) drop = (x - b.x0) / edge;
        else if (x > b.x1 - edge) drop = (b.x1 - x) / edge;
        drop = Math.max(0, Math.min(1, drop));
        h += (b.pitY - h) * drop;
      }
    }
    return h;
  }

  // Linear-interpolated ground height from the terrain nodes only.
  _nodeHeightAt(x) {
    const n = this.nodes;
    if (x <= n[0].x) return n[0].y;
    // Most queries are near the front; linear scan from the end is fine
    // because we prune old nodes.
    for (let i = 1; i < n.length; i++) {
      if (x <= n[i].x) {
        const a = n[i - 1], b = n[i];
        const t = (x - a.x) / (b.x - a.x || 1);
        return a.y + (b.y - a.y) * t;
      }
    }
    return n[n.length - 1].y;
  }

  // Ground slope angle (radians) at world X — used to align the skater.
  slopeAt(x) {
    const h1 = this.heightAt(x - 6);
    const h2 = this.heightAt(x + 6);
    return Math.atan2(h2 - h1, 12);
  }

  // Return an unused quiz lip the skater just crossed, else null.
  crossedLip(prevX, x) {
    for (const lip of this.lips) {
      if (!lip.used && prevX < lip.x && x >= lip.x) {
        return lip;
      }
    }
    return null;
  }

  // Drop nodes/lips fully behind the camera to keep arrays small.
  prune(minX) {
    while (this.nodes.length > 3 && this.nodes[1].x < minX) {
      this.nodes.shift();
    }
    this.lips = this.lips.filter((l) => l.x > minX - 200);
    this.bridges = this.bridges.filter((b) => b.x1 > minX - 200);
    this.props = this.props.filter((p) => p.x > minX - 300);
    this.ramps = this.ramps.filter((r) => r.x1 > minX - 300);
  }
}
