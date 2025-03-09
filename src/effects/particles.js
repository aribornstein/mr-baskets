//// filepath: /Users/abornst/Documents/mr-baskets/src/effects/particles.js
import * as THREE from "three";

export function createFlameParticles() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        // Initially position particles near the base
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

    const points = new THREE.Points(geometry, material);
    return points;
}

export function updateFlameParticles(particles) {
    const positions = particles.geometry.attributes.position.array;
    const particleCount = positions.length / 3;
    for (let i = 0; i < particleCount; i++) {
        // Update the y coordinate to simulate upward movement
        positions[i * 3 + 1] += 0.01;
        // Reset particle's y if it moves too high to create a looping effect
        if (positions[i * 3 + 1] > 1) {
            positions[i * 3 + 1] = 0;
        }
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

export function addFlameEffectToBall(ballMesh, scene, camera, renderer) {
    const flameParticles = createFlameParticles();
    ballMesh.add(flameParticles);
    // Start animation loop for flame particles with integrated rendering
    function animate() {
        updateFlameParticles(flameParticles);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();
    // Remove the effect after 5 seconds
    setTimeout(() => {
        ballMesh.remove(flameParticles);
    }, 5000);
}

export function createIceParticles() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        // Initially position particles near the base
        positions[i * 3] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = Math.random() * 0.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x66ccff, // Ice-like color
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    return points;
}

export function updateIceParticles(particles) {
    const positions = particles.geometry.attributes.position.array;
    const particleCount = positions.length / 3;
    for (let i = 0; i < particleCount; i++) {
        // Update the y coordinate to simulate a gentle downward drift
        positions[i * 3 + 1] -= 0.005;
        // Reset particle's y to create a looping effect
        if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 0.5;
        }
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

export function addIceEffectToBall(ballMesh, scene, camera, renderer) {
    const iceParticles = createIceParticles();
    ballMesh.add(iceParticles);
    // Start animation loop for ice particles with integrated rendering
    function animate() {
        updateIceParticles(iceParticles);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();
    // Remove the effect after 5 seconds
    setTimeout(() => {
        ballMesh.remove(iceParticles);
    }, 5000);
}
