// Grid dimensions and appearance
export var GRID_SIZE = 5; // 5x5 grid
export var CELL_SIZE = 2; // Default size of each cell/tile in 3D units (used as fallback)
export var CELL_GAP = 0.3; // Gap between cells
export var BASE_COLOR = 0x444455; // Color of the grid base

// Функция для вычисления размера клетки на основе размеров контейнера
// Автоматически адаптирует размер сетки под доступное пространство
export function getCellSize(container) {
    if (!container) {
        console.warn('[constants.js] Container не определён, используется размер по умолчанию');
        return CELL_SIZE;
    }
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Определяем доступное пространство (оставляем место для UI)
    // На мобильных устройствах UI занимает больше места по вертикали
    const isMobile = containerWidth <= 768;
    const availableWidth = containerWidth * 0.85;  // 85% ширины для сетки
    const availableHeight = containerHeight * (isMobile ? 0.65 : 0.75); // 65% на мобильных, 75% на десктопе
    
    // Размер всей сетки = GRID_SIZE * cellSize + (GRID_SIZE - 1) * CELL_GAP
    // Решаем уравнение: availableSpace = GRID_SIZE * cellSize + (GRID_SIZE - 1) * CELL_GAP
    const widthBasedSize = (availableWidth - (GRID_SIZE - 1) * CELL_GAP) / GRID_SIZE;
    const heightBasedSize = (availableHeight - (GRID_SIZE - 1) * CELL_GAP) / GRID_SIZE;
    
    // Выбираем меньший размер, чтобы сетка помещалась полностью
    let calculatedSize = Math.min(widthBasedSize, heightBasedSize);
    
    // Ограничиваем размер минимальным и максимальным значением для оптимального игрового опыта
    const minSize = 0.8;  // Минимальный размер для мобильных устройств
    const maxSize = 3.5;  // Максимальный размер для больших экранов
    
    calculatedSize = Math.max(minSize, Math.min(maxSize, calculatedSize));
    
    return calculatedSize;
}
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
