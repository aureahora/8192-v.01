// --- CloudSaves Integration ---
import { CloudSaves } from './cloudSaves.js';
import { translations, getUserLanguage } from './localization.js';

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
import { Tile } from './tile.js';
import { TILE_COLORS, GRID_SIZE, TARGET_VALUE, CELL_GAP, CELL_SIZE } from './constants.js';

// --- Audio file paths ---
const BACKGROUND_MUSIC_PATH = './background.mp3';
const TAP_SOUND_PATH = './collisioncub.mp3';
const MERGE_SOUND_PATH = './surgemergers.mp3';

var ANIMATION_DURATION = 150;
var WOBBLE_DURATION = 100;
var WOBBLE_MAGNITUDE = 0.15;
var MUSIC_FADE_DURATION = 5;

var easing = {
    easeOutCubic: function(t) {
        return --t * t * t + 1;
    },
    easeInOutSine: function(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
};

// --- GamePush: Функция ожидания SDK ---
function callGameStartWhenReady() {
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(() => {
        if (window.gamePushSDK) {
            if (typeof window.gamePushSDK.gameStart === "function") {
                window.gamePushSDK.gameStart();
                console.log("[Game.js] window.gamePushSDK.gameStart() успешно вызван через ожидание.");
            } else {
                console.log("[Game.js] GamePushSDK обнаружен, но метод gameStart отсутствует.");
            }
            clearInterval(interval);
        } else if (++attempts > maxAttempts) {
            clearInterval(interval);
            console.warn("[Game.js] GamePushSDK не обнаружен после ожидания.");
        }
    }, 100);
}

// --- GamePush: Геймплей-методы ---
function callGameplayStart() {
    if (window.gamePushSDK && typeof window.gamePushSDK.gameplayStart === "function") {
        window.gamePushSDK.gameplayStart();
        console.log("[Game.js] GamePushSDK.gameplayStart() вызван.");
    }
}
function callGameplayStop() {
    if (window.gamePushSDK && typeof window.gamePushSDK.gameplayStop === "function") {
        window.gamePushSDK.gameplayStop();
        console.log("[Game.js] GamePushSDK.gameplayStop() вызван.");
    }
}

// --- CloudSaves: defaults для glow/music ---
function getDefaultGlow() { return 0; } // bright
function getDefaultMusic() { return 0; } // off

export var Game = /*#__PURE__*/ function() {
    "use strict";
    function Game(container, ui, loadedFont, cloudLoadedStats) {
        _class_call_check(this, Game);
        this.container = container;
        this.ui = ui;
        this.loadedFont = loadedFont;
        this.sceneSetup = new SceneSetup(container);
        this.grid = new Grid(GRID_SIZE, this.sceneSetup.scene, this.loadedFont);
        this.inputHandler = new InputHandler(container);
        this.score = 0;
        this.isMoving = false;
        this.animations = [];
        this.gameState = 'playing';
        this.clock = new THREE.Clock();
        this.lastMoveDirection = new THREE.Vector2(0, 0);

        // --- CloudSaves: инициализация из облака, падение на локальное если облако пусто ---
        this.highScore = cloudLoadedStats?.best ?? parseInt(localStorage.getItem('highScore') || '0', 10);
        this.score = cloudLoadedStats?.playscore ?? 0;
        this.highestTileValue = cloudLoadedStats?.maxtile ?? parseInt(localStorage.getItem('highestTileValue') || '0', 10);
        this.gamesPlayed = cloudLoadedStats?.games ?? parseInt(localStorage.getItem('gamesPlayed') || '0', 10);
        this.isGlowBright = (cloudLoadedStats?.glow ?? getDefaultGlow()) === 0;
        this.musicPlaying = (cloudLoadedStats?.music ?? getDefaultMusic()) === 1;
        this.audioListener = null;
        this.backgroundMusic = null;
        this.musicDuration = 0;
        this.isFadingOut = false;
        this.fadeTimeout = null;
        this.originalMusicVolume = 0.3;
        this.tapSound = null;
        this.mergeSound = null;

        // --- Прогресс: восстановление из облака ---
        this.progress = cloudLoadedStats?.progress ? this.parseProgress(cloudLoadedStats.progress) : null;
        this.progressRestored = false;
        
        if (this.progress) {
            this.progressRestored = this.restoreProgress(this.progress);
            if (this.progressRestored) {
                console.log('[Game.js] Прогресс игры успешно восстановлен из облака.');
            } else {
                console.log('[Game.js] Не удалось восстановить прогресс, будет начата новая игра.');
                this.progress = null; // Сбрасываем невалидный прогресс
            }
        } else {
            console.log('[Game.js] Нет сохраненного прогресса, будет начата новая игра.');
        }

        // Событие для восстановления музыки после фокуса/скрытия вкладки
        this._wasMutedByVisibility = false; // Флаг, чтобы понимать, что пауза была из-за потери фокуса

        this.setupAudio();
        this.setupControls();
        this.updateScore(this.score);
        this.ui.updateHighestTile(this.highestTileValue);
        this.ui.updateGamesPlayed(this.gamesPlayed);
        this.sceneSetup.setGlowMode(this.isGlowBright);
        this.ui.updateGlowButtonText(this.isGlowBright);
        this.ui.updateMusicButtonText(this.musicPlaying);

        // ИНИЦИАЛИЗАЦИЯ GamePush SDK событий управления звуком
        this.initSoundSDKIntegration();

        // ИНИЦИАЛИЗАЦИЯ событий видимости вкладки
        this.initVisibilityEvents();

        console.log("[Game.js] Game instance created.");
    }
    _create_class(Game, [
        {
            // --- Метод для сериализации всей игровой ситуации ---
            key: "getProgressObject",
            value: function getProgressObject() {
                let gridState = [];
                for (let r = 0; r < this.grid.size; r++) {
                    for (let c = 0; c < this.grid.size; c++) {
                        const tile = this.grid.cells[r][c];
                        if (tile) {
                            gridState.push({
                                x: c,
                                y: r,
                                value: tile.value
                            });
                        }
                    }
                }
                return {
                    score: this.score,
                    highScore: this.highScore,
                    highestTileValue: this.highestTileValue,
                    gamesPlayed: this.gamesPlayed,
                    grid: gridState,
                    lastSavedTime: new Date().toISOString()
                };
            }
        },
        {
            // --- Восстановление прогресса из объекта ---
            key: "restoreProgress",
            value: function restoreProgress(progressObj) {
                if (!progressObj || !progressObj.grid || !Array.isArray(progressObj.grid)) {
                    console.error('[Game.js] Невозможно восстановить прогресс: данные отсутствуют или имеют неверный формат.');
                    return false;
                }

                try {
                    // Очищаем сетку
                    this.grid.clear();
                    
                    // Восстанавливаем состояние игрового поля
                    for (let i = 0; i < progressObj.grid.length; i++) {
                        const tileData = progressObj.grid[i];
                        if (tileData && typeof tileData.x === 'number' && 
                            typeof tileData.y === 'number' && 
                            typeof tileData.value === 'number') {
                            
                            // Создаем новый тайл с сохраненным значением и позицией
                            const tile = new Tile(tileData.value, tileData.x, tileData.y, this.loadedFont);
                            
                            // Добавляем тайл на сетку
                            this.grid.cells[tileData.y][tileData.x] = tile;
                            
                            // Устанавливаем позицию в 3D пространстве
                            const position = this.grid.getCellPosition(tileData.x, tileData.y);
                            tile.mesh.position.copy(position);
                            
                            // Добавляем меш тайла на сцену
                            this.grid.gridGroup.add(tile.mesh);
                        }
                    }
                    
                    // Восстанавливаем счет и статистику
                    this.score = progressObj.score || 0;
                    if (progressObj.highScore && progressObj.highScore > this.highScore) {
                        this.highScore = progressObj.highScore;
                    }
                    if (progressObj.highestTileValue && progressObj.highestTileValue > this.highestTileValue) {
                        this.highestTileValue = progressObj.highestTileValue;
                    }
                    if (progressObj.gamesPlayed) {
                        this.gamesPlayed = progressObj.gamesPlayed;
                    }
                    
                    console.log('[Game.js] Восстановлено', progressObj.grid.length, 'тайлов, счет:', this.score);
                    return true;
                } catch (error) {
                    console.error('[Game.js] Ошибка при восстановлении прогресса:', error);
                    return false;
                }
            }
        },
        {
            // --- Парсинг JSON прогресса ---
            key: "parseProgress",
            value: function parseProgress(progressStr) {
                if (!progressStr) return null;
                
                try {
                    // Если это уже объект, просто вернем его
                    if (typeof progressStr === 'object') {
                        return progressStr;
                    }
                    
                    // Если это строка, попробуем распарсить как JSON
                    return JSON.parse(progressStr);
                } catch (error) {
                    console.error('[Game.js] Ошибка при парсинге прогресса:', error);
                    return null;
                }
            }
        },
        {
            // --- Сохраняет прогресс в облако ---
            key: "saveProgress",
            value: function saveProgress() {
                var self = this;
                // Проверяем, что есть хотя бы один куб на поле
                let hasTiles = false;
                for(let r = 0; r < this.grid.size; r++) {
                    for(let c = 0; c < this.grid.size; c++) {
                        if(this.grid.cells[r][c]) {
                            hasTiles = true;
                            break;
                        }
                    }
                    if(hasTiles) break;
                }
                
                // Сохраняем только если есть что сохранять
                if(hasTiles && this.gameState !== 'lost') {
                    const progressObj = this.getProgressObject();
                    const progressJson = JSON.stringify(progressObj);
                    
                    console.log('[Game.js] Сохраняем прогресс в облако: кубиков =', 
                                progressObj.grid.length, 'счет =', progressObj.score);
                    
                    return CloudSaves.save('progress', progressJson)
                        .then(function() {
                            console.log('[Game.js] Прогресс успешно сохранен в облако');
                            return true;
                        })
                        .catch(function(error) {
                            console.error('[Game.js] Ошибка при сохранении прогресса:', error);
                            return false;
                        });
                } else {
                    console.log('[Game.js] Нет активной игры для сохранения прогресса');
                    return Promise.resolve(false);
                }
            }
        },
        {
            key: "initSoundSDKIntegration",
            value: function initSoundSDKIntegration() {
                // ... (оставляем как есть, без изменений)
            }
        },
        {
            key: "initVisibilityEvents",
            value: function initVisibilityEvents() {
                // ... (оставляем как есть, без изменений)
            }
        },
        {
            key: "loadStats",
            value: function loadStats() {
                // --- убираем, теперь работаем через облако ---
            }
        },
        {
            // --- Теперь saveStats вызывается только вручную (по кнопке Save!) ---
            key: "saveStats",
            value: function saveStats() {
                var self = this;
                // --- Локальное сохранение ---
                localStorage.setItem('highScore', self.highScore.toString());
                localStorage.setItem('highestTileValue', self.highestTileValue.toString());
                localStorage.setItem('gamesPlayed', self.gamesPlayed.toString());
                // --- CloudSaves ---
                return CloudSaves.saveAll({
                    best: self.highScore,
                    playscore: self.score,
                    maxtile: self.highestTileValue,
                    games: self.gamesPlayed,
                    glow: self.isGlowBright ? 0 : 1,
                    music: self.musicPlaying ? 1 : 0,
                }).then(function() {
                    console.log("[Game.js] Saved stats: highScore = " + self.highScore + ", highestTileValue = " + self.highestTileValue + ", gamesPlayed = " + self.gamesPlayed + " [Cloud sync]");
                    return true;
                }).catch(function(e) {
                    console.error("[Game.js] Ошибка CloudSaves.saveAll:", e);
                    throw e;
                });
            }
        },
        {
            key: "setupControls",
            value: function setupControls() {
                var _this = this;
                this.inputHandler.onMove(function(direction) {
                    if (_this.isMoving || _this.gameState === 'lost') return;
                    _this.moveTiles(direction);
                });
            }
        },
        {
            key: "setupAudio",
            value: function setupAudio() {
                var _this = this;
                this.audioListener = new THREE.AudioListener();
                this.sceneSetup.camera.add(this.audioListener);
                this.backgroundMusic = new THREE.Audio(this.audioListener);
                this.tapSound = new THREE.Audio(this.audioListener);
                this.mergeSound = new THREE.Audio(this.audioListener);
                var audioLoader = new THREE.AudioLoader();
                audioLoader.load(BACKGROUND_MUSIC_PATH, function(buffer) {
                    _this.backgroundMusic.setBuffer(buffer);
                    _this.backgroundMusic.setLoop(false);
                    _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                    _this.musicDuration = buffer.duration;
                    _this.ui.updateMusicButtonText(_this.musicPlaying);

                    if (window.gamePushSDK) {
                        if (!window.gamePushSDK.sounds.isMusicMuted) {
                            _this.musicPlaying = true;
                            _this.backgroundMusic.play();
                            _this.ui.updateMusicButtonText(true);
                        } else {
                            _this.musicPlaying = false;
                            _this.backgroundMusic.pause();
                            _this.ui.updateMusicButtonText(false);
                        }
                    } else if (_this.musicPlaying) {
                        _this.toggleMusic();
                    }
                }, undefined, function(error) {
                    return console.error('[Game.js] Error loading background music:', error);
                });
                audioLoader.load(TAP_SOUND_PATH, function(buffer) {
                    _this.tapSound.setBuffer(buffer);
                    _this.tapSound.setLoop(false);
                    _this.tapSound.setVolume(0.6);
                }, undefined, function(error) {
                    return console.error('[Game.js] Error loading tap sound:', error);
                });
                audioLoader.load(MERGE_SOUND_PATH, function(buffer) {
                    _this.mergeSound.setBuffer(buffer);
                    _this.mergeSound.setLoop(false);
                    _this.mergeSound.setVolume(0.7);
                }, undefined, function(error) {
                    return console.error('[Game.js] Error loading merge sound:', error);
                });
            }
        },
        {
            key: "toggleMusic",
            value: function toggleMusic() {
                if (!window.gamePushSDK) {
                    if (!this.backgroundMusic || !this.backgroundMusic.buffer) {
                        return;
                    }
                    clearTimeout(this.fadeTimeout);
                    this.isFadingOut = false;
                    if (this.musicPlaying) {
                        this.backgroundMusic.pause();
                        this.musicPlaying = false;
                        this.backgroundMusic.setVolume(this.originalMusicVolume);
                    } else {
                        var playMusic = () => {
                            this.backgroundMusic.setVolume(this.originalMusicVolume);
                            this.backgroundMusic.play();
                            this.musicPlaying = true;
                            this.isFadingOut = false;
                            this.ui.updateMusicButtonText(this.musicPlaying);
                        };
                        if (this.audioListener.context.state === 'suspended') {
                            this.audioListener.context.resume().then(() => playMusic())
                                .catch(e => console.error("[Game.js] Error resuming AudioContext:", e));
                        } else {
                            playMusic();
                        }
                    }
                    if (this.audioListener.context.state !== 'suspended') {
                        this.ui.updateMusicButtonText(this.musicPlaying);
                    }
                    return;
                }
                if (window.gamePushSDK.sounds.isMusicMuted) {
                    window.gamePushSDK.sounds.unmuteMusic();
                } else {
                    window.gamePushSDK.sounds.muteMusic();
                }
            }
        },
        {
            key: "start",
            value: function start() {
                // Проверяем, что прогресс валидный и в нем есть непустой массив кубиков
                const hasValidProgress = this.progressRestored && this.progress && 
                                        this.progress.grid && 
                                        Array.isArray(this.progress.grid) && 
                                        this.progress.grid.length > 0;
                if (hasValidProgress) {
                    // Игра стартует с восстановленным прогрессом
                    console.log('[Game.js] Запуск игры с восстановленным прогрессом. Кубиков:', this.progress.grid.length);
                    
                    // Обновляем UI с восстановленными значениями
                    this.updateScore(this.score);
                    this.ui.updateHighScore(this.highScore);
                    this.ui.updateHighestTile(this.highestTileValue);
                    this.ui.updateGamesPlayed(this.gamesPlayed);
                    
                    // Обновляем UI настройки для восстановленных предпочтений
                    this.ui.updateGlowButtonText(this.isGlowBright);
                    this.ui.updateMusicButtonText(this.musicPlaying);
                    
                    // Применяем настройки к игровым компонентам
                    this.sceneSetup.setGlowMode(this.isGlowBright);
                    
                    // Восстанавливаем музыку если была включена
                    if (this.musicPlaying && this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                        if (window.gamePushSDK) {
                            if (!window.gamePushSDK.sounds.isMusicMuted) {
                                this.backgroundMusic.play();
                            }
                        } else {
                            this.backgroundMusic.play();
                        }
                    }
                    
                    // Обновляем игровое состояние
                    this.gameState = 'playing';
                } else {
                    // Прогресс отсутствует или невалидный - создаем новую игровую сессию
                    this.gamesPlayed++;
                    this.ui.updateGamesPlayed(this.gamesPlayed);
                    this.grid.clear();
                    const tile1 = this.grid.addRandomTile();
                    const tile2 = this.grid.addRandomTile();
                    this.score = 0;
                    this.updateScore(0);
                    this.gameState = 'playing';
                }
                this.animate();
                callGameStartWhenReady();
                callGameplayStart();
            }
        },
        {
            key: "reset",
            value: function reset() {
                this.gamesPlayed++;
                this.ui.updateGamesPlayed(this.gamesPlayed);
                this.grid.clear();
                this.score = 0;
                this.updateScore(0);
                this.isMoving = false;
                this.animations = [];
                this.gameState = 'playing';
                this.ui.hideMessage();
                // Добавляем стартовые кубики
                this.grid.addRandomTile();
                this.grid.addRandomTile();
                this.sceneSetup.adjustCameraToFitGrid(this.ui.uiContainer.offsetHeight);
                clearTimeout(this.fadeTimeout);
                if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.stop();
                }
                this.musicPlaying = false;
                this.isFadingOut = false;
                if (this.backgroundMusic) {
                    this.backgroundMusic.setVolume(this.originalMusicVolume);
                }
                this.ui.updateMusicButtonText(this.musicPlaying);
                callGameplayStart();
            }
        },
        {
            key: "moveTiles",
            value: function moveTiles(direction) {
                var _this = this;
                if (this.isMoving) return;
                var moveResult = this.grid.moveTiles(direction);
                if (moveResult.moved) {
                    if (this.gameState === 'won') {
                        this.ui.hideMessage();
                    }
                    var hasMerges = moveResult.animations.some(function(anim) {
                        return anim.type === 'merge';
                    });
                    if (!hasMerges && this.tapSound && this.tapSound.buffer && (!window.gamePushSDK || !window.gamePushSDK.sounds.isSFXMuted)) {
                        if (this.audioListener.context.state === 'suspended') {
                            this.audioListener.context.resume();
                        }
                        if (this.tapSound.isPlaying) {
                            this.tapSound.stop();
                        }
                        this.tapSound.play();
                    }
                    this.lastMoveDirection.set(direction.x, direction.y);
                    this.isMoving = true;
                    this.score += moveResult.score;
                    this.updateScore(this.score);
                    var anticipationAmount = 0.2;
                    var dirVec = new THREE.Vector3(direction.x, direction.y, 0);
                    var anticipationOffset = dirVec.multiplyScalar(anticipationAmount * CELL_GAP);
                    moveResult.animations.forEach(function(anim) {
                        var tile = anim.tile;
                        var targetPos = _this.grid.getCellPosition(anim.to.x, anim.to.y);
                        if (anim.type === 'move' || anim.type === 'merge-source') {
                            tile.mesh.position.add(anticipationOffset);
                        }
                        var startPos = tile.mesh.position.clone();
                        var worldTargetPos = _this.grid.gridGroup.localToWorld(targetPos.clone());
                        if (anim.mergedFrom) {
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
                            tile.mesh.position.copy(targetPos);
                            _this.animations.push({
                                tile: tile,
                                originalColor: tile.mesh.material.color.clone(),
                                flashColor: new THREE.Color(0xffffff),
                                startTime: Date.now() + ANIMATION_DURATION / 2,
                                type: 'flash',
                                duration: ANIMATION_DURATION
                            });
                            _this.sceneSetup.addParticleInteraction(worldTargetPos);
                            if (tile.value > _this.highestTileValue) {
                                _this.highestTileValue = tile.value;
                                _this.ui.updateHighestTile(_this.highestTileValue);
                            }
                            if (_this.mergeSound && _this.mergeSound.buffer && (!window.gamePushSDK || !window.gamePushSDK.sounds.isSFXMuted)) {
                                if (_this.audioListener.context.state === 'suspended') {
                                    _this.audioListener.context.resume();
                                }
                                if (_this.mergeSound.isPlaying) {
                                    _this.mergeSound.stop();
                                }
                                _this.mergeSound.play();
                            }
                        } else if (anim.type === 'move') {
                            _this.animations.push({
                                tile: tile,
                                targetPos: targetPos,
                                startPos: startPos,
                                startTime: Date.now(),
                                type: 'move',
                                duration: ANIMATION_DURATION
                            });
                            _this.sceneSetup.addParticleInteraction(worldTargetPos);
                        }
                    });
                    setTimeout(function() {
                        var newTile = _this.grid.addRandomTile();
                        if (newTile) {
                            var targetPos = _this.grid.getCellPosition(newTile.x, newTile.y);
                            newTile.mesh.position.copy(targetPos);
                            _this.animations.push({
                                tile: newTile,
                                originalColor: newTile.mesh.material.color.clone(),
                                flashColor: new THREE.Color(0xffffff),
                                startTime: Date.now(),
                                type: 'flash',
                                duration: ANIMATION_DURATION
                            });
                        }
                        if (_this.gameState !== 'won' && _this.grid.checkWinCondition(TARGET_VALUE)) {
                            _this.gameState = 'won';
                            const lang = getUserLanguage();
                            _this.ui.showMessage(translations[lang].winMessage);
                            callGameplayStop();
                        } else if (!_this.grid.canMove()) {
                            _this.gameState = 'lost';
                            const lang = getUserLanguage();
                            _this.ui.showMessage(translations[lang].gameOver);
                            callGameplayStop();
                        }
                    }, moveResult.moved ? ANIMATION_DURATION : 0);
                } else {
                    this.triggerWobbleAnimation(direction);
                    if (this.gameState === 'playing' && !this.grid.canMove()) {
                        this.gameState = 'lost';
                        const lang = getUserLanguage();
                        this.ui.showMessage(translations[lang].gameOver);
                        callGameplayStop();
                    }
                }
            }
        },
        {
            key: "triggerWobbleAnimation",
            value: function triggerWobbleAnimation(direction) {
                if (this.isMoving) return;
                this.isMoving = true;
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
                                magnitude: WOBBLE_MAGNITUDE * CELL_SIZE
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
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.ui.updateHighScore(this.highScore);
                }
            }
        },
        {
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
                for(var i = this.animations.length - 1; i >= 0; i--){
                    var anim = this.animations[i];
                    var elapsed = now - anim.startTime;
                    var progress = Math.min(elapsed / anim.duration, 1);
                    if (anim.type === 'move' || anim.type === 'merge-source') {
                        this._updateMoveAnimation(anim, progress);
                    } else if (anim.type === 'flash') {
                        this._updateFlashAnimation(anim, progress);
                    } else if (anim.type === 'wobble') {
                        this._updateWobbleAnimation(anim, progress);
                    }
                    if (progress >= 1) {
                        if (anim.type === 'move') {
                            this._finalizeMoveAnimation(anim);
                        } else if (anim.type === 'flash') {
                            this._finalizeFlashAnimation(anim);
                        } else if (anim.type === 'merge-source') {
                            this._finalizeMergeSourceAnimation(anim);
                        } else if (anim.type === 'wobble') {
                            this._finalizeWobbleAnimation(anim);
                        }
                        this.animations.splice(i, 1);
                    } else {
                        stillAnimating = true;
                    }
                }
                if (!stillAnimating && this.isMoving) {
                    this.isMoving = false;
                    if (this.gameState === 'playing' && !this.grid.canMove()) {
                        this.gameState = 'lost';
                        const lang = getUserLanguage();
                        this.ui.showMessage(translations[lang].gameOver);
                        callGameplayStop();
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
                    return;
                }
                var contextTime = this.audioListener.context.currentTime;
                var startTime = this.backgroundMusic.startTime || 0;
                var offset = this.backgroundMusic.offset || 0;
                var playbackTime = (contextTime - startTime + offset) % this.musicDuration;
                var fadeStartTime = this.musicDuration - MUSIC_FADE_DURATION;
                if (playbackTime >= fadeStartTime) {
                    this.isFadingOut = true;
                    var gainNode = this.backgroundMusic.getOutput();
                    var now = this.audioListener.context.currentTime;
                    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                    gainNode.gain.linearRampToValueAtTime(0, now + MUSIC_FADE_DURATION);
                    this.fadeTimeout = setTimeout(function() {
                        if (_this.backgroundMusic && _this.musicPlaying) {
                            _this.backgroundMusic.stop();
                            _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                            _this.backgroundMusic.play();
                            _this.isFadingOut = false;
                        } else {
                            if (_this.backgroundMusic) _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                            _this.isFadingOut = false;
                        }
                    }, MUSIC_FADE_DURATION * 1000 + 50);
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
                this.checkMusicLoopFade();
                if (this.sceneSetup.backgroundMaterial) {
                    this.sceneSetup.backgroundMaterial.uniforms.time.value = this.clock.getElapsedTime();
                }
                this.sceneSetup.updateShaderTransition();
                this.sceneSetup.updateParticles(this.lastMoveDirection);
                this.sceneSetup.composer.render();
            }
        }
    ]);
    return Game;
}();