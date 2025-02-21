// src/managers/inputManager.js
import * as THREE from "three";
import { getScene, getCamera } from "../core/engine.js";
import { loadHandModel } from "../effects/graphics.js";

const controllers = [];

export function initInputManager(state) {
  const gltfLoader = loadHandModel; // reference to hand model loader
  for (let i = 0; i < 2; i++) {
    const controller = getScene().userData.renderer.xr.getController(i);
    controller.userData.index = i;
    controller.userData.velocity = new THREE.Vector3();
    controller.addEventListener("connected", (event) => {
      controller.userData.handedness = event.data.handedness;
      // Load hand model
      gltfLoader(controller.userData.handedness).then((handModel) => {
        const handWrapper = new THREE.Group();
        handModel.rotation.set(Math.PI / 2, 0, 0);
        handWrapper.add(handModel);
        controller.add(handWrapper);
      }).catch((error) => console.error("Error loading hand model:", error));
    });

    // Listen to controller events (delegate to ball/hoop managers via state/events)
    controller.addEventListener("squeezestart", (e) => {
      // Dispatch grab event
      state.onGrab && state.onGrab(e, controller);
    });
    controller.addEventListener("squeezeend", (e) => {
      // Dispatch release event
      state.onRelease && state.onRelease(e, controller);
    });

    getScene().add(controller);
    controllers.push(controller);
  }
}

export function getControllers() {
  return controllers;
}
