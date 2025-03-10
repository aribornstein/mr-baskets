// src/effects/graphics.js
import { GLTFLoader } from "GLTFLoader";

export function loadHandModel(handedness) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const url = handedness === "left"
      ? "src/assets/left.glb"
      : "src/assets/right.glb";
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, (error) => reject(error));
  });
}

export function loadBasketballModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const url = "src/assets/basketball.glb";
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, (error) => reject(error));
  });
}

export function loadHoopModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const url = "src/assets/hoop.glb";
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, (error) => reject(error));
  });
}

// Additional functions for particle effects or debugging overlays can be added here.
