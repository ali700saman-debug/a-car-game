import * as THREE from "three";
import { KURDISTAN_THEME } from "../art/kurdistanTheme.js";
import { applyWavingToMaterial, makeWavingFlagMaterial, tickWavingMaterial } from "../art/kurdistanFlag.js";

export class RaceTrack {
  constructor({ scene, settings }) {
    this.scene = scene;
    this.settings = settings;

    this.meshes = [];
    this.solidAabbs = [];
    this.checkpoints = [];
    this.centerline = [];
    this.start = { x: 0, y: 0.9, z: 0, yaw: 0 };
    this._flagMat = null;
  }

  destroy() {
    for (const m of this.meshes) {
      this.scene.remove(m);
      m.geometry?.dispose?.();
      if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose?.());
      else m.material?.dispose?.();
    }
    this.meshes = [];
    this.solidAabbs = [];
    this.checkpoints = [];
    this.centerline = [];
    this._flagMat = null;
  }

  build() {
    this.destroy();

    // Cartoon/semi-realistic race circuit: rounded rectangle loop
    const trackY = 0.012;
    const markingY = 0.03;
    const curbY = 0.022;

    const asphalt = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.95, metalness: 0.02 });
    const grass = new THREE.MeshStandardMaterial({ color: 0x43d17a, roughness: 0.95, metalness: 0.01 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.05 });
    const curbMat1 = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.65, metalness: 0.02 });
    const curbMat2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.02 });
    const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

    // Kurdistan flags near start (visual theme, cheap)
    const themeOn = this.settings?.kurdistanTheme !== false;
    if (themeOn) {
      const poleMat = new THREE.MeshStandardMaterial({ color: KURDISTAN_THEME.poleMetal, roughness: 0.55, metalness: 0.35 });
      const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 6.0, 10);
      const flagMat = makeWavingFlagMaterial();
      applyWavingToMaterial(flagMat, { amplitude: 0.07, speed: 1.35 });
      this._flagMat = flagMat;
      const flagGeo = new THREE.PlaneGeometry(2.2, 1.25, 14, 6);
      const mkPole = (x, z, rotY) => {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 3.0, z);
        pole.castShadow = true;
        this.scene.add(pole);
        this.meshes.push(pole);
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(x + Math.cos(rotY) * 1.15, 4.15, z - Math.sin(rotY) * 1.15);
        flag.rotation.y = rotY;
        this.scene.add(flag);
        this.meshes.push(flag);
      };
      mkPole(-10, -150, 0);
      mkPole(10, -150, Math.PI);
      mkPole(-10, -130, 0);
      mkPole(10, -130, Math.PI);
    }

    // Base grass field
    const field = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), grass);
    field.rotation.x = -Math.PI / 2;
    field.position.y = 0;
    field.receiveShadow = true;
    this.scene.add(field);
    this.meshes.push(field);

    // Track shape params
    const halfW = 260;
    const halfH = 170;
    const radius = 90;
    const roadWidth = 26;

    // Centerline points (for bots + checkpoints)
    this.centerline = this._makeRoundedRectPath(halfW, halfH, radius, 64);

    // Road mesh from tube-like segments (planes)
    for (let i = 0; i < this.centerline.length; i++) {
      const a = this.centerline[i];
      const b = this.centerline[(i + 1) % this.centerline.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz);

      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, len), asphalt);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = yaw;
      road.position.set((a.x + b.x) / 2, trackY, (a.z + b.z) / 2);
      road.receiveShadow = true;
      this.scene.add(road);
      this.meshes.push(road);

      // center line dash
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, len), markMat);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = yaw;
      line.position.set((a.x + b.x) / 2, markingY, (a.z + b.z) / 2);
      this.scene.add(line);
      this.meshes.push(line);

      // Curbs (two strips)
      const curb1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, len), i % 2 === 0 ? curbMat1 : curbMat2);
      curb1.rotation.x = -Math.PI / 2;
      curb1.rotation.z = yaw;
      const nx = Math.sin(yaw + Math.PI / 2);
      const nz = Math.cos(yaw + Math.PI / 2);
      curb1.position.set((a.x + b.x) / 2 + nx * (roadWidth / 2), curbY, (a.z + b.z) / 2 + nz * (roadWidth / 2));
      this.scene.add(curb1);
      this.meshes.push(curb1);

      const curb2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, len), i % 2 === 0 ? curbMat2 : curbMat1);
      curb2.rotation.x = -Math.PI / 2;
      curb2.rotation.z = yaw;
      curb2.position.set((a.x + b.x) / 2 - nx * (roadWidth / 2), curbY, (a.z + b.z) / 2 - nz * (roadWidth / 2));
      this.scene.add(curb2);
      this.meshes.push(curb2);
    }

    // Barriers around track (AABB colliders)
    const barrierH = 2.6;
    const barrierT = 1.0;
    // Outer rectangle
    this._addBarrierBox(0, barrierH / 2, -(halfH + radius + roadWidth / 2 + 8), halfW * 2 + radius * 2 + 120, barrierH, barrierT, barrierMat);
    this._addBarrierBox(0, barrierH / 2, halfH + radius + roadWidth / 2 + 8, halfW * 2 + radius * 2 + 120, barrierH, barrierT, barrierMat);
    this._addBarrierBox(-(halfW + radius + roadWidth / 2 + 8), barrierH / 2, 0, barrierT, barrierH, halfH * 2 + radius * 2 + 120, barrierMat);
    this._addBarrierBox(halfW + radius + roadWidth / 2 + 8, barrierH / 2, 0, barrierT, barrierH, halfH * 2 + radius * 2 + 120, barrierMat);

    // Start/finish line
    const startLine = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, markingY + 0.002, -halfH + 8);
    this.scene.add(startLine);
    this.meshes.push(startLine);

    // Checkpoint gates (rings)
    const cpCount = 8;
    this.checkpoints = [];
    for (let i = 0; i < cpCount; i++) {
      const t = Math.floor((i / cpCount) * this.centerline.length);
      const p = this.centerline[t];
      this.checkpoints.push({ x: p.x, z: p.z, r: 16 });
      const gate = new THREE.Mesh(
        new THREE.RingGeometry(6.8, 7.6, 38),
        new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.35 })
      );
      gate.rotation.x = -Math.PI / 2;
      gate.position.set(p.x, 0.05, p.z);
      this.scene.add(gate);
      this.meshes.push(gate);
    }

    // Start pose
    this.start = { x: 0, y: 0.9, z: -halfH + 18, yaw: 0 };
  }

  tick(t) {
    if (this._flagMat) tickWavingMaterial(this._flagMat, t);
  }

  _addBarrierBox(x, y, z, w, h, l, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.meshes.push(mesh);

    this.solidAabbs.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - l / 2, maxZ: z + l / 2 });
  }

  _makeRoundedRectPath(halfW, halfH, r, segmentsPerCorner = 20) {
    const pts = [];
    const addArc = (cx, cz, a0, a1) => {
      for (let i = 0; i <= segmentsPerCorner; i++) {
        const t = i / segmentsPerCorner;
        const a = a0 + (a1 - a0) * t;
        pts.push({ x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r });
      }
    };
    // Top (positive z)
    addArc(halfW, halfH, 0, Math.PI / 2);
    addArc(-halfW, halfH, Math.PI / 2, Math.PI);
    addArc(-halfW, -halfH, Math.PI, Math.PI * 1.5);
    addArc(halfW, -halfH, Math.PI * 1.5, Math.PI * 2);
    return pts;
  }
}

