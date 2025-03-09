// src/managers/inputManager.js
import * as THREE from "three";
import { getScene, getRenderer } from "../core/engine.js";
import { loadHandModel } from "../effects/graphics.js";

const controllers = [];

export function initInputManager(state) {
  const gltfLoader = loadHandModel;
  for (let i = 0; i < 2; i++) {
    const controller = getRenderer().xr.getController(i);
    controller.userData.index = i;
    controller.userData.velocity = new THREE.Vector3();
    controller.addEventListener("connected", (event) => {
      controller.userData.handedness = event.data.handedness;
      if (event.data && event.data.gamepad) {
        controller.userData.inputSource = event.data;
      }
      gltfLoader(controller.userData.handedness)
        .then((handModel) => {
          const handWrapper = new THREE.Group();
          handModel.rotation.set(Math.PI / 2, 0, 0);
          handWrapper.add(handModel);
          controller.add(handWrapper);

        })
        .catch((error) => console.error("Error loading hand model:", error));
    });
    // Forward squeeze events to state callbacks
    controller.addEventListener("squeezestart", (e) => {
      state.callbacks.onGrab && state.callbacks.onGrab(e, controller);
    });
    controller.addEventListener("squeezeend", (e) => {
      state.callbacks.onRelease && state.callbacks.onRelease(e, controller);
    });
    getScene().add(controller);
    controllers.push(controller);
  }
}

export function getControllers() {
  return controllers;
}
