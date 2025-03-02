// src/managers/surfaceManager.js
import * as THREE from "three";
import { eventBus } from "../core/eventBus.js";
import { createGroundPhysics, createRoomWalls } from "../core/physics.js";

export function handleSurfaceAdded(event, state) {
    const surfaceMesh = event.planeMesh || event.meshMesh;
    if (!surfaceMesh || !event.semanticLabel) return;
    const label = event.semanticLabel.toLowerCase();
    console.log("Surface added:", label);

    // Floor detection
    if (label === "floor" && !state.floorConfigured) {
        const box = new THREE.Box3().setFromObject(surfaceMesh);
        state.floorOffset = box.min.y;
        state.floorConfigured = true;
        console.log("Floor configured at:", state.floorOffset);
        if (!state.groundCreated) {
            createGroundPhysics(state.floorOffset);
            state.groundCreated = true;
        }
    }
    // Wall detection
    if (label === "wall") {
        const wallBox = new THREE.Box3().setFromObject(surfaceMesh);
        if (!state.roomBoundary) {
            state.roomBoundary = wallBox;
        } else {
            state.roomBoundary.union(wallBox);
        }
        console.log("Updated room boundary:", state.roomBoundary);
        // Notify that room boundaries are available.
        if (!state.wallsCreated && state.roomBoundary) {
            createRoomWalls(state.roomBoundary);
            state.wallsCreated = true;
            eventBus.emit("roomBoundaryReady", state.roomBoundary);
        }
    }
    if (state.groundCreated && state.wallsCreated) {
        eventBus.emit("roomSetupComplete", state);
    }
}