                           +-----------------------+
                           |    Core Engine        |
                           | (Renderer, Scene, XR) |
                           +-----------+-----------+
                                       |
                                       v
                           +-----------------------+
                           |  Resource Loader      |
                           +-----------------------+
                                       |
                                       v
                           +-----------------------+
                           |  Physics Engine       |
                           |  Wrapper (RAPIER)     |
                           +-----------+-----------+
                                       |
                                       v
                           +-----------------------+
                           |   Game State Manager  |
                           +-----------+-----------+
                                       |
            +--------------------------+--------------------------+
            |                         |                          |
            v                         v                          v
   +----------------+       +----------------------+     +------------------+
   | Input Manager  |       |   Gameplay Logic     |     | Visual & Audio   |
   | (Controllers,  |       | (Ball/Hoop, Shot     |     | (Graphics, UI,   |
   |  Events)       |       | Clock, Physics, etc.)|     | Sound/Haptics)   |
   +----------------+       +----------------------+     +------------------+
                                       |
                                       v
                           +-----------------------+
                           | Debug & Analytics     |
                           | (Debug Tools, Replay) |
                           +-----------------------+
