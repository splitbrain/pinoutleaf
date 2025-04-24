import { Group } from '../elements/Group.js';
import { Rect } from '../elements/Rect.js';
import { Text } from '../elements/Text.js';

export class LegendItem extends Group {
    /**
     * Creates a single item for the legend.
     * @param {string} typeName - The name of the type (e.g., 'gpio', 'power').
     * @param {object} typeInfo - The type definition { bgcolor, fgcolor }.
     * @param {object} options - Layout options.
     * @param {number} options.swatchSize - The size (width and height) of the color swatch.
     * @param {number} options.hSpacing - Horizontal spacing between swatch and text.
     * @param {number} options.fontSize - Font size for the type name label.
     */
    constructor(typeName, typeInfo, options) {
        super(); // Initialize the group

        const { swatchSize, hSpacing, fontSize } = options;

        // Color Swatch
        // Positioned at the origin (0,0) of this group
        const swatch = new Rect(0, 0, swatchSize, swatchSize, { fill: typeInfo.bgcolor });
        this.append(swatch);

        // Type Label
        const label = new Text(
            swatchSize + hSpacing, // Position text to the right of the swatch
            swatchSize / 2,        // Vertically center text relative to swatch height
            typeName,
            {
                'font-size': fontSize,
                'fill': typeInfo.fgcolor || '#000000', // Default text color if not specified
                'dominant-baseline': 'middle'         // Better vertical centering
            }
        );
        this.append(label);
    }

    // Inherits getBoundingBox from Group, which calculates based on children (swatch + text)
}
