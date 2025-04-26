import {SvgRoot} from "./elements/SvgRoot.js";
import {Group} from "./elements/Group.js";
import {Circle} from "./elements/Circle.js";
import {PADDING, PINSIZE, PINSPACE} from "./Constants.js";
import {PinLabel} from "./components/PinLabel.js";
import {Legend} from "./components/Legend.js";
import {Title} from "./components/Title.js";
import {Pcb} from "./components/Pcb.js";
import merge from 'lodash.merge';
import {RootGroup} from "./components/RootGroup.js";

export class Builder {

    setup = {
        // Diagram Title
        title: "My PCB",

        // size in pins
        width: 5,
        height: 5,

        image: {
            front: {
                src: '',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            },
            back: {
                src: '',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }
        },

        // types
        types: {
            default: {
                label: 'PIN',
                bgcolor: '#ffffff',
                fgcolor: '#000000',
            },
            gpio: {
                label: 'GPIO',
                bgcolor: '#8c49ae',
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
                bgcolor: '#485377',
                fgcolor: '#ffffff',
            },
            uart: {
                label: 'UART',
                bgcolor: '#34CD71',
                fgcolor: '#ffffff',
            },
            spi: {
                label: 'SPI',
                bgcolor: '#3399DD',
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
        this.normalizePinArrays();
    }

    /**
     * Create the whole diagram
     *
     * @returns {SvgRoot}
     */
    build() {
        // Create SVG root
        const svg = new SvgRoot();
        const root = new RootGroup();
        svg.append(root);


        // Create pin rows
        const pinLayoutGroup = new Group();
        pinLayoutGroup.append(this.createPinRow('left', 'leftof'));
        pinLayoutGroup.append(this.createPinRow('right', 'rightof'));
        pinLayoutGroup.append(this.createPinRow('top', 'above'));
        pinLayoutGroup.append(this.createPinRow('bottom', 'under'));
        root.append(pinLayoutGroup);

        // Add the PCB background
        const pcb = new Pcb(this.setup.width, this.setup.height, this.setup.image);
        pinLayoutGroup.prepend(pcb);

        // Create the title
        const title = new Title(this.setup.title);
        root.append(title)

        // Create the legend
        const legend = new Legend(this.setup.types, this.setup.pins);
        root.append(legend);


        // Get bounding box of the main pin layout
        const pinLayoutBBox = pinLayoutGroup.getBoundingBox();
        const legendBBox = legend.getBoundingBox();
        const titleBBox = title.getBoundingBox();

        // Position title above the pin layout, left aligned
        title.setTranslate(pinLayoutBBox.x, pinLayoutBBox.y - PADDING - titleBBox.height);

        // Position legend to the right of the pin layout with padding
        legend.setTranslate(pinLayoutBBox.x + pinLayoutBBox.width + PADDING * 3, pinLayoutBBox.y);

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
        // Swap left and right pins
        const tempLeftPins = this.setup.pins.left;
        this.setup.pins.left = this.setup.pins.right;
        this.setup.pins.right = tempLeftPins;

        // Swap left and right offsets
        const tempLeftOffset = this.setup.offsets.left;
        this.setup.offsets.left = this.setup.offsets.right;
        this.setup.offsets.right = tempLeftOffset;

        // Reverse top and bottom pins
        if (this.setup.pins.top) {
            this.setup.pins.top.reverse();
        }
        if (this.setup.pins.bottom) {
            this.setup.pins.bottom.reverse();
        }

        // Swap front and back images
        if (this.setup.image) {
            const tempFrontImage = this.setup.image.front;
            this.setup.image.front = this.setup.image.back;
            this.setup.image.back = tempFrontImage;
        }
    }

    /**
     * Ensures pin arrays match the defined width and height.
     */
    normalizePinArrays() {
        const {width, height, pins} = this.setup;

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

        // Adjust vertical arrays (left, right) based on height
        adjustPinArray('left', height);
        adjustPinArray('right', height);

        // Adjust horizontal arrays (top, bottom) based on width
        adjustPinArray('top', width);
        adjustPinArray('bottom', width);
    }

    /**
     * Creates a pin with its labels
     * @param {string} row The row identifier ('left', 'right', 'top', 'bottom')
     * @param {number} pinIndex The index of the pin in the row
     * @param {string} alignment The alignment of labels ('leftof', 'rightof', 'above', 'under')
     * @returns {Group} A group containing the pin and its labels
     */
    createPinWithLabels(row, pinIndex, alignment) {
        const group = new Group();
        const pos = this.pinPosition(row, pinIndex);
        const pinElement = new Circle(pos.x, pos.y, PINSIZE, 'gold');
        group.append(pinElement);

        let last = pinElement;
        this.setup.pins[row][pinIndex].forEach((pindata, index) => {
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
