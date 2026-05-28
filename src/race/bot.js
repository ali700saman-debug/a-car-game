import * as THREE from "three";
import { clamp } from "../core/time.js";

export class RaceBot {
  constructor({ car, colorId, speedMul = 1.0 }) {
    this.car = car;
    this.colorId = colorId;
    this.speedMul = speedMul;

    this.cpIndex = 0;
    this.lap = 0;
    this.done = false;

    this._targetIdx = 0;
  }

  setStart({ x, y, z, yaw }) {
    this.car.setColorId(this.colorId);
    this.car.spawn({ x, y, z, yaw });
    this.cpIndex = 0;
    this.lap = 0;
    this.done = false;
    this._targetIdx = 0;
  }

  tick({ dt, centerline, checkpoints, solids }) {
    if (this.done) return;
    const pos = this.car.drive.pos;

    // Pick a target point ahead
    const n = centerline.length;
    const lookAhead = 10 + clamp(Math.abs(this.car.drive.speed) / 18, 0, 10);
    const ti = (this._targetIdx + Math.floor(lookAhead)) % n;
    const target = centerline[ti];
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const desiredYaw = Math.atan2(dx, dz);
    let err = desiredYaw - this.car.drive.yaw;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;

    // Simple steering controller
    const steer = clamp(err * 1.4, -1, 1);

    // Throttle based on curvature (slow down on sharp turns)
    const curvature = Math.min(1, Math.abs(err) / 1.2);
    const baseThrottle = 0.9 - curvature * 0.55;
    const throttle = clamp(baseThrottle * this.speedMul, 0.2, 1);

    // Small braking if very off-line
    const brake = curvature > 0.85 ? (curvature - 0.85) * 1.6 : 0;

    this.car.applyControls({ steer, throttle, brake, reverse: 0 }, dt, solids);
    this.car.syncVisuals();

    // Progress along centerline (advance target index when close)
    if (dx * dx + dz * dz < 14 * 14) this._targetIdx = (this._targetIdx + 1) % n;

    // Checkpoints
    const cp = checkpoints[this.cpIndex];
    if (cp) {
      const dd = (pos.x - cp.x) * (pos.x - cp.x) + (pos.z - cp.z) * (pos.z - cp.z);
      if (dd <= cp.r * cp.r) {
        this.cpIndex++;
        if (this.cpIndex >= checkpoints.length) this.cpIndex = checkpoints.length - 1;
      }
    }
  }

  score(checkpointCount) {
    return this.lap * checkpointCount + this.cpIndex;
  }
}

