import {SvgRoot} from "./elements/SvgRoot.js";
import {Group} from "./elements/Group.js";
import {Circle} from "./elements/Circle.js";
import {PINSPACE} from "./Constants.js";

export class Builder {

    setup = {
        // size in pins
        width: 6,
        height: 9,

        // pin rows
        left: {
            pins: 8,
            offset: 0,
        },
        right: {
            pins: 8,
            offset: 0,
        },
        top: {
            pins: 0,
            offset: 0,
        },
        bottom: {
            pins: 0,
            offset: 0,
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

        // Create a group with a transformation
        const group = new Group({transform: 'translate(50, 50)'});
        group.append(new Circle(0, 0, 30, 'yellow'));
        group.append(new Circle(60, 0, 30, 'green'));

        for(let x = 0; x < this.setup.width; x++) {
            for(let y = 0; y < this.setup.height; y++) {
                svg.append( new Circle(x * PINSPACE, y * PINSPACE, 100 , '#cccccc') );
            }
        }


        // Add group to root
        svg.append(group);

        return svg;
    }
}
