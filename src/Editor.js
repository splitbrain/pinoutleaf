import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github';
import Yaml from 'yaml';
import {Builder} from "./Builder.js";
import {ImageEmbed} from "./ImageEmbed.js";

export class Editor {

    STORAGE_KEY = 'pcb-diagram-yaml';

    constructor(editor, output) {
        this.output = output;

        this.ace = ace.edit(editor);
        this.ace.setTheme("ace/theme/github");
        this.ace.session.setMode("ace/mode/yaml");
        this.ace.setOptions({
            fontSize: "12pt",
            wrap: true,
            showFoldWidgets: true,
            showGutter: true,
            showPrintMargin: false,
            highlightActiveLine: true,
            highlightSelectedWord: false,
            useWrapMode: true,
            tabSize: 2
        });

        // Load initial content from localStorage
        const savedYaml = localStorage.getItem(this.STORAGE_KEY);
        if (savedYaml) {
            this.ace.setValue(savedYaml, -1); // -1 moves cursor to the start
        } else {
            // Optional: Set a default value if nothing is saved
            // this.ace.setValue("title: My PCB\nwidth: 5\nheight: 5\npins:\n  left: []\n  right: []\n  top: []\n  bottom: []", -1);
        }

        this.ace.session.on('change', this.debounce(this.onChange.bind(this), 300));
        this.onChange(); // Trigger initial processing
    }

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    onChange() {
        const yaml = this.ace.getValue();
        try {
            const parsed = Yaml.parse(yaml, {
                prettyErrors: true,
            });
            // Save valid YAML to localStorage
            localStorage.setItem(this.STORAGE_KEY, yaml);
            this.onUpdate(parsed);
            this.clearErrors();
        } catch (e) {
            // Don't save invalid YAML
            if (e.linePos) {
                this.showError(
                    e.linePos[0].line - 1,
                    e.linePos[0].col - 1,
                    e.message,
                    e.name === 'YAMLWarning' ? 'error' : 'warning'
                );
            } else {
                console.error(e);
            }
        }
    }

    async onUpdate(setup) {
        const embed = new ImageEmbed();
        setup = await embed.embedImages(setup);

        const builder = new Builder(setup);

        const front = builder.build().render(window.document);
        builder.flip();
        const back = builder.build().render(window.document);

        this.output.innerHTML = '';
        this.output.appendChild(front);
        this.output.appendChild(back);
    }

    showError(lineNumber, column, message, isWarning) {
        console.error('ace', lineNumber, column, message);

        this.ace.session.setAnnotations([{
            row: lineNumber,
            column: column,
            text: message,
            type: isWarning ? 'warning' : 'error',
        }]);
    }

    clearErrors() {
        this.ace.session.clearAnnotations();
    }
}
