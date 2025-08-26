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
export var UI = /*#__PURE__*/ function() {
    "use strict";
    function UI(container, providedTranslations) {
        var _this = this;
        _class_call_check(this, UI);
        this.container = container;

        // Определяем язык
        const lang = getUserLanguage();
        this.t = providedTranslations || translations[lang] || translations['en'];

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
        this.scoreElement.textContent = `${this.t.score}: 0`;
        this.scoreElement.style.fontWeight = 'bold';

        // Stats Displays
        this.highScoreElement = document.createElement('div');
        this.highScoreElement.id = 'highScore';
        this.highScoreElement.textContent = `${this.t.best}: 0`;
        
        this.highestTileElement = document.createElement('div');
        this.highestTileElement.id = 'highestTile';
        this.highestTileElement.textContent = `${this.t.maxTile}: 0`;
        
        this.gamesPlayedElement = document.createElement('div');
        this.gamesPlayedElement.id = 'gamesPlayed';
        this.gamesPlayedElement.textContent = `${this.t.games}: 0`;

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

        // Buttons Container (игровое поле)
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.id = 'buttonsContainer';
        this.buttonsContainer.style.display = 'flex';
        this.buttonsContainer.style.gap = '8px';

        // --- MENU BUTTON (NEW) ---
        this.menuButton = this._createButton('menuButton', 'Menu', '#d76753'); // Main color
        this.menuButton.isActive = false;
        this.menuButton.style.transition = 'background-color 0.25s cubic-bezier(.4,0,.2,1)';

        // Reset Button using helper
        this.resetButton = this._createButton('resetButton', this.t.reset, '#ff8c00');
        // Save Button вместо Glow/Music
        this.saveButton = this._createButton('saveButton', 'Save', '#28a745');
        this.saveButton.style.backgroundColor = '#28a745';

        // --- Add buttons in desired order: Menu, Reset, Save ---
        this.buttonsContainer.appendChild(this.menuButton);
        this.buttonsContainer.appendChild(this.resetButton);
        this.buttonsContainer.appendChild(this.saveButton);

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

        // === Меню Overlay ===
        this.menuOverlay = document.createElement('div');
        this.menuOverlay.id = 'menuOverlay';
        this.menuOverlay.style.position = 'fixed';
        this.menuOverlay.style.top = '0';
        this.menuOverlay.style.left = '0';
        this.menuOverlay.style.width = '100vw';
        this.menuOverlay.style.height = '100vh';
        this.menuOverlay.style.display = 'none';
        this.menuOverlay.style.alignItems = 'center';
        this.menuOverlay.style.justifyContent = 'center';
        this.menuOverlay.style.background = 'rgba(20, 20, 40, 0.65)';
        this.menuOverlay.style.zIndex = '200';
        this.menuOverlay.style.backdropFilter = 'blur(7px)';
        this.menuOverlay.style.transition = 'opacity 0.3s cubic-bezier(.4,0,.2,1)';

        // Меню-плашка (адаптивная)
        this.menuCard = document.createElement('div');
        this.menuCard.style.width = 'min(90vw, 420px)';
        this.menuCard.style.maxWidth = '98vw';
        this.menuCard.style.minWidth = '230px';
        this.menuCard.style.background = 'linear-gradient(135deg, #23233a 60%, #3b3b65 100%)';
        this.menuCard.style.borderRadius = '27px';
        this.menuCard.style.boxShadow = '0 6px 32px rgba(80,60,180,0.22)';
        this.menuCard.style.padding = '32px 22px 24px 22px';
        this.menuCard.style.textAlign = 'center';
        this.menuCard.style.display = 'flex';
        this.menuCard.style.flexDirection = 'column';
        this.menuCard.style.alignItems = 'center';

        // Заголовок меню
        this.menuTitle = document.createElement('div');
        this.menuTitle.textContent = '8192: Space Cubes Challenge';
        this.menuTitle.style.fontFamily = "'Orbitron', 'Segoe UI', 'Arial', sans-serif";
        this.menuTitle.style.fontSize = '2.2em';
        this.menuTitle.style.fontWeight = 'bold';
        this.menuTitle.style.letterSpacing = '0.07em';
        this.menuTitle.style.color = 'rgba(57,255,20,0.97)';
        this.menuTitle.style.textShadow = '0 0 16px #39FF14, 0 1px 0 #fff, 0 4px 24px #9D00FF';
        this.menuTitle.style.marginBottom = '36px';

        // --- Меню: Кнопки Сияние/Музыка/Play ---
        this.menuButtonsRow = document.createElement('div');
        this.menuButtonsRow.style.display = 'flex';
        this.menuButtonsRow.style.flexDirection = 'row';
        this.menuButtonsRow.style.justifyContent = 'center';
        this.menuButtonsRow.style.alignItems = 'center';
        this.menuButtonsRow.style.gap = '18px';

        // Кнопка Сияние (Glow)
        this.menuGlowButton = document.createElement('button');
        this.menuGlowButton.id = 'menuGlowButton';
        this.menuGlowButton.textContent = this.t.glow;
        this.menuGlowButton.style.border = 'none';
        this.menuGlowButton.style.borderRadius = '13px';
        this.menuGlowButton.style.background = '#007bff';
        this.menuGlowButton.style.color = 'white';
        this.menuGlowButton.style.fontSize = '1em';
        this.menuGlowButton.style.fontWeight = 'bold';
        this.menuGlowButton.style.padding = '10px 16px';
        this.menuGlowButton.style.height = '46px';
        this.menuGlowButton.style.cursor = 'pointer';
        this.menuGlowButton.style.transition = 'background 0.2s';

        // Кнопка Play/Continue
        this.menuPlayButton = document.createElement('button');
        this.menuPlayButton.id = 'menuPlayButton';
        this.menuPlayButton.textContent = 'Play';
        this.menuPlayButton.style.fontSize = '1.25em';
        this.menuPlayButton.style.fontWeight = 'bold';
        this.menuPlayButton.style.padding = '12px 40px';
        this.menuPlayButton.style.borderRadius = '18px';
        this.menuPlayButton.style.border = 'none';
        this.menuPlayButton.style.background = 'linear-gradient(90deg, #39FF14 30%, #FFD700 100%)';
        this.menuPlayButton.style.color = '#222';
        this.menuPlayButton.style.boxShadow = '0 2px 12px #00CED1';
        this.menuPlayButton.style.cursor = 'pointer';
        this.menuPlayButton.style.transition = 'background 0.2s, color 0.2s';
        this.menuPlayButton.style.marginTop = '6px';

        // Кнопка Музыка (Music)
        this.menuMusicButton = document.createElement('button');
        this.menuMusicButton.id = 'menuMusicButton';
        this.menuMusicButton.textContent = this.t.music;
        this.menuMusicButton.style.border = 'none';
        this.menuMusicButton.style.borderRadius = '13px';
        this.menuMusicButton.style.background = '#6c757d';
        this.menuMusicButton.style.color = 'white';
        this.menuMusicButton.style.fontSize = '1em';
        this.menuMusicButton.style.fontWeight = 'bold';
        this.menuMusicButton.style.padding = '10px 16px';
        this.menuMusicButton.style.height = '46px';
        this.menuMusicButton.style.cursor = 'pointer';
        this.menuMusicButton.style.transition = 'background 0.2s';

        // Собираем меню-кнопки
        this.menuButtonsRow.appendChild(this.menuGlowButton);
        this.menuButtonsRow.appendChild(this.menuPlayButton);
        this.menuButtonsRow.appendChild(this.menuMusicButton);

        // Сборка меню
        this.menuCard.appendChild(this.menuTitle);
        this.menuCard.appendChild(this.menuButtonsRow);
        this.menuOverlay.appendChild(this.menuCard);
        this.container.appendChild(this.menuOverlay);

        // Assemble UI
        this.uiContainer.appendChild(this.infoContainer);
        this.uiContainer.appendChild(this.buttonsContainer);
        this.container.appendChild(this.uiContainer);
        this.container.appendChild(this.messageElement);

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
                button.style.transition = 'background-color 0.25s cubic-bezier(.4,0,.2,1)';
                button.style.fontSize = '14px';
                button.style.padding = '8px 12px';
                button.style.height = '36px';
                return button;
            }
        },
        {
            key: "adjustLayout",
            value: function adjustLayout() {
                const screenWidth = window.innerWidth;
                const isMobile = screenWidth <= 768;
                const btnStyle = { fontSize: '14px', padding: '8px 12px', height: '36px' };

                if (isMobile) {
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

                    Object.assign(this.menuButton.style, btnStyle);
                    Object.assign(this.resetButton.style, btnStyle);
                    Object.assign(this.saveButton.style, btnStyle);

                    this.messageElement.style.width = '85%';
                    this.messageElement.style.fontSize = '20px';

                    this.menuCard.style.width = '90vw';
                    this.menuTitle.style.fontSize = '1.6em';
                    this.menuPlayButton.style.fontSize = '1em';
                    this.menuGlowButton.style.fontSize = '0.9em';
                    this.menuMusicButton.style.fontSize = '0.9em';
                } else {
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

                    Object.assign(this.menuButton.style, btnStyle);
                    Object.assign(this.resetButton.style, btnStyle);
                    Object.assign(this.saveButton.style, btnStyle);

                    this.messageElement.style.width = 'auto';
                    this.messageElement.style.fontSize = '24px';

                    this.menuCard.style.width = 'min(90vw, 420px)';
                    this.menuTitle.style.fontSize = '2.2em';
                    this.menuPlayButton.style.fontSize = '1.25em';
                    this.menuGlowButton.style.fontSize = '1em';
                    this.menuMusicButton.style.fontSize = '1em';
                }
            }
        },
        {
            key: "updateScore",
            value: function updateScore(score) {
                this.scoreElement.textContent = `${this.t.score}: ${score}`;
            }
        },
        {
            key: "updateHighScore",
            value: function updateHighScore(highScore) {
                this.highScoreElement.textContent = `${this.t.best}: ${highScore}`;
            }
        },
        {
            key: "updateHighestTile",
            value: function updateHighestTile(tileValue) {
                this.highestTileElement.textContent = `${this.t.maxTile}: ${tileValue}`;
            }
        },
        {
            key: "updateGamesPlayed",
            value: function updateGamesPlayed(count) {
                this.gamesPlayedElement.textContent = `${this.t.games}: ${count}`;
            }
        },
        {
            key: "setResetCallback",
            value: function setResetCallback(callback) {
                this.resetButton.onclick = callback;
            }
        },
        {
            key: "setSaveCallback",
            value: function setSaveCallback(callback) {
                this.saveButton.onclick = async () => {
                    this.saveButton.style.backgroundColor = '#6c757d';
                    await callback();
                    setTimeout(() => {
                        this.saveButton.style.backgroundColor = '#28a745';
                    }, 600);
                };
            }
        },
        {
            key: "setMenuButtonCallback",
            value: function setMenuButtonCallback(callback) {
                this.menuButton.onclick = callback;
            }
        },
        // --- Меню кнопки ---
        {
            key: "setMenuGlowCallback",
            value: function setMenuGlowCallback(callback) {
                this.menuGlowButton.onclick = () => {
                    const isBright = callback();
                    this.menuGlowButton.style.background = isBright ? '#007bff' : '#4a5568';
                };
            }
        },
        {
            key: "setMenuMusicCallback",
            value: function setMenuMusicCallback(callback) {
                this.menuMusicButton.onclick = () => {
                    const isPlaying = callback();
                    this.menuMusicButton.style.background = isPlaying ? '#28a745' : '#6c757d';
                };
            }
        },
        {
            key: "setMenuPlayCallback",
            value: function setMenuPlayCallback(callback) {
                this.menuPlayButton.onclick = callback;
            }
        },
        {
            key: "updateGlowButtonText",
            value: function updateGlowButtonText(isBright) {
                // on menu only!
                this.menuGlowButton.textContent = this.t.glow;
                this.menuGlowButton.style.background = isBright ? '#007bff' : '#4a5568';
            }
        },
        {
            key: "updateMusicButtonText",
            value: function updateMusicButtonText(isPlaying) {
                // on menu only!
                this.menuMusicButton.textContent = this.t.music;
                this.menuMusicButton.style.background = isPlaying ? '#28a745' : '#6c757d';
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
        },
        {
            key: "showMenu",
            value: function showMenu(isContinue = false) {
                this.menuPlayButton.textContent = isContinue ? 'Continue' : 'Play';
                this.menuOverlay.style.display = 'flex';
            }
        },
        {
            key: "hideMenu",
            value: function hideMenu() {
                this.menuOverlay.style.display = 'none';
            }
        }
    ]);
    return UI;
}();