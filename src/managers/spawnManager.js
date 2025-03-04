// src/managers/spawnManager.js
import * as THREE from "three";
import { getCamera } from "../core/engine.js";
import { createBallPhysics, createBallVisual, removeBall } from "../gameplay/ballManager.js";
import { createHoopPhysics, createHoopVisual, removeHoop, moveHoop } from "../gameplay/hoopManager.js";

function createBall(state) {
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
    return ballPos;
}

function createHoop(state) {
    const camera = getCamera();
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
    return hoopPos
}

function findNewHoopPosition(state) {
    const camera = getCamera();
    let newHoopPos = new THREE.Vector3();

    // Generate a random position within the room boundaries
    if (state.roomBoundary) {
        const x = THREE.MathUtils.randFloat(state.roomBoundary.min.x + state.HOOP_RADIUS, state.roomBoundary.max.x - state.HOOP_RADIUS);
        const z = THREE.MathUtils.randFloat(state.roomBoundary.min.z + state.HOOP_RADIUS, state.roomBoundary.max.z - state.HOOP_RADIUS);
        newHoopPos.set(x, state.HOOP_HEIGHT + state.floorOffset, z);
    } else {
        // If no room boundary, default to a position in front of the camera
        const hoopOffset = new THREE.Vector3(0, 0, -2.5);
        hoopOffset.applyQuaternion(camera.quaternion);
        newHoopPos = camera.position.clone().add(hoopOffset);
        newHoopPos.y = state.HOOP_HEIGHT + state.floorOffset;
    }

    return newHoopPos;
}

export function moveHoopToNewPosition(state, delay = 500) {
    const newHoopPos = findNewHoopPosition(state);
    // Wait for the specified delay before moving the hoop
    setTimeout(() => {
        moveHoop(newHoopPos);
        console.log("Hoop moved to a new position within room bounds.");
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
    state.ballCreated = false;
    state.hoopCreated = false;
    console.log("Ball and hoop removed.");
}

