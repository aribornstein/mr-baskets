# WebXR Basketball with AR Passthrough & VR Hands

This project is a WebXR-based basketball game that leverages augmented reality (AR) passthrough and virtual reality (VR) hands for an immersive experience. It uses Three.js for rendering and Rapier for physics simulation, allowing users to interact with a virtual basketball and hoop within a real-world environment.

## Today's Features
- **AR Passthrough:** Uses ARButton to enable local-floor AR experiences.
- **VR Hands Integration:** Loads generic hand models for both controllers using GLTFLoader and [webxr-input-profiles](https://github.com/immersive-web/webxr-input-profiles/tree/main).
- **Physics Simulation:** Implements physics with Rapier for realistic ball and hoop interactions.
- **Ball Handling:** Allows ball pickup and throw with real-time (smoothed) velocity tracking.
- **Floor Calibration:** Calibrates floor position using detected surfaces.
- **Room Boundaries:** Creates invisible colliders (with padding) based on detected walls to prevent the ball from leaving the play area.

## Planned Enhancements & Features

### Gameplay Enhancements
- **Shot Clock:**  
  - Add a countdown timer to enforce shot timings, complete with visual and audio cues.
- **Dynamic Hoop Placement:**  
  - When a shot is made, remove the current hoop and spawn a new one at a different, valid location within the room.
- **Enhanced Ball Physics:**  
  - Refine ball physics (e.g., spin, restitution, friction, and continuous collision detection) for more natural behavior.

### Visual & Audio Improvements
- **Improved Graphics:**  
  - Upgrade the hoop model with detailed rim and a dynamic net (using cloth simulation) for enhanced realism.
- **In-World Scoreboard:**  
  - Attach a scoreboard to a wall or the hoop's backboard displaying scores, shot counts, and remaining time.
- **Sound & Haptic Feedback:**  
  - Integrate sound effects (dribbling, swishes, rim bounces) and haptic feedback to enhance immersion.
- **Particle Effects:**  
  - Add visual effects (e.g., confetti, sparks) when a shot is made.
- **Debugging Tools:**  
  - Implement visual debugging (such as collider outlines) to assist in fine-tuning physics and gameplay during development.

### Additional Game Features
- **Game Modes & Leaderboards:**  
  - Introduce varied game modes, power-ups, and online leaderboards to track and compare player performance.
- **User Interface Enhancements:**  
  - Develop start screens, pause menus, and interactive tutorials to improve the overall user experience.
- **Replay & Analytics:**  
  - Capture shot statistics and enable a replay feature for players to review their gameplay.

## Todo
- Generate AI-based graphic assets ([this guide](https://thomassimonini.substack.com/p/generate-3d-assets-for-roblox-using)).
- Make sure the ball doesn't leave the room when shot.
- Implement dynamic basket spawning when a shot is made.
- Add an in-world scoreboard to display points.
- Integrate sound effects and haptic feedback for immersive interactions.
- Add particle effects and visual feedback on scoring.
- Develop power-up mechanics and varied game modes.
- Implement leaderboards and shot replay analytics.
