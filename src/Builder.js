import {SvgRoot} from "./elements/SvgRoot.js";
import {Group} from "./elements/Group.js";
import {Circle} from "./elements/Circle.js";
import {Rect} from "./elements/Rect.js";
import {PADDING, PINSIZE, PINSPACE} from "./Constants.js";
import {PinLabel} from "./components/PinLabel.js";
import {Legend} from "./components/Legend.js";
import {Title} from "./components/Title.js";
import {Pcb} from "./components/Pcb.js"; // Import the Pcb component

export class Builder {

    setup = {
        // Diagram Title
        title: "ESP32 C3 Super Mini",

        // size in pins
        width: 7,
        height: 9,

        image: {
            front: {
                src: 'https://michiel.vanderwulp.be/domotica/Modules/ESP32-C3-SuperMini/ESP32-C3-SuperMini.jpg',
                top: -270,
                left: -100,
                right: -120,
                bottom: -50,
            },
            back: {
                src: 'https://www.elecbee.com/image/cache/catalog/bg/esp32-c3-development-board-esp32-supermini-wifi-bluetooth-mini-module_1-800x800.jpg',
            }
        },

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
            pins: 0,
            xoffset: 0,
            yoffset: 0,
        },
        bottom: {
            pins: 0,
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
                label: 'Ground',
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
                ['5:gpio', 'A5:analog', 'MISO:spi'],
                ['6:gpio', 'MOSI:spi', 'SCK:spi'],
                ['7:gpio', 'SS:spi'],
                ['8:gpio', 'SDA:i2c'],
                ['9:gpio', 'SCL:i2c'],
                ['10:gpio'],
                ['20:gpio', 'RX:uart'],
                ['21:gpio', 'TX:uart'],
            ],
            right: [
                ['5V:power'],
                ['GND:gnd'],
                ['3V3:power'],
                ['4:gpio', 'A4:analog', 'SCK:spi'],
                ['3:gpio', 'A3:analog', 'MOSI:spi'],
                ['2:gpio', 'A2:analog'],
                ['1:gpio', 'A1:analog'],
                ['0:gpio', 'A0:analog'],
            ],
            top: [
                ['GND:gnd', 'A4:analog', 'SCK:spi'],
                ['5V:power'],
            ],
            bottom: [
                ['GND:gnd'],
                ['5V:power', 'A4:analog', 'SCK:spi'],
            ],
        }
    }

    /**
     * Create the whole diagram
     *
     * @returns {SvgRoot}
     */
    build() {
        // Create SVG root
        const svg = new SvgRoot();

        // this represents the breadboard
        /*
        const breadboard = new Group();
        for(let x = 0; x < this.setup.width; x++) {
            for(let y = 0; y < this.setup.height; y++) {
                breadboard.append(new Circle(x * PINSPACE, y * PINSPACE, 100, '#eeeeee'));
            }
        }
        svg.append(breadboard);
       */


        // Create pin rows
        const pinLayoutGroup = new Group();
        pinLayoutGroup.append(this.createPinRow('left', 'leftof'));
        pinLayoutGroup.append(this.createPinRow('right', 'rightof'));
        pinLayoutGroup.append(this.createPinRow('top', 'above'));
        pinLayoutGroup.append(this.createPinRow('bottom', 'under'));
        svg.append(pinLayoutGroup);

        // Add the PCB background
        const pcb = new Pcb(this.setup.width, this.setup.height, this.setup.image);
        pinLayoutGroup.prepend(pcb);

        // Create the title
        const title = new Title(this.setup.title);
        svg.append(title)

        // Create the legend
        const legend = new Legend(this.setup.types, this.setup.pins);
        svg.append(legend);


        // Get bounding box of the main pin layout
        const pinLayoutBBox = pinLayoutGroup.getBoundingBox();
        const legendBBox = legend.getBoundingBox();
        const titleBBox = title.getBoundingBox();

        // Position title above the pin layout, left aligned
        title.setTranslate(pinLayoutBBox.x, pinLayoutBBox.y - PADDING - titleBBox.height);

        // Position legend to the right of the pin layout with padding
        legend.setTranslate(pinLayoutBBox.x + pinLayoutBBox.width + PADDING * 3, pinLayoutBBox.y);

        // Update SVG bounds to include everything
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

        if(!this.setup.pins[row][pinIndex]) return group; // No labels for this pin

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
        const pinCount = this.setup[row].pins;

        for (let pin = 0; pin < pinCount; pin++) {
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
