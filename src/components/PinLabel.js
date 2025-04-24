// src/components/PinLabel.js
import {Group} from '../elements/Group.js';
import {Rect} from '../elements/Rect.js';
import {Text} from '../elements/Text.js';

export class PinLabel extends Group {


    constructor(text, options = {}) {
        super(); // Create a group to contain our elements

        // Default options
        const {
            padding = 50,
            borderRadius = 30,
            backgroundColor = '#f1c863',
            textColor = '#000000',
            fontSize = 100
        } = options;

        // Create text element
        const textElement = new Text(padding, padding, text, {
            'font-size': fontSize,
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
        const myBBox = this.getBoundingBox();
        const refBBox = reference.getBoundingBox();

        let x = 0;
        let y = 0;
        let transform = ''; // Initialize transform string

        switch (alignment) {
            case 'leftof':
                x = refBBox.x - myBBox.width - padding;
                y = refBBox.y + (refBBox.height / 2) - (myBBox.height / 2);
                transform = `translate(${x}, ${y})`;
                break;
            case 'rightof':
                x = refBBox.x + refBBox.width + padding;
                y = refBBox.y + (refBBox.height / 2) - (myBBox.height / 2);
                transform = `translate(${x}, ${y})`;
                break;
            case 'above': {
                // Center of the unrotated label
                const labelCx = myBBox.width / 2;
                const labelCy = myBBox.height / 2;

                // Target center position for the rotated label
                const targetCx = refBBox.x + refBBox.width / 2;
                // Rotated label height is myBBox.width. Place its center above ref element.
                const targetCy = refBBox.y - padding - (myBBox.width / 2);

                // Translation needed to move label center to target center
                const translateX = targetCx - labelCx;
                const translateY = targetCy - labelCy;

                transform = `translate(${translateX}, ${translateY}) rotate(-90 ${labelCx} ${labelCy})`;
                break;
            }
            case 'under': {
                // Center of the unrotated label
                const labelCx = myBBox.width / 2;
                const labelCy = myBBox.height / 2;

                // Target center position for the rotated label
                const targetCx = refBBox.x + refBBox.width / 2;
                // Rotated label height is myBBox.width. Place its center under ref element.
                const targetCy = refBBox.y + refBBox.height + padding + (myBBox.width / 2);

                // Translation needed to move label center to target center
                const translateX = targetCx - labelCx;
                const translateY = targetCy - labelCy;

                transform = `translate(${translateX}, ${translateY}) rotate(90 ${labelCx} ${labelCy})`;
                break;
            }
            default:
                throw new Error(`Invalid alignment: ${alignment}`);
        }

        // Set transform to position the label
        this.setAttr('transform', transform);
    }

}
