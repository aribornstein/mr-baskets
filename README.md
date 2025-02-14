# WebXR Basketball with AR Passthrough & VR Hands

This project is a WebXR-based basketball game that leverages augmented reality (AR) passthrough and virtual reality (VR) hands for an immersive experience. It uses Three.js for rendering and Rapier for physics simulation, allowing users to interact with a virtual basketball and hoop in a real-world environment.

## Today's Features
- **AR Passthrough:** Uses ARButton to enable local-floor AR experiences.
- **VR Hands Integration:** Loads generic hand models for both controllers using GLTFLoader and [webxr-input-profiles](https://github.com/immersive-web/webxr-input-profiles/tree/main)
- **Physics Simulation:** Implements physics with Rapier for realistic ball and hoop interactions.
- **Ball Handling:** Allows ball pickup and throw with real-time velocity tracking.
- **Floor Calibration:** Provides calibration for floor position using controller button polling.

## Todo
- Fix room positioning with local room on quest 3
- AI generated graphic assets [this guide](https://thomassimonini.substack.com/p/generate-3d-assets-for-roblox-using)
- The ability to spawn baskets across the room when they are hit
- Showing points in the game world
- Sound effects 
- Particle effects
- Power ups
- Leaderboards

