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
                breadboard.append( new Circle(x * PINSPACE, y * PINSPACE, 100 , '#eeeeee') );
            }
        }
        svg.append(breadboard);

        // Create pin rows
        const left = new Group();
        for(let pin = 0; pin < this.setup.left.pins; pin++) {
            const pos = this.pinPosition('left', pin);
            const pinElement = new Circle(pos.x, pos.y, PINSIZE, 'gold');
            left.append(pinElement);

            let last = pinElement;
            for(let pindata of this.setup.pins.left[pin]) {
                const [text, type] = pindata.split(':');
                const {bgcolor, fgcolor} = this.setup.types[type] || this.setup.types.default;

                const label = new PinLabel(text, {
                    padding: 50,
                    backgroundColor: bgcolor,
                    textColor: fgcolor,
                    borderRadius: 30,
                });
                label.align('leftof', last, PADDING);
                left.append(label);
                last = label;
            }
        }
        svg.append(left);

        const right = new Group();
        for(let pin = 0; pin < this.setup.right.pins; pin++) {
            const pos = this.pinPosition('right', pin);
            const pinElement = new Circle(pos.x, pos.y, PINSIZE, 'gold');
            right.append(pinElement);

            let last = pinElement;
            for(let pindata of this.setup.pins.right[pin]) {
                const [text, type] = pindata.split(':');
                const {bgcolor, fgcolor} = this.setup.types[type] || this.setup.types.default;

                const label = new PinLabel(text, {
                    padding: 50,
                    backgroundColor: bgcolor,
                    textColor: fgcolor,
                    borderRadius: 30,
                });
                label.align('rightof', last, PADDING);
                right.append(label);
                last = label;
            }
        }
        svg.append(right);

        const top = new Group();
        for(let pin = 0; pin < this.setup.top.pins; pin++) {
            const pos = this.pinPosition('top', pin);
            const pinElement = new Circle(pos.x, pos.y, PINSIZE, 'gold');
            top.append(pinElement);

            let last = pinElement;
            for(let pindata of this.setup.pins.top[pin]) {
                const [text, type] = pindata.split(':');
                const {bgcolor, fgcolor} = this.setup.types[type] || this.setup.types.default;

                const label = new PinLabel(text, {
                    padding: 50,
                    backgroundColor: bgcolor,
                    textColor: fgcolor,
                    borderRadius: 30,
                });
                label.align('above', last, PADDING);
                top.append(label);
                last = label;
            }
        }
        svg.append(top);

        const bottom = new Group();
        for(let pin = 0; pin < this.setup.bottom.pins; pin++) {
            const pos = this.pinPosition('bottom', pin);
            const pinElement = new Circle(pos.x, pos.y, PINSIZE, 'gold');
            bottom.append(pinElement);

            let last = pinElement;
            for(let pindata of this.setup.pins.bottom[pin]) {
                const [text, type] = pindata.split(':');
                const {bgcolor, fgcolor} = this.setup.types[type] || this.setup.types.default;

                const label = new PinLabel(text, {
                    padding: 50,
                    backgroundColor: bgcolor,
                    textColor: fgcolor,
                    borderRadius: 30,
                });
                label.align('under', last, PADDING);
                bottom.append(label);
                last = label;
            }
        }
        svg.append(bottom);

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
