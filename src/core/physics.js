// src/core/physics.js
import * as RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js";

let world;

export async function initPhysics() {
  await RAPIER.init();
  // Create the physics world with gravity
  world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
}

export function getWorld() {
  return world;
}

export function createGroundPhysics(floorOffset) {
  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorOffset, 0);
  const groundBody = world.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(5, 0.1, 5)
    .setRestitution(0.7)
    .setFriction(0.8);
  world.createCollider(colliderDesc, groundBody);
  return groundBody;
}

// Other helper functions for ball, hoop, walls can be added here.
