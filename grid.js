import * as THREE from 'three';
import { Tile } from './tile.js';
import { GRID_SIZE, CELL_GAP, BASE_COLOR, getCellSize } from './constants.js';

// Grid now receives container for adaptive sizing and uses dynamic cellSize
export var Grid = /*#__PURE__*/ function() {
    "use strict";
    function Grid(size, scene, loadedFont, container) {
        this.size = size;
        this.scene = scene;
        this.loadedFont = loadedFont;
        this.container = container;
        this.cellSize = getCellSize(container); // Responsive cell size
        this.cells = Array(size).fill(null).map(function() {
            return Array(size).fill(null);
        });
        this.gridGroup = new THREE.Group();
        this.createGridBase();
        this.scene.add(this.gridGroup);
        // Center the grid visually
        var offset = (this.size * this.cellSize + (this.size - 1) * CELL_GAP) / 2 - this.cellSize / 2;
        this.gridGroup.position.set(-offset, -offset, 0);
    }

    // Method to update cell size (called on resize)
    Grid.prototype.updateCellSize = function(newCellSize) {
        // If newCellSize provided, use it. Otherwise, recalculate from container.
        this.cellSize = typeof newCellSize === 'number' ? newCellSize : getCellSize(this.container);
        // Remove old grid base and cell visuals
        while (this.gridGroup.children.length) {
            this.gridGroup.remove(this.gridGroup.children[0]);
        }
        this.createGridBase();
        // Update positions and sizes of all tiles
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.cells[r][c]) {
                    this.cells[r][c].mesh.position.copy(this.getCellPosition(c, r));
                    if (typeof this.cells[r][c].updateCellSize === 'function') {
                        this.cells[r][c].updateCellSize(this.cellSize);
                    }
                }
            }
        }
        // Recenter grid
        var offset = (this.size * this.cellSize + (this.size - 1) * CELL_GAP) / 2 - this.cellSize / 2;
        this.gridGroup.position.set(-offset, -offset, 0);
    };

    Grid.prototype.createGridBase = function() {
        // Base grid
        var baseGeometry = new THREE.BoxGeometry(
            this.size * this.cellSize + (this.size + 1) * CELL_GAP,
            this.size * this.cellSize + (this.size + 1) * CELL_GAP,
            this.cellSize / 4
        );
        var baseMaterial = new THREE.MeshStandardMaterial({
            color: BASE_COLOR,
            metalness: 0.3,
            roughness: 0.6
        });
        var gridBase = new THREE.Mesh(baseGeometry, baseMaterial);
        gridBase.position.set(
            (this.size * this.cellSize + (this.size - 1) * CELL_GAP) / 2 - this.cellSize / 2,
            (this.size * this.cellSize + (this.size - 1) * CELL_GAP) / 2 - this.cellSize / 2,
            -this.cellSize / 8
        );
        this.gridGroup.add(gridBase);

        // Cell placeholders (visual only)
        var cellGeo = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        var cellMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            opacity: 0.3,
            transparent: true
        });
        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                var cellMesh = new THREE.Mesh(cellGeo, cellMat);
                var pos = this.getCellPosition(x, y);
                cellMesh.position.set(pos.x, pos.y, 0.01);
                this.gridGroup.add(cellMesh);
            }
        }
    };

    Grid.prototype.getCellPosition = function(x, y) {
        return new THREE.Vector3(
            x * (this.cellSize + CELL_GAP),
            y * (this.cellSize + CELL_GAP),
            this.cellSize / 2
        );
    };

    Grid.prototype.addRandomTile = function() {
        var emptyCells = [];
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                if (this.cells[r][c] === null) {
                    emptyCells.push({ r: r, c: c });
                }
            }
        }
        if (emptyCells.length === 0) return null;
        var pick = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(value, pick.c, pick.r, this.loadedFont, this.cellSize); // Pass cellSize
        this.cells[pick.r][pick.c] = tile;
        tile.mesh.position.copy(this.getCellPosition(pick.c, pick.r));
        this.gridGroup.add(tile.mesh);
        return tile;
    };

    Grid.prototype.removeTileMesh = function(tile) {
        if (tile && tile.mesh) {
            this.gridGroup.remove(tile.mesh);
        }
    };

    Grid.prototype.clear = function() {
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                if (this.cells[r][c]) {
                    this.removeTileMesh(this.cells[r][c]);
                    this.cells[r][c] = null;
                }
            }
        }
    };

    Grid.prototype.moveTiles = function(direction) {
        var _this = this;
        var moved = false;
        var score = 0;
        var animations = [];
        var mergedInTurn = Array(this.size).fill(null).map(function() {
            return Array(_this.size).fill(false);
        });

        var traverseX = direction.x === 1
            ? Array.from({ length: this.size }, (_, i) => this.size - 1 - i)
            : Array.from({ length: this.size }, (_, i) => i);
        var traverseY = direction.y === 1
            ? Array.from({ length: this.size }, (_, i) => this.size - 1 - i)
            : Array.from({ length: this.size }, (_, i) => i);

        for (var r of traverseY) {
            for (var c of traverseX) {
                var currentTile = this.cells[r][c];
                if (!currentTile) continue;
                var currentR = r, currentC = c;
                var nextR = r + direction.y, nextC = c + direction.x;
                var targetR = r, targetC = c;
                while (nextC >= 0 && nextC < this.size && nextR >= 0 && nextR < this.size) {
                    var nextTile = this.cells[nextR][nextC];
                    if (nextTile) {
                        if (nextTile.value === currentTile.value && !mergedInTurn[nextR][nextC]) {
                            targetR = nextR;
                            targetC = nextC;
                        }
                        break;
                    }
                    targetR = nextR;
                    targetC = nextC;
                    nextR += direction.y;
                    nextC += direction.x;
                }
                if (targetR !== r || targetC !== c) {
                    var targetTile = this.cells[targetR][targetC];
                    var mergedTile = null;
                    if (targetTile && targetTile.value === currentTile.value && !mergedInTurn[targetR][targetC]) {
                        var newValue = currentTile.value * 2;
                        score += newValue;
                        mergedTile = targetTile;
                        this.cells[r][c] = null;
                        this.cells[targetR][targetC] = null;
                        var newTile = new Tile(newValue, targetC, targetR, this.loadedFont, this.cellSize); // Pass cellSize
                        this.cells[targetR][targetC] = newTile;
                        this.gridGroup.add(newTile.mesh);
                        mergedInTurn[targetR][targetC] = true;
                        animations.push({
                            tile: newTile,
                            type: 'merge',
                            from: { x: c, y: r },
                            to: { x: targetC, y: targetR },
                            mergedFrom: [currentTile, mergedTile]
                        });
                        moved = true;
                    } else {
                        this.cells[targetR][targetC] = currentTile;
                        this.cells[r][c] = null;
                        currentTile.x = targetC;
                        currentTile.y = targetR;
                        animations.push({
                            tile: currentTile,
                            type: 'move',
                            from: { x: c, y: r },
                            to: { x: targetC, y: targetR }
                        });
                        moved = true;
                    }
                }
            }
        }
        return { moved, score, animations };
    };

    Grid.prototype.checkWinCondition = function(targetValue) {
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                if (this.cells[r][c] && this.cells[r][c].value === targetValue) {
                    return true;
                }
            }
        }
        return false;
    };

    Grid.prototype.canMove = function() {
        for (var r = 0; r < this.size; r++) {
            for (var c = 0; c < this.size; c++) {
                if (!this.cells[r][c]) {
                    return true;
                }
            }
        }
        for (var r1 = 0; r1 < this.size; r1++) {
            for (var c1 = 0; c1 < this.size - 1; c1++) {
                if (this.cells[r1][c1].value === this.cells[r1][c1 + 1].value) {
                    return true;
                }
            }
        }
        for (var c2 = 0; c2 < this.size; c2++) {
            for (var r2 = 0; r2 < this.size - 1; r2++) {
                if (this.cells[r2][c2].value === this.cells[r2 + 1][c2].value) {
                    return true;
                }
            }
        }
        return false;
    };

    return Grid;
}();