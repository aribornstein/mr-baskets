import * as THREE from "three";
import * as RAPIER from "rapier";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";
import { state } from "../managers/stateManager.js";
import { loadHoopModel } from "../effects/graphics.js";

let hoopMesh = null;
let sensor; // Global sensor collider reference
let sensorCooldown = false;
let initialHoopPos = null;
let hoopColliderRB = null;
let hoopColliders = []; // Track all colliders associated with the hoop

export function setInitialHoopPos(pos) {
  initialHoopPos = { x: pos.x, y: pos.y, z: pos.z };
}

/**
 * Loads the hoop model prefab, adds it to the scene, and creates colliders.
 */
export async function createHoopObject(pos) {
  console.log("Loading hoop prefab at:", pos);
  try {
    const world = getWorld();
    const hoopPrefab = await loadHoopModel(); // load prefab from graphics module

    // Scale the prefab
    hoopPrefab.scale.set(0.05, 0.05, 0.05);

    // Wrap in a group to allow unified transforms
    hoopMesh = new THREE.Group();
    hoopMesh.add(hoopPrefab);

    // Position and orient the prefab to face the camera
    hoopMesh.position.copy(pos);
    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.lookAt(getCamera().position);
    hoopMesh.quaternion.copy(dummy.quaternion);

    // Optional offset
    hoopMesh.translateZ(-0.1);

    addObject(hoopMesh);
    setInitialHoopPos(pos);

    // Update world matrix to include group transforms
    hoopMesh.updateMatrixWorld(true);

    // Create the compound collider (backboard + rim)
    createHoopCompoundCollider(hoopMesh);

    // Create the sensor for basket detection
    const sensorData = createHoopSensor(hoopMesh);
    if (sensorData) {
      sensor = sensorData.sensorCollider;
    }

  } catch (error) {
    console.error("Failed to load hoop prefab:", error);
  }
}


/**
 * Creates a compound collider for the hoop.
 * This function creates a cuboid collider for the backboard and a ring
 * of small cuboid colliders (arranged in a circle) for the rim.
 */
export function createHoopCompoundCollider(hoopPrefab) {
  const world = getWorld();
  hoopColliders = []; // Reset colliders list

  // Create a kinematic rigid body for the compound collider.
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  const rigidBody = world.createRigidBody(rigidBodyDesc);
  hoopColliderRB = rigidBody; // Store for later updates

  let backboardMesh = null;
  let netMesh = null;

  // Identify backboard and net meshes.
  hoopPrefab.traverse((child) => {
    if (child.isMesh) {
      const lowerName = child.name.toLowerCase();
      if (lowerName.includes("board")) {
        backboardMesh = child;
        console.log(`✅ Detected Backboard: ${child.name}`);
      } else if (lowerName.includes("net")) {
        netMesh = child;
        console.log(`✅ Detected Net: ${child.name}`);
      }
    }
  });

  if (!backboardMesh) {
    console.error("❌ Backboard not found! Check mesh names.");
    return;
  }
  if (!netMesh) {
    console.error("❌ Net not found! Check mesh names.");
    return;
  }

  // --- Backboard Collider ---
  backboardMesh.geometry.computeBoundingBox();
  const bboxBoard = backboardMesh.geometry.boundingBox;
  const boardWidth = (bboxBoard.max.x - bboxBoard.min.x) * backboardMesh.scale.x;
  const boardHeight = (bboxBoard.max.y - bboxBoard.min.y) * backboardMesh.scale.y;
  const boardDepth = 0.02; // Thin depth
  const backboardColliderDesc = RAPIER.ColliderDesc.cuboid(
    boardWidth / 2,
    boardHeight / 2,
    boardDepth / 2
  ).setTranslation(0, boardHeight / 2, 0);
  world.createCollider(backboardColliderDesc, rigidBody);
  hoopColliders.push({ rigidBody, collider: backboardColliderDesc });
  console.log(`🎯 Backboard Collider: Width ${boardWidth.toFixed(3)}, Height ${boardHeight.toFixed(3)}`);

  // --- Rim (Net Ring) Colliders ---
  netMesh.geometry.computeBoundingBox();
  const bboxNet = netMesh.geometry.boundingBox;
  const netWidth = (bboxNet.max.x - bboxNet.min.x) * netMesh.scale.x;
  const netDepth = (bboxNet.max.z - bboxNet.min.z) * netMesh.scale.z;
  // Estimate the rim opening as roughly circular.
  const ringRadius = (netWidth + netDepth) / 4; // half of average diameter
  const netTopY = bboxNet.max.y * netMesh.scale.y; // top of net
  
  // Parameters for the rim colliders.
  const ringThickness = 0.05;    // width of each small collider
  const ringColliderHeight = 0.02; // thickness in Y
  const numColliders = 8;          // number of colliders for the ring

  console.log(`🎯 Net Collider: netWidth ${netWidth.toFixed(3)}, netDepth ${netDepth.toFixed(3)}, ringRadius ${ringRadius.toFixed(3)}, netTopY ${netTopY.toFixed(3)}`);

  for (let i = 0; i < numColliders; i++) {
    const angle = (i / numColliders) * Math.PI * 2;
    const offsetX = ringRadius * Math.cos(angle);
    const offsetZ = ringRadius * Math.sin(angle);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      ringThickness / 2,        // half-width
      ringColliderHeight / 2,     // half-height
      ringThickness / 2         // half-depth
    ).setTranslation(offsetX, netTopY, offsetZ);
    world.createCollider(colliderDesc, rigidBody);
    hoopColliders.push({ rigidBody, collider: colliderDesc });
    console.log(`🛠️ Added Rim Collider #${i + 1} at offset: (${offsetX.toFixed(3)}, ${netTopY.toFixed(3)}, ${offsetZ.toFixed(3)})`);
  }

  console.log("✅ Compound collider created: Backboard + Rim Colliders");
  return { rigidBody };
}


/**
 * Creates a dedicated sensor inside the hoop opening.
 * This sensor triggers when the ball passes through from above.
 */
export function createHoopSensor(hoopPrefab) {
  const world = getWorld();

  let netMesh = null;
  hoopPrefab.traverse((child) => {
    if (child.isMesh && child.name.toLowerCase().includes("net")) {
      netMesh = child;
    }
  });
  if (!netMesh) {
    console.error("❌ Net mesh not found for sensor creation!");
    return;
  }

  netMesh.geometry.computeBoundingBox();
  const bboxNet = netMesh.geometry.boundingBox;
  const netWidth = (bboxNet.max.x - bboxNet.min.x) * netMesh.scale.x;
  const netDepth = (bboxNet.max.z - bboxNet.min.z) * netMesh.scale.z;
  // Sensor radius is 90% of the rim's computed radius.
  const sensorRadius = ((netWidth + netDepth) / 4) * 0.9;
  const netTopY = bboxNet.max.y * netMesh.scale.y;

  // Create a sensor collider – using a very thin cylinder.
  const sensorThickness = 0.0001;
  const sensorDesc = RAPIER.ColliderDesc.cylinder(sensorThickness, sensorRadius)
    .setSensor(true)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  // Store the sensor radius on the collider for later use.
  sensorDesc._sensorRadius = sensorRadius;
  
  // Use the hoop's current position for sensor placement.
  const hoopPos = hoopMesh ? hoopMesh.position : new THREE.Vector3();
  const sensorBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
    hoopPos.x, hoopPos.y + netTopY, hoopPos.z
  );
  const sensorBody = world.createRigidBody(sensorBodyDesc);
  const sensorCollider = world.createCollider(sensorDesc, sensorBody);

  console.log(`✅ Hoop Sensor created: sensorRadius ${sensorRadius.toFixed(3)}, positioned at Y offset ${netTopY.toFixed(3)}`);

  return { sensorBody, sensorCollider };
}


/**
 * Checks whether a basket has been made.
 * The sensor only triggers if the ball passes cleanly through from above.
 */
export function isBasket(collider1, collider2) {
  if (sensorCooldown) return false;

  // Check if one of the colliders is our sensor.
  if (collider1 === sensor || collider2 === sensor) {
    const ballCollider = collider1 === sensor ? collider2 : collider1;
    const ballBody = ballCollider.parent();

    if (ballBody) {
      const velocity = ballBody.linvel();

      // Only count as a basket if the ball is moving downward.
      if (velocity.y < 0) {
        // Check ball’s horizontal distance from the sensor center.
        const sensorPos = sensor.parent().translation();
        const ballPos = ballBody.translation();
        const horizontalDist = Math.hypot(ballPos.x - sensorPos.x, ballPos.z - sensorPos.z);
        
        // Use the stored sensor radius for comparison.
        const sensorRadius = sensor._sensorRadius || 0.1;
        if (horizontalDist < sensorRadius * 0.9) {
          sensorCooldown = true;
          setTimeout(() => {
            sensorCooldown = false;
          }, 500); // 500ms cooldown
          return true;
        }
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
  if (hoopColliderRB) {
    world.removeRigidBody(hoopColliderRB);
    hoopColliderRB = null;
  }
}


export function moveHoop(newPos) {
  if (!hoopMesh || !sensor || !hoopColliderRB) return;

  // Wake up the physics body.
  hoopColliderRB.wakeUp();

  // Move the Rapier rigid body.
  const colliderPos = new RAPIER.Vector3(newPos.x, newPos.y, newPos.z);
  hoopColliderRB.setNextKinematicTranslation(colliderPos);

  // Compute orientation so the hoop faces the camera.
  const hoopDummy = new THREE.Object3D();
  hoopDummy.position.copy(newPos);
  hoopDummy.lookAt(getCamera().position);
  const hoopMeshQuat = hoopDummy.quaternion.clone();

  hoopColliderRB.setNextKinematicRotation(
    new RAPIER.Quaternion(hoopMeshQuat.x, hoopMeshQuat.y, hoopMeshQuat.z, hoopMeshQuat.w)
  );

  // Sync the Three.js mesh.
  hoopMesh.position.copy(newPos);
  hoopMesh.quaternion.copy(hoopMeshQuat);
  hoopMesh.updateMatrixWorld();

  // Update the sensor's position.
  const sensorYOffset = -0.01;
  const sensorPos = new RAPIER.Vector3(newPos.x, newPos.y + sensorYOffset, newPos.z);
  const sensorBody = sensor.parent();
  if (sensorBody) {
    sensorBody.wakeUp();
    sensorBody.setNextKinematicTranslation(sensorPos);
  }
  
  console.log(hoopColliderRB.translation());
  console.log(hoopMesh.position);
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

  const levelMultiplier = Math.min(0.5 + (state.game.level - 1) * 0.05, 2);
  const freqMultiplier = Math.min(0.5 + (state.game.level - 1) * 0.05, 2);

  // Map axis movement flags.
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
      const allowedMin = base - minBound - radius;
      const allowedMax = maxBound - base - radius;
      maxAllowed = Math.min(movementAmplitude, allowedMin, allowedMax);
    }
    let effectiveAmplitude = maxAllowed * levelMultiplier;
    if (axis === "y") {
      effectiveAmplitude *= 0.1;
    }
    let offset = effectiveAmplitude * Math.sin(elapsedTime * movementFrequency * freqMultiplier * Math.PI * 2);
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
