import {fetchImage, sniffImageType, toDataUri} from "./ImageInfo.js";

/**
 * Browser helpers to download the rendered diagrams as SVG or PNG files
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const COMBINED_GAP = 500; // 5mm between front and back in combined downloads

/** Resolution of PNG downloads */
export const PNG_DPI = 300;
const MAX_PNG_PIXELS = 64000000; // stay well below browser canvas limits

/**
 * Create a file name friendly version of a title
 *
 * @param {string} title
 * @returns {string}
 */
export function slugify(title) {
    const slug = String(title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'pinout';
}

/**
 * Put front and back into one SVG, laid out like the printed page
 *
 * The back is placed below the front and rotated by 180°, so the paper can be folded
 * between them with the back lining up behind the front.
 *
 * @param {SVGSVGElement} front
 * @param {SVGSVGElement} back
 * @returns {SVGSVGElement}
 */
export function combineSvgs(front, back) {
    const f = viewBox(front);
    const b = viewBox(back);
    const width = Math.max(f.width, b.width);
    const height = f.height + COMBINED_GAP + b.height;

    const root = document.createElementNS(SVG_NS, 'svg');
    root.setAttribute('xmlns', SVG_NS);
    root.setAttribute('viewBox', `0 0 ${width} ${height}`);
    root.setAttribute('width', `${width / 100}mm`);
    root.setAttribute('height', `${height / 100}mm`);

    root.appendChild(nested(front, 0, 'front'));

    const backY = f.height + COMBINED_GAP;
    const rotated = document.createElementNS(SVG_NS, 'g');
    rotated.setAttribute('transform', `rotate(180 ${b.width / 2} ${backY + b.height / 2})`);
    rotated.appendChild(nested(back, backY, 'back'));
    root.appendChild(rotated);

    return root;
}

/**
 * @param {SVGSVGElement} svg
 * @returns {Blob}
 */
function svgBlob(svg) {
    return new Blob([new XMLSerializer().serializeToString(svg)], {type: 'image/svg+xml;charset=utf-8'});
}

/**
 * Create a self-contained SVG file, with linked images inlined where possible
 *
 * @param {SVGSVGElement} svg
 * @returns {Promise<{blob: Blob, missingImages: string[]}>}
 */
export async function svgFile(svg) {
    const copy = svg.cloneNode(true);
    const missingImages = await inlineImages(copy);
    return {blob: svgBlob(copy), missingImages};
}

/**
 * Render an SVG diagram into a PNG
 *
 * The PNG carries its resolution, so it prints in real size just like the SVG. Images that are
 * only linked are fetched and inlined first, browsers don't load external resources when
 * rendering SVGs as images.
 *
 * @param {SVGSVGElement} svg
 * @returns {Promise<{blob: Blob, missingImages: string[]}>}
 */
export async function pngFile(svg) {
    const {width, height} = viewBox(svg);
    let dpi = PNG_DPI;
    const pixels = (value) => Math.max(1, Math.round(value / 100 / 25.4 * dpi)); // 1/100mm to pixels
    if (pixels(width) * pixels(height) > MAX_PNG_PIXELS) {
        dpi *= Math.sqrt(MAX_PNG_PIXELS / (pixels(width) * pixels(height)));
    }
    const widthPx = pixels(width);
    const heightPx = pixels(height);

    const copy = svg.cloneNode(true);
    copy.setAttribute('width', widthPx);
    copy.setAttribute('height', heightPx);
    const missingImages = await inlineImages(copy);

    const url = URL.createObjectURL(svgBlob(copy));
    try {
        const image = await loadImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, widthPx, heightPx);
        context.drawImage(image, 0, 0, widthPx, heightPx);

        const png = await new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the PNG')), 'image/png');
        });
        const bytes = withResolution(new Uint8Array(await png.arrayBuffer()), dpi);
        return {blob: new Blob([bytes], {type: 'image/png'}), missingImages};
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Let the browser save a file
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * @param {SVGSVGElement} svg
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function viewBox(svg) {
    const [x, y, width, height] = svg.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number);
    return {x, y, width, height};
}

/**
 * Copy a diagram to be nested into a combined SVG
 *
 * @param {SVGSVGElement} svg
 * @param {number} y Vertical position
 * @param {string} suffix Appended to all ids to keep them unique in the combined document
 * @returns {SVGSVGElement}
 */
function nested(svg, y, suffix) {
    const copy = svg.cloneNode(true);
    const {width, height} = viewBox(svg);
    copy.removeAttribute('xmlns');
    copy.setAttribute('x', 0);
    copy.setAttribute('y', y);
    copy.setAttribute('width', width);
    copy.setAttribute('height', height);

    const ids = new Map();
    copy.querySelectorAll('[id]').forEach(element => {
        const id = `${element.id}-${suffix}`;
        ids.set(element.id, id);
        element.id = id;
    });
    copy.querySelectorAll('*').forEach(element => {
        for (const attribute of [...element.attributes]) {
            const value = attribute.value.replace(/url\(#([^)]+)\)/g, (match, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
            if (value !== attribute.value) element.setAttribute(attribute.name, value);
        }
    });

    return copy;
}

/**
 * Replace linked images with data URIs
 *
 * @param {SVGSVGElement} svg
 * @returns {Promise<string[]>} The URLs of images that could not be inlined
 */
async function inlineImages(svg) {
    const missing = [];
    await Promise.all([...svg.querySelectorAll('image')].map(async image => {
        const href = image.getAttribute('href');
        if (!href || href.startsWith('data:')) return;
        try {
            const bytes = await fetchImage(new URL(href, window.location.href).toString());
            image.setAttribute('href', toDataUri(bytes, sniffImageType(bytes) ?? 'application/octet-stream'));
        } catch (e) {
            missing.push(href);
        }
    }));
    return missing;
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not render the diagram'));
        image.src = url;
    });
}

/**
 * Add a pHYs chunk with the resolution to a PNG
 *
 * @param {Uint8Array} png
 * @param {number} dpi
 * @returns {Uint8Array}
 */
function withResolution(png, dpi) {
    const IHDR_END = 33; // 8 bytes signature + 25 bytes IHDR chunk
    const pixelsPerMeter = Math.round(dpi / 0.0254);

    const chunk = new Uint8Array(21);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, 9); // data length
    chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
    view.setUint32(8, pixelsPerMeter);
    view.setUint32(12, pixelsPerMeter);
    chunk[16] = 1; // unit: meter
    view.setUint32(17, crc32(chunk.subarray(4, 17)));

    const result = new Uint8Array(png.length + chunk.length);
    result.set(png.subarray(0, IHDR_END));
    result.set(chunk, IHDR_END);
    result.set(png.subarray(IHDR_END), IHDR_END + chunk.length);
    return result;
}

let crcTable;

/**
 * @param {Uint8Array} bytes
 * @returns {number}
 */
function crc32(bytes) {
    if (!crcTable) {
        crcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            }
            crcTable[n] = c >>> 0;
        }
    }
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) {
        crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
