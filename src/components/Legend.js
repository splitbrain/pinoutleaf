// src/components/Legend.js
import { Group } from '../elements/Group.js';
import { Rect } from '../elements/Rect.js';
import { LegendItem } from './LegendItem.js';
import { FONTSIZE, PADDING } from "../Constants.js";
import { BaseElement } from '../elements/BaseElement.js'; // Needed for static method access


export class Legend extends Group {
    /**
     * Creates a legend component.
     * @param {object} allTypes - The full map of type names to {bgcolor, fgcolor} from setup.types.
     * @param {object} pinsData - The pin definitions from setup.pins (e.g., setup.pins.left).
     */
    constructor(allTypes, pinsData) {
        super();

        const usedTypeNames = this.getUsedTypes(pinsData, allTypes);
        const items = this.createLegendItems(usedTypeNames, allTypes);

        if (items.length === 0) {
            return; // No legend needed if no types are used
        }

        const itemsBBox = BaseElement.getCombinedBoundingBox(items);
        const background = this.createBackground(itemsBBox);

        if (background) {
            this.prepend(background);
        }
        this.children.push(...items); // Append all items at once
    }

    /**
     * Determines the set of pin type names used in the pin definitions.
     */
    getUsedTypes(pinsData, allTypes) {
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
     * Creates and positions LegendItem instances for each used type.
     * @returns {LegendItem[]} An array of positioned LegendItem elements.
     */
    createLegendItems(usedTypeNames, allTypes) {
        let currentY = PADDING;
        const items = [];
        const usedTypesArray = Array.from(usedTypeNames).sort();

        usedTypesArray.forEach(typeName => {
            const typeInfo = allTypes[typeName];
            if (!typeInfo) {
                 console.warn(`Legend: Type info for "${typeName}" not found in setup.types. Skipping.`);
                 return;
            }

            const legendItem = new LegendItem(typeInfo.label ?? typeName, typeInfo.bgcolor);
            legendItem.setTranslate(PADDING, currentY); // Position item
            items.push(legendItem);

            const itemBBox = legendItem.getBoundingBox();
            // Use item's height for spacing, with a fallback
            const itemHeight = itemBBox?.height ?? FONTSIZE;
            currentY += itemHeight + PADDING;
        });
        return items;
    }

    /**
     * Creates a background rectangle based on the bounding box of legend items.
     * @param {object|null} itemsBBox - The bounding box { x, y, width, height } of the items.
     * @returns {Rect|null} The background Rect element or null.
     */
    createBackground(itemsBBox) {
        if (!itemsBBox) {
            return null;
        }

        return new Rect(
            itemsBBox.x - PADDING,
            itemsBBox.y - PADDING,
            itemsBBox.width + PADDING * 2,
            itemsBBox.height + PADDING * 2,
            { fill: '#ffffff', stroke: '#cccccc', 'stroke-width': 10, rx: 30, ry: 30 }
        );
    }
}
