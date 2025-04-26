import {createWindow} from "svgdom";
import {Builder} from "./Builder.js";
import Yaml from 'yaml';
import { readdir, readFile, stat, writeFile } from 'fs/promises'; // Use fs/promises
import {join} from 'path';
import {ImageEmbed} from "./ImageEmbed.js";

function printHelp() {
    console.log(`Usage: node ${process.argv[1]} [options] <file/dir> ...`);
    console.log("Options:");
    console.log("  -h, --help    Display this help message.");
    console.log("\nGenerates SVG pinout leaves based on given configuration files in yaml or json format.");
}


async function processDir(dir) {
    let errors = 0;
    try {
        const files = await readdir(dir); // Use await readdir
        for (const file of files) {
            const filePath = join(dir, file);
            // Check if it's a file and has the correct extension
            try {
                const stats = await stat(filePath); // Use await stat
                if (stats.isFile() && (file.endsWith('.json') || file.endsWith('.yaml'))) {
                    await processFile(filePath); // Already awaited
                }
            } catch (statError) {
                console.error(`Failed getting stats for '${filePath}': ${statError.message}`);
                errors++;
            }
        }
    } catch (readDirError) {
        console.error(`Failed reading directory '${dir}': ${readDirError.message}`);
        errors++;
    } // Removed extra closing brace here
    return errors;
}

async function processFile(file) {
    const data = await readFile(file, 'utf8'); // Use await readFile

    let setup;
    if (file.endsWith('.yaml')) {
        setup = Yaml.parse(data);
    } else if (file.endsWith('.json')) {
        setup = JSON.parse(data);
    } else {
        throw new Error(`Unsupported file type: ${file}`);
    }

    // inline images
    const embed = new ImageEmbed();
    setup = await embed.embedImages(setup);

    console.log(setup);

    // create the SVGs
    const outputBase = file.replace(/\.(yaml|json)$/, '');
    const builder = new Builder(setup);
    const window = createWindow();

    // Write front SVG
    const frontSvgContent = builder.build().render(window.document).outerHTML;
    await writeFile(outputBase + '.front.svg', frontSvgContent, 'utf8'); // Use await writeFile
    console.info(outputBase + '.front.svg written');

    // Flip and write back SVG
    builder.flip();
    const backSvgContent = builder.build().render(window.document).outerHTML;
    await writeFile(outputBase + '.back.svg', backSvgContent, 'utf8'); // Use await writeFile
    console.info(outputBase + '.back.svg written');
}

async function main() {
    // Basic argument parsing
    const args = process.argv.slice(2); // Skip node executable and script path

    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        process.exit(0); // Exit successfully after showing help
    }

    if (args.length === 0) {
        console.warn("No input files or directories specified.\n");
        printHelp();
        process.exit(0); // not an error, just show help
    }

    let errors = 0;

    for (const arg of args) {
        try {
            const stats = await stat(arg); // Use await stat
            if (stats.isFile()) {
                // Directly process files specified as arguments
                await processFile(arg); // Already awaited
            } else if (stats.isDirectory()) {
                // Process directories specified as arguments
                errors += await processDir(arg);
            } else {
                console.error(`Error: '${arg}' is not a file or directory.`);
                errors++;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`Error: Path not found '${arg}'`);
            } else {
                console.error(`Error processing '${arg}': ${error.message}`);
                console.debug(error.stack);
            }
            errors++;
        }
    }

    process.exit(errors);
}

main();
