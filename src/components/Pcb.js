import { Group } from '../elements/Group.js';
import { Rect } from '../elements/Rect.js';
import { PADDING } from '../Constants.js';

/**
 * Represents the PCB background.
 */
export class Pcb extends Group {
    /**
     * Creates a Pcb component.
     * @param {number} widthInPins - The width of the board in number of pins.
     * @param {number} heightInPins - The height of the board in number of pins.
     * @param {number} pinSpacing - The space between pins.
     * @param {object} [options={}] - Optional configuration.
     * @param {string} [options.fill='#f0f0f0'] - Background color of the PCB.
     * @param {number} [options.padding=PADDING * 2] - Padding around the pin area.
     */
    constructor(widthInPins, heightInPins, pinSpacing, options = {}) {
        super();

        const {
            fill = '#f0f0f0', // Default PCB-like color
            padding = PADDING * 4, // Generous padding
        } = options;

        // Calculate the dimensions based on pin layout
        const pcbWidth = (widthInPins - 1) * pinSpacing + padding * 2;
        const pcbHeight = (heightInPins - 1) * pinSpacing + padding * 2;

        // Calculate position to center the pin area within the padding
        const pcbX = -padding;
        const pcbY = -padding;


        const backgroundRect = new Rect(pcbX, pcbY, pcbWidth, pcbHeight, {
            fill: fill,
            // Add other styling like rounded corners if desired
            // rx: PADDING,
            // ry: PADDING,
        });

        this.append(backgroundRect);
    }
}
