import {Builder} from "./Builder.js";
import {ImageEmbed} from "./ImageEmbed.js";
import {Editor} from "./Editor.js";

(async function() {

    const editor = new Editor(
        document.getElementById('editor'),
        document.getElementById('output')
    );


    /*
    let setup = {
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

        // offsets move their respective rows inwards
        offsets: {
            top: 2,
            right: 1,
        },

        types: {

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
                [],
                ['5V:power'],
                ['GND:gnd'],
                ['3V3:power'],
                ['GPIO4:gpio', 'A4:analog', 'SCK:spi'],
                ['GPIO3:gpio', 'A3:analog', 'MOSI:spi'],
                ['GPIO2:gpio', 'A2:analog'],
                ['GPIO1:gpio', 'A1:analog'],
                ['GPIO0:gpio', 'A0:analog'],
            ],
            top: [
                [],
                [],
                ['GND:gnd', 'A4:analog', 'SCK:spi'],
                ['5V:power'],
            ],
            bottom: [
                [],
                ['GND:gnd'],
                ['5V:power', 'A4:analog', 'SCK:spi'],
            ],
        }
    };

    const embed = new ImageEmbed();
    setup = await embed.embedImages(setup);

    const builder = new Builder(setup);

    //builder.flip();
    const svg = builder.build();
    const el = svg.render(window.document);

    window.document.body.appendChild(el);
     */
})();
