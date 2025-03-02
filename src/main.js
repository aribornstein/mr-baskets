// src/main.js
import * as THREE from "three";
import { eventBus } from "./core/eventBus.js";
import { initEngine, getRenderer, getScene, getCamera } from "./core/engine.js";
import { initPhysics, getWorld, getEventQueue, stepPhysics } from "./core/physics.js";
import { initSceneManager } from "./managers/sceneManager.js";
import { initInputManager, getControllers } from "./managers/inputManager.js";
import { handleSurfaceAdded } from "./managers/surfaceManager.js";
import { state } from "./managers/stateManager.js";
import { RealityAccelerator } from "ratk";
import { ScoreboardManager } from "./gameplay/scoreboardManager.js";
import {registerBallInput, updateBall, removeBall, createBallPhysics, createBallVisual } from "./gameplay/ballManager.js";
import { isBasket, removeHoop, createHoopPhysics, createHoopVisual } from "./gameplay/hoopManager.js";


let clockGame, accumulator = 0, fixedTimeStep = 1 / 60;
let ratk;
let scoreboardManager;
let world;

function createBallAndHoop(state) {
    // Ball creation relative to the camera
    const camera = getCamera();
    const ballOffset = new THREE.Vector3(0, 0, -1);
    ballOffset.applyQuaternion(camera.quaternion);
    const ballPos = camera.position.clone().add(ballOffset);
    ballPos.y = state.BALL_RADIUS + state.floorOffset;
    if (state.roomBoundary) {
        ballPos.x = THREE.MathUtils.clamp(ballPos.x, state.roomBoundary.min.x + state.BALL_RADIUS, state.roomBoundary.max.x - state.BALL_RADIUS);
        ballPos.z = THREE.MathUtils.clamp(ballPos.z, state.roomBoundary.min.z + state.BALL_RADIUS, state.roomBoundary.max.z - state.BALL_RADIUS);
    }
    createBallPhysics(ballPos);
    createBallVisual(ballPos);
    state.ballCreated = true;

    // Hoop creation relative to the camera
    const hoopOffset = new THREE.Vector3(0, 0, -2.5);
    hoopOffset.applyQuaternion(camera.quaternion);
    const hoopPos = camera.position.clone().add(hoopOffset);
    hoopPos.y = state.HOOP_HEIGHT + state.floorOffset;
    if (state.roomBoundary) {
        hoopPos.x = THREE.MathUtils.clamp(hoopPos.x, state.roomBoundary.min.x + state.HOOP_RADIUS, state.roomBoundary.max.x - state.HOOP_RADIUS);
        hoopPos.z = THREE.MathUtils.clamp(hoopPos.z, state.roomBoundary.min.z + state.HOOP_RADIUS, state.roomBoundary.max.z - state.HOOP_RADIUS);
    }
    createHoopPhysics(hoopPos);
    createHoopVisual(hoopPos);
    state.hoopCreated = true;
    console.log("Ball and hoop created relative to the camera within room bounds.");
}

async function initGame() {
    clockGame = new THREE.Clock();
    await initPhysics();  // Wait for Rapier to initialize
    initSceneManager();
    registerBallInput(state);
    initInputManager(state);

    // Setup RealityAccelerator for plane/mesh detection
    ratk = new RealityAccelerator(getRenderer().xr);
    ratk.onPlaneAdded = (event) => handleSurfaceAdded(event, state);
    ratk.onMeshAdded = (event) => handleSurfaceAdded(event, state);
    getScene().add(ratk.root);
    ratk.root.visible = false;

    // Get the world 
    world = getWorld();

    // Listen for game over event
    eventBus.on("gameOver", () => {
        console.log("Game Over - Resetting Game");
        state.gameOver = true;
        scoreboardManager.scoreboard.updateTexture(); // Update scoreboard to show game over
        removeBall(); // Remove ball when game is over
        removeHoop(); // Remove hoop when game is over
    });

    eventBus.on("roomSetupComplete", (state) => {
        if (!state.ballCreated && !state.hoopCreated) {
            createBallAndHoop(state);
        }
    });

    // Start the render loop
    getRenderer().setAnimationLoop(animate);
}

function startGame() {
    if (!state.scoreboardCreated) {
        scoreboardManager = new ScoreboardManager(state);
        state.scoreboardCreated = true;
    }
    else {
        scoreboardManager.startShotClock();
    }

    // Create ball and hoop after floor is configured
    if (state.roomSetupComplete) {
        createBallAndHoop(state);
    }
}

function animate() {
    const delta = clockGame.getDelta();
    accumulator += delta;
    while (accumulator >= fixedTimeStep) {
        stepPhysics(); // Use the new stepPhysics function
        const eventQueue = getEventQueue(); // Get the event queue

        // Check for collisions between ball and hoop
        eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            const collider1 = world.getCollider(handle1);
            const collider2 = world.getCollider(handle2);
            if (isBasket(collider1, collider2)) {
                console.log("Basket made!");
                scoreboardManager.incrementScore();
                scoreboardManager.resetShotClock();
            }

        });

        accumulator -= fixedTimeStep;
    }

    getControllers().forEach(controller => {
        // Update controller velocities
        const currentPos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
        if (controller.userData.prevPos) {
            const velocity = new THREE.Vector3().subVectors(currentPos, controller.userData.prevPos).divideScalar(delta);
            controller.userData.velocity.copy(velocity);
        }
        controller.userData.prevPos = currentPos.clone();

        if (controller.userData.inputSource && controller.userData.inputSource.gamepad && controller.userData.inputSource.gamepad.buttons) {
            for (let i = 0; i < controller.userData.inputSource.gamepad.buttons.length; i++) {
                if (state.gameOver && controller.userData.inputSource.gamepad.buttons[4].pressed) {
                    resetGame();
                }
            }
        }

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
        startGame();
    } catch (err) {
        console.error("Failed to start AR session:", err);
    }
});

function resetGame() {
    // Reset game state
    state.gameOver = false;

    // Reset scoreboard
    scoreboardManager.resetShotClock();
    scoreboardManager.scoreboard.score = 0;
    scoreboardManager.scoreboard.updateTexture();

    // Clear controller velocities
    getControllers().forEach(controller => {
        controller.userData.velocity = new THREE.Vector3();
        controller.userData.prevPos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld); // Reset prevPos
    });

    startGame();
}