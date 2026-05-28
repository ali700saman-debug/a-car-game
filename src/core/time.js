export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(current, target, lambda, dt) {
  // Critically damped interpolation (frame-rate independent)
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export class Clock {
  constructor() {
    this._last = performance.now();
    this.dt = 0;
    this.time = 0;
  }
  tick(maxDt = 1 / 20) {
    const now = performance.now();
    const raw = (now - this._last) / 1000;
    this._last = now;
    this.dt = Math.min(maxDt, Math.max(0, raw));
    this.time += this.dt;
    return this.dt;
  }
}

