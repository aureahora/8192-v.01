import * as THREE from 'three';
// Simple Perlin noise function (replace with a library like 'simplex-noise' if needed for more complex behavior)
// This basic version is just for demonstration.
function noise() {
    var x = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0, y = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, z = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0;
    // Very basic pseudo-randomness based on input, not true Perlin noise
    var R = Math.random;
    if (typeof Math.seedrandom === 'function') R = Math.seedrandom(String(x * 10 + y * 100 + z * 1000)); // Use seedrandom if available
    var rx = (R() - 0.5) * 2;
    var ry = (R() - 0.5) * 2;
    var rz = (R() - 0.5) * 2;
    return {
        x: rx,
        y: ry,
        z: rz
    };
}
var interactionPoints = []; // Store active interaction world positions
var interactionStrength = 7.0; // Increased strength for more visible push
var interactionRadius = 3.5; // Slightly larger radius to affect more particles
// Function to apply forces from tile movements/merges
function applyTileInteraction(particleIndex, positions, velocities, interactionPoints) {
    var i3 = particleIndex * 3;
    var px = positions[i3];
    var py = positions[i3 + 1];
    var pz = positions[i3 + 2];
    var force = new THREE.Vector3(0, 0, 0);
    interactionPoints.forEach(function(point) {
        var dx = px - point.x;
        var dy = py - point.y;
        var dz = pz - point.z;
        var distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < interactionRadius * interactionRadius && distSq > 0.001) {
            var dist = Math.sqrt(distSq);
            var pushForce = (interactionRadius - dist) / interactionRadius; // Force stronger closer to center
            force.x += dx / dist * pushForce * interactionStrength;
            force.y += dy / dist * pushForce * interactionStrength;
            force.z += dz / dist * pushForce * interactionStrength * 0.5; // Less force on Z-axis maybe?
        }
    });
    // Apply the accumulated force to velocity (simple impulse)
    velocities[i3] += force.x * 0.1; // Use a small multiplier to avoid extreme speed
    velocities[i3 + 1] += force.y * 0.1;
    velocities[i3 + 2] += force.z * 0.1;
}
// Main update function
export function updateParticles(particles, points, clock, camera, currentInteractionPoints, lastMoveDirection) {
    var positions = particles.attributes.position.array;
    var velocities = particles.userData.velocities;
    var lifetimes = particles.userData.lifetimes;
    var baseColors = particles.userData.baseColors;
    var colors = particles.attributes.color.array; // Access attributes directly on geometry
    // Removed duplicate declarations of lifetimes, baseColors, and colors below
    var deltaTime = Math.min(clock.getDelta(), 0.05); // Clamp delta to prevent large jumps
    var elapsedTime = clock.getElapsedTime();
    var bounds = {
        x: camera.aspect * camera.getFilmHeight() * 0.6,
        y: camera.getFilmHeight() * 0.6,
        zMin: -15,
        zMax: 5 // Slightly in front of grid base
    };
    for(var i = 0; i < particles.userData.count; i++){
        var i3 = i * 3;
        lifetimes[i] -= deltaTime;
        // Reset particle if lifetime is over or out of bounds
        if (lifetimes[i] <= 0 || Math.abs(positions[i3]) > bounds.x || Math.abs(positions[i3 + 1]) > bounds.y || positions[i3 + 2] < bounds.zMin || positions[i3 + 2] > bounds.zMax) {
            // Reset position randomly within bounds
            positions[i3] = (Math.random() - 0.5) * 2 * bounds.x;
            positions[i3 + 1] = (Math.random() - 0.5) * 2 * bounds.y;
            positions[i3 + 2] = THREE.MathUtils.randFloat(bounds.zMin, bounds.zMax); // Depth
            // Reset velocity (slow drift)
            velocities[i3] = (Math.random() - 0.5) * 0.2;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
            // Reset lifetime
            lifetimes[i] = THREE.MathUtils.randFloat(5, 15); // seconds
            // Reset color to base
            colors[i3] = baseColors[i3];
            colors[i3 + 1] = baseColors[i3 + 1];
            colors[i3 + 2] = baseColors[i3 + 2];
        } else {
            // Apply interaction forces *first*
            if (currentInteractionPoints && currentInteractionPoints.length > 0) {
                applyTileInteraction(i, positions, velocities, currentInteractionPoints);
            }
            // Add subtle noise-based movement variation
            var noiseFactor = 0.05;
            var noiseVec = noise(positions[i3] * 0.1, positions[i3 + 1] * 0.1, elapsedTime * 0.1);
            velocities[i3] += noiseVec.x * noiseFactor * deltaTime;
            velocities[i3 + 1] += noiseVec.y * noiseFactor * deltaTime;
            velocities[i3 + 2] += noiseVec.z * noiseFactor * deltaTime;
            // Apply directional push from last move
            if (lastMoveDirection && (lastMoveDirection.x !== 0 || lastMoveDirection.y !== 0)) {
                var directionForce = 0.05; // Adjusted strength for impulse-like effect
                velocities[i3] += lastMoveDirection.x * directionForce; // Remove deltaTime for impulse
                velocities[i3 + 1] += lastMoveDirection.y * directionForce; // Remove deltaTime for impulse
            }
            // Apply damping/friction - enhanced deceleration for high velocities
            var baseMaxVelocity = 0.5; // Threshold for "normal" drifting speed
            var highVelocityDamping = 0.65; // Much stronger damping when moving fast
            var standardDamping = 0.92; // Significantly increase standard damping to slow down drift quickly
            var velMagSq = velocities[i3] * velocities[i3] + velocities[i3 + 1] * velocities[i3 + 1] + velocities[i3 + 2] * velocities[i3 + 2];
            var currentDamping = velMagSq > baseMaxVelocity * baseMaxVelocity ? highVelocityDamping : standardDamping;
            velocities[i3] *= currentDamping;
            velocities[i3 + 1] *= currentDamping;
            velocities[i3 + 2] *= currentDamping;
            // Clamp velocity (can still keep this as a safety)
            var maxVel = 2.5; // Allow slightly higher max velocity due to interactions and directional push
            velocities[i3] = THREE.MathUtils.clamp(velocities[i3], -maxVel, maxVel);
            velocities[i3 + 1] = THREE.MathUtils.clamp(velocities[i3 + 1], -maxVel, maxVel);
            velocities[i3 + 2] = THREE.MathUtils.clamp(velocities[i3 + 2], -maxVel * 0.5, maxVel * 0.5);
            // Update position
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
            // Fade out particle towards end of life
            var fadeStart = 0.3; // Start fading when 30% of life remains
            if (lifetimes[i] / particles.userData.initialLifetimes[i] < fadeStart) {
                var fadeProgress = lifetimes[i] / (particles.userData.initialLifetimes[i] * fadeStart);
                colors[i3] = baseColors[i3] * fadeProgress;
                colors[i3 + 1] = baseColors[i3 + 1] * fadeProgress;
                colors[i3 + 2] = baseColors[i3 + 2] * fadeProgress;
            } else {
                // Ensure color is base if not fading
                colors[i3] = baseColors[i3];
                colors[i3 + 1] = baseColors[i3 + 1];
                colors[i3 + 2] = baseColors[i3 + 2];
            }
        } // End of if/else for reset/update
    } // End of for loop
    particles.attributes.position.needsUpdate = true;
    particles.attributes.color.needsUpdate = true;
} // End of updateParticles function
// Creates the particle geometry and initial attributes
export function createParticles(count, camera) {
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var sizes = new Float32Array(count);
    var velocities = new Float32Array(count * 3); // Store velocity (x, y, z)
    var lifetimes = new Float32Array(count); // Store remaining lifetime
    var initialLifetimes = new Float32Array(count); // Store initial lifetime for fading calc
    var baseColors = new Float32Array(count * 3); // Store original color
    var color1 = new THREE.Color(0xff9ce3); // Vaporwave Pink
    var color2 = new THREE.Color(0x90f2ff); // Vaporwave Blue
    var grey = new THREE.Color(0x888888);
    var bounds = {
        x: camera.aspect * camera.getFilmHeight() * 0.6,
        y: camera.getFilmHeight() * 0.6,
        zMin: -15,
        zMax: 5 // Slightly in front of grid base
    };
    for(var i = 0; i < count; i++){
        var i3 = i * 3;
        // Initial position (random within view bounds and depth)
        positions[i3] = (Math.random() - 0.5) * 2 * bounds.x;
        positions[i3 + 1] = (Math.random() - 0.5) * 2 * bounds.y;
        positions[i3 + 2] = THREE.MathUtils.randFloat(bounds.zMin, bounds.zMax);
        // Initial color (mix between the two main colors, plus some grey)
        var lerpFactor = Math.random();
        var color = void 0;
        if (Math.random() < 0.8) {
            color = color1.clone().lerp(color2, lerpFactor);
        } else {
            color = grey.clone().lerp(color1, Math.random() * 0.3).lerp(color2, Math.random() * 0.3);
        }
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        // Store base color
        baseColors[i3] = color.r;
        baseColors[i3 + 1] = color.g;
        baseColors[i3 + 2] = color.b;
        // Initial size (smaller and less random)
        sizes[i] = 0.3 + Math.random() * 0.4; // Size between 0.3 and 0.7
        // Initial velocity (slow drift)
        velocities[i3] = (Math.random() - 0.5) * 0.2;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
        // Initial lifetime
        lifetimes[i] = THREE.MathUtils.randFloat(5, 15); // seconds
        initialLifetimes[i] = lifetimes[i]; // Store initial for fade calculation
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    // Store custom data directly on the geometry object or a userData object
    geometry.userData = {
        velocities: velocities,
        lifetimes: lifetimes,
        initialLifetimes: initialLifetimes,
        baseColors: baseColors,
        count: count
    };
    return geometry;
}
