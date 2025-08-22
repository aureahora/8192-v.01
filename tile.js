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
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
import * as THREE from 'three';
import { TILE_COLORS, CELL_SIZE } from './constants.js'; // Removed FONT_JSON_URL
// Removed FontLoader import as it's loaded externally
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
// Removed global fontLoader and loadedFont variables
export var Tile = /*#__PURE__*/ function() {
    "use strict";
    function Tile(value, x, y, loadedFont) {
        _class_call_check(this, Tile);
        this.value = value;
        this.x = x; // Grid column
        this.y = y; // Grid row
        this.font = loadedFont; // Store the passed font
        if (!this.font) {
            console.error("Tile created without a valid font!");
        // Handle error - perhaps create tile without text?
        }
        // Calculate index based on power of 2: log2(value) - 1
        var colorIndex = Math.max(0, Math.log2(this.value) - 1);
        var color = TILE_COLORS[colorIndex % TILE_COLORS.length];
        // Main tile block
        var geometry = new THREE.BoxGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9, CELL_SIZE * 0.8);
        // Use MeshToonMaterial for cel-shading effect
        var material = new THREE.MeshToonMaterial({
            color: color
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.textMesh = null;
        if (this.font) {
            this.createTextLabel();
        }
    }
    _create_class(Tile, [
        {
            key: "createTextLabel",
            value: function createTextLabel() {
                // Removed font loading check and setTimeout
                if (this.textMesh) {
                    this.mesh.remove(this.textMesh);
                // TODO: Consider disposing geometry/material if text changes frequently
                // this.textMesh.geometry.dispose();
                // this.textMesh.material.dispose();
                }
                var text = this.value.toString();
                // Simplified and increased text size calculation
                var baseSize = CELL_SIZE * 0.5;
                // Slightly reduce size for more digits, but keep it large
                if (text.length > 1) baseSize *= 0.85;
                if (text.length > 2) baseSize *= 0.85;
                if (text.length > 3) baseSize *= 0.85;
                var textSize = Math.max(0.3, baseSize); // Ensure a minimum size
                var textGeo = new TextGeometry(text, {
                    font: this.font,
                    size: textSize,
                    height: CELL_SIZE * 0.1,
                    curveSegments: 4
                });
                // Center the text geometry
                textGeo.computeBoundingBox();
                var textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
                var textHeight = textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;
                textGeo.translate(-textWidth / 2, -textHeight / 2, 0);
                // Determine text color based on tile brightness (simple contrast)
                // Always use black text, regardless of background color
                var textColor = 0x000000;
                var textMat = new THREE.MeshBasicMaterial({
                    color: textColor
                });
                this.textMesh = new THREE.Mesh(textGeo, textMat);
                // Position text slightly in front of the tile face
                this.textMesh.position.z = CELL_SIZE * 0.4 + 0.01; // On top face
                this.mesh.add(this.textMesh);
            }
        },
        {
            key: "updateValue",
            value: function updateValue(newValue) {
                this.value = newValue;
                // Recalculate color index based on the new power-of-2 value
                var colorIndex = Math.max(0, Math.log2(this.value) - 1);
                var color = TILE_COLORS[colorIndex % TILE_COLORS.length];
                // Ensure the material is MeshToonMaterial before setting color
                if (_instanceof(this.mesh.material, THREE.MeshToonMaterial)) {
                    this.mesh.material.color.set(color);
                }
                if (this.font) {
                    this.createTextLabel(); // Update text and its color
                }
            }
        }
    ]);
    return Tile;
}();
