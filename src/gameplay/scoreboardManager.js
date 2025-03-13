import * as THREE from "three";
import { addObject } from "../managers/sceneManager.js";
import { getCamera } from "../core/engine.js";
import { eventBus } from "../core/eventBus.js";
import { state } from "../managers/stateManager.js";

// Updated Constants
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;
const PLANE_WIDTH = 2.0;
const PLANE_HEIGHT = 1.0;

const SHOT_CLOCK_INTERVAL_MS = 1000;
const SCOREBOARD_HEIGHT_ABOVE_FLOOR = 2.5;
const SCOREBOARD_POSITION_OFFSET = 0.1;

// Color and style constants for LED look using DSEG font
const SCOREBOARD_BACKGROUND_COLOR = "rgba(0, 0, 0, 0.8)";
const COLOR_HOME = "rgb(255, 0, 0)";      // red
const COLOR_LEVEL = "rgb(0, 255, 0)";     // green
const COLOR_LABEL = "#ffff00";            // yellow for labels
const COLOR_MAIN_CLOCK = "#ffffff";       // white for main game clock
const COLOR_SHOT_CLOCK = "#00ffcc";       // teal for shot clock

// Shadow settings for LED glow effect
const SHADOW_COLOR = "rgba(0, 255, 255, 0.8)"; // cyan-ish glow
const SHADOW_BLUR = 10;

export class Scoreboard {
    constructor() {
        // Single player: only "homeScore" + "level"
        state.game.level = 1;
        this.gameClockDisplay = "00:00"; // Display string

        // Shot clock logic
        this.shotClock = state.game.shotClockInit;
        this.shotClockInterval = null;
        this.gameClockInterval = null; // Interval for the game clock

        // Create canvas + texture
        this.canvas = document.createElement("canvas");
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.context = this.canvas.getContext("2d");
        this.texture = new THREE.CanvasTexture(this.canvas);

        // Plane for the scoreboard
        const material = new THREE.MeshStandardMaterial({
            map: this.texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.frustumCulled = false;

        // Initial draw
        this.updateTexture();

        // Add to the scene
        addObject(this.mesh);
    }

    updateTexture() {
        const ctx = this.context;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background
        ctx.fillStyle = SCOREBOARD_BACKGROUND_COLOR;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Common text settings
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.shadowColor = SHADOW_COLOR;
        ctx.shadowBlur = SHADOW_BLUR;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Game over display
        if (state.game.gameOver) {
            // Build dynamic game over text using an array of lines.
            const lines = [
                "Game Over!",
                `Score: ${String(state.game.score)}.`,
                "Press the A Button to Play Again!"
            ];
            ctx.fillStyle = "red";
            let fontSize = 30;
            const minFontSize = 16;
            ctx.font = `bold ${fontSize}px 'DSEG14 Classic', Arial`;

            // Determine the maximum width of the lines
            let maxWidth = 0;
            for (const line of lines) {
                const width = ctx.measureText(line).width;
                if (width > maxWidth) {
                    maxWidth = width;
                }
            }
            // Reduce font size until the longest line fits within the canvas width.
            while (maxWidth > this.canvas.width && fontSize > minFontSize) {
                fontSize--;
                ctx.font = `bold ${fontSize}px 'DSEG14 Classic', Arial`;
                maxWidth = 0;
                for (const line of lines) {
                    const width = ctx.measureText(line).width;
                    if (width > maxWidth) {
                        maxWidth = width;
                    }
                }
            }
            fontSize = Math.max(fontSize, minFontSize);
            ctx.font = `bold ${fontSize}px 'DSEG14 Classic', Arial`;

            // Calculate line height and starting Y position for vertical centering.
            const lineHeight = fontSize * 2.0;
            const textBlockHeight = lineHeight * lines.length;
            let startY = centerY - textBlockHeight / 2 + lineHeight / 2;

            // Draw each line of text.
            for (const line of lines) {
                ctx.fillText(line, centerX, startY);
                startY += lineHeight;
            }
            this.texture.needsUpdate = true;
            return;
        }

        // Draw HOME / LEVEL labels and scores
        ctx.font = "bold 30px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_LABEL;
        ctx.fillText("HOME", centerX - 160, 40);
        ctx.fillText("LEVEL", centerX + 160, 40);

        ctx.font = "bold 50px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_HOME;
        ctx.fillText(String(state.game.score).padStart(3, "0"), centerX - 160, 90);

        ctx.fillStyle = COLOR_LEVEL;
        ctx.fillText(String(state.game.level), centerX + 160, 90);

        // Draw main game clock
        ctx.font = "bold 50px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_MAIN_CLOCK;
        ctx.fillText(this.gameClockDisplay, centerX, centerY);

        // Draw SHOT CLOCK
        ctx.font = "bold 20px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_LABEL;
        ctx.fillText("SHOT CLOCK", centerX, centerY + 60);

        ctx.font = "bold 40px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_SHOT_CLOCK;
        ctx.fillText(String(this.shotClock), centerX, centerY + 100);

        // Draw MISSED SHOTS as X's centered underneath the label
        ctx.font = "bold 30px 'DSEG14 Classic', Arial";
        ctx.fillStyle = "red";
        ctx.fillText("MISS", centerX, centerY - 100);
        const missedX = "X".repeat(state.game.missedShots);
        ctx.fillText(missedX, centerX, centerY - 70);

        this.texture.needsUpdate = true;
    }

    // Method to update the displayed game clock
    updateGameClockDisplay() {
        const minutes = Math.floor(state.game.gameClock / 60);
        const seconds = state.game.gameClock % 60;
        this.gameClockDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this.updateTexture();
    }

    // Start the game clock
    startGameClock() {
        this.gameClockInterval = setInterval(() => {
            state.game.gameClock++;
            this.updateGameClockDisplay();
        }, 1000);
    }

    stopGameClock() {
        clearInterval(this.gameClockInterval);
    }

    // Reset the game clock
    resetGameClock() {
        state.game.gameClock = 0;
        this.updateGameClockDisplay();
    }

    // Increment home score method
    increment() {
        state.game.score++;
        state.shotClockInit = Math.max(24 - Math.floor(state.game.score / 5), 3);
        this.updateTexture();
    }

    // Advance level method
    nextLevel() {
        state.game.level++;
        this.updateTexture();
    }

    // Set position in 3D space
    setPosition(pos, quat) {
        this.mesh.position.copy(pos);
        this.mesh.quaternion.copy(quat);
    }

    // Shot clock control
    startShotClock() {
        this.shotClock = state.game.shotClockInit;
        this.updateTexture();
        this.shotClockInterval = setInterval(() => {
            if (this.shotClock > 0) {
                this.shotClock--;
                this.updateTexture();
            } else {
                this.stopShotClock();
                this.stopGameClock(); // Stop the game clock when game is over
                eventBus.emit("gameOver");
            }
        }, SHOT_CLOCK_INTERVAL_MS);
    }

    pauseShotClock() {
        clearInterval(this.shotClockInterval);
        this.savedShotClock = this.shotClock;
        this.shotClockInterval = null; // Ensure the interval is cleared
    }

    unpauseShotClock() {
        if (this.shotClockInterval === null) {
            this.shotClock = this.savedShotClock !== undefined ? this.savedShotClock : state.game.shotClockInit;
            this.shotClockInterval = setInterval(() => {
                if (this.shotClock > 0) {
                    this.shotClock--;
                    this.updateTexture();
                } else {
                    this.stopShotClock();
                    this.stopGameClock(); // Stop the game clock when game is over
                    eventBus.emit("gameOver");
                }
            }, SHOT_CLOCK_INTERVAL_MS);
        }
    }

    stopShotClock() {
        clearInterval(this.shotClockInterval);
    }

    resetShotClock() {
        this.shotClock = state.game.shotClockInit;
        this.updateTexture();
    }
}

export class ScoreboardManager {
    constructor(state) {
        this.state = state;
        this.scoreboard = new Scoreboard();

        eventBus.on("roomBoundaryReady", (roomBoundary) => {
            console.log("Placing scoreboard...");
            this.placeScoreboard(roomBoundary);
            this.startShotClock();
            this.startGameClock(); // Start the game clock when the scoreboard is placed

        });
    }

    placeScoreboard(roomBoundary) {
        const camPos = getCamera().position;
        const camDir = new THREE.Vector3(0, 0, -1)
            .transformDirection(getCamera().matrixWorld)
            .normalize();

        let nearestWall = null;
        let minDist = Infinity;
        let maxDotProduct = -Infinity;
        let pos = new THREE.Vector3();
        let quat = new THREE.Quaternion();

        const walls = [
            {
                name: "minX",
                position: new THREE.Vector3(
                    roomBoundary.min.x,
                    roomBoundary.max.y / 2,
                    camPos.z
                ),
                normal: new THREE.Vector3(1, 0, 0)
            },
            {
                name: "maxX",
                position: new THREE.Vector3(
                    roomBoundary.max.x,
                    roomBoundary.max.y / 2,
                    camPos.z
                ),
                normal: new THREE.Vector3(-1, 0, 0)
            },
            {
                name: "minZ",
                position: new THREE.Vector3(
                    camPos.x,
                    roomBoundary.max.y / 2,
                    roomBoundary.min.z
                ),
                normal: new THREE.Vector3(0, 0, 1)
            },
            {
                name: "maxZ",
                position: new THREE.Vector3(
                    camPos.x,
                    roomBoundary.max.y / 2,
                    roomBoundary.max.z
                ),
                normal: new THREE.Vector3(0, 0, -1)
            }
        ];

        walls.forEach((wall) => {
            const directionToWall = new THREE.Vector3()
                .subVectors(wall.position, camPos)
                .normalize();
            const dotProduct = camDir.dot(directionToWall);

            if (dotProduct > 0) {
                const dist = camPos.distanceTo(wall.position);
                if (
                    dotProduct > maxDotProduct ||
                    (dotProduct === maxDotProduct && dist < minDist)
                ) {
                    maxDotProduct = dotProduct;
                    minDist = dist;
                    nearestWall = wall.name;
                    pos.copy(wall.position);

                    switch (wall.name) {
                        case "minX":
                            pos.x -= SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(
                                new THREE.Vector3(0, 1, 0),
                                Math.PI / 2
                            );
                            break;
                        case "maxX":
                            pos.x += SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(
                                new THREE.Vector3(0, 1, 0),
                                -Math.PI / 2
                            );
                            break;
                        case "minZ":
                            pos.z -= SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(
                                new THREE.Vector3(0, 1, 0),
                                0
                            );
                            break;
                        case "maxZ":
                            pos.z += SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(
                                new THREE.Vector3(0, 1, 0),
                                Math.PI
                            );
                            break;
                    }
                }
            }
        });

        if (nearestWall) {
            pos.y = state.environment.floorOffset + SCOREBOARD_HEIGHT_ABOVE_FLOOR;
            this.scoreboard.setPosition(pos, quat);
        }
    }

    // Increment the Home score and check for level-up conditions
    incrementScore() {
        this.scoreboard.increment();
    }

    // Advance to the next level
    nextLevel() {
        this.scoreboard.nextLevel();
    }

    startShotClock() {
        this.scoreboard.startShotClock();
    }

    startGameClock() {
        this.scoreboard.startGameClock();
    }

    stopShotClock() {
        this.scoreboard.stopShotClock();
    }

    resetGameClock() {
        this.scoreboard.resetGameClock();
    }

    resetShotClock() {
        this.scoreboard.resetShotClock();
    }
}
