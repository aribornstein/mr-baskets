// src/gameplay/ballManager.js
import * as THREE from "three";
import * as RAPIER from "rapier"; // Import RAPIER
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";

const BALL_RADIUS = 0.12;
let ballMesh = null;
let ballRigidBody = null;

export function initBallManager(state) {
  // Listen for grab and release events from the input manager:
  state.onGrab = onGrab;
  state.onRelease = onRelease;

  // Create ball on first floor detection or initial game start.
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
  if (ballRigidBody && ballMesh) {
    const t = ballRigidBody.translation();
    ballMesh.position.set(t.x, t.y, t.z);
  }
}

function onGrab(event, controller) {
  if (!ballMesh) return;
  if (ballRigidBody) {
    getWorld().removeRigidBody(ballRigidBody);
    ballRigidBody = null;
  }
  controller.add(ballMesh);
  if (controller.userData.handedness === "left") {
    ballMesh.position.set(0.1, 0.0, -0.08);
  } else {
    ballMesh.position.set(-0.1, 0.0, -0.08);
  }
}

function onRelease(event, controller) {
  if (!ballMesh) return;
  ballMesh.updateMatrixWorld();
  const worldPos = new THREE.Vector3();
  ballMesh.getWorldPosition(worldPos);
  if (ballMesh.parent) ballMesh.parent.remove(ballMesh);
  const scene = getScene();
  scene.add(ballMesh);
  ballMesh.position.copy(worldPos);
  createBallPhysics(worldPos);
  const throwVelocity = controller.userData.velocity || new THREE.Vector3();
  ballRigidBody.setLinvel({ x: throwVelocity.x, y: throwVelocity.y, z: throwVelocity.z }, true);
}
