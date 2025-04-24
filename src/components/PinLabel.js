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
            case 'above':
                // Calculate position considering rotated dimensions
                x = refBBox.x + (refBBox.width / 2) - (myBBox.height / 2); // Use height for centering
                y = refBBox.y - myBBox.width - padding; // Use width for vertical positioning

                // Calculate rotation center (relative to label's origin 0,0)
                const cxAbove = myBBox.width / 2;
                const cyAbove = myBBox.height / 2;

                transform = `translate(${x}, ${y}) rotate(-90 ${cxAbove} ${cyAbove})`; // Rotate -90 degrees
                break;
            case 'under':
                 // Calculate position considering rotated dimensions
                x = refBBox.x + (refBBox.width / 2) - (myBBox.height / 2); // Use height for centering
                y = refBBox.y + refBBox.height + padding;

                // Calculate rotation center (relative to label's origin 0,0)
                const cxUnder = myBBox.width / 2;
                const cyUnder = myBBox.height / 2;

                transform = `translate(${x}, ${y}) rotate(90 ${cxUnder} ${cyUnder})`; // Rotate 90 degrees
                break;
            default:
                throw new Error(`Invalid alignment: ${alignment}`);
        }

        // Set transform to position the label
        this.setAttr('transform', transform);
    }

}
