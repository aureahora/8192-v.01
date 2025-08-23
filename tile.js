import * as THREE from 'three';
import { TILE_COLORS } from './constants.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export var Tile = /*#__PURE__*/ function() {
    "use strict";
    function Tile(value, x, y, loadedFont, cellSize) {
        this.value = value;
        this.x = x;
        this.y = y;
        this.font = loadedFont;
        this.cellSize = cellSize;
        if (!this.font) {
            console.error("Tile created without a valid font!");
        }
        this.createTileMesh();
        if (this.font) {
            this.createTextLabel();
        }
    }
    Object.assign(Tile.prototype, {
        createTileMesh: function() {
            var colorIndex = Math.max(0, Math.log2(this.value) - 1);
            var color = TILE_COLORS[colorIndex % TILE_COLORS.length];
            var geometry = new THREE.BoxGeometry(this.cellSize * 0.9, this.cellSize * 0.9, this.cellSize * 0.8);
            var material = new THREE.MeshToonMaterial({ color: color });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        },
        createTextLabel: function() {
            if (this.textMesh) {
                this.mesh.remove(this.textMesh);
            }
            var text = this.value.toString();
            var baseSize = this.cellSize * 0.5;
            if (text.length > 1) baseSize *= 0.85;
            if (text.length > 2) baseSize *= 0.85;
            if (text.length > 3) baseSize *= 0.85;
            var textSize = Math.max(0.3, baseSize);
            var textGeo = new TextGeometry(text, {
                font: this.font,
                size: textSize,
                height: this.cellSize * 0.1,
                curveSegments: 4
            });
            textGeo.computeBoundingBox();
            var textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
            var textHeight = textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;
            textGeo.translate(-textWidth / 2, -textHeight / 2, 0);
            var textMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            this.textMesh = new THREE.Mesh(textGeo, textMat);
            this.textMesh.position.z = this.cellSize * 0.4 + 0.01;
            this.mesh.add(this.textMesh);
        },
        updateValue: function(newValue) {
            this.value = newValue;
            this.createTileMesh();
            if (this.font) {
                this.createTextLabel();
            }
        },
        updateCellSize: function(newCellSize) {
            this.cellSize = newCellSize;
            // Remove old mesh from parent
            if (this.mesh && this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            this.createTileMesh();
            if (this.font) {
                this.createTextLabel();
            }
        }
    });
    return Tile;
}();