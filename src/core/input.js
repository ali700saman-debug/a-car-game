import { clamp } from "./time.js";

export class Input {
  constructor() {
    this.state = {
      steer: 0, // -1..1
      throttle: 0, // 0..1
      brake: 0, // 0..1 (Space / Brake button)
      reverse: 0, // 0..1 (S / BACK button)
      horn: 0, // 0..1 (H / Horn button) - edge handled in App
      cam: 0, // 0..1 (C / CAM button) - edge handled in App
      debug: 0, // 0..1 (F3) - edge handled in App
      reset: 0, // 0..1 (R / RESET button) - edge handled in App
      perf: 0, // 0..1 (F2) - edge handled in App
    };

    this._keys = new Set();
    this._touchHold = {
      left: false,
      right: false,
      gas: false,
      brake: false,
      back: false,
      horn: false,
      cam: false,
      reset: false,
    };
  }

  init() {
    window.addEventListener("keydown", (e) => {
      this._keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "F3"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this._keys.delete(e.code));

    const bindHold = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      let activePointerId = null;
      const setDown = (down) => {
        this._touchHold[key] = down;
        el.classList.toggle("isDown", down);
      };
      const down = (ev) => {
        // Multi-touch safe: capture pointer so small thumb moves don't cancel.
        try { ev.preventDefault(); } catch {}
        activePointerId = ev.pointerId ?? activePointerId;
        if (el.setPointerCapture && activePointerId != null) {
          try { el.setPointerCapture(activePointerId); } catch {}
        }
        setDown(true);
      };
      const up = (ev) => {
        try { ev.preventDefault(); } catch {}
        const pid = ev.pointerId ?? null;
        if (activePointerId != null && pid != null && pid !== activePointerId) return;
        if (el.releasePointerCapture && activePointerId != null) {
          try { el.releasePointerCapture(activePointerId); } catch {}
        }
        activePointerId = null;
        setDown(false);
      };

      el.addEventListener("pointerdown", down, { passive: false });
      el.addEventListener("pointerup", up, { passive: false });
      el.addEventListener("pointercancel", up, { passive: false });

      // Fallback for older mobile browsers
      el.addEventListener("touchstart", (e) => { e.preventDefault(); setDown(true); }, { passive: false });
      el.addEventListener("touchend", (e) => { e.preventDefault(); setDown(false); }, { passive: false });
      el.addEventListener("touchcancel", (e) => { e.preventDefault(); setDown(false); }, { passive: false });
    };

    bindHold("btnLeft", "left");
    bindHold("btnRight", "right");
    bindHold("btnGas", "gas");
    bindHold("btnBrake", "brake");
    bindHold("btnBack", "back");
    bindHold("btnHorn", "horn");
    bindHold("btnCam", "cam");
    bindHold("btnReset", "reset");
  }

  tick(dt) {
    const left = this._keys.has("KeyA") || this._keys.has("ArrowLeft") || this._touchHold.left;
    const right = this._keys.has("KeyD") || this._keys.has("ArrowRight") || this._touchHold.right;
    const gas = this._keys.has("KeyW") || this._keys.has("ArrowUp") || this._touchHold.gas;
    const reverseKey = this._keys.has("KeyS") || this._keys.has("ArrowDown") || this._touchHold.back;
    const brakeKey = this._keys.has("Space") || this._touchHold.brake;
    const hornKey = this._keys.has("KeyH") || this._touchHold.horn;
    const camKey = this._keys.has("KeyC") || this._touchHold.cam;
    const debugKey = this._keys.has("F3");
    const perfKey = this._keys.has("F2");
    const resetKey = this._keys.has("KeyR") || this._touchHold.reset;

    // IMPORTANT: enforce A/LeftArrow = steer LEFT, D/RightArrow = steer RIGHT
    // (some camera/world conventions may invert perceived direction; we lock it here)
    const steerTarget = left ? 1 : right ? -1 : 0;
    const throttleTarget = gas ? 1 : 0;
    const brakeTarget = brakeKey ? 1 : 0;
    const reverseTarget = reverseKey ? 1 : 0;
    const hornTarget = hornKey ? 1 : 0;
    const camTarget = camKey ? 1 : 0;
    const debugTarget = debugKey ? 1 : 0;
    const resetTarget = resetKey ? 1 : 0;
    const perfTarget = perfKey ? 1 : 0;

    // Smoothing for controller-like feel
    const steerSpeed = 10;
    const pedalSpeed = 14;
    const buttonSpeed = 22;

    this.state.steer = this.state.steer + (steerTarget - this.state.steer) * clamp(dt * steerSpeed, 0, 1);
    this.state.throttle =
      this.state.throttle + (throttleTarget - this.state.throttle) * clamp(dt * pedalSpeed, 0, 1);
    this.state.brake = this.state.brake + (brakeTarget - this.state.brake) * clamp(dt * pedalSpeed, 0, 1);
    this.state.reverse =
      this.state.reverse + (reverseTarget - this.state.reverse) * clamp(dt * pedalSpeed, 0, 1);

    // "buttons" treated as immediate-ish (still smoothed slightly)
    this.state.horn = this.state.horn + (hornTarget - this.state.horn) * clamp(dt * buttonSpeed, 0, 1);
    this.state.cam = this.state.cam + (camTarget - this.state.cam) * clamp(dt * buttonSpeed, 0, 1);
    this.state.debug = this.state.debug + (debugTarget - this.state.debug) * clamp(dt * buttonSpeed, 0, 1);
    this.state.reset = this.state.reset + (resetTarget - this.state.reset) * clamp(dt * buttonSpeed, 0, 1);
    this.state.perf = this.state.perf + (perfTarget - this.state.perf) * clamp(dt * buttonSpeed, 0, 1);
  }
}

