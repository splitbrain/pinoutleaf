// src/components/Legend.js
import { Group } from '../elements/Group.js';
import { Rect } from '../elements/Rect.js';
import { Text } from '../elements/Text.js';
import { LegendItem } from './LegendItem.js'; // Import the new component

const SWATCH_SIZE = 100;
const V_SPACING = 50; // Vertical spacing between items
const H_SPACING = 30; // Horizontal spacing between swatch and text
const FONT_SIZE = 100;
const PADDING = 50; // Padding around the legend content

export class Legend extends Group {
    /**
     * Creates a legend component.
     * @param {object} allTypes - The full map of type names to {bgcolor, fgcolor} from setup.types.
     * @param {object} pinsData - The pin definitions from setup.pins (e.g., setup.pins.left).
     * @param {object} [options={}] - Optional configuration.
     * @param {number} [options.fontSize=FONT_SIZE] - Font size for labels.
     * @param {number} [options.swatchSize=SWATCH_SIZE] - Size of the color swatch.
     * @param {number} [options.vSpacing=V_SPACING] - Vertical spacing between legend items.
     * @param {number} [options.hSpacing=H_SPACING] - Horizontal spacing between swatch and text.
     * @param {number} [options.padding=PADDING] - Padding around the legend content.
     */
    constructor(allTypes, pinsData, options = {}) {
        super(); // Initialize the group

        const fontSize = options.fontSize ?? FONT_SIZE;
        const swatchSize = options.swatchSize ?? SWATCH_SIZE;
        const vSpacing = options.vSpacing ?? V_SPACING;
        const hSpacing = options.hSpacing ?? H_SPACING;
        const padding = options.padding ?? PADDING;

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
        let currentY = padding;
        const usedTypesArray = Array.from(usedTypeNames).sort(); // Sort for consistent order

        usedTypesArray.forEach(typeName => {
            const typeInfo = allTypes[typeName] || allTypes.default; // Fallback to default if type missing?
            if (!typeInfo) continue; // Skip if type (and default) is not defined

            // Create a LegendItem instance
            const legendItem = new LegendItem(typeName, typeInfo, {
                swatchSize,
                hSpacing,
                fontSize
            });

            // Position the item group vertically within the Legend group
            // Note: LegendItem's internal elements are relative to its (0,0)
            // We translate the entire LegendItem group.
            legendItem.setTranslate(padding, currentY);
            this.append(legendItem);

            // Update Y for the next item using the actual bounding box height
            const itemBBox = legendItem.getBoundingBox();
            const itemHeight = itemBBox ? itemBBox.height : Math.max(swatchSize, fontSize); // Fallback height
            currentY += itemHeight + vSpacing;
        });

         // Optional: Add a background rect for the whole legend
         const legendBBox = this.getBoundingBox(); // Get bbox of items *before* adding background
         if (legendBBox) {
             const background = new Rect(
                 legendBBox.x - padding,
                 legendBBox.y - padding,
                 legendBBox.width + padding * 2,
                 legendBBox.height + padding * 2,
                 { fill: '#ffffff', stroke: '#cccccc', 'stroke-width': 10, rx: 30, ry: 30 }
             );
             // Insert background at the beginning so it's behind items
             this.children.unshift(background);
         }
    }
}        
