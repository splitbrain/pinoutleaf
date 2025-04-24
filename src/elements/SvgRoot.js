import { BaseElement } from './BaseElement.js';

export class SvgRoot extends BaseElement {
    constructor() {
        super('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
        });
    }

    getBoundingBox() {
        const bbox = super.getBoundingBox();
        if (!bbox) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        
        // Update SVG viewBox based on the bounding box
        this.setAttr('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        this.setAttr('width', bbox.width);
        this.setAttr('height', bbox.height);
        
        return bbox;
    }
}
