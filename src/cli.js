import { createWindow } from "svgdom";
import { Builder } from "./Builder.js";
import Hjson from 'hjson';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

function printHelp() {
    console.log(`Usage: node ${process.argv[1]} [options]`);
    console.log("Options:");
    console.log("  -h, --help    Display this help message.");
    console.log("\nGenerates SVG pinout leaves based on given configuration files.");
}


function processDir(dir) {
    try {
        const files = readdirSync(dir);
        files.forEach(file => {
            const filePath = join(dir, file);
            // Check if it's a file and has the correct extension
            try {
                const stats = statSync(filePath);
                if (stats.isFile() && (file.endsWith('.json') || file.endsWith('.hjson'))) {
                    processFile(filePath);
                }
            } catch (statError) {
                // Log error if stat fails for a specific file, but continue with others
                console.error(`Error getting stats for '${filePath}': ${statError.message}`);
                // Increment error count? Need access to 'errors' or return status.
            }
        });
    } catch (error) {
        console.error(`Error reading directory '${dir}': ${error.message}`);
        // Increment error count? Need access to 'errors' or return status.
        // Consider how to handle errors from processDir in main loop.
    }
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
                // Directly process files specified as arguments
                processFile(arg);
            } else if (stats.isDirectory()) {
                // Process directories specified as arguments
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
