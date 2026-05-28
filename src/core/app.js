import * as THREE from "three";
import { Clock, clamp } from "./time.js";
import { Storage } from "./storage.js";
import { AudioBus } from "./audio.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";
import { Renderer3D } from "./renderer.js";
import { PhysicsWorld } from "./physics.js";
import { LEVELS } from "../levels/levels.js";
import { CITY, CHALLENGES } from "../levels/city.js";
import { Car } from "../game/car.js";
import { LevelInstance } from "../game/level.js";
import { ChaseCamera } from "../game/camera.js";
import { Particles } from "../game/particles.js";
import { ColliderDebug } from "../game/colliderDebug.js";
import { CARS, getCarById } from "../game/cars.js";
import { RaceTrack } from "../race/track.js";
import { RaceBot } from "../race/bot.js";
import { MultiplayerClient } from "../net/multiplayer.js";
import { PerfHud } from "./perfHud.js";
import { getDefaultMultiplayerServerUrl } from "../net/config.js";

function wrapPi(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function angleDiff(a, b) {
  return Math.abs(wrapPi(a - b));
}

export class App {
  constructor({ canvas, onProgress, onStage }) {
    this.canvas = canvas;
    this.onProgress = onProgress || (() => {});
    this.onStage = onStage || (() => {});

    this.storage = new Storage();
    this.audio = new AudioBus(this.storage);
    this.input = new Input();
    this.ui = new UI(this.storage);

    this.renderer3d = null;
    this.physics = null;
    this.car = null;
    this.level = null;
    this._cityLevel = null;
    this.chaseCam = null;
    this.particles = null;
    this.colliderDebug = null;
    this.perfHud = null;

    this.clock = new Clock();
    this._raf = 0;

    this.state = "menu"; // menu | playing | paused | results
    this.mode = "free"; // free | challenge
    this.levelIndex = 1; // challenge index (1-based)
    this.timeLeftMs = 0;
    this.timeElapsedMs = 0;
    this._levelDone = false;
    this._checkpointsDone = false;

    this._prevHorn = 0;
    this._prevCam = 0;
    this._prevDebug = 0;
    this._prevReset = 0;
    this._prevPerf = 0;
    this.cameraMode = 0; // 0 chase, 1 close, 2 top

    // Menu backdrop (lightweight)
    this._menuBg = {
      group: new THREE.Group(),
      car: null,
      t: 0,
      active: false,
    };

    // Car select flow
    this._carSelectIndex = 0;
    this._carSelectConfirmed = false;
    this._carSelectMode = "garage"; // garage | freeDrive | race

    // Race mode state (kept separate from city)
    this.race = {
      active: false,
      track: null,
      bots: [],
      opponents: 3,
      laps: 3,
      difficulty: "normal",
      elapsedMs: 0,
      lapStartMs: 0,
      bestLapMs: null,
      cpCount: 0,
      playerCp: 0,
      playerLap: 1,
      lastCheckpoint: { x: 0, y: 0.9, z: 0, yaw: 0 },
    };

    // Multiplayer
    this.mp = {
      client: null,
      room: "",
      serverUrl: "",
    };
  }

  async init() {
    this.onProgress(0.08);
    this.input.init();

    this.onProgress(0.12);
    this.renderer3d = new Renderer3D({ canvas: this.canvas, settings: this.storage.settings });
    this.physics = new PhysicsWorld();

    this.onProgress(0.18);
    await this.audio.init();

    this.onProgress(0.25);
    this.ui.init({
      challengeCount: CHALLENGES.length,
      onFreeDrive: () => this.openCarSelect("freeDrive"),
      onOpenMultiplayer: () => this.openMultiplayerMenu(),
      onMpCreate: () => this.mpCreateRoom(),
      onMpJoin: () => this.mpJoinRoom(),
      onMpBack: () => this.ui.showMainMenu(),
      onMpLeave: () => this.leaveMultiplayer(),
      onOpenProfile: () => this.ui.showProfileMenu(),
      onOpenHowToPlay: () => this.ui.showHowToPlay(),
      onOpenRaceSetup: () => this.openRaceSetup(),
      onRaceStart: () => this.startRaceFromSetup(),
      onOpenChallenges: () => {
        this.ui.refreshChallenges(CHALLENGES.length, (i) => this.startChallenge(i));
        this.ui.showChallengesMenu();
      },
      onOpenGarage: () => {
        this.openCarSelect("garage");
      },
      onOpenSettings: () => this.ui.showSettingsMenu(),
      onSubmitProfile: (name) => this.submitProfile(name),
      onPickCar: (id) => this.pickCar(id),
      onPrevCar: () => this.selectPrevCar(),
      onNextCar: () => this.selectNextCar(),
      onSelectCar: () => this.confirmSelectedCar(),
      onStartDriving: () => this.startDrivingFromSelect(),
      onPickColor: (c) => this.pickColor(c),
      onPickChallenge: (i) => this.startChallenge(i),
      onPause: () => this.pause(),
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onQuit: () => this.quitToMenu(),
      onNext: () => this.nextLevel(),
      onPauseGarage: () => this.openCarSelect("garage"),
      onPauseSettings: () => this.ui.showSettingsMenu(),
    });

    // Pause menu reset car button (not part of UI class wiring)
    const btnResetCar = document.getElementById("btnResetCar");
    if (btnResetCar) btnResetCar.addEventListener("click", () => this.resetCar());

    // Apply settings side-effects
    window.addEventListener("storage", () => {
      this.storage.load();
      this.audio.applySettings();
    });
    const settingsObserver = new MutationObserver(() => {
      this.audio.applySettings();
      this.renderer3d.renderer.shadowMap.enabled = !!this.storage.settings.shadows;
      this.renderer3d.applyTimeOfDay(this.storage.settings.timeOfDay || "day");
      this.renderer3d.resize();
      // Kurdistan theme toggle (no rebuild)
      this._cityLevel?.setThemeEnabled?.(this.storage.settings.kurdistanTheme !== false);
      this.car?.setThemeEnabled?.(this.storage.settings.kurdistanTheme !== false);
    });
    settingsObserver.observe(document.getElementById("settingsMenu"), { subtree: true, attributes: true, childList: true });

    // UI button click SFX (only when sound is enabled)
    document.body.addEventListener(
      "click",
      (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.tagName === "BUTTON" || t.closest("button")) this.audio.playClick();
      },
      { passive: true }
    );

    this.onProgress(0.35);
    this.car = new Car({ physicsWorld: this.physics, scene: this.renderer3d.scene });
    // Apply saved car selection
    this.car.setCarId(this.storage.profile?.selectedCarId || "coupe");
    this.car.setColorId(this.storage.profile?.selectedColor || "blue");
    this.car.setThemeEnabled?.(this.storage.settings.kurdistanTheme !== false);
    this.chaseCam = new ChaseCamera(this.renderer3d.camera);
    this.particles = new Particles(this.renderer3d.scene);
    this.colliderDebug = new ColliderDebug({ scene: this.renderer3d.scene, world: this.physics.world });
    this.perfHud = new PerfHud({ renderer: this.renderer3d.renderer, storage: this.storage });
    this.race.track = new RaceTrack({ scene: this.renderer3d.scene, settings: this.storage.settings });
    this.mp.client = new MultiplayerClient({ scene: this.renderer3d.scene, physicsWorld: this.physics, ui: this.ui, storage: this.storage });

    this._initMenuBackdrop();

    // Apply initial time-of-day
    this.renderer3d.applyTimeOfDay(this.storage.settings.timeOfDay || "day");

    this.onProgress(0.5);

    // Prebuild the city during loading to prevent runtime stutters
    this.onStage("Building city…");
    this._cityLevel = new LevelInstance({
      def: CITY,
      physicsWorld: this.physics,
      scene: this.renderer3d.scene,
      settings: this.storage.settings,
    });
    if (typeof this._cityLevel.buildAsync === "function") {
      await this._cityLevel.buildAsync({
        onProgress: (p) => this.onProgress(0.5 + 0.45 * p),
        onStage: (t) => this.onStage(t),
      });
    } else {
      this._cityLevel.build();
      this.onProgress(0.95);
    }
    if (typeof this._cityLevel.setVisible === "function") this._cityLevel.setVisible(false);

    this.onStage("Warming up shaders…");
    for (let i = 0; i < 2; i++) this.renderer3d.render();

    // Require profile name once (local-only)
    if (!this.storage.profile?.name) this.ui.showProfileMenu();
    else this.ui.showMainMenu();
    this._setMenuBackdropActive(true);
    this.onProgress(1.0);
    this.onStage("Ready");
  }

  submitProfile(name) {
    const n = String(name || "").trim();
    if (!n) {
      this.ui.toastMessage("Please enter a name");
      return;
    }
    this.storage.setProfileName(n);
    this.ui.showMainMenu();
  }

  pickCar(id) {
    const def = getCarById(id);
    this.storage.setSelectedCarId(def.id);
    this.car.setCarId(def.id);
    this.ui.renderGarage(CARS, def.id, (x) => this.pickCar(x));
    this.ui.toastMessage(`Selected: ${def.name}`);
  }

  openCarSelect(mode) {
    this._carSelectMode = mode;
    const savedId = this.storage.profile?.selectedCarId || CARS[0].id;
    const savedColor = this.storage.profile?.selectedColor || getCarById(savedId).visuals.defaultColorId;
    this._carSelectIndex = Math.max(0, CARS.findIndex((c) => c.id === savedId));
    this._carSelectConfirmed = mode === "garage"; // garage doesn't require "Start"
    const car = CARS[this._carSelectIndex];
    car._colorHex = this._colorHex(savedColor, car);
    this.ui.renderGarage(CARS, savedId, (id) => {
      this._carSelectIndex = Math.max(0, CARS.findIndex((c) => c.id === id));
      this._carSelectConfirmed = mode === "garage";
      this._syncCarSelectUI();
    });
    this.ui.showGarageMenu();
    this._syncCarSelectUI();
  }

  _colorHex(colorId, car) {
    const map = {
      blue: 0x1676ff,
      red: 0xff4d6d,
      black: 0x0e1118,
      white: 0xf5f7ff,
      yellow: 0xffd24b,
      green: 0x43d17a,
      purple: 0x8a5cff,
      silver: 0xb7c7dd,
      orange: 0xff8a3d,
    };
    return map[colorId] ?? map[car.visuals.defaultColorId] ?? 0x1676ff;
  }

  _syncCarSelectUI() {
    const car = CARS[this._carSelectIndex] || CARS[0];
    const colorId = this.storage.profile?.selectedColor || car.visuals.defaultColorId;
    car._colorHex = this._colorHex(colorId, car);
    this.ui.updateCarSelector({ car, colorId, confirmed: this._carSelectMode === "garage" ? true : this._carSelectConfirmed });
  }

  selectPrevCar() {
    this._carSelectIndex = (this._carSelectIndex - 1 + CARS.length) % CARS.length;
    this._carSelectConfirmed = this._carSelectMode === "garage";
    this._syncCarSelectUI();
  }
  selectNextCar() {
    this._carSelectIndex = (this._carSelectIndex + 1) % CARS.length;
    this._carSelectConfirmed = this._carSelectMode === "garage";
    this._syncCarSelectUI();
  }

  pickColor(colorId) {
    this.storage.setSelectedColor(colorId);
    this.car.setColorId(colorId);
    this.car.setThemeEnabled?.(this.storage.settings.kurdistanTheme !== false);
    this._syncCarSelectUI();
  }

  confirmSelectedCar() {
    const car = CARS[this._carSelectIndex] || CARS[0];
    this.storage.setSelectedCarId(car.id);
    this.car.setCarId(car.id);
    // If current color is missing, default to car's suggested color
    if (!this.storage.profile?.selectedColor) {
      this.storage.setSelectedColor(car.visuals.defaultColorId);
      this.car.setColorId(car.visuals.defaultColorId);
    }
    this._carSelectConfirmed = true;
    this._syncCarSelectUI();
  }

  startDrivingFromSelect() {
    if (this._carSelectMode !== "freeDrive") {
      this.ui.showMainMenu();
      return;
    }
    if (!this._carSelectConfirmed) {
      this.ui.toastMessage("Select a car first");
      return;
    }
    this.startFreeDrive();
  }

  start() {
    // Guard against accidentally creating multiple RAF loops
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.clock = new Clock();
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = this.clock.tick();
      this.tick(dt);
    };
    loop();
  }

  tick(dt) {
    this.ui.tick(dt);
    this.input.tick(dt);
    this.particles.tick(dt);

    if (this.state === "menu") {
      this._tickMenuBackdrop(dt);
    }

    if (this.state === "playing") {
      this._setMenuBackdropActive(false);
      const playerName = this.storage.profile?.name || "—";
      const vehicleName = getCarById(this.storage.profile?.selectedCarId || "coupe").name;
      if (this.mode === "challenge") {
        this.timeLeftMs = Math.max(0, this.timeLeftMs - dt * 1000);
        this.timeElapsedMs += dt * 1000;
        this.ui.setHUD({ timeMs: this.timeLeftMs, hits: this.car.hits, levelIndex: this.levelIndex, playerName, vehicleName });
      } else {
        // Free drive: no timer pressure
        this.timeElapsedMs += dt * 1000;
        this.ui.setHUD({ timeMs: 0, hits: this.car.hits, levelIndex: 0, playerName, vehicleName });
      }

      // Controls & physics
      const solids =
        this.mode === "race"
          ? [...(this.race.track?.solidAabbs || []), ...this._raceBotAabbs()]
          : [...(this.level?.solidAabbs || []), ...(this.level?.dynamicAabbs || [])];
      this.car.applyControls(this.input.state, dt, solids);
      // Keep physics world for collider debug only (static bodies)
      // this.physics.step(dt);
      if (this.mode !== "race") this.level?.tickTraffic(dt);
      this.level?.tick?.(dt, this.timeElapsedMs / 1000);
      this.car.syncVisuals();
      this.colliderDebug.tick();
      if (this.mode === "race") this._tickRace(dt, solids);
      if (this.mode === "race") this.race.track?.tick?.(this.race.elapsedMs / 1000);
      if (this.mode === "multi") {
        this.mp.client.tickLocal({ dt, car: this.car });
        this.mp.client.tickRemote({ dt });
      }

      // Camera
      const carPos = this.car.getPosition();
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.car.mesh.quaternion);
      this._tickCamera({ carPos, forward, dt });

      // Audio
      this.audio.tick(dt);

      // Horn edge
      if (this.input.state.horn > 0.6 && this._prevHorn <= 0.6) this.audio.playHorn();
      this._prevHorn = this.input.state.horn;

      // Camera toggle edge
      if (this.input.state.cam > 0.6 && this._prevCam <= 0.6) this.toggleCamera();
      this._prevCam = this.input.state.cam;

      // Collider debug toggle edge
      if (this.input.state.debug > 0.6 && this._prevDebug <= 0.6) {
        const next = !this.colliderDebug.enabled;
        this.colliderDebug.setEnabled(next);
        this.ui.toastMessage(next ? "Collider Debug ON" : "Collider Debug OFF");
      }
      this._prevDebug = this.input.state.debug;

      // Reset car edge (R / RESET)
      if (this.input.state.reset > 0.6 && this._prevReset <= 0.6) this.resetCar();
      this._prevReset = this.input.state.reset;

      // Perf HUD toggle (F2)
      const perf = this.input.state.perf || 0;
      if (perf > 0.6 && this._prevPerf <= 0.6) {
        this.perfHud.setEnabled(!this.perfHud.enabled);
        this.ui.toastMessage(this.perfHud.enabled ? "Perf HUD ON" : "Perf HUD OFF");
      }
      this._prevPerf = perf;

      // Crash SFX (based on hit count bumps)
      if (this.car.hits > 0 && this.car.hits !== this._lastHitCount) {
        const intensity = this.mode === "challenge" ? 0.65 : 0.45;
        this.particles.burstCrash(this.car.getPosition(), intensity);
        this.audio.playCrash(intensity);
      }
      this._lastHitCount = this.car.hits;

      // Mode-specific logic
      if (this.mode === "challenge") {
        const def = LEVELS[this.levelIndex - 1];
        const cp = this.level.checkCheckpointProgress(carPos);
        if (cp.advanced) this.ui.toastMessage("Checkpoint!");
        this._checkpointsDone = cp.done;

        const loseReason = this._getLoseReason(def, carPos);
        if (loseReason) {
          this.finishLevel(false, loseReason);
        } else {
          const parked = this._isParked(def, carPos);
          if (parked && this._checkpointsDone) {
            this.finishLevel(true, "Challenge complete!");
          } else if (parked && !this._checkpointsDone) {
            this.ui.toastMessage("Clear checkpoints first!");
          }
        }
      } else {
        // Free drive boundaries only
        const loseReason = this._getFreeDriveFail(carPos);
        if (loseReason) this.respawnFreeDrive();
      }

      // Speedometer
      const kmh = this.car.getSpeedKmh();
      const gear = this._inferGear();
      this.ui.setSpeedometer({
        speedKmh: kmh,
        gear,
        hits: this.car.hits,
        mode: this.mode === "free" ? "FREE" : this.mode === "race" ? "RACE" : this.mode === "multi" ? "MP" : "CHALL",
        objective:
          this.mode === "free"
            ? "Drive freely"
            : this.mode === "race"
              ? `Complete ${this.race.laps} laps`
              : this.mode === "multi"
                ? "Drive with friends"
                : "Complete objective",
      });

      // Smooth engine sound
      const rpm01 = clamp(kmh / 240, 0, 1);
      const load01 = clamp(this.input.state.throttle * 0.95 + this.input.state.reverse * 0.65, 0, 1);
      this.audio.setEngine({ rpm01, load01, speedKmh: kmh });
    }

    this.renderer3d.render();
    this.perfHud?.tick(dt, {
      traffic: this.level?.traffic?.length || 0,
      objects: (this.level?._meshes?.length || 0) + (this.race?.track?.meshes?.length || 0) + (this.mp?.client?.remote?.size || 0),
    });
  }

  _initMenuBackdrop() {
    const g = this._menuBg.group;
    g.name = "menuBackdrop";

    // Soft ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(18, 48),
      new THREE.MeshStandardMaterial({ color: 0x1b2736, roughness: 0.95, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.004;
    ground.receiveShadow = true;
    g.add(ground);

    // Simple skyline blocks (cheap)
    const matA = new THREE.MeshStandardMaterial({ color: 0x2a3e57, roughness: 0.9 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x1f2f45, roughness: 0.95 });
    for (let i = 0; i < 10; i++) {
      const w = 3 + Math.random() * 2.2;
      const h = 6 + Math.random() * 8.5;
      const d = 3 + Math.random() * 2.4;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 2 ? matA : matB);
      const a = (i / 10) * Math.PI * 2;
      const r = 16 + Math.random() * 4;
      m.position.set(Math.sin(a) * r, h / 2, Math.cos(a) * r);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }

    // Display car (separate from gameplay car)
    this._menuBg.car = new Car({ physicsWorld: this.physics, scene: this.renderer3d.scene });
    this._menuBg.car.setCarId(this.storage.profile?.selectedCarId || "coupe");
    this._menuBg.car.setColorId(this.storage.profile?.selectedColor || "blue");
    this._menuBg.car.spawn({ x: 0, y: 0.9, z: 0, yaw: 0 });
    this._menuBg.car.syncVisuals();
    g.add(this._menuBg.car.mesh);

    this.renderer3d.scene.add(g);
    g.visible = false;
  }

  _setMenuBackdropActive(on) {
    this._menuBg.active = on;
    if (this._menuBg.group) this._menuBg.group.visible = !!on;
  }

  _tickMenuBackdrop(dt) {
    if (!this._menuBg.active) return;
    this._menuBg.t += dt;

    // Keep selected appearance up to date (if user changed in garage)
    const wantId = this.storage.profile?.selectedCarId || "coupe";
    const wantColor = this.storage.profile?.selectedColor || "blue";
    if (this._menuBg._id !== wantId) {
      this._menuBg.car.setCarId(wantId);
      this._menuBg._id = wantId;
    }
    if (this._menuBg._color !== wantColor) {
      this._menuBg.car.setColorId(wantColor);
      this._menuBg._color = wantColor;
    }

    // Subtle car rotation (premium showroom feel)
    const car = this._menuBg.car;
    car.drive.yaw = Math.sin(this._menuBg.t * 0.35) * 0.22;
    car.drive.wheelSpin = this._menuBg.t * 0.6;
    car.syncVisuals();

    // Orbit camera (light + smooth)
    const t = this._menuBg.t;
    const cam = this.renderer3d.camera;
    const r = 10.8;
    const x = Math.sin(t * 0.18) * r;
    const z = Math.cos(t * 0.18) * r;
    cam.position.lerp(new THREE.Vector3(x, 5.1, z), 1 - Math.exp(-4 * dt));
    cam.lookAt(0, 1.2, 0);
  }

  _inferGear() {
    const v = this.car.drive?.speed ?? 0;
    if (Math.abs(v) < 0.25) return "N";
    return v > 0 ? "D" : "R";
  }

  _tickCamera({ carPos, forward, dt }) {
    // Camera modes:
    // 0: chase (default), 1: close, 2: top
    const speed01 = clamp(this.car.getSpeedKmh() / 260, 0, 1);
    // Speed FOV effect for fast driving feel (subtle)
    const cam = this.renderer3d.camera;
    const targetFov = this.cameraMode === 2 ? 60 : 62 + 12 * speed01;
    cam.fov = cam.fov + (targetFov - cam.fov) * (1 - Math.exp(-6 * dt));
    cam.updateProjectionMatrix();
    if (this.cameraMode === 0) {
      this.chaseCam.cfg.height = 5.6;
      this.chaseCam.cfg.distance = 13.4;
      this.chaseCam.cfg.lookAhead = 6.8;
      this.chaseCam.tick({ carPos, carForward: forward, speed01, dt, occluders: this.level?.occluders || [] });
      return;
    }
    if (this.cameraMode === 1) {
      this.chaseCam.cfg.height = 2.6;
      this.chaseCam.cfg.distance = 6.2;
      this.chaseCam.cfg.lookAhead = 3.2;
      this.chaseCam.tick({ carPos, carForward: forward, speed01, dt, occluders: this.level?.occluders || [] });
      return;
    }
    // Top-down
    const desired = carPos.clone().add(new THREE.Vector3(0, 22, 0));
    cam.position.lerp(desired, 1 - Math.exp(-8 * dt));
    cam.lookAt(carPos.x, carPos.y + 0.2, carPos.z);
  }

  toggleCamera() {
    this.cameraMode = (this.cameraMode + 1) % 3;
    this.ui.toastMessage(this.cameraMode === 0 ? "Camera: Chase" : this.cameraMode === 1 ? "Camera: Close" : "Camera: Top");
  }

  _getFreeDriveFail(carPos) {
    const bx = CITY.bounds.x;
    const bz = CITY.bounds.z;
    if (carPos.y < CITY.bounds.yMin) return "Fell";
    if (Math.abs(carPos.x) > bx + 8 || Math.abs(carPos.z) > bz + 8) return "Out";
    return null;
  }

  _getLoseReason(def, carPos) {
    if (this.timeLeftMs <= 0) return "Time up";
    if (this.car.hits >= def.maxHits) return "Too many crashes";
    if (carPos.y < def.bounds.yMin) return "Fell off";
    if (Math.abs(carPos.x) > def.bounds.x || Math.abs(carPos.z) > def.bounds.z) return "Out of bounds";
    return null;
  }

  _isParked(def, carPos) {
    const pk = def.parking;
    const local = carPos.clone().sub(new THREE.Vector3(pk.x, 0, pk.z));
    // Rotate into parking frame
    local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -pk.yaw);
    const inside = Math.abs(local.x) <= pk.w * 0.5 && Math.abs(local.z) <= pk.l * 0.5;
    if (!inside) return false;

    const speed = this.car.getSpeedKmh();
    if (speed > 2.0) return false;

    const yaw = this.car.getYaw();
    const yawOk = angleDiff(yaw, pk.yaw) <= THREE.MathUtils.degToRad(18);
    if (!yawOk) return false;
    return true;
  }

  startFreeDrive() {
    this._endRaceIfActive();
    this._setMenuBackdropActive(false);
    this.mode = "free";
    // Use prebuilt city (built during loading) to avoid stutters
    if (this.level && this.level !== this._cityLevel) this.level.destroy();
    this.level = this._cityLevel || this.level;
    if (typeof this.level?.setVisible === "function") this.level.setVisible(true);
    this.car.spawn(CITY.spawn);
    this.car.resetHits();
    this._lastHitCount = 0;
    this.timeLeftMs = 0;
    this.timeElapsedMs = 0;
    this._checkpointsDone = true;

    this.state = "playing";
    this.ui.showGame();
    this.ui.toastMessage("Drive freely around the city • Press H / HORN to honk • Use BACK to reverse");
    this.chaseCam.reset(this.car.getPosition());
  }

  openMultiplayerMenu() {
    const savedUrl = localStorage.getItem("mp_server_url") || getDefaultMultiplayerServerUrl();
    const savedRoom = localStorage.getItem("mp_room") || "";
    const name = this.storage.profile?.name || "";
    this.ui.showMultiplayerMenu({ name, room: savedRoom, serverUrl: savedUrl, statusText: "Offline" });
  }

  async mpCreateRoom() {
    const name = String(this.ui.mpName.value || this.storage.profile?.name || "").trim();
    const url = String(this.ui.mpServerUrl.value || getDefaultMultiplayerServerUrl()).trim();
    localStorage.setItem("mp_server_url", url);
    if (name) this.storage.setProfileName(name);

    try {
      this.ui.mpStatus.textContent = "Connecting…";
      await this.mp.client.connect({ serverUrl: url, name });
      this.ui.mpStatus.textContent = "Connected";
      const room = await this.mp.client.createRoom({
        name: this.storage.profile?.name || "Player",
        carId: this.storage.profile?.selectedCarId || "coupe",
        colorId: this.storage.profile?.selectedColor || "blue",
      });
      localStorage.setItem("mp_room", room);
      this.ui.mpRoom.value = room;
      this.startMultiplayer(room);
    } catch (e) {
      console.warn("[MP] create room failed", e);
      this.ui.mpStatus.textContent = "Failed";
      this.ui.toastMessage("Multiplayer server is offline");
      this.mp.client.disconnect();
    }
  }

  async mpJoinRoom() {
    const name = String(this.ui.mpName.value || this.storage.profile?.name || "").trim();
    const room = String(this.ui.mpRoom.value || "").trim().toUpperCase();
    const url = String(this.ui.mpServerUrl.value || getDefaultMultiplayerServerUrl()).trim();
    if (!room) {
      this.ui.toastMessage("Enter room code");
      return;
    }
    localStorage.setItem("mp_server_url", url);
    localStorage.setItem("mp_room", room);
    if (name) this.storage.setProfileName(name);

    try {
      this.ui.mpStatus.textContent = "Connecting…";
      await this.mp.client.connect({ serverUrl: url, name });
      this.ui.mpStatus.textContent = "Connected";
      await this.mp.client.joinRoom({
        room,
        name: this.storage.profile?.name || "Player",
        carId: this.storage.profile?.selectedCarId || "coupe",
        colorId: this.storage.profile?.selectedColor || "blue",
      });
      this.startMultiplayer(room);
    } catch (e) {
      console.warn("[MP] join room failed", e);
      this.ui.mpStatus.textContent = "Failed";
      this.ui.toastMessage("Join failed • Server offline or wrong code");
      this.mp.client.disconnect();
    }
  }

  startMultiplayer(room) {
    this._endRaceIfActive();
    this._setMenuBackdropActive(false);
    this.mode = "multi";

    // Build city (same as Free Drive) but show MP HUD
    if (this.level && this.level !== this._cityLevel) this.level.destroy();
    this.level = this._cityLevel || this.level;
    if (typeof this.level?.setVisible === "function") this.level.setVisible(true);
    this.car.spawn(CITY.spawn);
    this.car.resetHits();
    this._lastHitCount = 0;
    this.timeLeftMs = 0;
    this.timeElapsedMs = 0;
    this._checkpointsDone = true;

    this.state = "playing";
    this.ui.showGame();
    this.ui.showRaceHud(false);
    this.ui.showMpHud(true);
    this.ui.setMpHud({ room, players: 1, conn: "Connected" });
    this.ui.toastMessage(`Multiplayer • Room ${room}`);
    this.chaseCam.reset(this.car.getPosition());
  }

  leaveMultiplayer() {
    if (this.mode !== "multi") return;
    this.mp.client.disconnect();
    this.ui.showMpHud(false);
    this.mode = "free";
    this.state = "menu";
    this.ui.showMainMenu();
  }

  respawnFreeDrive() {
    this.car.spawn(CITY.spawn);
    this.ui.toastMessage("Respawned");
    this.chaseCam.reset(this.car.getPosition());
  }

  resetCar() {
    if (this.mode === "race" && this.race.active) {
      this.car.spawn(this.race.lastCheckpoint);
      this.ui.toastMessage("Reset to checkpoint");
      this.chaseCam.reset(this.car.getPosition());
      return;
    }
    this.car.resetUpright();
    this.ui.toastMessage("Car reset");
    this.chaseCam.reset(this.car.getPosition());
  }

  startChallenge(levelIndex1Based) {
    if (!this.storage.isUnlocked(levelIndex1Based)) return;
    this._endRaceIfActive();
    this.mode = "challenge";
    this.levelIndex = levelIndex1Based;
    const def = LEVELS[this.levelIndex - 1];

    if (this.level) this.level.destroy();
    // For now, challenges run inside the city backdrop too (we can add markers later)
    const cityDef = { ...CITY, ...def };
    this.level = new LevelInstance({
      def: cityDef,
      physicsWorld: this.physics,
      scene: this.renderer3d.scene,
      settings: this.storage.settings,
    });
    this.level.build();
    this.car.spawn(def.spawn ?? CITY.spawn);
    this.car.resetHits();
    this._lastHitCount = 0;

    this.timeLeftMs = def.timeLimitMs;
    this.timeElapsedMs = 0;
    this._checkpointsDone = false;

    this.state = "playing";
    this.ui.showGame();
    this.ui.toastMessage(`${CHALLENGES[this.levelIndex - 1]?.name ?? "Challenge"} • ${CHALLENGES[this.levelIndex - 1]?.objective ?? "Complete objective"}`);
    this.chaseCam.reset(this.car.getPosition());
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.ui.showPauseMenu();
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.ui.showGame();
  }

  restart() {
    if (this.mode === "free") this.startFreeDrive();
    else if (this.mode === "race") this.startRace(this.storage.race || {});
    else if (this.mode === "multi") this.startMultiplayer(localStorage.getItem("mp_room") || this.mp.client.room || "");
    else this.startChallenge(this.levelIndex);
  }

  quitToMenu() {
    this._endRaceIfActive();
    this.mp.client?.disconnect();
    this.ui.showMpHud(false);
    if (this._cityLevel && typeof this._cityLevel.setVisible === "function") this._cityLevel.setVisible(false);
    this.state = "menu";
    this.ui.showMainMenu();
    this._setMenuBackdropActive(true);
  }

  nextLevel() {
    if (this.mode !== "challenge") return;
    const next = Math.min(LEVELS.length, this.levelIndex + 1);
    if (!this.storage.isUnlocked(next)) return;
    this.startChallenge(next);
  }

  finishLevel(win, reason) {
    if (this._levelDone) return;
    this._levelDone = true;

    const def = LEVELS[this.levelIndex - 1];
    const hits = this.car.hits;
    const timeMs = this.timeElapsedMs;
    const stars = this._calcStars({ def, hits, timeMs, win });

    if (win) {
      this.audio.playWin();
      this.particles.burstWin(this.car.getPosition());
      this.storage.setBest(def.id, { stars, bestTimeMs: timeMs });
      this.storage.unlock(this.levelIndex + 1);
    }

    const canNext = win && this.storage.isUnlocked(this.levelIndex + 1) && this.levelIndex < LEVELS.length;
    this.state = "results";
    this.ui.showResults({
      title: win ? "Level Complete" : "Failed",
      stars: win ? stars : 0,
      timeMs,
      hits,
      canNext,
    });

    this.ui.refreshChallenges(CHALLENGES.length, (i) => this.startChallenge(i));
    this._levelDone = false; // allow restart/next
  }

  openRaceSetup() {
    const r = this.storage.race || { opponents: 3, laps: 3, difficulty: "normal" };
    const best = r.bestTimeMs != null ? `${(r.bestTimeMs / 1000).toFixed(1)}s best` : "—";
    const carId = this.storage.profile?.selectedCarId || "coupe";
    const carName = getCarById(carId).name;
    this.ui.showRaceSetupMenu({
      opponents: r.opponents || 3,
      laps: r.laps || 3,
      difficulty: r.difficulty || "normal",
      bestText: best,
      selectedCarText: `Car: ${carName}`,
    });
  }

  startRaceFromSetup() {
    const opp = Number(this.ui.selectRaceOpponents.value || 3);
    const laps = Number(this.ui.selectRaceLaps.value || 3);
    const difficulty = String(this.ui.selectRaceDifficulty.value || "normal");
    this.storage.updateRace({ opponents: opp, laps, difficulty });
    this.startRace({ opponents: opp, laps, difficulty });
  }

  startRace({ opponents = 3, laps = 3, difficulty = "normal" }) {
    this._endRaceIfActive();
    this._setMenuBackdropActive(false);

    this.mode = "race";
    this.state = "playing";
    this.timeElapsedMs = 0;

    this.race.active = true;
    this.race.opponents = opponents;
    this.race.laps = laps;
    this.race.difficulty = difficulty;
    this.race.elapsedMs = 0;
    this.race.lapStartMs = 0;
    this.race.bestLapMs = null;
    this.race.playerCp = 0;
    this.race.playerLap = 1;

    // Remove city instance so we don't draw its geometry
    if (this._cityLevel && typeof this._cityLevel.setVisible === "function") this._cityLevel.setVisible(false);
    if (this.level && this.level !== this._cityLevel) this.level.destroy();
    this.level = null;

    this.race.track.build();
    this.race.cpCount = this.race.track.checkpoints.length;
    this.ui.showGame();
    this.ui.showRaceHud(true);

    // Spawn player at grid
    const start = this.race.track.start;
    this.race.lastCheckpoint = { ...start };
    this.car.spawn(start);
    this.car.resetHits();
    this._lastHitCount = 0;

    // Spawn bots
    this.race.bots = [];
    const botColors = ["red", "yellow", "purple", "green", "silver", "blue"];
    const baseMul = difficulty === "easy" ? 0.88 : difficulty === "hard" ? 1.02 : 0.95;
    const carId = this.storage.profile?.selectedCarId || "coupe";
    for (let i = 0; i < opponents; i++) {
      const botCar = new Car({ physicsWorld: this.physics, scene: this.renderer3d.scene });
      botCar.setCarId(carId);
      const bot = new RaceBot({
        car: botCar,
        colorId: botColors[i % botColors.length],
        speedMul: baseMul * (0.98 + Math.random() * 0.06),
      });
      bot.setStart({ x: start.x + (i + 1) * 3.2, y: start.y, z: start.z + 7 + i * 2.8, yaw: start.yaw });
      this.race.bots.push(bot);
    }

    this.ui.toastMessage(`Complete ${laps} laps • Good luck!`);
    this.chaseCam.reset(this.car.getPosition());
  }

  _tickRace(dt, solids) {
    this.race.elapsedMs += dt * 1000;

    for (const bot of this.race.bots) {
      bot.tick({ dt, centerline: this.race.track.centerline, checkpoints: this.race.track.checkpoints, solids });
    }

    // Player checkpoints
    const p = this.car.getPosition();
    const cp = this.race.track.checkpoints[this.race.playerCp];
    if (cp) {
      const d2 = (p.x - cp.x) * (p.x - cp.x) + (p.z - cp.z) * (p.z - cp.z);
      if (d2 <= cp.r * cp.r) {
        this.race.playerCp++;
        this.race.lastCheckpoint = { x: cp.x, y: 0.9, z: cp.z, yaw: this.car.getYaw() };
        if (this.race.playerCp >= this.race.cpCount) {
          this.race.playerCp = 0;
          // Lap completed
          const lapTime = this.race.elapsedMs - this.race.lapStartMs;
          this.race.lapStartMs = this.race.elapsedMs;
          if (this.race.bestLapMs == null || lapTime < this.race.bestLapMs) this.race.bestLapMs = lapTime;
          this.race.playerLap++;
          if (this.race.playerLap > this.race.laps) {
            this._finishRace();
            return;
          }
        }
      }
    }

    // Ranking (score-based)
    const racers = [{ id: "you", score: (this.race.playerLap - 1) * this.race.cpCount + this.race.playerCp }];
    for (let i = 0; i < this.race.bots.length; i++) racers.push({ id: `bot${i}`, score: this.race.bots[i].score(this.race.cpCount) });
    racers.sort((a, b) => b.score - a.score);
    const posIdx = racers.findIndex((r) => r.id === "you") + 1;

    this.ui.setRaceHud({
      lapText: `${Math.min(this.race.playerLap, this.race.laps)}/${this.race.laps}`,
      posText: `${posIdx}/${racers.length}`,
      timeText: `${(this.race.elapsedMs / 1000).toFixed(1)}s`,
      cpText: `${this.race.playerCp + 1}/${this.race.cpCount}`,
    });
  }

  _finishRace() {
    const timeMs = this.race.elapsedMs;
    const prevBest = this.storage.race?.bestTimeMs;
    if (prevBest == null || timeMs < prevBest) this.storage.updateRace({ bestTimeMs: timeMs });
    const prevLap = this.storage.race?.bestLapMs;
    if (this.race.bestLapMs != null && (prevLap == null || this.race.bestLapMs < prevLap)) this.storage.updateRace({ bestLapMs: this.race.bestLapMs });
    this.ui.showRaceHud(false);
    this.race.active = false;
    this.state = "results";
    const placement = this._racePlacement();
    const bestLap = this.race.bestLapMs != null ? ` • Best lap ${(this.race.bestLapMs / 1000).toFixed(1)}s` : "";
    this.ui.showResults({ title: `Race Finished • ${placement}${bestLap}`, stars: 0, timeMs, hits: this.car.hits, canNext: false });
  }

  _racePlacement() {
    const racers = [{ id: "you", score: (this.race.playerLap - 1) * this.race.cpCount + this.race.playerCp }];
    for (let i = 0; i < this.race.bots.length; i++) racers.push({ id: `bot${i}`, score: this.race.bots[i].score(this.race.cpCount) });
    racers.sort((a, b) => b.score - a.score);
    const posIdx = racers.findIndex((r) => r.id === "you") + 1;
    const suffix = posIdx === 1 ? "st" : posIdx === 2 ? "nd" : posIdx === 3 ? "rd" : "th";
    return `${posIdx}${suffix}/${racers.length}`;
  }

  _raceBotAabbs() {
    const out = [];
    for (const bot of this.race.bots) {
      const p = bot.car.getPosition();
      out.push({ minX: p.x - 1.35, maxX: p.x + 1.35, minZ: p.z - 2.6, maxZ: p.z + 2.6 });
    }
    return out;
  }

  _endRaceIfActive() {
    if (!this.race.active) return;
    this.ui.showRaceHud(false);
    this.race.track?.destroy();
    for (const bot of this.race.bots) bot.car.destroy();
    this.race.bots = [];
    this.race.active = false;
  }

  _calcStars({ def, hits, timeMs, win }) {
    if (!win) return 0;
    // Simple, gamey but fair:
    // - 3 stars: fast + clean
    // - 2 stars: medium or 1-2 hits
    // - 1 star: slow or many hits (but still within limits)
    const fastMs = def.timeLimitMs * 0.45;
    const midMs = def.timeLimitMs * 0.65;

    if (hits === 0 && timeMs <= fastMs) return 3;
    if (hits <= 2 && timeMs <= midMs) return 2;
    return 1;
  }
}

