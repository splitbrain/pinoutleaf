import { BaseElement } from './BaseElement.js';

export class Group extends BaseElement {
    constructor(attrs = {}, children = []) {
        super('g', attrs, children);
    }

    getBoundingBox() {
        // Get the base bounding box from children
        const bbox = super.getBoundingBox();
        if (!bbox) {
            return null;
        }

        // Apply transformation if present
        if (this.attrs.transform) {
            // For now, we only handle simple translations
            // Format: "translate(x, y)"
            const match = this.attrs.transform.match(/translate\s*\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/);
            if (match) {
                const tx = parseFloat(match[1]);
                const ty = parseFloat(match[2]);
                
                return {
                    x: bbox.x + tx,
                    y: bbox.y + ty,
                    width: bbox.width,
                    height: bbox.height
                };
            }
        }
        
        return bbox;
    }
}
