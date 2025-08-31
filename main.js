import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { FONT_JSON_URL } from './constants.js';
import { CloudSaves } from './cloudSaves.js'; // CloudSaves integration
import { translations, getUserLanguage } from './localization.js';

// --- [SOUND SDK INTEGRATION & LOGGING] ---
function initSoundSDKIntegration(game) {
    if (!window.gamePushSDK || !game) {
        console.warn("[main.js] GamePush SDK not found, sound integration skipped.");
        return;
    }
    window.gamePushSDK.sounds.on('mute', () => {
        console.log('[Sound SDK] mute: Отключаем все звуки (музыка и эффекты).');
        if (game.backgroundMusic && game.backgroundMusic.isPlaying) game.backgroundMusic.pause();
        game.musicPlaying = false; // Синхронизируем состояние
        uiUpdateMusicMenu(game, false);
    });
    window.gamePushSDK.sounds.on('mute:music', () => {
        console.log('[Sound SDK] mute:music: Отключаем только музыку.');
        if (game.backgroundMusic && game.backgroundMusic.isPlaying) game.backgroundMusic.pause();
        game.musicPlaying = false; // Синхронизируем состояние
        uiUpdateMusicMenu(game, false);
    });
    
    window.gamePushSDK.sounds.on('unmute', () => {
        console.log('[Sound SDK] unmute: Включаем все звуки.');
        // Возобновляем музыку только если она должна играть
        if (game.musicShouldBePlaying() && game.backgroundMusic) {
             if (!game.backgroundMusic.isPlaying) game.backgroundMusic.play();
             game.musicPlaying = true;
             uiUpdateMusicMenu(game, true);
        }
    });
    window.gamePushSDK.sounds.on('unmute:music', () => {
        console.log('[Sound SDK] unmute:music: Включаем только музыку.');
        if (game.musicShouldBePlaying() && game.backgroundMusic) {
             if (!game.backgroundMusic.isPlaying) game.backgroundMusic.play();
             game.musicPlaying = true;
             uiUpdateMusicMenu(game, true);
        }
    });

    // Эти события не требуют действий, т.к. mute/unmute их покрывают
    window.gamePushSDK.sounds.on('mute:sfx', () => {
        console.log('[Sound SDK] mute:sfx: Отключаем только эффекты.');
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

// Обновление кнопки Музыка только на меню
function uiUpdateMusicMenu(game, isPlaying) {
    if (game.ui && typeof game.ui.updateMusicButtonText === 'function') {
        game.ui.updateMusicButtonText(isPlaying);
    }
}

function uiUpdateGlowMenu(game, isBright) {
    if (game.ui && typeof game.ui.updateGlowButtonText === 'function') {
        game.ui.updateGlowButtonText(isBright);
    }
}

function initVisibilityEvents(game) {
    game._wasMutedByVisibility = false;
    const handleVisibilityChange = () => {
        if (!window.gamePushSDK) return;

        if (document.hidden) {
            // Если звук был включен, выключаем его и запоминаем это
            if (!window.gamePushSDK.sounds.isMuted) {
                window.gamePushSDK.sounds.mute();
                game._wasMutedByVisibility = true;
                console.log('[main.js] Вкладка скрыта, звук поставлен на паузу через SDK.');
            }
        } else {
            // Если вкладка стала видимой и звук был выключен нами, включаем его обратно
            if (game._wasMutedByVisibility) {
                window.gamePushSDK.sounds.unmute();
                game._wasMutedByVisibility = false;
                console.log('[main.js] Вкладка снова активна, восстанавливаем звук через SDK.');
            }
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
}

// --- GamePush: Функция ожидания SDK и вызова gameStart() ---
function callGameStartWhenReady() {
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(() => {
        if (window.gamePushSDK) {
            if (typeof window.gamePushSDK.gameStart === "function") {
                window.gamePushSDK.gameStart();
                console.log("[main.js] window.gamePushSDK.gameStart() успешно вызван через ожидание.");
            } else {
                console.log("[main.js] GamePushSDK обнаружен, но метод gameStart отсутствует.");
            }
            clearInterval(interval);
        } else if (++attempts > maxAttempts) {
            clearInterval(interval);
            console.warn("[main.js] GamePushSDK не обнаружен после ожидания.");
        }
    }, 100);
}

async function startGameAfterSDK() {
    const renderDiv = document.getElementById('renderDiv');
    if (!renderDiv) {
        console.error("[main.js] Error: 'renderDiv' element not found in the DOM.");
        return;
    }

    // --- БЛОКИРУЕМ КОНТЕКСТНОЕ МЕНЮ ПО ПРАВОМУ КЛИКУ ---
    renderDiv.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // ЛОКАЛИЗАЦИЯ
    const lang = getUserLanguage();
    const t = translations[lang];
    var ui = new UI(document.body, t);

    // --- Меню: флаг первого запуска ---
    let isFirstMenu = true;
    let game = null;

    // --- Загрузка шрифта и старт игры ---
    var fontLoader = new FontLoader();
    fontLoader.load(FONT_JSON_URL, async function(loadedFont) {
        console.log("[main.js] Font loaded successfully.");
        let cloudStats = null;
        try {
            if (window.gamePushSDK) {
                console.log('[main.js] GamePush SDK инициализирован, загружаем данные из облака...');
                cloudStats = await CloudSaves.loadAll();
                console.log('[main.js] Загружены данные из облака:', cloudStats);
                if (cloudStats.progress) {
                    console.log('[main.js] Найден сохраненный прогресс игры в облаке');
                    if (typeof cloudStats.progress === 'string') {
                        try {
                            const progressObj = JSON.parse(cloudStats.progress);
                            console.log('[main.js] Прогресс игры успешно распарсен:',
                                `Счет: ${progressObj.score}`,
                                `Кубиков: ${progressObj.grid?.length || 0}`);
                        } catch (e) {
                            console.error('[main.js] Ошибка при парсинге прогресса:', e);
                        }
                    } else if (typeof cloudStats.progress === 'object') {
                        console.log('[main.js] Прогресс игры получен как объект:',
                            `Счет: ${cloudStats.progress.score}`,
                            `Кубиков: ${cloudStats.progress.grid?.length || 0}`);
                    }
                } else {
                    console.log('[main.js] Сохраненный прогресс игры не найден в облаке');
                }
            } else {
                console.warn('[main.js] GamePush SDK не инициализирован (ожидание onGPInit)');
            }
        } catch (e) {
            console.warn('[main.js] Не удалось загрузить облачные сохранения:', e);
        }

        // Создание экземпляра игры с данными из облака
        game = new Game(renderDiv, ui, loadedFont, cloudStats);

        // --- ВАЖНО: Связываем UI и Game для управления вводом при открытии/закрытии меню ---
        ui.setMenuStateChangeCallback(function(isMenuOpen) {
            game.setInputActive(!isMenuOpen);
        });

        initSoundSDKIntegration(game);
        initVisibilityEvents(game);

        // --- Настраиваем UI callbacks ---
        function setupGameListeners() {
            ui.setResetCallback(function() {
                ui.showMenu(false); // После сброса показываем меню с кнопкой "Играть"
                game.reset();
            });

            // --- Новая кнопка Save на игровом поле ---
            ui.setSaveCallback(async function() {
                try {
                    await game.saveStats();
                    await game.saveProgress();
                    console.log('[main.js] Save button: Статистика и прогресс сохранены!');
                    return true;
                } catch (e) {
                    console.error('[main.js] Save button: Ошибка при сохранении!', e);
                    return false;
                }
            });

            // --- Кнопка "Menu" ---
            ui.setMenuButtonCallback(function() {
                ui.showMenu(true); // Показываем меню с "Continue"
            });

            // --- Glow/Сияние на меню ---
            ui.setMenuGlowCallback(function() {
                if (!game || !game.sceneSetup) {
                    ui.menuGlowButton.textContent = ui.t.glow + " (Недоступно)";
                    setTimeout(() => {
                        ui.menuGlowButton.textContent = ui.t.glow;
                    }, 1200);
                    return false;
                }
                
                // Инвертируем значение
                game.isGlowBright = !game.isGlowBright;
                
                // Пробуем применить режим свечения
                game.sceneSetup.setGlowMode(game.isGlowBright);
                
                // Обновляем внешний вид кнопки
                uiUpdateGlowMenu(game, game.isGlowBright);
                
                // --- Сохранение настройки в облако происходит только по кнопке "Save" ---
                
                return game.isGlowBright;
            });

            // --- Музыка на меню ---
            ui.setMenuMusicCallback(function() {
                if (window.gamePushSDK) {
                    // Просто инвертируем состояние в SDK
                    if (window.gamePushSDK.sounds.isMusicMuted) {
                        window.gamePushSDK.sounds.unmuteMusic();
                        console.log("[main.js] Menu Music button: Включить музыку через SDK.");
                    } else {
                        window.gamePushSDK.sounds.muteMusic();
                        console.log("[main.js] Menu Music button: Отключить музыку через SDK.");
                    }
                } else {
                    // Если SDK нет, используем старый метод
                    game.toggleMusic();
                }
                // Обновляем состояние и кнопку из game, т.к. событие SDK обновит game.musicPlaying
                uiUpdateMusicMenu(game, game.musicPlaying);
                return game.musicPlaying;
            });

            // --- Кнопка Play/Continue в меню ---
            ui.setMenuPlayCallback(function() {
                ui.hideMenu();
                // --- ПОКАЗ РЕКЛАМЫ ПЕРЕД ПРОДОЛЖЕНИЕМ ---
                if (window.gamePushSDK && window.gamePushSDK.ads && typeof window.gamePushSDK.ads.showFullscreen === 'function' && !isFirstMenu) {
                    window.gamePushSDK.ads.showFullscreen()
                        .catch((err) => {
                            console.warn('[main.js] Ошибка показа рекламы, продолжаем игру:', err);
                        })
                        .finally(() => {
                             game.start(); // Запускаем игру в любом случае
                        });
                } else {
                    game.start(); // Запускаем без рекламы (первый раз или если SDK нет)
                }
                isFirstMenu = false; // После первого клика это уже не первый запуск
            });
        }

        setupGameListeners();

        // --- Показываем меню при первом запуске ---
        ui.showMenu(false); // "Play" на кнопке
        isFirstMenu = true;

        // --- ДОБАВЛЕН ВЫЗОВ GamePush gameStart() при первом показе меню ---
        callGameStartWhenReady();

    }, undefined, function(error) {
        console.error('[main.js] Font loading failed:', error);
        ui.showMessage('Error: Could not load font. Please refresh.');
    });
}

// Делаем функцию глобальной для вызова из index.html
window.startGameAfterSDK = startGameAfterSDK;