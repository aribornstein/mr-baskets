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
  if (label === "floor" && !state.environment.floorConfigured) {
    const box = new THREE.Box3().setFromObject(surfaceMesh);
    state.environment.floorOffset = box.min.y;
    state.environment.floorConfigured = true;
    console.log("Floor configured at:", state.environment.floorOffset);
    if (!state.objects.ground.created) {
      createGroundPhysics(state.environment.floorOffset);
      state.objects.ground.created = true;
    }
  }
  // Wall detection
  if (label === "wall") {
    const wallBox = new THREE.Box3().setFromObject(surfaceMesh);
    if (!state.environment.roomBoundary) {
      state.environment.roomBoundary = wallBox;
    } else {
      state.environment.roomBoundary.union(wallBox);
    }
    console.log("Updated room boundary:", state.environment.roomBoundary);
    // Notify that room boundaries are available.
    if (!state.objects.walls.created && state.environment.roomBoundary) {
      createRoomWalls(state.environment.roomBoundary);
      state.objects.walls.created = true;
      eventBus.emit("roomBoundaryReady", state.environment.roomBoundary);
    }
  }
  if (state.objects.ground.created && state.objects.walls.created) {
    state.game.roomSetupComplete = true;
    eventBus.emit("roomSetupComplete", state);
  }
}