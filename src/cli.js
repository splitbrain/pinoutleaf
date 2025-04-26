import {createWindow} from "svgdom";
import {Builder} from "./Builder.js";

function printHelp() {
    console.log(`Usage: node ${process.argv[1]} [options]`);
    console.log("Options:");
    console.log("  -h, --help    Display this help message.");
    console.log("\nGenerates an SVG representation based on configuration.");
    console.log("copyright 2025");
}

function main() {
    // Basic argument parsing
    const args = process.argv.slice(2); // Skip node executable and script path

    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        process.exit(0); // Exit successfully after showing help
    }

    // Proceed with SVG generation if no help flag
    const window = createWindow();
    const builder = new Builder();

    const svg = builder.build();
    const el = svg.render(window.document);

    console.log(el.outerHTML);
}

main();
