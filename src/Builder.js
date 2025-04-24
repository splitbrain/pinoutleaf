import {SvgRoot} from "./elements/SvgRoot.js";
import {Group} from "./elements/Group.js";
import {Circle} from "./elements/Circle.js";
import {Text} from "./elements/Text.js";
import {Rect} from "./elements/Rect.js";
import {PINSIZE, PINSPACE} from "./Constants.js";
import {PinLabel} from "./components/PinLabel.js";
import {Defs} from "./elements/Defs.js";

export class Builder {

    setup = {
        // size in pins
        width: 7,
        height: 9,

        // pin rows
        left: {
            pins: 3,
            yoffset: 2,
            xoffset: 0,
        },
        right: {
            pins: 6,
            yoffset: 1,
            xoffset: 1,
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
                bgcolor: '#ffb3b3',
                fgcolor: '#000000',
            },
        },

        // pin label:type, each pin can have multiple labels
        pins: {
            left: [
                ['GPIO5:gpio', 'A5:analog', 'MISO:spi'],
                ['GPIO6:gpio', 'MOSI:spi', 'SCK:spi'],
                ['GPIO7:gpio', 'SS:spi'],
                ['GPIO8:gpio', 'SDA:i2c'],
                ['GPIO9:gpio', 'SCL:i2c'],
                ['GPIO10:gpio'],
                ['GPIO20:gpio', 'RX:uart'],
                ['GPIO21:gpio', 'TX:uart'],
            ],
            right: [
                ['5V:power'],
                ['GND:gnd'],
                ['3V3:power'],
                ['GPIO4:gpio', 'A4:analog', 'SCK:spi'],
                ['GPIO3:gpio', 'A3:analog', 'MOSI:spi'],
                ['GPIO2:gpio', 'A2:analog'],
                ['GPIO1:gpio', 'A1:analog'],
                ['GPIO0:gpio', 'A0:analog'],
            ]
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
            left.append(new Circle(pos.x, pos.y, PINSIZE, 'gold'));

            const text = this.setup.pins.left[pin][0];

            const label = new PinLabel(text);
            left.append(label);
        }
        svg.append(left);

        const right = new Group();
        for(let pin = 0; pin < this.setup.right.pins; pin++) {
            const pos = this.pinPosition('right', pin);
            right.append(new Circle(pos.x, pos.y, PINSIZE, 'gold'));
        }
        svg.append(right);

        const top = new Group();
        for(let pin = 0; pin < this.setup.top.pins; pin++) {
            const pos = this.pinPosition('top', pin);
            top.append(new Circle(pos.x, pos.y, PINSIZE, 'gold'));
        }
        svg.append(top);

        const bottom = new Group();
        for(let pin = 0; pin < this.setup.bottom.pins; pin++) {
            const pos = this.pinPosition('bottom', pin);
            bottom.append(new Circle(pos.x, pos.y, PINSIZE, 'gold'));
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
