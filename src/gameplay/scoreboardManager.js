import * as THREE from "three";
import { addObject } from "../managers/sceneManager.js";
import { getCamera } from "../core/engine.js";
import { eventBus } from "../core/eventBus.js";
import { state } from "../managers/stateManager.js";


export class Scoreboard {
    constructor() {
        this.score = 0;
        // Create an offscreen canvas to render text
        this.canvas = document.createElement("canvas");
        this.canvas.width = 256;
        this.canvas.height = 128;
        this.context = this.canvas.getContext("2d");
        this.texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.MeshStandardMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide });
        const geometry = new THREE.PlaneGeometry(1.5, 0.75);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.frustumCulled = false; // Disable frustum culling
        // Adjust scale – tweak as needed
        this.updateTexture();
        addObject(this.mesh);
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
        this.mesh.position.copy(pos);
        this.mesh.quaternion.copy(quat);
    }
}

export class ScoreboardManager {
    constructor(state) {
        this.state = state;
        this.scoreboard = new Scoreboard();
        eventBus.on("roomBoundaryReady", (roomBoundary) => {
            console.log("Placing scoreboard...");
            this.placeScoreboard(roomBoundary);
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
                            pos.x -= 0.1;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                            break;
                        case "maxX":
                            pos.x += 0.1;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
                            break;
                        case "minZ":
                            pos.z -= 0.1;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
                            break;
                        case "maxZ":
                            pos.z += 0.1;
                            quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
                            break;
                    }
                }
            }
        });
    
        if (nearestWall) {
            pos.y = state.floorOffset + 2.0; // Set a fixed height above the floor
            this.scoreboard.setPosition(pos, quat);
        }
    }

    incrementScore() {
        this.scoreboard.increment();
    }
}