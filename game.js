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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Grid } from './grid.js';
import { InputHandler } from './input.js';
import { SceneSetup } from './sceneSetup.js';
import { Tile } from './tile.js'; // Added missing import
import { TILE_COLORS, GRID_SIZE, TARGET_VALUE, CELL_GAP, CELL_SIZE } from './constants.js'; // Added CELL_GAP and CELL_SIZE
var ANIMATION_DURATION = 150; // ms for tile movement/creation
var WOBBLE_DURATION = 100; // ms for invalid move wobble
var WOBBLE_MAGNITUDE = 0.15; // How far tiles wobble (fraction of CELL_SIZE)
var MUSIC_FADE_DURATION = 5; // Seconds for fade out before loop
// Simple Easing Functions
var easing = {
    // Ease-out cubic: decelerating to zero velocity
    easeOutCubic: function(t) {
        return --t * t * t + 1;
    },
    // Ease-in-out sine: accelerating until halfway, then decelerating
    easeInOutSine: function(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
};
export var Game = /*#__PURE__*/ function() {
    "use strict";
    function Game(container, ui, loadedFont) {
        _class_call_check(this, Game);
        this.container = container;
        this.ui = ui;
        this.loadedFont = loadedFont; // Store font reference if needed later
        this.sceneSetup = new SceneSetup(container);
        // Pass the loadedFont to the Grid constructor
        this.grid = new Grid(GRID_SIZE, this.sceneSetup.scene, this.loadedFont);
        this.inputHandler = new InputHandler(container);
        this.score = 0;
        this.isMoving = false; // Prevent input during animation
        this.animations = []; // Store active animations { tile, targetPos, targetScale, startTime }
        this.gameState = 'playing'; // playing, won, lost
        this.clock = new THREE.Clock(); // Clock for shader timing
        this.lastMoveDirection = new THREE.Vector2(0, 0); // Store last input direction for particles
        // Statistics
        this.highScore = 0;
        this.highestTileValue = 0;
        this.gamesPlayed = 0;
        this.loadStats(); // Load stats from localStorage
        // Audio properties
        this.audioListener = null;
        this.backgroundMusic = null;
        this.musicPlaying = false;
        this.musicDuration = 0;
        this.isFadingOut = false;
        this.fadeTimeout = null;
        this.originalMusicVolume = 0.3; // Store the intended volume
        this.tapSound = null; // Property for the tap sound
        this.mergeSound = null; // Add property for the merge sound
        this.setupAudio(); // Initialize audio components
        this.setupControls();
        this.updateScore(0); // Also updates high score display initially if needed
        this.ui.updateHighestTile(this.highestTileValue); // Update UI with loaded stats
        this.ui.updateGamesPlayed(this.gamesPlayed); // Update UI with loaded stats
    }
    _create_class(Game, [
        {
            // --- Statistics Persistence ---
            key: "loadStats",
            value: function loadStats() {
                this.highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
                this.highestTileValue = parseInt(localStorage.getItem('highestTileValue') || '0', 10);
                this.gamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0', 10);
            }
        },
        {
            key: "saveStats",
            value: function saveStats() {
                localStorage.setItem('highScore', this.highScore.toString());
                localStorage.setItem('highestTileValue', this.highestTileValue.toString());
                localStorage.setItem('gamesPlayed', this.gamesPlayed.toString());
            }
        },
        {
            // --- End Statistics Persistence ---
            key: "setupControls",
            value: function setupControls() {
                var _this = this;
                this.inputHandler.onMove(function(direction) {
                    if (_this.isMoving || _this.gameState === 'lost') return;
                    _this.moveTiles(direction);
                });
            // OrbitControls are removed for production, uncomment if needed for debugging
            // Example: import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
            //          this.controls = new OrbitControls(this.sceneSetup.camera, this.sceneSetup.renderer.domElement);
            //          ... configure controls ...
            }
        },
        {
            key: "setupAudio",
            value: function setupAudio() {
                var _this = this;
                this.audioListener = new THREE.AudioListener();
                this.sceneSetup.camera.add(this.audioListener); // Attach listener to camera
                this.backgroundMusic = new THREE.Audio(this.audioListener);
                this.tapSound = new THREE.Audio(this.audioListener); // Initialize tap sound object
                this.mergeSound = new THREE.Audio(this.audioListener); // Initialize merge sound object
                var audioLoader = new THREE.AudioLoader();
                // Load Background Music
                audioLoader.load('https://play.rosebud.ai/assets/Ethereal Drift.mp3?Gvns', function(buffer) {
                    _this.backgroundMusic.setBuffer(buffer);
                    _this.backgroundMusic.setLoop(false); // Disable internal loop
                    _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                    _this.musicDuration = buffer.duration; // Store duration
                    console.log("Background music loaded. Duration: ".concat(_this.musicDuration, "s"));
                    _this.ui.updateMusicButtonText(_this.musicPlaying); // Update button state
                }, undefined, function(error) {
                    return console.error('Error loading background music:', error);
                });
                // Load Tap Sound
                audioLoader.load('https://play.rosebud.ai/assets/screen-tap-38717.mp3?5AkB', function(buffer) {
                    _this.tapSound.setBuffer(buffer);
                    _this.tapSound.setLoop(false);
                    _this.tapSound.setVolume(0.6); // Adjust volume as needed
                    console.log('Tap sound loaded.');
                }, undefined, function(error) {
                    return console.error('Error loading tap sound:', error);
                });
                // Load Merge Sound
                audioLoader.load('https://play.rosebud.ai/assets/slime-squish-5-218569.mp3?4N1C', function(buffer) {
                    _this.mergeSound.setBuffer(buffer);
                    _this.mergeSound.setLoop(false);
                    _this.mergeSound.setVolume(0.7); // Adjust volume as needed
                    console.log('Merge sound loaded.');
                }, undefined, function(error) {
                    return console.error('Error loading merge sound:', error);
                });
            }
        },
        {
            key: "toggleMusic",
            value: function toggleMusic() {
                var _this = this;
                console.log("toggleMusic called. Music playing:", this.musicPlaying);
                if (!this.backgroundMusic || !this.backgroundMusic.buffer) {
                    console.warn("Attempted to toggle music, but buffer is not loaded.");
                    return; // Don't toggle if not loaded
                }
                // Clear any pending fade/restart timeout if toggling manually
                clearTimeout(this.fadeTimeout);
                this.isFadingOut = false; // Stop any active fade calculation
                console.log("AudioContext state:", this.audioListener.context.state);
                if (this.musicPlaying) {
                    // --- Stop Music ---
                    console.log("Pausing music...");
                    this.backgroundMusic.pause(); // Use pause to preserve current time for potential resume
                    this.musicPlaying = false;
                    // Reset volume to original in case it was paused mid-fade
                    this.backgroundMusic.setVolume(this.originalMusicVolume);
                } else {
                    // --- Start Music ---
                    var playMusic = function() {
                        console.log("Playing music...");
                        // Ensure volume is correct before playing
                        _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                        _this.backgroundMusic.play();
                        _this.musicPlaying = true;
                        _this.isFadingOut = false; // Reset fade state on new play
                        _this.ui.updateMusicButtonText(_this.musicPlaying);
                    };
                    // IMPORTANT: Resume audio context on first user interaction
                    if (this.audioListener.context.state === 'suspended') {
                        console.log("AudioContext is suspended, attempting to resume...");
                        this.audioListener.context.resume().then(function() {
                            console.log("AudioContext resumed.");
                            playMusic();
                        }).catch(function(e) {
                            return console.error("Error resuming AudioContext:", e);
                        });
                    } else {
                        playMusic();
                    }
                }
                // Always update the UI text based on the intended state immediately
                // (unless waiting for context resume, handled in playMusic)
                if (this.audioListener.context.state !== 'suspended') {
                    this.ui.updateMusicButtonText(this.musicPlaying);
                }
            }
        },
        {
            key: "start",
            value: function start() {
                // Increment games played on first start
                this.gamesPlayed++;
                this.saveStats();
                this.ui.updateGamesPlayed(this.gamesPlayed);
                // --- Standard Start State ---
                this.grid.clear(); // Ensure grid is empty
                // --- Removed Advanced Start Logic ---
                // const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
                // let valueIndex = 0;
                // if (!this.loadedFont) {
                //     console.error("Cannot populate board: Font not loaded yet.");
                //     // Fallback to original start? Or just show empty grid?
                //     // Let's fallback to original for now
                //     this.grid.addRandomTile();
                //     this.grid.addRandomTile();
                //     this.animate();
                //     return;
                // }
                // for (let r = 0; r < this.grid.size; r++) {
                //     for (let c = 0; c < this.grid.size; c++) {
                //         if (valueIndex < values.length) {
                //             const value = values[valueIndex++];
                //             console.log(`Attempting to create tile: Value=${value}, Pos=(${r}, ${c})`); // Log attempt
                //             try {
                //                 // Create the tile instance directly, passing the font
                //                 const tile = new Tile(value, c, r, this.loadedFont); // This should now work
                //                 if (!tile) {
                //                      console.error(`Tile constructor returned null/undefined for value ${value}`);
                //                      continue; // Skip this iteration if tile creation failed fundamentally
                //                 }
                //                  if (!tile.mesh) {
                //                      console.error(`Tile object created for value ${value}, but tile.mesh is missing!`);
                //                      continue; // Skip if mesh wasn't created
                //                  }
                //                 console.log(` > Tile ${value} created. Mesh found.`);
                //                 // Manually set its position using grid helper
                //                 const position = this.grid.getCellPosition(c, r);
                //                  if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
                //                      console.error(` > Invalid position calculated for (${r}, ${c}):`, position);
                //                      continue; // Skip if position is bad
                //                  }
                //                 console.log(` > Calculated position:`, position);
                //                 tile.mesh.position.copy(position);
                //                 // Add the tile to the logical grid array
                //                 this.grid.cells[r][c] = tile;
                //                 console.log(` > Added tile ${value} to logical grid cells[${r}][${c}]`);
                //                 // Add the tile's mesh to the scene via the grid's group
                //                 this.grid.gridGroup.add(tile.mesh);
                //                  console.log(` > Added tile ${value} mesh to gridGroup.`);
                //             } catch (error) {
                //                 console.error(` > Error during creation/adding tile value ${value} at (${r}, ${c}):`, error);
                //                 // Skipping this tile on error
                //             }
                //         } else {
                //             // Stop adding tiles once all values are used
                //             break;
                //         }
                //     }
                //      if (valueIndex >= values.length) break; // Exit outer loop too
                // }
                // --- End Removed Advanced Start Logic ---
                // Original start logic (now re-enabled)
                this.grid.addRandomTile();
                this.grid.addRandomTile();
                this.animate(); // Start the animation loop
            }
        },
        {
            key: "reset",
            value: function reset() {
                // Increment games played on reset
                this.gamesPlayed++;
                this.saveStats();
                this.ui.updateGamesPlayed(this.gamesPlayed);
                this.grid.clear();
                this.score = 0;
                this.updateScore(0); // Update score and potentially high score display
                this.isMoving = false;
                this.animations = [];
                this.gameState = 'playing';
                this.ui.hideMessage();
                this.grid.addRandomTile();
                this.grid.addRandomTile();
                // Reset camera if needed
                this.sceneSetup.resetCamera();
                // if (this.controls) this.controls.reset(); // Uncomment if using OrbitControls
                // Stop music and clear any fade timeouts on reset
                clearTimeout(this.fadeTimeout);
                if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.stop(); // Use stop to reset playback fully
                }
                this.musicPlaying = false;
                this.isFadingOut = false;
                if (this.backgroundMusic) {
                    this.backgroundMusic.setVolume(this.originalMusicVolume);
                }
                this.ui.updateMusicButtonText(this.musicPlaying);
            }
        },
        {
            key: "moveTiles",
            value: function moveTiles(direction) {
                var _this = this;
                if (this.isMoving) return;
                var moveResult = this.grid.moveTiles(direction);
                if (moveResult.moved) {
                    // --- Hide win message if player continues playing ---
                    if (this.gameState === 'won') {
                        this.ui.hideMessage();
                    // Optional: Change state e.g., this.gameState = 'playing_post_win';
                    }
                    // --- Check if the move involved merges ---
                    var hasMerges = moveResult.animations.some(function(anim) {
                        return anim.type === 'merge';
                    });
                    // --- Play Tap Sound Only if NOT Merging ---
                    if (!hasMerges && this.tapSound && this.tapSound.buffer) {
                        if (this.audioListener.context.state === 'suspended') {
                            this.audioListener.context.resume();
                        }
                        if (this.tapSound.isPlaying) {
                            this.tapSound.stop();
                        }
                        this.tapSound.play();
                    }
                    // --- End Tap Sound Logic ---
                    this.lastMoveDirection.set(direction.x, direction.y); // Store the direction
                    this.isMoving = true;
                    this.score += moveResult.score;
                    this.updateScore(this.score);
                    // --- Add Anticipation Movement ---
                    var anticipationAmount = 0.2; // How much to shift (fraction of gap)
                    var dirVec = new THREE.Vector3(direction.x, direction.y, 0);
                    var anticipationOffset = dirVec.multiplyScalar(anticipationAmount * CELL_GAP);
                    // ---
                    moveResult.animations.forEach(function(anim) {
                        var tile = anim.tile;
                        var targetPos = _this.grid.getCellPosition(anim.to.x, anim.to.y);
                        // Apply anticipation offset *before* capturing startPos for non-merge-targets
                        if (anim.type === 'move' || anim.type === 'merge-source') {
                            tile.mesh.position.add(anticipationOffset);
                        }
                        var startPos = tile.mesh.position.clone(); // Capture position *after* potential offset
                        // Calculate world position for particle interaction
                        var worldTargetPos = _this.grid.gridGroup.localToWorld(targetPos.clone());
                        // Handle merges visually
                        if (anim.mergedFrom) {
                            // Move original tiles to merge point, then spawn new one
                            anim.mergedFrom.forEach(function(oldTile) {
                                var oldStartPos = oldTile.mesh.position.clone();
                                _this.animations.push({
                                    tile: oldTile,
                                    targetPos: targetPos,
                                    startPos: oldStartPos,
                                    startTime: Date.now(),
                                    type: 'merge-source',
                                    duration: ANIMATION_DURATION / 2
                                });
                            });
                            // New merged tile flashes in
                            tile.mesh.position.copy(targetPos); // Place immediately
                            // tile.mesh.scale.set(0.1, 0.1, 0.1); // Removed scaling start
                            _this.animations.push({
                                tile: tile,
                                originalColor: tile.mesh.material.color.clone(),
                                flashColor: new THREE.Color(0xffffff),
                                startTime: Date.now() + ANIMATION_DURATION / 2,
                                type: 'flash',
                                duration: ANIMATION_DURATION // Use full duration for the flash effect
                            });
                            _this.sceneSetup.addParticleInteraction(worldTargetPos);
                            // Update highest tile value if merged tile is higher
                            if (tile.value > _this.highestTileValue) {
                                _this.highestTileValue = tile.value;
                                _this.saveStats();
                                _this.ui.updateHighestTile(_this.highestTileValue);
                            }
                            // --- Play Merge Sound ---
                            if (_this.mergeSound && _this.mergeSound.buffer) {
                                if (_this.audioListener.context.state === 'suspended') {
                                    _this.audioListener.context.resume();
                                }
                                if (_this.mergeSound.isPlaying) {
                                    _this.mergeSound.stop();
                                }
                                _this.mergeSound.play();
                            }
                        // --- End Merge Sound ---
                        } else if (anim.type === 'move') {
                            // Simple move - startPos already captured after offset
                            _this.animations.push({
                                tile: tile,
                                targetPos: targetPos,
                                startPos: startPos,
                                startTime: Date.now(),
                                type: 'move',
                                duration: ANIMATION_DURATION
                            });
                            // Add interaction point for the move destination
                            _this.sceneSetup.addParticleInteraction(worldTargetPos);
                        }
                    });
                    // Delayed adding of new tile to allow movement animations to start/finish
                    setTimeout(function() {
                        var newTile = _this.grid.addRandomTile();
                        if (newTile) {
                            var targetPos = _this.grid.getCellPosition(newTile.x, newTile.y);
                            newTile.mesh.position.copy(targetPos); // Place immediately
                            // newTile.mesh.scale.set(0.1, 0.1, 0.1); // Removed scaling start
                            _this.animations.push({
                                tile: newTile,
                                originalColor: newTile.mesh.material.color.clone(),
                                flashColor: new THREE.Color(0xffffff),
                                startTime: Date.now(),
                                type: 'flash',
                                duration: ANIMATION_DURATION
                            });
                        }
                        // Check game state after new tile is added (logically)
                        if (_this.gameState !== 'won' && _this.grid.checkWinCondition(TARGET_VALUE)) {
                            _this.gameState = 'won';
                            _this.ui.showMessage('You Win! Keep playing?');
                        } else if (!_this.grid.canMove()) {
                            _this.gameState = 'lost';
                            _this.ui.showMessage('Game Over!');
                        }
                    // isMoving will be set to false when all animations complete in the update loop
                    }, moveResult.moved ? ANIMATION_DURATION : 0); // Add delay only if tiles actually moved or merged
                } else {
                    // --- Trigger Wobble Animation on Invalid Move ---
                    this.triggerWobbleAnimation(direction);
                    // ---
                    // Check for game over even if no tiles moved this turn (after potential wobble)
                    if (this.gameState === 'playing' && !this.grid.canMove()) {
                        this.gameState = 'lost';
                        this.ui.showMessage('Game Over!');
                    }
                }
            }
        },
        {
            key: "triggerWobbleAnimation",
            value: function triggerWobbleAnimation(direction) {
                if (this.isMoving) return; // Don't wobble if already animating something else
                this.isMoving = true; // Prevent input during wobble
                var wobbleVec = new THREE.Vector3(direction.x, direction.y, 0);
                for(var r = 0; r < this.grid.size; r++){
                    for(var c = 0; c < this.grid.size; c++){
                        var tile = this.grid.cells[r][c];
                        if (tile) {
                            this.animations.push({
                                tile: tile,
                                type: 'wobble',
                                startTime: Date.now(),
                                duration: WOBBLE_DURATION,
                                direction: wobbleVec.clone(),
                                originalPos: tile.mesh.position.clone(),
                                magnitude: WOBBLE_MAGNITUDE * CELL_SIZE // Now defined via import
                            });
                        }
                    }
                }
            }
        },
        {
            key: "updateScore",
            value: function updateScore(newScore) {
                this.score = newScore;
                this.ui.updateScore(this.score);
                // Check and update high score
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveStats(); // Save whenever high score changes
                }
                // Always update the high score display (even if score didn't beat it, ensures initial display)
                this.ui.updateHighScore(this.highScore);
            }
        },
        {
            // --- Animation Update Helpers ---
            key: "_updateMoveAnimation",
            value: function _updateMoveAnimation(anim, progress) {
                var easedProgress = easing.easeOutCubic(progress);
                anim.tile.mesh.position.lerpVectors(anim.startPos, anim.targetPos, easedProgress);
            }
        },
        {
            key: "_updateFlashAnimation",
            value: function _updateFlashAnimation(anim, progress) {
                var flashIntensity = easing.easeInOutSine(progress * 2 > 1 ? 2 - progress * 2 : progress * 2);
                anim.tile.mesh.material.color.lerpColors(anim.originalColor, anim.flashColor, flashIntensity);
            }
        },
        {
            key: "_updateWobbleAnimation",
            value: function _updateWobbleAnimation(anim, progress) {
                var wobbleIntensity = easing.easeInOutSine(progress * 2 > 1 ? 2 - progress * 2 : progress * 2);
                var wobbleOffset = wobbleIntensity * anim.magnitude;
                var wobbleDisplacement = anim.direction.clone().multiplyScalar(wobbleOffset);
                anim.tile.mesh.position.copy(anim.originalPos).add(wobbleDisplacement);
            }
        },
        {
            // --- Animation Finalization Helpers ---
            key: "_finalizeMoveAnimation",
            value: function _finalizeMoveAnimation(anim) {
                anim.tile.mesh.position.copy(anim.targetPos);
            }
        },
        {
            key: "_finalizeFlashAnimation",
            value: function _finalizeFlashAnimation(anim) {
                anim.tile.mesh.material.color.copy(anim.originalColor);
            }
        },
        {
            key: "_finalizeMergeSourceAnimation",
            value: function _finalizeMergeSourceAnimation(anim) {
                this.grid.removeTileMesh(anim.tile);
            }
        },
        {
            key: "_finalizeWobbleAnimation",
            value: function _finalizeWobbleAnimation(anim) {
                anim.tile.mesh.position.copy(anim.originalPos);
            }
        },
        {
            key: "updateAnimations",
            value: function updateAnimations() {
                var now = Date.now();
                var stillAnimating = false;
                // Iterate backwards to safely remove elements using splice
                for(var i = this.animations.length - 1; i >= 0; i--){
                    var anim = this.animations[i];
                    var elapsed = now - anim.startTime;
                    var progress = Math.min(elapsed / anim.duration, 1);
                    // Apply interpolation based on type using helper functions
                    if (anim.type === 'move' || anim.type === 'merge-source') {
                        this._updateMoveAnimation(anim, progress);
                    } else if (anim.type === 'flash') {
                        this._updateFlashAnimation(anim, progress);
                    } else if (anim.type === 'wobble') {
                        this._updateWobbleAnimation(anim, progress);
                    }
                    // Check if animation is finished
                    if (progress >= 1) {
                        // Set final state using helper functions
                        if (anim.type === 'move') {
                            this._finalizeMoveAnimation(anim);
                        } else if (anim.type === 'flash') {
                            this._finalizeFlashAnimation(anim);
                        } else if (anim.type === 'merge-source') {
                            this._finalizeMergeSourceAnimation(anim);
                        } else if (anim.type === 'wobble') {
                            this._finalizeWobbleAnimation(anim);
                        }
                        // Remove completed animation from the array
                        this.animations.splice(i, 1);
                    } else {
                        // If any animation is not finished, set the flag
                        stillAnimating = true;
                    }
                }
                // Check if all animations are done
                if (!stillAnimating && this.isMoving) {
                    this.isMoving = false; // Allow next input
                    // Final check for game over after animations complete and new tile is placed
                    if (this.gameState === 'playing' && !this.grid.canMove()) {
                        this.gameState = 'lost';
                        this.ui.showMessage('Game Over!');
                        // Save stats one last time on game over, just in case
                        this.saveStats();
                    }
                }
            }
        },
        {
            key: "checkMusicLoopFade",
            value: function checkMusicLoopFade() {
                var _this = this;
                var _this_backgroundMusic, _this_audioListener;
                if (!this.musicPlaying || this.isFadingOut || !((_this_backgroundMusic = this.backgroundMusic) === null || _this_backgroundMusic === void 0 ? void 0 : _this_backgroundMusic.isPlaying) || !this.musicDuration || this.musicDuration === 0 || !((_this_audioListener = this.audioListener) === null || _this_audioListener === void 0 ? void 0 : _this_audioListener.context)) {
                    return; // Added check for audioListener context
                }
                // Calculate playback time manually using AudioContext time and internal audio properties
                var contextTime = this.audioListener.context.currentTime;
                var startTime = this.backgroundMusic.startTime || 0; // Time when play() was last called
                var offset = this.backgroundMusic.offset || 0; // Offset within the buffer where playback started
                var playbackTime = (contextTime - startTime + offset) % this.musicDuration; // Modulo duration for looping tracks
                var fadeStartTime = this.musicDuration - MUSIC_FADE_DURATION;
                if (playbackTime >= fadeStartTime) {
                    console.log("Starting music fade out at ".concat(playbackTime.toFixed(2), "s (Context Time: ").concat(contextTime.toFixed(2), ")"));
                    this.isFadingOut = true;
                    var gainNode = this.backgroundMusic.getOutput();
                    var now = this.audioListener.context.currentTime;
                    // Schedule the fade using linearRamp
                    gainNode.gain.setValueAtTime(gainNode.gain.value, now); // Start ramp from current value
                    gainNode.gain.linearRampToValueAtTime(0, now + MUSIC_FADE_DURATION);
                    // Schedule the restart slightly after the fade completes
                    this.fadeTimeout = setTimeout(function() {
                        // Check if music should still be playing (user might have paused/reset)
                        if (_this.backgroundMusic && _this.musicPlaying) {
                            console.log("Fade complete, restarting music.");
                            _this.backgroundMusic.stop(); // Stop playback fully
                            // Volume is already 0 from fade, setVolume before next play
                            _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                            _this.backgroundMusic.play(); // Restart from beginning
                            _this.isFadingOut = false; // Ready for next fade cycle
                        } else {
                            console.log("Fade timeout completed, but music was stopped/paused.");
                            // Ensure volume is reset if stopped mid-fade restart process
                            if (_this.backgroundMusic) _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                            _this.isFadingOut = false;
                        }
                    }, MUSIC_FADE_DURATION * 1000 + 50); // Add 50ms buffer
                }
            }
        },
        {
            key: "animate",
            value: function animate() {
                var _this = this;
                requestAnimationFrame(function() {
                    return _this.animate();
                });
                this.updateAnimations();
                this.checkMusicLoopFade(); // Check for music fade/loop
                // Update background shader time uniform
                if (this.sceneSetup.backgroundMaterial) {
                    this.sceneSetup.backgroundMaterial.uniforms.time.value = this.clock.getElapsedTime();
                }
                // Update the shader transition (if active)
                this.sceneSetup.updateShaderTransition();
                // Update particles, passing the last move direction
                this.sceneSetup.updateParticles(this.lastMoveDirection);
                // if (this.controls) this.controls.update(); // Uncomment if using OrbitControls
                // Use the composer to render the scene with post-processing effects
                this.sceneSetup.composer.render();
            }
        }
    ]);
    return Game;
}();
