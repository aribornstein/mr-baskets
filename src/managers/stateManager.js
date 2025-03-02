// src/managers/stateManager.js
export const state = {
    floorOffset: 0,
    floorConfigured: false,
    groundCreated: false,
    ballCreated: false,
    hoopCreated: false,
    wallsCreated: false,
    scoreboardCreated: false,
    roomBoundary: null,
    isHoldingBall: false,
    BALL_RADIUS: 0.12,
    HOOP_RADIUS: 0.3,
    HOOP_HEIGHT: 1.8,
    // Callbacks for input events
    onGrab: null,
    onRelease: null,
    gameOver: false
  };
