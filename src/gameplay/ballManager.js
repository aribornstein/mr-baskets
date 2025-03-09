// src/gameplay/ballManager.js
import * as THREE from "three";
import * as RAPIER from "rapier";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";
import { state } from "../managers/stateManager.js";
import { loadBasketballModel } from "../effects/graphics.js";

let basketballMesh = null;
let ballRigidBody = null, ballCollider = null;

export function createBallPhysics(pos) {
  const world = getWorld();
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                  .setCcdEnabled(true)
                  .setTranslation(pos.x, pos.y, pos.z)
                  
  ballRigidBody = world.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.ball(state.objects.ball.radius)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS) 
    .setRestitution(0.7)
    .setFriction(0.7)
    
  ballCollider = world.createCollider(colliderDesc, ballRigidBody);
  ballCollider.userData = "ball";
}

export function createBallVisual(pos) {
  loadBasketballModel()
    .then(basketball => {
      basketballMesh = basketball;
      basketballMesh.scale.set(state.objects.ball.radius * 2.0, state.objects.ball.radius * 2.0, state.objects.ball.radius * 2.0); // Adjust scale if necessary
      basketballMesh.position.copy(pos);
      addObject(basketballMesh);
    })
    .catch(error => {
      console.error("Failed to load basketball model:", error);
      // Fallback to sphere geometry if loading fails
      const geometry = new THREE.SphereGeometry(state.objects.ball.radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
      basketballMesh = new THREE.Mesh(geometry, material);
      basketballMesh.position.copy(pos);
      addObject(basketballMesh);
    });
}

export function updateBall(delta, roomBoundary) {
  if (ballRigidBody && basketballMesh) {
    const t = ballRigidBody.translation();
    basketballMesh.position.set(t.x, t.y, t.z);
    const r = ballRigidBody.rotation();
    basketballMesh.quaternion.set(r.x, r.y, r.z, r.w);
    clampBallPosition(roomBoundary);
  }
}

function clampBallPosition(roomBoundary) {
  if (ballRigidBody && roomBoundary) {
    const t = ballRigidBody.translation();
    const clampedX = THREE.MathUtils.clamp(t.x, roomBoundary.min.x + state.objects.ball.radius, roomBoundary.max.x - state.objects.ball.radius);
    const clampedZ = THREE.MathUtils.clamp(t.z, roomBoundary.min.z + state.objects.ball.radius, roomBoundary.max.z - state.objects.ball.radius);
    if (t.x !== clampedX || t.z !== clampedZ) {
      ballRigidBody.setTranslation({ x: clampedX, y: t.y, z: clampedZ }, true);
      ballRigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }
}

export function registerBallInput(state) {
  // Register onGrab and onRelease callbacks for controller events
  state.callbacks.onGrab = onGrab;
  state.callbacks.onRelease = onRelease;
}

function onGrab(event, controller) {
  if (!basketballMesh) {
    console.warn("No basketballMesh available to grab.");
    return;
  }
  if (!state.objects.ball.isHeld) {
    if (ballCollider){
      getWorld().removeCollider(ballCollider);
      ballCollider = null;
    }
    if (ballRigidBody) {
      getWorld().removeRigidBody(ballRigidBody);
      ballRigidBody = null;
    }
    if (basketballMesh.parent) {
      basketballMesh.parent.remove(basketballMesh);
    }
    controller.add(basketballMesh);
    if (controller.userData.handedness === "left") {
      basketballMesh.position.set(0.1, 0.0, -0.08);
    } else {
      basketballMesh.position.set(-0.1, 0.0, -0.08);
    }
    state.objects.ball.isHeld = true;
  } else {
    const currentHolder = basketballMesh.parent;
    if (currentHolder !== controller) {
      if (currentHolder) currentHolder.remove(basketballMesh);
      controller.add(basketballMesh);
      if (controller.userData.handedness === "left") {
        basketballMesh.position.set(0.1, 0.0, -0.08);
      } else {
        basketballMesh.position.set(-0.1, 0.0, -0.08);
      }
    }
  }
}

function onRelease(event, controller) {
  if (!basketballMesh) {
    console.warn("No basketballMesh available to release.");
    return;
  }
  if (state.objects.ball.isHeld) {
    state.objects.ball.isHeld = false;
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
    // Register a shot attempt only if the throw's magnitude exceeds 0.5
    if (throwVelocity.length() > 0.5) {
      state.game.shotAttempt = true;
    } else {
      state.game.shotAttempt = false;
    }
    ballRigidBody.setLinvel({ x: throwVelocity.x, y: throwVelocity.y, z: throwVelocity.z }, true);
  }
}

export function removeBall() {
  const world = getWorld();
  if (basketballMesh) {
    if (state.objects.ball.isHeld) {
      // If the ball is held, remove it from the controller first
      if (basketballMesh.parent) {
        basketballMesh.parent.remove(basketballMesh);
      }
      state.objects.ball.isHeld = false; // Update the state
    }
    getScene().remove(basketballMesh);
    basketballMesh = null;
  }
  if (ballCollider){
    world.removeCollider(ballCollider);
    ballCollider = null;
  }
  if (ballRigidBody) {
    world.removeRigidBody(ballRigidBody);
    ballRigidBody = null;
  }
}

export function getBallMesh() {
  return basketballMesh;
}