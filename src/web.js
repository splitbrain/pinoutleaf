import {Builder} from "./Builder.js";

(function() {
    const builder = new Builder(
        {
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
                    [],
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
        }
    );

    //builder.flip();
    const svg = builder.build();
    const el = svg.render(window.document);

    window.document.body.appendChild(el);
})();
