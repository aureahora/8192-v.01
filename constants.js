// Grid dimensions and appearance
export var GRID_SIZE = 5; // 5x5 grid

// Dynamic cell size calculation based on container size and orientation
export function getCellSize(container) {
    // Use the smaller of width or height, minus some margin
    const margin = 32; // px
    const w = (container?.clientWidth || window.innerWidth) - margin;
    const h = (container?.clientHeight || window.innerHeight) - margin;
    const minDim = Math.min(w, h);
    // Formula: available / (GRID_SIZE + gaps)
    const gapRatio = 0.14; // proportion of gap vs cell, adjust for visual spacing
    // Total gaps = (GRID_SIZE - 1) * gap
    const totalGap = minDim * gapRatio;
    const cellSize = (minDim - totalGap) / GRID_SIZE;
    // Clamp cell size to keep it reasonable on extreme screens
    return Math.max(Math.min(cellSize, 120), 32);
}

export var CELL_GAP = 0.3; // Gap between cells (will be scaled relatively)
export var BASE_COLOR = 0x444455; // Color of the grid base
// Tile colors (powers of 2: 2, 4, 8, ...) - Neon Palette
export var TILE_COLORS = [
    0x39FF14, 0xFFFF33, 0xFF6EC7, 0xFF7F50, 0xFF00CC, 0x9D00FF,
    0xFFD700, 0xFF3131, 0x00CED1, 0xBF00FF, 0xFF5F1F, 0x1F51FF,
    0xFFFFFF // 8192+ (White - replaces OrangeRed)
];
// Gameplay
export var TARGET_VALUE = 8192; // Win condition
export var FONT_JSON_URL = 'helvetiker_regular.typeface.json';