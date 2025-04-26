import {createWindow} from "svgdom";
import {Builder} from "./Builder.js";

function main() {
    const window = createWindow();
    const builder = new Builder();

    const svg = builder.build();
    const el = svg.render(window.document);

    console.log(el.outerHTML);
}

main();
