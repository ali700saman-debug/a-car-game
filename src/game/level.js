import * as THREE from "three";
import * as CANNON from "cannon-es";
import { Reflector } from "three/addons/objects/Reflector.js";
import { KURDISTAN_THEME } from "../art/kurdistanTheme.js";
import { applyWavingToMaterial, makeWavingFlagMaterial, tickWavingMaterial } from "../art/kurdistanFlag.js";

function makeAsphaltTexture() {
  // Fast procedural asphalt with subtle lane markings (legal-safe)
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a1225";
  ctx.fillRect(0, 0, c.width, c.height);

  // Noise
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * 2 - 1) * 18;
    img.data[i + 0] = Math.max(0, Math.min(255, img.data[i + 0] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Faint dashed lines
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#9fd3ff";
  ctx.lineWidth = 6;
  ctx.setLineDash([22, 18]);
  ctx.beginPath();
  ctx.moveTo(80, 0);
  ctx.lineTo(80, 512);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(432, 0);
  ctx.lineTo(432, 512);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeConcreteTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#d9dde3";
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#c8cdd6";
  for (let y = 0; y < 512; y += 32) {
    for (let x = 0; x < 512; x += 32) {
      if (((x + y) / 32) % 2 === 0) ctx.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeRoadMarkingsTexture() {
  // White lane dashes + yellow center (cartoon clean)
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 512, 512);

  // Center yellow double line
  ctx.fillStyle = "#f4d24b";
  ctx.fillRect(252, 0, 6, 512);
  ctx.fillRect(260, 0, 6, 512);

  // White dashed lanes
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(170, y + 10, 8, 34);
    ctx.fillRect(334, y + 10, 8, 34);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeCrosswalkTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(0, i * 44 + 14, 512, 22);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeBuildingFacadeTexture({ base = "#d7b28a", window = "#3a7fd6", accent = "#ffffff" } = {}) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  // subtle vertical gradient
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "rgba(255,255,255,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  // windows grid
  ctx.fillStyle = window;
  ctx.globalAlpha = 0.9;
  const pad = 44;
  const ww = 46;
  const wh = 54;
  const gx = 18;
  const gy = 18;
  for (let y = pad; y < 512 - pad; y += wh + gy) {
    for (let x = pad; x < 512 - pad; x += ww + gx) {
      ctx.fillRect(x, y, ww, wh);
      // highlight strip
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = accent;
      ctx.fillRect(x + 6, y + 6, ww - 12, 10);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = window;
    }
  }
  ctx.globalAlpha = 1;

  // roof trim
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 0, 512, 22);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeBoxBody({ x, y, z, w, h, l, mass = 0, material = null }) {
  const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, l / 2));
  const body = new CANNON.Body({
    mass,
    position: new CANNON.Vec3(x, y, z),
    material,
  });
  body.addShape(shape);
  return body;
}

export class LevelInstance {
  constructor({ def, physicsWorld, scene, settings }) {
    this.def = def;
    this.physicsWorld = physicsWorld;
    this.scene = scene;
    this.settings = settings;

    this._bodies = [];
    this._meshes = [];

    this.parking = null; // { center, yaw, w, l }
    this.checkpoints = [];
    this.checkpointIndex = 0;

    this.traffic = [];
    this.occluders = [];
    this.solidAabbs = []; // collision against visible major objects only

    // Theme props
    this._visible = true;
    this._themeOn = this.settings?.kurdistanTheme !== false;
    this._themeGroup = new THREE.Group();
    this._themeGroup.name = "kurdistanTheme";
    this._flagMat = null;
  }

  build() {
    this.destroy();

    const world = this.physicsWorld.world;

    // Ground
    const groundMat = new CANNON.Material("ground");
    const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
    this._bodies.push(groundBody);

    const asphalt = makeAsphaltTexture();
    const baseSize = Math.max((this.def.bounds?.x ?? 520) * 2 + 200, 160);
    const groundMatVis = new THREE.MeshStandardMaterial({
      map: asphalt,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.03,
    });
    // Base ground should never z-fight with roads/sidewalks.
    groundMatVis.polygonOffset = true;
    groundMatVis.polygonOffsetFactor = 1;
    groundMatVis.polygonOffsetUnits = 1;
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(baseSize, baseSize, 1, 1), groundMatVis);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0.0;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    this._meshes.push(groundMesh);

    // City map (primitives): roads, sidewalks, buildings, lamps, trees, ramps, parking pads.
    this._buildCity();

    // Optional challenge visuals (parking/checkpoints/traffic) can still be added by passing def.*,
    // but Free Drive city doesn't require them.
    this._buildOptionalChallengeElements();
  }

  async buildAsync({ onProgress = () => {}, onStage = () => {} } = {}) {
    this.destroy();
    const yieldToBrowser = () => new Promise((r) => setTimeout(r, 0));

    onStage("Preparing ground…");
    this._buildGround();
    onProgress(0.08);
    await yieldToBrowser();

    onStage("Building roads…");
    await this._buildCityAsync({ onProgress: (p) => onProgress(0.08 + 0.78 * p), yieldToBrowser });
    await yieldToBrowser();

    onStage("Finalizing…");
    this._buildOptionalChallengeElements();
    onProgress(1.0);
  }

  setVisible(on) {
    const v = !!on;
    this._visible = v;
    for (const m of this._meshes) m.visible = v;
    if (this._themeGroup) this._themeGroup.visible = v && this._themeOn;
  }

  setThemeEnabled(on) {
    this._themeOn = !!on;
    if (this._themeGroup) this._themeGroup.visible = this._visible && this._themeOn;
  }

  tick(dt, t = 0) {
    // Only updates cheap flag shader uniform
    if (this._flagMat) tickWavingMaterial(this._flagMat, t);
  }

  _buildGround() {
    const world = this.physicsWorld.world;
    // Ground
    const groundMat = new CANNON.Material("ground");
    const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
    this._bodies.push(groundBody);

    const asphalt = makeAsphaltTexture();
    const baseSize = Math.max((this.def.bounds?.x ?? 520) * 2 + 200, 160);
    const groundMatVis = new THREE.MeshStandardMaterial({
      map: asphalt,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.03,
    });
    groundMatVis.polygonOffset = true;
    groundMatVis.polygonOffsetFactor = 1;
    groundMatVis.polygonOffsetUnits = 1;
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(baseSize, baseSize, 1, 1), groundMatVis);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0.0;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    this._meshes.push(groundMesh);
  }

  _buildCity() {
    // kept for compatibility
    this._buildCityCore({ q: this._qualityTier(), yieldToBrowser: null, onProgress: null });
  }

  async _buildCityAsync({ onProgress, yieldToBrowser }) {
    // NOTE: City generation is heavy; we build it during the loading screen (never during driving).
    // We still yield once at the end so the loading UI can update.
    this._buildCityCore({ q: this._qualityTier(), yieldToBrowser: null, onProgress: null });
    if (onProgress) onProgress(1);
    if (yieldToBrowser) await yieldToBrowser();
  }

  _qualityTier() {
    const q = (this.settings?.quality || "med").toLowerCase();
    if (q === "ultra") return "ultra";
    if (q === "high") return "high";
    if (q === "med" || q === "medium") return "med";
    if (q === "low") return "low";
    return "med";
  }

  _buildCityCore({ q, yieldToBrowser, onProgress }) {
    const world = this.physicsWorld.world;
    const trafficOn = this.settings?.traffic !== false;

    // Reuse materials/geometries (perf)
    const matCache = new Map();
    const getMat = (key, color, metalness, roughness) => {
      const k = `${key}:${color}:${metalness}:${roughness}`;
      if (matCache.has(k)) return matCache.get(k);
      const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      matCache.set(k, m);
      return m;
    };
    const geoCache = new Map();
    const getBoxGeo = (w, h, l) => {
      const k = `${w}|${h}|${l}`;
      if (geoCache.has(k)) return geoCache.get(k);
      const g = new THREE.BoxGeometry(w, h, l);
      geoCache.set(k, g);
      return g;
    };

    const addStaticBox = (x, y, z, w, h, l, color = 0x1b2a4a) => {
      const body = makeBoxBody({ x, y: y + h / 2, z, w, h, l, mass: 0 });
      world.addBody(body);
      this._bodies.push(body);

      const mesh = new THREE.Mesh(getBoxGeo(w, h, l), getMat("solid", color, 0.25, 0.65));
      mesh.position.set(x, y + h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this._meshes.push(mesh);

      // Register as a solid collider (XZ only) - matches visible mesh exactly.
      this.solidAabbs.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - l / 2,
        maxZ: z + l / 2,
      });
    };

    // World scale (bigger than before)
    const bx = this.def.bounds?.x ?? 520;
    const bz = this.def.bounds?.z ?? 520;
    const wallH = 3.0;
    const wallT = 2.5;
    // Make boundaries visible (fences) and far away from roads.
    addStaticBox(0, 0, -bz - wallT / 2, bx * 2 + 120, wallH, wallT, 0x9fb0c8);
    addStaticBox(0, 0, bz + wallT / 2, bx * 2 + 120, wallH, wallT, 0x9fb0c8);
    addStaticBox(-bx - wallT / 2, 0, 0, wallT, wallH, bz * 2 + 120, 0x9fb0c8);
    addStaticBox(bx + wallT / 2, 0, 0, wallT, wallH, bz * 2 + 120, 0x9fb0c8);

    // Roads (large city grid) - cartoon clean look
    // polygonOffset/renderOrder prevents z-fighting where roads overlap (intersections).
    const roadTex = makeAsphaltTexture();
    roadTex.repeat.set(10, 10);
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, color: 0xffffff, roughness: 0.98, metalness: 0.02 });
    roadMat.polygonOffset = true;
    roadMat.polygonOffsetFactor = -1;
    roadMat.polygonOffsetUnits = -1;

    const sidewalkTex = makeConcreteTexture();
    const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTex, color: 0xffffff, roughness: 0.95, metalness: 0.01 });
    sidewalkMat.polygonOffset = true;
    sidewalkMat.polygonOffsetFactor = -2;
    sidewalkMat.polygonOffsetUnits = -2;

    const roadY = 0.012;
    const sidewalkY = 0.02;
    const markingY = 0.03;
    const markingsTex = makeRoadMarkingsTexture();
    const markingsMat = new THREE.MeshBasicMaterial({ map: markingsTex, transparent: true, opacity: 0.95 });
    const crosswalkTex = makeCrosswalkTexture();
    const crosswalkMat = new THREE.MeshBasicMaterial({ map: crosswalkTex, transparent: true, opacity: 0.95 });

    const addRoad = (x, z, w, l) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, roadY, z);
      m.receiveShadow = true;
      m.renderOrder = 1;
      this.scene.add(m);
      this._meshes.push(m);

      // Markings overlay (no collision) slightly above the road
      const mm = new THREE.Mesh(new THREE.PlaneGeometry(w, l), markingsMat);
      mm.rotation.x = -Math.PI / 2;
      mm.position.set(x, markingY, z);
      mm.renderOrder = 3;
      this.scene.add(mm);
      this._meshes.push(mm);
    };
    const addSidewalk = (x, z, w, l) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), sidewalkMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, sidewalkY, z);
      m.receiveShadow = true;
      m.renderOrder = 2;
      this.scene.add(m);
      this._meshes.push(m);
    };

    // Wide main roads
    addRoad(0, 0, 34, bz * 2); // north-south
    addRoad(0, 0, bx * 2, 34); // east-west

    // Ring road / highway loop (4 segments)
    const ringR = Math.min(bx, bz) * 0.62;
    addRoad(0, -ringR, ringR * 2.2, 26);
    addRoad(0, ringR, ringR * 2.2, 26);
    addRoad(-ringR, 0, 26, ringR * 2.2);
    addRoad(ringR, 0, 26, ringR * 2.2);

    // Bridge over a simple "river" (visual water strip)
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(bx * 2 + 200, 46),
      new THREE.MeshStandardMaterial({ color: 0x4fa5d8, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.75 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.004, ringR * 0.25);
    water.receiveShadow = false;
    water.renderOrder = 0;
    this.scene.add(water);
    this._meshes.push(water);

    // Bridge deck (visual)
    addRoad(0, ringR * 0.25, 90, 34);

    // Secondary grid roads (bigger city)
    const step = 120;
    const count = Math.floor(Math.min(bx, bz) / step);
    for (let i = -count; i <= count; i++) {
      if (i === 0) continue;
      addRoad(i * step, 0, 22, bz * 2);
      addRoad(0, i * step, bx * 2, 22);
    }

    // Crosswalks at key intersections (Image 2 vibe)
    const crossY = 0.035;
    const addCrosswalk = (x, z, rot = 0) => {
      const cw = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), crosswalkMat);
      cw.rotation.x = -Math.PI / 2;
      cw.rotation.z = rot;
      cw.position.set(x, crossY, z);
      cw.renderOrder = 4;
      this.scene.add(cw);
      this._meshes.push(cw);
    };
    for (let i = -count; i <= count; i++) {
      const p = i * step;
      addCrosswalk(0, p, 0);
      addCrosswalk(0, p + 12, Math.PI / 2);
      addCrosswalk(p, 0, 0);
      addCrosswalk(p + 12, 0, Math.PI / 2);
    }

    // Open plaza area
    addRoad(-ringR * 0.35, -ringR * 0.35, 120, 120);

    // Sidewalk sheets around main corridors (visual only, no collision to avoid invisible hits)
    addSidewalk(0, 0, 44, bz * 2);
    addSidewalk(0, 0, bx * 2, 44);

    // Buildings (cartoon facade textures inspired by Image 1)
    const facadeCache = new Map();
    const facadeMat = (key, base, window, accent) => {
      const k = `${key}:${base}:${window}:${accent}`;
      if (facadeCache.has(k)) return facadeCache.get(k);
      const tex = makeBuildingFacadeTexture({ base, window, accent });
      const m = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.65, metalness: 0.05 });
      facadeCache.set(k, m);
      return m;
    };
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbfe6ff,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.65,
    });

    const addBuilding = (x, z, w, d, h) => {
      // Optional cannon box only for a few large colliders (debug), avoid thousands of bodies
      if (q === "ultra" || (q === "high" && h > 30 && Math.random() < 0.12)) {
        const body = makeBoxBody({ x, y: h / 2, z, w, h, l: d, mass: 0 });
        world.addBody(body);
        this._bodies.push(body);
      }

      const palette = [
        ["#e9c59a", "#3a7fd6", "#ffffff"],
        ["#f0a0a0", "#2e6fce", "#fff5e6"],
        ["#a9d2f3", "#3a6ad1", "#ffffff"],
        ["#e7a56b", "#2f7ac7", "#fff2dd"],
        ["#d7e2a3", "#2f6fb5", "#ffffff"],
      ];
      const p = palette[(Math.random() * palette.length) | 0];
      const m = new THREE.Mesh(getBoxGeo(w, h, d), facadeMat("facade", p[0], p[1], p[2]));
      m.position.set(x, h / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this._meshes.push(m);
      this.occluders.push(m);

      // Roof cap / detail (skip on low)
      if (q !== "low") {
        const cap = new THREE.Mesh(getBoxGeo(w * 1.02, Math.max(0.8, h * 0.04), d * 1.02), getMat("cap", 0xffffff, 0.05, 0.65));
        cap.position.set(0, h * 0.48, 0);
        m.add(cap);
      }

      // Awnings for low buildings (shops)
      if (h < 24 && Math.random() < 0.45) {
        const awn = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.55, 0.35, 1.1),
          getMat("awn", 0xff4d6d, 0.05, 0.55)
        );
        awn.position.set(0, -h * 0.15, d * 0.52);
        m.add(awn);
      }

      // Solid collider (XZ only)
      this.solidAabbs.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });

      if (q === "high" || q === "ultra") {
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.35, d * 0.92), glassMat);
        win.position.set(0, h * 0.15, 0);
        m.add(win);
      }
    };

    // Keep a wide "road corridor" clear region to avoid invisible collisions:
    // If |x| < clear or |z| < clear, no building colliders.
    const clear = 40;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const blocks = q === "low" ? 260 : q === "med" ? 520 : q === "high" ? 820 : 980;
    const yieldEvery = q === "low" ? 60 : 80;
    for (let i = 0; i < blocks; i++) {
      let x = rnd(-bx + 20, bx - 20);
      let z = rnd(-bz + 20, bz - 20);
      if (Math.abs(x) < clear || Math.abs(z) < clear) continue;
      // Also avoid secondary road corridors around grid lines
      const nearGridX = Math.abs(((x % step) + step) % step - step / 2);
      const nearGridZ = Math.abs(((z % step) + step) % step - step / 2);
      if (nearGridX < 18 || nearGridZ < 18) continue;

      // District-based heights (downtown near center, residential further out)
      const centerD = Math.hypot(x, z);
      const downtown = centerD < ringR * 0.55;
      const w = 10 + Math.floor(Math.random() * 12);
      const d = 10 + Math.floor(Math.random() * 12);
      const h = downtown ? 22 + Math.floor(Math.random() * 70) : 10 + Math.floor(Math.random() * 26);
      addBuilding(x, z, w, d, h);
      if (onProgress && i % yieldEvery === 0) onProgress(i / blocks);
      if (yieldToBrowser && i % yieldEvery === 0) {
        // eslint-disable-next-line no-unused-expressions
        yieldToBrowser();
      }
    }

    // Add storefront rows along main roads (lots of colorful buildings like Image 1)
    for (let i = -count; i <= count; i++) {
      const z = i * step + 20;
      if (Math.abs(z) < 80) continue;
      addBuilding(-clear - 26, z, 16, 14, 14 + (Math.random() * 10) | 0);
      addBuilding(clear + 26, z, 16, 14, 14 + (Math.random() * 10) | 0);
    }
    for (let i = -count; i <= count; i++) {
      const x = i * step + 20;
      if (Math.abs(x) < 80) continue;
      addBuilding(x, -clear - 26, 14, 16, 14 + (Math.random() * 10) | 0);
      addBuilding(x, clear + 26, 14, 16, 14 + (Math.random() * 10) | 0);
    }

    // Street props (visual-only, Image 2 vibe): lamps, benches, hydrants, signs, bollards, traffic lights
    const propMax = 900;
    const lampPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 10), getMat("lamp", 0x2b3a52, 0.25, 0.55), propMax);
    const lampHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.38, 0.16, 0.6), getMat("lampHead", 0x2b3a52, 0.25, 0.55), propMax);
    const bench = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.25, 0.55), getMat("bench", 0xa86b3a, 0.05, 0.65), propMax);
    const signPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 8), getMat("signPole", 0x3a4b66, 0.15, 0.6), propMax);
    const signFace = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), getMat("signFace", 0x4da3ff, 0.05, 0.4), propMax);
    const hydrant = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.22, 0.65, 10), getMat("hydrant", 0xff4d6d, 0.05, 0.5), propMax);
    lampPole.castShadow = true;
    lampHead.castShadow = true;
    bench.castShadow = true;
    hydrant.castShadow = true;
    this.scene.add(lampPole, lampHead, bench, signPole, signFace, hydrant);
    this._meshes.push(lampPole, lampHead, bench, signPole, signFace, hydrant);

    const o = new THREE.Object3D();
    let pi = 0;
    const placeLamp = (x, z) => {
      if (pi >= propMax) return;
      o.position.set(x, 2.1, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix();
      lampPole.setMatrixAt(pi, o.matrix);
      o.position.set(x, 4.05, z); o.updateMatrix();
      lampHead.setMatrixAt(pi, o.matrix);
      pi++;
    };
    let bi2 = 0;
    const placeBench = (x, z, rotY) => {
      if (bi2 >= propMax) return;
      o.position.set(x, 0.18, z); o.rotation.set(0, rotY, 0); o.scale.set(1, 1, 1); o.updateMatrix();
      bench.setMatrixAt(bi2++, o.matrix);
    };
    let si = 0;
    const placeSign = (x, z, rotY) => {
      if (si >= propMax) return;
      o.position.set(x, 1.1, z); o.rotation.set(0, rotY, 0); o.updateMatrix();
      signPole.setMatrixAt(si, o.matrix);
      o.position.set(x, 1.9, z); o.updateMatrix();
      signFace.setMatrixAt(si, o.matrix);
      si++;
    };
    let hi = 0;
    const placeHydrant = (x, z) => {
      if (hi >= propMax) return;
      o.position.set(x, 0.33, z); o.rotation.set(0, 0, 0); o.updateMatrix();
      hydrant.setMatrixAt(hi++, o.matrix);
    };

    // Place props along sidewalks near the main cross (keep roads clear)
    for (let i = -count; i <= count; i++) {
      const p = i * step;
      placeLamp(-18, p);
      placeLamp(18, p);
      placeBench(-24, p + 10, Math.PI / 2);
      placeBench(24, p - 10, -Math.PI / 2);
      placeSign(-30, p + 18, 0);
      placeHydrant(-26, p - 18);
    }
    lampPole.count = pi; lampHead.count = pi;
    bench.count = bi2;
    signPole.count = si; signFace.count = si;
    hydrant.count = hi;
    lampPole.instanceMatrix.needsUpdate = true;
    lampHead.instanceMatrix.needsUpdate = true;
    bench.instanceMatrix.needsUpdate = true;
    signPole.instanceMatrix.needsUpdate = true;
    signFace.instanceMatrix.needsUpdate = true;
    hydrant.instanceMatrix.needsUpdate = true;

    // Trees & landscaping (instanced, inspired by Image 3)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.95, metalness: 0.02 });
    const leafColors = [0x2f8a4f, 0x4fb05e, 0x7ad65b, 0x43a3ff, 0xff7ac2, 0xffb84d];
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.28, 2.2, 8);
    const crownGeo = new THREE.SphereGeometry(1.25, 10, 10);
    const crownMat = new THREE.MeshStandardMaterial({ color: leafColors[0], roughness: 0.9, metalness: 0.02 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, 600);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, 600);
    trunks.castShadow = true;
    crowns.castShadow = true;
    this.scene.add(trunks);
    this.scene.add(crowns);
    this._meshes.push(trunks, crowns);

    const tmp = new THREE.Object3D();
    const tmpC = new THREE.Color();
    let ti = 0;
    for (let i = -18; i <= 18; i++) {
      const x1 = -22;
      const x2 = 22;
      const z0 = i * 30;
      for (const x of [x1, x2]) {
        if (ti >= 600) break;
        tmp.position.set(x, 1.1, z0);
        tmp.rotation.set(0, (Math.random() - 0.5) * 0.3, 0);
        tmp.scale.setScalar(0.95 + Math.random() * 0.25);
        tmp.updateMatrix();
        trunks.setMatrixAt(ti, tmp.matrix);

        tmp.position.set(x, 2.7, z0);
        tmp.scale.setScalar(0.9 + Math.random() * 0.55);
        tmp.updateMatrix();
        crowns.setMatrixAt(ti, tmp.matrix);
        tmpC.setHex(leafColors[(Math.random() * leafColors.length) | 0]);
        crowns.setColorAt(ti, tmpC);
        ti++;
      }
      for (const z of [-22, 22]) {
        if (ti >= 600) break;
        tmp.position.set(i * 30, 1.1, z);
        tmp.rotation.set(0, (Math.random() - 0.5) * 0.3, 0);
        tmp.scale.setScalar(0.95 + Math.random() * 0.25);
        tmp.updateMatrix();
        trunks.setMatrixAt(ti, tmp.matrix);

        tmp.position.set(i * 30, 2.7, z);
        tmp.scale.setScalar(0.9 + Math.random() * 0.55);
        tmp.updateMatrix();
        crowns.setMatrixAt(ti, tmp.matrix);
        tmpC.setHex(leafColors[(Math.random() * leafColors.length) | 0]);
        crowns.setColorAt(ti, tmpC);
        ti++;
      }
    }
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;

    // Bush clusters / planters (visual only)
    const bushGeo = new THREE.SphereGeometry(0.65, 10, 10);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x4fb05e, roughness: 0.95, metalness: 0.0 });
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 450);
    bushes.castShadow = true;
    this.scene.add(bushes);
    this._meshes.push(bushes);
    let bi = 0;
    for (let i = -12; i <= 12; i++) {
      for (let j = -12; j <= 12; j++) {
        if (bi >= 450) break;
        if ((i + j) % 4 !== 0) continue;
        const x = i * 40 + (Math.random() - 0.5) * 6;
        const z = j * 40 + (Math.random() - 0.5) * 6;
        if (Math.abs(x) < clear || Math.abs(z) < clear) continue;
        tmp.position.set(x, 0.6, z);
        tmp.scale.setScalar(0.85 + Math.random() * 0.65);
        tmp.rotation.set(0, Math.random() * Math.PI * 2, 0);
        tmp.updateMatrix();
        bushes.setMatrixAt(bi, tmp.matrix);
        bi++;
      }
    }
    bushes.count = bi;
    bushes.instanceMatrix.needsUpdate = true;

    // Removed non-instanced lamp meshes (instanced props above already cover street lights).

    // Ramp / open space (keep spawn area very open near 0,0)
    addStaticBox(-120, 0, 120, 28, 0.6, 34, 0xadb9c8);
    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.6, 18),
      new THREE.MeshStandardMaterial({ color: 0xbfc9d6, roughness: 0.9, metalness: 0.02 })
    );
    ramp.position.set(-120, 0.3, 140);
    ramp.rotation.x = -0.22;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.scene.add(ramp);
    this._meshes.push(ramp);

    // Parking areas (visual)
    this._addParkingArea(new THREE.Vector3(80, 0, -80), 0);
    this._addParkingArea(new THREE.Vector3(-80, 0, 80), Math.PI * 0.5);

    // Optional traffic on main roads only
    // Uses visible collision AABBs (updated each tick) so impacts are obvious.
    this.traffic = [];
    this.dynamicAabbs = [];
    if (trafficOn) {
      const carGeo = new THREE.BoxGeometry(1.8, 1.1, 3.8);
      const colors = [0xffb84d, 0x4da3ff, 0x43d17a, 0xff4d6d, 0xb7c7dd];
      const mats = colors.map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.18, roughness: 0.55 }));
      const makeTraffic = (x, z, dir, mat) => {
        const mesh = new THREE.Mesh(carGeo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(x, 0.55, z);
        mesh.rotation.y = dir === "x" ? Math.PI / 2 : 0;
        this.scene.add(mesh);
        this._meshes.push(mesh);
        this.traffic.push({
          mesh,
          dir,
          speed: 12 + Math.random() * 6.5,
          offset: Math.random() * 999,
          halfW: 1.1,
          halfL: 2.2,
        });
      };
      const n = Math.min(18, Math.floor((bz * 2) / 120));
      for (let i = 0; i < n; i++) makeTraffic(-12, -bz + 60 + i * 120, "z", mats[i % mats.length]);
      for (let i = 0; i < n; i++) makeTraffic(-bx + 60 + i * 120, 12, "x", mats[(i + 2) % mats.length]);
    }

    // Kurdistan theme district + flags (visual only)
    this._buildKurdistanTheme({ q });
  }

  // (Async chunked builder can be added later if needed)

  _buildKurdistanTheme({ q }) {
    // Always create props, but show/hide via setting (fast toggle)
    this._themeGroup.clear();
    this.scene.add(this._themeGroup);
    this._meshes.push(this._themeGroup);
    this._themeGroup.visible = this._visible && this._themeOn;

    // Shared flag material (waving)
    const flagMat = makeWavingFlagMaterial();
    applyWavingToMaterial(flagMat, { amplitude: q === "low" ? 0.04 : 0.075, speed: 1.25 });
    this._flagMat = flagMat;

    // Instanced poles + flags
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 5.6, 10);
    const poleMat = new THREE.MeshStandardMaterial({ color: KURDISTAN_THEME.poleMetal, roughness: 0.55, metalness: 0.35 });
    const flagGeo = new THREE.PlaneGeometry(2.2, 1.25, 14, 6);
    const max = q === "low" ? 28 : q === "med" ? 60 : q === "high" ? 95 : 120;
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, max);
    const flags = new THREE.InstancedMesh(flagGeo, flagMat, max);
    poles.castShadow = q !== "low";
    flags.castShadow = q !== "low";
    poles.receiveShadow = true;
    flags.receiveShadow = false;
    this._themeGroup.add(poles);
    this._themeGroup.add(flags);

    const o = new THREE.Object3D();
    let n = 0;
    const placeFlag = (x, z, rotY = 0) => {
      if (n >= max) return;
      // pole
      o.position.set(x, 2.8, z);
      o.rotation.set(0, rotY, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      poles.setMatrixAt(n, o.matrix);
      // flag (offset from pole)
      o.position.set(x + Math.cos(rotY) * 1.15, 3.85, z - Math.sin(rotY) * 1.15);
      o.rotation.set(0, rotY, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      flags.setMatrixAt(n, o.matrix);
      n++;
    };

    // Spread flags in key places (roads, parks, intersections, parking)
    const points = [
      [0, 46, 0], [0, -46, Math.PI], [46, 0, -Math.PI / 2], [-46, 0, Math.PI / 2],
      [80, -80, 0], [-80, 80, Math.PI],
      [120, 120, Math.PI / 2], [-120, -120, -Math.PI / 2],
      [160, -40, 0], [-160, 40, Math.PI],
    ];
    for (const [x, z, r] of points) placeFlag(x, z, r);
    for (let i = -6; i <= 6; i++) {
      placeFlag(-18, i * 60, 0);
      placeFlag(18, i * 60, Math.PI);
      if (q !== "low") placeFlag(i * 60, -18, -Math.PI / 2);
      if (q !== "low") placeFlag(i * 60, 18, Math.PI / 2);
    }

    poles.count = n;
    flags.count = n;
    poles.instanceMatrix.needsUpdate = true;
    flags.instanceMatrix.needsUpdate = true;

    // Central plaza landmark: big flag + celebratory ring
    const plaza = new THREE.Group();
    plaza.position.set(-ringClamp(this.def.bounds?.x ?? 520, 180), 0, -ringClamp(this.def.bounds?.z ?? 520, 120));
    this._themeGroup.add(plaza);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.8, 1.2, 22),
      new THREE.MeshStandardMaterial({ color: 0xc9d2dd, roughness: 0.85, metalness: 0.02 })
    );
    base.position.set(0, 0.6, 0);
    base.receiveShadow = true;
    plaza.add(base);

    const bigPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 16, 14), poleMat);
    bigPole.position.set(0, 8.0, 0);
    bigPole.castShadow = q !== "low";
    plaza.add(bigPole);

    const bigFlagGeo = new THREE.PlaneGeometry(7.8, 4.2, 22, 10);
    const bigFlag = new THREE.Mesh(bigFlagGeo, flagMat);
    bigFlag.position.set(3.8, 12.2, 0);
    bigFlag.rotation.y = -0.2;
    bigFlag.castShadow = false;
    plaza.add(bigFlag);

    // Simple colored banner arc (festival feel)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(10.5, 0.25, 12, 64),
      new THREE.MeshStandardMaterial({ color: KURDISTAN_THEME.sunYellow, roughness: 0.55, metalness: 0.08 })
    );
    ring.position.set(0, 1.9, 0);
    ring.rotation.x = Math.PI / 2;
    plaza.add(ring);

    function ringClamp(v, max) {
      return Math.min(Math.max(v * 0.0 + max, -max), max);
    }
  }

  _addParkingArea(center, yaw) {
    const padW = 14;
    const padL = 18;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(padW, padL),
      new THREE.MeshStandardMaterial({ color: 0x2c5cff, transparent: true, opacity: 0.14, roughness: 0.4, metalness: 0.1 })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = yaw;
    m.position.set(center.x, 0.02, center.z);
    this.scene.add(m);
    this._meshes.push(m);

    const allowReflect = (this.settings?.quality || "auto") === "ultra";
    if (allowReflect) {
      const refl = new Reflector(new THREE.PlaneGeometry(padW, padL), { textureWidth: 512, textureHeight: 512, color: 0x07101f });
      refl.rotation.x = -Math.PI / 2;
      refl.rotation.z = yaw;
      refl.position.set(center.x, 0.012, center.z);
      refl.material.transparent = true;
      refl.material.opacity = 0.16;
      this.scene.add(refl);
      this._meshes.push(refl);
    }
  }

  _buildOptionalChallengeElements() {
    // Challenge defs (if present) can still provide checkpoints, traffic and a single parking target.
    // For Free Drive, these are simply absent.
    this.parking = null;
    this.checkpoints = [];
    this.checkpointIndex = 0;
    this.traffic = [];
  }

  destroy() {
    const world = this.physicsWorld?.world;
    if (world) for (const b of this._bodies) world.removeBody(b);
    this._bodies = [];

    const disposeObject3D = (root) => {
      if (!root) return;
      root.traverse?.((obj) => {
        if (obj.geometry?.dispose) obj.geometry.dispose();
        const mat = obj.material;
        const disposeMat = (m) => {
          if (!m) return;
          if (m.map?.dispose) m.map.dispose();
          if (m.normalMap?.dispose) m.normalMap.dispose();
          if (m.roughnessMap?.dispose) m.roughnessMap.dispose();
          if (m.metalnessMap?.dispose) m.metalnessMap.dispose();
          if (m.emissiveMap?.dispose) m.emissiveMap.dispose();
          m.dispose?.();
        };
        if (Array.isArray(mat)) mat.forEach(disposeMat);
        else disposeMat(mat);
      });
    };

    for (const m of this._meshes) {
      this.scene.remove(m);
      disposeObject3D(m);
    }
    this._meshes = [];
    this.traffic = [];
    this.occluders = [];
    this.solidAabbs = [];
  }

  tickTraffic(dt) {
    const bx = this.def.bounds?.x ?? 520;
    const bz = this.def.bounds?.z ?? 520;

    this.dynamicAabbs = [];
    for (const tc of this.traffic) {
      tc.offset += dt * tc.speed;
      if (tc.dir === "z") {
        tc.mesh.position.z = ((tc.offset % (bz * 2)) - bz);
        tc.mesh.position.x = -12;
        tc.mesh.rotation.y = 0;
        // AABB in XZ
        this.dynamicAabbs.push({
          minX: tc.mesh.position.x - tc.halfW,
          maxX: tc.mesh.position.x + tc.halfW,
          minZ: tc.mesh.position.z - tc.halfL,
          maxZ: tc.mesh.position.z + tc.halfL,
        });
      } else {
        tc.mesh.position.x = ((tc.offset % (bx * 2)) - bx);
        tc.mesh.position.z = 12;
        tc.mesh.rotation.y = Math.PI / 2;
        this.dynamicAabbs.push({
          minX: tc.mesh.position.x - tc.halfL,
          maxX: tc.mesh.position.x + tc.halfL,
          minZ: tc.mesh.position.z - tc.halfW,
          maxZ: tc.mesh.position.z + tc.halfW,
        });
      }
    }
  }

  checkCheckpointProgress(carPos) {
    if (!this.checkpoints.length) return { done: true, advanced: false };
    const idx = Math.min(this.checkpointIndex, this.checkpoints.length - 1);
    const cp = this.checkpoints[idx];
    const d = carPos.distanceTo(cp.center);
    if (d <= cp.r) {
      this.checkpointIndex = Math.min(this.checkpoints.length, this.checkpointIndex + 1);
      for (let i = 0; i < this.checkpoints.length; i++) {
        const active = i === this.checkpointIndex;
        const passed = i < this.checkpointIndex;
        if (this.checkpoints[i].mesh) {
          this.checkpoints[i].mesh.material.opacity = passed ? 0.08 : active ? 0.55 : 0.18;
        }
      }
      return { done: this.checkpointIndex >= this.checkpoints.length, advanced: true };
    }
    return { done: this.checkpointIndex >= this.checkpoints.length, advanced: false };
  }
}

