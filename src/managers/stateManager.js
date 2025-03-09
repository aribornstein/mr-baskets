// src/managers/stateManager.js
export const state = {
    environment: {
        floorOffset: 0,
        floorConfigured: false,
        roomBoundary: null,
    },
    objects: {
        ground: {
            created: false,
        },
        ball: {
            created: false,
            isHeld: false,
            radius: 0.12,
            // BALL-specific values if needed
        },
        hoop: {
            created: false,
            radius: 0.3,
            height: 1.8,
            movementAmplitude: null,
            movementFrequency: null,
            moveBackAndForth: false,
            moveUpAndDown: true,
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
        roomSetupComplete: false,
        gameOver: false,
        gameStarted: false,
    },
    callbacks: {
        onGrab: null,
        onRelease: null,
    },
};
