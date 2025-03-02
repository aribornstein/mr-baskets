import * as THREE from "three";
import { addObject } from "../managers/sceneManager.js";
import { getCamera } from "../core/engine.js";
import { eventBus } from "../core/eventBus.js";
import { state } from "../managers/stateManager.js";

// Constants
const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 128;
const PLANE_WIDTH = 1.5;
const PLANE_HEIGHT = 0.75;
const SHOT_CLOCK_INITIAL = 24;
const SHOT_CLOCK_INTERVAL_MS = 1000;
const SCOREBOARD_HEIGHT_ABOVE_FLOOR = 2.5;
const SCOREBOARD_PADDING = 20;
const MAX_FONT_SIZE = 40;
const MIN_FONT_SIZE = 10;
const SCOREBOARD_BACKGROUND_COLOR = "rgba(0, 0, 0, 0.7)";
const SCOREBOARD_TEXT_COLOR = "#ffffff";
const SCOREBOARD_POSITION_OFFSET = 0.1;

export class Scoreboard {
    constructor() {
        this.score = 0;
        this.shotClock = SHOT_CLOCK_INITIAL; // Initialize shot clock to 24 seconds
        this.shotClockInterval = null; // Interval for shot clock countdown
        // Create an offscreen canvas to render text
        this.canvas = document.createElement("canvas");
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.context = this.canvas.getContext("2d");
        this.texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.MeshStandardMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide });
        const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.frustumCulled = false; // Disable frustum culling
        // Adjust scale – tweak as needed
        this.updateTexture();
        addObject(this.mesh);
    }

    updateTexture() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = SCOREBOARD_BACKGROUND_COLOR;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
        const maxWidth = this.canvas.width - SCOREBOARD_PADDING * 2; // Padding of 20 on each side
    
        const scoreText = `Score: ${this.score}`;
        const shotClockText = `Shot Clock: ${this.shotClock}`;
    
        let fontSize = MAX_FONT_SIZE;
        this.context.font = `${fontSize}px Arial`;
    
        while (this.context.measureText(scoreText).width > maxWidth || this.context.measureText(shotClockText).width > maxWidth) {
            fontSize--;
            if (fontSize < MIN_FONT_SIZE) {
                fontSize = MIN_FONT_SIZE;
                break;
            }
            this.context.font = `${fontSize}px Arial`;
        }
    
        this.context.fillStyle = SCOREBOARD_TEXT_COLOR;
        this.context.fillText(scoreText, SCOREBOARD_PADDING, 50);
        this.context.fillText(shotClockText, SCOREBOARD_PADDING, 100);
        this.texture.needsUpdate = true;
    }

    increment() {
        this.score++;
        this.updateTexture();
    }

    // Places the scoreboard on a wall.
    // pos is a THREE.Vector3 and quat a THREE.Quaternion representing the wall's orientation.
    setPosition(pos, quat) {
        this.mesh.position.copy(pos);
        this.mesh.quaternion.copy(quat);
    }

    startShotClock() {
        this.shotClock = SHOT_CLOCK_INITIAL;
        this.updateTexture();
        this.shotClockInterval = setInterval(() => {
            if (this.shotClock > 0) {
                this.shotClock--;
                this.updateTexture();
            } else {
                clearInterval(this.shotClockInterval);
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
        const camDir = new THREE.Vector3(0, 0, -1).transformDirection(getCamera().matrixWorld).normalize();
    
        let nearestWall = null;
        let minDist = Infinity;
        let maxDotProduct = -Infinity;
        let pos = new THREE.Vector3();
        let quat = new THREE.Quaternion();
    
        const walls = [
            { name: "minX", position: new THREE.Vector3(roomBoundary.min.x, roomBoundary.max.y / 2, camPos.z), normal: new THREE.Vector3(1, 0, 0) },
            { name: "maxX", position: new THREE.Vector3(roomBoundary.max.x, roomBoundary.max.y / 2, camPos.z), normal: new THREE.Vector3(-1, 0, 0) },
            { name: "minZ", position: new THREE.Vector3(camPos.x, roomBoundary.max.y / 2, roomBoundary.min.z), normal: new THREE.Vector3(0, 0, 1) },
            { name: "maxZ", position: new THREE.Vector3(camPos.x, roomBoundary.max.y / 2, roomBoundary.max.z), normal: new THREE.Vector3(0, 0, -1) }
        ];
    
        walls.forEach(wall => {
            const directionToWall = new THREE.Vector3().subVectors(wall.position, camPos).normalize();
            const dotProduct = camDir.dot(directionToWall);
    
            // Check if the wall is in front of the camera (dotProduct > 0)
            if (dotProduct > 0) {
                const dist = camPos.distanceTo(wall.position);
    
                if (dotProduct > maxDotProduct || (dotProduct === maxDotProduct && dist < minDist)) {
                    maxDotProduct = dotProduct;
                    minDist = dist;
                    nearestWall = wall.name;
                    pos.copy(wall.position);
                
                    switch (wall.name) {
                        case "minX":
                            pos.x -= SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                            break;
                        case "maxX":
                            pos.x += SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
                            break;
                        case "minZ":
                            pos.z -= SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
                            break;
                        case "maxZ":
                            pos.z += SCOREBOARD_POSITION_OFFSET;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
                            break;
                    }
                }
            }
        });
    
        if (nearestWall) {
            pos.y = state.floorOffset + SCOREBOARD_HEIGHT_ABOVE_FLOOR; // Set a fixed height above the floor replace this something relative to wall height
            this.scoreboard.setPosition(pos, quat);
        }
    }

    incrementScore() {
        this.scoreboard.increment();
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