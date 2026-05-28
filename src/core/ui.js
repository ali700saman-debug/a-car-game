import { clamp } from "./time.js";

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

export class UI {
  constructor(storage) {
    this.storage = storage;

    this.hud = $("hud");
    this.hudTime = $("hudTime");
    this.hudHits = $("hudHits");
    this.hudLevel = $("hudLevel");
    this.hudPlayer = $("hudPlayer");
    this.hudVehicle = $("hudVehicle");
    this.toast = $("toast");

    this.mainMenu = $("mainMenu");
    this.profileMenu = $("profileMenu");
    this.challengesMenu = $("challengesMenu");
    this.garageMenu = $("garageMenu");
    this.settingsMenu = $("settingsMenu");
    this.pauseMenu = $("pauseMenu");
    this.resultMenu = $("resultMenu");

    this.btnFreeDrive = $("btnFreeDrive");
    this.btnMultiplayer = $("btnMultiplayer");
    this.btnRaceMode = $("btnRaceMode");
    this.btnChallenges = $("btnChallenges");
    this.btnGarage = $("btnGarage");
    this.btnSettings = $("btnSettings");
    this.btnProfile = $("btnProfile");
    this.btnHowToPlay = $("btnHowToPlay");
    this.btnChallengesBack = $("btnChallengesBack");
    this.btnGarageBack = $("btnGarageBack");
    this.btnSettingsBack = $("btnSettingsBack");
    this.btnPause = $("btnPause");
    this.btnResume = $("btnResume");
    this.btnRestart = $("btnRestart");
    this.btnQuit = $("btnQuit");
    this.btnPauseGarage = $("btnPauseGarage");
    this.btnPauseSettings = $("btnPauseSettings");
    this.btnNext = $("btnNext");
    this.btnResultRestart = $("btnResultRestart");
    this.btnResultQuit = $("btnResultQuit");

    this.levelsGrid = $("levelsGrid");
    this.carGrid = $("carGrid");

    this.inputPlayerName = $("inputPlayerName");
    this.btnProfileContinue = $("btnProfileContinue");

    // Multiplayer menu
    this.multiplayerMenu = $("multiplayerMenu");
    this.mpName = $("mpName");
    this.mpRoom = $("mpRoom");
    this.mpServerUrl = $("mpServerUrl");
    this.mpStatus = $("mpStatus");
    this.btnMpCreate = $("btnMpCreate");
    this.btnMpJoin = $("btnMpJoin");
    this.btnMpBack = $("btnMpBack");

    // How to play
    this.howToPlayMenu = $("howToPlayMenu");
    this.btnHowBack = $("btnHowBack");

    // Car select UI
    this.carSelectTitle = $("carSelectTitle");
    this.carSelectSubtitle = $("carSelectSubtitle");
    this.carPreviewSwatch = $("carPreviewSwatch");
    this.carPreviewName = $("carPreviewName");
    this.carPreviewDesc = $("carPreviewDesc");
    this.barSpeed = $("barSpeed");
    this.barAccel = $("barAccel");
    this.barHandling = $("barHandling");
    this.barBrake = $("barBrake");
    this.btnPrevCar = $("btnPrevCar");
    this.btnNextCar = $("btnNextCar");
    this.btnSelectCar = $("btnSelectCar");
    this.btnStartDriving = $("btnStartDriving");
    this.colorChips = Array.from(document.querySelectorAll(".colorChip"));

    // Race setup
    this.raceSetupMenu = $("raceSetupMenu");
    this.selectRaceOpponents = $("selectRaceOpponents");
    this.selectRaceLaps = $("selectRaceLaps");
    this.selectRaceDifficulty = $("selectRaceDifficulty");
    this.raceBestText = $("raceBestText");
    this.btnRaceStart = $("btnRaceStart");
    this.btnRaceBack = $("btnRaceBack");
    this.raceSelectedCar = $("raceSelectedCar");

    // Race HUD
    this.raceHud = $("raceHud");
    this.raceLap = $("raceLap");
    this.racePos = $("racePos");
    this.raceTime = $("raceTime");
    this.raceCp = $("raceCp");

    // Multiplayer HUD
    this.mpHud = $("mpHud");
    this.mpHudRoom = $("mpHudRoom");
    this.mpHudPlayers = $("mpHudPlayers");
    this.mpHudConn = $("mpHudConn");
    this.btnMpLeave = $("btnMpLeave");

    this.toggleSound = $("toggleSound");
    this.toggleTraffic = $("toggleTraffic");
    this.togglePedestrians = $("togglePedestrians");
    this.toggleKurdistanTheme = $("toggleKurdistanTheme");
    this.selectTimeOfDay = $("selectTimeOfDay");
    this.toggleEngine = $("toggleEngine");
    this.sliderEngineVol = $("sliderEngineVol");
    this.sliderSfxVol = $("sliderSfxVol");
    this.sliderMusicVol = $("sliderMusicVol");
    this.toggleShadows = $("toggleShadows");
    this.selectQuality = $("selectQuality");
    this.btnResetProgress = $("btnResetProgress");

    this.resultTitle = $("resultTitle");
    this.starRow = $("starRow");
    this.resultStats = $("resultStats");

    // Speedometer UI
    this.speedoSpeed = $("speedoSpeed");
    this.speedoGear = $("speedoGear");
    this.speedoHits = $("speedoHits");
    this.speedoMode = $("speedoMode");
    this.speedoObj = $("speedoObj");

    this._toastT = 0;
  }

  init({
    challengeCount,
    onFreeDrive,
    onOpenMultiplayer,
    onMpCreate,
    onMpJoin,
    onMpBack,
    onMpLeave,
    onOpenProfile,
    onOpenHowToPlay,
    onOpenRaceSetup,
    onRaceStart,
    onOpenChallenges,
    onOpenGarage,
    onOpenSettings,
    onSubmitProfile,
    onPickCar,
    onPrevCar,
    onNextCar,
    onSelectCar,
    onStartDriving,
    onPickColor,
    onPickChallenge,
    onPause,
    onResume,
    onRestart,
    onQuit,
    onNext,
    onPauseGarage,
    onPauseSettings,
  }) {
    this._renderChallenges(challengeCount, onPickChallenge);

    // Keep UI init quiet in production (avoid spamming console)

    this.btnFreeDrive.addEventListener("click", () => onFreeDrive());
    this.btnMultiplayer.addEventListener("click", () => onOpenMultiplayer());
    this.btnRaceMode.addEventListener("click", () => onOpenRaceSetup());
    this.btnChallenges.addEventListener("click", () => onOpenChallenges());
    this.btnGarage.addEventListener("click", () => onOpenGarage());
    this.btnSettings.addEventListener("click", () => onOpenSettings());
    this.btnProfile.addEventListener("click", () => onOpenProfile());
    this.btnHowToPlay.addEventListener("click", () => onOpenHowToPlay());
    this.btnChallengesBack.addEventListener("click", () => this.showMainMenu());
    this.btnGarageBack.addEventListener("click", () => this.showMainMenu());
    this.btnSettingsBack.addEventListener("click", () => this.showMainMenu());
    this.btnPause.addEventListener("click", () => onPause());
    this.btnResume.addEventListener("click", () => onResume());
    this.btnRestart.addEventListener("click", () => onRestart());
    this.btnQuit.addEventListener("click", () => onQuit());
    this.btnPauseGarage.addEventListener("click", () => onPauseGarage());
    this.btnPauseSettings.addEventListener("click", () => onPauseSettings());
    this.btnNext.addEventListener("click", () => onNext());
    this.btnResultRestart.addEventListener("click", () => onRestart());
    this.btnResultQuit.addEventListener("click", () => this.showChallengesMenu());

    this.btnProfileContinue.addEventListener("click", () => onSubmitProfile(this.inputPlayerName.value));
    this.btnPrevCar.addEventListener("click", () => onPrevCar());
    this.btnNextCar.addEventListener("click", () => onNextCar());
    this.btnSelectCar.addEventListener("click", () => onSelectCar());
    this.btnStartDriving.addEventListener("click", () => onStartDriving());
    for (const chip of this.colorChips) {
      chip.addEventListener("click", () => onPickColor(chip.dataset.color));
    }
    this.btnRaceBack.addEventListener("click", () => this.showMainMenu());
    this.btnRaceStart.addEventListener("click", () => onRaceStart());
    this.btnMpBack.addEventListener("click", () => onMpBack());
    this.btnMpCreate.addEventListener("click", () => onMpCreate());
    this.btnMpJoin.addEventListener("click", () => onMpJoin());
    this.btnMpLeave.addEventListener("click", () => onMpLeave());
    this.inputPlayerName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSubmitProfile(this.inputPlayerName.value);
    });
    this.mpName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onMpJoin();
    });
    this.mpRoom.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onMpJoin();
    });
    this.btnHowBack.addEventListener("click", () => this.showMainMenu());

    const applySettings = () => {
      this.storage.updateSettings({
        sound: !!this.toggleSound.checked,
        traffic: !!this.toggleTraffic.checked,
        pedestrians: !!this.togglePedestrians.checked,
        kurdistanTheme: !!this.toggleKurdistanTheme.checked,
        timeOfDay: this.selectTimeOfDay.value,
        engineOn: !!this.toggleEngine.checked,
        engineVol: Number(this.sliderEngineVol.value),
        sfxVol: Number(this.sliderSfxVol.value),
        musicVol: Number(this.sliderMusicVol.value),
        shadows: !!this.toggleShadows.checked,
        quality: this.selectQuality.value,
      });
    };

    this.toggleSound.checked = !!this.storage.settings.sound;
    this.toggleTraffic.checked = this.storage.settings.traffic !== false;
    this.togglePedestrians.checked = !!this.storage.settings.pedestrians;
    this.toggleKurdistanTheme.checked = this.storage.settings.kurdistanTheme !== false;
    this.selectTimeOfDay.value = this.storage.settings.timeOfDay || "day";
    this.toggleEngine.checked = this.storage.settings.engineOn !== false;
    this.sliderEngineVol.value = String(this.storage.settings.engineVol ?? 0.25);
    this.sliderSfxVol.value = String(this.storage.settings.sfxVol ?? 0.7);
    this.sliderMusicVol.value = String(this.storage.settings.musicVol ?? 0.25);
    this.toggleShadows.checked = !!this.storage.settings.shadows;
    this.selectQuality.value = this.storage.settings.quality || "med";

    this.toggleSound.addEventListener("change", applySettings);
    this.toggleTraffic.addEventListener("change", applySettings);
    this.togglePedestrians.addEventListener("change", applySettings);
    this.toggleKurdistanTheme.addEventListener("change", applySettings);
    this.selectTimeOfDay.addEventListener("change", applySettings);
    this.toggleEngine.addEventListener("change", applySettings);
    this.sliderEngineVol.addEventListener("input", applySettings);
    this.sliderSfxVol.addEventListener("input", applySettings);
    this.sliderMusicVol.addEventListener("input", applySettings);
    this.toggleShadows.addEventListener("change", applySettings);
    this.selectQuality.addEventListener("change", applySettings);

    this.btnResetProgress.addEventListener("click", () => {
      // Clear local save (profile/cars/settings/race) and reload UI state
      localStorage.removeItem("carParking.save.v1");
      this.storage.load();
      // refresh UI toggles
      this.toggleSound.checked = !!this.storage.settings.sound;
      this.toggleTraffic.checked = this.storage.settings.traffic !== false;
      this.togglePedestrians.checked = !!this.storage.settings.pedestrians;
      this.selectTimeOfDay.value = this.storage.settings.timeOfDay || "day";
      this.toggleEngine.checked = this.storage.settings.engineOn !== false;
      this.sliderEngineVol.value = String(this.storage.settings.engineVol ?? 0.25);
      this.sliderSfxVol.value = String(this.storage.settings.sfxVol ?? 0.7);
      this.sliderMusicVol.value = String(this.storage.settings.musicVol ?? 0.25);
      this.toggleShadows.checked = this.storage.settings.shadows !== false;
      this.selectQuality.value = this.storage.settings.quality || "med";
      this.toastMessage("Progress reset");
    });
  }

  _renderChallenges(levelCount, onPickLevel) {
    this.levelsGrid.innerHTML = "";
    for (let i = 1; i <= levelCount; i++) {
      const locked = !this.storage.isUnlocked(i);
      const best = this.storage.getBest(`L${i}`);
      const tile = document.createElement("button");
      tile.className = `levelTile ${locked ? "levelTile--locked" : ""}`;
      tile.disabled = locked;
      tile.innerHTML = `
        <div class="levelNum">Challenge ${i}</div>
        <div class="levelStars">${"★".repeat(best?.stars || 0)}${"☆".repeat(3 - (best?.stars || 0))}</div>
      `;
      tile.addEventListener("click", () => onPickLevel(i));
      this.levelsGrid.appendChild(tile);
    }
  }

  refreshChallenges(levelCount, onPickLevel) {
    this._renderChallenges(levelCount, onPickLevel);
  }

  renderGarage(cars, selectedId, onPickCar) {
    this.carGrid.innerHTML = "";
    for (const c of cars) {
      const btn = document.createElement("button");
      btn.className = `carCard ${c.id === selectedId ? "carCard--active" : ""}`;
      btn.innerHTML = `
        <div class="carName">${c.name}</div>
        <div class="carDesc">${c.desc}</div>
        <div class="carSwatch" style="background: linear-gradient(135deg, rgba(255,255,255,.25), rgba(0,0,0,.12)), linear-gradient(90deg, #${c.visuals.color.toString(16).padStart(6,"0")}, rgba(0,0,0,0));"></div>
        <div class="carStats">
          <span class="statPill">Top: ${(c.stats.maxFwd * 3.6).toFixed(0)} km/h</span>
          <span class="statPill">Accel: ${c.stats.accel.toFixed(1)}</span>
          <span class="statPill">Handling: ${c.stats.turnRateDeg}</span>
        </div>
      `;
      btn.addEventListener("click", () => onPickCar(c.id));
      this.carGrid.appendChild(btn);
    }
  }

  updateCarSelector({ car, colorId, confirmed }) {
    this.carPreviewName.textContent = car.name;
    this.carPreviewDesc.textContent = car.desc;

    // Swatch uses selected color
    const colorHex = `#${(car._colorHex || 0x1676ff).toString(16).padStart(6, "0")}`;
    this.carPreviewSwatch.style.background = `linear-gradient(135deg, rgba(255,255,255,.3), rgba(0,0,0,.15)), linear-gradient(90deg, ${colorHex}, rgba(0,0,0,0))`;

    // Stat bars normalized per class
    const speed01 = Math.min(1, Math.max(0, (car.stats.maxFwd - 60) / 30));
    const accel01 = Math.min(1, Math.max(0, (car.stats.accel - 14) / 8));
    const handling01 = Math.min(1, Math.max(0, (car.stats.turnRateDeg - 110) / 50));
    const brake01 = Math.min(1, Math.max(0, (car.stats.brake - 22) / 10));
    this.barSpeed.style.width = `${Math.round(speed01 * 100)}%`;
    this.barAccel.style.width = `${Math.round(accel01 * 100)}%`;
    this.barHandling.style.width = `${Math.round(handling01 * 100)}%`;
    this.barBrake.style.width = `${Math.round(brake01 * 100)}%`;

    for (const chip of this.colorChips) {
      chip.classList.toggle("colorChip--active", chip.dataset.color === colorId);
    }
    this.btnStartDriving.disabled = !confirmed;
  }

  showHUD(show) {
    this.hud.classList.toggle("hidden", !show);
    this.hud.setAttribute("aria-hidden", show ? "false" : "true");
  }

  showMainMenu() {
    this._showOnly(this.mainMenu);
    this.showHUD(false);
  }

  showProfileMenu() {
    this._showOnly(this.profileMenu);
    this.showHUD(false);
    this.inputPlayerName.value = this.storage.profile?.name || "";
    setTimeout(() => this.inputPlayerName.focus(), 0);
  }

  showChallengesMenu() {
    this._showOnly(this.challengesMenu);
    this.showHUD(false);
  }

  showGarageMenu() {
    this._showOnly(this.garageMenu);
    this.showHUD(false);
  }

  showRaceSetupMenu({ opponents, laps, difficulty, bestText, selectedCarText }) {
    this._showOnly(this.raceSetupMenu);
    this.showHUD(false);
    this.selectRaceOpponents.value = String(opponents);
    this.selectRaceLaps.value = String(laps);
    this.selectRaceDifficulty.value = String(difficulty);
    this.raceBestText.textContent = bestText || "—";
    if (selectedCarText) this.raceSelectedCar.textContent = selectedCarText;
  }

  showMultiplayerMenu({ name, room, serverUrl, statusText }) {
    this._showOnly(this.multiplayerMenu);
    this.showHUD(false);
    this.mpName.value = name || "";
    this.mpRoom.value = room || "";
    this.mpServerUrl.value = serverUrl || "";
    this.mpStatus.textContent = statusText || "Offline";
  }

  showHowToPlay() {
    this._showOnly(this.howToPlayMenu);
    this.showHUD(false);
  }

  showMpHud(show) {
    this.mpHud.classList.toggle("hidden", !show);
    this.mpHud.setAttribute("aria-hidden", show ? "false" : "true");
  }

  setMpHud({ room, players, conn }) {
    if (room != null) this.mpHudRoom.textContent = room;
    if (players != null) this.mpHudPlayers.textContent = String(players);
    if (conn != null) this.mpHudConn.textContent = conn;
  }

  showSettingsMenu() {
    this._showOnly(this.settingsMenu);
    this.showHUD(false);
  }

  showPauseMenu() {
    this._showOnly(this.pauseMenu);
    this.showHUD(true);
  }

  showGame() {
    this._showOnly(null);
    this.showHUD(true);
  }

  showRaceHud(show) {
    this.raceHud.classList.toggle("hidden", !show);
    this.raceHud.setAttribute("aria-hidden", show ? "false" : "true");
  }

  setRaceHud({ lapText, posText, timeText, cpText }) {
    this.raceLap.textContent = lapText;
    this.racePos.textContent = posText;
    this.raceTime.textContent = timeText;
    this.raceCp.textContent = cpText;
  }

  showResults({ title, stars, timeMs, hits, canNext }) {
    this._showOnly(this.resultMenu);
    this.showHUD(false);

    this.resultTitle.textContent = title;
    this.starRow.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const s = document.createElement("div");
      s.className = `star ${i < stars ? "star--on" : ""}`;
      s.textContent = "★";
      this.starRow.appendChild(s);
    }
    const sec = Math.max(0, timeMs / 1000);
    this.resultStats.textContent = `Time: ${sec.toFixed(1)}s • Hits: ${hits}`;
    this.btnNext.disabled = !canNext;
  }

  setHUD({ timeMs, hits, levelIndex, playerName, vehicleName }) {
    const t = Math.max(0, Math.floor(timeMs));
    const total = Math.floor(t / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    this.hudTime.textContent = `${mm}:${ss}`;
    this.hudHits.textContent = String(hits);
    this.hudLevel.textContent = String(levelIndex);
    if (playerName != null) this.hudPlayer.textContent = playerName || "—";
    if (vehicleName != null) this.hudVehicle.textContent = vehicleName || "—";
  }

  setSpeedometer({ speedKmh, gear, hits, mode, objective }) {
    this.speedoSpeed.textContent = String(Math.round(Math.max(0, speedKmh)));
    this.speedoGear.textContent = gear;
    this.speedoHits.textContent = String(hits);
    this.speedoMode.textContent = mode;
    this.speedoObj.textContent = objective;
  }

  toastMessage(msg, durationMs = 1200) {
    this.toast.textContent = msg;
    this.toast.classList.remove("hidden");
    this._toastT = durationMs;
  }

  tick(dt) {
    if (this._toastT > 0) {
      this._toastT = Math.max(0, this._toastT - dt * 1000);
      if (this._toastT === 0) this.toast.classList.add("hidden");
    }
  }

  _showOnly(screenEl) {
    const all = [
      this.profileMenu,
      this.mainMenu,
      this.multiplayerMenu,
      this.howToPlayMenu,
      this.challengesMenu,
      this.garageMenu,
      this.settingsMenu,
      this.raceSetupMenu,
      this.pauseMenu,
      this.resultMenu,
    ];
    for (const el of all) {
      const show = el === screenEl;
      el.classList.toggle("hidden", !show);
      el.setAttribute("aria-hidden", show ? "false" : "true");
    }
  }
}

