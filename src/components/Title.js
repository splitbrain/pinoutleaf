import { Group } from '../elements/Group.js';
import { Text } from '../elements/Text.js';
import {FONTSIZE, PADDING} from '../Constants.js';

/**
 * Represents the title text for the diagram.
 */
export class Title extends Group {
    /**
     * Creates a Title component.
     * @param {string} titleText - The text to display as the title.
     * @param {object} [options={}] - Optional configuration.
     */
    constructor(titleText, options = {}) {
        super();

        const {
            fontSize = FONTSIZE * 2, // Larger font size for title
        } = options;

        const titleElement = new Text(0, 0, titleText, {
            'font-size': fontSize,
        });

        this.append(titleElement);
    }
}
