import {SvgRoot} from "./elements/SvgRoot.js";
import {Group} from "./elements/Group.js";
import {Circle} from "./elements/Circle.js";
import {Rect} from "./elements/Rect.js";
import {Text} from "./elements/Text.js";
import {PADDING, PINSIZE, PINSPACE, CHIPPINLENGTH, CHIPPINWIDTH} from "./Constants.js";
import {PinLabel} from "./components/PinLabel.js";
import {Legend} from "./components/Legend.js";
import {Title} from "./components/Title.js";
import {Pcb} from "./components/Pcb.js";
import {Chip} from "./components/Chip.js";
import merge from 'lodash.merge';
import {RootGroup} from "./components/RootGroup.js";

export class Builder {

    setup = {
        // Diagram Title
        title: "My PCB",

        // Diagram variant: 'pcb' or 'chip'
        variant: 'pcb',

        /* PCB Options */
        // size in pins
        width: NaN,
        height: NaN,

        /* Chip Options */
        pinNumbers: 'none', // 'none', 'auto', 'firstLabel' - whether to show pin numbers on the chip

        legend: 'auto', // 'auto', 'none' - whether to show the legend

        image: {
            front: {
                src: '',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.5,
                grayscale: true,
            },
            back: {
                src: '',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.5,
                grayscale: true,
            },
        },

        // types
        types: {
            default: {
                label: 'Pin',
                bgcolor: '#ffffff',
                fgcolor: '#000000',
            },
            gpio: {
                label: 'GPIO',
                bgcolor: '#79bc3c',
                fgcolor: '#ffffff',
            },
            power: {
                label: 'Power',
                bgcolor: '#cc322d',
                fgcolor: '#ffffff',
            },
            gnd: {
                label: 'Ground',
                bgcolor: '#333333',
                fgcolor: '#ffffff',
            },
            i2c: {
                label: 'I2C',
                bgcolor: '#41b28c',
                fgcolor: '#ffffff',
            },
            uart: {
                label: 'UART',
                bgcolor: '#637181',
                fgcolor: '#ffffff',
            },
            spi: {
                label: 'SPI',
                bgcolor: '#775ee8',
                fgcolor: '#ffffff',
            },
            analog: {
                label: 'Analog',
                bgcolor: '#e38022',
                fgcolor: '#ffffff',
            },
        },

        // offsets move their respective rows inwards
        offsets: {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        },

        // pin label:type, each pin can have multiple labels
        pins: {
            left: [],
            right: [],
            top: [],
            bottom: [],
        }
    }

    /**
     * @param {object} setup The configuration for the PCB diagram.
     */
    constructor(setup) {
        this.setup = merge(this.setup, setup);

        const { width, height, pins } = this.setup;

        // Calculate width and height if not provided.
        if(!width)
        {
            const minWidth = !!pins.left + !!pins.right; // Count non-empty vertical sides
            this.setup.width = Math.max(pins.top.length, pins.bottom.length, minWidth);
        }

        if(!height)
        {
            const minHeight = !!pins.top + !!pins.bottom; // Count non-empty horizontal sides
            this.setup.height = Math.max(pins.left.length, pins.right.length, minHeight);
        }

        this.normalizePinArrays();
        this.isFlipped = false;
    }

    /**
     * Create the whole diagram
     *
     * @returns {SvgRoot}
     */
    build() {
        const {title, variant, width, height, legend, image, types, pins} = this.setup;
        if(variant === 'chip' && this.isFlipped) {
            // Chip diagrams don't have a back side, so if the PCB is flipped, we don't render anything
            return null;
        }

        // Create SVG root
        const svg = new SvgRoot();
        const root = new RootGroup();
        svg.append(root);

        let background;
        if (variant === 'chip') {
            background = new Chip(width, height);
        } else {
            background = new Pcb(width, height, image, this.isFlipped);
        }

        // Create pin rows
        const pinLayoutGroup = new Group();
        pinLayoutGroup.append(this.createPinRow('left', 'leftof'));
        pinLayoutGroup.append(this.createPinRow('right', 'rightof'));
        pinLayoutGroup.append(this.createPinRow('top', 'above'));
        pinLayoutGroup.append(this.createPinRow('bottom', 'under'));
        root.append(pinLayoutGroup);

        // Add the background
        pinLayoutGroup.prepend(background);

        // Create the title
        const titleGroup = new Title(title + (this.isFlipped ? '  (back)' : ' (front)'));
        root.append(titleGroup);

        let legendGroup = null;
        if(legend !== 'none') {
            // Create the legend
            legendGroup = new Legend(types, pins, this.isFlipped);
            root.append(legendGroup);
        }

        const rootBBox = root.getBoundingBox();

        // Position legend to the bottom aligned to the right/left of the pin layout with padding
        if(legendGroup) {
            const pinLayoutBBox = pinLayoutGroup.getBoundingBox();
            const legendBBox = legendGroup.getBoundingBox();

            if(this.isFlipped) {
                // FIXME
                //   it's hacky:
                //   rect returns the visual bounding box that includes the stroke width
                //   for alignment we need to adjust for the stroke width, thus the +10
                //   see Rect.getBoundingBox()
                legendGroup.setTranslate(
                    pinLayoutBBox.x - legendBBox.width + 10 - (PADDING * 3),
                    rootBBox.y + rootBBox.height - legendBBox.height
                );
            } else {
                legendGroup.setTranslate(
                    pinLayoutBBox.x + pinLayoutBBox.width + (PADDING * 3),
                    rootBBox.y + rootBBox.height - legendBBox.height
                );
            }
        }

        // Position title at the top, left aligned
        const titleBBox = titleGroup.getBoundingBox();
        const rootBBoxWithLegend = root.getBoundingBox();
        titleGroup.setTranslate(rootBBoxWithLegend.x, rootBBoxWithLegend.y - PADDING - titleBBox.height);

        // Update SVG bounds to include everything
        root.reframe();
        svg.getBoundingBox();
        return svg;
    }

    /**
     * Flip the PCB
     *
     * This directly modifies the setup object to flip the PCB. It flips the right and left pins,
     * reverses the order of the top and bottom pins and swaps the front and back images.
     */
    flip() {
        const { variant, image, offsets, pins } = this.setup;
        this.isFlipped = !this.isFlipped;

        if(variant=== 'chip') {
            return; // No need to flip chip diagrams, we only want to flip PCB diagrams
        }

        // Swap left and right pins
        const tempLeftPins = pins.left;
        pins.left = pins.right;
        pins.right = tempLeftPins;

        // Swap left and right offsets
        const tempLeftOffset = offsets.left;
        offsets.left = offsets.right;
        offsets.right = tempLeftOffset;

        // Reverse top and bottom pins
        if (pins.top) {
            pins.top.reverse();
        }
        if (pins.bottom) {
            pins.bottom.reverse();
        }

        // Swap front and back images
        if (image) {
            const tempFrontImage = image.front;
            image.front = image.back;
            image.back = tempFrontImage;
        }
    }

    /**
     * Ensures pin arrays match the defined width and height.
     */
    normalizePinArrays() {
        const {variant, width, height, pins} = this.setup;

        const adjustPinArray = (arrayName, targetLength) => {
            const currentArray = pins[arrayName];
            if (!currentArray) {
                pins[arrayName] = Array(targetLength).fill([]);
                return;
            }

            const currentLength = currentArray.length;

            if (currentLength < targetLength) {
                // Pad the array
                const needed = targetLength - currentLength;
                pins[arrayName] = currentArray.concat(Array(needed).fill([]));
            } else if (currentLength > targetLength) {
                // Truncate the array
                console.warn(
                    `Builder: Pin array '${arrayName}' has ${currentLength} elements, but expected ${targetLength}.
                    Truncating excess elements.`
                );
                pins[arrayName] = currentArray.slice(0, targetLength);
            }
        };
    
        /**
         * For chip diagrams that have pins on both a vertical side (left/right) and a
         * horizontal side (top/bottom), the corner pin of a vertical row lands on the
         * exact same grid position as the corner pin of a horizontal row, causing their
         * labels to overlap. To avoid this, grow the chip by one empty column and one
         * empty row on every side, shifting all existing pins inward so the corners are
         * left empty (unrendered) instead of shared between two labels.
         */
        const avoidChipCornerOverlap = () => {
            const { width, height, pins } = this.setup;
            
            const hasPins = (row) => row.some(pin => pin && pin.length);
            const hasVertical = hasPins(pins.left) || hasPins(pins.right);
            const hasHorizontal = hasPins(pins.top) || hasPins(pins.bottom);
            if (!hasVertical || !hasHorizontal) {
                return;
            }

            const emptyPin = () => [];
            const grow = (row) => [emptyPin(), ...row, emptyPin()];

            pins.left = grow(pins.left);
            pins.right = grow(pins.right);
            pins.top = grow(pins.top);
            pins.bottom = grow(pins.bottom);

            this.setup.width += 2;
            this.setup.height += 2;
        }

        // Adjust vertical arrays (left, right) based on height
        adjustPinArray('left', height);
        adjustPinArray('right', height);

        // Adjust horizontal arrays (top, bottom) based on width
        adjustPinArray('top', width);
        adjustPinArray('bottom', width);

        if (variant === 'chip') {
            avoidChipCornerOverlap();
        }
    }


    /**
     * Determines the physical pin number for a pin at a given row/index.
     *
     * Pin 1 is the first pin in the left column. Numbering then proceeds down the
     * left side, across the bottom, up the right side, and across the top.
     * Empty pin locations don't count towards the pin index (since no pin is drawn on those locations).
     *
     * @param {string} row The row identifier ('left', 'right', 'top', 'bottom')
     * @param {number} index The index of the pin within its row
     * @returns {number} The 1-based pin number.
     */
    calculateAutoPinNumber(row, index) {
        const {pins} = this.setup;

        // Count the number of non-empty pins in each row
        const leftPins = pins.left.filter(pin => pin && pin.length);
        const bottomPins = pins.bottom.filter(pin => pin && pin.length);
        const rightPins = pins.right.filter(pin => pin && pin.length);
        const topPins = pins.top.filter(pin => pin && pin.length);

        const nrOfLeftPins = leftPins.length;
        const nrOfBottomPins = bottomPins.length;
        const nrOfRightPins = rightPins.length;
        const nrOfTopPins = topPins.length;

        function calculatePinNumberInRow(pinArray, reverse = false) {
            let idx = index;
            if (reverse) {
                // Start counting from the end of the array for reverse order
                idx = -index-1;
            }
            return pinArray.slice(0, idx).filter(pin => pin && pin.length).length;
        }

        let pinNumber;
        switch (row) {
            case 'left':
                pinNumber = calculatePinNumberInRow(pins.left);
                break;
            case 'bottom':
                pinNumber = nrOfLeftPins + calculatePinNumberInRow(pins.bottom);
                break;
            case 'right':
                // The right side is numbered in reverse order, so we need to count from the end of the array
                pinNumber = nrOfLeftPins + nrOfBottomPins + calculatePinNumberInRow(pins.right, true);
                break;
            case 'top':
                // The top side is also numbered in reverse order, so we need to count from the end of the array
                pinNumber = nrOfLeftPins + nrOfBottomPins + nrOfRightPins + calculatePinNumberInRow(pins.top, true);
                break;
            default:
                throw new Error(`Invalid row: ${row}`);
        }

        return pinNumber + 1; // Convert to 1-based numbering
    }

    getPinNumber(row, index) {
        switch (this.setup.pinNumbers) {
            case 'none':
                return null;
            case 'auto':
                return this.calculateAutoPinNumber(row, index);
            case 'firstLabel':
                const pinLabels = this.setup.pins[row][index];
                if (!pinLabels || !pinLabels.length) {
                    return null;
                }
                const firstLabel = pinLabels[0];
                const number = parseInt(firstLabel, 10);
                return isNaN(number) ? null : number;
            default:
                throw new Error(`Invalid pinNumbers option: ${this.setup.pinNumbers}`);
        }
    }   
    
    /**
     * Creates the pin number label, printed in white inside the chip body next to
     * the pin's lead, sized so its height roughly matches the lead's width.
     *
     * @param {string} row The row identifier ('left', 'right', 'top', 'bottom')
     * @param {number} index The index of the pin within its row
     * @param {{x: number, y: number}} pos The pin's position
     * @param {{left: number, right: number, top: number, bottom: number}} body The chip body bounds
     * @returns {Text} The configured Text element.
     */
    createChipPinNumber(row, index, pos, body) {

        const { pins } = this.setup;

        if ( !pins[row][index]){
            return null;
        } 

        const number = this.getPinNumber(row, index);
        const fontSize = CHIPPINWIDTH;
        const inset = CHIPPINWIDTH;

        const attrs = {
            fill: '#ffffff',
            'font-size': fontSize,
        };

        let x, y;
        switch (row) {
            case 'left':
                x = body.left + inset;
                y = pos.y - fontSize / 2;
                break;
            case 'right':
                x = body.right - inset;
                y = pos.y - fontSize / 2;
                attrs['text-anchor'] = 'end';
                break;
            case 'top':
                x = pos.x;
                y = body.top + inset;
                attrs['text-anchor'] = 'middle';
                break;
            case 'bottom':
                x = pos.x;
                y = body.bottom - inset - fontSize;
                attrs['text-anchor'] = 'middle';
                break;
        }

        return new Text(x, y, String(number), attrs);
    }

    /**
     * Creates a pin with its labels
     * @param {string} row The row identifier ('left', 'right', 'top', 'bottom')
     * @param {number} pinIndex The index of the pin in the row
     * @param {string} alignment The alignment of labels ('leftof', 'rightof', 'above', 'under')
     * @returns {Group} A group containing the pin and its labels
     */
    createPinWithLabels(row, pinIndex, alignment) {
        const { variant, pinNumbers, pins, types } = this.setup;
        const group = new Group();
        const pos = this.pinPosition(row, pinIndex);

        let pinElement;
        let pinNumberElement = null;
        switch (variant) {
            case 'chip': {
                const body = this.chipBodyBounds();
                switch (row) {
                    case 'left':
                        pinElement = new Rect(body.left - CHIPPINLENGTH, pos.y - CHIPPINWIDTH / 2, CHIPPINLENGTH, CHIPPINWIDTH, { fill: 'silver' });
                        break;
                    case 'right':
                        pinElement = new Rect(body.right, pos.y - CHIPPINWIDTH / 2, CHIPPINLENGTH, CHIPPINWIDTH, { fill: 'silver' });
                        break;
                    case 'top':
                        pinElement = new Rect(pos.x - CHIPPINWIDTH / 2, body.top - CHIPPINLENGTH, CHIPPINWIDTH, CHIPPINLENGTH, { fill: 'silver' });
                        break;
                    case 'bottom':
                        pinElement = new Rect(pos.x - CHIPPINWIDTH / 2, body.bottom, CHIPPINWIDTH, CHIPPINLENGTH, { fill: 'silver' });
                        break;
                }
                if (pinNumbers != 'none') {
                    pinNumberElement = this.createChipPinNumber(row, pinIndex, pos, body);
                }
                break;
            }
            case 'pcb':
            default:
                pinElement = new Circle(pos.x, pos.y, PINSIZE, 'gold');
                break;
        }

        group.append(pinElement);
        if (pinNumberElement) {
            group.append(pinNumberElement);
        }

        let last = pinElement;
        pins[row][pinIndex].forEach((pindata, index) => {

            if(pinNumbers === 'firstLabel' && index === 0) {
                // Skip the first label if pinNumbers is set to 'firstLabel'
                // since the first label is already used as the pin number.
                return;
            }

            const [text, type] = pindata.split(':');
            const {bgcolor, fgcolor} = this.setup.types[type] || this.setup.types.default;

            const label = new PinLabel(text, {
                backgroundColor: bgcolor,
                textColor: fgcolor,
            });
            label.align(alignment, last, index ? PADDING : PADDING * 3); // add more padding for the first label
            group.append(label);
            last = label;
        });

        return group;
    }

    /**
     * Calculates the edges of the chip body (the Pcb background rect) in the pin
     * layout's coordinate space, so chip leads can be aligned flush against it.
     *
     * @returns {{left: number, right: number, top: number, bottom: number}}
     */
    chipBodyBounds() {
        const bodyPadding = PINSPACE / 2; // matches Pcb's default padding
        return {
            left: -bodyPadding,
            right: (this.setup.width - 1) * PINSPACE + bodyPadding,
            top: -bodyPadding,
            bottom: (this.setup.height - 1) * PINSPACE + bodyPadding,
        };
    }

    /**
     * Creates a row of pins
     * @param {string} row The row identifier ('left', 'right', 'top', 'bottom')
     * @param {string} alignment The alignment of labels ('leftof', 'rightof', 'above', 'under')
     * @returns {Group} A group containing all pins in the row
     */
    createPinRow(row, alignment) {
        const rowGroup = new Group();
        const pinCount = this.setup.pins[row].length;

        for (let pin = 0; pin < pinCount; pin++) {
            if (!this.setup.pins[row][pin]) continue; // pin is null
            if (!this.setup.pins[row][pin].length) continue; // No definition for this pin, skip it
            const pinGroup = this.createPinWithLabels(row, pin, alignment);
            rowGroup.append(pinGroup);
        }

        return rowGroup;
    }

    /**
     *
     * @param {string} row The row to get the pin position for. Can be 'left', 'right', 'top', or 'bottom'.
     * @param {int} pin The pin number in the row.
     * @returns {{x: number, y: number}} The x and y coordinates of the pin position.
     */
    pinPosition(row, pin) {
        switch (row) {
            case 'left':
                return {
                    x: this.setup.offsets.left * PINSPACE,
                    y: pin * PINSPACE
                };
            case 'right':
                return {
                    x: (this.setup.width - 1 - this.setup.offsets.right) * PINSPACE,
                    y: pin * PINSPACE
                };
            case 'top':
                return {
                    x: pin * PINSPACE,
                    y: this.setup.offsets.top * PINSPACE
                };
            case 'bottom':
                return {
                    x: pin * PINSPACE,
                    y: (this.setup.height - 1 - this.setup.offsets.bottom) * PINSPACE
                };
            default:
                throw new Error(`Invalid row: ${row}`);
        }
    }
}
