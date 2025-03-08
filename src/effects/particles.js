//// filepath: /Users/abornst/Documents/mr-baskets/src/effects/particles.js
import * as THREE from "three";

export function createFlameParticles() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = Math.random() * 0.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xff4500,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geometry, material);
}

export function addFlameEffectToBall(ballMesh) {
    const flameParticles = createFlameParticles();
    ballMesh.add(flameParticles);
    // Remove the effect after 3 seconds
    setTimeout(() => {
        ballMesh.remove(flameParticles);
    }, 3000);
}