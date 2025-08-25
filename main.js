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
        game.musicPlaying = false;
        game.ui.updateMusicButtonText(false);
        if (game.tapSound && game.tapSound.isPlaying) game.tapSound.pause();
        if (game.mergeSound && game.mergeSound.isPlaying) game.mergeSound.pause();
    });
    window.gamePushSDK.sounds.on('mute:music', () => {
        console.log('[Sound SDK] mute:music: Отключаем только музыку.');
        if (game.backgroundMusic && game.backgroundMusic.isPlaying) game.backgroundMusic.pause();
        game.musicPlaying = false;
        game.ui.updateMusicButtonText(false);
    });
    window.gamePushSDK.sounds.on('mute:sfx', () => {
        console.log('[Sound SDK] mute:sfx: Отключаем только эффекты.');
        if (game.tapSound && game.tapSound.isPlaying) game.tapSound.pause();
        if (game.mergeSound && game.mergeSound.isPlaying) game.mergeSound.pause();
    });
    window.gamePushSDK.sounds.on('unmute', () => {
        console.log('[Sound SDK] unmute: Включаем все звуки (музыка и эффекты).');
        if (game.backgroundMusic && !window.gamePushSDK.sounds.isMusicMuted) {
            game.backgroundMusic.play();
            game.musicPlaying = true;
            game.ui.updateMusicButtonText(true);
        }
    });
    window.gamePushSDK.sounds.on('unmute:music', () => {
        console.log('[Sound SDK] unmute:music: Включаем только музыку.');
        if (game.backgroundMusic && !window.gamePushSDK.sounds.isMusicMuted) {
            game.backgroundMusic.play();
            game.musicPlaying = true;
            game.ui.updateMusicButtonText(true);
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

function initVisibilityEvents(game) {
    game._wasMutedByVisibility = false;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (window.gamePushSDK && !window.gamePushSDK.sounds.isMuted) {
                window.gamePushSDK.sounds.mute();
                game._wasMutedByVisibility = true;
                console.log('[main.js] Вкладка скрыта, музыка поставлена на паузу через SDK.');
            }
        } else {
            if (window.gamePushSDK && game._wasMutedByVisibility) {
                if (!window.gamePushSDK.sounds.isMuted) {
                    window.gamePushSDK.sounds.unmute();
                    console.log('[main.js] Вкладка снова активна, восстанавливаем звук через SDK.');
                }
                game._wasMutedByVisibility = false;
            } else {
                console.log('[main.js] Вкладка снова активна, но звук не был выключен SDK.');
            }
        }
    });
    window.addEventListener('blur', () => {
        if (window.gamePushSDK && !window.gamePushSDK.sounds.isMuted) {
            window.gamePushSDK.sounds.mute();
            game._wasMutedByVisibility = true;
            console.log('[main.js] Окно браузера потеряло фокус, музыка поставлена на паузу через SDK.');
        }
    });
    window.addEventListener('focus', () => {
        if (window.gamePushSDK && game._wasMutedByVisibility) {
            if (!window.gamePushSDK.sounds.isMuted) {
                window.gamePushSDK.sounds.unmute();
                console.log('[main.js] Окно браузера снова в фокусе, восстанавливаем звук через SDK.');
            }
            game._wasMutedByVisibility = false;
        }
    });
}

async function startGameAfterSDK() {
    const renderDiv = document.getElementById('renderDiv');
    if (!renderDiv) {
        console.error("[main.js] Error: 'renderDiv' element not found in the DOM.");
        return;
    }

    var setupGameListeners = function setupGameListeners(ui, game) {
        ui.setResetCallback(function() {
            return game.reset();
        });
        ui.setGlowToggleCallback(async function() {
            game.isGlowBright = !game.isGlowBright;
            game.sceneSetup.setGlowMode(game.isGlowBright);
            ui.updateGlowButtonText(game.isGlowBright);
            try {
                await CloudSaves.save('glow', game.isGlowBright ? 0 : 1);
                console.log('[main.js] Glow value saved to cloud:', game.isGlowBright ? 0 : 1);
            } catch (e) {
                console.error('[main.js] Error saving glow to cloud:', e);
            }
        });
        ui.setMusicToggleCallback(function() {
            if (window.gamePushSDK) {
                if (window.gamePushSDK.sounds.isMusicMuted) {
                    window.gamePushSDK.sounds.unmuteMusic();
                    console.log("[main.js] Music button: Включить музыку через SDK.");
                } else {
                    window.gamePushSDK.sounds.muteMusic();
                    console.log("[main.js] Music button: Отключить музыку через SDK.");
                }
            } else {
                game.toggleMusic();
            }
        });
    };

    renderDiv.style.position = 'fixed';
    renderDiv.style.top = '0';
    renderDiv.style.left = '0';
    renderDiv.style.width = '100%';
    renderDiv.style.height = '100%';
    renderDiv.style.margin = '0';
    renderDiv.style.overflow = 'hidden';

    // --- ЛОКАЛИЗАЦИЯ ---
    const lang = getUserLanguage();
    const t = translations[lang];
    var ui = new UI(document.body, t);

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

        console.log('[main.js] Создание экземпляра игры с данными из облака');
        var game = new Game(renderDiv, ui, loadedFont, cloudStats);

        initSoundSDKIntegration(game);
        initVisibilityEvents(game);

        setupGameListeners(ui, game);
        console.log('[main.js] Starting game...');
        try {
            await game.start();
            console.log('[main.js] Game started.');

            if (!cloudStats?.progress) {
                console.log('[main.js] Сохраняем начальное состояние игры в облако');
                try {
                    await game.saveProgress();
                    console.log('[main.js] Начальное состояние игры успешно сохранено в облако');
                } catch (err) {
                    console.error('[main.js] Ошибка при сохранении начального состояния игры:', err);
                }
            }
        } catch (err) {
            console.error('[main.js] Error starting game:', err);
        }
    }, undefined, function(error) {
        console.error('[main.js] Font loading failed:', error);
        ui.showMessage('Error: Could not load font. Please refresh.');
    });
}

// Делаем функцию глобальной для вызова из index.html
window.startGameAfterSDK = startGameAfterSDK;