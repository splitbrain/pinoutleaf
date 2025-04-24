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
        const transform = this.attrs.transform;
        if (transform) {
            let tx = 0, ty = 0, angle = 0, cx = 0, cy = 0;
            let hasTranslate = false, hasRotate = false;

            // Parse translation: translate(tx, ty)
            const translateMatch = transform.match(/translate\s*\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/);
            if (translateMatch) {
                tx = parseFloat(translateMatch[1]);
                ty = parseFloat(translateMatch[2]);
                hasTranslate = true;
            }

            // Parse rotation: rotate(angle cx cy)
            // Note: Assumes rotation center (cx, cy) is in the coordinate system BEFORE translation
            const rotateMatch = transform.match(/rotate\s*\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/);
            if (rotateMatch) {
                angle = parseFloat(rotateMatch[1]);
                cx = parseFloat(rotateMatch[2]);
                cy = parseFloat(rotateMatch[3]);
                hasRotate = true;
            }

            // If no transform components found, return original bbox
            if (!hasTranslate && !hasRotate) {
                return bbox;
            }

            // Calculate corners of the untransformed bbox
            const corners = [
                { x: bbox.x, y: bbox.y },                 // Top-left
                { x: bbox.x + bbox.width, y: bbox.y },    // Top-right
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height }, // Bottom-right
                { x: bbox.x, y: bbox.y + bbox.height }    // Bottom-left
            ];

            // Transform corners (Apply rotation first, then translation)
            const transformedCorners = corners.map(p => {
                let x = p.x;
                let y = p.y;

                // Apply rotation around (cx, cy)
                if (hasRotate) {
                    const rad = angle * Math.PI / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    const translatedX = x - cx; // Translate point to origin relative to rotation center
                    const translatedY = y - cy;
                    const rotatedX = translatedX * cos - translatedY * sin; // Rotate
                    const rotatedY = translatedX * sin + translatedY * cos;
                    x = rotatedX + cx; // Translate point back
                    y = rotatedY + cy;
                }

                // Apply translation
                if (hasTranslate) {
                    x += tx;
                    y += ty;
                }
                return { x, y };
            });

            // Find min/max of transformed corners
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            transformedCorners.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });

            // Return new bounding box encompassing the transformed corners
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }

        // No transform attribute, return original bbox
        return bbox;
    }
}
