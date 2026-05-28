import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

function makeSkyGradientTexture(top = "#73b9ff", mid = "#bfe6ff", bottom = "#eaf7ff") {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function pickDpr(settings) {
  const q = (settings?.quality || "med").toLowerCase();
  const isMobile = matchMedia("(pointer: coarse)").matches;
  const base = window.devicePixelRatio || 1;
  const max =
    q === "low" ? 1.1 :
    q === "med" ? 1.45 :
    q === "high" ? 1.75 :
    q === "ultra" ? 2.0 :
    1.45;
  const mobileCap = isMobile ? Math.min(max, 1.35) : max;
  return Math.min(base, mobileCap);
}

export class Renderer3D {
  constructor({ canvas, settings }) {
    this.canvas = canvas;
    this.settings = settings;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: (settings?.quality || "med") !== "low",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Shadows can be expensive; auto-disable on low unless user explicitly enabled
    const q = (settings?.quality || "med").toLowerCase();
    this.renderer.shadowMap.enabled = q === "low" ? false : !!settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = null;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
    this.camera.position.set(0, 6, 12);

    this._initLights();
    this._initEnv();

    this.resize();
    window.addEventListener("resize", () => this.resize(), { passive: true });
  }

  _initLights() {
    const hemi = new THREE.HemisphereLight(0xbfe7ff, 0xffffff, 1.05);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-28, 45, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 260;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.bias = -0.00008;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(38, 18, -28);
    this.scene.add(fill);

    this._sun = sun;
    this._hemi = hemi;
  }

  _initEnv() {
    // Daytime sky
    this.scene.background = makeSkyGradientTexture("#66b6ff", "#cfeeff", "#f2fbff");

    // Environment map (cheap but effective)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(this.renderer), 0.04).texture;
    this.scene.environment = envTex;
    pmrem.dispose();
  }

  applyTimeOfDay(mode) {
    // day | sunset | night
    const m = mode || "day";
    if (m === "sunset") {
      this.scene.background = makeSkyGradientTexture("#ffb36b", "#ffd9b0", "#fff1dc");
      this._hemi.intensity = 0.9;
      this._sun.intensity = 1.55;
      this._sun.color.setHex(0xffd3a5);
      this.renderer.toneMappingExposure = 1.15;
      return;
    }
    if (m === "night") {
      this.scene.background = makeSkyGradientTexture("#0a1a3a", "#10224a", "#172c4f");
      this._hemi.intensity = 0.45;
      this._sun.intensity = 0.25;
      this._sun.color.setHex(0xcfe6ff);
      this.renderer.toneMappingExposure = 1.0;
      return;
    }
    // default day
    this.scene.background = makeSkyGradientTexture("#66b6ff", "#cfeeff", "#f2fbff");
    this._hemi.intensity = 1.05;
    this._sun.intensity = 2.1;
    this._sun.color.setHex(0xffffff);
    this.renderer.toneMappingExposure = 1.12;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const dpr = pickDpr(this.settings);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

