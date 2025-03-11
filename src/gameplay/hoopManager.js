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
    // Wrap in a group to allow unified transforms
    hoopMesh = new THREE.Group();
    hoopMesh.add(hoopPrefab);

    // Position and orient the prefab to face the camera
    hoopMesh.position.copy(pos);
    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.lookAt(getCamera().position);
    hoopMesh.quaternion.copy(dummy.quaternion);

    // Removed translateZ(-0.1) to avoid offset mismatch
    // hoopMesh.translateZ(-0.1);

    addObject(hoopMesh);
    // setInitialHoopPos(pos); // Remove this line

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

  let vertices = [];
  let indices = [];

  // Compute the inverse matrix of the hoopMesh's world matrix using the new invert() method
  const inverseMatrix = new THREE.Matrix4().copy(hoopMesh.matrixWorld).invert();

  // Traverse the hoopPrefab to extract mesh data for a trimesh collider
  hoopPrefab.traverse((child) => {
    if (child.isMesh) {
      child.updateWorldMatrix(true, false);
      const geometry = child.geometry;
      const positionAttribute = geometry.attributes.position;

      for (let i = 0; i < positionAttribute.count; i++) {
        // Get the vertex in world space
        const worldVertex = new THREE.Vector3()
          .fromBufferAttribute(positionAttribute, i)
          .applyMatrix4(child.matrixWorld);
        // Convert the vertex to hoopMesh's local space
        const localVertex = worldVertex.clone().applyMatrix4(inverseMatrix);
        vertices.push(localVertex.x, localVertex.y, localVertex.z);
      }

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

  const verticesArray = new Float32Array(vertices);
  const indicesArray = new Uint32Array(indices);

  // Initialize the rigid body with the hoopMesh's current translation and rotation
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(hoopMesh.position.x, hoopMesh.position.y, hoopMesh.position.z);

  const rigidBody = world.createRigidBody(rigidBodyDesc);

  // Set the initial rotation on the rigid body to match the hoopMesh.
  rigidBody.setNextKinematicRotation(
    new RAPIER.Quaternion(
      hoopMesh.quaternion.x,
      hoopMesh.quaternion.y,
      hoopMesh.quaternion.z,
      hoopMesh.quaternion.w
    )
  );

  // Store the hoop collider's rigid body for updating on move.
  hoopColliderRB = rigidBody;

  const colliderDesc = RAPIER.ColliderDesc.trimesh(verticesArray, indicesArray);
  const collider = world.createCollider(colliderDesc, rigidBody);

  // Store this collider
  hoopColliders.push({ rigidBody, collider });

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
  // Also remove the hoop collider rigid body
  if (hoopColliderRB) {
    world.removeRigidBody(hoopColliderRB);
    hoopColliderRB = null;
  }
}

export function moveHoop(newPos) {
  if (!hoopMesh || !sensor || !hoopColliderRB) return;
  // console.log("Prev Rapier Collider Position:", hoopColliderRB.translation());
  // console.log("Prev Three.js Mesh Position:", hoopMesh.position);

  // Ensure the physics body is active
  hoopColliderRB.wakeUp();

  // Compute quaternion to face the camera
  const hoopDummy = new THREE.Object3D();
  hoopDummy.position.copy(newPos);
  hoopDummy.lookAt(getCamera().position);
  const hoopMeshQuat = hoopDummy.quaternion.clone();

  // 1) Update the Three.js mesh
  hoopMesh.position.copy(newPos);
  hoopMesh.quaternion.copy(hoopMeshQuat);
  hoopMesh.updateMatrixWorld(true);

  // 2) Update the Rapier kinematic body to match
  const finalColliderPos = new RAPIER.Vector3(newPos.x, newPos.y, newPos.z);
  hoopColliderRB.setNextKinematicTranslation(finalColliderPos);
  hoopColliderRB.setNextKinematicRotation(
    new RAPIER.Quaternion(hoopMeshQuat.x, hoopMeshQuat.y, hoopMeshQuat.z, hoopMeshQuat.w)
  );

  // 3) Update the sensor position and rotation similarly
  const sensorYOffset = -0.01;
  const sensorPos = new RAPIER.Vector3(newPos.x, newPos.y + sensorYOffset, newPos.z);
  const sensorBody = sensor.parent();
  if (sensorBody) {
    sensorBody.wakeUp();
    sensorBody.setNextKinematicTranslation(sensorPos);
    sensorBody.setNextKinematicRotation(
      new RAPIER.Quaternion(hoopMeshQuat.x, hoopMeshQuat.y, hoopMeshQuat.z, hoopMeshQuat.w)
    );
  }

  // console.log("Rapier Collider Position:", hoopColliderRB.translation());
  // console.log("Three.js Mesh Position:", hoopMesh.position);
}

export function updateHoopMovement() {
  if (!initialHoopPos) return;

  const {
    moveLeftAndRight,
    moveUpAndDown,
    moveBackAndForth,
    amplitudeX,
    amplitudeY,
    amplitudeZ,
    movementFrequency,
    phaseX,
    phaseY,
    phaseZ,
    centerPosition,
  } = state.objects.hoop;
  if (!(moveLeftAndRight || moveUpAndDown || moveBackAndForth)) return;

  const elapsedTime = performance.now() / 1000;
  const newPos = { ...initialHoopPos };

  // Define level-based multipliers so that initial movement is only 10%
  // and then gradually increases with each level (capped at 1).
  const levelMultiplier = Math.min(0.1 + (state.game.level - 1) * 0.05, 1);
  const freqMultiplier = Math.min(0.1 + (state.game.level - 1) * 0.05, 2);

  // Map axis keys to their movement flags.
  const axes = {
    x: moveLeftAndRight,
    y: moveUpAndDown,
    z: moveBackAndForth,
  };

  Object.entries(axes).forEach(([axis, shouldMove]) => {
    if (!shouldMove) return;

    let offset = 0;
    let effectiveAmplitude = 0;
    let phase = 0;

    if (axis === "x") {
      effectiveAmplitude = amplitudeX * levelMultiplier;
      phase = phaseX;
    } else if (axis === "y") {
      effectiveAmplitude = amplitudeY * levelMultiplier;
      phase = phaseY;
    } else if (axis === "z") {
      effectiveAmplitude = amplitudeZ * levelMultiplier;
      phase = phaseZ;
    }

    offset = effectiveAmplitude * Math.sin(elapsedTime * movementFrequency * freqMultiplier * Math.PI * 2 + phase);
    newPos[axis] = centerPosition[axis] + offset;
  });

  moveHoop(newPos);
}
