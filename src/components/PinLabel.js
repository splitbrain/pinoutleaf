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


}
