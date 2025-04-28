import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github';
import Yaml from 'yaml';
import {Builder} from "./Builder.js";
import { ImageEmbed } from "./ImageEmbed.js";

/**
 * Manages the Ace editor instance, handles YAML parsing,
 * updates the SVG preview, and manages content loading/saving.
 */
export class Editor {
    /** @type {string} The key used for storing YAML content in localStorage. */
    STORAGE_KEY = 'pcb-diagram-yaml';

    /** @type {ace.Ace.Editor} The Ace editor instance. */
    ace;
    /** @type {HTMLElement} The HTML element where the SVG output is rendered. */
    output;

    /**
     * Creates an Editor instance.
     * @param {string|HTMLElement} editor - The ID or HTML element for the Ace editor container.
     * @param {HTMLElement} output - The HTML element to render the SVG output into.
     */
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

        this.initializeEditor();
        this.output.addEventListener('click', this.onDownloadClick);
    }

    /**
     * Asynchronously initializes the editor by loading content
     * and setting up event listeners.
     * @private
     */
    async initializeEditor() {
        await this.loadInitialContent();

        this.ace.session.on('change', this.debounce(this.onChange.bind(this), 300));
        if (this.ace.getValue()) {
            this.onChange(); // Trigger initial processing only if content loaded
        }
    }

    /**
     * Loads the initial content into the editor.
     * It prioritizes loading from a 'load' URL parameter,
     * falling back to localStorage if the parameter is not present.
     * @private
     */
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

                const currentUrlParams = new URLSearchParams(window.location.search);
                currentUrlParams.delete('load');
                const newRelativePathQuery = window.location.pathname + (currentUrlParams.toString() ? '?' + currentUrlParams.toString() : '');
                window.history.replaceState({ path: newRelativePathQuery }, '', newRelativePathQuery);
            } catch (error) {
                console.error('Failed to load content from URL:', loadUrl, error);
                const errorMessage = `# Failed to load content from: ${loadUrl}\n# Error: ${error.message}`;
                this.output.innerHTML = `<div class="error">Failed to load content from <a href="${loadUrl}" target="_blank">${loadUrl}</a>: ${error.message}</div>`;
                this.ace.setValue(errorMessage, -1);
            }
        } else {
            const savedYaml = localStorage.getItem(this.STORAGE_KEY);
            if (savedYaml) {
                this.ace.setValue(savedYaml, -1);
            } else {
                this.ace.setValue("# Hi!\n# New here? Load an existing definition from below!", -1);
            }
        }
    }

    /**
     * Creates a debounced version of a function that delays invoking the function
     * until after `wait` milliseconds have elapsed since the last time the
     * debounced function was invoked.
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @returns {Function} The debounced function.
     * @private
     */
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Handles the 'change' event from the Ace editor.
     * Parses the YAML content, saves valid content to localStorage,
     * triggers the SVG update, and displays parsing errors.
     * @private
     */
    onChange() {
        const yaml = this.ace.getValue();
        try {
            const parsed = Yaml.parse(yaml, {
                prettyErrors: true,
            });
            localStorage.setItem(this.STORAGE_KEY, yaml);
            this.onUpdate(parsed);
            this.clearErrors();
        } catch (e) {
            if (e.linePos) {
                this.showError(
                    e.linePos[0].line - 1, // Ace lines are 0-indexed
                    e.linePos[0].col - 1,
                    e.message,
                    e.name === 'YAMLWarning' ? 'error' : 'warning'
                );
            } else {
                console.error(e);
            }
        }
    }

    /**
     * Called when the YAML content is successfully parsed.
     * Embeds images, builds the front and back SVG representations,
     * and updates the output element.
     * @param {object} setup - The parsed YAML configuration object.
     * @private
     */
    async onUpdate(setup) {
        const embed = new ImageEmbed('pinouts'); // Assuming 'pinouts' is the base path for local images
        setup = await embed.embedImages(setup);

        const builder = new Builder(setup);

        const front = builder.build().render(window.document);
        builder.flip();
        const back = builder.build().render(window.document);

        this.output.innerHTML = '';
        this.output.appendChild(front);
        this.output.appendChild(back);
    }

    /**
     * Handles click events on the output area to trigger SVG download.
     * @param {MouseEvent} e - The click event object.
     * @private
     */
    onDownloadClick(e) {
        const svg = e.target.closest('svg');
        if (!svg) return; // Click was not on an SVG or its child

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

    /**
     * Displays an error or warning annotation in the Ace editor gutter.
     * @param {number} lineNumber - The 0-indexed line number for the annotation.
     * @param {number} column - The 0-indexed column number for the annotation.
     * @param {string} message - The error or warning message text.
     * @param {boolean} isWarning - True if the annotation is a warning, false for an error.
     * @private
     */
    showError(lineNumber, column, message, isWarning) {
        this.ace.session.setAnnotations([{
            row: lineNumber,
            column: column,
            text: message,
            type: isWarning ? 'warning' : 'error',
        }]);
    }

    /**
     * Clears all annotations (errors and warnings) from the Ace editor.
     * @private
     */
    clearErrors() {
        this.ace.session.clearAnnotations();
    }
}
