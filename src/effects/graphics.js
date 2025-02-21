// src/effects/graphics.js
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js";

export function loadHandModel(handedness) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const url = handedness === "left"
      ? "https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/profiles/generic-hand/left.glb"
      : "https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/profiles/generic-hand/right.glb";
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, (error) => reject(error));
  });
}


// Additional functions for particle effects or debugging overlays can be added here.
