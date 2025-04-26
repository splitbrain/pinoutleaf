import {createWindow} from "svgdom";
import {Builder} from "./Builder.js";
import Yaml from 'yaml';
import {readdirSync, readFileSync, statSync, writeFileSync} from 'fs';
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
    const files = readdirSync(dir);
    for (const file of files) {
        const filePath = join(dir, file);
        // Check if it's a file and has the correct extension
        try {
            const stats = statSync(filePath);
            if (stats.isFile() && (file.endsWith('.json') || file.endsWith('.yaml'))) {
                await processFile(filePath);
            }
        } catch (error) {
            console.error(`Failed processing '${filePath}': ${statError.message}`);
            errors++;
        }
    }
    return errors;
}

async function processFile(file) {
    const data = readFileSync(file, 'utf8');

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
    writeFileSync(outputBase + '.front.svg', builder.build().render(window.document).outerHTML, 'utf8');
    console.info(outputBase + '.front.svg written');
    builder.flip();
    writeFileSync(outputBase + '.back.svg', builder.build().render(window.document).outerHTML, 'utf8');
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
            const stats = statSync(arg);
            if (stats.isFile()) {
                // Directly process files specified as arguments
                await processFile(arg);
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
