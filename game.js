// --- CloudSaves Integration ---
import { CloudSaves } from './cloudSaves.js';

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
import { TILE_COLORS, GRID_SIZE, TARGET_VALUE, CELL_GAP, getCellSize } from './constants.js';

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
        
        // Вычисляем динамический размер клетки на основе размеров контейнера
        this.cellSize = getCellSize(container);
        console.log(`[Game.js] Инициализация с динамическим cellSize: ${this.cellSize}`);
        
        this.sceneSetup = new SceneSetup(container);
        this.grid = new Grid(GRID_SIZE, this.sceneSetup.scene, this.loadedFont, this.cellSize);
        this.inputHandler = new InputHandler(container);
        this.score = 0;
        this.isMoving = false;
        this.animations = [];
        this.gameState = 'playing';
        this.clock = new THREE.Clock();
        this.lastMoveDirection = new THREE.Vector2(0, 0);
        
        // Устанавливаем позицию камеры с учетом динамического размера
        this.sceneSetup.resetCamera(this.cellSize);

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
                    lastSavedTime: new Date().toISOString() // Добавляем временную метку для отладки
                };
            }
        },
        {
            // --- Восстановление прогресса из объекта ---
            key: "restoreProgress",
            value: function restoreProgress(progressObj) {
                console.log('[Game.js] Восстановление прогресса игры:', progressObj);
                
                // Проверяем наличие обязательных полей
                if (!progressObj || !progressObj.grid || !Array.isArray(progressObj.grid)) {
                    console.error('[Game.js] Некорректный формат объекта прогресса');
                    return false;
                }
                
                // Проверяем, что в grid есть хотя бы один кубик
                if (progressObj.grid.length === 0) {
                    console.warn('[Game.js] В сохраненном прогрессе нет кубиков, считаем прогресс невалидным');
                    return false;
                }
                
                // Восстанавливаем основные переменные
                this.score = progressObj.score || 0;
                this.highScore = progressObj.highScore || 0;
                this.highestTileValue = progressObj.highestTileValue || 0;
                this.gamesPlayed = progressObj.gamesPlayed || 0;
                
                this.ui.updateScore(this.score);
                this.ui.updateHighScore(this.highScore);
                this.ui.updateHighestTile(this.highestTileValue);
                this.ui.updateGamesPlayed(this.gamesPlayed);

                // Очищаем сетку перед восстановлением
                this.grid.clear();
                
                // Восстанавливаем кубики
                const tilesCount = progressObj.grid.length;
                console.log(`[Game.js] Восстанавливаем ${tilesCount} кубиков на сетке`);
                
                let validTilesCount = 0;
                progressObj.grid.forEach(tileData => {
                    if (tileData.x >= 0 && tileData.x < this.grid.size && 
                        tileData.y >= 0 && tileData.y < this.grid.size && 
                        tileData.value > 0) {
                        
                        const tile = new Tile(tileData.value, tileData.x, tileData.y, this.loadedFont, this.cellSize);
                        this.grid.cells[tileData.y][tileData.x] = tile;
                        tile.mesh.position.copy(this.grid.getCellPosition(tileData.x, tileData.y));
                        this.grid.gridGroup.add(tile.mesh);
                        console.log(`[Game.js] Восстановлен кубик: x=${tileData.x}, y=${tileData.y}, value=${tileData.value}`);
                        validTilesCount++;
                    } else {
                        console.warn(`[Game.js] Пропущен некорректный кубик:`, tileData);
                    }
                });
                
                // Проверяем, что хотя бы один кубик был успешно восстановлен
                if (validTilesCount === 0) {
                    console.warn('[Game.js] Не удалось восстановить ни одного кубика, считаем прогресс невалидным');
                    this.grid.clear(); // Очищаем сетку от возможных ошибочных кубиков
                    return false;
                }
                
                // Проверяем состояние игры
                if (this.grid.checkWinCondition(TARGET_VALUE)) {
                    this.gameState = 'won';
                    console.log('[Game.js] Восстановлено победное состояние игры');
                } else if (!this.grid.canMove()) {
                    this.gameState = 'lost';
                    console.log('[Game.js] Восстановлено проигрышное состояние игры');
                } else {
                    this.gameState = 'playing';
                    console.log('[Game.js] Восстановлено активное состояние игры');
                }
                
                return true; // Успешное восстановление
            }
        },
        {
            // --- Парсинг JSON прогресса ---
            key: "parseProgress",
            value: function parseProgress(progressStr) {
                console.log('[Game.js] Парсинг строки прогресса:', typeof progressStr === 'string' ? 'Строка JSON' : 'Объект');
                
                if (typeof progressStr === 'object' && progressStr !== null) {
                    return progressStr; // Уже объект, не нужно парсить
                }
                
                try {
                    const progressObj = JSON.parse(progressStr);
                    console.log('[Game.js] Успешно распарсили JSON прогресса');
                    return progressObj;
                } catch (e) {
                    console.error('[Game.js] Ошибка при парсинге строки прогресса:', e);
                    return null;
                }
            }
        },
        {
            // --- Сохраняет прогресс в облако ---
            key: "saveProgress",
            value: function saveProgress() {
                console.log('[Game.js] Запуск сохранения прогресса игры в облако');
                
                const progressObj = this.getProgressObject();
                if (!progressObj || !progressObj.grid) {
                    console.error('[Game.js] Не удалось получить объект прогресса для сохранения');
                    return Promise.reject(new Error("Некорректный объект прогресса"));
                }
                
                const tilesCount = progressObj.grid.length;
                console.log(`[Game.js] Сохраняем прогресс с ${tilesCount} кубиками на сетке`);
                
                return CloudSaves.saveProgress(progressObj)
                    .then(() => {
                        console.log('[Game.js] Прогресс игры успешно сохранен в облако');
                    })
                    .catch(err => {
                        console.error('[Game.js] Ошибка при сохранении прогресса в облако:', err);
                        throw err;
                    });
            }
        },
        {
            key: "initSoundSDKIntegration",
            value: function initSoundSDKIntegration() {
                if (!window.gamePushSDK) {
                    console.warn("[Game.js] GamePush SDK не найден, интеграция звука невозможна.");
                    return;
                }
                window.gamePushSDK.sounds.on('mute', () => {
                    console.log('[Sound SDK] mute: Отключаем все звуки (музыка и эффекты).');
                    if (this.backgroundMusic && this.backgroundMusic.isPlaying) this.backgroundMusic.pause();
                    this.musicPlaying = false;
                    this.ui.updateMusicButtonText(false);
                    if (this.tapSound && this.tapSound.isPlaying) this.tapSound.pause();
                    if (this.mergeSound && this.mergeSound.isPlaying) this.mergeSound.pause();
                });
                window.gamePushSDK.sounds.on('mute:music', () => {
                    console.log('[Sound SDK] mute:music: Отключаем только музыку.');
                    if (this.backgroundMusic && this.backgroundMusic.isPlaying) this.backgroundMusic.pause();
                    this.musicPlaying = false;
                    this.ui.updateMusicButtonText(false);
                });
                window.gamePushSDK.sounds.on('mute:sfx', () => {
                    console.log('[Sound SDK] mute:sfx: Отключаем только эффекты.');
                    if (this.tapSound && this.tapSound.isPlaying) this.tapSound.pause();
                    if (this.mergeSound && this.mergeSound.isPlaying) this.mergeSound.pause();
                });
                window.gamePushSDK.sounds.on('unmute', () => {
                    console.log('[Sound SDK] unmute: Включаем все звуки (музыка и эффекты).');
                    if (this.backgroundMusic && !window.gamePushSDK.sounds.isMusicMuted) {
                        this.backgroundMusic.play();
                        this.musicPlaying = true;
                        this.ui.updateMusicButtonText(true);
                    }
                });
                window.gamePushSDK.sounds.on('unmute:music', () => {
                    console.log('[Sound SDK] unmute:music: Включаем только музыку.');
                    if (this.backgroundMusic && !window.gamePushSDK.sounds.isMusicMuted) {
                        this.backgroundMusic.play();
                        this.musicPlaying = true;
                        this.ui.updateMusicButtonText(true);
                    }
                });
                window.gamePushSDK.sounds.on('unmute:sfx', () => {
                    console.log('[Sound SDK] unmute:sfx: Включаем только эффекты.');
                });
                console.log('[Sound SDK] Initial states:',
                    'isMuted:', window.gamePushSDK.sounds.isMuted,
                    'isMusicMuted:', window.gamePushSDK.sounds.isMusicMuted,
                    'isSFXMuted:', window.gamePushSDK.sounds.isSFXMuted
                );
            }
        },
        {
            key: "initVisibilityEvents",
            value: function initVisibilityEvents() {
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        if (window.gamePushSDK && !window.gamePushSDK.sounds.isMuted) {
                            window.gamePushSDK.sounds.mute();
                            this._wasMutedByVisibility = true;
                            console.log('[Game.js] Вкладка скрыта, музыка поставлена на паузу через SDK.');
                        }
                    } else {
                        if (window.gamePushSDK && this._wasMutedByVisibility) {
                            if (!window.gamePushSDK.sounds.isMuted) {
                                window.gamePushSDK.sounds.unmute();
                                console.log('[Game.js] Вкладка снова активна, восстанавливаем звук через SDK.');
                            }
                            this._wasMutedByVisibility = false;
                        } else {
                            console.log('[Game.js] Вкладка снова активна, но звук не был выключен SDK.');
                        }
                    }
                });
                window.addEventListener('blur', () => {
                    if (window.gamePushSDK && !window.gamePushSDK.sounds.isMuted) {
                        window.gamePushSDK.sounds.mute();
                        this._wasMutedByVisibility = true;
                        console.log('[Game.js] Окно браузера потеряло фокус, музыка поставлена на паузу через SDK.');
                    }
                });
                window.addEventListener('focus', () => {
                    if (window.gamePushSDK && this._wasMutedByVisibility) {
                        if (!window.gamePushSDK.sounds.isMuted) {
                            window.gamePushSDK.sounds.unmute();
                            console.log('[Game.js] Окно браузера снова в фокусе, восстанавливаем звук через SDK.');
                        }
                        this._wasMutedByVisibility = false;
                    }
                });
            }
        },
        {
            key: "loadStats",
            value: function loadStats() {
                // --- убираем, теперь работаем через облако ---
            }
        },
        {
            key: "saveStats",
            value: function saveStats() {
                var self = this;
                localStorage.setItem('highScore', self.highScore.toString());
                localStorage.setItem('highestTileValue', self.highestTileValue.toString());
                localStorage.setItem('gamesPlayed', self.gamesPlayed.toString());
                CloudSaves.saveAll({
                    best: self.highScore,
                    playscore: self.score,
                    maxtile: self.highestTileValue,
                    games: self.gamesPlayed,
                    glow: self.isGlowBright ? 0 : 1,
                    music: self.musicPlaying ? 1 : 0,
                }).then(function() {
                    console.log("[Game.js] Saved stats: highScore = " + self.highScore + ", highestTileValue = " + self.highestTileValue + ", gamesPlayed = " + self.gamesPlayed + " [Cloud sync]");
                }).catch(function(e) {
                    console.error("[Game.js] Ошибка CloudSaves.saveAll:", e);
                });
                // --- Сохраняем прогресс игры ---
                this.saveProgress().catch(e => {
                    console.error("[Game.js] Ошибка при сохранении прогресса игры:", e);
                });
            }
        },
        {
            key: "setupControls",
            value: function setupControls() {
                var _this = this;
                this.inputHandler.onMove(function(direction) {
                    if (_this.isMoving || _this.gameState === 'lost') return;
                    console.log("[Game.js] User input: move direction", direction);
                    _this.moveTiles(direction);
                });
                console.log("[Game.js] Controls set up.");
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
                    console.log("[Game.js] Background music loaded. Duration: " + _this.musicDuration + "s");
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
                    console.log('[Game.js] Tap sound loaded.');
                }, undefined, function(error) {
                    return console.error('[Game.js] Error loading tap sound:', error);
                });
                audioLoader.load(MERGE_SOUND_PATH, function(buffer) {
                    _this.mergeSound.setBuffer(buffer);
                    _this.mergeSound.setLoop(false);
                    _this.mergeSound.setVolume(0.7);
                    console.log('[Game.js] Merge sound loaded.');
                }, undefined, function(error) {
                    return console.error('[Game.js] Error loading merge sound:', error);
                });
                console.log("[Game.js] Audio setup complete.");
            }
        },
        {
            key: "toggleMusic",
            value: function toggleMusic() {
                if (!window.gamePushSDK) {
                    console.warn("[Game.js] toggleMusic: Нет доступа к GamePush SDK, fallback на локальное управление.");
                    if (!this.backgroundMusic || !this.backgroundMusic.buffer) {
                        console.warn("[Game.js] Attempted to toggle music, but buffer is not loaded.");
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
                    CloudSaves.save('music', this.musicPlaying ? 1 : 0).catch(e => {
                        console.error("[Game.js] Ошибка CloudSaves.save (music):", e);
                    });
                    return;
                }
                if (window.gamePushSDK.sounds.isMusicMuted) {
                    window.gamePushSDK.sounds.unmuteMusic();
                    console.log("[Game.js] toggleMusic: Включить музыку через SDK.");
                } else {
                    window.gamePushSDK.sounds.muteMusic();
                    console.log("[Game.js] toggleMusic: Отключить музыку через SDK.");
                }
            }
        },
        {
            key: "start",
            value: function start() {
                console.log("[Game.js] Game start called.");
                
                // Проверяем, что прогресс валидный и в нем есть непустой массив кубиков
                const hasValidProgress = this.progressRestored && this.progress && 
                                        this.progress.grid && 
                                        Array.isArray(this.progress.grid) && 
                                        this.progress.grid.length > 0;
                
                if (hasValidProgress) {
                    console.log("[Game.js] Игра стартует с восстановленным прогрессом:", 
                        `${this.progress.grid.length} кубиков на сетке`);
                } else {
                    // Прогресс отсутствует или невалидный - создаем новую игровую сессию
                    console.log("[Game.js] Прогресс отсутствует или невалидный, начинаем новую игру");
                    
                    this.gamesPlayed++;
                    this.saveStats();
                    this.ui.updateGamesPlayed(this.gamesPlayed);
                    
                    // Очищаем сетку (на всякий случай)
                    this.grid.clear();
                    
                    // Добавляем стартовые кубики
                    console.log("[Game.js] Добавляем стартовые кубики на сетку");
                    const tile1 = this.grid.addRandomTile();
                    if (tile1) {
                        console.log(`[Game.js] Добавлен первый кубик: x=${tile1.x}, y=${tile1.y}, value=${tile1.value}`);
                    } else {
                        console.error("[Game.js] Не удалось добавить первый кубик!");
                    }
                    
                    const tile2 = this.grid.addRandomTile();
                    if (tile2) {
                        console.log(`[Game.js] Добавлен второй кубик: x=${tile2.x}, y=${tile2.y}, value=${tile2.value}`);
                    } else {
                        console.error("[Game.js] Не удалось добавить второй кубик!");
                    }
                    
                    // Сбрасываем счет и состояние игры
                    this.score = 0;
                    this.updateScore(0);
                    this.gameState = 'playing';
                }
                
                this.animate();
                callGameStartWhenReady();
                callGameplayStart();
                
                // Сохраняем текущее состояние игры
                this.saveProgress().catch(e => {
                    console.error("[Game.js] Ошибка при сохранении начального состояния игры:", e);
                });
            }
        },
        {
            key: "reset",
            value: function reset() {
                console.log("[Game.js] Game reset called.");
                this.gamesPlayed++;
                this.saveStats();
                this.ui.updateGamesPlayed(this.gamesPlayed);
                this.grid.clear();
                this.score = 0;
                this.updateScore(0);
                this.isMoving = false;
                this.animations = [];
                this.gameState = 'playing';
                this.ui.hideMessage();
                
                // Добавляем стартовые кубики
                const tile1 = this.grid.addRandomTile();
                if (tile1) {
                    console.log(`[Game.js] Reset: добавлен первый кубик: x=${tile1.x}, y=${tile1.y}, value=${tile1.value}`);
                }
                
                const tile2 = this.grid.addRandomTile();
                if (tile2) {
                    console.log(`[Game.js] Reset: добавлен второй кубик: x=${tile2.x}, y=${tile2.y}, value=${tile2.value}`);
                }
                
                this.sceneSetup.resetCamera();
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
                
                // Сохраняем новый прогресс (пустую сетку с двумя начальными тайлами)
                this.saveProgress().catch(e => {
                    console.error("[Game.js] Ошибка при сохранении прогресса после сброса:", e);
                });
            }
        },
        {
            key: "moveTiles",
            value: function moveTiles(direction) {
                var _this = this;
                if (this.isMoving) return;
                var moveResult = this.grid.moveTiles(direction);
                console.log("[Game.js] moveTiles called. Direction:", direction, "Move result:", moveResult);
                if (moveResult.moved) {
                    if (this.gameState === 'won') {
                        this.ui.hideMessage();
                        console.log("[Game.js] Player continued after win. Message hidden.");
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
                        console.log("[Game.js] Tap sound played (no merges).");
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
                                _this.saveStats();
                                _this.ui.updateHighestTile(_this.highestTileValue);
                                console.log("[Game.js] New highest tile value:", tile.value);
                            }
                            if (_this.mergeSound && _this.mergeSound.buffer && (!window.gamePushSDK || !window.gamePushSDK.sounds.isSFXMuted)) {
                                if (_this.audioListener.context.state === 'suspended') {
                                    _this.audioListener.context.resume();
                                }
                                if (_this.mergeSound.isPlaying) {
                                    _this.mergeSound.stop();
                                }
                                _this.mergeSound.play();
                                console.log("[Game.js] Merge sound played.");
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
                            console.log("[Game.js] New tile added at", newTile.x, newTile.y, "with value", newTile.value);
                        }
                        if (_this.gameState !== 'won' && _this.grid.checkWinCondition(TARGET_VALUE)) {
                            _this.gameState = 'won';
                            _this.ui.showMessage('You Win! Keep playing?');
                            callGameplayStop();
                            console.log("[Game.js] Win condition reached!");
                        } else if (!_this.grid.canMove()) {
                            _this.gameState = 'lost';
                            _this.ui.showMessage('Game Over!');
                            callGameplayStop();
                            console.log("[Game.js] Game Over (no moves left).");
                        }
                        _this.saveStats(); // Cloud sync + прогресс после хода
                    }, moveResult.moved ? ANIMATION_DURATION : 0);
                } else {
                    console.log("[Game.js] Invalid move (no tiles moved). Triggering wobble animation.");
                    this.triggerWobbleAnimation(direction);
                    if (this.gameState === 'playing' && !this.grid.canMove()) {
                        this.gameState = 'lost';
                        this.ui.showMessage('Game Over!');
                        callGameplayStop();
                        console.log("[Game.js] Game Over (after invalid move, no moves left).");
                        this.saveStats();
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
                console.log("[Game.js] Wobble animation triggered.");
            }
        },
        {
            key: "updateScore",
            value: function updateScore(newScore) {
                this.score = newScore;
                this.ui.updateScore(this.score);
                var wasHighScore = false;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveStats();
                    wasHighScore = true;
                }
                this.ui.updateHighScore(this.highScore);
                if (wasHighScore) {
                    console.log("[Game.js] New high score:", this.highScore);
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
                        this.ui.showMessage('Game Over!');
                        this.saveStats();
                        callGameplayStop();
                        console.log("[Game.js] Game Over (after animations, no moves left).");
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
                    console.log("[Game.js] Starting music fade out at " + playbackTime.toFixed(2) + "s (Context Time: " + contextTime.toFixed(2) + ")");
                    this.isFadingOut = true;
                    var gainNode = this.backgroundMusic.getOutput();
                    var now = this.audioListener.context.currentTime;
                    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                    gainNode.gain.linearRampToValueAtTime(0, now + MUSIC_FADE_DURATION);
                    this.fadeTimeout = setTimeout(function() {
                        if (_this.backgroundMusic && _this.musicPlaying) {
                            console.log("[Game.js] Fade complete, restarting music.");
                            _this.backgroundMusic.stop();
                            _this.backgroundMusic.setVolume(_this.originalMusicVolume);
                            _this.backgroundMusic.play();
                            _this.isFadingOut = false;
                        } else {
                            console.log("[Game.js] Fade timeout completed, but music was stopped/paused.");
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
        },
        {
            // Метод для обработки изменения размера окна - пересчитывает размеры и пересоздает сетку
            key: "handleResize",
            value: function handleResize() {
                console.log("[Game.js] Обработка изменения размера окна");
                
                // Пересчитываем размер клетки для новых размеров контейнера
                const newCellSize = getCellSize(this.container);
                console.log(`[Game.js] Новый cellSize: ${newCellSize} (был: ${this.cellSize})`);
                
                // Если размер значительно изменился, обновляем сетку
                if (Math.abs(newCellSize - this.cellSize) > 0.1) {
                    this.cellSize = newCellSize;
                    
                    // Сохраняем текущее состояние сетки
                    const currentGridState = [];
                    for (let r = 0; r < this.grid.size; r++) {
                        for (let c = 0; c < this.grid.size; c++) {
                            if (this.grid.cells[r][c]) {
                                currentGridState.push({
                                    value: this.grid.cells[r][c].value,
                                    x: this.grid.cells[r][c].x,
                                    y: this.grid.cells[r][c].y
                                });
                            }
                        }
                    }
                    
                    // Удаляем старую сетку
                    this.sceneSetup.scene.remove(this.grid.gridGroup);
                    
                    // Создаем новую сетку с обновленным размером
                    this.grid = new Grid(GRID_SIZE, this.sceneSetup.scene, this.loadedFont, this.cellSize);
                    
                    // Восстанавливаем кубики на новой сетке
                    currentGridState.forEach(tileData => {
                        const tile = new Tile(tileData.value, tileData.x, tileData.y, this.loadedFont, this.cellSize);
                        this.grid.cells[tileData.y][tileData.x] = tile;
                        tile.mesh.position.copy(this.grid.getCellPosition(tileData.x, tileData.y));
                        this.grid.gridGroup.add(tile.mesh);
                    });
                    
                    // Обновляем позицию камеры с учетом нового размера
                    this.sceneSetup.resetCamera(this.cellSize);
                    
                    console.log(`[Game.js] Сетка пересоздана с cellSize: ${this.cellSize}`);
                }
                
                // Обновляем UI (если нужно дополнительные изменения)
                this.ui.adjustLayout();
            }
        }
    ]);
    return Game;
}();