import {FETCH_TIMEOUT, fetchImage, imageSize, sniffImageType, SUPPORTED_TYPES, toDataUri} from "./ImageInfo.js";

// Basic environment detection
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

/**
 * Handles embedding images as data URIs, supporting both Node.js and browser environments.
 * In Node.js, it fetches remote URLs or reads local files directly.
 * In the browser, it fetches images directly and falls back to a remote service for servers without CORS headers.
 * Supports PNG, JPEG, GIF, WebP, AVIF, BMP and SVG images (the remote service only handles PNG and JPEG).
 */
export class ImageEmbed {
    /**
     * The URL of the Cloudflare worker used for transforming images to data URIs in the browser.
     * @type {string}
     * @static
     */
    static SERVICE = 'https://imgdataurl.splitbrain.workers.dev/';

    /**
     * @param {string} base The relative base to look for local images in
     */
    constructor(base = '') {
        this.base = base;

        /**
         * Problems with the images of the last embedImages() call
         *
         * `linked` is true when the image could not be embedded, but can still be shown from its original URL.
         *
         * @type {{side: string, src: string, message: string, linked: boolean}[]}
         */
        this.problems = [];
    }

    /**
     * Processes a setup object, attempting to embed images specified in
     * `setup.image.front.src` and `setup.image.back.src`.
     *
     * It modifies the `setup` object *in place*, replacing the `src` properties
     * with data URIs upon successful embedding. If embedding fails for an image,
     * a warning is logged, and the original `src` value is retained.
     *
     * The image dimensions are stored as `naturalWidth` and `naturalHeight`. Images that can't be
     * loaded at all get an `error` message instead. See `problems` for a summary.
     *
     * @param {object} setup - The setup configuration object. Expected to potentially have `setup.image.front.src` and `setup.image.back.src`.
     * @returns {Promise<object>} A promise that resolves with the (potentially modified) setup object.
     */
    async embedImages(setup) {
        this.problems = [];
        const imageConfigsToProcess = [];
        // Collect image sources to process, storing references to the config objects
        if (setup?.image?.front?.src) {
            imageConfigsToProcess.push({side: 'front', config: setup.image.front, originalSrc: setup.image.front.src});
        }
        if (setup?.image?.back?.src) {
            imageConfigsToProcess.push({side: 'back', config: setup.image.back, originalSrc: setup.image.back.src});
        }

        if (imageConfigsToProcess.length === 0) {
            return setup; // No images defined in the setup
        }

        // Create embedding promises for all identified image sources
        const embedPromises = imageConfigsToProcess.map(item => {
            return this.embed(item.originalSrc);
        });

        // Wait for all embedding attempts to complete (success or failure)
        const results = await Promise.allSettled(embedPromises);

        // Update the setup object based on the results
        results.forEach((result, index) => {
            const item = imageConfigsToProcess[index];
            if (result.status === 'fulfilled') {
                // Embed successful: Update the src in the original setup object
                item.config.src = result.value;
            } else {
                // Embed failed: Log a warning, leave the original src untouched
                item.error = result.reason?.message || String(result.reason);
                console.warn(`Failed to embed image "${item.originalSrc}": ${item.error}. Keeping original source.`);
            }
        });

        // Photo layouts place everything in image pixel coordinates and need to know the image dimensions
        await Promise.all(imageConfigsToProcess.map(async (item) => {
            const {side, config, originalSrc} = item;
            const problem = (message, linked) => this.problems.push({side, src: originalSrc, message, linked});

            // in Node.js there is no other way to load the image, don't try again
            if (item.error && isNode) {
                config.error = item.error;
                problem(item.error, false);
                return;
            }

            try {
                const {width, height} = await imageSize(config.src);
                config.naturalWidth = width;
                config.naturalHeight = height;
                if (item.error) problem(item.error, true); // shown from its URL, but not embedded
            } catch (e) {
                console.warn(e.message);
                config.error = item.error ?? e.message;
                problem(config.error, false);
            }
        }));

        return setup; // Return the modified setup object
    }

    /**
     * Embeds an image from a URL or local file path into a data URI.
     * Determines the environment (Node.js or browser) and calls the appropriate embedding method.
     *
     * @param {string} source - The URL (http/https) or local file path of the image.
     * @returns {Promise<string>} A promise that resolves with the image data URI (e.g., "data:image/png;base64,...").
     * @throws {Error} If the source is empty, fetching/reading fails, or the image type is unsupported.
     */
    async embed(source) {
        if (!source) {
            throw new Error("Image source cannot be empty.");
        }
        if (source.startsWith('data:')) {
            return source; // already embedded
        }

        if (isNode) {
            return this.embedNode(source);
        } else {
            return this.embedBrowser(source);
        }
    }

    /**
     * Embeds an image in a Node.js environment.
     * Fetches remote URLs or reads local files directly, detects the image type
     * from its contents and converts the image data to a base64 data URI.
     *
     * @param {string} source - The URL (http/https) or local file path of the image.
     * @returns {Promise<string>} A promise that resolves with the image data URI.
     * @throws {Error} If fetching/reading fails or the image type is unsupported.
     * @private
     */
    async embedNode(source) {
        // dynamic import to avoid issues in browser environments
        const fs = await import('fs/promises');
        const path = await import('path');

        let bytes;
        if (source.startsWith('http://') || source.startsWith('https://')) {
            bytes = await this.fetchBytes(source);
        } else {
            source = this.base ? path.join(this.base, source) : source;
            bytes = new Uint8Array(await fs.readFile(source));
        }

        const dataUri = this.toImageDataUri(bytes, source);
        console.debug(`Generated data URI for ${source} (length: ${dataUri.length})`);
        return dataUri;
    }

    /**
     * Embeds an image in a browser environment.
     * The image is fetched directly. If that fails (usually because the server does not send
     * CORS headers), a remote service is used to fetch and convert the image instead.
     *
     * @param {string} source - The URL (http/https) or a path relative to the current page.
     * @returns {Promise<string>} A promise that resolves with the image data URI.
     * @throws {Error} If the image can't be fetched, is unsupported or the service call fails.
     * @private
     */
    async embedBrowser(source) {

        // this is not a URL, so we assume it to be one of our own, locally served files
        if (!source.match(/^https?:\/\//)) {
            if (this.base) {
                source = `${this.base}/${source}`;
            }
            source = new URL(source, window.location.href).toString();
            if (source.match(/^http:\/\/(localhost|127.0.0.1)/)) return source; // no local embeds
        }

        let bytes;
        try {
            bytes = await this.fetchBytes(source);
        } catch (e) {
            if (e.status) throw e; // the server answered, the service won't get a better response
            console.debug(`Direct fetch of '${source}' failed, using embed service: ${e.message}`);
            return this.embedService(source);
        }

        const dataUri = this.toImageDataUri(bytes, source);
        console.debug(`Generated data URI for ${source} (length: ${dataUri.length})`);
        return dataUri;
    }

    /**
     * Embeds an image by calling a remote service that fetches it server side.
     * This works for servers that don't send CORS headers, but only for PNG and JPEG images.
     *
     * @param {string} source - The URL of the image.
     * @returns {Promise<string>} A promise that resolves with the image data URI.
     * @throws {Error} If the service call fails or returns an invalid response.
     * @private
     */
    async embedService(source) {
        const embedServiceUrl = `${ImageEmbed.SERVICE}?url=${encodeURIComponent(source)}`;
        const response = await fetch(embedServiceUrl, {signal: AbortSignal.timeout(FETCH_TIMEOUT)});
        if (!response.ok) {
            const reason = (await response.text()).trim() || `HTTP ${response.status}`;
            throw new Error(`Could not fetch '${source}' directly (the server is unreachable or does not allow it) and the embed service failed: ${reason}`);
        }

        const dataUri = await response.text();
        // Basic validation that the response looks like a data URI
        if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
            throw new Error(`Invalid response from embed service for source "${source}". Expected data URI, got: ${dataUri.substring(0, 100)}...`);
        }
        console.debug(`Received data URI for ${source} (length: ${dataUri.length})`);
        return dataUri;
    }

    /**
     * @param {string} url
     * @returns {Promise<Uint8Array>}
     * @private
     */
    async fetchBytes(url) {
        return fetchImage(url);
    }

    /**
     * @param {Uint8Array} bytes The image file contents
     * @param {string} source The image source for error messages
     * @returns {string} The data URI
     * @throws {Error} If the image type is unsupported
     * @private
     */
    toImageDataUri(bytes, source) {
        const mimeType = sniffImageType(bytes);
        if (!mimeType) {
            throw new Error(`Unsupported image type for source "${source}". Supported types: ${SUPPORTED_TYPES.join(', ')}`);
        }
        return toDataUri(bytes, mimeType);
    }

}
