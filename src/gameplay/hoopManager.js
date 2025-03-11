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
export function createHoopCollider(hoopPrefab) {
  const world = getWorld();
  hoopColliders = []; // Reset colliders list

  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  const rigidBody = world.createRigidBody(rigidBodyDesc);
  hoopColliderRB = rigidBody; // Store the main rigid body

  let torusMesh = null;
  let backboardMesh = null;

  // 🔍 Traverse all meshes to find the rim and backboard dynamically
  hoopPrefab.traverse((child) => {
    if (child.isMesh) {
      child.geometry.computeBoundingBox();
      const bbox = child.geometry.boundingBox;
      const width = bbox.max.x - bbox.min.x;
      const height = bbox.max.y - bbox.min.y;
      const depth = bbox.max.z - bbox.min.z;

      // 🔎 Detect the rim (large width, small height)
      if (width > height * 3 && width > depth * 3) {
        torusMesh = child;
      }

      // 🔎 Detect the backboard (flat vertical rectangle)
      if (height > width * 1.5 && depth < 0.1) {
        backboardMesh = child;
      }

      console.log(`Found mesh: ${child.name} | Size: (${width}, ${height}, ${depth})`);
    }
  });

  if (!torusMesh || !backboardMesh) {
    console.error("Could not find hoop components! Check the model structure.");
    return;
  }

  // 🏀 Extract rim dimensions
  const torusGeometry = torusMesh.geometry;
  const radius = (torusMesh.scale.x + torusMesh.scale.y) / 2; // Average scale for uniform scaling
  const tubeRadius = radius * 0.1; // Assume tube radius is 10% of the main radius
  const height = tubeRadius * 2; // Cylinder height matches tube thickness

  console.log("Detected Rim - Radius:", radius, "Tube Radius:", tubeRadius);

  // 🔧 Create 4 cylinder colliders to approximate the rim
  const offsets = [
    { x: radius, y: 0, z: 0 },
    { x: -radius, y: 0, z: 0 },
    { x: 0, y: 0, z: radius },
    { x: 0, y: 0, z: -radius },
  ];

  offsets.forEach((offset) => {
    const colliderDesc = RAPIER.ColliderDesc.cylinder(height, tubeRadius)
      .setTranslation(offset.x, offset.y, offset.z);
    const collider = world.createCollider(colliderDesc, rigidBody);
    hoopColliders.push({ rigidBody, collider });
  });

  // 🏀 Create a box collider for the backboard
  backboardMesh.geometry.computeBoundingBox();
  const bbox = backboardMesh.geometry.boundingBox;
  const backboardWidth = bbox.max.x - bbox.min.x;
  const backboardHeight = bbox.max.y - bbox.min.y;
  const backboardDepth = 0.02; // Thin depth

  console.log("Detected Backboard - Width:", backboardWidth, "Height:", backboardHeight);

  const backboardColliderDesc = RAPIER.ColliderDesc.cuboid(
    backboardWidth / 2,
    backboardHeight / 2,
    backboardDepth / 2
  ).setTranslation(0, backboardHeight / 2, -radius); // Position behind hoop

  world.createCollider(backboardColliderDesc, rigidBody);
  hoopColliders.push({ rigidBody, collider: backboardColliderDesc });

  console.log("Colliders Created: Rim + Backboard");

  return { rigidBody };
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