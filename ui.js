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
        // No duplicate constructor here
        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '20px'; // Slightly more space from top
        this.uiContainer.style.left = '50%'; // Center horizontally
        this.uiContainer.style.transform = 'translateX(-50%)'; // Correct centering
        this.uiContainer.style.zIndex = '100';
        this.uiContainer.style.backgroundColor = 'rgba(20, 20, 30, 0.7)'; // Darker translucent background
        this.uiContainer.style.backdropFilter = 'blur(5px)'; // Subtle blur effect
        this.uiContainer.style.webkitBackdropFilter = 'blur(5px)'; // For Safari
        this.uiContainer.style.padding = '10px 20px'; // Slightly more horizontal padding
        this.uiContainer.style.borderRadius = '12px'; // More rounded corners
        this.uiContainer.style.color = '#E0E0FF'; // Off-white/lavender text color
        this.uiContainer.style.fontFamily = "'Orbitron', sans-serif"; // Use Orbitron if available (needs import?) or fallback
        this.uiContainer.style.fontSize = '16px';
        this.uiContainer.style.display = 'flex';
        this.uiContainer.style.flexDirection = 'row'; // Default to row layout now
        this.uiContainer.style.gap = '20px'; // Increase gap between score/stats and buttons
        this.uiContainer.style.alignItems = 'center'; // Align items vertically in the row
        // Score Display
        this.scoreElement = document.createElement('div');
        this.scoreElement.id = 'score';
        this.scoreElement.textContent = 'Score: 0';
        // Stats Displays
        this.highScoreElement = document.createElement('div');
        this.highScoreElement.id = 'highScore';
        this.highScoreElement.textContent = 'Best: 0';
        this.highScoreElement.style.fontSize = '14px'; // Slightly smaller
        this.highScoreElement.style.opacity = '0.8'; // Less emphasis
        this.highestTileElement = document.createElement('div');
        this.highestTileElement.id = 'highestTile';
        this.highestTileElement.textContent = 'Max Tile: 0';
        this.highestTileElement.style.fontSize = '14px';
        this.highestTileElement.style.opacity = '0.8';
        this.gamesPlayedElement = document.createElement('div');
        this.gamesPlayedElement.id = 'gamesPlayed';
        this.gamesPlayedElement.textContent = 'Games: 0';
        this.gamesPlayedElement.style.fontSize = '14px';
        this.gamesPlayedElement.style.opacity = '0.8';
        // Stats Container (grouping the stats elements)
        this.statsContainer = document.createElement('div');
        this.statsContainer.id = 'statsContainer';
        this.statsContainer.style.display = 'flex';
        this.statsContainer.style.flexDirection = 'column'; // Keep stats vertical within their group
        this.statsContainer.style.alignItems = 'flex-start'; // Align stats text left
        this.statsContainer.style.gap = '2px'; // Smaller gap between stats lines
        this.statsContainer.style.marginTop = '0px'; // Remove top margin, handled by flex gap
        // Append stats to their container
        this.statsContainer.appendChild(this.highScoreElement);
        this.statsContainer.appendChild(this.highestTileElement);
        this.statsContainer.appendChild(this.gamesPlayedElement);
        // Buttons Container
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.style.display = 'flex';
        this.buttonsContainer.style.gap = '8px'; // Space between buttons
        // Reset Button using helper
        this.resetButton = this._createButton('resetButton', 'Reset', '#ff8c00');
        // Glow Toggle Button using helper
        this.toggleGlowButton = this._createButton('toggleGlowButton', 'Glow', '#007bff'); // Initial blue
        // Music Toggle Button using helper
        this.toggleMusicButton = this._createButton('toggleMusicButton', 'Music', '#6c757d'); // Initial grey
        this.buttonsContainer.appendChild(this.resetButton);
        this.buttonsContainer.appendChild(this.toggleGlowButton);
        this.buttonsContainer.appendChild(this.toggleMusicButton);
        // Message Overlay (removing the duplicate block)
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
        this.messageElement.style.fontSize = '24px';
        this.messageElement.style.textAlign = 'center';
        this.messageElement.style.zIndex = '110';
        this.messageElement.style.display = 'none'; // Hidden by default
        // Assemble UI
        this.uiContainer.appendChild(this.scoreElement);
        this.uiContainer.appendChild(this.statsContainer); // Add stats container instead of individual stats
        this.uiContainer.appendChild(this.buttonsContainer); // Add buttons container
        this.container.appendChild(this.uiContainer);
        this.container.appendChild(this.messageElement); // Add message element directly to container
        // Adjust positioning for mobile
        this.adjustLayout();
        window.addEventListener('resize', function() {
            return _this.adjustLayout();
        });
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
        this.creditBox.style.fontFamily = "'Inter', sans-serif"; // Use a common sans-serif
        this.creditBox.style.color = '#ccc';
        this.creditBox.style.zIndex = '90'; // Below main UI
        var creditLink = document.createElement('a');
        creditLink.target = '_blank'; // Open in new tab/window
        creditLink.rel = 'noopener noreferrer'; // Security best practice for target="_blank"
        creditLink.style.color = '#fff'; // White link text
        creditLink.style.textDecoration = 'none';
        //creditLink.innerHTML = 'Made by <br>( on <span style="font-weight: bold;">\uD835\uDD4F</span>)'; // Use innerHTML for line break and bold X
        creditLink.onmouseover = function() {
            creditLink.style.textDecoration = 'underline';
        };
        creditLink.onmouseout = function() {
            creditLink.style.textDecoration = 'none';
        };
        this.creditBox.appendChild(creditLink);
        this.container.appendChild(this.creditBox);
        // --- End Credit Box ---
        this.adjustLayout(); // Call adjustLayout again after adding the credit box
    }
    _create_class(UI, [
        {
            // Helper function to create and style buttons
            key: "_createButton",
            value: function _createButton(id, text, backgroundColor) {
                var button = document.createElement('button');
                button.id = id;
                button.textContent = text;
                button.style.padding = '8px 12px';
                button.style.border = 'none';
                button.style.borderRadius = '5px';
                button.style.backgroundColor = backgroundColor;
                button.style.color = 'white';
                button.style.cursor = 'pointer';
                button.style.fontSize = '14px';
                return button;
            }
        },
        {
            key: "adjustLayout",
            value: function adjustLayout() {
                var screenWidth = window.innerWidth;
                var screenHeight = window.innerHeight;
                var isPortrait = screenHeight > screenWidth;
                
                // Улучшенная логика определения типа устройства
                var isVerySmallScreen = screenWidth <= 480 && screenHeight <= 854; // Маленькие смартфоны
                var isSmallTablet = screenWidth <= 768 && screenWidth > 480;
                var isLikelyMobile = screenWidth <= 768 || screenHeight <= 500;
                var aspectRatio = screenWidth / screenHeight;
                
                console.log(`[UI] Adjusting layout: ${screenWidth}x${screenHeight}, ratio: ${aspectRatio.toFixed(2)}`);
                
                // Reset common styles that might change
                this.uiContainer.style.width = 'auto';
                this.uiContainer.style.alignItems = 'center';
                this.statsContainer.style.marginTop = '0px';
                this.statsContainer.style.justifyContent = 'flex-start';
                this.buttonsContainer.style.marginTop = '0px';
                this.buttonsContainer.style.justifyContent = 'flex-start';
                this.buttonsContainer.style.flexWrap = 'nowrap';
                this.scoreElement.style.textAlign = 'left';
                this.messageElement.style.width = 'auto'; // Reset message width
                
                // Apply device-specific adaptive styles
                if (isVerySmallScreen) {
                    // Очень маленькие экраны - максимальная компактность
                    console.log("UI Mode: Very Small Screen");
                    this.uiContainer.style.top = '5px';
                    this.uiContainer.style.width = 'calc(100% - 10px)';
                    this.uiContainer.style.padding = '5px';
                    this.uiContainer.style.gap = '5px';
                    this.uiContainer.style.flexDirection = isPortrait ? 'column' : 'row';
                    this.scoreElement.style.fontSize = '14px';
                    this.scoreElement.style.textAlign = 'center';
                    this.statsContainer.style.flexDirection = 'row';
                    this.statsContainer.style.justifyContent = 'space-around';
                    this.statsContainer.style.gap = '4px';
                    this.buttonsContainer.style.flexDirection = 'row';
                    this.buttonsContainer.style.gap = '4px';
                    this.messageElement.style.fontSize = '16px';
                    
                    // Очень компактные кнопки
                    var verySmallBtnStyle = {
                        fontSize: '10px',
                        padding: '4px 6px'
                    };
                    Object.assign(this.resetButton.style, verySmallBtnStyle);
                    Object.assign(this.toggleGlowButton.style, verySmallBtnStyle);
                    Object.assign(this.toggleMusicButton.style, verySmallBtnStyle);
                    
                } else if (isLikelyMobile) {
                    if (isPortrait) {
                        // Mobile Portrait
                        console.log("UI Mode: Mobile Portrait");
                        this.uiContainer.style.top = '10px';
                        this.uiContainer.style.width = 'calc(100% - 20px)';
                        this.uiContainer.style.padding = '10px';
                        this.uiContainer.style.gap = '10px';
                        this.uiContainer.style.flexDirection = 'column';
                        this.uiContainer.style.alignItems = 'stretch';
                        this.scoreElement.style.fontSize = '18px';
                        this.scoreElement.style.textAlign = 'center';
                        this.statsContainer.style.flexDirection = 'row';
                        this.statsContainer.style.justifyContent = 'space-around';
                        this.statsContainer.style.gap = '8px';
                        this.statsContainer.style.marginTop = '5px';
                        this.buttonsContainer.style.flexDirection = 'row';
                        this.buttonsContainer.style.flexWrap = 'wrap';
                        this.buttonsContainer.style.justifyContent = 'center';
                        this.buttonsContainer.style.gap = '8px';
                        this.buttonsContainer.style.marginTop = '10px';
                        this.messageElement.style.width = '85%';
                        this.messageElement.style.fontSize = '20px';
                        if (this.creditBox) {
                            this.creditBox.style.bottom = '5px';
                            this.creditBox.style.left = '5px';
                            this.creditBox.style.fontSize = '9px';
                            this.creditBox.style.padding = '4px 8px';
                        }
                    } else {
                        // Mobile Landscape
                        console.log("UI Mode: Mobile Landscape");
                        this.uiContainer.style.top = '5px';
                        this.uiContainer.style.width = 'calc(100% - 10px)';
                        this.uiContainer.style.padding = '5px 10px';
                        this.uiContainer.style.gap = '15px';
                        this.uiContainer.style.flexDirection = 'row';
                        // alignItems: 'center' (already reset)
                        this.uiContainer.style.justifyContent = 'center';
                        this.scoreElement.style.fontSize = '14px';
                        this.statsContainer.style.flexDirection = 'row';
                        this.statsContainer.style.gap = '10px';
                        // marginTop: '0px' (already reset)
                        this.buttonsContainer.style.flexDirection = 'row';
                        this.buttonsContainer.style.gap = '6px';
                        // marginTop: '0px' (already reset)
                        this.messageElement.style.width = '70%';
                        this.messageElement.style.fontSize = '18px';
                        // Apply smaller font/padding to buttons in landscape
                        var btnStyle = {
                            fontSize: '12px',
                            padding: '5px 8px'
                        };
                        Object.assign(this.resetButton.style, btnStyle);
                        Object.assign(this.toggleGlowButton.style, btnStyle);
                        Object.assign(this.toggleMusicButton.style, btnStyle);
                        if (this.creditBox) {
                            this.creditBox.style.bottom = '5px';
                            this.creditBox.style.left = '5px';
                            this.creditBox.style.fontSize = '9px';
                            this.creditBox.style.padding = '3px 6px';
                        }
                    }
                } else {
                    // Desktop и большие экраны
                    var isLargeDesktop = screenWidth >= 1920;
                    var isUltraWide = aspectRatio > 2.0;
                    
                    console.log(`UI Mode: Desktop (Large: ${isLargeDesktop}, UltraWide: ${isUltraWide})`);
                    
                    this.uiContainer.style.top = isLargeDesktop ? '30px' : '20px';
                    this.uiContainer.style.padding = isLargeDesktop ? '15px 30px' : '10px 20px';
                    this.uiContainer.style.gap = isLargeDesktop ? '30px' : '20px';
                    this.uiContainer.style.flexDirection = 'row';
                    
                    // Адаптивные размеры для больших экранов
                    var scoreFontSize = isLargeDesktop ? '20px' : '16px';
                    var messageFontSize = isLargeDesktop ? '32px' : '24px';
                    var btnFontSize = isLargeDesktop ? '16px' : '14px';
                    var btnPadding = isLargeDesktop ? '10px 16px' : '8px 12px';
                    
                    this.scoreElement.style.fontSize = scoreFontSize;
                    this.statsContainer.style.flexDirection = 'column';
                    this.statsContainer.style.alignItems = 'flex-start';
                    this.statsContainer.style.gap = isLargeDesktop ? '4px' : '2px';
                    this.buttonsContainer.style.flexDirection = 'row';
                    this.buttonsContainer.style.gap = isLargeDesktop ? '12px' : '8px';
                    this.messageElement.style.fontSize = messageFontSize;
                    
                    // Адаптивные стили кнопок для desktop
                    var desktopBtnStyle = {
                        fontSize: btnFontSize,
                        padding: btnPadding
                    };
                    Object.assign(this.resetButton.style, desktopBtnStyle);
                    Object.assign(this.toggleGlowButton.style, desktopBtnStyle);
                    Object.assign(this.toggleMusicButton.style, desktopBtnStyle);
                    
                    if (this.creditBox) {
                        this.creditBox.style.bottom = isLargeDesktop ? '15px' : '10px';
                        this.creditBox.style.left = isLargeDesktop ? '15px' : '10px';
                        this.creditBox.style.fontSize = isLargeDesktop ? '12px' : '10px';
                        this.creditBox.style.padding = isLargeDesktop ? '8px 15px' : '5px 10px';
                    }
                }
                
                // Адаптивные размеры шрифта для статистики на основе размера экрана
                var statsFontSize;
                if (isVerySmallScreen) {
                    statsFontSize = '11px';
                } else if (isLikelyMobile) {
                    statsFontSize = '13px';
                } else if (screenWidth >= 1920) {
                    statsFontSize = '16px';
                } else {
                    statsFontSize = '14px';
                }
                
                this.highScoreElement.style.fontSize = statsFontSize;
                this.highestTileElement.style.fontSize = statsFontSize;
                this.gamesPlayedElement.style.fontSize = statsFontSize;
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
                // Optional: Change color based on state
                this.toggleGlowButton.style.backgroundColor = isBright ? '#007bff' : '#4a5568'; // Blue when bright, darker grey when dark
            }
        },
        {
            key: "updateMusicButtonText",
            value: function updateMusicButtonText(isPlaying) {
                this.toggleMusicButton.textContent = 'Music'; // Keep text constant
                this.toggleMusicButton.style.backgroundColor = isPlaying ? '#28a745' : '#6c757d'; // Green when playing, grey when off
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
