/**
 * Detects image types and reads image dimensions without decoding the images.
 *
 * Works in Node.js and the browser. Supports PNG, JPEG, GIF, WebP, AVIF, BMP and SVG.
 */

/** Mime types of all supported image formats */
export const SUPPORTED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/svg+xml',
];

/** Maximum time to wait for a remote image */
export const FETCH_TIMEOUT = 30000;

/** @type {Map<string, {width: number, height: number}>} */
const cache = new Map();

/**
 * Fetch an image from a URL
 *
 * @param {string} url
 * @returns {Promise<Uint8Array>}
 * @throws {Error} On network errors and timeouts, or with a `status` property when the server responds with an HTTP error
 */
export async function fetchImage(url) {
    let response;
    try {
        response = await fetch(url, {signal: AbortSignal.timeout(FETCH_TIMEOUT)});
    } catch (e) {
        if (e.name === 'TimeoutError') {
            throw new Error(`Timed out after ${FETCH_TIMEOUT / 1000}s fetching image '${url}'`);
        }
        throw new Error(`Failed to fetch image '${url}': ${e.cause?.message ?? e.message}`);
    }
    if (!response.ok) {
        const error = new Error(`Failed to fetch image '${url}': HTTP ${response.status} ${response.statusText}`.trim());
        error.status = response.status;
        throw error;
    }
    return new Uint8Array(await response.arrayBuffer());
}

/**
 * Get the dimensions of an image
 *
 * For SVGs this is the size of the viewBox, or its width and height in pixels if there is no viewBox.
 *
 * @param {string} src A data URI or URL of an image
 * @returns {Promise<{width: number, height: number}>}
 * @throws {Error} If the image can't be loaded or its format is not supported
 */
export async function imageSize(src) {
    if (cache.has(src)) return cache.get(src);

    let size;
    if (src.startsWith('data:')) {
        const {bytes, partial} = dataUriBytes(src, 65536);
        // the header is usually at the very beginning, avoid decoding huge images completely
        size = parseImageSize(bytes) ?? (partial ? parseImageSize(dataUriBytes(src).bytes) : null);
    } else {
        try {
            size = parseImageSize(await fetchImage(src));
        } catch (e) {
            // in the browser, images from servers without CORS headers can still be displayed and measured
            if (typeof globalThis.Image !== 'function' || e.status) throw e;
            size = await browserImageSize(src);
        }
    }

    if (!size) {
        throw new Error(`Could not determine the dimensions of image '${src.substring(0, 100)}'. Supported types: ${SUPPORTED_TYPES.join(', ')}`);
    }

    cache.set(src, size);
    return size;
}

/**
 * Detect the image type from the file contents
 *
 * @param {Uint8Array} bytes The (beginning of the) image file
 * @returns {string|null} The mime type or null if it's not a supported image
 */
export function sniffImageType(bytes) {
    const ascii = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));

    if (bytes[0] === 0x89 && ascii(1, 3) === 'PNG') return 'image/png';
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    if (ascii(0, 4) === 'GIF8') return 'image/gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
    if (ascii(0, 2) === 'BM' && bytes.length > 26) return 'image/bmp';
    if (ascii(4, 4) === 'ftyp') {
        const boxSize = Math.min(u32be(bytes, 0), bytes.length);
        for (let i = 8; i + 4 <= boxSize; i += 4) {
            if (['avif', 'avis'].includes(ascii(i, 4))) return 'image/avif';
        }
        return null;
    }

    const text = new TextDecoder().decode(bytes.subarray(0, 4096)).replace(/^\uFEFF/, '').trimStart();
    if (text.startsWith('<') && /<svg[\s>]|<!DOCTYPE\s+svg/i.test(text)) return 'image/svg+xml';

    return null;
}

/**
 * @param {Uint8Array} bytes The (beginning of the) image file
 * @returns {{width: number, height: number}|null} null if the format is unknown or the data is truncated
 */
export function parseImageSize(bytes) {
    try {
        const size = readSize(bytes);
        return size && size.width > 0 && size.height > 0 ? size : null;
    } catch (e) {
        return null; // truncated data
    }
}

/**
 * Convert image data into a base64 data URI
 *
 * @param {Uint8Array} bytes
 * @param {string} mimeType
 * @returns {string}
 */
export function toDataUri(bytes, mimeType) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * @param {Uint8Array} bytes
 * @returns {{width: number, height: number}|null}
 */
function readSize(bytes) {
    const u16le = (i) => bytes[i] | (bytes[i + 1] << 8);
    const u24le = (i) => bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);
    const u32le = (i) => u24le(i) + bytes[i + 3] * 0x1000000;
    const i32le = (i) => u32le(i) | 0;
    const ascii = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
    const check = (end) => {
        if (end > bytes.length) throw new Error('truncated');
    };

    switch (sniffImageType(bytes)) {
        case 'image/png':
            check(24);
            return {width: u32be(bytes, 16), height: u32be(bytes, 20)};

        case 'image/gif':
            check(10);
            return {width: u16le(6), height: u16le(8)};

        case 'image/bmp':
            if (u32le(14) === 12) return {width: u16le(18), height: u16le(20)}; // OS/2 header
            return {width: i32le(18), height: Math.abs(i32le(22))}; // negative height means top-down

        case 'image/webp':
            check(30);
            switch (ascii(12, 4)) {
                case 'VP8 ': // lossy
                    return {width: u16le(26) & 0x3FFF, height: u16le(28) & 0x3FFF};
                case 'VP8L': { // lossless
                    const bits = u32le(21);
                    return {width: (bits & 0x3FFF) + 1, height: ((bits >> 14) & 0x3FFF) + 1};
                }
                case 'VP8X': // extended
                    return {width: u24le(24) + 1, height: u24le(27) + 1};
            }
            return null;

        case 'image/avif':
            // the image spatial extents property holds the dimensions
            for (let i = 4; i + 16 <= bytes.length; i++) {
                if (bytes[i] === 0x69 && ascii(i, 4) === 'ispe') {
                    return {width: u32be(bytes, i + 8), height: u32be(bytes, i + 12)};
                }
            }
            throw new Error('truncated');

        case 'image/jpeg': {
            let i = 2;
            while (i + 9 < bytes.length) {
                if (bytes[i] !== 0xFF) {
                    i++;
                    continue;
                }
                const marker = bytes[i + 1];
                if (marker === 0xFF) {
                    i++; // fill byte
                    continue;
                }
                if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
                    i += 2; // markers without a payload
                    continue;
                }
                if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
                    return {width: u16be(bytes, i + 7), height: u16be(bytes, i + 5)};
                }
                i += 2 + u16be(bytes, i + 2);
            }
            throw new Error('truncated');
        }

        case 'image/svg+xml':
            return svgSize(new TextDecoder().decode(bytes));
    }

    return null;
}

/**
 * @param {string} svg The SVG source
 * @returns {{width: number, height: number}|null}
 */
function svgSize(svg) {
    const tag = svg.match(/<svg\b[^>]*>/i)?.[0];
    if (!tag) throw new Error('truncated');

    const attribute = (name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];

    const viewBox = attribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
    if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
        return {width: viewBox[2], height: viewBox[3]};
    }

    const width = cssPixels(attribute('width'));
    const height = cssPixels(attribute('height'));
    return width && height ? {width, height} : null;
}

/**
 * @param {string|undefined} length An absolute SVG length like "25.4mm"
 * @returns {number|null} The length in CSS pixels, null for relative or invalid lengths
 */
function cssPixels(length) {
    const units = {'': 1, px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pt: 96 / 72, pc: 16};
    const match = length?.trim().match(/^([\d.]+(?:e[+-]?\d+)?)\s*([a-z]*)$/i);
    if (!match || !(match[2].toLowerCase() in units)) return null;
    return parseFloat(match[1]) * units[match[2].toLowerCase()];
}

/**
 * Decode the contents of a data URI
 *
 * @param {string} src The data URI
 * @param {number} [limit] Only decode about this many characters
 * @returns {{bytes: Uint8Array, partial: boolean}}
 */
function dataUriBytes(src, limit = Infinity) {
    const comma = src.indexOf(',');
    const isBase64 = /;base64$/i.test(src.slice(0, comma));
    let payload = src.slice(comma + 1);
    const partial = payload.length > limit;

    if (!isBase64) {
        try {
            payload = decodeURIComponent(payload);
        } catch (e) {
            // not percent encoded
        }
        return {bytes: new TextEncoder().encode(payload), partial: false};
    }

    if (partial) payload = payload.slice(0, limit - (limit % 4));
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return {bytes, partial};
}

/**
 * Measure an image by letting the browser load it
 *
 * @param {string} src
 * @returns {Promise<{width: number, height: number}|null>}
 */
function browserImageSize(src) {
    return new Promise((resolve, reject) => {
        const img = new globalThis.Image();
        img.onload = () => resolve(img.naturalWidth ? {width: img.naturalWidth, height: img.naturalHeight} : null);
        img.onerror = () => reject(new Error(`Failed to load image '${src}'`));
        img.src = src;
    });
}

function u16be(bytes, i) {
    if (i + 2 > bytes.length) throw new Error('truncated');
    return (bytes[i] << 8) | bytes[i + 1];
}

function u32be(bytes, i) {
    if (i + 4 > bytes.length) throw new Error('truncated');
    return ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
}
