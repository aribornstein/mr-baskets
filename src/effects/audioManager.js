// src/effects/audioManager.js
import * as THREE from 'three';

// Array of background music tracks
const backgroundTracks = [
    'src/assets/tracks/track1.mp3',
    'src/assets/tracks/track2.mp3',
    'src/assets/tracks/track3.mp3'
];

const cheerTracks = [
    'src/assets/cheers/cheer1.wav',
    'src/assets/cheers/cheer2.wav',
    'src/assets/cheers/cheer3.wav',
    'src/assets/cheers/cheer4.wav',
    // Add more cheer files as needed
];

let audioLoader;
let currentTrack;
let audioListener;
let audio;
let bounceSound; // Add this line
let buzzerSound = null; // Add this near bounceSound declaration

export function initAudioListener() {
    // Create an AudioListener and add it to the camera
    audioListener = new THREE.AudioListener();
    return audioListener;
}

export async function loadAudioTrack(trackURL) {
    if (!audioLoader) {
        audioLoader = new THREE.AudioLoader();
    }
    return new Promise((resolve, reject) => {
        audioLoader.load(
            trackURL,
            (buffer) => {
                resolve(buffer);
            },
            undefined,
            (err) => {
                console.error('Error loading audio:', err);
                reject(err);
            }
        );
    });
}

export async function playBackgroundMusic() {
    if (!audioListener) {
        audioListener = initAudioListener();
    }
    if (!audio) {
        audio = new THREE.Audio(audioListener);
    }
    if (currentTrack) {
        audio.stop();
    }

    // Select a random track
    let nextTrackIndex;
    do {
        nextTrackIndex = Math.floor(Math.random() * backgroundTracks.length);
    } while (backgroundTracks[nextTrackIndex] === currentTrack);
    currentTrack = backgroundTracks[nextTrackIndex];

    try {
        const buffer = await loadAudioTrack(currentTrack);
        audio.setBuffer(buffer);
        audio.setLoop(false); // Disable looping, we'll handle track switching
        audio.setVolume(0.3);
        audio.play();

        // Automatically play the next track when the current one ends
        audio.onEnded = () => {
            playBackgroundMusic();
        };
    } catch (error) {
        console.error("Failed to play background music:", error);
    }
}

export function stopBackgroundMusic() {
    if (audio && audio.isPlaying) {
        audio.stop();
    }
}

// Add this function to load the bounce sound
export async function loadBounceSound() {
    if (!audioListener) {
        audioListener = initAudioListener();
    }
    if (!audioLoader) {
        audioLoader = new THREE.AudioLoader();
    }
    bounceSound = new THREE.Audio(audioListener);
    const buffer = await loadAudioTrack('src/assets/sounds/ball-bounce.mp3');
    bounceSound.setBuffer(buffer);
}

// Add this function to play the bounce sound
export function playBounceSound() {
    if (bounceSound) {
        if (bounceSound.isPlaying) {
            bounceSound.stop(); // Stop if already playing
        }
        bounceSound.setLoop(false);
        bounceSound.setVolume(3.0);
        bounceSound.play();
    }
}

export async function loadBuzzerSound() {  
    if (!audioListener) {
        audioListener = initAudioListener();
    }
    if (!audioLoader) {
        audioLoader = new THREE.AudioLoader();
    }
    buzzerSound = new THREE.Audio(audioListener);
    const buffer = await loadAudioTrack('src/assets/sounds/buzzer.mp3');
    buzzerSound.setBuffer(buffer);
}

export function playBuzzerSound() {
    if (buzzerSound) {
        if (buzzerSound.isPlaying) {
            buzzerSound.stop();
        }
        buzzerSound.setLoop(false);
        buzzerSound.setVolume(1.0);
        buzzerSound.play();
    }
}

export async function playCheerSound() {
    if (!audioListener) {
        audioListener = initAudioListener();
    }
    const cheerTrack = cheerTracks[Math.floor(Math.random() * cheerTracks.length)];
    const cheerAudio = new THREE.Audio(audioListener);
    try {
        const buffer = await loadAudioTrack(cheerTrack);
        cheerAudio.setBuffer(buffer);
        cheerAudio.setLoop(false);
        cheerAudio.setVolume(1.0);
        cheerAudio.play();
    } catch (error) {
        console.error("Failed to play cheer sound:", error);
    }
}