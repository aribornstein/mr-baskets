# WebXR Basketball with AR Passthrough & VR Hands

This project is a WebXR-based basketball game that leverages augmented reality (AR) passthrough and virtual reality (VR) hands for an immersive experience. It uses Three.js for rendering and Rapier for physics simulation, allowing users to interact with a virtual basketball and hoop within a real-world environment.

## Today's Features

- **AR Passthrough:** Uses ARButton to enable local-floor AR experiences.
- **VR Hands Integration:** Loads generic hand models for both controllers using GLTFLoader and [webxr-input-profiles](https://github.com/immersive-web/webxr-input-profiles/tree/main).
- **AI  Generated BasketBall** -- generate AI meshes
- **Physics Simulation:** Implements physics with Rapier for realistic ball and hoop interactions.
- **Ball Handling:** Allows ball pickup and throw with real-time (smoothed) velocity tracking.
- **Floor Calibration:** Calibrates floor position using detected surfaces.
- **In-World Scoreboard:**  
  - Attach a scoreboard to a wall or the hoop's backboard displaying scores, shot counts, and remaining time.
- **Room Boundaries:** Creates invisible colliders (with padding) based on detected walls to prevent the ball from leaving the play area.
- **Shot Clock:**  
  - Add a countdown timer to enforce shot timings, complete with visual and audio cues.
- **Dynamic Hoop Placement:**  
  - When a shot is made, remove the current hoop and spawn a new one at a different, valid location within the room.
- **Enhanced Ball Physics:**  
  - Refine ball physics (e.g., spin, restitution, friction, and continuous collision detection) for more natural behavior.


## Todo

- Reconcile state vs event managment code (score board, boundries, hoop placement)
- ensure proper use of design patterns
- Develop start screens, pause menus, and interactive tutorials to improve the overall user experience.
- Identify and fix bugs 
- Implement leaderboards and shot replay analytics.
- Add object pooling to the ball and particles 
- Decouple constants and add them to state.js
- Integrate logger for debugging


## Credits

- **“Basketball Hoop” by Alec Huxley**  
Available on [Sketchfab](https://sketchfab.com/3d-models/basketball-hoop-2dc0a999ab8c4d378dd3256a6a6619a6)  
Licensed under [Creative Commons Attribution](https://creativecommons.org/licenses/by/)
