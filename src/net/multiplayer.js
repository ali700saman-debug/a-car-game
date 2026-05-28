import * as THREE from "three";
import { io } from "socket.io-client";
import { clamp } from "../core/time.js";
import { Car } from "../game/car.js";

function nowMs() {
  return performance.now();
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function makeNameSprite(name) {
  const text = String(name || "Player").slice(0, 18);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(8, 10, 240, 44);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 10, 240, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 26px system-ui,Segoe UI,Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(4.2, 1.05, 1);
  spr.position.set(0, 2.9, 0);
  return spr;
}

export class MultiplayerClient {
  constructor({ scene, physicsWorld, ui, storage }) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.ui = ui;
    this.storage = storage;

    this.socket = null;
    this.room = null;
    this.connected = false;
    this.selfId = null;

    this.remote = new Map(); // id -> { car, name, sprite, lastNet, target, t0 }
    this._sendAcc = 0;
    this._playersInRoom = 1;
  }

  isActive() {
    return !!this.socket;
  }

  async connect({ serverUrl, name }) {
    const url = serverUrl || "";
    this.disconnect();

    try {
      this.socket = io(url, { transports: ["websocket", "polling"], timeout: 5000 });
    } catch (e) {
      this.socket = null;
      throw e;
    }

    this.connected = false;
    this.selfId = null;
    this.ui.setMpHud({ conn: "Connecting" });

    this.socket.on("connect", () => {
      this.connected = true;
      this.selfId = this.socket.id;
      this.ui.setMpHud({ conn: "Connected" });
      // update displayed name from storage if needed
      if (name) this.storage.setProfileName(name);
    });

    this.socket.on("disconnect", () => {
      this.connected = false;
      this.ui.setMpHud({ conn: "Disconnected" });
    });

    this.socket.on("room:joined", (payload) => {
      this.room = payload.room;
      this._playersInRoom = payload.players || 1;
      this.ui.setMpHud({ room: this.room, players: this._playersInRoom });
    });

    this.socket.on("room:players", (payload) => {
      this._playersInRoom = payload.players || 1;
      this.ui.setMpHud({ players: this._playersInRoom });
    });

    this.socket.on("state:batch", (payload) => {
      const list = payload.players || [];
      for (const p of list) this._upsertRemote(p);
    });

    this.socket.on("player:left", (payload) => {
      this._removeRemote(payload.id);
    });
  }

  async createRoom({ name, carId, colorId }) {
    if (!this.socket) throw new Error("Not connected");
    return new Promise((resolve, reject) => {
      this.socket.emit("room:create", { name, carId, colorId }, (res) => {
        if (!res || !res.ok) return reject(new Error(res?.error || "Create room failed"));
        resolve(res.room);
      });
    });
  }

  async joinRoom({ room, name, carId, colorId }) {
    if (!this.socket) throw new Error("Not connected");
    return new Promise((resolve, reject) => {
      this.socket.emit("room:join", { room, name, carId, colorId }, (res) => {
        if (!res || !res.ok) return reject(new Error(res?.error || "Join room failed"));
        resolve(res.room);
      });
    });
  }

  tickLocal({ dt, car }) {
    if (!this.socket || !this.connected || !this.room) return;
    this._sendAcc += dt;
    if (this._sendAcc < 1 / 15) return; // ~15hz send
    this._sendAcc = 0;

    const p = car.getPosition();
    const yaw = car.getYaw();
    const speed = car.drive?.speed ?? 0;
    this.socket.emit("state:update", {
      room: this.room,
      t: nowMs(),
      x: p.x,
      y: p.y,
      z: p.z,
      yaw,
      speed,
      carId: this.storage.profile?.selectedCarId || "coupe",
      colorId: this.storage.profile?.selectedColor || "blue",
      name: this.storage.profile?.name || "Player",
    });
  }

  tickRemote({ dt }) {
    const t = nowMs();
    for (const [id, r] of this.remote) {
      const target = r.target;
      if (!target) continue;
      const age = clamp((t - r.t0) / 120, 0, 1); // smoothing window
      const pos = r.car.drive.pos;
      pos.x = pos.x + (target.x - pos.x) * (1 - Math.exp(-10 * dt));
      pos.y = target.y;
      pos.z = pos.z + (target.z - pos.z) * (1 - Math.exp(-10 * dt));
      r.car.drive.yaw = lerpAngle(r.car.drive.yaw, target.yaw, 1 - Math.exp(-12 * dt));
      r.car.drive.speed = r.car.drive.speed + (target.speed - r.car.drive.speed) * (1 - Math.exp(-8 * dt));

      // if no fresh packets for a while, ease to stop
      if (t - target.t > 1200) r.car.drive.speed *= 0.98;

      r.car.syncVisuals();
      if (r.sprite) {
        r.sprite.position.y = 2.9 + Math.sin((t / 1000) * 2.2) * 0.02;
      }

      // prevent runaway memory if ids rotate (shouldn't)
      if (age >= 1 && t - target.t > 15000) this._removeRemote(id);
    }
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {}
    }
    this.socket = null;
    this.connected = false;
    this.room = null;
    this.selfId = null;
    for (const [id] of this.remote) this._removeRemote(id);
    this.remote.clear();
    this._playersInRoom = 1;
  }

  _upsertRemote(p) {
    if (!p || !p.id) return;
    if (p.id === this.selfId) return;

    let r = this.remote.get(p.id);
    if (!r) {
      const car = new Car({ physicsWorld: this.physicsWorld, scene: this.scene });
      car.setCarId(p.carId || "coupe");
      car.setColorId(p.colorId || "blue");
      car.drive.setPose({ x: p.x || 0, y: p.y || 0.9, z: p.z || 0, yaw: p.yaw || 0 });
      car.drive.speed = p.speed || 0;
      car.syncVisuals();
      const sprite = makeNameSprite(p.name || "Player");
      car.mesh.add(sprite);
      r = { car, sprite, target: null, t0: nowMs() };
      this.remote.set(p.id, r);
    }

    // apply appearance changes
    if (p.carId && p.carId !== (r._carId || "")) {
      r.car.setCarId(p.carId);
      r._carId = p.carId;
    }
    if (p.colorId && p.colorId !== (r._colorId || "")) {
      r.car.setColorId(p.colorId);
      r._colorId = p.colorId;
    }

    r.target = { ...p };
    r.t0 = nowMs();
  }

  _removeRemote(id) {
    const r = this.remote.get(id);
    if (!r) return;
    if (r.sprite) r.car.mesh.remove(r.sprite);
    r.car.destroy();
    this.remote.delete(id);
  }
}

