// src/gameplay/shotClock.js
export function initShotClock(state) {
    state.shotTime = 24;
    console.log("Shot clock initialized with", state.shotTime, "seconds.");
  }
  
  export function updateShotClock(delta, state) {
    if (state.shotTime > 0) {
      state.shotTime -= delta;
    } else {
      console.log("Shot clock expired!");
      // Handle shot timeout here.
    }
  }
  