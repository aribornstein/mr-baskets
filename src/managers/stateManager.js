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
    roomSetupComplete: false,
    gameClock: 0,
    score:0,
    BALL_RADIUS: 0.12,
    HOOP_RADIUS: 0.3,
    HOOP_HEIGHT: 1.8,

    moveHoopBackAndForth:false,
    // Callbacks for input events
    onGrab: null,
    onRelease: null,
    gameOver: false,
    gameStarted: false // ADD THIS LINE

  };
