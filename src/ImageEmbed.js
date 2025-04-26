import {readFileSync} from 'fs';
import {extname} from 'path';

// Basic environment detection
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

/**
 * Handles embedding images as data URIs.
 * Behaves differently in Node.js (fetches/reads directly) vs. Browser (uses a service).
 */
export class ImageEmbed {
    // cloudflare worker for transforming images to data URIs
    static SERVICE = 'https://imgdataurl.splitbrain.workers.dev/';

    /**
     * Embeds an image from a URL or local file path into a data URI.
     * @param {string} source - The URL or local file path of the image.
     * @returns {Promise<string>} A promise that resolves with the data URI.
     * @throws {Error} If embedding fails.
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
     * Node.js implementation: Fetches URL or reads local file.
     * @private
     */
    async embedNode(source) {
        let buffer;
        let mimeType;

        if (source.startsWith('http://') || source.startsWith('https://')) {
            // Fetch remote URL
            console.debug(`Fetching remote image: ${source}`);
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`Failed to fetch image '${source}': ${response.status} ${response.statusText}`);
            }
            buffer = Buffer.from(await response.arrayBuffer());
            // Get MIME type from Content-Type header
            mimeType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
            console.debug(`Fetched image: ${source}, Content-Type: ${mimeType}, Size: ${buffer.length} bytes`);

        } else {
            // Read local file
            console.debug(`Reading local image file: ${source}`);
            buffer = readFileSync(source);
            // Determine MIME type from file extension
            const extension = extname(source).toLowerCase();
            if (extension === '.jpg' || extension === '.jpeg') {
                mimeType = 'image/jpeg';
            } else if (extension === '.png') {
                mimeType = 'image/png';
            } else {
                mimeType = null; // Unsupported type
            }
            console.debug(`Read local file: ${source}, Determined MIME type: ${mimeType}, Size: ${buffer.length} bytes`);
        }

        // Validate MIME type
        if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
            throw new Error(`Unsupported image type for source "${source}". Only JPEG and PNG are supported. Detected type: ${mimeType || 'unknown'}`);
        }

        const base64 = buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64}`;
        console.debug(`Generated data URI for ${source} (length: ${dataUri.length})`);
        return dataUri;
    }

    /**
     * Browser implementation: Calls a backend service.
     * @private
     */
    async embedBrowser(source) {
        // Assumes a backend service exists to handle embedding and CORS.
        // This service should also enforce the JPEG/PNG only limitation.
        const embedServiceUrl = `${ImageEmbed.SERVICE}?url=${encodeURIComponent(source)}`;
        console.debug(`Requesting data URI from service: ${embedServiceUrl}`);
        const response = await fetch(embedServiceUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch data URI from service for '${source}': ${response.status} ${response.statusText}`);
        }
        // Assuming the service returns the data URI as plain text
        const dataUri = await response.text();
        if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
            throw new Error(`Invalid response from embed service for source "${source}". Expected data URI, got: ${dataUri.substring(0, 100)}...`);
        }
        console.debug(`Received data URI for ${source} from service (length: ${dataUri.length})`);
        return dataUri;
    }

    /**
     * Attempts to embed images defined in the setup structure.
     * Modifies the setup object in place, replacing src with data URIs.
     * Logs warnings if embedding fails for a specific image.
     * @param {object} setup - The setup object containing image configurations.
     * @returns {Promise<object>} A promise that resolves with the modified setup object.
     */
    async embedImages(setup) {
        const imageConfigsToProcess = [];
        if (setup?.image?.front?.src) {
            imageConfigsToProcess.push({ config: setup.image.front, originalSrc: setup.image.front.src });
        }
        if (setup?.image?.back?.src) {
            imageConfigsToProcess.push({ config: setup.image.back, originalSrc: setup.image.back.src });
        }

        if (imageConfigsToProcess.length === 0) {
            return setup; // No images to process
        }

        // Create an array of promises for embedding each image
        const embedPromises = imageConfigsToProcess.map(item => {
            console.debug(`Attempting to embed image: ${item.originalSrc}`);
            return this.embed(item.originalSrc);
        });

        // Wait for all embedding attempts to settle (either succeed or fail)
        const results = await Promise.allSettled(embedPromises);

        // Process the results
        results.forEach((result, index) => {
            const item = imageConfigsToProcess[index];
            if (result.status === 'fulfilled') {
                item.config.src = result.value; // Update src with the data URI
                console.debug(`Successfully embedded image: ${item.originalSrc}`);
            } else {
                // Status is 'rejected'
                console.warn(`Failed to embed image "${item.originalSrc}": ${result.reason?.message || result.reason}. Keeping original source.`);
                // Keep original item.config.src (no change needed)
            }
        });

        return setup; // Return the modified setup object
    }
}
