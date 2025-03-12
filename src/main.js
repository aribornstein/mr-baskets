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
import { playBackgroundMusic, stopBackgroundMusic, loadBounceSound, playBounceSound, playBuzzerSound, loadBuzzerSound, playCheerSound, playTauntSound, stopAllAudio } from "./effects/audioManager.js";
import { updateFlameParticles, updateIceParticles } from "./effects/particles.js";
import { applyFirePowerUp, applyIcePowerUp } from "./gameplay/powerUpManager.js";
import { updateLevel } from "./managers/levelManager.js";
import { Debugger } from "./core/debugger.js";

let clockGame, accumulator = 0, fixedTimeStep = 1 / 60;
let ratk;
let scoreboardManager;
let world;
let debuggerInstance; // Add this line

async function initGame() {
    clockGame = new THREE.Clock();
    await initPhysics();  // Wait for Rapier to initialize
    initSceneManager();
    registerBallInput(state);
    initInputManager(state);

    // Load the bounce sound
    await loadBounceSound(); // Add this line
    await loadBuzzerSound(); // Add this line

    // Setup RealityAccelerator for plane/mesh detection
    ratk = new RealityAccelerator(getRenderer().xr);
    ratk.onPlaneAdded = (event) => handleSurfaceAdded(event, state);
    ratk.onMeshAdded = (event) => handleSurfaceAdded(event, state);
    getScene().add(ratk.root);
    ratk.root.visible = false;

    // Get the world 
    world = getWorld();

    // Initialize the debugger
    if (state.debugger){
        debuggerInstance = new Debugger(world); // Add this line
        debuggerInstance.enable(); // Enable debugger initially
        getScene().add(debuggerInstance); // Add to scene
    }


    // Listen for game over event
    eventBus.on("gameOver", () => {
        console.log("Game Over - Resetting Game");
        state.game.gameOver = true;
        scoreboardManager.scoreboard.updateTexture(); // Update scoreboard to show game over
        removeBallAndHoop(state);
        stopBackgroundMusic(); // Stop
        playBuzzerSound(); 
    });

    eventBus.on("roomSetupComplete", (state) => {
        if (!state.objects.ball.created && !state.objects.hoop.created) {
            createBallAndHoop(state);
        }
    });

    eventBus.on("newLevel", (state)=> {    

        playCheerSound(); // Play cheer sound when level changes
        state.environment.previousRegionIndex = -1; // Reset region index
        // Random chance to trigger a power-up
        const ballMesh = getBallMesh();
        const chance = Math.random();
        if (ballMesh && state.game.level > 3) {
            // e.g., 30% chance to trigger a power-up after a basket
            if (chance < 0.15) {
            // Trigger the fire power-up: double score points and play flame effect.
            applyFirePowerUp(ballMesh, state, scoreboardManager);
            } else if (chance < 0.30) {
            // Trigger the ice power-up: pause shot clock and play ice effect.
            applyIcePowerUp(ballMesh, scoreboardManager);
            }
        }
    });

    eventBus.on("missedShot", () => {
        if (state.debugger){
            console.log("Missed Shot");
            return;
        }
        state.game.missedShots++;
        state.game.shotAttempt = false; // Reset once counted
        playTauntSound();
        // End game if 3 missed shots have accumulated
        if (state.game.missedShots >= 3) {
            console.log("Game Over due to 3 missed shots.");
            eventBus.emit("gameOver");
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
                updateLevel();
                moveHoopToNewPosition(state);
            }

            // Check for collisions between ball and ground using userData markers.
            if (started && ((collider1.userData === "ball" && collider2.userData === "ground") ||
                            (collider1.userData === "ground" && collider2.userData === "ball"))) {
                if (state.game.shotAttempt) {
                  eventBus.emit("missedShot");
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

    // Update the debugger
    if (debuggerInstance && debuggerInstance.isEnabled()) { // Add this line
        debuggerInstance.update(); // Add this line
    } // Add this line
    
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
            
            stopAllAudio();
            eventBus.removeAllListeners();

            // Dispose of Three.js resources
            const scene = getScene();
            scene.traverse(object => {
                if (object.isMesh) {
                    object.geometry.dispose();
                    if (object.material.map) object.material.map.dispose();
                    object.material.dispose();
                }
            });

            // Remove all objects from the scene
            while(scene.children.length > 0){ 
              scene.remove(scene.children[0]); 
            }

            // Dispose of physics world
            if (world) {
                world.free();
                world = null;
            }

            // Clear references
            scoreboardManager = null;
            debuggerInstance = null;
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
    state.game.level = 1;
    state.game.shotClockInit = 24;
    state.objects.hoop.moveLeftAndRight = false;
    state.objects.hoop.moveUpAndDown = false;
    state.objects.hoop.moveBackAndForth = false;
    state.objects.hoop.movementAmplitude = 0.2;
    state.objects.hoop.movementFrequency = 0.5;

    
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

    state.environment.previousRegionIndex = -1;

    startGame();
}