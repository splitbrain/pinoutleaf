import {Group} from '../elements/Group.js';
import {Rect} from '../elements/Rect.js';
import {Image} from '../elements/Image.js'; // Import the new Image element
import {CORNERS, PINSPACE} from '../Constants.js';

/**
 * Represents the PCB background.
 */
export class Pcb extends Group {

    /**
     * Creates a Pcb component.
     * @param {number} widthInPins - The width of the board in number of pins.
     * @param {number} heightInPins - The height of the board in number of pins.
     * @param {object} image
     * @param {object} [options={}] - Optional configuration.
     * @param {string} [options.fill='#f0f0f0'] - Background color of the PCB.
     * @param {number} [options.padding=PADDING * 2] - Padding around the pin area.
     */
    constructor(widthInPins, heightInPins, image = {}, options = {}) {
        super();

        const {
            fill = '#558f0e', // Default PCB-like color
            padding = PINSPACE / 2, // Padding around the pin area
        } = options;

        // Calculate the dimensions based on pin layout
        const pcbWidth = (widthInPins - 1) * PINSPACE + padding * 2;
        const pcbHeight = (heightInPins - 1) * PINSPACE + padding * 2;

        // Calculate position to center the pin area within the padding
        const pcbX = -padding;
        const pcbY = -padding;

        if (image?.front?.src) {
            const imgElement = this.createImageBackground(pcbX, pcbY, pcbWidth, pcbHeight, image.front);
            this.append(imgElement);
        } else {
            this.append(this.createRectBackground(pcbX, pcbY, pcbWidth, pcbHeight, fill));
        }
    }

    /**
     * Creates the background image element with adjustments.
     * @private
     * @param {number} basePcbX - Base X position.
     * @param {number} basePcbY - Base Y position.
     * @param {number} basePcbWidth - Base width.
     * @param {number} basePcbHeight - Base height.
     * @param {object} imageConfig - The image configuration object (e.g., setup.image.front).
     * @returns {Image} The configured Image element.
     */
    createImageBackground(basePcbX, basePcbY, basePcbWidth, basePcbHeight, imageConfig) {
        const {
            src,
            top = 0,
            left = 0,
            right = 0,
            bottom = 0,
            opacity = 0.5, // Default opacity if not specified
            preserveAspectRatio = 'xMidYMid slice' // Default aspect ratio
        } = imageConfig;

        // Adjust dimensions based on top, left, right, bottom offsets
        const imgX = basePcbX + left;
        const imgY = basePcbY + top;
        const imgWidth = basePcbWidth - left - right;
        const imgHeight = basePcbHeight - top - bottom;

        return new Image(imgX, imgY, imgWidth, imgHeight, src, {
            preserveAspectRatio: 'none',
            'opacity': opacity,
            filter: 'url(#grayscale)',
        });
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
