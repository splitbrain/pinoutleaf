import { BaseElement } from './BaseElement.js';

export class Group extends BaseElement {
    constructor(attrs = {}, children = []) {
        super('g', attrs, children);
        this.tx = 0;
        this.ty = 0;
        this.angle = 0; // Rotation angle in degrees (0, 90, 180, 270)
        this.padding = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };
    }

    /**
     * Sets padding for the group. Padding expands the bounding box.
     * @param {number|object} padding - Either a number for all sides, or an object with top, right, bottom, left properties
     * @returns {Group} - The group instance for chaining
     */
    setPadding(padding) {
        if (typeof padding === 'number') {
            // Set the same padding for all sides
            this.padding = {
                top: padding,
                right: padding,
                bottom: padding,
                left: padding
            };
        } else if (typeof padding === 'object') {
            // Set individual paddings
            this.padding = {
                top: padding.top ?? this.padding.top,
                right: padding.right ?? this.padding.right,
                bottom: padding.bottom ?? this.padding.bottom,
                left: padding.left ?? this.padding.left
            };
        }
        return this;
    }

    /**
     * Sets the absolute translation for the group.
     * @param {number} tx - Translation along the x-axis.
     * @param {number} ty - Translation along the y-axis.
     */
    setTranslate(tx, ty) {
        this.tx = tx;
        this.ty = ty;
        // No need to update attrs.transform directly anymore
        delete this.attrs.transform; // Remove old attribute if present
        return this;
    }

    /**
     * Sets the absolute rotation for the group.
     * Rotation is performed around the center of the group's untransformed bounding box.
     * @param {number} angle - Rotation angle in degrees. Must be a multiple of 90.
     */
    setRotation(angle) {
        if (angle % 90 !== 0) {
            console.warn(`Group rotation angle must be a multiple of 90. Received ${angle}. Clamping to nearest 90.`);
            angle = Math.round(angle / 90) * 90;
        }
        // Normalize angle to be within [0, 360)
        this.angle = ((angle % 360) + 360) % 360;
        // No need to update attrs.transform directly anymore
        delete this.attrs.transform; // Remove old attribute if present
        return this;
    }


    getBoundingBox() {
        // Get the base bounding box from children (untransformed)
        const bbox = super.getBoundingBox();
        if (!bbox) {
            return null; // No children, no bounding box
        }

        // Apply padding to the base bounding box
        const paddedBbox = {
            x: bbox.x - this.padding.left,
            y: bbox.y - this.padding.top,
            width: bbox.width + this.padding.left + this.padding.right,
            height: bbox.height + this.padding.top + this.padding.bottom
        };

        // If no transformation, return the padded bbox directly
        if (this.angle === 0 && this.tx === 0 && this.ty === 0) {
            return paddedBbox;
        }

        // Calculate the center of the padded untransformed bounding box
        const cx = paddedBbox.x + paddedBbox.width / 2;
        const cy = paddedBbox.y + paddedBbox.height / 2;

        // Calculate corners of the padded untransformed bbox
        const corners = [
            { x: paddedBbox.x, y: paddedBbox.y },                     // Top-left
            { x: paddedBbox.x + paddedBbox.width, y: paddedBbox.y },         // Top-right
            { x: paddedBbox.x + paddedBbox.width, y: paddedBbox.y + paddedBbox.height }, // Bottom-right
            { x: paddedBbox.x, y: paddedBbox.y + paddedBbox.height }         // Bottom-left
        ];

        // Apply rotation (around center cx, cy) and translation (tx, ty) to corners
        const transformedCorners = corners.map(p => {
            // Translate point relative to rotation center
            let relX = p.x - cx;
            let relY = p.y - cy;

            // Rotate point (simplified for 90-degree increments)
            let rotatedX, rotatedY;
            switch (this.angle) {
                case 90:
                    rotatedX = -relY;
                    rotatedY = relX;
                    break;
                case 180:
                    rotatedX = -relX;
                    rotatedY = -relY;
                    break;
                case 270:
                    rotatedX = relY;
                    rotatedY = -relX;
                    break;
                default: // 0 degrees
                    rotatedX = relX;
                    rotatedY = relY;
                    break;
            }

            // Translate point back from rotation center and apply group translation
            return {
                x: rotatedX + cx + this.tx,
                y: rotatedY + cy + this.ty
            };
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

    render(document) {
        // Render the base group element
        const el = super.render(document); // This renders children too

        // Calculate transform string if needed
        let transformValue = '';
        const translatePart = (this.tx !== 0 || this.ty !== 0) ? `translate(${this.tx} ${this.ty})` : '';

        let rotatePart = '';
        if (this.angle !== 0) {
            // Rotation requires the center of the untransformed bbox (without padding)
            const bbox = super.getBoundingBox(); // Get untransformed bbox again
            if (bbox) {
                // We rotate around the center of the original bbox (without padding)
                const cx = bbox.x + bbox.width / 2;
                const cy = bbox.y + bbox.height / 2;
                rotatePart = `rotate(${this.angle} ${cx} ${cy})`;
            } else {
                // Cannot rotate if there's no bounding box (e.g., empty group)
                rotatePart = `rotate(${this.angle})`; // Rotate around origin (0,0) as fallback
            }
        }

        // Combine parts (translate first, then rotate - applied right-to-left)
        transformValue = `${translatePart} ${rotatePart}`.trim();

        // Set the transform attribute only if there is a transformation
        if (transformValue) {
            el.setAttribute('transform', transformValue);
        } else {
            el.removeAttribute('transform'); // Ensure no transform if tx=ty=angle=0
        }

        return el;
    }
}
