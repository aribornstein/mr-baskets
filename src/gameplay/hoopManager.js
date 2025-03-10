import * as THREE from "three";
import * as RAPIER from "rapier";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";
import { state } from "../managers/stateManager.js";
import { loadHoopModel } from "../effects/graphics.js";

let backboardMesh = null;
let sensor;
let sensorCooldown = false;
let initialHoopPos = null;

export function setInitialHoopPos(pos) {
  initialHoopPos = { x: pos.x, y: pos.y, z: pos.z };
}

/**
 * Loads the hoop model prefab and adds it to the scene.
 * This replaces both the hoop ring and backboard visuals.
 */
export async function createHoopVisual(pos) {
  console.log("Loading hoop prefab at:", pos);
  try {
    const hoopPrefab = await loadHoopModel(); // load prefab from graphics module
    // Scale the prefab
    hoopPrefab.scale.set(0.05, 0.05, 0.05);
    // Wrap in a group to allow unified transforms
    backboardMesh = new THREE.Group();
    backboardMesh.add(hoopPrefab);

    // Position and orient the prefab to face the camera
    backboardMesh.position.copy(pos);
    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.lookAt(getCamera().position);
    backboardMesh.quaternion.copy(dummy.quaternion);

    // (Optional) Apply any offsets if desired
    backboardMesh.translateZ(-0.1);
    backboardMesh.translateY(0.1);

    addObject(backboardMesh);
  } catch (error) {
    console.error("Failed to load hoop prefab:", error);
  }
}

/**
 * Creates the physics for the hoop.
 *
 * The hoop model now contains the hoop ring and backboard colliders/geometry,
 * so we remove their separate physics colliders.
 * Only the sensor for basket detection is created here.
 */
export function createHoopPhysics(pos) {
  const world = getWorld();
  setInitialHoopPos(pos);

  // Create sensor for basket detection
  const sensorThickness = 0.0001; // Extremely thin sensor
  const sensorYOffset = -0.01; // Slightly below the hoop center

  // Determine orientation to match the hoop model (so sensor rotates with it)
  const dummy = new THREE.Object3D();
  dummy.position.copy(pos);
  dummy.lookAt(getCamera().position);
  const hoopQuat = dummy.quaternion.clone();

  const sensorDesc = RAPIER.ColliderDesc.cylinder(
    sensorThickness,
    state.objects.hoop.radius * 0.9
  )
    .setSensor(true)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  sensorDesc.setRotation({
    x: hoopQuat.x,
    y: hoopQuat.y,
    z: hoopQuat.z,
    w: hoopQuat.w,
  });

  const sensorBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
    pos.x,
    pos.y + sensorYOffset,
    pos.z
  );
  const sensorBody = world.createRigidBody(sensorBodyDesc);
  sensor = world.createCollider(sensorDesc, sensorBody);
}

export function isBasket(collider1, collider2) {
  if (sensorCooldown) return false;
  
  // Check if one of the colliders is our sensor
  if (collider1 === sensor || collider2 === sensor) {
    // Determine which collider is the ball
    const ballCollider = collider1 === sensor ? collider2 : collider1;
    const ballBody = ballCollider.parent();
    
    // Get the ball's velocity
    if (ballBody) {
      const velocity = ballBody.linvel();
      
      // Only count as a basket if the ball is moving downward (y velocity is negative)
      // This ensures the ball came from above the hoop
      if (velocity.y < 0) {
        // Start the cooldown
        sensorCooldown = true;
        setTimeout(() => {
          sensorCooldown = false;
        }, 500); // Cooldown for 500 milliseconds
        
        return true;
      }
    }
  }
  
  return false;
}

export function removeHoop() {
    const world = getWorld();
    if (backboardMesh) {
        getScene().remove(backboardMesh);
        backboardMesh = null;
    }
    if (sensor){
        world.removeCollider(sensor);
        sensor = null;
    }
}

export function reorientHoop(pos) {
    if (!backboardMesh) return;

    const backboardDummy = new THREE.Object3D();
    backboardDummy.position.copy(pos);
    backboardDummy.lookAt(getCamera().position);
    backboardMesh.quaternion.copy(backboardDummy.quaternion);
}

export function moveHoop(newPos) {
    if (!backboardMesh || !sensor) return;

    // Update visual position
    backboardMesh.position.copy(newPos);

    // Calculate proper orientation to face camera (same as in createHoopPhysics)
    const dummy = new THREE.Object3D();
    dummy.position.copy(newPos);
    dummy.lookAt(getCamera().position);
    const correction = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const hoopQuat = dummy.quaternion.clone().multiply(correction);

    // Update sensor position and orientation using setNextKinematicTranslation
    const sensorYOffset = -0.01;
    const sensorPos = new RAPIER.Vector3(newPos.x, newPos.y + sensorYOffset, newPos.z);
    const sensorBody = sensor.parent();
    if (sensorBody) {
        sensorBody.setNextKinematicTranslation(sensorPos);
        sensorBody.setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w });
    }

    // Update backboard orientation
    const backboardDummy = new THREE.Object3D();
    backboardDummy.position.copy(newPos);
    backboardDummy.lookAt(getCamera().position);
    backboardMesh.quaternion.copy(backboardDummy.quaternion);

    // Re-apply any needed offsets to visual elements
    backboardMesh.position.copy(newPos);
    backboardMesh.updateMatrix();
    backboardMesh.updateMatrixWorld();
}

export function updateHoopMovement() {
  if (!initialHoopPos) return;

  const {
    moveLeftAndRight,
    moveUpAndDown,
    moveBackAndForth,
    movementAmplitude,
    movementFrequency,
    radius,
  } = state.objects.hoop;
  if (!(moveLeftAndRight || moveUpAndDown || moveBackAndForth)) return;

  const elapsedTime = performance.now() / 1000;
  const newPos = { ...initialHoopPos };
  const roomBoundary = state.environment.roomBoundary;

  // Define level-based multipliers so that initial movement is only 30%
  // and then gradually increases with each level (capped at 1).
  const levelMultiplier = Math.min(0.5 + (state.game.level - 1) * 0.05, 2);
  const freqMultiplier = Math.min(0.5 + (state.game.level - 1) * 0.05, 2);
  

  // Map axis keys to their movement flags.
  const axes = {
    x: moveLeftAndRight,
    y: moveUpAndDown,
    z: moveBackAndForth,
  };

  Object.entries(axes).forEach(([axis, shouldMove]) => {
    if (!shouldMove) return;

    const base = initialHoopPos[axis];
    let maxAllowed = movementAmplitude;
    if (roomBoundary) {
      const minBound = roomBoundary.min[axis];
      const maxBound = roomBoundary.max[axis];
      // Use hoop radius as a buffer on both sides.
      const allowedMin = base - minBound - radius;
      const allowedMax = maxBound - base - radius;
      maxAllowed = Math.min(movementAmplitude, allowedMin, allowedMax);
    }

    // Apply level multiplier to amplitude and frequency.
    let effectiveAmplitude = maxAllowed * levelMultiplier;
    if (axis === "y") {
      effectiveAmplitude *= 0.1; // Reduce vertical movement
    }
    const offset = effectiveAmplitude * Math.sin(elapsedTime * movementFrequency * freqMultiplier * Math.PI * 2);
    newPos[axis] = base + offset;
  });

  moveHoop(newPos);
}