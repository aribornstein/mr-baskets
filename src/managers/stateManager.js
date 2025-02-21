// src/managers/stateManager.js
export const state = {
    floorOffset: 0,
    roomBoundary: null,
    ballAndHoopCreated: false,
    isHoldingBall: false,
    score: 0,
    // Event callbacks can be registered by gameplay modules:
    onGrab: null,
    onRelease: null,
    onScore: null,
  };
  