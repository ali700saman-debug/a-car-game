import { App } from "./core/app.js";

export async function bootstrap() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("gameCanvas"));
  const loadingScreen = document.getElementById("loadingScreen");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const loadingSub = document.getElementById("loadingSub");
  const loadingHint = document.getElementById("loadingHint");

  const tips = [
    "Press C to change camera.",
    "Use R to reset your vehicle.",
    "In races: hit all checkpoints in order.",
    "Lower quality improves FPS on mobile.",
    "Use H to honk!",
  ];
  let tipIndex = 0;
  const setStage = (text) => {
    if (loadingSub) loadingSub.textContent = text;
    if (loadingHint) loadingHint.textContent = `Tip: ${tips[tipIndex++ % tips.length]}`;
  };

  const setProgress = (t) => {
    const pct = Math.max(0, Math.min(1, t));
    progressFill.style.width = `${Math.round(pct * 100)}%`;
    progressText.textContent = `${Math.round(pct * 100)}%`;
  };

  setProgress(0.05);

  const app = new App({
    canvas,
    onProgress: setProgress,
    onStage: setStage,
  });

  try {
    setStage("Optimizing world…");
    await app.init();
    setProgress(1);
    // Fade out loading screen smoothly
    loadingScreen.classList.add("loadingScreen--fadeOut");
    setTimeout(() => loadingScreen.classList.add("hidden"), 420);
    app.start();
    // Small internal startup summary (useful for release testing)
    console.info("[3D City Drive] Ready", {
      quality: app.storage?.settings?.quality,
      kurdistanTheme: app.storage?.settings?.kurdistanTheme !== false,
      traffic: app.storage?.settings?.traffic !== false,
    });
  } catch (err) {
    console.error(err);
    progressText.textContent = "Failed to start. Check console.";
    if (loadingScreen) loadingScreen.classList.remove("hidden");
  }
}

