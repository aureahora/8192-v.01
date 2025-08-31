// Import ShaderMaterial components explicitly if needed, though they are part of THREE
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createParticles, updateParticles } from './particleUtils.js'; // Import particle functions
import { GRID_SIZE, CELL_SIZE, CELL_GAP } from './constants.js';

// Removed SquiggleMaterial import
var PARTICLE_COUNT = 80; // Significantly reduced particle count
export var SceneSetup = /*#__PURE__*/ function() {
    "use strict";
    function SceneSetup(container) {
        _class_call_check(this, SceneSetup);
        this.container = container;
        this.backgroundMaterial = null;
        this.bloomPass = null;
        this.clock = new THREE.Clock(); // Shared Clock for transitions and particles
        this.particleGeometry = null;
        this.particlePoints = null;
        this.originalParticleBaseColors = null; // Store original particle colors
        this.originalParticleSize = 0.5; // Store default particle size (matches creation)
        this.originalParticleOpacity = 0.7; // Store default opacity (matches creation)
        this.particleInteractionPoints = []; // Array to hold interaction coords for one frame
        // Removed squiggleMaterial reference
        // Original Shader Colors (using only 2 now for simpler gradient)
        this.originalColors = {
            color1: new THREE.Color(0xff9ce3),
            color2: new THREE.Color(0x90f2ff) // Bottom color
        };
        this.whiteColor = new THREE.Color(0xffffff); // Target for bright mode
        // Transition state
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionDuration = 0.7; // seconds
        this.startBrightness = 1.0;
        this.targetBrightness = 1.0;
        this.startSaturation = 1.0;
        this.targetSaturation = 1.0;
        // Store start/target colors directly, avoid intermediate copy if possible
        this.startColor1 = this.originalColors.color1.clone();
        this.startColor2 = this.originalColors.color2.clone();
        this.targetColor1 = this.originalColors.color1.clone();
        this.targetColor2 = this.originalColors.color2.clone();
        this.targetIsBright = true; // Default to bright mode
        // Scene
        this.scene = new THREE.Scene();
        this.createBackgroundGradient(); // Render order -1
        // Removed createSquiggleLayer() call
        // Camera
        var aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        this.adjustCameraToFitGrid();
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        container.appendChild(this.renderer.domElement);
        // Post-processing Composer
        this.composer = new EffectComposer(this.renderer);
        var renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        // Create and store the bloom pass
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.5, 0.5, 0.05 // threshold for bright mode
        );
        this.composer.addPass(this.bloomPass);
        // Lighting
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced ambient to let bloom shine
        this.scene.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5); // Angled light
        directionalLight.castShadow = true;
        // Configure shadow properties for quality/performance
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        this.scene.add(directionalLight);
        // Optional: Light Helper (Uncomment for debugging light direction)
        // import { DirectionalLightHelper } from 'three';
        // const helper = new DirectionalLightHelper(directionalLight, 5);
        // this.scene.add(helper);
        this.scene.add(directionalLight);
        this.createParticleSystem(); // Create particles
        this.initializeParticlesForBrightMode(); // Set initial bright state for particles
        // Handle Resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }
    _create_class(SceneSetup, [
        {
            key: "createBackgroundGradient",
            value: function createBackgroundGradient() {
                var geometry = new THREE.PlaneGeometry(2, 2); // Covers the entire viewport
                this.backgroundMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: {
                            value: 0
                        },
                        color1: {
                            value: this.originalColors.color1.clone()
                        },
                        color2: {
                            value: this.originalColors.color2.clone()
                        },
                        resolution: {
                            value: new THREE.Vector2(this.container.clientWidth, this.container.clientHeight)
                        },
                        brightnessFactor: {
                            value: 1.0
                        },
                        saturationFactor: {
                            value: 1.0
                        } // Already defaults to bright
                    },
                    vertexShader: "\n                varying vec2 vUv;\n                void main() {\n                    vUv = uv;\n                    gl_Position = vec4(position.xy, 1.0, 1.0); // Directly map to screen\n                }\n            ",
                    fragmentShader: "\n                uniform float time;\n                uniform vec3 color1; // Top\n                uniform vec3 color2; // Bottom\n                uniform vec2 resolution;\n                uniform float brightnessFactor;\n                uniform float saturationFactor;\n                varying vec2 vUv;\n                // Function to convert RGB to HSL (approximation)\n                vec3 rgb2hsl(vec3 color) {\n                    float maxC = max(max(color.r, color.g), color.b);\n                    float minC = min(min(color.r, color.g), color.b);\n                    float l = (maxC + minC) / 2.0;\n                    float h = 0.0, s = 0.0;\n                    if (maxC != minC) {\n                        float d = maxC - minC;\n                        s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);\n                        if (maxC == color.r) h = (color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0);\n                        else if (maxC == color.g) h = (color.b - color.r) / d + 2.0;\n                        else h = (color.r - color.g) / d + 4.0;\n                        h /= 6.0;\n                    }\n                    return vec3(h, s, l);\n                }\n                // Function to convert HSL to RGB (approximation)\n                float hue2rgb(float p, float q, float t) {\n                    if (t < 0.0) t += 1.0;\n                    if (t > 1.0) t -= 1.0;\n                    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;\n                    if (t < 1.0/2.0) return q;\n                    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;\n                    return p;\n                }\n                vec3 hsl2rgb(vec3 hsl) {\n                    float h = hsl.x, s = hsl.y, l = hsl.z;\n                    float r, g, b;\n                    if (s == 0.0) {\n                        r = g = b = l; // achromatic\n                    } else {\n                        float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;\n                        float p = 2.0 * l - q;\n                        r = hue2rgb(p, q, h + 1.0/3.0);\n                        g = hue2rgb(p, q, h);\n                        b = hue2rgb(p, q, h - 1.0/3.0);\n                    }\n                    return vec3(r, g, b);\n                }\n                void main() {\n                    // Check for the explicit white mode condition first\n                    if (saturationFactor == 0.0 && brightnessFactor == 0.0) {\n                        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Pure black\n                        return;\n                    }\n                    // Simple vertical gradient mixing with time-based offset\n                    float timeFactor = time * 0.05; // Gentle vertical movement speed\n                    float mixFactor = smoothstep(0.2, 0.8, vUv.y + sin(timeFactor + vUv.x * 2.0) * 0.1);\n                    vec3 mixedColor = mix(color1, color2, mixFactor); // Mix between top (color1) and bottom (color2)\n                    // Adjust saturation and brightness using HSL conversion\n                    vec3 hsl = rgb2hsl(mixedColor);\n                    hsl.y *= saturationFactor; // Apply saturation\n                    hsl.z *= brightnessFactor; // Apply brightness\n                    vec3 finalColor = hsl2rgb(hsl);\n                    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0); // Clamp final color\n                }\n            ",
                    depthTest: false,
                    depthWrite: false
                });
                var backgroundMesh = new THREE.Mesh(geometry, this.backgroundMaterial);
                backgroundMesh.renderOrder = -1; // Ensure it's rendered first/behind
                this.scene.add(backgroundMesh);
            }
        },
        {
            // Removed createSquiggleLayer() method
            key: "createParticleSystem",
            value: function createParticleSystem() {
                this.particleGeometry = createParticles(PARTICLE_COUNT, this.camera);
                // Create a simple square texture using Canvas
                var canvas = document.createElement('canvas');
                canvas.width = 16; // Small texture size
                canvas.height = 16;
                var context = canvas.getContext('2d');
                context.fillStyle = 'white';
                context.fillRect(0, 0, 16, 16); // Fill with white
                var squareTexture = new THREE.CanvasTexture(canvas);
                // Store original size/opacity from material creation
                this.originalParticleSize = 0.5;
                this.originalParticleOpacity = 0.7;
                var particleMaterial = new THREE.PointsMaterial({
                    map: squareTexture,
                    size: this.originalParticleSize,
                    vertexColors: true,
                    sizeAttenuation: true,
                    transparent: true,
                    opacity: this.originalParticleOpacity,
                    depthWrite: false,
                    blending: THREE.NormalBlending
                });
                this.particlePoints = new THREE.Points(this.particleGeometry, particleMaterial);
                // Store the original generated colors
                if (this.particleGeometry.userData.baseColors) {
                    this.originalParticleBaseColors = new Float32Array(this.particleGeometry.userData.baseColors);
                }
                // this.particlePoints.renderOrder = 0.5; // Render order less critical now
                this.scene.add(this.particlePoints);
            }
        },
        {
            // New method to set initial particle state for bright mode
            key: "initializeParticlesForBrightMode",
            value: function initializeParticlesForBrightMode() {
                if (!this.particleGeometry || !this.originalParticleBaseColors || !this.particlePoints) return;
                var baseColors = this.particleGeometry.userData.baseColors;
                var blackColor = new THREE.Color(0x000000);
                var particleCount = this.particleGeometry.userData.count;
                // Set colors to black
                for(var i = 0; i < particleCount; i++){
                    var i3 = i * 3;
                    baseColors[i3] = blackColor.r;
                    baseColors[i3 + 1] = blackColor.g;
                    baseColors[i3 + 2] = blackColor.b;
                }
                this.particleGeometry.attributes.color.needsUpdate = true;
                // Set size and opacity
                this.particlePoints.material.size = this.originalParticleSize * 1.3; // Larger size
                this.particlePoints.material.opacity = this.originalParticleOpacity; // Original opacity
                this.particlePoints.material.needsUpdate = true;
            }
        },
        {
            // Called by Game logic to register an interaction at a world position
            key: "addParticleInteraction",
            value: function addParticleInteraction(worldPosition) {
                // Add a copy to avoid issues if the original vector changes
                this.particleInteractionPoints.push(worldPosition.clone());
            }
        },
        {
            key: "updateParticles",
            value: function updateParticles1(lastMoveDirection) {
                if (this.particleGeometry && this.particlePoints) {
                    // Pass the current interaction points and the direction, then clear interaction points
                    updateParticles(this.particleGeometry, this.particlePoints, this.clock, this.camera, this.particleInteractionPoints, lastMoveDirection); // Pass direction
                    this.particleInteractionPoints = []; // Reset interaction points for next frame
                }
            // Removed squiggle material time update
            }
        },
        {
            key: "adjustCameraToFitGrid",
            value: function adjustCameraToFitGrid(uiHeight = 60) {
                const gridWorldSize = (GRID_SIZE * CELL_SIZE) + ((GRID_SIZE - 1) * CELL_GAP);
                // Padding reduced from 1.25 to 1.05 to make the grid appear ~20% larger
                const padding = 1.05; 
        
                const fov = this.camera.fov * (Math.PI / 180);
                const availableHeight = this.container.clientHeight - uiHeight;
        
                // Calculate the visible height in the world at a distance of 1
                const visibleHeightAtDist1 = 2 * Math.tan(fov / 2);
                const visibleWidthAtDist1 = visibleHeightAtDist1 * this.camera.aspect;
        
                // Calculate the distance required to fit the grid's width and height
                const distanceForWidth = (gridWorldSize * padding) / visibleWidthAtDist1;
                const distanceForHeight = (gridWorldSize * padding) / (visibleHeightAtDist1 * (availableHeight / this.container.clientHeight));
        
                // Use the greater of the two distances to ensure the grid fits on both axes
                const distance = Math.max(distanceForWidth, distanceForHeight);
        
                // Re-introduce the 3/4 angle view
                this.camera.position.set(0, -distance * 0.75, distance);
                this.camera.lookAt(0, 0, 0);
                this.camera.updateProjectionMatrix();
            }
        },
        {
            key: "onWindowResize",
            value: function onWindowResize() {
                var width = this.container.clientWidth;
                var height = this.container.clientHeight;
                this.camera.aspect = width / height;
                
                // Get the UI element to calculate its height for camera adjustment
                const uiContainer = document.getElementById('uiContainer');
                const uiHeight = uiContainer ? uiContainer.offsetHeight : 60; // Fallback height
                this.adjustCameraToFitGrid(uiHeight);

                this.renderer.setSize(width, height);
                this.composer.setSize(width, height); // Update composer size too
                // Update background shader resolution uniform
                if (this.backgroundMaterial) {
                    this.backgroundMaterial.uniforms.resolution.value.set(width, height);
                }
            }
        },
        {
            // Starts the background transition
            key: "setGlowMode",
            value: function setGlowMode(isBright) {
                if (this.isTransitioning) return false; // Возвращаем false, если уже идет переход
                
                // Проверяем, что backgroundMaterial инициализирован
                if (!this.backgroundMaterial || !this.backgroundMaterial.uniforms) {
                    console.warn("[SceneSetup] setGlowMode: backgroundMaterial не инициализирован");
                    return false;
                }
                
                this.targetIsBright = isBright; // Store the final target state
                // --- Immediately update particle base colors based on the target mode ---
                if (this.particleGeometry && this.originalParticleBaseColors) {
                    var baseColors = this.particleGeometry.userData.baseColors;
                    var blackColor = new THREE.Color(0x000000); // Pure black for bright mode
                    var particleCount = this.particleGeometry.userData.count;
                    if (isBright) {
                        // Bright Mode: Black, larger particles
                        this.particlePoints.material.size = this.originalParticleSize * 1.3; // Increase size slightly
                        this.particlePoints.material.opacity = this.originalParticleOpacity; // Keep original opacity for now
                        for(var i = 0; i < particleCount; i++){
                            var i3 = i * 3;
                            baseColors[i3] = blackColor.r;
                            baseColors[i3 + 1] = blackColor.g;
                            baseColors[i3 + 2] = blackColor.b;
                        }
                    } else {
                        // Dark Mode: Restore original colors, size, and opacity
                        this.particlePoints.material.size = this.originalParticleSize;
                        this.particlePoints.material.opacity = this.originalParticleOpacity;
                        for(var i1 = 0; i1 < particleCount; i1++){
                            var i31 = i1 * 3;
                            baseColors[i31] = this.originalParticleBaseColors[i31];
                            baseColors[i31 + 1] = this.originalParticleBaseColors[i31 + 1];
                            baseColors[i31 + 2] = this.originalParticleBaseColors[i31 + 2];
                        }
                    }
                    // Mark the color attribute buffer as needing an update
                    this.particleGeometry.attributes.color.needsUpdate = true;
                    this.particlePoints.material.needsUpdate = true; // Update material properties too
                }
                // --- End Particle Appearance Update ---
                // Store starting values from current uniforms for background transition
                this.startBrightness = this.backgroundMaterial.uniforms.brightnessFactor.value;
                this.startSaturation = this.backgroundMaterial.uniforms.saturationFactor.value;
                this.startColor1.copy(this.backgroundMaterial.uniforms.color1.value);
                this.startColor2.copy(this.backgroundMaterial.uniforms.color2.value);
                // Define target values for background transition based on desired mode
                if (isBright) {
                    // **Bright Mode: Restore original vaporwave colors**
                    this.targetBrightness = 1.0;
                    this.targetSaturation = 1.0; // Full saturation
                    this.targetColor1.copy(this.originalColors.color1); // Original color 1
                    this.targetColor2.copy(this.originalColors.color2); // Original color 2
                } else {
                    // **Dark Mode: Pure Black Background**
                    this.targetBrightness = 0.0; // Set brightness to 0 for black
                    this.targetSaturation = 0.0; // Set saturation to 0 as well (optional, but reinforces black)
                    // Target colors don't strictly matter when brightness is 0, but setting them doesn't hurt
                    this.targetColor1.set(0x000000); // Target black
                    this.targetColor2.set(0x000000); // Target black
                }
                this.isTransitioning = true;
                this.transitionStartTime = this.clock.getElapsedTime(); // Use internal clock
                
                return true; // Возвращаем true, если переход запущен успешно
            }
        },
        {
            // Updates the transition progress - MUST be called in the main animation loop
            key: "updateShaderTransition",
            value: function updateShaderTransition() {
                if (!this.isTransitioning || !this.backgroundMaterial) return;
                var elapsedTime = this.clock.getElapsedTime() - this.transitionStartTime;
                var progress = Math.min(elapsedTime / this.transitionDuration, 1.0);
                // Apply easing (e.g., ease-in-out cubic)
                var easedProgress = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                // Interpolate uniforms (Brightness, Saturation, and Colors)
                var currentBrightness = THREE.MathUtils.lerp(this.startBrightness, this.targetBrightness, easedProgress);
                var currentSaturation = THREE.MathUtils.lerp(this.startSaturation, this.targetSaturation, easedProgress);
                // Interpolate the two colors
                this.backgroundMaterial.uniforms.color1.value.lerpColors(this.startColor1, this.targetColor1, easedProgress);
                this.backgroundMaterial.uniforms.color2.value.lerpColors(this.startColor2, this.targetColor2, easedProgress);
                this.backgroundMaterial.uniforms.brightnessFactor.value = currentBrightness;
                this.backgroundMaterial.uniforms.saturationFactor.value = currentSaturation;
                // Check if transition finished
                if (progress >= 1.0) {
                    this.isTransitioning = false;
                    // Ensure final values are set exactly
                    this.backgroundMaterial.uniforms.brightnessFactor.value = this.targetBrightness;
                    this.backgroundMaterial.uniforms.saturationFactor.value = this.targetSaturation;
                    this.backgroundMaterial.uniforms.color1.value.copy(this.targetColor1);
                    this.backgroundMaterial.uniforms.color2.value.copy(this.targetColor2);
                    // Now apply the bloom pass settings for the target state
                    if (this.bloomPass) {
                        if (this.targetIsBright) {
                            // Apply bloom settings for vibrant background
                            this.bloomPass.strength = 0.5; // Strength for bright mode
                            this.bloomPass.threshold = 0.05; // Threshold for bright mode
                            this.bloomPass.radius = 0.5; // Radius for bright mode
                        } else {
                            // Apply weaker bloom settings for dark background
                            this.bloomPass.strength = 0.6;
                            this.bloomPass.threshold = 0.8; // Higher threshold as background is darker
                            this.bloomPass.radius = 0.5;
                        }
                    }
                // Removed extra closing brace here
                }
            }
        }
    ]);
    return SceneSetup;
}();