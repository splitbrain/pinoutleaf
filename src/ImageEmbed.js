// Basic environment detection
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

/**
 * Handles embedding images as data URIs, supporting both Node.js and browser environments.
 * In Node.js, it fetches remote URLs or reads local files directly.
 * In the browser, it utilizes a remote service to fetch and convert images.
 * Only supports JPEG and PNG image types.
 */
export class ImageEmbed {
    /**
     * The URL of the Cloudflare worker used for transforming images to data URIs in the browser.
     * @type {string}
     * @static
     */
    static SERVICE = 'https://imgdataurl.splitbrain.workers.dev/';

    /**
     * Processes a setup object, attempting to embed images specified in
     * `setup.image.front.src` and `setup.image.back.src`.
     *
     * It modifies the `setup` object *in place*, replacing the `src` properties
     * with data URIs upon successful embedding. If embedding fails for an image,
     * a warning is logged, and the original `src` value is retained.
     *
     * @param {object} setup - The setup configuration object. Expected to potentially have `setup.image.front.src` and `setup.image.back.src`.
     * @returns {Promise<object>} A promise that resolves with the (potentially modified) setup object.
     */
    async embedImages(setup) {
        const imageConfigsToProcess = [];
        // Collect image sources to process, storing references to the config objects
        if (setup?.image?.front?.src) {
            imageConfigsToProcess.push({ config: setup.image.front, originalSrc: setup.image.front.src });
        }
        if (setup?.image?.back?.src) {
            imageConfigsToProcess.push({ config: setup.image.back, originalSrc: setup.image.back.src });
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
                console.warn(`Failed to embed image "${item.originalSrc}": ${result.reason?.message || result.reason}. Keeping original source.`);
            }
        });

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

        if (isNode) {
            return this.embedNode(source);
        } else {
            return this.embedBrowser(source);
        }
    }

    /**
     * Embeds an image in a Node.js environment.
     * Fetches remote URLs or reads local files directly, determines the MIME type,
     * and converts the image data to a base64 data URI.
     * Supports only JPEG and PNG images.
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

        let buffer;
        let mimeType;

        if (source.startsWith('http://') || source.startsWith('https://')) {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`Failed to fetch image '${source}': ${response.status} ${response.statusText}`);
            }
            buffer = Buffer.from(await response.arrayBuffer());
            mimeType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
        } else {
            buffer = await fs.readFile(source);
            const extension = path.extname(source).toLowerCase();
            if (extension === '.jpg' || extension === '.jpeg') {
                mimeType = 'image/jpeg';
            } else if (extension === '.png') {
                mimeType = 'image/png';
            } else {
                mimeType = null; // Will be caught by validation below
            }
        }

        if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
            throw new Error(`Unsupported image type for source "${source}". Only JPEG and PNG are supported. Detected type: ${mimeType || 'unknown'}`);
        }

        const base64 = buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64}`;
        console.debug(`Generated data URI for ${source} (length: ${dataUri.length})`);
        return dataUri;
    }

    /**
     * Embeds an image in a browser environment by calling a remote service.
     * The service is expected to handle fetching/conversion and return the data URI.
     *
     * @param {string} source - The URL (http/https) or potentially a path resolvable by the service.
     * @returns {Promise<string>} A promise that resolves with the image data URI.
     * @throws {Error} If the service call fails or returns an invalid response.
     * @private
     */
    async embedBrowser(source) {
        const embedServiceUrl = `${ImageEmbed.SERVICE}?url=${encodeURIComponent(source)}`;
        const response = await fetch(embedServiceUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch data URI from service for '${source}': ${response.status} ${response.statusText}`);
        }

        const dataUri = await response.text();
        // Basic validation that the response looks like a data URI
        if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
            throw new Error(`Invalid response from embed service for source "${source}". Expected data URI, got: ${dataUri.substring(0, 100)}...`);
        }
        console.debug(`Received data URI for ${source} (length: ${dataUri.length})`);
        return dataUri;
    }

}
