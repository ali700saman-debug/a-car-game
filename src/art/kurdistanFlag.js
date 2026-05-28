import * as THREE from "three";
import { KURDISTAN_THEME } from "./kurdistanTheme.js";

let _flagTex = null;

export function getKurdistanFlagTexture() {
  if (_flagTex) return _flagTex;

  const w = 512;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  // stripes
  ctx.fillStyle = `#${KURDISTAN_THEME.red.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, w, h / 3);
  ctx.fillStyle = `#${KURDISTAN_THEME.white.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, h / 3, w, h / 3);
  ctx.fillStyle = `#${KURDISTAN_THEME.green.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, (h / 3) * 2, w, h / 3);

  // sun emblem (21 rays)
  const cx = w * 0.5;
  const cy = h * 0.5;
  const r0 = h * 0.18;
  const r1 = h * 0.30;
  const rays = 21;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = `#${KURDISTAN_THEME.sunYellow.toString(16).padStart(6, "0")}`;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a + (Math.PI * 2) / rays * 0.42) * r1, Math.sin(a + (Math.PI * 2) / rays * 0.42) * r1);
    ctx.lineTo(Math.cos(a - (Math.PI * 2) / rays * 0.42) * r1, Math.sin(a - (Math.PI * 2) / rays * 0.42) * r1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r0 * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  _flagTex = tex;
  return tex;
}

export function makeWavingFlagMaterial({ opacity = 1.0 } = {}) {
  const map = getKurdistanFlagTexture();
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });
  // mark for users that want to animate via onBeforeCompile
  mat.userData._waving = true;
  return mat;
}

export function applyWavingToMaterial(material, { amplitude = 0.08, speed = 1.2 } = {}) {
  // Lightweight vertex waving using onBeforeCompile (keeps InstancedMesh compatible)
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uAmp = { value: amplitude };
    shader.uniforms.uSpeed = { value: speed };
    material.userData._shader = shader;

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uAmp;
      uniform float uSpeed;
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      float wave = sin((position.x * 4.0) + (uTime * uSpeed)) * uAmp;
      float taper = smoothstep(-0.5, 0.5, position.x);
      transformed.z += wave * taper;
      `
    );
  };
  material.needsUpdate = true;
}

export function tickWavingMaterial(material, t) {
  const s = material?.userData?._shader;
  if (s?.uniforms?.uTime) s.uniforms.uTime.value = t;
}

