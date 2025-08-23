// Grid dimensions and appearance
export var GRID_SIZE = 5; // 5x5 grid
export var CELL_SIZE = 2; // Size of each cell/tile in 3D units
export var CELL_GAP = 0.3; // Gap between cells
export var BASE_COLOR = 0x444455; // Color of the grid base
// Tile colors (powers of 2: 2, 4, 8, ...) - Neon Palette
export var TILE_COLORS = [
    // User-Provided Neon Palette (Hex codes converted)
    0x39FF14,
    0xFFFF33,
    0xFF6EC7,
    0xFF7F50,
    0xFF00CC,
    0x9D00FF,
    0xFFD700,
    0xFF3131,
    0x00CED1,
    0xBF00FF,
    0xFF5F1F,
    0x1F51FF,
    0xFFFFFF // 8192+ (White - replaces OrangeRed)
];
// Gameplay
export var TARGET_VALUE = 8192; // Win condition
// Font
// Using a readily available font via CDN for simplicity in buildless env
// Source: https://github.com/mrdoob/three.js/tree/dev/examples/fonts
// Make sure this URL is accessible
export var FONT_JSON_URL = 'helvetiker_regular.typeface.json';
