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
    const safeRadius = 3; // Define a safe radius around the player
    const minDistanceToPrevious = 2; // Minimum distance to the previous hoop position

    // Generate a random position within the room boundaries, ensuring it's outside the safe radius
    if (state.environment.roomBoundary) {
        const roomMinX = state.environment.roomBoundary.min.x + state.objects.hoop.radius;
        const roomMaxX = state.environment.roomBoundary.max.x - state.objects.hoop.radius;
        const roomMinZ = state.environment.roomBoundary.min.z + state.objects.hoop.radius;
        const roomMaxZ = state.environment.roomBoundary.max.z - state.objects.hoop.radius;

        const cameraX = camera.position.x;
        const cameraZ = camera.position.z;

        let minX, maxX, minZ, maxZ;

        // Calculate valid X range
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

        // Ensure min < max for X and Z ranges
        if (minX > maxX) {
            [minX, maxX] = [maxX, minX]; // Swap values
        }
        if (minZ > maxZ) {
            [minZ, maxZ] = [maxZ, minZ]; // Swap values
        }

        // Clamp the ranges to ensure they are within the room boundaries
        minX = Math.max(minX, roomMinX);
        maxX = Math.min(maxX, roomMaxX);
        minZ = Math.max(minZ, roomMinZ);
        maxZ = Math.min(maxZ, roomMaxZ);

        // Divide the spawning area into regions
        const numRegionsX = 3; // Number of regions along the X axis
        const numRegionsZ = 3; // Number of regions along the Z axis

        // Calculate region dimensions
        const regionWidth = (maxX - minX) / numRegionsX;
        const regionHeight = (maxZ - minZ) / numRegionsZ;
        const numRegions = numRegionsX * numRegionsZ;

        // Create an array of available region indices
        const availableRegions = Array.from({ length: numRegions }, (_, i) => i).filter(
            (i) => i !== state.environment.previousRegionIndex
        );

        // Select a random region index from the available regions
        let regionIndex;
        if (availableRegions.length > 0) {
            regionIndex = availableRegions[Math.floor(Math.random() * availableRegions.length)];
        } else {
            // If no other regions are available, just use the previous region
            regionIndex = state.environment.previousRegionIndex;
        }

        // Update the previous region index
        state.environment.previousRegionIndex = regionIndex;

        // Calculate the region's boundaries
        const regionX = regionIndex % numRegionsX;
        const regionZ = Math.floor(regionIndex / numRegionsX);
        const regionMinX = minX + regionX * regionWidth;
        const regionMaxX = regionMinX + regionWidth;
        const regionMinZ = minZ + regionZ * regionHeight;
        const regionMaxZ = regionMinZ + regionHeight;

        // Generate random x and z within the selected region
        let x = THREE.MathUtils.randFloat(regionMinX, regionMaxX);
        let z = THREE.MathUtils.randFloat(regionMinZ, regionMaxZ);

        newHoopPos.set(x, state.objects.hoop.height + state.environment.floorOffset, z);

        // Clamp the new position to ensure it's within the room boundaries and outside the safe radius
        newHoopPos.x = THREE.MathUtils.clamp(newHoopPos.x, minX, maxX);
        newHoopPos.z = THREE.MathUtils.clamp(newHoopPos.z, minZ, maxZ);

        if (state.objects.hoop.pos) {
            const dx = newHoopPos.x - state.objects.hoop.pos.x;
            const dz = newHoopPos.z - state.objects.hoop.pos.z;
            const distanceToPrevious = Math.sqrt(dx * dx + dz * dz);
            console.log("Before adjustment:", { dx, dz, distanceToPrevious });

            if (distanceToPrevious < minDistanceToPrevious) {
                const angle = Math.atan2(dz, dx);
                newHoopPos.x = state.objects.hoop.pos.x + minDistanceToPrevious * Math.cos(angle);
                newHoopPos.z = state.objects.hoop.pos.z + minDistanceToPrevious * Math.sin(angle);
                console.log("After offset:", { newHoopPos });

                newHoopPos.x = THREE.MathUtils.clamp(newHoopPos.x, minX, maxX);
                newHoopPos.z = THREE.MathUtils.clamp(newHoopPos.z, minZ, maxZ);
                console.log("After clamping:", { newHoopPos });
            }
        }
    } else {
        // If no room boundary, default to a position in front of the camera
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

