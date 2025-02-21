// src/managers/sceneManager.js
import { getScene } from "../core/engine.js";

const objects = [];

export function initSceneManager() {
  // Optionally initialize debugging tools or overlays here.
  console.log("Scene Manager initialized.");
}

export function addObject(object) {
  getScene().add(object);
  objects.push(object);
}

export function removeObject(object) {
  getScene().remove(object);
  const idx = objects.indexOf(object);
  if (idx > -1) objects.splice(idx, 1);
}

export function getObjects() {
  return objects;
}
