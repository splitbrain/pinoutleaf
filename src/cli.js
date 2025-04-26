import {createWindow} from "svgdom";
import {Builder} from "./Builder.js";
import Hjson from 'hjson';
import { readFileSync } from 'fs';

function printHelp() {
    console.log(`Usage: node ${process.argv[1]} [options]`);
    console.log("Options:");
    console.log("  -h, --help    Display this help message.");
    console.log("\nGenerates SVG pinout leaves based on given configuration files.");
}


function processDir(dir) {

}

function processFile(file) {
    const data = readFileSync(file, 'utf8');
    const setup = Hjson.parse(data);
    const builder = new Builder(setup);

    const window = createWindow();
    const svg = builder.build().render(window.document);

    console.log(svg.outerHTML);
}

function main() {
    // Basic argument parsing
    const args = process.argv.slice(2); // Skip node executable and script path

    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        process.exit(0); // Exit successfully after showing help
    }

}

main();
