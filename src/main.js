// src/main.js
import { initEngine, getRenderer, getScene, getCamera } from "./core/engine.js";
import { initPhysics, getWorld } from "./core/physics.js";
import { initSceneManager } from "./managers/sceneManager.js";
import { initInputManager } from "./managers/inputManager.js";
import { initBallManager } from "./gameplay/ballManager.js";
import { initHoopManager } from "./gameplay/hoopManager.js";
import { initShotClock } from "./gameplay/shotClock.js";

// Global shared state (could be extended or use a proper state manager)
const state = {
  floorOffset: 0,
  roomBoundary: null,
  ballAndHoopCreated: false,
  isHoldingBall: false,
};

async function initGame() {
  initEngine();
  await initPhysics(); // Wait for RAPIER.init() inside
  initSceneManager();
  initInputManager(state);
  initBallManager(state);
  initHoopManager(state);
  initShotClock(state);

  // Start render loop
  const renderer = getRenderer();
  renderer.setAnimationLoop(animate);
}

function animate() {
  const world = getWorld();
  // Fixed timestep physics step (you may refine this further)
  world.step();

  // Update ball & hoop managers as needed…
  // e.g., updateBall(), updateHoop(), etc.

  // Render the scene
  getRenderer().render(getScene(), getCamera());
}

document.getElementById("ar-button").addEventListener("click", async () => {
  try {
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local-floor", "hit-test", "plane-detection", "anchors"],
      optionalFeatures: ["mesh-detection"],
    });
    getRenderer().xr.setReferenceSpaceType("local-floor");
    getRenderer().xr.setSession(session);
    console.log("AR session started.");
    initGame();
  } catch (err) {
    console.error("Failed to start AR session:", err);
  }
});
