// src/gameplay/ballManager.js
import * as THREE from "three";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld, createGroundPhysics } from "../core/physics.js";
import { addObject, removeObject } from "../managers/sceneManager.js";

const BALL_RADIUS = 0.12;
let ballMesh = null;
let ballRigidBody = null;

export function initBallManager(state) {
  // Listen for grab and release events from the input manager:
  state.onGrab = onGrab;
  state.onRelease = onRelease;

  // Create ball on first floor detection or initial game start.
  // For example, wait until state.floorOffset is set:
  if (!state.ballAndHoopCreated && state.floorOffset !== undefined) {
    const ballPos = getInitialBallPosition(state);
    createBallVisual(ballPos);
    createBallPhysics(ballPos);
    state.ballAndHoopCreated = true;
  }
}

function getInitialBallPosition(state) {
  const camera = getCamera();
  const ballOffset = new THREE.Vector3(0, 0, -1);
  ballOffset.applyQuaternion(camera.quaternion);
  const pos = camera.position.clone().add(ballOffset);
  pos.y = BALL_RADIUS + state.floorOffset;
  // Clamp to room boundary if defined...
  return pos;
}

function createBallVisual(pos) {
  const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
  ballMesh = new THREE.Mesh(geometry, material);
  ballMesh.position.copy(pos);
  addObject(ballMesh);
}

function createBallPhysics(pos) {
  const world = getWorld();
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
  ballRigidBody = world.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.ball(BALL_RADIUS)
    .setRestitution(0.7)
    .setFriction(0.7);
  world.createCollider(colliderDesc, ballRigidBody);
}

export function updateBall() {
  // If the ball is not held, sync the visual to the physics body
  if (ballRigidBody && ballMesh) {
    const t = ballRigidBody.translation();
    ballMesh.position.set(t.x, t.y, t.z);
    // Optionally update rotation...
  }
  // Implement clamping logic if necessary.
}

function onGrab(event, controller) {
  if (!ballMesh) return;
  // Remove physics body when grabbed
  if (ballRigidBody) {
    getWorld().removeRigidBody(ballRigidBody);
    ballRigidBody = null;
  }
  // Attach ball to controller
  controller.add(ballMesh);
  // Position relative to controller
  if (controller.userData.handedness === "left") {
    ballMesh.position.set(0.1, 0.0, -0.08);
  } else {
    ballMesh.position.set(-0.1, 0.0, -0.08);
  }
}

function onRelease(event, controller) {
  if (!ballMesh) return;
  // Detach from controller and re-add to scene
  ballMesh.updateMatrixWorld();
  const worldPos = new THREE.Vector3();
  ballMesh.getWorldPosition(worldPos);
  if (ballMesh.parent) ballMesh.parent.remove(ballMesh);
  // Re-add to scene
  const scene = getScene();
  scene.add(ballMesh);
  ballMesh.position.copy(worldPos);
  // Recreate physics body
  createBallPhysics(worldPos);
  // Apply throw velocity from controller data (if available)
  const throwVelocity = controller.userData.velocity || new THREE.Vector3();
  ballRigidBody.setLinvel({ x: throwVelocity.x, y: throwVelocity.y, z: throwVelocity.z }, true);
}
