import {BaseElement} from './BaseElement.js';

export class Rect extends BaseElement {
    constructor(x, y, width, height, attrs = {}) {
        super('rect', {
            x,
            y,
            width,
            height,
            ...attrs
        });
    }

    /**
     * This returns the visual bounding box of the rectangle including the stroke width.
     *
     * This is both correct (when we want to enclose the element) and incorrect (when we want to
     * calculate or position it).
     *
     * @returns {{x: number, y: number, width: *, height: *}}
     */
    getBoundingBox() {
        // strokes are centered on the path, half outside and half inside
        const strokeWidth = this.attrs['stroke-width'] || 0;
        const x = (parseFloat(this.attrs.x) || 0) - (strokeWidth/2);
        const y = (parseFloat(this.attrs.y) || 0) - (strokeWidth/2);
        const width = (parseFloat(this.attrs.width) || 0) + strokeWidth;
        const height = (parseFloat(this.attrs.height) || 0) + strokeWidth;

        return {
            x,
            y,
            width,
            height
        };
    }
}
