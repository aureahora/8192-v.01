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
export var InputHandler = /*#__PURE__*/ function() {
    "use strict";
    function InputHandler(element) {
        _class_call_check(this, InputHandler);
        this.element = element;
        this.moveCallback = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 30; // Minimum distance in pixels to register as a swipe
        this.isEnabled = true; // Новый флаг для определения активности ввода
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        window.addEventListener('keydown', this.handleKeyDown);
        this.element.addEventListener('touchstart', this.handleTouchStart, {
            passive: false
        }); // Passive false to potentially prevent scrolling
        this.element.addEventListener('touchmove', this.handleTouchMove, {
            passive: false
        });
        this.element.addEventListener('touchend', this.handleTouchEnd);
    }
    _create_class(InputHandler, [
        {
            key: "onMove",
            value: function onMove(callback) {
                this.moveCallback = callback;
            }
        },
        {
            // Новый метод для включения/отключения ввода
            key: "setInputEnabled",
            value: function setInputEnabled(enabled) {
                this.isEnabled = enabled;
            }
        },
        {
            key: "handleKeyDown",
            value: function handleKeyDown(event) {
                // Проверяем флаг isEnabled перед обработкой ввода
                if (!this.moveCallback || !this.isEnabled) return;
                
                var direction = null;
                switch(event.key){
                    case 'ArrowUp':
                        direction = {
                            x: 0,
                            y: 1
                        };
                        break;
                    case 'ArrowDown':
                        direction = {
                            x: 0,
                            y: -1
                        };
                        break;
                    case 'ArrowLeft':
                        direction = {
                            x: -1,
                            y: 0
                        };
                        break;
                    case 'ArrowRight':
                        direction = {
                            x: 1,
                            y: 0
                        };
                        break;
                    default:
                        return; // Ignore other keys
                }
                event.preventDefault(); // Prevent default arrow key actions (scrolling)
                this.moveCallback(direction);
            }
        },
        {
            key: "handleTouchStart",
            value: function handleTouchStart(event) {
                // Проверяем флаг isEnabled перед обработкой ввода
                if (!this.isEnabled) return;
                
                // Prevent default touch actions like scrolling or zooming if swipe starts on the game area
                if (event.touches.length === 1) {
                    event.preventDefault();
                    this.touchStartX = event.touches[0].clientX;
                    this.touchStartY = event.touches[0].clientY;
                    this.touchEndX = this.touchStartX; // Initialize end points
                    this.touchEndY = this.touchStartY;
                }
            }
        },
        {
            key: "handleTouchMove",
            value: function handleTouchMove(event) {
                // Проверяем флаг isEnabled перед обработкой ввода
                if (!this.isEnabled) return;
                
                if (event.touches.length === 1) {
                    event.preventDefault(); // Prevent scrolling while swiping
                    this.touchEndX = event.touches[0].clientX;
                    this.touchEndY = event.touches[0].clientY;
                }
            }
        },
        {
            key: "handleTouchEnd",
            value: function handleTouchEnd(event) {
                // Проверяем флаг isEnabled перед обработкой ввода
                if (!this.moveCallback || !this.isEnabled || this.touchStartX === 0) return;
                
                var deltaX = this.touchEndX - this.touchStartX;
                var deltaY = this.touchEndY - this.touchStartY;
                // Reset points for next touch
                this.touchStartX = 0;
                this.touchStartY = 0;
                var direction = null;
                // Check if it was a swipe (significant movement in one direction)
                if (Math.abs(deltaX) > this.minSwipeDistance || Math.abs(deltaY) > this.minSwipeDistance) {
                    // Determine dominant direction
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        // Horizontal swipe
                        direction = deltaX > 0 ? {
                            x: 1,
                            y: 0
                        } : {
                            x: -1,
                            y: 0
                        };
                    } else {
                        // Vertical swipe
                        direction = deltaY > 0 ? {
                            x: 0,
                            y: -1
                        } : {
                            x: 0,
                            y: 1
                        }; // Y is inverted in screen coords vs game grid
                    }
                    this.moveCallback(direction);
                }
            // If movement is too small, it's considered a tap, do nothing
            }
        },
        {
            key: "dispose",
            value: function dispose() {
                window.removeEventListener('keydown', this.handleKeyDown);
                this.element.removeEventListener('touchstart', this.handleTouchStart);
                this.element.removeEventListener('touchmove', this.handleTouchMove);
                this.element.removeEventListener('touchend', this.handleTouchEnd);
                this.moveCallback = null;
            }
        }
    ]);
    return InputHandler;
}();