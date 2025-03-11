import * as THREE from "three";
import * as RAPIER from "rapier";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";
import { state } from "../managers/stateManager.js";
import { loadHoopModel } from "../effects/graphics.js";

let hoopMesh = null;
let sensor;
let sensorCooldown = false;
let initialHoopPos = null;
let hoopColliderRB = null;

let hoopColliders = []; // Track all colliders associated with the hoop

export function setInitialHoopPos(pos) {
  initialHoopPos = { x: pos.x, y: pos.y, z: pos.z };
}

/**
 * Loads the hoop model prefab and adds it to the scene.
 * This replaces both the hoop ring and backboard visuals.
 */
export async function createHoopObject(pos) {
  console.log("Loading hoop prefab at:", pos);
  try {
    const world = getWorld();
    const hoopPrefab = await loadHoopModel(); // load prefab from graphics module
    // Scale the prefab
    hoopPrefab.scale.set(0.05, 0.05, 0.05);
    // createHoopCollider(hoopPrefab);
    // Wrap in a group to allow unified transforms
    hoopMesh = new THREE.Group();
    hoopMesh.add(hoopPrefab);

    // Position and orient the prefab to face the camera
    hoopMesh.position.copy(pos);
    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.lookAt(getCamera().position);
    hoopMesh.quaternion.copy(dummy.quaternion);

    // (Optional) Apply any offsets if desired
    hoopMesh.translateZ(-0.1);

    addObject(hoopMesh);
    setInitialHoopPos(pos);

    // Update the world matrix to include group transforms
    hoopMesh.updateMatrixWorld(true);

    // Now create the collider using hoopMesh rather than the raw prefab
    createHoopCollider(hoopMesh);

    // Create sensor for basket detection
    const sensorThickness = 0.0001; // Extremely thin sensor
    const sensorYOffset = -0.01; // Slightly below the hoop center

    const sensorDesc = RAPIER.ColliderDesc.cylinder(
      sensorThickness,
      state.objects.hoop.radius * 0.9
    )
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    sensorDesc.setRotation({
      x: hoopMesh.quaternion.x,
      y: hoopMesh.quaternion.y,
      z: hoopMesh.quaternion.z,
      w: hoopMesh.quaternion.w,
    });

    const sensorBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      pos.x,
      pos.y + sensorYOffset,
      pos.z
    );
    const sensorBody = world.createRigidBody(sensorBodyDesc);
    sensor = world.createCollider(sensorDesc, sensorBody);

  } catch (error) {
    console.error("Failed to load hoop prefab:", error);
  }

}
export function createNetRingCollider(hoopPrefab) {
  const world = getWorld();

  // Find the net mesh (assuming its name contains "net")
  let netMesh = null;
  hoopPrefab.traverse((child) => {
    if (child.isMesh && child.name.toLowerCase().includes("net")) {
      netMesh = child;
    }
  });

  if (!netMesh) {
    console.error("Net mesh not found in hoopPrefab!");
    return;
  }

  // Ensure the net has an up-to-date bounding box.
  netMesh.geometry.computeBoundingBox();
  const bbox = netMesh.geometry.boundingBox;

  // Determine the net dimensions.
  const netWidth = bbox.max.x - bbox.min.x;
  const netDepth = bbox.max.z - bbox.min.z;
  // For a roughly circular net opening, take the average of width and depth to compute the ring radius.
  const ringRadius = (netWidth + netDepth) / 4;
  // Assume the top of the net is at bbox.max.y (relative to the net mesh local coordinates)
  const netTopY = bbox.max.y;

  // Parameters for the ring collider.
  const ringThickness = 0.05;    // How wide the ring is (collider width)
  const ringColliderHeight = 0.02; // Collider thickness in the Y-axis

  console.log(`Net dimensions: width ${netWidth.toFixed(3)}, depth ${netDepth.toFixed(3)}, computed ring radius: ${ringRadius.toFixed(3)}, net top Y: ${netTopY.toFixed(3)}`);

  // Create a kinematic rigid body for the ring collider.
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  const ringRigidBody = world.createRigidBody(rigidBodyDesc);

  // Create several small cuboid colliders arranged in a circle to form the ring.
  const numColliders = 8; // Increase for a smoother ring
  for (let i = 0; i < numColliders; i++) {
    const angle = (i / numColliders) * Math.PI * 2;
    const offsetX = ringRadius * Math.cos(angle);
    const offsetZ = ringRadius * Math.sin(angle);
    // Create a small cuboid collider.
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      ringThickness / 2,      // half-width
      ringColliderHeight / 2,   // half-height
      ringThickness / 2       // half-depth
    ).setTranslation(offsetX, netTopY, offsetZ);
    world.createCollider(colliderDesc, ringRigidBody);

    console.log(`Added ring collider #${i+1} at offset: (${offsetX.toFixed(3)}, ${netTopY.toFixed(3)}, ${offsetZ.toFixed(3)})`);
  }

  // Optionally, store ringRigidBody for later updates (e.g., if you want the net to move).
  return ringRigidBody;
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
  if (hoopMesh) {
    getScene().remove(hoopMesh);
    hoopMesh = null;
  }
  if (sensor) {
    world.removeCollider(sensor);
    sensor = null;
  }
  // Also remove the hoop collider rigid body
  if (hoopColliderRB) {
    world.removeRigidBody(hoopColliderRB);
    hoopColliderRB = null;
  }
}

export function moveHoop(newPos) {
  if (!hoopMesh || !sensor || !hoopColliderRB) return;

  // Ensure the physics body is active
  hoopColliderRB.wakeUp();

  // Move the Rapier body
  const colliderPos = new RAPIER.Vector3(newPos.x, newPos.y, newPos.z);
  hoopColliderRB.setNextKinematicTranslation(colliderPos);

  // Compute quaternion to face the camera
  const hoopDummy = new THREE.Object3D();
  hoopDummy.position.copy(newPos);
  hoopDummy.lookAt(getCamera().position);
  const hoopMeshQuat = hoopDummy.quaternion.clone();

  hoopColliderRB.setNextKinematicRotation(
    new RAPIER.Quaternion(hoopMeshQuat.x, hoopMeshQuat.y, hoopMeshQuat.z, hoopMeshQuat.w)
  );

  // ✅ Sync the Three.js mesh
  hoopMesh.position.copy(newPos);
  hoopMesh.quaternion.copy(hoopMeshQuat);
  hoopMesh.updateMatrixWorld();

  // ✅ Update the sensor position
  const sensorYOffset = -0.01;
  const sensorPos = new RAPIER.Vector3(newPos.x, newPos.y + sensorYOffset, newPos.z);
  const sensorBody = sensor.parent();
  if (sensorBody) {
    sensorBody.wakeUp();
    sensorBody.setNextKinematicTranslation(sensorPos);
  }
  
  console.log(hoopColliderRB.translation()); // Ensure Rapier is actually moving it
  console.log(hoopMesh.position); // Ensure Three.js follows it

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
    let offset = effectiveAmplitude * Math.sin(elapsedTime * movementFrequency * freqMultiplier * Math.PI * 2);

    // Clamp the new position to stay within the allowed bounds
    let minPos = initialHoopPos[axis] - maxAllowed;
    let maxPos = initialHoopPos[axis] + maxAllowed;
    if (roomBoundary) {
      minPos = Math.max(minPos, roomBoundary.min[axis] + radius);
      maxPos = Math.min(maxPos, roomBoundary.max[axis] - radius);
    }
    offset = Math.max(Math.min(offset, maxPos - base), minPos - base);

    newPos[axis] = base + offset;
  });

  moveHoop(newPos);
}