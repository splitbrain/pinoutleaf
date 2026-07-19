import {Group} from '../elements/Group.js';
import {Rect} from '../elements/Rect.js';
import {Circle} from '../elements/Circle.js';
import {Image} from '../elements/Image.js'; // Import the new Image element
import {CORNERS, PINSIZE, PINSPACE} from '../Constants.js';

/**
 * Represents the Chip background.
 */
export class Chip extends Group {

    /**
     * Creates a Chip component.
     * @param {number} widthInPins - The width of the chip in number of pins.
     * @param {number} heightInPins - The height of the chip in number of pins.
     * @param {object} [options={}] - Optional configuration.
     * @param {string} [options.fill] - Background color of the Chip.
     * @param {number} [options.padding=PADDING * 2] - Padding around the pin area.
     */
    constructor(widthInPins, heightInPins, options = {}) {
        super();

        const {
            fill = '#000000', // Default chip color
            padding = PINSPACE / 2, // Padding around the pin area
        } = options;

        // Calculate the dimensions based on pin layout
        const chipWidth = (widthInPins - 1) * PINSPACE + padding * 2;
        const chipHeight = (heightInPins - 1) * PINSPACE + padding * 2;

        // Calculate position to center the pin area within the padding
        const chipX = -padding;
        const chipY = -padding;

        this.append(this.createRectBackground(chipX, chipY, chipWidth, chipHeight, fill));
        this.append(this.createChipMarker(chipX, chipY));
    }

    /**
     * Creates the pin-1 indicator marker for chip components.
     * @private
     * @param {number} pcbX - X position of the PCB background.
     * @param {number} pcbY - Y position of the PCB background.
     * @returns {Circle} The configured Circle element.
     */
    createChipMarker(pcbX, pcbY) {
        const markerRadius = PINSIZE / 2;
        const markerOffset = CORNERS + markerRadius;
        return new Circle(pcbX + markerOffset, pcbY + markerOffset, markerRadius, 'lightgrey');
    }

    /**
     * Creates the background rectangle element.
     * @private
     * @param {number} pcbX - X position.
     * @param {number} pcbY - Y position.
     * @param {number} pcbWidth - Width.
     * @param {number} pcbHeight - Height.
     * @param {string} fill - Fill color.
     * @returns {Rect} The configured Rect element.
     */
    createRectBackground(pcbX, pcbY, pcbWidth, pcbHeight, fill) {
        return new Rect(pcbX, pcbY, pcbWidth, pcbHeight, {
            fill: fill,
            rx: CORNERS,
            ry: CORNERS,
        });
    }
}
