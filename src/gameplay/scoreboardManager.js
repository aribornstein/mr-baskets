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

const SHOT_CLOCK_INITIAL = 24;
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
const GAME_OVER_TEXT = "Game Over! Press the A Button to Play Again!";

// Shadow settings for LED glow effect
const SHADOW_COLOR = "rgba(0, 255, 255, 0.8)"; // cyan-ish glow
const SHADOW_BLUR = 10;

export class Scoreboard {
    constructor() {
        // Single player: only "homeScore" + "level"
        this.homeScore = 0;
        this.level = 1;
        this.gameClock = "00:00";

        // Shot clock logic
        this.shotClock = SHOT_CLOCK_INITIAL;
        this.shotClockInterval = null;

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

        // Set up common text settings
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.shadowColor = SHADOW_COLOR;
        ctx.shadowBlur = SHADOW_BLUR;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // If game over, show only the game over message
        if (state.gameOver) {
            ctx.fillStyle = "red";
            let fontSize = 30; // Start with a default font size
            const minFontSize = 16; // Minimum font size
            ctx.font = `bold ${fontSize}px 'DSEG14 Classic', Arial`;

            // Measure the text width with the current font size
            let textWidth = ctx.measureText(GAME_OVER_TEXT).width;

            // Reduce the font size until the text fits within the canvas width
            while (textWidth > this.canvas.width && fontSize > minFontSize) {
                fontSize--;
                ctx.font = `bold ${fontSize}px 'DSEG14 Classic', Arial`;
                textWidth = ctx.measureText(GAME_OVER_TEXT).width;
            }

             // Ensure the font size doesn't go below the minimum
             fontSize = Math.max(fontSize, minFontSize);
             ctx.font = `bold ${fontSize}px 'DSEG14 Classic', Arial`;

            ctx.fillText(GAME_OVER_TEXT, centerX, centerY);
            this.texture.needsUpdate = true;
            return;
        }

        // ========== Draw HOME / LEVEL labels ==========
        ctx.font = "bold 30px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_LABEL;
        ctx.fillText("HOME", centerX - 150, 40);
        ctx.fillText("LEVEL", centerX + 150, 40);

        // ========== Draw HOME Score ==========
        ctx.font = "bold 50px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_HOME;
        ctx.fillText(String(this.homeScore).padStart(3, "0"), centerX - 150, 90);

        // ========== Draw LEVEL number ==========
        ctx.fillStyle = COLOR_LEVEL;
        ctx.fillText(String(this.level), centerX + 150, 90);

        // ========== Draw main game clock ==========
        ctx.font = "bold 50px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_MAIN_CLOCK;
        ctx.fillText(this.gameClock, centerX, centerY);

        // ========== Draw SHOT CLOCK label and number ==========
        ctx.font = "bold 20px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_LABEL;
        ctx.fillText("SHOT CLOCK", centerX, centerY + 40);

        ctx.font = "bold 40px 'DSEG14 Classic', Arial";
        ctx.fillStyle = COLOR_SHOT_CLOCK;
        ctx.fillText(String(this.shotClock), centerX, centerY + 80);

        // Update the texture
        this.texture.needsUpdate = true;
    }

    // Increment home score method
    increment() {
        this.homeScore++;
        this.updateTexture();
    }

    // Advance level method
    nextLevel() {
        this.level++;
        this.updateTexture();
    }

    // Set position in 3D space
    setPosition(pos, quat) {
        this.mesh.position.copy(pos);
        this.mesh.quaternion.copy(quat);
    }

    // Shot clock control
    startShotClock() {
        this.shotClock = SHOT_CLOCK_INITIAL;
        this.updateTexture();
        this.shotClockInterval = setInterval(() => {
            if (this.shotClock > 0) {
                this.shotClock--;
                this.updateTexture();
            } else {
                this.stopShotClock();
                eventBus.emit("gameOver");
            }
        }, SHOT_CLOCK_INTERVAL_MS);
    }

    stopShotClock() {
        clearInterval(this.shotClockInterval);
    }

    resetShotClock() {
        this.shotClock = SHOT_CLOCK_INITIAL;
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
            pos.y = state.floorOffset + SCOREBOARD_HEIGHT_ABOVE_FLOOR;
            this.scoreboard.setPosition(pos, quat);
        }
    }

    // Increment the Home score
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

    stopShotClock() {
        this.scoreboard.stopShotClock();
    }

    resetShotClock() {
        this.scoreboard.resetShotClock();
    }
}
