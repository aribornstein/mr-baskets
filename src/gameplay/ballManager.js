// src/gameplay/ballManager.js
import * as THREE from "three";
import * as RAPIER from "rapier";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";
import { state } from "../managers/stateManager.js";

let basketballMesh = null;
let ballRigidBody = null, ballCollider = null;

// Initialize Rapier Physics
async function initializePhysics() {
  await RAPIER.init();
}
initializePhysics();

export function createBallPhysics(pos) {
  const world = getWorld();
  if (ballRigidBody) {
    world.removeCollider(ballCollider);
    world.removeRigidBody(ballRigidBody);
  }

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
  ballRigidBody = world.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.ball(state.BALL_RADIUS)
    .setRestitution(0.7)
    .setFriction(0.7);
  ballCollider = world.createCollider(colliderDesc, ballRigidBody);
}

export function createBallVisual(pos) {
  const geometry = new THREE.SphereGeometry(state.BALL_RADIUS, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
  basketballMesh = new THREE.Mesh(geometry, material);
  basketballMesh.position.copy(pos);
  addObject(basketballMesh);
}

export function updateBall(delta, roomBoundary) {
  if (ballRigidBody && basketballMesh) {
    const t = ballRigidBody.translation();
    basketballMesh.position.set(t.x, t.y, t.z);
    
    const r = ballRigidBody.rotation();
    basketballMesh.quaternion.set(r.x || 0, r.y || 0, r.z || 0, r.w || 1);

    clampBallPosition(roomBoundary);
  }
}

function clampBallPosition(roomBoundary) {
  if (!roomBoundary || !roomBoundary.min || !roomBoundary.max || !ballRigidBody) return;
  
  const t = ballRigidBody.translation();
  const clampedX = THREE.MathUtils.clamp(t.x, roomBoundary.min.x + state.BALL_RADIUS, roomBoundary.max.x - state.BALL_RADIUS);
  const clampedZ = THREE.MathUtils.clamp(t.z, roomBoundary.min.z + state.BALL_RADIUS, roomBoundary.max.z - state.BALL_RADIUS);

  if (t.x !== clampedX || t.z !== clampedZ) {
    ballRigidBody.setTranslation(new RAPIER.Vector3(clampedX, t.y, clampedZ), true);
    ballRigidBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
  }
}

export function registerBallInput(state) {
  const prevOnGrab = state.onGrab;
  const prevOnRelease = state.onRelease;

  state.onGrab = (event, controller) => {
    if (prevOnGrab) prevOnGrab(event, controller);
    onGrab(event, controller);
  };

  state.onRelease = (event, controller) => {
    if (prevOnRelease) prevOnRelease(event, controller);
    onRelease(event, controller);
  };
}

function onGrab(event, controller) {
  if (!basketballMesh) {
    console.warn("No basketballMesh available to grab.");
    return;
  }
  if (!state.isHoldingBall) {
    if (ballRigidBody) {
      getWorld().removeCollider(ballCollider);
      getWorld().removeRigidBody(ballRigidBody);
      ballRigidBody = null;
      ballCollider = null;
    }
    if (basketballMesh.parent) {
      basketballMesh.parent.remove(basketballMesh);
    }
    controller.add(basketballMesh);
    const worldPos = new THREE.Vector3();
    controller.getWorldPosition(worldPos);
    basketballMesh.position.copy(worldPos);
    state.isHoldingBall = true;
  }
}

function onRelease(event, controller) {
  if (!basketballMesh) {
    console.warn("No basketballMesh available to release.");
    return;
  }
  if (state.isHoldingBall) {
    state.isHoldingBall = false;
    basketballMesh.updateMatrixWorld();
    const worldPos = new THREE.Vector3();
    basketballMesh.getWorldPosition(worldPos);
    if (basketballMesh.parent) {
      basketballMesh.parent.remove(basketballMesh);
    }
    getScene().add(basketballMesh);
    basketballMesh.position.copy(worldPos);
    createBallPhysics({ x: worldPos.x, y: worldPos.y, z: worldPos.z });
    const throwVelocity = controller.userData.velocity || new THREE.Vector3();
    ballRigidBody.setLinvel(new RAPIER.Vector3(throwVelocity.x, throwVelocity.y, throwVelocity.z), true);
  }
}
