// src/core/physics.js
import * as RAPIER from "rapier";

let world;

export async function initPhysics() {
  await RAPIER.init();
  world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
}

export function getWorld() {
  return world;
}

export function createGroundPhysics(floorOffset) {
  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorOffset, 0);
  const groundBody = world.createRigidBody(groundBodyDesc);
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(5, 0.1, 5)
    .setRestitution(0.7)
    .setFriction(0.8);
  world.createCollider(groundColliderDesc, groundBody);
  return groundBody;
}

export function createRoomWalls(roomBoundary) {
  const padding = 0.2;
  const wallThickness = 0.1;
  const halfThickness = wallThickness / 2;
  const centerX = (roomBoundary.min.x + roomBoundary.max.x) / 2;
  const centerY = (roomBoundary.min.y + roomBoundary.max.y) / 2;
  const centerZ = (roomBoundary.min.z + roomBoundary.max.z) / 2;
  const halfWidth = (roomBoundary.max.x - roomBoundary.min.x) / 2;
  const halfHeight = (roomBoundary.max.y - roomBoundary.min.y) / 2;
  const halfDepth = (roomBoundary.max.z - roomBoundary.min.z) / 2;
  
  // Left wall
  {
    const xPos = roomBoundary.min.x - padding;
    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(xPos, centerY, centerZ);
    const wallBody = world.createRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(halfThickness, halfHeight, halfDepth);
    world.createCollider(wallColliderDesc, wallBody);
  }
  // Right wall
  {
    const xPos = roomBoundary.max.x + padding;
    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(xPos, centerY, centerZ);
    const wallBody = world.createRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(halfThickness, halfHeight, halfDepth);
    world.createCollider(wallColliderDesc, wallBody);
  }
  // Back wall
  {
    const zPos = roomBoundary.min.z - padding;
    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(centerX, centerY, zPos);
    const wallBody = world.createRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfThickness);
    world.createCollider(wallColliderDesc, wallBody);
  }
  // Front wall
  {
    const zPos = roomBoundary.max.z + padding;
    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(centerX, centerY, zPos);
    const wallBody = world.createRigidBody(wallBodyDesc);
    const wallColliderDesc = RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfThickness);
    world.createCollider(wallColliderDesc, wallBody);
  }
  console.log("Room boundary walls created with padding:", padding);
}
