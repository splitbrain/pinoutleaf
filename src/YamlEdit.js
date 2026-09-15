import Yaml from 'yaml';

/**
 * Calculates minimal text edits to set an option (like grayscale or opacity) of all images in a YAML configuration
 *
 * Rewriting the whole document would reformat the user's YAML, so only the option's values are
 * replaced, or a line for the option is inserted after the image's src.
 *
 * @param {string} text The YAML source
 * @param {string} option The image option to set
 * @param {boolean|number} newValue The new value
 * @returns {{start: number, end: number, text: string}[]} Edits as character offsets, sorted from last to first
 * @throws {Error} If the YAML can't be parsed
 */
export function imageOptionEdits(text, option, newValue) {
    const doc = Yaml.parseDocument(text);
    if (doc.errors.length) {
        throw doc.errors[0];
    }

    const value = String(newValue);
    const edits = [];

    for (const side of ['front', 'back']) {
        const image = doc.getIn(['image', side], true);
        if (!Yaml.isMap(image) || !image.get('src')) continue;

        const pairs = image.items;
        const existing = pairs.find(pair => pair.key?.value === option);
        if (existing?.value?.range) {
            const [start, end] = existing.value.range;
            edits.push({start, end, text: value});
            continue;
        }

        const src = pairs.find(pair => pair.key?.value === 'src');
        if (image.flow) {
            const end = src.value.range[1];
            edits.push({start: end, end, text: `, ${option}: ${value}`});
        } else {
            const keyStart = src.key.range[0];
            const lineStart = text.lastIndexOf('\n', keyStart - 1) + 1;
            const indent = text.slice(lineStart, keyStart).replace(/\S/g, ' ');
            let lineEnd = text.indexOf('\n', src.value.range[1]);
            if (lineEnd === -1) lineEnd = text.length;
            edits.push({start: lineEnd, end: lineEnd, text: `\n${indent}${option}: ${value}`});
        }
    }

    return edits.sort((a, b) => b.start - a.start);
}

/**
 * @param {string} text The YAML source
 * @param {{start: number, end: number, text: string}[]} edits Edits sorted from last to first
 * @returns {string}
 */
export function applyEdits(text, edits) {
    return edits.reduce((result, edit) => result.slice(0, edit.start) + edit.text + result.slice(edit.end), text);
}
