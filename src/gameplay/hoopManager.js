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


export function createHoopPhysics(pos) {
  const world = getWorld();

  // -------------------------
  // Hoop ring physics
  // -------------------------
  const hoopBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
  hoopBody = world.createRigidBody(hoopBodyDesc);
  const ringColliderDesc = RAPIER.ColliderDesc.cylinder(0.02, state.HOOP_RADIUS)
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

  const sensorDesc = RAPIER.ColliderDesc.cylinder(sensorThickness, state.HOOP_RADIUS * 0.9)
    .setSensor(true)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    .setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w })
    .setRestitution(0.0)
    .setFriction(0.0);

  const sensorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
    pos.x,
    pos.y + sensorYOffset,
    pos.z
  );
  const sensorBody = world.createRigidBody(sensorBodyDesc);
  sensor = world.createCollider(sensorDesc, sensorBody);

  // -------------------------
  // Backboard physics
  // -------------------------
  const boardBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z - 0.05);
  boardBody = world.createRigidBody(boardBodyDesc);
  const boardColliderDesc = RAPIER.ColliderDesc.cuboid(0.6, 0.4, 0.01)
    .setRestitution(0.3)
    .setFriction(0.8);
  world.createCollider(boardColliderDesc, boardBody);
}

export function createHoopVisual(pos) {
  console.log("Creating hoop at:", pos);

  // Hoop ring visual
  const hoopGeometry = new THREE.TorusGeometry(state.HOOP_RADIUS, 0.02, 16, 100);
  const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
  hoopMesh = new THREE.Mesh(hoopGeometry, hoopMaterial);
  hoopMesh.rotation.x = Math.PI / 2;
  hoopMesh.position.copy(pos);
  addObject(hoopMesh);

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
  backboardMesh.position.copy(pos);
  backboardMesh.translateZ(-0.1);
  backboardMesh.translateY(0.1);
  addObject(backboardMesh);
}

export function isBasket(collider1, collider2) {
  if (sensorCooldown) return false;

  if (collider1 === sensor || collider2 === sensor) {
    // Start the cooldown
    sensorCooldown = true;
    setTimeout(() => {
      sensorCooldown = false;
    }, 500); // Cooldown for 500 milliseconds

    return true;
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
