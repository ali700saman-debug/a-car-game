import { clamp } from "./time.js";

export class AudioBus {
  constructor(storage) {
    this.storage = storage;
    this.ctx = null;
    this.master = null;

    this.musicBus = null;
    this.sfxBus = null;
    this.engineBus = null;

    // Engine synth (smooth, filtered, low annoyance)
    this._eng = {
      oscLow: null,
      oscMid: null,
      noise: null,
      noiseFilter: null,
      filter: null,
      gain: null,
      targetRpm01: 0,
      targetLoad01: 0,
      rpm01: 0,
      load01: 0,
    };
  }

  async init() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.storage.settings.sound ? 0.9 : 0.0;
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = clamp(this.storage.settings.musicVol ?? 0.25, 0, 1);
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = clamp(this.storage.settings.sfxVol ?? 0.7, 0, 1);
    this.sfxBus.connect(this.master);

    this.engineBus = this.ctx.createGain();
    this.engineBus.gain.value = (this.storage.settings.engineOn ? 1 : 0) * clamp(this.storage.settings.engineVol ?? 0.25, 0, 1);
    this.engineBus.connect(this.master);

    this._initEngine();

    document.addEventListener(
      "pointerdown",
      async () => {
        if (!this.ctx) return;
        if (this.ctx.state !== "running") await this.ctx.resume();
      },
      { once: true }
    );
  }

  applySettings() {
    if (!this.master) return;
    this.master.gain.value = this.storage.settings.sound ? 0.9 : 0.0;

    if (this.musicBus) this.musicBus.gain.value = clamp(this.storage.settings.musicVol ?? 0.25, 0, 1);
    if (this.sfxBus) this.sfxBus.gain.value = clamp(this.storage.settings.sfxVol ?? 0.7, 0, 1);
    if (this.engineBus) {
      const on = !!this.storage.settings.engineOn;
      const vol = clamp(this.storage.settings.engineVol ?? 0.25, 0, 1);
      this.engineBus.gain.value = on ? vol : 0;
    }
  }

  _initEngine() {
    if (!this.ctx || !this.engineBus) return;

    const oscLow = this.ctx.createOscillator();
    oscLow.type = "sine";
    const oscMid = this.ctx.createOscillator();
    oscMid.type = "triangle";

    // A little filtered noise for texture (very low)
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.0, this.ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.25;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 180;
    noiseFilter.Q.value = 0.9;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.55;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.0;

    oscLow.connect(filter);
    oscMid.connect(filter);
    noise.connect(noiseFilter);
    noiseFilter.connect(filter);
    filter.connect(gain);
    gain.connect(this.engineBus);

    oscLow.start();
    oscMid.start();
    noise.start();

    this._eng.oscLow = oscLow;
    this._eng.oscMid = oscMid;
    this._eng.noise = noise;
    this._eng.noiseFilter = noiseFilter;
    this._eng.filter = filter;
    this._eng.gain = gain;
  }

  setEngine({ rpm01, load01, speedKmh }) {
    this._eng.targetRpm01 = clamp(rpm01, 0, 1);
    this._eng.targetLoad01 = clamp(load01, 0, 1);
    this._eng._speedKmh = Math.max(0, speedKmh || 0);
  }

  tick(dt) {
    if (!this.ctx || !this._eng.gain || !this._eng.filter || !this._eng.oscLow || !this._eng.oscMid) return;

    // Smooth response
    const a = 1 - Math.exp(-6 * dt);
    this._eng.rpm01 += (this._eng.targetRpm01 - this._eng.rpm01) * a;
    this._eng.load01 += (this._eng.targetLoad01 - this._eng.load01) * a;

    const t = this.ctx.currentTime;

    // Map to pleasant engine band (avoid buzzy highs)
    const base = 42; // idle fundamental
    const rpmHz = base + this._eng.rpm01 * 88 + (this._eng._speedKmh || 0) * 0.15;
    const midHz = rpmHz * 2.02;

    // Gain: quiet at idle, increases smoothly with load
    const idle = 0.02;
    const vol = idle + this._eng.rpm01 * 0.05 + this._eng.load01 * 0.09;

    // Filter opens with load/rpm
    const cutoff = 420 + this._eng.rpm01 * 520 + this._eng.load01 * 380;

    this._eng.oscLow.frequency.setTargetAtTime(rpmHz, t, 0.06);
    this._eng.oscMid.frequency.setTargetAtTime(midHz, t, 0.06);
    this._eng.filter.frequency.setTargetAtTime(cutoff, t, 0.08);
    this._eng.gain.gain.setTargetAtTime(vol, t, 0.08);
  }

  playClick() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(850, t);
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g);
    g.connect(this.sfxBus || this.master);
    o.start(t);
    o.stop(t + 0.07);
  }

  playCrash(intensity01 = 0.5) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const dur = 0.18;
    const n = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const amp = clamp(intensity01, 0, 1);
    for (let i = 0; i < data.length; i++) {
      const x = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * x * amp;
    }
    n.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = 0.45;
    n.connect(g);
    g.connect(this.sfxBus || this.master);
    n.start(t);
  }

  playWin() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.18);
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g);
    g.connect(this.sfxBus || this.master);
    o.start(t);
    o.stop(t + 0.36);
  }

  playHorn() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(1400, t);
    filt.Q.setValueAtTime(0.7, t);

    o1.type = "sawtooth";
    o2.type = "square";
    o1.frequency.setValueAtTime(420, t);
    o2.frequency.setValueAtTime(520, t);

    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.02);
    g.gain.linearRampToValueAtTime(0.0, t + 0.22);

    o1.connect(filt);
    o2.connect(filt);
    filt.connect(g);
    g.connect(this.sfxBus || this.master);

    o1.start(t);
    o2.start(t);
    o1.stop(t + 0.23);
    o2.stop(t + 0.23);
  }
}

