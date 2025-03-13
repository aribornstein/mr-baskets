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
    const safeRadius = 3; // safe radius around the camera
    const minDistanceToPrevious = 2; // required minimum distance from previous hoop

    if (state.environment.roomBoundary) {
        // Define room boundaries for the hoop (inside room boundary with hoop radius)
        const roomMinX = state.environment.roomBoundary.min.x + state.objects.hoop.radius;
        const roomMaxX = state.environment.roomBoundary.max.x - state.objects.hoop.radius;
        const roomMinZ = state.environment.roomBoundary.min.z + state.objects.hoop.radius;
        const roomMaxZ = state.environment.roomBoundary.max.z - state.objects.hoop.radius;

        const cameraX = camera.position.x;
        const cameraZ = camera.position.z;
        let minX, maxX, minZ, maxZ;

        // Calculate valid X range outside the safe radius in relation to the camera
        if (cameraX - roomMinX > roomMaxX - cameraX) {
            minX = roomMinX;
            maxX = cameraX - safeRadius;
        } else {
            minX = cameraX + safeRadius;
            maxX = roomMaxX;
        }
        // Calculate valid Z range
        if (cameraZ - roomMinZ > roomMaxZ - cameraZ) {
            minZ = roomMinZ;
            maxZ = cameraZ - safeRadius;
        } else {
            minZ = cameraZ + safeRadius;
            maxZ = roomMaxZ;
        }
        if (minX > maxX) { [minX, maxX] = [maxX, minX]; }
        if (minZ > maxZ) { [minZ, maxZ] = [maxZ, minZ]; }

        // Clamp to the room boundaries
        minX = Math.max(minX, roomMinX);
        maxX = Math.min(maxX, roomMaxX);
        minZ = Math.max(minZ, roomMinZ);
        maxZ = Math.min(maxZ, roomMaxZ);

        // Divide available area into a grid of regions
        const numRegionsX = 3;
        const numRegionsZ = 3;
        const regionWidth = (maxX - minX) / numRegionsX;
        const regionHeight = (maxZ - minZ) / numRegionsZ;
        const numRegions = numRegionsX * numRegionsZ;

        let targetRegionIndex;
        let prevHoopPos = null;
        if (state.objects.hoop.pos) {
            // Clone previous hoop position once
            prevHoopPos = state.objects.hoop.pos.clone();
            let prevRegionX = Math.floor((prevHoopPos.x - minX) / regionWidth);
            let prevRegionZ = Math.floor((prevHoopPos.z - minZ) / regionHeight);
            // Clamp indices to ensure they fall within the grid
            prevRegionX = THREE.MathUtils.clamp(prevRegionX, 0, numRegionsX - 1);
            prevRegionZ = THREE.MathUtils.clamp(prevRegionZ, 0, numRegionsZ - 1);
            const prevRegionIndex = prevRegionZ * numRegionsX + prevRegionX;

            // Choose a region different from the previous region
            const availableRegions = Array.from({ length: numRegions }, (_, i) => i)
                .filter((i) => i !== prevRegionIndex);
            targetRegionIndex = availableRegions.length > 0 ? 
                availableRegions[Math.floor(Math.random() * availableRegions.length)] : prevRegionIndex;
        } else {
            // If no hoop previously exists, choose any random region
            targetRegionIndex = Math.floor(Math.random() * numRegions);
        }
        state.environment.previousRegionIndex = targetRegionIndex;

        // Determine the boundaries of the selected region
        const regionX = targetRegionIndex % numRegionsX;
        const regionZ = Math.floor(targetRegionIndex / numRegionsX);
        const regionMinX = minX + regionX * regionWidth;
        const regionMaxX = regionMinX + regionWidth;
        const regionMinZ = minZ + regionZ * regionHeight;
        const regionMaxZ = regionMinZ + regionHeight;

        // Generate a random position within this region
        let x = THREE.MathUtils.randFloat(regionMinX, regionMaxX);
        let z = THREE.MathUtils.randFloat(regionMinZ, regionMaxZ);
        newHoopPos.set(x, state.objects.hoop.height + state.environment.floorOffset, z);
        newHoopPos.x = THREE.MathUtils.clamp(newHoopPos.x, minX, maxX);
        newHoopPos.z = THREE.MathUtils.clamp(newHoopPos.z, minZ, maxZ);

        // If a previous hoop exists, enforce the minimum distance using the cloned value
        if (prevHoopPos) {
            const dx = newHoopPos.x - prevHoopPos.x;
            const dz = newHoopPos.z - prevHoopPos.z;
            const distanceToPrevious = Math.sqrt(dx * dx + dz * dz);
            console.log("Calculated distance:", { dx, dz, distanceToPrevious });
            if (distanceToPrevious < minDistanceToPrevious) {
                const dir = new THREE.Vector3(dx, 0, dz).normalize();
                newHoopPos.copy(prevHoopPos)
                    .addScaledVector(dir, minDistanceToPrevious);
                console.log("Adjusted position to enforce min distance:", { newHoopPos });
                newHoopPos.x = THREE.MathUtils.clamp(newHoopPos.x, minX, maxX);
                newHoopPos.z = THREE.MathUtils.clamp(newHoopPos.z, minZ, maxZ);
                newHoopPos.y = state.objects.hoop.height + state.environment.floorOffset;
            }
        }
    } else {
        // If there's no room boundary, place the hoop directly in front of the camera.
        const hoopOffset = new THREE.Vector3(0, 0, -2.5);
        hoopOffset.applyQuaternion(camera.quaternion);
        newHoopPos = camera.position.clone().add(hoopOffset);
        newHoopPos.y = state.objects.hoop.height + state.environment.floorOffset;
    }
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

