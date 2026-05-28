import * as THREE from "three";
import { clamp } from "../core/time.js";

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.max = 420;
    this.alive = 0;

    this.positions = new Float32Array(this.max * 3);
    this.velocities = new Float32Array(this.max * 3);
    this.lifetimes = new Float32Array(this.max);
    this.colors = new Float32Array(this.max * 3);
    this.sizes = new Float32Array(this.max);

    this.geom = new THREE.BufferGeometry();
    this.geom.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geom.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.geom.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));

    // PointsMaterial doesn't support per-point size without shader; keep it simple + cheap.
    this.mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geom, this.mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  destroy() {
    this.scene.remove(this.points);
    this.geom.dispose();
    this.mat.dispose();
  }

  _emitOne({ x, y, z, vx, vy, vz, life, r, g, b }) {
    const i = this.alive;
    if (i >= this.max) return false;
    const p = i * 3;
    this.positions[p + 0] = x;
    this.positions[p + 1] = y;
    this.positions[p + 2] = z;
    this.velocities[p + 0] = vx;
    this.velocities[p + 1] = vy;
    this.velocities[p + 2] = vz;
    this.colors[p + 0] = r;
    this.colors[p + 1] = g;
    this.colors[p + 2] = b;
    this.lifetimes[i] = life;
    this.alive++;
    return true;
  }

  burstCrash(pos, intensity01 = 0.5) {
    const n = Math.floor(22 + 42 * clamp(intensity01, 0, 1));
    for (let i = 0; i < n; i++) {
      const sp = rand(2.5, 7.5) * (0.6 + intensity01);
      const yaw = rand(0, Math.PI * 2);
      const up = rand(0.2, 1.0);
      const vx = Math.cos(yaw) * sp;
      const vz = Math.sin(yaw) * sp;
      const vy = sp * up;
      const life = rand(0.35, 0.8);
      // sparks: warm
      this._emitOne({
        x: pos.x + rand(-0.35, 0.35),
        y: pos.y + rand(0.15, 0.65),
        z: pos.z + rand(-0.35, 0.35),
        vx,
        vy,
        vz,
        life,
        r: 1.0,
        g: rand(0.55, 0.9),
        b: rand(0.12, 0.25),
      });
    }
    this._markDirty();
  }

  burstWin(pos) {
    const n = 110;
    for (let i = 0; i < n; i++) {
      const sp = rand(1.8, 6.2);
      const yaw = rand(0, Math.PI * 2);
      const vx = Math.cos(yaw) * sp;
      const vz = Math.sin(yaw) * sp;
      const vy = rand(3.2, 9.8);
      const life = rand(0.8, 1.35);
      // confetti: cool
      this._emitOne({
        x: pos.x + rand(-1.0, 1.0),
        y: pos.y + rand(0.2, 1.1),
        z: pos.z + rand(-1.0, 1.0),
        vx,
        vy,
        vz,
        life,
        r: rand(0.2, 0.5),
        g: rand(0.65, 1.0),
        b: rand(0.8, 1.0),
      });
    }
    this._markDirty();
  }

  _markDirty() {
    this.geom.attributes.position.needsUpdate = true;
    this.geom.attributes.color.needsUpdate = true;
  }

  tick(dt) {
    if (this.alive === 0) return;
    const g = -9.0;

    let write = 0;
    for (let i = 0; i < this.alive; i++) {
      let life = this.lifetimes[i] - dt;
      if (life <= 0) continue;

      const pi = i * 3;
      const wi = write * 3;

      // integrate
      let vx = this.velocities[pi + 0];
      let vy = this.velocities[pi + 1] + g * dt;
      let vz = this.velocities[pi + 2];
      vx *= 0.98;
      vy *= 0.98;
      vz *= 0.98;

      let x = this.positions[pi + 0] + vx * dt;
      let y = this.positions[pi + 1] + vy * dt;
      let z = this.positions[pi + 2] + vz * dt;

      // simple bounce off ground plane
      if (y < 0.05) {
        y = 0.05;
        vy *= -0.35;
        vx *= 0.75;
        vz *= 0.75;
      }

      // compact in-place
      this.positions[wi + 0] = x;
      this.positions[wi + 1] = y;
      this.positions[wi + 2] = z;
      this.velocities[wi + 0] = vx;
      this.velocities[wi + 1] = vy;
      this.velocities[wi + 2] = vz;
      this.colors[wi + 0] = this.colors[pi + 0];
      this.colors[wi + 1] = this.colors[pi + 1];
      this.colors[wi + 2] = this.colors[pi + 2];
      this.lifetimes[write] = life;
      write++;
    }

    this.alive = write;
    this.geom.setDrawRange(0, this.alive);
    this._markDirty();
  }
}

