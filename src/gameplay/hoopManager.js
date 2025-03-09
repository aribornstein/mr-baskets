import * as THREE from "three";
import * as RAPIER from "rapier";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";
import { state } from "../managers/stateManager.js";

let hoopMesh = null;
let backboardMesh = null;
let netMesh = null;
let hoopBody = null, boardBody = null, netBody = null;
let sensor;
let sensorCooldown = false; // Add this line to define sensorCooldown
let initialHoopPos = null;

export function setInitialHoopPos(pos) {
  initialHoopPos = { x: pos.x, y: pos.y, z: pos.z };
}

export function createHoopPhysics(pos) {
  const world = getWorld();
  setInitialHoopPos(pos);
  // -------------------------
  // Hoop ring physics
  // -------------------------
  const hoopBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z);
  hoopBody = world.createRigidBody(hoopBodyDesc);

  // Create a torus geometry for the hoop ring
  const torusGeometry = new THREE.TorusGeometry(state.objects.hoop.radius, 0.02, 16, 100);
  const vertices = [];
  const indices = [];

  // Extract vertices and indices from the torus geometry
  torusGeometry.attributes.position.array.forEach((v, i) => {
    vertices.push(v);
  });
  torusGeometry.index.array.forEach((i) => {
    indices.push(i);
  });

  // Create a trimesh collider for the hoop ring
  const ringColliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
    .setRestitution(0.5)
    .setFriction(0.8);

  // Determine orientation so the hoop faces the camera
  const dummy = new THREE.Object3D();
  dummy.position.copy(pos);
  dummy.lookAt(getCamera().position);
  const correction = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const hoopQuat = dummy.quaternion.clone().multiply(correction);
  ringColliderDesc.setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w });
  world.createCollider(ringColliderDesc, hoopBody);

  // -------------------------
  // Sensor for basket detection
  // -------------------------
  // Improved sensor creation: very thin horizontal disk slightly below hoop
  const sensorThickness = 0.0001; // Extremely thin
  const sensorYOffset = -0.01; // Slightly below hoop center to detect ball passing through

  const sensorDesc = RAPIER.ColliderDesc.cylinder(sensorThickness, state.objects.hoop.radius * 0.9)
    .setSensor(true)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)

  // Apply the same orientation to the sensor as the hoop
  sensorDesc.setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w });

  const sensorBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
    pos.x,
    pos.y + sensorYOffset,
    pos.z
  ) // Set dominance group to a higher value
  const sensorBody = world.createRigidBody(sensorBodyDesc);
  sensor = world.createCollider(sensorDesc, sensorBody);

  // -------------------------
  // Backboard physics
  // -------------------------
  const boardBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z - 0.05);
  boardBody = world.createRigidBody(boardBodyDesc);
  const boardColliderDesc = RAPIER.ColliderDesc.cuboid(0.6, 0.4, 0.01)
    .setRestitution(0.3)
    .setFriction(0.8);
    
  // Orient the backboard
  const backboardDummy = new THREE.Object3D();
  backboardDummy.position.copy(pos);
  backboardDummy.lookAt(getCamera().position);
  const backboardQuat = backboardDummy.quaternion.clone();
  boardColliderDesc.setRotation({ x: backboardQuat.x, y: backboardQuat.y, z: backboardQuat.z, w: backboardQuat.w });
  world.createCollider(boardColliderDesc, boardBody);
}

export function createHoopVisual(pos) {
    console.log("Creating hoop at:", pos);

    // Backboard visual with multiple layers
    backboardMesh = new THREE.Group();

    // Main white backboard
    const mainBoardGeom = new THREE.PlaneGeometry(0.6, 0.4);
    const mainBoardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const mainBoardMesh = new THREE.Mesh(mainBoardGeom, mainBoardMat);

    // Red border
    const frameThickness = 0.02;
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    const topBorderGeom = new THREE.PlaneGeometry(0.6, frameThickness);
    const topBorderMesh = new THREE.Mesh(topBorderGeom, borderMat);
    topBorderMesh.position.set(0, 0.2, 0.001);

    const bottomBorderMesh = topBorderMesh.clone();
    bottomBorderMesh.position.set(0, -0.2, 0.001);

    const sideBorderGeom = new THREE.PlaneGeometry(frameThickness, 0.4);
    const leftBorderMesh = new THREE.Mesh(sideBorderGeom, borderMat);
    leftBorderMesh.position.set(-0.3, 0, 0.001);

    const rightBorderMesh = leftBorderMesh.clone();
    rightBorderMesh.position.set(0.3, 0, 0.001);

    // Shooter's square
    const shooterBoxGeom = new THREE.PlaneGeometry(0.2, 0.15);
    const shooterBoxMesh = new THREE.Mesh(shooterBoxGeom, borderMat);
    shooterBoxMesh.position.set(0, 0, 0.002);

    backboardMesh.add(mainBoardMesh, topBorderMesh, bottomBorderMesh, leftBorderMesh, rightBorderMesh, shooterBoxMesh);

    //Orient the backboard
    backboardMesh.position.copy(pos);
    const backboardDummy = new THREE.Object3D();
    backboardDummy.position.copy(pos);
    backboardDummy.lookAt(getCamera().position);
    backboardMesh.quaternion.copy(backboardDummy.quaternion);

    backboardMesh.translateZ(-0.1);
    backboardMesh.translateY(0.1);

    // Hoop ring visual
    const hoopGeometry = new THREE.TorusGeometry(state.objects.hoop.radius, 0.02, 16, 100);
    const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
    hoopMesh = new THREE.Mesh(hoopGeometry, hoopMaterial);

    //Orient the hoop
    hoopMesh.rotation.x = Math.PI / 2;
    hoopMesh.position.set(0, -0.15, 0.1); //Position the hoop relative to the backboard

    backboardMesh.add(hoopMesh); // Add the hoop to the backboard

    addObject(backboardMesh); // Add the backboard (with the hoop) to the scene
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
    if (backboardMesh) {
        getScene().remove(backboardMesh);
        backboardMesh = null;
    }
    if (netMesh) {
        getScene().remove(netMesh);
        netMesh = null;
    }
    if (hoopBody) {
        world.removeRigidBody(hoopBody);
        hoopBody = null;
    }
    if (boardBody) {
        world.removeRigidBody(boardBody);
        boardBody = null;
    }
    if (netBody) {
        world.removeRigidBody(netBody);
        netBody = null;
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
    if (!backboardMesh || !hoopBody || !sensor) return;

    // Update visual position
    backboardMesh.position.copy(newPos);

    // Calculate proper orientation to face camera (same as in createHoopPhysics)
    const dummy = new THREE.Object3D();
    dummy.position.copy(newPos);
    dummy.lookAt(getCamera().position);
    const correction = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const hoopQuat = dummy.quaternion.clone().multiply(correction);
    
    // Update hoop body position and orientation using setNextKinematicTranslation
    hoopBody.setNextKinematicTranslation(new RAPIER.Vector3(newPos.x, newPos.y, newPos.z));
    hoopBody.setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w });

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

    // Update physics backboard (boardBody) so it blocks the ball properly too
    if (boardBody) {
        boardBody.setNextKinematicTranslation(new RAPIER.Vector3(newPos.x, newPos.y, newPos.z - 0.05));
        boardBody.setRotation({
            x: backboardDummy.quaternion.x,
            y: backboardDummy.quaternion.y,
            z: backboardDummy.quaternion.z,
            w: backboardDummy.quaternion.w
        });
    }
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