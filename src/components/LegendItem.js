import {Group} from '../elements/Group.js';
import {Rect} from '../elements/Rect.js';
import {Text} from '../elements/Text.js';
import {FONTSIZE, PADDING} from "../Constants.js";

export class LegendItem extends Group {
    /**
     * Creates a LegendItem with a colored swatch and a label.
     *
     *
     * @param {string} labelText - The text to display next to the color swatch.
     * @param {string} backgroundColor - The background color of the swatch.
     * @param {object} [options={}] - Optional configuration.
     */
    constructor(labelText, backgroundColor, options = {}) {
        super(); // Initialize the group


        // Default options
        const {
            borderRadius = 30,
        } = options;


        // Color Swatch
        const swatch = new Rect(
            0,
            0,
            FONTSIZE,
            FONTSIZE,
            {
                'fill': backgroundColor,
                'rx': borderRadius,
                'ry': borderRadius
            }
        );
        this.append(swatch);

        // Type Label
        const label = new Text(
            FONTSIZE + PADDING,
            0,
            labelText,
            {
                'font-size': FONTSIZE,
                'fill': '#000000',
            }
        );
        this.append(label);
    }
}
