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
import * as THREE from 'three';
import { Tile } from './tile.js';
import { GRID_SIZE, CELL_GAP, BASE_COLOR } from './constants.js';
export var Grid = /*#__PURE__*/ function() {
    "use strict";
    function Grid(size, scene, loadedFont, cellSize) {
        _class_call_check(this, Grid);
        this.size = size;
        this.scene = scene;
        this.loadedFont = loadedFont; // Store the font
        this.cellSize = cellSize; // Store the dynamic cell size
        this.cells = Array(size).fill(null).map(function() {
            return Array(size).fill(null);
        });
        this.gridGroup = new THREE.Group(); // Group for grid base and tiles
        this.createGridBase();
        this.scene.add(this.gridGroup);
        // Center the grid visually using dynamic cellSize
        var offset = (this.size * this.cellSize + (this.size - 1) * CELL_GAP) / 2 - this.cellSize / 2;
        this.gridGroup.position.set(-offset, -offset, 0);
    }
    _create_class(Grid, [
        {
            key: "createGridBase",
            value: function createGridBase() {
                // Используем динамический cellSize вместо константы
                var baseGeometry = new THREE.BoxGeometry(this.size * this.cellSize + (this.size + 1) * CELL_GAP, this.size * this.cellSize + (this.size + 1) * CELL_GAP, this.cellSize / 4 // Thickness
                );
                var baseMaterial = new THREE.MeshStandardMaterial({
                    color: BASE_COLOR,
                    metalness: 0.3,
                    roughness: 0.6
                });
                var gridBase = new THREE.Mesh(baseGeometry, baseMaterial);
                gridBase.position.set((this.size * this.cellSize + (this.size - 1) * CELL_GAP) / 2 - this.cellSize / 2, (this.size * this.cellSize + (this.size - 1) * CELL_GAP) / 2 - this.cellSize / 2, -this.cellSize / 8 // Position slightly behind cells
                );
                this.gridGroup.add(gridBase);
                // Create cell placeholders (visual only) с динамическим размером
                var cellGeo = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
                var cellMat = new THREE.MeshStandardMaterial({
                    color: 0xcccccc,
                    opacity: 0.3,
                    transparent: true
                });
                for(var x = 0; x < this.size; x++){
                    for(var y = 0; y < this.size; y++){
                        var cellMesh = new THREE.Mesh(cellGeo, cellMat);
                        var pos = this.getCellPosition(x, y);
                        cellMesh.position.set(pos.x, pos.y, 0.01); // Slightly above base
                        this.gridGroup.add(cellMesh);
                    }
                }
            }
        },
        {
            key: "getCellPosition",
            value: function getCellPosition(x, y) {
                // Calculate position relative to the gridGroup origin using dynamic cellSize
                return new THREE.Vector3(x * (this.cellSize + CELL_GAP), y * (this.cellSize + CELL_GAP), this.cellSize / 2 // Raise tiles slightly off the grid base visual
                );
            }
        },
        {
            key: "addRandomTile",
            value: function addRandomTile() {
                var emptyCells = [];
                for(var r = 0; r < this.size; r++){
                    for(var c = 0; c < this.size; c++){
                        if (this.cells[r][c] === null) {
                            emptyCells.push({
                                r: r,
                                c: c
                            });
                        }
                    }
                }
                if (emptyCells.length === 0) return null; // Grid full
                var _emptyCells_Math_floor = emptyCells[Math.floor(Math.random() * emptyCells.length)], r1 = _emptyCells_Math_floor.r, c1 = _emptyCells_Math_floor.c;
                // Generate 2 (90% chance) or 4 (10% chance)
                var value = Math.random() < 0.9 ? 2 : 4;
                // Pass the loaded font and cellSize to the Tile constructor
                var tile = new Tile(value, c1, r1, this.loadedFont, this.cellSize); // Note: Tile uses (x, y) which corresponds to (c, r)
                this.cells[r1][c1] = tile;
                tile.mesh.position.copy(this.getCellPosition(c1, r1));
                this.gridGroup.add(tile.mesh);
                return tile;
            }
        },
        {
            key: "removeTileMesh",
            value: function removeTileMesh(tile) {
                if (tile && tile.mesh) {
                    this.gridGroup.remove(tile.mesh);
                // Optionally dispose geometry/material if memory becomes an issue
                // tile.mesh.geometry.dispose();
                // tile.mesh.material.dispose();
                }
            }
        },
        {
            key: "clear",
            value: function clear() {
                for(var r = 0; r < this.size; r++){
                    for(var c = 0; c < this.size; c++){
                        if (this.cells[r][c]) {
                            this.removeTileMesh(this.cells[r][c]);
                            this.cells[r][c] = null;
                        }
                    }
                }
            }
        },
        {
            // Core game logic: Move and merge tiles
            key: "moveTiles",
            value: function moveTiles(direction) {
                var _this = this;
                var moved = false;
                var score = 0;
                var animations = [];
                var mergedInTurn = Array(this.size).fill(null).map(function() {
                    return Array(_this.size).fill(false);
                }); // Track merges this turn
                // Determine traversal order based on direction
                var traverseX = direction.x === 1 ? Array.from({
                    length: this.size
                }, function(_, i) {
                    return _this.size - 1 - i;
                }) : Array.from({
                    length: this.size
                }, function(_, i) {
                    return i;
                });
                var traverseY = direction.y === 1 ? Array.from({
                    length: this.size
                }, function(_, i) {
                    return _this.size - 1 - i;
                }) : Array.from({
                    length: this.size
                }, function(_, i) {
                    return i;
                });
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    // Iterate through cells
                    for(var _iterator = traverseY[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var r = _step.value;
                        var _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                        try {
                            for(var _iterator1 = traverseX[Symbol.iterator](), _step1; !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                                var c = _step1.value;
                                var currentTile = this.cells[r][c];
                                if (!currentTile) continue;
                                var currentR = r;
                                var currentC = c;
                                var nextR = r + direction.y;
                                var nextC = c + direction.x;
                                var targetR = r;
                                var targetC = c;
                                // Find furthest empty cell or potential merge cell
                                while(nextC >= 0 && nextC < this.size && nextR >= 0 && nextR < this.size){
                                    var nextTile = this.cells[nextR][nextC];
                                    if (nextTile) {
                                        // Check for merge
                                        if (nextTile.value === currentTile.value && !mergedInTurn[nextR][nextC]) {
                                            targetR = nextR;
                                            targetC = nextC;
                                        }
                                        break; // Stop searching further
                                    }
                                    targetR = nextR;
                                    targetC = nextC;
                                    nextR += direction.y;
                                    nextC += direction.x;
                                }
                                // If the target cell is different from the current cell, move or merge
                                if (targetR !== r || targetC !== c) {
                                    var targetTile = this.cells[targetR][targetC];
                                    var mergedTile = null;
                                    if (targetTile && targetTile.value === currentTile.value && !mergedInTurn[targetR][targetC]) {
                                        // --- Merge ---
                                        var newValue = currentTile.value * 2; // Double the value for merge
                                        score += newValue;
                                        // Remove old tiles from grid logic & scene (visual removal handled by animation)
                                        mergedTile = targetTile; // Keep target tile reference for animation
                                        this.cells[r][c] = null; // Remove moving tile
                                        this.cells[targetR][targetC] = null; // Remove target tile temporarily
                                        // Create the new merged tile, passing the font and cellSize
                                        var newTile = new Tile(newValue, targetC, targetR, this.loadedFont, this.cellSize);
                                        this.cells[targetR][targetC] = newTile; // Place new tile in grid logic
                                        this.gridGroup.add(newTile.mesh); // Add new tile mesh to scene (initially invisible/scaled down)
                                        mergedInTurn[targetR][targetC] = true; // Mark as merged this turn
                                        animations.push({
                                            tile: newTile,
                                            type: 'merge',
                                            from: {
                                                x: c,
                                                y: r
                                            },
                                            to: {
                                                x: targetC,
                                                y: targetR
                                            },
                                            mergedFrom: [
                                                currentTile,
                                                mergedTile
                                            ] // Tiles that merged into this one
                                        });
                                        moved = true;
                                    } else {
                                        // --- Move ---
                                        this.cells[targetR][targetC] = currentTile; // Move tile in grid
                                        this.cells[r][c] = null; // Clear original cell
                                        currentTile.x = targetC; // Update tile's internal position
                                        currentTile.y = targetR;
                                        animations.push({
                                            tile: currentTile,
                                            type: 'move',
                                            from: {
                                                x: c,
                                                y: r
                                            },
                                            to: {
                                                x: targetC,
                                                y: targetR
                                            }
                                        });
                                        moved = true;
                                    }
                                }
                            }
                        } catch (err) {
                            _didIteratorError1 = true;
                            _iteratorError1 = err;
                        } finally{
                            try {
                                if (!_iteratorNormalCompletion1 && _iterator1.return != null) {
                                    _iterator1.return();
                                }
                            } finally{
                                if (_didIteratorError1) {
                                    throw _iteratorError1;
                                }
                            }
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally{
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return != null) {
                            _iterator.return();
                        }
                    } finally{
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
                return {
                    moved: moved,
                    score: score,
                    animations: animations
                };
            }
        },
        {
            key: "checkWinCondition",
            value: function checkWinCondition(targetValue) {
                for(var r = 0; r < this.size; r++){
                    for(var c = 0; c < this.size; c++){
                        if (this.cells[r][c] && this.cells[r][c].value === targetValue) {
                            return true;
                        }
                    }
                }
                return false;
            }
        },
        {
            // Check if any moves are possible (for game over)
            key: "canMove",
            value: function canMove() {
                // Check for empty cells
                for(var r = 0; r < this.size; r++){
                    for(var c = 0; c < this.size; c++){
                        if (!this.cells[r][c]) {
                            return true;
                        }
                    }
                }
                // Check for possible merges horizontally
                for(var r1 = 0; r1 < this.size; r1++){
                    for(var c1 = 0; c1 < this.size - 1; c1++){
                        if (this.cells[r1][c1].value === this.cells[r1][c1 + 1].value) {
                            return true;
                        }
                    }
                }
                // Check for possible merges vertically
                for(var c2 = 0; c2 < this.size; c2++){
                    for(var r2 = 0; r2 < this.size - 1; r2++){
                        if (this.cells[r2][c2].value === this.cells[r2 + 1][c2].value) {
                            return true;
                        }
                    }
                }
                return false; // No empty cells and no possible merges
            }
        }
    ]);
    return Grid;
}();
