import * as THREE from "three";
import { damp } from "../core/time.js";

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._ray = new THREE.Raycaster();
    this._tmpDir = new THREE.Vector3();

    this.cfg = {
      height: 5.2,
      distance: 12.5,
      lookAhead: 6.2,
      stiffness: 9.0,
      rotStiffness: 10.0,
    };
  }

  reset(pos) {
    this._pos.copy(pos).add(new THREE.Vector3(0, this.cfg.height, this.cfg.distance));
    this._look.copy(pos);
    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
  }

  tick({ carPos, carForward, speed01, dt, occluders = [] }) {
    const desiredLook = carPos.clone().add(carForward.clone().multiplyScalar(this.cfg.lookAhead * (0.6 + 0.7 * speed01)));
    desiredLook.y += 0.9;

    const desiredPos = carPos
      .clone()
      .add(new THREE.Vector3(0, this.cfg.height, 0))
      .add(carForward.clone().multiplyScalar(-this.cfg.distance * (0.85 + 0.25 * speed01)));

    // Camera collision avoidance (simple): if a building blocks the view, pull camera forward/up.
    if (occluders.length) {
      const dir = this._tmpDir.copy(desiredPos).sub(desiredLook);
      const dist = Math.max(0.001, dir.length());
      dir.multiplyScalar(1 / dist);
      this._ray.set(desiredLook, dir);
      this._ray.far = dist;
      const hit = this._ray.intersectObjects(occluders, true)[0];
      if (hit && hit.distance < dist) {
        const safe = Math.max(2.5, hit.distance - 0.8);
        desiredPos.copy(desiredLook).add(dir.multiplyScalar(safe));
        desiredPos.y += 1.2;
      }
    }

    this._look.x = damp(this._look.x, desiredLook.x, this.cfg.rotStiffness, dt);
    this._look.y = damp(this._look.y, desiredLook.y, this.cfg.rotStiffness, dt);
    this._look.z = damp(this._look.z, desiredLook.z, this.cfg.rotStiffness, dt);

    this._pos.x = damp(this._pos.x, desiredPos.x, this.cfg.stiffness, dt);
    this._pos.y = damp(this._pos.y, desiredPos.y, this.cfg.stiffness, dt);
    this._pos.z = damp(this._pos.z, desiredPos.z, this.cfg.stiffness, dt);

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
  }
}

