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

        // Defer content loading and event binding
        this.initializeEditor();

        // register download handler
        this.output.addEventListener('click', this.onDownloadClick);
    }

    async initializeEditor() {
        // Load content first
        await this.loadInitialContent();

        // Then register change handler and trigger initial processing
        this.ace.session.on('change', this.debounce(this.onChange.bind(this), 300));
        // Check if editor has content before triggering initial processing
        if (this.ace.getValue()) {
             this.onChange(); // Trigger initial processing only if content loaded
        }
    }

    async loadInitialContent() {
        const urlParams = new URLSearchParams(window.location.search);
        const loadUrl = urlParams.get('load');

        if (loadUrl) {
            try {
                const response = await fetch(loadUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const yamlContent = await response.text();
                this.ace.setValue(yamlContent, -1); // -1 moves cursor to the start
                console.log(`Loaded content from: ${loadUrl}`);

                // Remove the 'load' parameter from the URL without reloading
                const currentUrlParams = new URLSearchParams(window.location.search);
                currentUrlParams.delete('load');
                const newRelativePathQuery = window.location.pathname + (currentUrlParams.toString() ? '?' + currentUrlParams.toString() : '');
                window.history.replaceState({ path: newRelativePathQuery }, '', newRelativePathQuery);
            } catch (error) {
                console.error('Failed to load content from URL:', loadUrl, error);
                // Display error to the user in the output div and editor
                const errorMessage = `# Failed to load content from: ${loadUrl}\n# Error: ${error.message}`;
                this.output.innerHTML = `<div class="error">Failed to load content from <a href="${loadUrl}" target="_blank">${loadUrl}</a>: ${error.message}</div>`;
                this.ace.setValue(errorMessage, -1);
            }
        } else {
            // Load initial content from localStorage if no loadUrl
            const savedYaml = localStorage.getItem(this.STORAGE_KEY);
            if (savedYaml) {
                this.ace.setValue(savedYaml, -1);
            }
        }
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
        const embed = new ImageEmbed('pinouts');
        setup = await embed.embedImages(setup);

        const builder = new Builder(setup);

        const front = builder.build().render(window.document);
        builder.flip();
        const back = builder.build().render(window.document);

        this.output.innerHTML = '';
        this.output.appendChild(front);
        this.output.appendChild(back);
    }

    onDownloadClick(e) {
        const svg = e.target.closest('svg');
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svg);
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'pinout.svg';
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
