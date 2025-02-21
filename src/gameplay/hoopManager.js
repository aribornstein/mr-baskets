// src/gameplay/hoopManager.js
import * as THREE from "three";
import { getScene, getCamera } from "../core/engine.js";
import { getWorld } from "../core/physics.js";
import { addObject } from "../managers/sceneManager.js";

const HOOP_RADIUS = 0.3;
const HOOP_HEIGHT = 1.8;
let hoopMesh = null;
let backboardMesh = null;
let hoopRigidBody = null;

export function initHoopManager(state) {
  // Create the initial hoop relative to the camera
  if (!state.ballAndHoopCreated && state.floorOffset !== undefined) {
    const hoopPos = getInitialHoopPosition(state);
    createHoopVisual(hoopPos);
    createHoopPhysics(hoopPos);
  }
}

function getInitialHoopPosition(state) {
  const camera = getCamera();
  const hoopOffset = new THREE.Vector3(0, 0, -2.5);
  hoopOffset.applyQuaternion(camera.quaternion);
  const pos = camera.position.clone().add(hoopOffset);
  pos.y = HOOP_HEIGHT + state.floorOffset;
  // Clamp position to room boundary if defined...
  return pos;
}

function createHoopVisual(pos) {
  console.log("Creating hoop at:", pos);
  // Hoop ring
  const hoopGeometry = new THREE.TorusGeometry(HOOP_RADIUS, 0.02, 16, 100);
  const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  hoopMesh = new THREE.Mesh(hoopGeometry, hoopMaterial);
  hoopMesh.rotation.x = Math.PI / 2;
  hoopMesh.position.copy(pos);
  addObject(hoopMesh);
  // Backboard
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

function createHoopPhysics(pos) {
  const world = getWorld();
  // Create hoop physics body
  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
  hoopRigidBody = world.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.cylinder(0.02, HOOP_RADIUS)
    .setRestitution(0.5)
    .setFriction(0.8);
  // Align collider with camera for a basic orientation
  const dummy = new THREE.Object3D();
  dummy.position.copy(pos);
  dummy.lookAt(getCamera().position);
  const correction = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const hoopQuat = dummy.quaternion.clone().multiply(correction);
  colliderDesc.setRotation({ x: hoopQuat.x, y: hoopQuat.y, z: hoopQuat.z, w: hoopQuat.w });
  world.createCollider(colliderDesc, hoopRigidBody);

  // Optionally, create backboard physics here
}
