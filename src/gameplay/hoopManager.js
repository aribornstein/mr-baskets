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

export function createHoopPhysics(pos) {
  const world = getWorld();

  // Hoop ring physics
  const hoopBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
  hoopBody = world.createRigidBody(hoopBodyDesc);
  const ringColliderDesc = RAPIER.ColliderDesc.cylinder(0.02, state.HOOP_RADIUS)
    .setRestitution(0.5)
    .setFriction(0.8);

  const dummy = new THREE.Object3D();
  dummy.position.copy(pos);
  dummy.lookAt(getCamera().position);
  const correction = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const hoopQuat = dummy.quaternion.clone().multiply(correction);
  ringColliderDesc.setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w });
  world.createCollider(ringColliderDesc, hoopBody);

  // Create a basket detection sensor
  const sensorDesc = RAPIER.ColliderDesc.cylinder(0.15, state.HOOP_RADIUS * 0.9)
    .setSensor(true)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);; // Make it a sensor (non-solid)
  sensorDesc.setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w });

  // Position it slightly below the hoop ring
  const sensorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
  const sensorBody = world.createRigidBody(sensorBodyDesc);
  sensor = world.createCollider(sensorDesc, sensorBody);

  // Create a visual representation of the sensor
  const sensorGeometry = new THREE.CylinderGeometry(state.HOOP_RADIUS * 0.9, state.HOOP_RADIUS * 0.9, 0.3, 32);
  const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 }); // Green, transparent
  const sensorMesh = new THREE.Mesh(sensorGeometry, sensorMaterial);
  sensorMesh.position.copy(pos);
  sensorMesh.rotation.x = Math.PI / 2; // Rotate to align with the Rapier cylinder
  addObject(sensorMesh);

  // Backboard physics
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
  const backboardGroup = new THREE.Group();

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

  backboardGroup.add(mainBoardMesh, topBorderMesh, bottomBorderMesh, leftBorderMesh, rightBorderMesh, shooterBoxMesh);
  backboardGroup.position.copy(pos);
  backboardGroup.translateZ(-0.1);
  backboardGroup.translateY(0.1);
  addObject(backboardGroup);
}

export function isBasket(collider1, collider2) {
  return collider1 === sensor || collider2 === sensor;
}
