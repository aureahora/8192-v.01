import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { FONT_JSON_URL } from './constants.js';
import { CloudSaves } from './cloudSaves.js'; // CloudSaves integration

// Get the render target
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
                await CloudSaves.save('glow', game.isGlowBright ? 0 : 1); // Cloud sync
            });
            // Music toggle listener
            ui.setMusicToggleCallback(function() {
                return game.toggleMusic();
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
            console.log("Font loaded successfully in main.js");
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
                }
            } catch (e) {
                console.warn('[main.js] Не удалось загрузить облачные сохранения:', e);
            }
            // Game instance, cloud stats передаем
            var game = new Game(renderDiv, ui, loadedFont, cloudStats);
            setupGameListeners(ui, game);
            await game.start();
        }, undefined, function(error) {
            console.error('Font loading failed:', error);
            ui.showMessage('Error: Could not load font. Please refresh.');
        });
    })();
} else {
    console.error("Error: 'renderDiv' element not found in the DOM.");
}