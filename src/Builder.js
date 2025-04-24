import {SvgRoot} from "./elements/SvgRoot.js";
import {Group} from "./elements/Group.js";
import {Circle} from "./elements/Circle.js";
import {Text} from "./elements/Text.js";
import {Rect} from "./elements/Rect.js";
import {PINSIZE, PINSPACE, PADDING} from "./Constants.js";
import {PinLabel} from "./components/PinLabel.js";
import {Defs} from "./elements/Defs.js";

export class Builder {

    setup = {
        // size in pins
        width: 7,
        height: 9,

        // pin rows
        left: {
            pins: 8,
            yoffset: 0,
            xoffset: 0,
        },
        right: {
            pins: 8,
            yoffset: 0,
            xoffset: 0,
        },
        top: {
            pins: 2,
            xoffset: 2,
            yoffset: 1,
        },
        bottom: {
            pins: 2,
            xoffset: 1,
            yoffset: 1,
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
                bgcolor: '#c1fa8d',
                fgcolor: '#000000',
            },
            power: {
                label: 'Power',
                bgcolor: '#ff3333',
                fgcolor: '#ffffff',
            },
            gnd: {
                label: 'GND',
                bgcolor: '#333333',
                fgcolor: '#ffffff',
            },
            i2c: {
                label: 'I2C',
                bgcolor: '#e1b4ef',
                fgcolor: '#000000',
            },
            uart: {
                label: 'UART',
                bgcolor: '#669098',
                fgcolor: '#ffffff',
            },
            spi: {
                label: 'SPI',
                bgcolor: '#9125cd',
                fgcolor: '#ffffff',
            },
            analog: {
                label: 'Analogue',
                bgcolor: '#f1c863',
                fgcolor: '#000000',
            },
        },

        // pin label:type, each pin can have multiple labels
        pins: {
            left: [
                ['GPIO 5:gpio', 'A5:analog', 'MISO:spi'],
                ['GPIO 6:gpio', 'MOSI:spi', 'SCK:spi'],
                ['GPIO 7:gpio', 'SS:spi'],
                ['GPIO 8:gpio', 'SDA:i2c'],
                ['GPIO 9:gpio', 'SCL:i2c'],
                ['GPIO 10:gpio'],
                ['GPIO 20:gpio', 'RX:uart'],
                ['GPIO 21:gpio', 'TX:uart'],
            ],
            right: [
                ['5V:power'],
                ['GND:gnd'],
                ['3V3:power'],
                ['GPIO 4:gpio', 'A4:analog', 'SCK:spi'],
                ['GPIO 3:gpio', 'A3:analog', 'MOSI:spi'],
                ['GPIO 2:gpio', 'A2:analog'],
                ['GPIO 1:gpio', 'A1:analog'],
                ['GPIO 0:gpio', 'A0:analog'],
            ],
            top: [
                ['GND:gnd'],
                ['5V:power'],
            ],
            bottom: [
                ['GND:gnd'],
                ['5V:power'],
            ],
        }
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
        for(let pindata of this.setup.pins[row][pinIndex]) {
            const [text, type] = pindata.split(':');
            const {bgcolor, fgcolor} = this.setup.types[type] || this.setup.types.default;

            const label = new PinLabel(text, {
                padding: 50,
                backgroundColor: bgcolor,
                textColor: fgcolor,
                borderRadius: 30,
            });
            label.align(alignment, last, PADDING);
            group.append(label);
            last = label;
        }
        
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
        const pinCount = this.setup[row].pins;
        
        for(let pin = 0; pin < pinCount; pin++) {
            const pinGroup = this.createPinWithLabels(row, pin, alignment);
            rowGroup.append(pinGroup);
        }
        
        return rowGroup;
    }

    build() {
        // Create SVG root
        const svg = new SvgRoot();

        // Add a background rectangle
        svg.append(new Rect(-100, -100, (this.setup.width-1) * PINSPACE + 200, (this.setup.height-1) * PINSPACE + 200, {
            fill: '#f8f8f8',
            cx: 50,
            cy: 50,
        }));

        // this represents the breadboard
        const breadboard = new Group();
        for(let x = 0; x < this.setup.width; x++) {
            for(let y = 0; y < this.setup.height; y++) {
                breadboard.append(new Circle(x * PINSPACE, y * PINSPACE, 100, '#eeeeee'));
            }
        }
        svg.append(breadboard);

        // Create pin rows
        svg.append(this.createPinRow('left', 'leftof'));
        svg.append(this.createPinRow('right', 'rightof'));
        svg.append(this.createPinRow('top', 'above'));
        svg.append(this.createPinRow('bottom', 'under'));

        svg.getBoundingBox();
        return svg;
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
                    x: this.setup.left.xoffset * PINSPACE,
                    y: (this.setup.left.yoffset + pin) * PINSPACE
                };
            case 'right':
                return {
                    x: (this.setup.width - 1 - this.setup.right.xoffset) * PINSPACE,
                    y: (this.setup.right.yoffset + pin) * PINSPACE
                };
            case 'top':
                return {
                    x: (this.setup.top.xoffset + pin) * PINSPACE,
                    y: this.setup.top.yoffset * PINSPACE
                };
            case 'bottom':
                return {
                    x: (this.setup.bottom.xoffset + pin) * PINSPACE,
                    y: (this.setup.height - 1 - this.setup.bottom.yoffset) * PINSPACE
                };
            default:
                throw new Error(`Invalid row: ${row}`);
        }
    }
}
