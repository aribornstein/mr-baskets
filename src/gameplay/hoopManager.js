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
    const hoopPrefab = await loadHoopModel(); // load prefab from graphics module
    // Scale the prefab
    hoopPrefab.scale.set(0.05, 0.05, 0.05);
    createHoopCollider(hoopPrefab);
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
    hoopMesh.translateY(0.1);

    addObject(hoopMesh);
    setInitialHoopPos(pos);

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
      x: hoopMesh.x,
      y: hoopMesh.y,
      z: hoopMesh.z,
      w: hoopMesh.w,
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

  let vertices = [];
  let indices = [];

  // Traverse the hoopPrefab to extract mesh data for a trimesh collider
  hoopPrefab.traverse((child) => {
    if (child.isMesh) {
      const geometry = child.geometry;
      const positionAttribute = geometry.attributes.position;

      // Extract vertices from the mesh
      for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        vertices.push(vertex.x, vertex.y, vertex.z);
      }

      // Extract indices, or create them if they don't exist
      if (geometry.index) {
        for (let i = 0; i < geometry.index.count; i++) {
          indices.push(geometry.index.getX(i));
        }
      } else {
        for (let i = 0; i < positionAttribute.count; i++) {
          indices.push(i);
        }
      }
    }
  });

  // Convert arrays to TypedArrays required by RAPIER
  const verticesArray = new Float32Array(vertices);
  const indicesArray = new Uint32Array(indices);

  // Create a kinematic rigid body in the physics world
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  // Create a trimesh collider descriptor from the vertex and index data
  const colliderDesc = RAPIER.ColliderDesc.trimesh(verticesArray, indicesArray);

  // Attach the collider to the rigid body
  const collider = world.createCollider(colliderDesc, rigidBody);

  return { rigidBody, collider };
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
}

export function reorientHoop(pos) {
  if (!hoopMesh) return;

  const hoopDummy = new THREE.Object3D();
  hoopDummy.position.copy(pos);
  hoopDummy.lookAt(getCamera().position);
  hoopMesh.quaternion.copy(hoopDummy.quaternion);
}

export function moveHoop(newPos) {
  if (!hoopMesh || !sensor) return;

  // Update visual position
  hoopMesh.position.copy(newPos);

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
  const hoopDummy = new THREE.Object3D();
  hoopDummy.position.copy(newPos);
  hoopDummy.lookAt(getCamera().position);
  hoopMesh.quaternion.copy(hoopDummy.quaternion);

  // Re-apply any needed offsets to visual elements
  hoopMesh.position.copy(newPos);
  hoopMesh.updateMatrix();
  hoopMesh.updateMatrixWorld();
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