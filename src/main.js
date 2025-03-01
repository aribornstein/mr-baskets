// src/main.js
import * as THREE from "three";
import { initEngine, getRenderer, getScene, getCamera } from "./core/engine.js";
import { initPhysics, getWorld, getEventQueue, stepPhysics } from "./core/physics.js";
import { initSceneManager } from "./managers/sceneManager.js";
import { initInputManager, getControllers } from "./managers/inputManager.js";
import { handleSurfaceAdded } from "./managers/surfaceManager.js";
import { state } from "./managers/stateManager.js";
import { registerBallInput, updateBall } from "./gameplay/ballManager.js";
import { RealityAccelerator } from "ratk";
import { ScoreboardManager } from "./gameplay/scoreboardManager.js";
import { isBasket } from "./gameplay/hoopManager.js";

let clockGame, accumulator = 0, fixedTimeStep = 1 / 60;
let ratk;
let scoreboardManager; // Add this line

async function initGame() {
    clockGame = new THREE.Clock();
    await initPhysics();  // Wait for Rapier to initialize
    initSceneManager();
    registerBallInput(state);
    initInputManager(state);
    scoreboardManager = new ScoreboardManager(state); // Add this line

    // Setup RealityAccelerator for plane/mesh detection
    ratk = new RealityAccelerator(getRenderer().xr);
    ratk.onPlaneAdded = (event) => handleSurfaceAdded(event, state);
    ratk.onMeshAdded = (event) => handleSurfaceAdded(event, state);
    getScene().add(ratk.root);
    ratk.root.visible = false;

    // Start the render loop
    getRenderer().setAnimationLoop(animate);
}

function animate() {
    const delta = clockGame.getDelta();
    accumulator += delta;
    while (accumulator >= fixedTimeStep) {
        stepPhysics(); // Use the new stepPhysics function
        const eventQueue = getEventQueue(); // Get the event queue
        
        eventQueue.drainCollisionEvents((event) => {
            console.log("Received collision event", event);
            let collider1 = event.collider1();
            let collider2 = event.collider2();
            debugger;
            if (isBasket(collider1, collider2)) {
                console.log("Basket made!");
                scoreboardManager.incrementScore();
            }
        });
        accumulator -= fixedTimeStep;
    }

    // Update controller velocities
    getControllers().forEach(controller => {
        const currentPos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
        if (controller.userData.prevPos) {
            const velocity = new THREE.Vector3().subVectors(currentPos, controller.userData.prevPos).divideScalar(delta);
            controller.userData.velocity.copy(velocity);
        }
        controller.userData.prevPos = currentPos.clone();
    });

    // Update RealityAccelerator
    if (ratk && typeof ratk.update === "function") {
        ratk.update();
    }

    // Update ball position based on physics if not held
    if (state.ballCreated && !state.isHoldingBall) {
        updateBall(delta, state.roomBoundary);
    }

    getRenderer().render(getScene(), getCamera());
}

document.getElementById("ar-button").addEventListener("click", async () => {
    try {
        initEngine();
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