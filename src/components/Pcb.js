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
            const imgElement = new Image(pcbX, pcbY, pcbWidth, pcbHeight, image.front.src, {
                preserveAspectRatio: 'xMidYMid slice',
                'opacity': 0.5,
            });
            this.append(imgElement);
        } else {
            const backgroundRect = new Rect(pcbX, pcbY, pcbWidth, pcbHeight, {
                fill: fill,
                rx: CORNERS,
                ry: CORNERS,
            });
            this.append(backgroundRect);
        }
    }
}
