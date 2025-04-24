// src/components/Legend.js
import {Group} from '../elements/Group.js';
import {Rect} from '../elements/Rect.js';
import {LegendItem} from './LegendItem.js';
import {FONTSIZE, PADDING} from "../Constants.js"; // Import the new component


export class Legend extends Group {
    /**
     * Creates a legend component.
     * @param {object} allTypes - The full map of type names to {bgcolor, fgcolor} from setup.types.
     * @param {object} pinsData - The pin definitions from setup.pins (e.g., setup.pins.left).
     */
    constructor(allTypes, pinsData) {
        super(); // Initialize the group

        const usedTypeNames = this._getUsedTypes(pinsData, allTypes);
        this._createAndPositionItems(usedTypeNames, allTypes);
        this._addBackground();
    }

    /**
     * Determines the set of pin type names used in the pin definitions.
     * @param {object} pinsData - The pin definitions (e.g., setup.pins).
     * @param {object} allTypes - The full map of type definitions (e.g., setup.types).
     * @returns {Set<string>} A set of used type names.
     * @private
     */
    _getUsedTypes(pinsData, allTypes) {
        const usedTypeNames = new Set();
        let usesDefaultImplicitly = false;

        for (const rowKey in pinsData) {
            pinsData[rowKey].forEach(pinLabels => {
                pinLabels.forEach(labelData => {
                    const parts = labelData.split(':');
                    if (parts.length > 1) {
                        usedTypeNames.add(parts[1]);
                    } else {
                        usedTypeNames.add('default'); // Explicitly add 'default'
                        usesDefaultImplicitly = true; // Mark that default was used
                    }
                });
            });
        }

        // Ensure 'default' type is included if it exists in allTypes and was used implicitly,
        // even if no pin explicitly specified ':default'.
        if ('default' in allTypes && usesDefaultImplicitly) {
             usedTypeNames.add('default');
        }

        return usedTypeNames;
    }

    /**
     * Creates LegendItem instances for each used type, positions them vertically,
     * and appends them to this group.
     * @param {Set<string>} usedTypeNames - The set of type names to include.
     * @param {object} allTypes - The full map of type definitions.
     * @private
     */
    _createAndPositionItems(usedTypeNames, allTypes) {
        let currentY = PADDING;
        const usedTypesArray = Array.from(usedTypeNames).sort(); // Sort for consistent order

        usedTypesArray.forEach(typeName => {
            const typeInfo = allTypes[typeName]; // Directly access type; default handled by _getUsedTypes
            // We assume _getUsedTypes only returns types present in allTypes or 'default' if used.
            if (!typeInfo) {
                 console.warn(`Legend: Type info for "${typeName}" not found in setup.types. Skipping.`);
                 return; // Skip if type somehow missing (shouldn't happen with current logic)
            }

            // Create a LegendItem instance
            const legendItem = new LegendItem(typeInfo.label ?? typeName, typeInfo.bgcolor);

            // Position the item group vertically
            legendItem.setTranslate(PADDING, currentY);
            this.append(legendItem);

            // Update Y for the next item
            const itemBBox = legendItem.getBoundingBox();
            const itemHeight = itemBBox ? itemBBox.height : FONTSIZE; // Fallback height
            currentY += itemHeight + PADDING; // Use PADDING as vertical spacing
        });
    }

    /**
     * Calculates the bounding box of the legend items and adds a background rectangle.
     * @private
     */
    _addBackground() {
        // Calculate bbox *after* all items are added and positioned
        const itemsBBox = super.getBoundingBox(); // Get bbox of items only

        if (itemsBBox) {
            const background = new Rect(
                itemsBBox.x - PADDING, // Adjust background position based on items bbox
                itemsBBox.y - PADDING,
                itemsBBox.width + PADDING * 2,
                itemsBBox.height + PADDING * 2,
                { fill: '#ffffff', stroke: '#cccccc', 'stroke-width': 10, rx: 30, ry: 30 }
            );
            // Insert background at the beginning so it's rendered behind items
            this.prepend(background);
        }
        // Note: The Legend's own getBoundingBox() will now include the background
    }
}
