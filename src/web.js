import {Builder} from "./Builder.js";

(function() {
    const builder = new Builder();

    //builder.flip();
    const svg = builder.build();

    const el = svg.render(window.document);

    window.document.body.appendChild(el);
})();
