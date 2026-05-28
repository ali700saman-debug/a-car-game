import * as THREE from "three";

function isBoxShape(shape) {
  // cannon-es Box has halfExtents
  return shape && shape.halfExtents && typeof shape.halfExtents.x === "number";
}

export class ColliderDebug {
  constructor({ scene, world }) {
    this.scene = scene;
    this.world = world;
    this.enabled = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this._pairs = []; // { body, mesh }

    this._mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
  }

  rebuild() {
    // Remove old
    for (const p of this._pairs) this.group.remove(p.mesh);
    this._pairs = [];

    for (const body of this.world.bodies) {
      for (let i = 0; i < body.shapes.length; i++) {
        const shape = body.shapes[i];
        if (!isBoxShape(shape)) continue;

        const he = shape.halfExtents;
        const geo = new THREE.BoxGeometry(he.x * 2, he.y * 2, he.z * 2);
        const mesh = new THREE.Mesh(geo, this._mat);
        mesh.frustumCulled = false;
        this.group.add(mesh);
        this._pairs.push({ body, shapeIndex: i, mesh });
      }
    }
  }

  setEnabled(on) {
    this.enabled = !!on;
    this.group.visible = this.enabled;
    if (this.enabled) this.rebuild();
  }

  tick() {
    if (!this.enabled) return;
    for (const p of this._pairs) {
      // For now we only visualize body transform (good enough for static city colliders)
      const b = p.body;
      p.mesh.position.set(b.position.x, b.position.y, b.position.z);
      p.mesh.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    }
  }
}

