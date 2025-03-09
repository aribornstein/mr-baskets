// src/main.js
import * as THREE from "three";
import { eventBus } from "./core/eventBus.js";
import { initEngine, getRenderer, getScene, getCamera } from "./core/engine.js";
import { initPhysics, getWorld, getEventQueue, stepPhysics } from "./core/physics.js";
import { initInputManager, getControllers } from "./managers/inputManager.js";
import { initSceneManager } from "./managers/sceneManager.js";
import { handleSurfaceAdded } from "./managers/surfaceManager.js";
import { state } from "./managers/stateManager.js";
import { RealityAccelerator } from "ratk";
import { ScoreboardManager } from "./gameplay/scoreboardManager.js";
import { createBallAndHoop, removeBallAndHoop, moveHoopToNewPosition } from "./managers/spawnManager.js";
import { registerBallInput, updateBall, getBallMesh } from "./gameplay/ballManager.js";
import { isBasket, updateHoopMovement} from "./gameplay/hoopManager.js";
import { playBackgroundMusic, stopBackgroundMusic, loadBounceSound, playBounceSound } from "./effects/audioManager.js";
import { addFlameEffectToBall, updateFlameParticles, addIceEffectToBall, updateIceParticles } from "./effects/particles.js";

let clockGame, accumulator = 0, fixedTimeStep = 1 / 60;
let ratk;
let scoreboardManager;
let world;

async function initGame() {
    clockGame = new THREE.Clock();
    await initPhysics();  // Wait for Rapier to initialize
    initSceneManager();
    registerBallInput(state);
    initInputManager(state);

    // Load the bounce sound
    await loadBounceSound(); // Add this line

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
        state.game.gameOver = true;
        scoreboardManager.scoreboard.updateTexture(); // Update scoreboard to show game over
        removeBallAndHoop(state);
        stopBackgroundMusic(); // Stop
    });

    eventBus.on("roomSetupComplete", (state) => {
        if (!state.objects.ball.created && !state.objects.hoop.created) {
            createBallAndHoop(state);
        }
    });

    // Start the render loop
    getRenderer().setAnimationLoop(animate);
}

function startGame() {
    if (!state.objects.scoreboard.created) {
        scoreboardManager = new ScoreboardManager(state);
        state.objects.scoreboard.created = true;
    }
    else {
        scoreboardManager.startShotClock();
        scoreboardManager.startGameClock();
    }

    // Create ball and hoop after floor is configured
    if (state.game.roomSetupComplete && !state.game.gameStarted) {
        createBallAndHoop(state);
        state.game.gameStarted = true;
    }

    playBackgroundMusic(); // Start playing background music

}

function animate() {
    const ballMesh = getBallMesh();
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
                state.game.shotAttempt = false;
                scoreboardManager.incrementScore();
                scoreboardManager.resetShotClock();
                moveHoopToNewPosition(state);
                if (state.game.score > 0 && state.game.score % 5 === 0) {
                    // Add flame effect to ball every 5 points
                    // Replace this with power up logic (flames, ice, etc.)
                    if (ballMesh) {
                        addIceEffectToBall(ballMesh, getScene(), getCamera(), getRenderer());
                    }
                }
            }

            // Check for collisions between ball and ground using userData markers.
            if (started && ((collider1.userData === "ball" && collider2.userData === "ground") ||
                            (collider1.userData === "ground" && collider2.userData === "ball"))) {
                if (state.game.shotAttempt) {
                    state.game.missedShots++;
                    console.log("Intentional shot missed! Total missed:", state.game.missedShots);
                    state.game.shotAttempt = false; // Reset once counted
                }
                playBounceSound();
            }
        });

        if (state.objects.hoop.created) {
            updateHoopMovement(state);
        }

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
                if (state.game.gameOver && controller.userData.inputSource.gamepad.buttons[4].pressed) {
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
    if (state.objects.ball.created && !state.objects.ball.isHeld) {
        updateBall(delta, state.environment.roomBoundary);
    }
    
    if (ballMesh) {
        if (ballMesh.userData.flameParticles) {
            updateFlameParticles(ballMesh.userData.flameParticles);
        }
        if (ballMesh.userData.iceParticles) {
            updateIceParticles(ballMesh.userData.iceParticles);
        }
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

        // Add event listener for session end
        session.addEventListener('end', () => {
            console.log("AR session ended.");
            stopBackgroundMusic();
        });
    } catch (err) {
        console.error("Failed to start AR session:", err);
    }
});

function resetGame() {
    // Reset game state
    state.game.gameOver = false;
    state.game.gameStarted = false;
    state.game.score = 0;
    state.game.missedShots = 0;
    state.game.shotAttempt = false;
    
    // Reset scoreboard
    scoreboardManager.resetShotClock();
    scoreboardManager.resetGameClock();
    scoreboardManager.scoreboard.score = 0;
    scoreboardManager.scoreboard.updateTexture();

    // Clear controller velocities
    getControllers().forEach(controller => {
        controller.userData.velocity = new THREE.Vector3();
        controller.userData.prevPos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld); // Reset prevPos
    });

    startGame();
}