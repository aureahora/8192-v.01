import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { FONT_JSON_URL } from './constants.js';
import { CloudSaves } from './cloudSaves.js'; // CloudSaves integration

// --- [SOUND SDK INTEGRATION & LOGGING] ---
// Helper for GamePush sound events & visibility/focus events
function initSoundSDKIntegration(game) {
    if (!window.gamePushSDK || !game) {
        console.warn("[main.js] GamePush SDK not found, sound integration skipped.");
        return;
    }
    // ВЫКЛЮЧИЛИ ВСЕ ЗВУКИ
    window.gamePushSDK.sounds.on('mute', () => {
        console.log('[Sound SDK] mute: Отключаем все звуки (музыка и эффекты).');
        if (game.backgroundMusic && game.backgroundMusic.isPlaying) game.backgroundMusic.pause();
        game.musicPlaying = false;
        game.ui.updateMusicButtonText(false);
        if (game.tapSound && game.tapSound.isPlaying) game.tapSound.pause();
        if (game.mergeSound && game.mergeSound.isPlaying) game.mergeSound.pause();
    });
    // ВЫКЛЮЧИЛИ только музыку
    window.gamePushSDK.sounds.on('mute:music', () => {
        console.log('[Sound SDK] mute:music: Отключаем только музыку.');
        if (game.backgroundMusic && game.backgroundMusic.isPlaying) game.backgroundMusic.pause();
        game.musicPlaying = false;
        game.ui.updateMusicButtonText(false);
    });
    // ВЫКЛЮЧИЛИ только эффекты
    window.gamePushSDK.sounds.on('mute:sfx', () => {
        console.log('[Sound SDK] mute:sfx: Отключаем только эффекты.');
        if (game.tapSound && game.tapSound.isPlaying) game.tapSound.pause();
        if (game.mergeSound && game.mergeSound.isPlaying) game.mergeSound.pause();
    });
    // ВКЛЮЧИЛИ ВСЕ ЗВУКИ
    window.gamePushSDK.sounds.on('unmute', () => {
        console.log('[Sound SDK] unmute: Включаем все звуки (музыка и эффекты).');
        if (game.backgroundMusic && !window.gamePushSDK.sounds.isMusicMuted) {
            game.backgroundMusic.play();
            game.musicPlaying = true;
            game.ui.updateMusicButtonText(true);
        }
    });
    // ВКЛЮЧИЛИ только музыку
    window.gamePushSDK.sounds.on('unmute:music', () => {
        console.log('[Sound SDK] unmute:music: Включаем только музыку.');
        if (game.backgroundMusic && !window.gamePushSDK.sounds.isMusicMuted) {
            game.backgroundMusic.play();
            game.musicPlaying = true;
            game.ui.updateMusicButtonText(true);
        }
    });
    // ВКЛЮЧИЛИ только эффекты
    window.gamePushSDK.sounds.on('unmute:sfx', () => {
        console.log('[Sound SDK] unmute:sfx: Включаем только эффекты.');
        // В этой реализации эффекты проигрываются по событию, ничего не делаем
    });
    // Логируем текущее состояние звука при старте
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

var renderDiv = document.getElementById('renderDiv');

if (renderDiv) {
    // --- CloudSaves: загрузка облака перед стартом ---
    (async () => {
        var setupGameListeners = function setupGameListeners(ui, game) {
            // Reset listener
            ui.setResetCallback(function() {
                return game.reset();
            });
            // Glow toggle listener
            ui.setGlowToggleCallback(async function() {
                game.isGlowBright = !game.isGlowBright;
                game.sceneSetup.setGlowMode(game.isGlowBright);
                ui.updateGlowButtonText(game.isGlowBright);
                try {
                    await CloudSaves.save('glow', game.isGlowBright ? 0 : 1); // Cloud sync
                    console.log('[main.js] Glow value saved to cloud:', game.isGlowBright ? 0 : 1);
                } catch (e) {
                    console.error('[main.js] Error saving glow to cloud:', e);
                }
            });
            // Music toggle listener — теперь через SDK!
            ui.setMusicToggleCallback(function() {
                // Новое управление через SDK!
                if (window.gamePushSDK) {
                    if (window.gamePushSDK.sounds.isMusicMuted) {
                        window.gamePushSDK.sounds.unmuteMusic();
                        console.log("[main.js] Music button: Включить музыку через SDK.");
                    } else {
                        window.gamePushSDK.sounds.muteMusic();
                        console.log("[main.js] Music button: Отключить музыку через SDK.");
                    }
                } else {
                    // fallback (локально)
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
        renderDiv.style.overflow = 'hidden'; // Prevent scrollbars
        var ui = new UI(document.body);
        var fontLoader = new FontLoader();
        fontLoader.load(FONT_JSON_URL, async function(loadedFont) {
            console.log("[main.js] Font loaded successfully.");
            // --- CloudSaves: ждем SDK и облако ---
            let cloudStats = null;
            try {
                let attempts = 0;
                while (!window.gamePushSDK && attempts < 50) {
                    await new Promise(res => setTimeout(res, 100));
                    attempts++;
                }
                if (window.gamePushSDK) {
                    cloudStats = await CloudSaves.loadAll();
                    console.log('[main.js] Cloud stats loaded:', cloudStats);
                } else {
                    console.warn('[main.js] GamePush SDK not initialized after waiting.');
                }
            } catch (e) {
                console.warn('[main.js] Не удалось загрузить облачные сохранения:', e);
            }
            // Game instance, cloud stats передаем
            var game = new Game(renderDiv, ui, loadedFont, cloudStats);

            // --- Звуковая интеграция ---
            initSoundSDKIntegration(game);
            initVisibilityEvents(game);

            setupGameListeners(ui, game);
            // Log before starting game
            console.log('[main.js] Starting game...');
            try {
                await game.start();
                console.log('[main.js] Game started.');
            } catch (err) {
                console.error('[main.js] Error starting game:', err);
            }
        }, undefined, function(error) {
            console.error('[main.js] Font loading failed:', error);
            ui.showMessage('Error: Could not load font. Please refresh.');
        });
    })();
} else {
    console.error("[main.js] Error: 'renderDiv' element not found in the DOM.");
}