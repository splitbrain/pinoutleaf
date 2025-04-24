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

        // 1. Determine used types
        const usedTypeNames = new Set();
        for (const rowKey in pinsData) {
            pinsData[rowKey].forEach(pinLabels => {
                pinLabels.forEach(labelData => {
                    const parts = labelData.split(':');
                    if (parts.length > 1) {
                        usedTypeNames.add(parts[1]);
                    } else {
                        usedTypeNames.add('default'); // Assume default if no type specified
                    }
                });
            });
        }

        // Ensure 'default' type is included if present in allTypes
        if ('default' in allTypes && !usedTypeNames.has('default')) {
            // Check if any pin uses the default implicitly
            for (const rowKey in pinsData) {
                if (pinsData[rowKey].some(pinLabels => pinLabels.some(labelData => !labelData.includes(':')))) {
                    usedTypeNames.add('default');
                    break;
                }
            }
        }


        // 2. Create legend items for used types
        let currentY = PADDING;
        const usedTypesArray = Array.from(usedTypeNames).sort(); // Sort for consistent order

        usedTypesArray.forEach(typeName => {
            const typeInfo = allTypes[typeName] || allTypes.default; // Fallback to default if type missing?
            if (!typeInfo) return; // Skip if type (and default) is not defined

            // Create a LegendItem instance
            const legendItem = new LegendItem(typeInfo.label ?? typeName, typeInfo.bgcolor);


            // Position the item group vertically within the Legend group
            // Note: LegendItem's internal elements are relative to its (0,0)
            // We translate the entire LegendItem group.
            legendItem.setTranslate(PADDING, currentY);
            this.append(legendItem);

            // Update Y for the next item using the actual bounding box height
            const itemBBox = legendItem.getBoundingBox();
            const itemHeight = itemBBox ? itemBBox.height : FONTSIZE; // Fallback height
            currentY += itemHeight + PADDING;
        });

        // Optional: Add a background rect for the whole legend
        // Important: Calculate bbox *after* all items are added and positioned
        const itemsBBox = super.getBoundingBox(); // Get bbox of items only (before background)

        if (itemsBBox) {
            const background = new Rect(
                itemsBBox.x - PADDING, // Adjust background position based on items bbox
                itemsBBox.y - PADDING,
                itemsBBox.width + PADDING * 2,
                itemsBBox.height + PADDING * 2,
                {fill: '#ffffff', stroke: '#cccccc', 'stroke-width': 10, rx: 30, ry: 30}
            );
            // Insert background at the beginning so it's rendered behind items
            this.prepend(background);
        }
        // Note: The Legend's own getBoundingBox() will now include the background
    }
}
