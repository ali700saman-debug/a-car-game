const KEY = "carParking.save.v1";

function defaultSave() {
  return {
    profile: {
      name: "",
      selectedCarId: "coupe",
      selectedColor: "blue",
    },
    unlocked: 1,
    best: {
      // levelId -> { stars, bestTimeMs }
    },
    settings: {
      sound: false,
      engineOn: true,
      engineVol: 0.25,
      sfxVol: 0.7,
      musicVol: 0.25,
      traffic: true,
      pedestrians: false,
      kurdistanTheme: true,
      timeOfDay: "day", // day | sunset | night
      shadows: true,
      quality: "med",
    },
    race: {
      opponents: 3,
      laps: 3,
      difficulty: "normal", // easy | normal | hard
      bestTimeMs: null,
      bestLapMs: null,
    },
  };
}

export class Storage {
  constructor() {
    this._save = defaultSave();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this._save = {
        ...defaultSave(),
        ...parsed,
        settings: { ...defaultSave().settings, ...(parsed.settings || {}) },
      };
    } catch {
      this._save = defaultSave();
    }
  }

  save() {
    localStorage.setItem(KEY, JSON.stringify(this._save));
  }

  get settings() {
    return this._save.settings;
  }

  get profile() {
    return this._save.profile;
  }

  get race() {
    return this._save.race;
  }

  updateRace(patch) {
    this._save.race = { ...(this._save.race || defaultSave().race), ...patch };
    this.save();
  }

  setProfileName(name) {
    this._save.profile = { ...(this._save.profile || {}), name: String(name || "").slice(0, 18) };
    this.save();
  }

  setSelectedCarId(id) {
    this._save.profile = { ...(this._save.profile || {}), selectedCarId: String(id || "coupe") };
    this.save();
  }

  setSelectedColor(colorId) {
    this._save.profile = { ...(this._save.profile || {}), selectedColor: String(colorId || "blue") };
    this.save();
  }

  updateSettings(patch) {
    this._save.settings = { ...this._save.settings, ...patch };
    this.save();
  }

  isUnlocked(levelIndex1Based) {
    return levelIndex1Based <= (this._save.unlocked || 1);
  }

  unlock(levelIndex1Based) {
    this._save.unlocked = Math.max(this._save.unlocked || 1, levelIndex1Based);
    this.save();
  }

  getBest(levelId) {
    return this._save.best[levelId] || null;
  }

  setBest(levelId, best) {
    const prev = this.getBest(levelId);
    const nextStars = Math.max(prev?.stars || 0, best.stars || 0);
    const nextTimeMs =
      prev?.bestTimeMs == null ? best.bestTimeMs : Math.min(prev.bestTimeMs, best.bestTimeMs);
    this._save.best[levelId] = { stars: nextStars, bestTimeMs: nextTimeMs };
    this.save();
  }
}

