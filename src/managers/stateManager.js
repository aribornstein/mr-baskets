// src/managers/stateManager.js
export const state = {
    environment: {
        floorOffset: 0,
        floorConfigured: false,
        roomBoundary: null,
        previousRegionIndex: -1, // Add this line
    },
    objects: {
        ground: {
            created: false,
        },
        ball: {
            created: false,
            isHeld: false,
            radius: 0.12,
            scale: 0.24,
            // BALL-specific values if needed
        },
        hoop: {
            created: false,
            radius: 0.28,
            height: 1.75,
            movementAmplitude: 0.2,
            movementFrequency: 0.5,
            moveBackAndForth: false,
            moveUpAndDown: false,
            moveLeftAndRight: false,
            amplitudeX: 0,
            amplitudeY: 0,
            amplitudeZ: 0,
            phaseX: 0,
            phaseY: 0,
            phaseZ: 0,
            pos: { x: 0, y: 0, z: 0 },
            centerPosition: { x: 0, y: 0, z: 0 },
            isMoving: false, // Add this line
        },
        walls: {
            created: false,
        },
        scoreboard: {
            created: false,
        },
    },
    game: {
        level: 1,
        gameClock: 0,
        score: 0,
        mode: "practice",
        roomSetupComplete: false,
        gameOver: false,
        gameStarted: false,
        shotClockInit: 24,
        shotAttempt: false,    // Flag to track intentional shots
        missedShots: 0,        // Count of intentional missed shots
    },
    callbacks: {
        onGrab: null,
        onRelease: null,
    },
    debugger: false,
};
