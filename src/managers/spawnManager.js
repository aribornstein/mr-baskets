// src/managers/spawnManager.js
import * as THREE from "three";
import { getCamera } from "../core/engine.js";
import { createBallPhysics, createBallVisual, removeBall } from "../gameplay/ballManager.js";
import { createHoopObject, removeHoop, moveHoop } from "../gameplay/hoopManager.js";


function createBall(state) {
    const camera = getCamera();
    const ballOffset = new THREE.Vector3(0, 0, -1);
    ballOffset.applyQuaternion(camera.quaternion);
    const ballPos = camera.position.clone().add(ballOffset);
    ballPos.y = state.objects.ball.radius + state.environment.floorOffset;
    if (state.environment.roomBoundary) {
        ballPos.x = THREE.MathUtils.clamp(ballPos.x, state.environment.roomBoundary.min.x + state.objects.ball.radius, state.environment.roomBoundary.max.x - state.objects.ball.radius);
        ballPos.z = THREE.MathUtils.clamp(ballPos.z, state.environment.roomBoundary.min.z + state.objects.ball.radius, state.environment.roomBoundary.max.z - state.objects.ball.radius);
    }
    createBallPhysics(ballPos);
    createBallVisual(ballPos);
    state.objects.ball.created = true;
    return ballPos;
}

function createHoop(state) {
    const camera = getCamera();
    const hoopOffset = new THREE.Vector3(0, 0, -2.5);
    hoopOffset.applyQuaternion(camera.quaternion);
    const hoopPos = camera.position.clone().add(hoopOffset);
    hoopPos.y = state.objects.hoop.height + state.environment.floorOffset;
    if (state.environment.roomBoundary) {
        hoopPos.x = THREE.MathUtils.clamp(hoopPos.x, state.environment.roomBoundary.min.x + state.objects.hoop.radius, state.environment.roomBoundary.max.x - state.objects.hoop.radius);
        hoopPos.z = THREE.MathUtils.clamp(hoopPos.z, state.environment.roomBoundary.min.z + state.objects.hoop.radius, state.environment.roomBoundary.max.z - state.objects.hoop.radius);
    }
    createHoopObject(hoopPos);
    state.objects.hoop.created = true;
    return hoopPos
}

function findNewHoopPosition(state) {
    const camera = getCamera();
    let newHoopPos = new THREE.Vector3();
    const safeRadius = 3; // Minimum distance from the player
    const numRegionsX = 3;
    const numRegionsZ = 3;

    if (state.environment.roomBoundary) {
        const roomMinX = state.environment.roomBoundary.min.x + state.objects.hoop.radius;
        const roomMaxX = state.environment.roomBoundary.max.x - state.objects.hoop.radius;
        const roomMinZ = state.environment.roomBoundary.min.z + state.objects.hoop.radius;
        const roomMaxZ = state.environment.roomBoundary.max.z - state.objects.hoop.radius;

        const cameraX = camera.position.x;
        const cameraZ = camera.position.z;

        // Define a valid range outside the `safeRadius` around the player
        const validMinX = Math.max(roomMinX, cameraX + safeRadius);
        const validMaxX = Math.min(roomMaxX, cameraX - safeRadius);
        const validMinZ = Math.max(roomMinZ, cameraZ + safeRadius);
        const validMaxZ = Math.min(roomMaxZ, cameraZ - safeRadius);

        // Ensure the valid range is still inside room bounds
        let minX = Math.max(validMinX, roomMinX);
        let maxX = Math.min(validMaxX, roomMaxX);
        let minZ = Math.max(validMinZ, roomMinZ);
        let maxZ = Math.min(validMaxZ, roomMaxZ);

        // Handle edge cases where safeRadius constraint collapses the valid area
        if (minX >= maxX) { minX = roomMinX; maxX = roomMaxX; }
        if (minZ >= maxZ) { minZ = roomMinZ; maxZ = roomMaxZ; }

        // Divide the area into regions
        const regionWidth = (maxX - minX) / numRegionsX;
        const regionHeight = (maxZ - minZ) / numRegionsZ;
        const numRegions = numRegionsX * numRegionsZ;

        // Convert previous region to grid coordinates
        const prevRegionX = state.environment.previousRegionIndex % numRegionsX;
        const prevRegionZ = Math.floor(state.environment.previousRegionIndex / numRegionsX);

        // Get all non-adjacent regions
        const availableRegions = [];
        for (let i = 0; i < numRegions; i++) {
            const regionX = i % numRegionsX;
            const regionZ = Math.floor(i / numRegionsX);

            // Exclude the previous region and its adjacent regions
            if (
                Math.abs(regionX - prevRegionX) > 1 || 
                Math.abs(regionZ - prevRegionZ) > 1
            ) {
                availableRegions.push(i);
            }
        }

        // Pick a region from non-adjacent regions
        const regionIndex = availableRegions.length > 0
            ? availableRegions[Math.floor(Math.random() * availableRegions.length)]
            : state.environment.previousRegionIndex; // Fallback in case no valid regions

        state.environment.previousRegionIndex = regionIndex;

        // Compute region boundaries
        const regionX = regionIndex % numRegionsX;
        const regionZ = Math.floor(regionIndex / numRegionsX);
        const regionMinX = minX + regionX * regionWidth;
        const regionMaxX = regionMinX + regionWidth;
        const regionMinZ = minZ + regionZ * regionHeight;
        const regionMaxZ = regionMinZ + regionHeight;

        // Generate a position within the selected region
        let x = THREE.MathUtils.randFloat(regionMinX, regionMaxX);
        let z = THREE.MathUtils.randFloat(regionMinZ, regionMaxZ);

        newHoopPos.set(x, state.objects.hoop.height + state.environment.floorOffset, z);

        // Final clamping to ensure it remains inside room bounds
        newHoopPos.x = THREE.MathUtils.clamp(newHoopPos.x, roomMinX, roomMaxX);
        newHoopPos.z = THREE.MathUtils.clamp(newHoopPos.z, roomMinZ, roomMaxZ);
        newHoopPos.y = state.objects.hoop.height + state.environment.floorOffset;

        // Store new hoop position in state
        state.objects.hoop.pos = newHoopPos.clone();
    } else {
        // Default positioning when no room boundaries exist
        const hoopOffset = new THREE.Vector3(0, 0, -2.5);
        hoopOffset.applyQuaternion(camera.quaternion);
        newHoopPos = camera.position.clone().add(hoopOffset);
        newHoopPos.y = state.objects.hoop.height + state.environment.floorOffset;
    }

    console.log("Final Assigned Hoop Position:", newHoopPos);
    return newHoopPos;
}



export function moveHoopToNewPosition(state, delay = 200) {
    state.objects.hoop.isMoving = true;
    const newHoopPos = findNewHoopPosition(state);

    // Calculate allowed movement range based on new position
    if (state.environment.roomBoundary) {
        const roomMinX = state.environment.roomBoundary.min.x + state.objects.hoop.radius;
        const roomMaxX = state.environment.roomBoundary.max.x - state.objects.hoop.radius;
        const roomMinY = state.environment.floorOffset + state.objects.hoop.radius;
        const roomMaxY = state.objects.hoop.height - state.objects.hoop.radius;
        const roomMinZ = state.environment.roomBoundary.min.z + state.objects.hoop.radius;
        const roomMaxZ = state.environment.roomBoundary.max.z - state.objects.hoop.radius;

        // Calculate the ranges
        const rangeX = roomMaxX - roomMinX;
        const rangeY = roomMaxY - roomMinY;
        const rangeZ = roomMaxZ - roomMinZ;

        // Define amplitudes as fractions of the ranges
        state.objects.hoop.amplitudeX = rangeX; 
        state.objects.hoop.amplitudeY = rangeY;
        state.objects.hoop.amplitudeZ = rangeZ;

        // Calculate center positions
        const centerX = (roomMinX + roomMaxX) / 2;
        const centerY = (roomMinY + roomMaxY) / 2;
        const centerZ = (roomMinZ + roomMaxZ) / 2;

        // Store the center position
        state.objects.hoop.centerPosition = { x: centerX, y: centerY, z: centerZ };

        // Calculate initial phase relative to center
        state.objects.hoop.phaseX = (newHoopPos.x - centerX) / state.objects.hoop.amplitudeX;
        state.objects.hoop.phaseY = (newHoopPos.y - centerY) / state.objects.hoop.amplitudeY;
        state.objects.hoop.phaseZ = (newHoopPos.z - centerZ) / state.objects.hoop.amplitudeZ;

        // Update initialHoopPos with the new position
        state.objects.hoop.pos = newHoopPos;
    } else {
        state.objects.hoop.pos = newHoopPos;
    }

    // Wait for the specified delay before moving the hoop
    setTimeout(() => {
        moveHoop(newHoopPos);
        state.objects.hoop.isMoving = false;
        console.log("Hoop moved to a new position within room bounds.", newHoopPos);
    }, delay);
}

export function createBallAndHoop(state) {
    createBall(state)
    createHoop(state)
    console.log("Ball and hoop created relative to the camera within room bounds.");
}

export function removeBallAndHoop(state) {
    removeBall();
    removeHoop();
    state.objects.ball.created = false;
    state.objects.hoop.created = false;
    console.log("Ball and hoop removed.");
}

