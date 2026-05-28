import * as THREE from "three";
import * as CANNON from "cannon-es";
import { clamp } from "../core/time.js";
import { ArcadeDrive } from "./arcadeDrive.js";
import { getCarById } from "./cars.js";
import { getKurdistanFlagTexture } from "../art/kurdistanFlag.js";
import { KURDISTAN_THEME } from "../art/kurdistanTheme.js";

function disposeObject3D(root) {
  if (!root) return;
  root.traverse?.((obj) => {
    if (obj.geometry?.dispose) obj.geometry.dispose();
    const mat = obj.material;
    if (Array.isArray(mat)) {
      for (const m of mat) {
        if (m?.map?.dispose) m.map.dispose();
        if (m?.normalMap?.dispose) m.normalMap.dispose();
        if (m?.roughnessMap?.dispose) m.roughnessMap.dispose();
        if (m?.metalnessMap?.dispose) m.metalnessMap.dispose();
        if (m?.emissiveMap?.dispose) m.emissiveMap.dispose();
        m?.dispose?.();
      }
    } else if (mat) {
      if (mat.map?.dispose) mat.map.dispose();
      if (mat.normalMap?.dispose) mat.normalMap.dispose();
      if (mat.roughnessMap?.dispose) mat.roughnessMap.dispose();
      if (mat.metalnessMap?.dispose) mat.metalnessMap.dispose();
      if (mat.emissiveMap?.dispose) mat.emissiveMap.dispose();
      mat.dispose?.();
    }
  });
}

const COLOR_HEX = {
  blue: 0x1676ff,
  red: 0xff4d6d,
  black: 0x0e1118,
  white: 0xf5f7ff,
  yellow: 0xffd24b,
  green: 0x43d17a,
  purple: 0x8a5cff,
  silver: 0xb7c7dd,
  orange: 0xff8a3d,
  kurdistan: 0xf4f6fb,
};

export class Car {
  constructor({ physicsWorld, scene }) {
    this.physicsWorld = physicsWorld;
    this.scene = scene;

    this.chassisBody = null;
    this.vehicle = null;
    this.wheelBodies = [];

    this.mesh = null;
    this.wheelMeshes = [];
    this._brakeLights = [];
    this.drive = new ArcadeDrive();
    this.carId = "coupe";
    this.colorId = "blue";
    this.themeEnabled = true;

    this._collisionHits = 0;
    this._lastCrashAt = -Infinity;
  }

  setCarId(id) {
    this.carId = id || "coupe";
    // Rebuild visuals next time we spawn or immediately if mesh exists
    if (this.mesh) {
      const pos = this.drive.pos.clone();
      const yaw = this.drive.yaw;
      this.destroy();
      this.drive.setPose({ x: pos.x, y: pos.y, z: pos.z, yaw });
      this._buildMeshes();
    }
  }

  setColorId(colorId) {
    this.colorId = colorId || "blue";
    if (this.mesh) {
      const pos = this.drive.pos.clone();
      const yaw = this.drive.yaw;
      this.destroy();
      this.drive.setPose({ x: pos.x, y: pos.y, z: pos.z, yaw });
      this._buildMeshes();
    }
  }

  setThemeEnabled(on) {
    this.themeEnabled = !!on;
    if (this.mesh) {
      const pos = this.drive.pos.clone();
      const yaw = this.drive.yaw;
      this.destroy();
      this.drive.setPose({ x: pos.x, y: pos.y, z: pos.z, yaw });
      this._buildMeshes();
    }
  }

  get hits() {
    return this._collisionHits;
  }

  resetHits() {
    this._collisionHits = 0;
    this._lastCrashAt = -Infinity;
  }

  resetUpright() {
    // Arcade: simply reset yaw/vel and lift slightly
    this.drive.pos.y = Math.max(0.9, this.drive.pos.y + 0.6);
    this.drive.speed = 0;
  }

  spawn({ x, y, z, yaw }) {
    this.destroy();
    this.drive.setPose({ x, y, z, yaw });
    const def = getCarById(this.carId);
    this.drive.applyTuning(def.stats);
    this._buildMeshes();
  }

  _buildMeshes() {
    const def = getCarById(this.carId);
    const paintHex = COLOR_HEX[this.colorId] ?? COLOR_HEX[def.visuals.defaultColorId] ?? 0x1676ff;

    // Premium semi-realistic stylized car (inspired by reference, no logos)
    const isKurd = this.colorId === "kurdistan";
    const paint = new THREE.MeshPhysicalMaterial({
      color: isKurd ? COLOR_HEX.kurdistan : paintHex,
      metalness: 0.7,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
    });
    const darkTrim = new THREE.MeshStandardMaterial({ color: def.visuals.accent, metalness: 0.45, roughness: 0.38 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: def.visuals.glass,
      roughness: 0.12,
      metalness: 0.0,
      transmission: 0.35,
      transparent: true,
      opacity: 0.75,
      clearcoat: 1.0,
      clearcoatRoughness: 0.2,
    });

    const chassis = new THREE.Group();

    // Different silhouettes per car type (procedural, original)
    const kind = def.visuals.kind || "coupe";
    this._kind = kind;
    const scale =
      kind === "tank"
        ? [1.35, 1.65, 1.55]
        : kind === "bike"
          ? [0.58, 0.9, 0.72]
          : kind === "suv"
            ? [1.12, 1.3, 1.06]
            : kind === "sedan"
              ? [1.06, 1.08, 1.16]
              : kind === "muscle"
                ? [1.1, 1.05, 1.1]
                : kind === "supercar"
                  ? [1.08, 0.92, 1.02]
                  : [1.0, 1.0, 1.0];

    const bodyH = kind === "tank" ? 0.72 : kind === "bike" ? 0.38 : 0.55;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.18 * scale[0], bodyH * scale[1], 4.55 * scale[2]), paint);
    body.position.set(0, 0.35, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    chassis.add(body);

    const hoodZ = kind === "tank" ? 1.15 : kind === "bike" ? 0.85 : kind === "supercar" ? 1.45 : kind === "sedan" ? 1.65 : 1.55;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.05 * scale[0], 0.32 * scale[1], hoodZ * scale[2]), paint);
    hood.position.set(0, 0.56, 1.35);
    hood.castShadow = true;
    chassis.add(hood);

    const trunkZ = kind === "tank" ? 1.65 : kind === "bike" ? 0.7 : kind === "sedan" ? 1.55 : kind === "coupe" ? 1.25 : 1.35;
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(2.05 * scale[0], 0.28 * scale[1], trunkZ * scale[2]), paint);
    trunk.position.set(0, 0.56, -1.55);
    trunk.castShadow = true;
    chassis.add(trunk);

    const cabinH = kind === "tank" ? 0.62 : kind === "bike" ? 0.24 : kind === "suv" ? 0.7 : kind === "supercar" ? 0.42 : 0.5;
    const cabinZ = kind === "tank" ? 1.5 : kind === "bike" ? 0.7 : kind === "sedan" ? 2.25 : kind === "supercar" ? 1.55 : 1.85;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62 * scale[0], cabinH * scale[1], cabinZ * scale[2]), glass);
    cabin.position.set(0, 0.88, -0.15);
    cabin.castShadow = true;
    chassis.add(cabin);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.18 * scale[0], 0.12 * scale[1], 4.3 * scale[2]), darkTrim);
    skirt.position.set(0, 0.08, 0);
    chassis.add(skirt);

    // SUV roof rack / supercar wing / muscle scoop
    if (kind === "suv") {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale[0], 0.08, 2.2 * scale[2]), darkTrim);
      rack.position.set(0, 1.25, -0.1);
      chassis.add(rack);
    }
    if (kind === "supercar") {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale[0], 0.08, 0.5), darkTrim);
      wing.position.set(0, 0.95, -2.0 * scale[2]);
      chassis.add(wing);
    }
    if (kind === "muscle") {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.8), darkTrim);
      scoop.position.set(0, 0.72, 1.25);
      chassis.add(scoop);
    }
    if (kind === "tank") {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.42, 16), darkTrim);
      turret.rotation.x = Math.PI / 2;
      turret.position.set(0, 1.05, -0.25);
      chassis.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12), darkTrim);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 1.05, 1.35);
      chassis.add(barrel);
    }
    if (kind === "bike") {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.85), darkTrim);
      seat.position.set(0, 0.78, -0.25);
      chassis.add(seat);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.14), darkTrim);
      handle.position.set(0, 0.86, 0.95);
      chassis.add(handle);
    }

    // Grille + headlights (no logo)
    const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05 * scale[0], 0.28 * scale[1], 0.06), darkTrim);
    grilleFrame.position.set(0, 0.42, 2.28 * scale[2]);
    const grilleInner = new THREE.Mesh(
      new THREE.BoxGeometry(0.95 * scale[0], 0.22 * scale[1], 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0b0f16, metalness: 0.25, roughness: 0.6 })
    );
    grilleInner.position.set(0, 0, 0.02);
    grilleFrame.add(grilleInner);
    chassis.add(grilleFrame);

    // Lower intakes
    const intake = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale[0], 0.16 * scale[1], 0.08), darkTrim);
    intake.position.set(0, 0.26, 2.25 * scale[2]);
    chassis.add(intake);

    // Kurdistan decals / stripes (clean + optional)
    if (this.themeEnabled && isKurd && kind !== "tank") {
      const decalTex = getKurdistanFlagTexture();
      const decalMat = new THREE.MeshBasicMaterial({ map: decalTex, transparent: true, opacity: 0.98 });
      const hoodDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.65), decalMat);
      hoodDecal.rotation.x = -Math.PI / 2;
      hoodDecal.position.set(0.0, 0.73, 1.05);
      chassis.add(hoodDecal);

      // door stripe: red/white/green
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(1.65, 0.18),
        new THREE.MeshBasicMaterial({ color: KURDISTAN_THEME.red, transparent: true, opacity: 0.9 })
      );
      stripe.rotation.y = Math.PI / 2;
      stripe.position.set(-1.12 * scale[0], 0.42, 0.1);
      chassis.add(stripe);
      const stripe2 = stripe.clone();
      stripe2.material = stripe.material.clone();
      stripe2.material.color.setHex(KURDISTAN_THEME.green);
      stripe2.position.set(1.12 * scale[0], 0.42, 0.1);
      chassis.add(stripe2);

      // small sun badge rear window
      const sun = new THREE.Mesh(
        new THREE.CircleGeometry(0.16, 24),
        new THREE.MeshBasicMaterial({ color: KURDISTAN_THEME.sunYellow, transparent: true, opacity: 0.95 })
      );
      sun.position.set(0.0, 0.95, -0.55);
      sun.rotation.y = Math.PI;
      chassis.add(sun);
    }

    const headMat = new THREE.MeshStandardMaterial({
      color: 0xeaf7ff,
      emissive: 0x9fd3ff,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
    });
    const hlGeo = new THREE.BoxGeometry(0.54 * scale[0], 0.12 * scale[1], 0.06);
    const hl1 = new THREE.Mesh(hlGeo, headMat);
    const hl2 = new THREE.Mesh(hlGeo, headMat);
    hl1.position.set(-0.78 * scale[0], 0.44 * scale[1], 2.28 * scale[2]);
    hl2.position.set(0.78 * scale[0], 0.44 * scale[1], 2.28 * scale[2]);
    chassis.add(hl1);
    chassis.add(hl2);

    // Brake lights (emissive)
    this._brakeLights = [];
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0x220006,
      emissive: 0x000000,
      emissiveIntensity: 1.0,
      metalness: 0.1,
      roughness: 0.3,
    });
    const lightGeo = new THREE.BoxGeometry(0.38, 0.14, 0.06);
    const l1 = new THREE.Mesh(lightGeo, lightMat.clone());
    const l2 = new THREE.Mesh(lightGeo, lightMat.clone());
    l1.position.set(-0.72, 0.42, -2.28);
    l2.position.set(0.72, 0.42, -2.28);
    chassis.add(l1);
    chassis.add(l2);
    this._brakeLights.push(l1, l2);

    this.mesh = chassis;
    this.scene.add(chassis);

    const wheelR = kind === "tank" ? 0.5 : kind === "bike" ? 0.46 : 0.42;
    const wheelT = kind === "tank" ? 0.38 : kind === "bike" ? 0.22 : 0.32;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelT, 22);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, metalness: 0.2, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xb7c7dd, metalness: 0.9, roughness: 0.25 });
    const wheelCount = kind === "tank" ? 6 : kind === "bike" ? 2 : 4;
    this.wheelMeshes = [];
    for (let i = 0; i < wheelCount; i++) {
      const w = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.castShadow = true;
      tire.receiveShadow = true;
      w.add(tire);

      const rimR = kind === "tank" ? 0.3 : kind === "bike" ? 0.18 : 0.28;
      const rimT = kind === "tank" ? 0.28 : kind === "bike" ? 0.18 : 0.34;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, rimT, 18), rimMat);
      rim.rotation.z = Math.PI / 2;
      w.add(rim);

      this.scene.add(w);
      this.wheelMeshes.push(w);
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      disposeObject3D(this.mesh);
      this.mesh = null;
    }
    for (const wm of this.wheelMeshes) {
      this.scene.remove(wm);
      disposeObject3D(wm);
    }
    this.wheelMeshes = [];

    this.vehicle = null;
    this.chassisBody = null;
    this.wheelBodies = [];
    this._brakeLights = [];
  }

  getSpeedKmh() {
    return Math.abs(this.drive.speed) * 3.6;
  }

  getPosition() {
    return this.drive.pos.clone();
  }

  getYaw() {
    return this.drive.yaw;
  }

  applyControls(input, dt, solidsAabbs = []) {
    // Arcade drive controller (stable, predictable)
    this.drive.tick(input, dt, solidsAabbs);

    // Count collisions only when we actually hit a solid at speed (no "tiny touches")
    if (this.drive.consumeHit()) {
      const now = performance.now();
      if (now - this._lastCrashAt > 650 && this.getSpeedKmh() > 30) {
        this._collisionHits += 1;
        this._lastCrashAt = now;
      }
    }

    const brake = clamp(input.brake || 0, 0, 1);
    const reversePedal = clamp(input.reverse || 0, 0, 1);
    // Visual brake lights (cheap)
    const brakeOn = (brake > 0.08 || reversePedal > 0.12) && Math.abs(this.drive.speed) > 0.2;
    for (const bl of this._brakeLights) {
      bl.material.emissive.setHex(brakeOn ? 0xff102a : 0x000000);
      bl.material.emissiveIntensity = brakeOn ? 2.2 : 0.0;
    }
  }

  syncVisuals() {
    if (!this.mesh) return;
    this.mesh.position.copy(this.drive.pos);
    this.mesh.quaternion.setFromEuler(new THREE.Euler(0, this.drive.yaw, 0));

    // Wheel placement constants (match earlier raycast positions)
    const kind = this._kind || "coupe";
    const y = kind === "tank" ? 0.34 : kind === "bike" ? 0.22 : 0.28;
    let poses = [];
    if (kind === "bike") {
      poses = [new THREE.Vector3(0, y, 1.25), new THREE.Vector3(0, y, -1.25)];
    } else if (kind === "tank") {
      const halfTrack = 1.2;
      poses = [
        new THREE.Vector3(-halfTrack, y, 1.6),
        new THREE.Vector3(halfTrack, y, 1.6),
        new THREE.Vector3(-halfTrack, y, 0.0),
        new THREE.Vector3(halfTrack, y, 0.0),
        new THREE.Vector3(-halfTrack, y, -1.6),
        new THREE.Vector3(halfTrack, y, -1.6),
      ];
    } else {
      const wheelBaseZ = 1.55;
      const halfTrack = 0.95;
      poses = [
        new THREE.Vector3(-halfTrack, y, wheelBaseZ),
        new THREE.Vector3(halfTrack, y, wheelBaseZ),
        new THREE.Vector3(-halfTrack, y, -wheelBaseZ),
        new THREE.Vector3(halfTrack, y, -wheelBaseZ),
      ];
    }
    for (let i = 0; i < this.wheelMeshes.length; i++) {
      const wm = this.wheelMeshes[i];
      const p = poses[i].clone().applyEuler(new THREE.Euler(0, this.drive.yaw, 0)).add(this.drive.pos);
      wm.position.copy(p);
      // Wheels: rotate (spin) + front steer
      const isFront = kind === "bike" ? i === 0 : i === 0 || i === 1;
      const steerY = isFront ? this.drive.steerAngle : 0;
      wm.rotation.set(this.drive.wheelSpin, this.drive.yaw + steerY, 0);
    }
  }

  getRpm01() {
    // Approx from speed; good enough for placeholder engine audio
    const kmh = this.getSpeedKmh();
    return clamp(kmh / 80, 0, 1);
  }
}

