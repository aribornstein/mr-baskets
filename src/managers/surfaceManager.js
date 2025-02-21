// src/managers/surfaceManager.js
import * as THREE from "three";
import { eventBus } from "../core/eventBus.js";
import { createGroundPhysics, createRoomWalls } from "../core/physics.js";
import { createBallPhysics, createBallVisual } from "../gameplay/ballManager.js";
import { createHoopPhysics, createHoopVisual } from "../gameplay/hoopManager.js";
import { getCamera } from "../core/engine.js";

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
    eventBus.emit("roomBoundaryReady", state.roomBoundary);
    if (!state.wallsCreated && state.roomBoundary) {
      createRoomWalls(state.roomBoundary);
      state.wallsCreated = true;
    }
  }
  // Create ball and hoop after floor is configured
  if (state.floorConfigured && !state.ballCreated && !state.hoopCreated) {
    // Ball creation relative to the camera
    const camera = getCamera();
    const ballOffset = new THREE.Vector3(0, 0, -1);
    ballOffset.applyQuaternion(camera.quaternion);
    const ballPos = camera.position.clone().add(ballOffset);
    ballPos.y = state.BALL_RADIUS + state.floorOffset;
    if (state.roomBoundary) {
      ballPos.x = THREE.MathUtils.clamp(ballPos.x, state.roomBoundary.min.x + state.BALL_RADIUS, state.roomBoundary.max.x - state.BALL_RADIUS);
      ballPos.z = THREE.MathUtils.clamp(ballPos.z, state.roomBoundary.min.z + state.BALL_RADIUS, state.roomBoundary.max.z - state.BALL_RADIUS);
    }
    createBallPhysics(ballPos);
    createBallVisual(ballPos);
    state.ballCreated = true;
    
    // Hoop creation relative to the camera
    const hoopOffset = new THREE.Vector3(0, 0, -2.5);
    hoopOffset.applyQuaternion(camera.quaternion);
    const hoopPos = camera.position.clone().add(hoopOffset);
    hoopPos.y = state.HOOP_HEIGHT + state.floorOffset;
    if (state.roomBoundary) {
      hoopPos.x = THREE.MathUtils.clamp(hoopPos.x, state.roomBoundary.min.x + state.HOOP_RADIUS, state.roomBoundary.max.x - state.HOOP_RADIUS);
      hoopPos.z = THREE.MathUtils.clamp(hoopPos.z, state.roomBoundary.min.z + state.HOOP_RADIUS, state.roomBoundary.max.z - state.HOOP_RADIUS);
    }
    createHoopPhysics(hoopPos);
    createHoopVisual(hoopPos);
    state.hoopCreated = true;
    console.log("Ball and hoop created relative to the camera within room bounds.");
  }
}
