import { BaseElement } from './BaseElement.js';

/**
 * Represents an SVG <image> element.
 */
export class Image extends BaseElement {
    /**
     * Creates an Image element.
     * @param {number} x - The x-coordinate of the top-left corner.
     * @param {number} y - The y-coordinate of the top-left corner.
     * @param {number} width - The width of the image.
     * @param {number} height - The height of the image.
     * @param {string} href - The URL of the image file.
     * @param {object} [attrs={}] - Additional attributes for the image element.
     */
    constructor(x, y, width, height, href, attrs = {}) {
        super('image', {
            x,
            y,
            width,
            height,
            href, // Standard SVG 2 attribute
            'xlink:href': href, // For broader compatibility
            ...attrs
        });
    }

    /**
     * Calculates the bounding box for the image element.
     * @returns {{x: number, y: number, width: number, height: number}} The bounding box.
     */
    getBoundingBox() {
        const x = parseFloat(this.attrs.x) || 0;
        const y = parseFloat(this.attrs.y) || 0;
        const width = parseFloat(this.attrs.width) || 0;
        const height = parseFloat(this.attrs.height) || 0;

        return {
            x,
            y,
            width,
            height
        };
    }
}
