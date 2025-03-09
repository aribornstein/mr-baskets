//// filepath: /Users/abornst/Documents/mr-baskets/src/managers/levelManager.js
// JavaScript

import { state } from "./stateManager.js";

// Compute the nth Fibonacci number (starting with F(1)=1, F(2)=1)
function fibonacci(n) {
    if (n <= 2) return 1;
    let a = 1, b = 1;
    for (let i = 3; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}

// Returns the hoop movement pattern based on the current level.
function setLevelHoopMovement() {
    const level = state.game.level;
    if (level >= 3) {
        // Level 3+: Enable lateral movement.
        state.objects.hoop.moveLeftAndRight = true;
    } else if (level >= 5) {
        // Level 5+: Enable vertical movement.
        // Randomly enable either lateral or vertical movement.
        if (Math.random() < 0.5) {
            state.objects.hoop.moveLeftAndRight = true;
            state.objects.hoop.moveUpAndDown = false;
        } else {
            state.objects.hoop.moveLeftAndRight = false;
            state.objects.hoop.moveUpAndDown = true;
        }
    } else if (level >= 7) {
        // Level 10+: Depth movement is enabled.
        // Randomly enable one of the three movements.
        if (Math.random() < 0.3) {
            state.objects.hoop.moveLeftAndRight = true;
            state.objects.hoop.moveUpAndDown = false;
            state.objects.hoop.moveBackAndForth = false;
        } else if (Math.random() < 0.6) {
            state.objects.hoop.moveLeftAndRight = false;
            state.objects.hoop.moveUpAndDown = true;
            state.objects.hoop.moveBackAndForth = false;
        } else {
            state.objects.hoop.moveLeftAndRight = false;
            state.objects.hoop.moveUpAndDown = false;
            state.objects.hoop.moveBackAndForth = true;
        }
    }
}
// Call updateLevel each time the score updates.
export function updateLevel() {
    const threshold = fibonacci(state.game.level);

    if (state.game.score >= threshold) {
        state.game.level++;
        console.log("Level Up to:", state.game.level);

        if (state.game.level >= 7) {
            // Increase amplitude and frequency gradually.
            state.objects.hoop.movementAmplitude += 0.05;
            state.objects.hoop.movementFrequency += 0.1;
        }
        // Shave one second off of the shot clock for every 5 points scored after level 3 with a three second minimum.
        if (state.game.level >= 3 && (state.game.score % 5) === 0 && state.shotClockInit > 3) {
            state.shotClockInit -= 1;
        }
    }
    // Update hoop movement pattern based on the level.
    setLevelHoopMovement();
}

