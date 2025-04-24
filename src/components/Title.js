import { Group } from '../elements/Group.js';
import { Text } from '../elements/Text.js';
import { PADDING } from '../Constants.js';

/**
 * Represents the title text for the diagram.
 */
export class Title extends Group {
    /**
     * Creates a Title component.
     * @param {string} titleText - The text to display as the title.
     * @param {object} [options={}] - Optional configuration.
     * @param {number} [options.fontSize=60] - Font size for the title.
     * @param {string} [options.fontWeight='bold'] - Font weight for the title.
     */
    constructor(titleText, options = {}) {
        super();

        const {
            fontSize = 60, // Larger font size for title
            fontWeight = 'bold',
        } = options;

        const titleElement = new Text(0, 0, titleText, {
            'font-size': fontSize,
            'font-weight': fontWeight,
            'text-anchor': 'middle', // Center the text horizontally
        });

        this.append(titleElement);
    }

    // Override getBoundingBox to potentially add padding if needed,
    // or rely on the Group's default which calculates from children.
    // For now, the default Group getBoundingBox should suffice.
}
