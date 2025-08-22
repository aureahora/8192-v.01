import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { FONT_JSON_URL } from './constants.js';
// Get the render target
var renderDiv = document.getElementById('renderDiv');
// Ensure renderDiv exists and is styled for fullscreen overlay
if (renderDiv) {
    var setupGameListeners = // Function to setup listeners after game is initialized
    function setupGameListeners(ui, game) {
        // Setup reset listener
        ui.setResetCallback(function() {
            return game.reset();
        });
        // Setup glow toggle listener
        var isGlowBright = true; // Start in bright mode
        ui.updateGlowButtonText(isGlowBright); // Set initial button text to "Glow: Bright"
        ui.setGlowToggleCallback(function() {
            isGlowBright = !isGlowBright;
            // Call the new mode setting function
            game.sceneSetup.setGlowMode(isGlowBright);
            ui.updateGlowButtonText(isGlowBright); // Update button text based on the state
            ui.updateGlowButtonText(isGlowBright); // Update button text based on the state
        });
        // Setup music toggle listener
        ui.setMusicToggleCallback(function() {
            return game.toggleMusic();
        });
    } // End of setupGameListeners
    ;
    renderDiv.style.position = 'fixed';
    renderDiv.style.top = '0';
    renderDiv.style.left = '0';
    renderDiv.style.width = '100%';
    renderDiv.style.height = '100%';
    renderDiv.style.margin = '0';
    renderDiv.style.overflow = 'hidden'; // Prevent scrollbars
    // Initialize UI (needs parent container)
    var ui = new UI(document.body); // Attach UI elements to body
    // --- Font Loading ---
    var fontLoader = new FontLoader();
    fontLoader.load(FONT_JSON_URL, function(loadedFont) {
        console.log("Font loaded successfully in main.js");
        // Initialize the game ONLY after the font is loaded
        var game = new Game(renderDiv, ui, loadedFont);
        // Setup UI listeners that need the game instance
        setupGameListeners(ui, game);
        // Start the game
        game.start();
    }, undefined, function(error) {
        console.error('Font loading failed:', error);
        // Handle font loading failure (e.g., display error message)
        ui.showMessage('Error: Could not load font. Please refresh.');
    });
} else {
    console.error("Error: 'renderDiv' element not found in the DOM.");
}
