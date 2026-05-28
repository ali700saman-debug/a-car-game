export class PerfHud {
  constructor({ renderer, storage }) {
    this.renderer = renderer;
    this.storage = storage;
    this.enabled = false;
    this._acc = 0;
    this._frames = 0;
    this._fps = 0;

    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:9999;" +
      "padding:10px 12px;border-radius:14px;" +
      "background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.18);" +
      "color:#eaf0ff;font:700 12px system-ui,Segoe UI,Arial;" +
      "backdrop-filter: blur(10px);pointer-events:none;display:none;min-width:190px";
    document.body.appendChild(this.el);
  }

  setEnabled(on) {
    this.enabled = !!on;
    this.el.style.display = this.enabled ? "block" : "none";
  }

  tick(dt, extra = {}) {
    if (!this.enabled) return;
    this._acc += dt;
    this._frames++;
    if (this._acc >= 0.5) {
      this._fps = Math.round(this._frames / this._acc);
      this._acc = 0;
      this._frames = 0;
    }
    const info = this.renderer.info;
    const q = this.storage.settings.quality || "med";
    this.el.textContent =
      `FPS: ${this._fps}\n` +
      `Quality: ${q}\n` +
      `Objects: ${extra.objects ?? 0}\n` +
      `Draw calls: ${info.render.calls}\n` +
      `Triangles: ${info.render.triangles}\n` +
      `Geoms: ${info.memory.geometries} • Tex: ${info.memory.textures}\n` +
      `Traffic: ${extra.traffic ?? 0}`;
  }
}

