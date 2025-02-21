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

        // Determine distances to each wall
        const camPos = getCamera().position;
        const distMinX = Math.abs(camPos.x - this.state.roomBoundary.min.x);
        const distMaxX = Math.abs(camPos.x - this.state.roomBoundary.max.x);
        const distMinZ = Math.abs(camPos.z - this.state.roomBoundary.min.z);
        const distMaxZ = Math.abs(camPos.z - this.state.roomBoundary.max.z);

        // Find the minimum distance
        const minDist = Math.min(distMinX, distMaxX, distMinZ, distMaxZ);
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();

        if (minDist === distMinX) {
            pos.set(this.state.roomBoundary.min.x - 0.1, camPos.y, camPos.z); // Shift slightly outside the wall
            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // Facing inward
        } else if (minDist === distMaxX) {
            pos.set(this.state.roomBoundary.max.x + 0.1, camPos.y, camPos.z); // Shift slightly outside the wall
            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        } else if (minDist === distMinZ) {
            pos.set(camPos.x, camPos.y, this.state.roomBoundary.min.z - 0.1); // Shift slightly outside the wall
            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
        } else {
            pos.set(camPos.x, camPos.y, this.state.roomBoundary.max.z + 0.1); // Shift slightly outside the wall
            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        }

        this.scoreboard.setPosition(pos, quat);
    }

    incrementScore() {
        this.scoreboard.increment();
    }
}