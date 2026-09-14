import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github';
import Yaml from 'yaml';
import {Builder} from "./Builder.js";
import { ImageEmbed } from "./ImageEmbed.js";
import {imageOptionEdits} from "./YamlEdit.js";

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
    /** @type {HTMLInputElement|null} Checkbox enabling the coordinate picker. */
    pickToggle;
    /** @type {HTMLElement|null} Element showing the coordinates under the mouse. */
    pickStatus;
    /** @type {HTMLInputElement|null} Checkbox switching the PCB images between grayscale and color. */
    grayscaleToggle;
    /** @type {HTMLInputElement|null} Range input for the opacity of the PCB images in percent. */
    opacitySlider;
    /** @type {HTMLElement|null} Element showing the current opacity. */
    opacityValue;

    /**
     * Creates an Editor instance.
     * @param {string|HTMLElement} editor - The ID or HTML element for the Ace editor container.
     * @param {HTMLElement} output - The HTML element to render the SVG output into.
     * @param {object} [controls] - Optional UI controls.
     * @param {HTMLInputElement|null} [controls.pickToggle] - Checkbox to switch clicks from downloading to picking image coordinates.
     * @param {HTMLElement|null} [controls.pickStatus] - Element to show the image coordinates under the mouse in.
     * @param {HTMLInputElement|null} [controls.grayscaleToggle] - Checkbox to switch the images between grayscale and color.
     * @param {HTMLInputElement|null} [controls.opacitySlider] - Range input (0-100) for the image opacity.
     * @param {HTMLElement|null} [controls.opacityValue] - Element to show the current opacity in.
     */
    constructor(editor, output, {
        pickToggle = null,
        pickStatus = null,
        grayscaleToggle = null,
        opacitySlider = null,
        opacityValue = null,
    } = {}) {
        this.output = output;
        this.pickToggle = pickToggle;
        this.pickStatus = pickStatus;
        this.grayscaleToggle = grayscaleToggle;
        this.opacitySlider = opacitySlider;
        this.opacityValue = opacityValue;

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
        this.output.addEventListener('click', this.onOutputClick.bind(this));
        this.output.addEventListener('mousemove', this.onOutputMove.bind(this));
        this.pickToggle?.addEventListener('change', () => {
            this.output.classList.toggle('picking', this.pickToggle.checked);
            if (this.pickStatus) this.pickStatus.textContent = '';
        });
        this.grayscaleToggle?.addEventListener('change', this.onGrayscaleToggle.bind(this));
        this.opacitySlider?.addEventListener('input', this.onOpacityInput.bind(this));
        this.opacitySlider?.addEventListener('change', this.onOpacityChange.bind(this));
    }

    /**
     * Asynchronously initializes the editor by loading content
     * and setting up event listeners.
     * @private
     */
    async initializeEditor() {
        await this.loadInitialContent();
        this.ace.session.getUndoManager().reset(); // undo should not remove the loaded content

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
            this.updateImageControls(parsed);
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

        let builder;
        try {
            builder = new Builder(setup);
        } catch (e) {
            this.output.innerHTML = '';
            const error = document.createElement('div');
            error.className = 'error';
            error.textContent = e.message;
            this.output.appendChild(error);
            return;
        }

        const front = builder.build().render(window.document);
        builder.flip();
        const back = builder.build().render(window.document);

        this.output.innerHTML = '';
        this.output.appendChild(front);
        this.output.appendChild(back);
    }

    /**
     * Reflects the image settings of the configuration in the image controls
     *
     * The grayscale toggle is checked when all images are grayscale (the default) and indeterminate
     * when front and back differ. All controls are disabled when there are no images.
     *
     * @param {object} setup - The parsed YAML configuration object.
     * @private
     */
    updateImageControls(setup) {
        const images = ['front', 'back']
            .map(side => setup?.image?.[side])
            .filter(image => image?.src);

        if (this.grayscaleToggle) {
            const grayscale = images.map(image => Boolean(image.grayscale ?? true));
            this.grayscaleToggle.disabled = images.length === 0;
            this.grayscaleToggle.checked = grayscale.length > 0 && grayscale.every(Boolean);
            this.grayscaleToggle.indeterminate = grayscale.some(Boolean) && !grayscale.every(Boolean);
        }

        if (this.opacitySlider) {
            const opacities = [...new Set(images.map(image => Math.round(Number(image.opacity ?? 0.5) * 100)))];
            this.opacitySlider.disabled = images.length === 0;
            this.opacitySlider.value = opacities.length ? opacities[0] : 50;
            this.showOpacity(opacities.length ? opacities.map(o => `${o}%`).join(' / ') : '');
        }
    }

    /**
     * @param {string} text
     * @private
     */
    showOpacity(text) {
        if (this.opacityValue) this.opacityValue.textContent = text;
    }

    /**
     * Sets the grayscale option of all images in the YAML
     * @private
     */
    onGrayscaleToggle() {
        if (!this.setImageOption('grayscale', this.grayscaleToggle.checked)) {
            this.grayscaleToggle.checked = !this.grayscaleToggle.checked; // can't edit broken YAML, undo the click
        }
    }

    /**
     * Previews the opacity while the slider is dragged, without touching the YAML
     * @private
     */
    onOpacityInput() {
        const opacity = this.opacitySlider.value / 100;
        this.output.querySelectorAll('svg image').forEach(image => image.setAttribute('opacity', opacity));
        this.showOpacity(`${this.opacitySlider.value}%`);
    }

    /**
     * Sets the opacity option of all images in the YAML once the slider is released
     * @private
     */
    onOpacityChange() {
        this.setImageOption('opacity', this.opacitySlider.value / 100);
    }

    /**
     * Sets an option of all images in the YAML
     *
     * Only the affected lines are changed, so formatting, comments and undo history are kept.
     *
     * @param {string} option
     * @param {boolean|number} value
     * @returns {boolean} false if the YAML could not be edited
     * @private
     */
    setImageOption(option, value) {
        const session = this.ace.session;
        let edits;
        try {
            edits = imageOptionEdits(session.getValue(), option, value);
        } catch (e) {
            return false;
        }

        for (const edit of edits) {
            const start = session.doc.indexToPosition(edit.start);
            const end = session.doc.indexToPosition(edit.end);
            session.replace({start, end}, edit.text);
        }
        return true;
    }

    /**
     * Whether clicks on the output pick image coordinates instead of downloading
     * @returns {boolean}
     * @private
     */
    isPicking() {
        return !!this.pickToggle?.checked;
    }

    /**
     * Converts the mouse position into pixel coordinates of the PCB photo below it.
     *
     * Only works for layouts using headers, where the photo is rendered in its pixel coordinates.
     * Coordinates are rounded to about one screen pixel, so images with small units (like
     * SVGs using millimeters) still get precise coordinates.
     *
     * @param {MouseEvent} e
     * @returns {{x: number, y: number, side: string}|null}
     * @private
     */
    photoCoordinates(e) {
        const photo = e.target.closest('svg')?.querySelector('.pcb-photo');
        const matrix = photo?.getScreenCTM();
        if (!matrix) return null;

        const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
        const unitsPerScreenPixel = 1 / Math.hypot(matrix.a, matrix.b);
        const decimals = Math.min(3, Math.max(0, Math.ceil(-Math.log10(unitsPerScreenPixel))));
        const round = (value) => Number(value.toFixed(decimals));
        return {
            x: round(point.x),
            y: round(point.y),
            side: photo.getAttribute('data-side'),
        };
    }

    /**
     * Shows the photo coordinates under the mouse while picking
     * @param {MouseEvent} e
     * @private
     */
    onOutputMove(e) {
        if (!this.isPicking() || !this.pickStatus) return;
        const coords = this.photoCoordinates(e);
        this.pickStatus.textContent = coords ? `${coords.side} image: [${coords.x}, ${coords.y}]` : '';
    }

    /**
     * Inserts the clicked photo coordinates at the editor cursor while picking, downloads the SVG otherwise
     * @param {MouseEvent} e
     * @private
     */
    onOutputClick(e) {
        if (!this.isPicking()) {
            this.onDownloadClick(e);
            return;
        }
        const coords = this.photoCoordinates(e);
        if (!coords) return;
        this.ace.insert(`[ ${coords.x}, ${coords.y} ]`);
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
