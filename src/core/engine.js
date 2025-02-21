// src/core/engine.js
import * as THREE from "three";

let renderer, scene, camera;

export function initEngine() {
  // Create renderer with transparency (for passthrough)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.xr.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);

  // Create scene and camera
  scene = new THREE.Scene();
  scene.background = null;
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
  camera.position.set(0, 1.6, 0);
  scene.add(camera);

  // Add lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(0, 4, 2);
  scene.add(dirLight);

  // Resize handler
  window.addEventListener("resize", () => {
    if (!renderer.xr.getSession()) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  });
}

export function getRenderer() {
  return renderer;
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}
