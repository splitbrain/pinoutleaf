import { createWindow } from "svgdom";
import { Builder } from "./Builder.js";
import Hjson from 'hjson';
import { readFileSync, statSync } from 'fs';

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

    if (args.length === 0) {
        console.error("Error: No input files or directories specified.");
        printHelp();
        process.exit(1);
    }

    let errors = 0;

    args.forEach(arg => {
        try {
            const stats = statSync(arg);
            if (stats.isFile()) {
                processFile(arg);
            } else if (stats.isDirectory()) {
                processDir(arg);
            } else {
                console.error(`Error: '${arg}' is not a file or directory.`);
                errors++;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`Error: Path not found '${arg}'`);
            } else {
                console.error(`Error processing '${arg}': ${error.message}`);
            }
            errors++;
        }
    });

    process.exit(errors);
}

main();
