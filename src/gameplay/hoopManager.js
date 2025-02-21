// src/gameplay/hoopManager.js
import * as THREE from "three";
import * as RAPIER from "rapier";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";
import { state } from "../managers/stateManager.js";

let hoopMesh = null;
let backboardMesh = null;
let hoopBody = null, boardBody = null;

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

  // Backboard physics
  const boardBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z - 0.05);
  boardBody = world.createRigidBody(boardBodyDesc);
  const boardColliderDesc = RAPIER.ColliderDesc.cuboid(0.3, 0.2, 0.01)
    .setRestitution(0.3)
    .setFriction(0.8);
  world.createCollider(boardColliderDesc, boardBody);
}

export function createHoopVisual(pos) {
  console.log("Creating hoop at:", pos);
  // Hoop ring visual
  const hoopGeometry = new THREE.TorusGeometry(state.HOOP_RADIUS, 0.02, 16, 100);
  const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  hoopMesh = new THREE.Mesh(hoopGeometry, hoopMaterial);
  hoopMesh.rotation.x = Math.PI / 2;
  hoopMesh.position.copy(pos);
  addObject(hoopMesh);
  // Backboard visual
  const boardGeometry = new THREE.PlaneGeometry(0.6, 0.4);
  const boardMaterial = new THREE.MeshStandardMaterial({
    color: 0x0000ff,
    side: THREE.DoubleSide
  });
  backboardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
  backboardMesh.position.copy(pos);
  backboardMesh.translateZ(-0.1);
  backboardMesh.translateY(0.1);
  addObject(backboardMesh);
}
