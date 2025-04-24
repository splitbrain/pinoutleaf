// src/components/PinLabel.js
import {Group} from '../elements/Group.js';
import {Rect} from '../elements/Rect.js';
import {Text} from '../elements/Text.js';

export class PinLabel extends Group {


    constructor(text, options = {}) {
        super(); // Create a group to contain our elements

        // Default options
        const {
            padding = 30,
            borderRadius = 30,
            backgroundColor = '#f1c863',
            textColor = '#000000',
        } = options;

        // Create text element
        const textElement = new Text(padding, padding, text, {
            'fill': textColor,
        });

        // Get approximate text dimensions
        const textBBox = textElement.getBoundingBox();


        // Create background rectangle with padding
        const rect = new Rect(
            0,
            0,
            textBBox.width + (padding * 2),
            textBBox.height + (padding * 2),
            {
                'fill': backgroundColor,
                'rx': borderRadius,
                'ry': borderRadius
            }
        );

        // Add elements to the group (background first, then text)
        this.append(rect);
        this.append(textElement);
    }


    /**
     * Align the label with respect to another element.
     *
     * @param {string} alignment The alignment to use. Can be 'leftof', 'rightof', 'above', or 'under'.
     * @param {BaseElement} reference The reference element to align to.
     * @param {number} [padding=0] Optional padding to add to the alignment.
     */
    align(alignment, reference, padding = 0) {
        // Get the bounding box of the group
        // Get bounding boxes
        const myBBox = this.getBoundingBox();
        const refBBox = reference.getBoundingBox();

        // Calculate centers
        const labelCx = myBBox.width / 2;
        const labelCy = myBBox.height / 2;
        const refCx = refBBox.x + refBBox.width / 2;
        const refCy = refBBox.y + refBBox.height / 2;

        // Determine target center and rotation based on alignment
        let targetCx = 0;
        let targetCy = 0;
        let rotationAngle = 0;

        switch (alignment) {
            case 'leftof':
                // Target center is left of reference bbox, vertically aligned with reference center
                targetCx = refBBox.x - padding - labelCx; // target x for label center
                targetCy = refCy;                       // target y for label center
                break;
            case 'rightof':
                // Target center is right of reference bbox, vertically aligned with reference center
                targetCx = refBBox.x + refBBox.width + padding + labelCx; // target x for label center
                targetCy = refCy;                                        // target y for label center
                break;
            case 'above':
                // Target center is above reference bbox, horizontally aligned with reference center
                // Note: Rotated label's effective height is myBBox.width
                targetCx = refCx;
                targetCy = refBBox.y - padding - (myBBox.width / 2); // Use width for vertical offset due to rotation
                rotationAngle = -90;
                break;
            case 'under':
                // Target center is under reference bbox, horizontally aligned with reference center
                // Note: Rotated label's effective height is myBBox.width
                targetCx = refCx;
                targetCy = refBBox.y + refBBox.height + padding + (myBBox.width / 2); // Use width for vertical offset
                rotationAngle = -90;
                break;
            default:
                throw new Error(`Invalid alignment: ${alignment}`);
        }

        // Calculate translation needed to move label's origin (0,0)
        // so that its center (labelCx, labelCy) ends up at (targetCx, targetCy)
        // after rotation (if any) around (labelCx, labelCy).
        const translateX = targetCx - labelCx;
        const translateY = targetCy - labelCy;

        // Apply the calculated translation and rotation using the new methods
        this.setTranslate(translateX, translateY);
        this.setRotation(rotationAngle); // Handles 0 angle correctly
    }

}
