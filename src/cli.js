import {createWindow} from "svgdom";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {Builder} from "./Builder.js";

function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: $0 [options]')
        .help('h')
        .alias('h', 'help')
        .epilog('copyright 2025')
        .argv;

    // yargs handles the help flag automatically,
    // so we only proceed if help wasn't requested.

    const window = createWindow();
    const builder = new Builder();

    const svg = builder.build();
    const el = svg.render(window.document);

    console.log(el.outerHTML);
}

main();
