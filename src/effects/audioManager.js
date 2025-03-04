// src/effects/audioManager.js
import * as THREE from 'three';

// Array of background music tracks
const backgroundTracks = [
    'src/assets/track1.mp3',
    'src/assets/track2.mp3',
    'src/assets/track3.mp3'
];

let audioLoader;
let currentTrack;
let audioListener;
let audio;

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
        audio.setVolume(0.5);
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