import { addFlameEffectToBall, addIceEffectToBall } from "../effects/particles.js";

export function applyFirePowerUp(ballMesh, state, scoreboardManager) {
    // Trigger fire power-up: add flame effect and mark double score
    addFlameEffectToBall(ballMesh);
    state.game.firePowerUpActive = true;
    // Option: Immediately award an extra point to double the basket
    scoreboardManager.incrementScore();
    // Disable fire power-up after 10 seconds
    setTimeout(() => {
        state.game.firePowerUpActive = false;
    }, 10000);
}

export function applyIcePowerUp(ballMesh, scoreboardManager) {
    // Trigger ice power-up: add ice effect and pause the shot clock
    addIceEffectToBall(ballMesh);
    scoreboardManager.pauseShotClock();
    // Resume shot clock after 5 seconds
    setTimeout(() => {
        if (!state.game.gameOver){
            scoreboardManager.unpauseShotClock();
        }
    }, 5000);
}