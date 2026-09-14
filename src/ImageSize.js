/**
 * Reads the pixel dimensions of PNG and JPEG images without decoding them.
 *
 * Works in Node.js and the browser for data URIs and fetchable URLs.
 */

/** @type {Map<string, {width: number, height: number}>} */
const cache = new Map();

/**
 * @param {string} src A data URI or URL of a PNG or JPEG image
 * @returns {Promise<{width: number, height: number}>}
 * @throws {Error} If the image can't be loaded or its format is not supported
 */
export async function imageSize(src) {
    if (cache.has(src)) return cache.get(src);

    let size;
    if (src.startsWith('data:')) {
        const base64 = src.slice(src.indexOf(',') + 1);
        // the header is usually at the very beginning, avoid decoding huge images completely
        size = parseImageSize(decodeBase64(base64.slice(0, 65536))) ?? parseImageSize(decodeBase64(base64));
    } else {
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`Failed to fetch image '${src}': ${response.status} ${response.statusText}`);
        }
        size = parseImageSize(new Uint8Array(await response.arrayBuffer()));
    }

    if (!size) {
        throw new Error(`Could not determine the dimensions of image '${src.substring(0, 100)}'. Only PNG and JPEG are supported.`);
    }

    cache.set(src, size);
    return size;
}

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function decodeBase64(base64) {
    base64 = base64.slice(0, base64.length - (base64.length % 4));
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * @param {Uint8Array} bytes The (beginning of the) image file
 * @returns {{width: number, height: number}|null} null if the format is unknown or the data is truncated
 */
export function parseImageSize(bytes) {
    const u16 = (i) => (bytes[i] << 8) | bytes[i + 1];
    const u32 = (i) => ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;

    // PNG: dimensions are the first thing in the IHDR chunk
    if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return {width: u32(16), height: u32(20)};
    }

    // JPEG: walk the markers until we find a start-of-frame
    if (bytes.length >= 4 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
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
                return {width: u16(i + 7), height: u16(i + 5)};
            }
            i += 2 + u16(i + 2);
        }
    }

    return null;
}
