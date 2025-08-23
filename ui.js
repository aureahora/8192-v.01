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
export var UI = /*#__PURE__*/ function() {
    "use strict";
    function UI(container) {
        var _this = this;
        _class_call_check(this, UI);
        this.container = container;
        
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'uiContainer';
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '0';
        this.uiContainer.style.left = '0';
        this.uiContainer.style.width = '100%';
        this.uiContainer.style.zIndex = '100';
        this.uiContainer.style.backgroundColor = 'rgba(20, 20, 30, 0.7)';
        this.uiContainer.style.backdropFilter = 'blur(5px)';
        this.uiContainer.style.webkitBackdropFilter = 'blur(5px)';
        this.uiContainer.style.padding = '10px';
        this.uiContainer.style.color = '#E0E0FF';
        this.uiContainer.style.fontFamily = "'Orbitron', sans-serif";
        this.uiContainer.style.display = 'flex';
        this.uiContainer.style.boxSizing = 'border-box';

        // Score Display
        this.scoreElement = document.createElement('div');
        this.scoreElement.id = 'score';
        this.scoreElement.textContent = 'Score: 0';
        this.scoreElement.style.fontWeight = 'bold';

        // Stats Displays
        this.highScoreElement = document.createElement('div');
        this.highScoreElement.id = 'highScore';
        this.highScoreElement.textContent = 'Best: 0';
        
        this.highestTileElement = document.createElement('div');
        this.highestTileElement.id = 'highestTile';
        this.highestTileElement.textContent = 'Max Tile: 0';
        
        this.gamesPlayedElement = document.createElement('div');
        this.gamesPlayedElement.id = 'gamesPlayed';
        this.gamesPlayedElement.textContent = 'Games: 0';

        // Left side container (Score + Stats)
        this.infoContainer = document.createElement('div');
        this.infoContainer.id = 'infoContainer';
        this.infoContainer.style.display = 'flex';
        this.infoContainer.style.flexDirection = 'column';
        this.infoContainer.style.alignItems = 'flex-start';

        // Stats Container (grouping the stats elements)
        this.statsContainer = document.createElement('div');
        this.statsContainer.id = 'statsContainer';
        this.statsContainer.style.display = 'flex';
        
        this.infoContainer.appendChild(this.scoreElement);
        this.infoContainer.appendChild(this.statsContainer);

        this.statsContainer.appendChild(this.highScoreElement);
        this.statsContainer.appendChild(this.highestTileElement);
        this.statsContainer.appendChild(this.gamesPlayedElement);

        // Buttons Container
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.id = 'buttonsContainer';
        this.buttonsContainer.style.display = 'flex';
        this.buttonsContainer.style.gap = '8px';

        // Reset Button using helper
        this.resetButton = this._createButton('resetButton', 'Reset', '#ff8c00');
        // Glow Toggle Button using helper
        this.toggleGlowButton = this._createButton('toggleGlowButton', 'Glow', '#007bff'); // Initial blue
        // Music Toggle Button using helper
        this.toggleMusicButton = this._createButton('toggleMusicButton', 'Music', '#6c757d'); // Initial grey
        
        this.buttonsContainer.appendChild(this.resetButton);
        this.buttonsContainer.appendChild(this.toggleGlowButton);
        this.buttonsContainer.appendChild(this.toggleMusicButton);
        
        // Message Overlay
        this.messageElement = document.createElement('div');
        this.messageElement.id = 'message';
        this.messageElement.style.position = 'absolute';
        this.messageElement.style.top = '50%';
        this.messageElement.style.left = '50%';
        this.messageElement.style.transform = 'translate(-50%, -50%)';
        this.messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.messageElement.style.color = 'white';
        this.messageElement.style.padding = '20px';
        this.messageElement.style.borderRadius = '10px';
        this.messageElement.style.textAlign = 'center';
        this.messageElement.style.zIndex = '110';
        this.messageElement.style.display = 'none'; // Hidden by default

        // Assemble UI
        this.uiContainer.appendChild(this.infoContainer);
        this.uiContainer.appendChild(this.buttonsContainer);
        this.container.appendChild(this.uiContainer);
        this.container.appendChild(this.messageElement);

        // --- Credit Box ---
        this.creditBox = document.createElement('div');
        this.creditBox.id = 'creditBox';
        this.creditBox.style.position = 'absolute';
        this.creditBox.style.bottom = '10px';
        this.creditBox.style.left = '10px';
        this.creditBox.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.creditBox.style.padding = '5px 10px';
        this.creditBox.style.borderRadius = '5px';
        this.creditBox.style.fontSize = '10px';
        this.creditBox.style.fontFamily = "'Inter', sans-serif";
        this.creditBox.style.color = '#ccc';
        this.creditBox.style.zIndex = '90';
        var creditLink = document.createElement('a');
        creditLink.target = '_blank';
        creditLink.rel = 'noopener noreferrer';
        creditLink.style.color = '#fff';
        creditLink.style.textDecoration = 'none';
        creditLink.onmouseover = function() { creditLink.style.textDecoration = 'underline'; };
        creditLink.onmouseout = function() { creditLink.style.textDecoration = 'none'; };
        this.creditBox.appendChild(creditLink);
        this.container.appendChild(this.creditBox);

        // Adjust positioning for mobile
        this.adjustLayout();
        window.addEventListener('resize', function() {
            return _this.adjustLayout();
        });
    }
    _create_class(UI, [
        {
            key: "_createButton",
            value: function _createButton(id, text, backgroundColor) {
                var button = document.createElement('button');
                button.id = id;
                button.textContent = text;
                button.style.border = 'none';
                button.style.borderRadius = '5px';
                button.style.backgroundColor = backgroundColor;
                button.style.color = 'white';
                button.style.cursor = 'pointer';
                return button;
            }
        },
        {
            key: "adjustLayout",
            value: function adjustLayout() {
                const screenWidth = window.innerWidth;
                const isMobile = screenWidth <= 768;

                if (isMobile) {
                    // Mobile styles
                    this.uiContainer.style.flexDirection = 'column';
                    this.uiContainer.style.alignItems = 'center';
                    this.uiContainer.style.gap = '10px';
                    
                    this.infoContainer.style.alignItems = 'center';
                    
                    this.statsContainer.style.flexDirection = 'column';
                    this.statsContainer.style.alignItems = 'center';
                    this.statsContainer.style.gap = '2px';
                    this.statsContainer.style.marginTop = '5px';

                    this.scoreElement.style.fontSize = '18px';
                    const statsFontSize = '13px';
                    this.highScoreElement.style.fontSize = statsFontSize;
                    this.highestTileElement.style.fontSize = statsFontSize;
                    this.gamesPlayedElement.style.fontSize = statsFontSize;

                    const btnStyle = { fontSize: '14px', padding: '8px 12px' };
                    Object.assign(this.resetButton.style, btnStyle);
                    Object.assign(this.toggleGlowButton.style, btnStyle);
                    Object.assign(this.toggleMusicButton.style, btnStyle);

                    this.messageElement.style.width = '85%';
                    this.messageElement.style.fontSize = '20px';

                } else {
                    // Desktop styles
                    this.uiContainer.style.flexDirection = 'row';
                    this.uiContainer.style.justifyContent = 'space-between';
                    this.uiContainer.style.alignItems = 'center';
                    this.uiContainer.style.padding = '10px 20px';

                    this.infoContainer.style.alignItems = 'flex-start';

                    this.statsContainer.style.flexDirection = 'row';
                    this.statsContainer.style.gap = '15px';
                    this.statsContainer.style.marginTop = '4px';

                    this.scoreElement.style.fontSize = '20px';
                    const statsFontSize = '14px';
                    this.highScoreElement.style.fontSize = statsFontSize;
                    this.highestTileElement.style.fontSize = statsFontSize;
                    this.gamesPlayedElement.style.fontSize = statsFontSize;

                    const btnStyle = { fontSize: '14px', padding: '8px 12px' };
                    Object.assign(this.resetButton.style, btnStyle);
                    Object.assign(this.toggleGlowButton.style, btnStyle);
                    Object.assign(this.toggleMusicButton.style, btnStyle);
                    
                    this.messageElement.style.width = 'auto';
                    this.messageElement.style.fontSize = '24px';
                }
            }
        },
        {
            key: "updateScore",
            value: function updateScore(score) {
                this.scoreElement.textContent = "Score: ".concat(score);
            }
        },
        {
            key: "updateHighScore",
            value: function updateHighScore(highScore) {
                this.highScoreElement.textContent = "Best: ".concat(highScore);
            }
        },
        {
            key: "updateHighestTile",
            value: function updateHighestTile(tileValue) {
                this.highestTileElement.textContent = "Max Tile: ".concat(tileValue);
            }
        },
        {
            key: "updateGamesPlayed",
            value: function updateGamesPlayed(count) {
                this.gamesPlayedElement.textContent = "Games: ".concat(count);
            }
        },
        {
            key: "setResetCallback",
            value: function setResetCallback(callback) {
                this.resetButton.onclick = callback;
            }
        },
        {
            key: "setGlowToggleCallback",
            value: function setGlowToggleCallback(callback) {
                this.toggleGlowButton.onclick = callback;
            }
        },
        {
            key: "setMusicToggleCallback",
            value: function setMusicToggleCallback(callback) {
                this.toggleMusicButton.onclick = callback;
            }
        },
        {
            key: "updateGlowButtonText",
            value: function updateGlowButtonText(isBright) {
                this.toggleGlowButton.textContent = 'Glow'; // Keep text constant
                this.toggleGlowButton.style.backgroundColor = isBright ? '#007bff' : '#4a5568';
            }
        },
        {
            key: "updateMusicButtonText",
            value: function updateMusicButtonText(isPlaying) {
                this.toggleMusicButton.textContent = 'Music'; // Keep text constant
                this.toggleMusicButton.style.backgroundColor = isPlaying ? '#28a745' : '#6c757d';
            }
        },
        {
            key: "showMessage",
            value: function showMessage(text) {
                this.messageElement.textContent = text;
                this.messageElement.style.display = 'block';
            }
        },
        {
            key: "hideMessage",
            value: function hideMessage() {
                this.messageElement.style.display = 'none';
            }
        }
    ]);
    return UI;
}();