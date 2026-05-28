import * as THREE from "three";
import { clamp } from "../core/time.js";

function closestPointAabbXZ(px, pz, a) {
  const x = Math.max(a.minX, Math.min(a.maxX, px));
  const z = Math.max(a.minZ, Math.min(a.maxZ, pz));
  return { x, z };
}

export class ArcadeDrive {
  constructor() {
    this.pos = new THREE.Vector3(0, 0.9, 0);
    this.yaw = 0;
    this.speed = 0; // m/s, signed
    this.wheelSpin = 0;
    this.steerAngle = 0; // radians (visual + steering)

    // Tunables (stable arcade feel)
    // Target: ~220–280 km/h top speed
    this.maxFwd = 76; // m/s (~274 km/h)
    this.maxRev = 22; // m/s (~79 km/h)
    this.accel = 17.5; // m/s^2
    this.brake = 24.0; // m/s^2
    this.drag = 2.9; // m/s^2 at full speed scale
    this.turnRate = THREE.MathUtils.degToRad(135); // rad/s at low speed

    this.radius = 1.25; // collision footprint radius (XZ)

    this._hitCooldown = 0;
    this._hitFlag = false;
  }

  applyTuning(stats) {
    if (!stats) return;
    if (typeof stats.maxFwd === "number") this.maxFwd = stats.maxFwd;
    if (typeof stats.maxRev === "number") this.maxRev = stats.maxRev;
    if (typeof stats.accel === "number") this.accel = stats.accel;
    if (typeof stats.brake === "number") this.brake = stats.brake;
    if (typeof stats.drag === "number") this.drag = stats.drag;
    if (typeof stats.turnRateDeg === "number") this.turnRate = THREE.MathUtils.degToRad(stats.turnRateDeg);
  }

  setPose({ x, y, z, yaw }) {
    this.pos.set(x, y, z);
    this.yaw = yaw;
    this.speed = 0;
  }

  tick(input, dt, solids) {
    // Inputs
    let throttle = clamp(input.throttle || 0, 0, 1);
    let brake = clamp(input.brake || 0, 0, 1);
    let reverse = clamp(input.reverse || 0, 0, 1);
    const steer = clamp(input.steer || 0, -1, 1);

    // GAS + BRAKE = neutral hold
    if (throttle > 0.05 && brake > 0.05) {
      throttle = 0;
      reverse = 0;
      brake = 1.0;
    }

    // Target acceleration
    const goingFwd = this.speed >= 0;
    const wantFwd = throttle > 0.05;
    const wantRev = reverse > 0.05;

    // Direction change: if trying opposite, treat as braking
    if (wantFwd && this.speed < -0.6) {
      brake = Math.max(brake, throttle);
      throttle = 0;
    }
    if (wantRev && this.speed > 0.9) {
      brake = Math.max(brake, reverse);
      reverse = 0;
    }

    // Apply accel/brake
    if (throttle > 0.01) {
      this.speed += this.accel * throttle * dt;
    } else if (reverse > 0.01) {
      this.speed -= this.accel * 0.85 * reverse * dt;
    }

    if (brake > 0.01) {
      const sign = this.speed === 0 ? 0 : Math.sign(this.speed);
      const dec = this.brake * brake * dt;
      const next = Math.abs(this.speed) - dec;
      this.speed = next <= 0 ? 0 : sign * next;
    }

    // Drag / rolling resistance (always) + mild extra top-speed limiter
    const v01 = clamp(Math.abs(this.speed) / this.maxFwd, 0, 1);
    const drag = this.drag * (0.18 + 0.82 * v01) + 3.2 * v01 * v01;
    const sign = this.speed === 0 ? 0 : Math.sign(this.speed);
    const next = Math.abs(this.speed) - drag * dt;
    this.speed = next <= 0 ? 0 : sign * next;

    // Clamp speeds
    this.speed = clamp(this.speed, -this.maxRev, this.maxFwd);

    // Steering: weaker at high speed, zero when stopped
    const speed01 = clamp(Math.abs(this.speed) / this.maxFwd, 0, 1);
    const steerStrength =
      (1 - 0.85 * speed01) * (0.25 + 0.75 * clamp(Math.abs(this.speed) / 3.0, 0, 1));
    // Visual steer angle (front wheels)
    const maxSteer = THREE.MathUtils.degToRad(28) * (1 - 0.75 * speed01);
    const targetSteer = steer * maxSteer;
    this.steerAngle += (targetSteer - this.steerAngle) * (1 - Math.exp(-10 * dt));

    // Apply yaw (lock direction to input)
    this.yaw += (this.steerAngle / maxSteer || 0) * this.turnRate * steerStrength * dt;

    // Proposed movement
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const step = fwd.multiplyScalar(this.speed * dt);
    const proposed = this.pos.clone().add(step);

    // Collisions: resolve against visible major solids only (XZ circle vs AABB)
    this._hitFlag = false;
    const resolved = this._resolveCircleAabb(proposed, solids);
    this.pos.copy(resolved.pos);
    if (resolved.hit && this._hitCooldown <= 0 && Math.abs(this.speed) > 6.0) {
      this._hitFlag = true;
      this._hitCooldown = 0.22;
      // Lose a bit of speed on impact
      this.speed *= 0.65;
    }
    this._hitCooldown = Math.max(0, this._hitCooldown - dt);

    // Wheel spin visual
    this.wheelSpin += (this.speed / 0.42) * dt;
  }

  consumeHit() {
    const h = this._hitFlag;
    this._hitFlag = false;
    return h;
  }

  _resolveCircleAabb(proposed, solids) {
    let px = proposed.x;
    let pz = proposed.z;
    let hit = false;

    // A few iterations prevents sticking inside corners
    for (let iter = 0; iter < 4; iter++) {
      let pushed = false;
      for (const a of solids) {
        const cp = closestPointAabbXZ(px, pz, a);
        const dx = px - cp.x;
        const dz = pz - cp.z;
        const d2 = dx * dx + dz * dz;
        const r = this.radius;
        if (d2 < r * r) {
          const d = Math.max(0.0001, Math.sqrt(d2));
          const nx = dx / d;
          const nz = dz / d;
          const pen = r - d;
          px += nx * pen;
          pz += nz * pen;
          pushed = true;
          hit = true;
        }
      }
      if (!pushed) break;
    }

    return { pos: new THREE.Vector3(px, proposed.y, pz), hit };
  }
}

