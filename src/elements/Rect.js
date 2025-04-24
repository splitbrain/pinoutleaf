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

    getBoundingBox() {
        // strokes are centered on the path, so we need to adjust the bounding box
        const strokeWidth = this.attrs['stroke-width'] || 0;
        const x = (parseFloat(this.attrs.x) || 0) - strokeWidth;
        const y = (parseFloat(this.attrs.y) || 0) - strokeWidth;
        const width = (parseFloat(this.attrs.width) || 0) + strokeWidth * 2;
        const height = (parseFloat(this.attrs.height) || 0) + strokeWidth * 2;

        return {
            x,
            y,
            width,
            height
        };
    }
}
