import {createWindow} from "svgdom";
import {Builder} from "./Builder.js";
import Yaml from 'yaml';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import {join, dirname} from 'path';
import {ImageEmbed} from "./ImageEmbed.js";

/**
 * Prints the command-line help message to the console.
 */
function printHelp() {
    console.log(`Usage: node ${process.argv[1]} [options] <file/dir> ...`);
    console.log("Options:");
    console.log("  -h, --help    Display this help message.");
    console.log("\nGenerates SVG pinout leaves based on given configuration files in yaml or json format.");
}

/**
 * Processes a directory, finding and processing all `.yaml` and `.json` files within it.
 * Logs errors encountered during directory reading or file processing.
 *
 * @param {string} dir - The path to the directory to process.
 * @returns {Promise<number>} A promise that resolves with the number of errors encountered.
 */
async function processDir(dir) {
    let errors = 0;
    try {
        const files = await readdir(dir);
        for (const file of files) {
            const filePath = join(dir, file);
            try {
                const stats = await stat(filePath);
                if (stats.isFile() && (file.endsWith('.json') || file.endsWith('.yaml'))) {
                    await processFile(filePath);
                }
            } catch (statError) {
                console.error(`Failed getting stats for '${filePath}': ${statError.message}`);
                errors++;
            }
        }
    } catch (readDirError) {
        console.error(`Failed reading directory '${dir}': ${readDirError.message}`);
        errors++;
    }
    return errors;
}

/**
 * Processes a single configuration file (.yaml or .json).
 * Reads the file, parses the content, embeds any specified images,
 * generates front and back SVG diagrams, and writes them to disk.
 *
 * @param {string} file - The path to the configuration file.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 * @throws {Error} If the file type is unsupported, parsing fails, or writing fails.
 */
async function processFile(file) {
    const data = await readFile(file, 'utf8');

    let setup;
    if (file.endsWith('.yaml')) {
        setup = Yaml.parse(data);
    } else if (file.endsWith('.json')) {
        setup = JSON.parse(data);
    } else {
        throw new Error(`Unsupported file type: ${file}`);
    }

    const embed = new ImageEmbed(dirname(file));
    setup = await embed.embedImages(setup);

    const outputBase = file.replace(/\.(yaml|json)$/, '');
    const builder = new Builder(setup);
    const window = createWindow();

    const frontSvgContent = builder.build().render(window.document).outerHTML;
    await writeFile(outputBase + '.front.svg', frontSvgContent, 'utf8');
    console.info(outputBase + '.front.svg written');

    builder.flip();
    const backSvgContent = builder.build().render(window.document).outerHTML;
    await writeFile(outputBase + '.back.svg', backSvgContent, 'utf8');
    console.info(outputBase + '.back.svg written');
}

/**
 * Main entry point for the CLI application.
 * Parses command-line arguments, handles help requests, and orchestrates
 * the processing of specified files and directories.
 * Exits with a status code indicating the number of errors encountered.
 *
 * @returns {Promise<void>}
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        process.exit(0);
    }

    if (args.length === 0) {
        console.warn("No input files or directories specified.\n");
        printHelp();
        process.exit(0);
    }

    let errors = 0;

    for (const arg of args) {
        try {
            const stats = await stat(arg);
            if (stats.isFile()) {
                await processFile(arg);
            } else if (stats.isDirectory()) {
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
