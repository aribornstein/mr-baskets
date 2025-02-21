import * as THREE from "three";
import { addObject } from "../managers/sceneManager.js";
import { getCamera } from "../core/engine.js";

export class Scoreboard {
    constructor() {
        this.score = 0;
        // Create an offscreen canvas to render text
        this.canvas = document.createElement("canvas");
        this.canvas.width = 256;
        this.canvas.height = 128;
        this.context = this.canvas.getContext("2d");
        this.texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.SpriteMaterial({ map: this.texture });
        this.sprite = new THREE.Sprite(material);
        // Adjust scale – tweak as needed
        this.sprite.scale.set(1.5, 0.75, 1);
        this.updateTexture();
        addObject(this.sprite);
    }

    updateTexture() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.font = "40px Arial";
        this.context.fillStyle = "#ffffff";
        this.context.fillText(`Score: ${this.score}`, 20, 70);
        this.texture.needsUpdate = true;
    }

    increment() {
        this.score++;
        this.updateTexture();
    }

    // Places the scoreboard on a wall.
    // pos is a THREE.Vector3 and quat a THREE.Quaternion representing the wall's orientation.
    setPosition(pos, quat) {
        this.sprite.position.copy(pos);
        this.sprite.quaternion.copy(quat);
    }
}

export class ScoreboardManager {
    constructor(state) {
        this.state = state;
        this.scoreboard = new Scoreboard();
    }

    placeScoreboard() {
        if (!this.state.roomBoundary) return;

        const camPos = getCamera().position;
        const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(getCamera().quaternion); // Camera's forward direction

        // Calculate dot products to determine if the walls are in front of the camera
        const dotMinX = camDir.dot(new THREE.Vector3(1, 0, 0)); // Wall at minX
        const dotMaxX = camDir.dot(new THREE.Vector3(-1, 0, 0)); // Wall at maxX
        const dotMinZ = camDir.dot(new THREE.Vector3(0, 0, 1)); // Wall at minZ
        const dotMaxZ = camDir.dot(new THREE.Vector3(0, 0, -1)); // Wall at maxZ

        let minDist = Infinity;
        let nearestWall = null;
        let pos = new THREE.Vector3();
        let quat = new THREE.Quaternion();

        // Check each wall, but only if it's in front of the camera
        if (dotMinX > 0) {
            const dist = Math.abs(camPos.x - this.state.roomBoundary.min.x);
            if (dist < minDist) {
                minDist = dist;
                nearestWall = "minX";
            }
        }
        if (dotMaxX > 0) {
            const dist = Math.abs(camPos.x - this.state.roomBoundary.max.x);
            if (dist < minDist) {
                minDist = dist;
                nearestWall = "maxX";
            }
        }
        if (dotMinZ > 0) {
            const dist = Math.abs(camPos.z - this.state.roomBoundary.min.z);
            if (dist < minDist) {
                minDist = dist;
                nearestWall = "minZ";
            }
        }
        if (dotMaxZ > 0) {
            const dist = Math.abs(camPos.z - this.state.roomBoundary.max.z);
            if (dist < minDist) {
                minDist = dist;
                nearestWall = "maxZ";
            }
        }

        if (nearestWall) {
            switch (nearestWall) {
                case "minX":
                    pos.set(this.state.roomBoundary.min.x - 0.1, camPos.y, camPos.z);
                    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                    break;
                case "maxX":
                    pos.set(this.state.roomBoundary.max.x + 0.1, camPos.y, camPos.z);
                    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
                    break;
                case "minZ":
                    pos.set(camPos.x, camPos.y, this.state.roomBoundary.min.z - 0.1);
                    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
                    break;
                case "maxZ":
                    pos.set(camPos.x, camPos.y, this.state.roomBoundary.max.z + 0.1);
                    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
                    break;
            }
            this.scoreboard.setPosition(pos, quat);
        }
    }

    incrementScore() {
        this.scoreboard.increment();
    }
}