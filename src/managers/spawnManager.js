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
    const safeRadius = 3; // Safe radius around the player
    const minDistanceToPrevious = 2; // Minimum distance to the previous hoop

    if (state.environment.roomBoundary) {
        const roomMinX = state.environment.roomBoundary.min.x + state.objects.hoop.radius;
        const roomMaxX = state.environment.roomBoundary.max.x - state.objects.hoop.radius;
        const roomMinZ = state.environment.roomBoundary.min.z + state.objects.hoop.radius;
        const roomMaxZ = state.environment.roomBoundary.max.z - state.objects.hoop.radius;

        const cameraX = camera.position.x;
        const cameraZ = camera.position.z;

        let minX = Math.max(roomMinX, cameraX + safeRadius);
        let maxX = Math.min(roomMaxX, cameraX - safeRadius);
        let minZ = Math.max(roomMinZ, cameraZ + safeRadius);
        let maxZ = Math.min(roomMaxZ, cameraZ - safeRadius);

        // Ensure boundaries are valid
        if (minX > maxX) [minX, maxX] = [roomMinX, roomMaxX];
        if (minZ > maxZ) [minZ, maxZ] = [roomMinZ, roomMaxZ];

        // Divide the area into regions
        const numRegionsX = 3;
        const numRegionsZ = 3;
        const regionWidth = (maxX - minX) / numRegionsX;
        const regionHeight = (maxZ - minZ) / numRegionsZ;
        const numRegions = numRegionsX * numRegionsZ;

        const availableRegions = Array.from({ length: numRegions }, (_, i) => i).filter(
            (i) => i !== state.environment.previousRegionIndex
        );

        let regionIndex = availableRegions.length > 0
            ? availableRegions[Math.floor(Math.random() * availableRegions.length)]
            : state.environment.previousRegionIndex;

        state.environment.previousRegionIndex = regionIndex;

        // Determine region boundaries
        const regionX = regionIndex % numRegionsX;
        const regionZ = Math.floor(regionIndex / numRegionsX);
        const regionMinX = minX + regionX * regionWidth;
        const regionMaxX = regionMinX + regionWidth;
        const regionMinZ = minZ + regionZ * regionHeight;
        const regionMaxZ = regionMinZ + regionHeight;

        // Generate a new random position within the region
        let x = THREE.MathUtils.randFloat(regionMinX, regionMaxX);
        let z = THREE.MathUtils.randFloat(regionMinZ, regionMaxZ);

        newHoopPos.set(x, state.objects.hoop.height + state.environment.floorOffset, z);

        // Ensure the hoop is within the room bounds
        newHoopPos.x = THREE.MathUtils.clamp(newHoopPos.x, roomMinX, roomMaxX);
        newHoopPos.z = THREE.MathUtils.clamp(newHoopPos.z, roomMinZ, roomMaxZ);

        if (state.objects.hoop.pos) {
            const dx = newHoopPos.x - state.objects.hoop.pos.x;
            const dz = newHoopPos.z - state.objects.hoop.pos.z;
            const distanceToPrevious = Math.sqrt(dx * dx + dz * dz);

            console.log("Before adjustment:", { newHoopPos, dx, dz, distanceToPrevious });

            // Ensure new hoop is at least `minDistanceToPrevious` away from previous
            if (distanceToPrevious < minDistanceToPrevious) {
                let randomAngle = Math.random() * Math.PI * 2;
                let randomOffset = minDistanceToPrevious + Math.random() * minDistanceToPrevious;
                newHoopPos.x = state.objects.hoop.pos.x + randomOffset * Math.cos(randomAngle);
                newHoopPos.z = state.objects.hoop.pos.z + randomOffset * Math.sin(randomAngle);
            }
        }

        // Final clamping to keep the hoop inside the room
        newHoopPos.x = THREE.MathUtils.clamp(newHoopPos.x, roomMinX, roomMaxX);
        newHoopPos.z = THREE.MathUtils.clamp(newHoopPos.z, roomMinZ, roomMaxZ);

        // Store new hoop position in state
        state.objects.hoop.pos = newHoopPos.clone();
    } else {
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

