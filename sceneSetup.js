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
import { GRID_SIZE, CELL_GAP } from './constants.js'; // Для адаптивного ресета камеры

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
        this.originalColors = {
            color1: new THREE.Color(0xff9ce3),
            color2: new THREE.Color(0x90f2ff) // Bottom color
        };
        this.whiteColor = new THREE.Color(0xffffff); // Target for bright mode
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionDuration = 0.7; // seconds
        this.startBrightness = 1.0;
        this.targetBrightness = 1.0;
        this.startSaturation = 1.0;
        this.targetSaturation = 1.0;
        this.startColor1 = this.originalColors.color1.clone();
        this.startColor2 = this.originalColors.color2.clone();
        this.targetColor1 = this.originalColors.color1.clone();
        this.targetColor2 = this.originalColors.color2.clone();
        this.targetIsBright = true; // Default to bright mode
        // Scene
        this.scene = new THREE.Scene();
        this.createBackgroundGradient(); // Render order -1
        // Camera
        var aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        // --- Адаптивный resetCamera ---
        this.resetCamera();
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
                        }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = vec4(position.xy, 1.0, 1.0); // Directly map to screen
                        }
                    `,
                    fragmentShader: `
                        uniform float time;
                        uniform vec3 color1; // Top
                        uniform vec3 color2; // Bottom
                        uniform vec2 resolution;
                        uniform float brightnessFactor;
                        uniform float saturationFactor;
                        varying vec2 vUv;
                        // Function to convert RGB to HSL (approximation)
                        vec3 rgb2hsl(vec3 color) {
                            float maxC = max(max(color.r, color.g), color.b);
                            float minC = min(min(color.r, color.g), color.b);
                            float l = (maxC + minC) / 2.0;
                            float h = 0.0, s = 0.0;
                            if (maxC != minC) {
                                float d = maxC - minC;
                                s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
                                if (maxC == color.r) h = (color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0);
                                else if (maxC == color.g) h = (color.b - color.r) / d + 2.0;
                                else h = (color.r - color.g) / d + 4.0;
                                h /= 6.0;
                            }
                            return vec3(h, s, l);
                        }
                        // Function to convert HSL to RGB (approximation)
                        float hue2rgb(float p, float q, float t) {
                            if (t < 0.0) t += 1.0;
                            if (t > 1.0) t -= 1.0;
                            if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
                            if (t < 1.0/2.0) return q;
                            if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
                            return p;
                        }
                        vec3 hsl2rgb(vec3 hsl) {
                            float h = hsl.x, s = hsl.y, l = hsl.z;
                            float r, g, b;
                            if (s == 0.0) {
                                r = g = b = l; // achromatic
                            } else {
                                float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
                                float p = 2.0 * l - q;
                                r = hue2rgb(p, q, h + 1.0/3.0);
                                g = hue2rgb(p, q, h);
                                b = hue2rgb(p, q, h - 1.0/3.0);
                            }
                            return vec3(r, g, b);
                        }
                        void main() {
                            // Check for the explicit white mode condition first
                            if (saturationFactor == 0.0 && brightnessFactor == 1.0) {
                                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Pure white
                                return;
                            }
                            // Simple vertical gradient mixing with time-based offset
                            float timeFactor = time * 0.05; // Gentle vertical movement speed
                            float mixFactor = smoothstep(0.2, 0.8, vUv.y + sin(timeFactor + vUv.x * 2.0) * 0.1);
                            vec3 mixedColor = mix(color1, color2, mixFactor); // Mix between top (color1) and bottom (color2)
                            // Adjust saturation and brightness using HSL conversion
                            vec3 hsl = rgb2hsl(mixedColor);
                            hsl.y *= saturationFactor; // Apply saturation
                            hsl.z *= brightnessFactor; // Apply brightness
                            vec3 finalColor = hsl2rgb(hsl);
                            gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0); // Clamp final color
                        }
                    `,
                    depthTest: false,
                    depthWrite: false
                });
                var backgroundMesh = new THREE.Mesh(geometry, this.backgroundMaterial);
                backgroundMesh.renderOrder = -1; // Ensure it's rendered first/behind
                this.scene.add(backgroundMesh);
            }
        },
        {
            key: "createParticleSystem",
            value: function createParticleSystem() {
                this.particleGeometry = createParticles(PARTICLE_COUNT, this.camera);
                var canvas = document.createElement('canvas');
                canvas.width = 16;
                canvas.height = 16;
                var context = canvas.getContext('2d');
                context.fillStyle = 'white';
                context.fillRect(0, 0, 16, 16);
                var squareTexture = new THREE.CanvasTexture(canvas);
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
                if (this.particleGeometry.userData.baseColors) {
                    this.originalParticleBaseColors = new Float32Array(this.particleGeometry.userData.baseColors);
                }
                this.scene.add(this.particlePoints);
            }
        },
        {
            key: "initializeParticlesForBrightMode",
            value: function initializeParticlesForBrightMode() {
                if (!this.particleGeometry || !this.originalParticleBaseColors || !this.particlePoints) return;
                var baseColors = this.particleGeometry.userData.baseColors;
                var blackColor = new THREE.Color(0x000000);
                var particleCount = this.particleGeometry.userData.count;
                for(var i = 0; i < particleCount; i++){
                    var i3 = i * 3;
                    baseColors[i3] = blackColor.r;
                    baseColors[i3 + 1] = blackColor.g;
                    baseColors[i3 + 2] = blackColor.b;
                }
                this.particleGeometry.attributes.color.needsUpdate = true;
                this.particlePoints.material.size = this.originalParticleSize * 1.3;
                this.particlePoints.material.opacity = this.originalParticleOpacity;
                this.particlePoints.material.needsUpdate = true;
            }
        },
        {
            key: "addParticleInteraction",
            value: function addParticleInteraction(worldPosition) {
                this.particleInteractionPoints.push(worldPosition.clone());
            }
        },
        {
            key: "updateParticles",
            value: function updateParticles1(lastMoveDirection) {
                if (this.particleGeometry && this.particlePoints) {
                    updateParticles(this.particleGeometry, this.particlePoints, this.clock, this.camera, this.particleInteractionPoints, lastMoveDirection);
                    this.particleInteractionPoints = [];
                }
            }
        },
        // --- Адаптивный resetCamera: принимает cellSize, автоматически рассчитывает расстояние ---
        {
            key: "resetCamera",
            value: function resetCamera(cellSize) {
                let distance;
                if (typeof cellSize === "number" && cellSize > 0) {
                    const gridSpan = (GRID_SIZE * cellSize + (GRID_SIZE - 1) * CELL_GAP);
                    distance = gridSpan * 1.35;
                } else {
                    distance = 20;
                }
                this.camera.position.set(0, -distance * 0.5, distance);
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
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height);
                this.composer.setSize(width, height);
                if (this.backgroundMaterial) {
                    this.backgroundMaterial.uniforms.resolution.value.set(width, height);
                    this.backgroundMaterial.uniforms.resolution.value.set(width, height);
                }
            }
        },
        {
            key: "setGlowMode",
            value: function setGlowMode(isBright) {
                if (this.isTransitioning) return;
                this.targetIsBright = isBright;
                if (this.particleGeometry && this.originalParticleBaseColors) {
                    var baseColors = this.particleGeometry.userData.baseColors;
                    var blackColor = new THREE.Color(0x000000);
                    var particleCount = this.particleGeometry.userData.count;
                    if (isBright) {
                        this.particlePoints.material.size = this.originalParticleSize * 1.3;
                        this.particlePoints.material.opacity = this.originalParticleOpacity;
                        for(var i = 0; i < particleCount; i++){
                            var i3 = i * 3;
                            baseColors[i3] = blackColor.r;
                            baseColors[i3 + 1] = blackColor.g;
                            baseColors[i3 + 2] = blackColor.b;
                        }
                    } else {
                        this.particlePoints.material.size = this.originalParticleSize;
                        this.particlePoints.material.opacity = this.originalParticleOpacity;
                        for(var i1 = 0; i1 < particleCount; i1++){
                            var i31 = i1 * 3;
                            baseColors[i31] = this.originalParticleBaseColors[i31];
                            baseColors[i31 + 1] = this.originalParticleBaseColors[i31 + 1];
                            baseColors[i31 + 2] = this.originalParticleBaseColors[i31 + 2];
                        }
                    }
                    this.particleGeometry.attributes.color.needsUpdate = true;
                    this.particlePoints.material.needsUpdate = true;
                }
                this.startBrightness = this.backgroundMaterial.uniforms.brightnessFactor.value;
                this.startSaturation = this.backgroundMaterial.uniforms.saturationFactor.value;
                this.startColor1.copy(this.backgroundMaterial.uniforms.color1.value);
                this.startColor2.copy(this.backgroundMaterial.uniforms.color2.value);
                if (isBright) {
                    this.targetBrightness = 1.0;
                    this.targetSaturation = 1.0;
                    this.targetColor1.copy(this.originalColors.color1);
                    this.targetColor2.copy(this.originalColors.color2);
                } else {
                    this.targetBrightness = 0.0;
                    this.targetSaturation = 0.0;
                    this.targetColor1.set(0x000000);
                    this.targetColor2.set(0x000000);
                }
                this.isTransitioning = true;
                this.transitionStartTime = this.clock.getElapsedTime();
            }
        },
        {
            key: "updateShaderTransition",
            value: function updateShaderTransition() {
                if (!this.isTransitioning || !this.backgroundMaterial) return;
                var elapsedTime = this.clock.getElapsedTime() - this.transitionStartTime;
                var progress = Math.min(elapsedTime / this.transitionDuration, 1.0);
                var easedProgress = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                var currentBrightness = THREE.MathUtils.lerp(this.startBrightness, this.targetBrightness, easedProgress);
                var currentSaturation = THREE.MathUtils.lerp(this.startSaturation, this.targetSaturation, easedProgress);
                this.backgroundMaterial.uniforms.color1.value.lerpColors(this.startColor1, this.targetColor1, easedProgress);
                this.backgroundMaterial.uniforms.color2.value.lerpColors(this.startColor2, this.targetColor2, easedProgress);
                this.backgroundMaterial.uniforms.brightnessFactor.value = currentBrightness;
                this.backgroundMaterial.uniforms.saturationFactor.value = currentSaturation;
                if (progress >= 1.0) {
                    this.isTransitioning = false;
                    this.backgroundMaterial.uniforms.brightnessFactor.value = this.targetBrightness;
                    this.backgroundMaterial.uniforms.saturationFactor.value = this.targetSaturation;
                    this.backgroundMaterial.uniforms.color1.value.copy(this.targetColor1);
                    this.backgroundMaterial.uniforms.color2.value.copy(this.targetColor2);
                    if (this.bloomPass) {
                        if (this.targetIsBright) {
                            this.bloomPass.strength = 0.5;
                            this.bloomPass.threshold = 0.05;
                            this.bloomPass.radius = 0.5;
                        } else {
                            this.bloomPass.strength = 0.6;
                            this.bloomPass.threshold = 0.8;
                            this.bloomPass.radius = 0.5;
                        }
                    }
                }
            }
        }
    ]);
    return SceneSetup;
}();