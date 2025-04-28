import * as esbuild from 'esbuild';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const watch = process.argv.includes('--watch');
const serve = process.argv.includes('--serve');

const PINOUTS_DIR = 'public/pinouts';
const INDEX_JSON_PATH = 'public/index.json';

await mkdir('./public/dist', { recursive: true });

const commonOptions = {
    bundle: true,
    sourcemap: true,
    minify: true,
    target: ['esnext'],
    format: 'esm',
    logLevel: 'info',
    loader: {
        '.woff2': 'dataurl',
    },
};

// --- Pinout Index Generation ---

async function findYamlFiles(dir) {
    let yamlFiles = [];
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                yamlFiles = yamlFiles.concat(await findYamlFiles(fullPath));
            } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                yamlFiles.push(fullPath);
            }
        }
    } catch (error) {
        // Ignore errors if the directory doesn't exist yet
        if (error.code !== 'ENOENT') {
            console.error(`Error reading directory ${dir}:`, error);
        }
    }
    return yamlFiles;
}


async function generateIndexJson() {
    console.log('Generating pinout index...');
    const index = {};
    const yamlFiles = await findYamlFiles(PINOUTS_DIR);

    for (const filePath of yamlFiles) {
        try {
            const fileContent = await readFile(filePath, 'utf-8');
            const doc = yaml.load(fileContent);
            const title = doc?.setup?.title;
            if (title) {
                // Make path relative to 'public' directory
                const relativePath = path.relative('public', filePath);
                index[relativePath] = title;
            } else {
                console.warn(`Warning: No setup.title found in ${filePath}`);
            }
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
        }
    }

    try {
        await writeFile(INDEX_JSON_PATH, JSON.stringify(index, null, 2));
        console.log(`Pinout index generated successfully at ${INDEX_JSON_PATH}`);
    } catch (error) {
        console.error(`Error writing index file ${INDEX_JSON_PATH}:`, error);
    }
}

// Esbuild plugin to handle pinout index generation
const pinoutIndexPlugin = {
    name: 'pinout-index-generator',
    setup(build) {
        let isFirstBuild = true;

        // Run once on initial build start
        build.onStart(async () => {
            if (isFirstBuild) {
                await generateIndexJson();
                isFirstBuild = false; // Prevent running again on subsequent rebuild starts
            }
        });

        // Run on end of each build (including rebuilds in watch/serve mode)
        build.onEnd(async (result) => {
            if (result.errors.length === 0 && (watch || serve)) {
                 // Check if relevant files changed? For now, regenerate always on success.
                 // A more sophisticated check could involve tracking YAML file mtimes.
                await generateIndexJson();
            }
        });
    },
};


// --- ESBuild Options ---

const cliOptions = {
    ...commonOptions,
    plugins: [pinoutIndexPlugin], // Add plugin here
    entryPoints: ['./src/cli.js'],
    outfile: './public/dist/cli.js',
    platform: 'node',
    external: ['svgdom', 'fs', 'yaml'],
    banner: {
        js: '#!/usr/bin/env node',
    },
}
const browserOptions = {
    ...commonOptions,
    entryPoints: ['./src/web.js'],
    outfile: './public/dist/web.js',
    platform: 'browser',
    format: 'esm',
    external: ['fs', 'path'], // ignore node modules (we import them dynamically on node only)
    define: {
        global: 'window'
    },
    plugins: [pinoutIndexPlugin], // Add plugin here
};

async function build() {
    try {
        if (serve) {
            // Serve mode with hot reloading
            const browserCtx = await esbuild.context(browserOptions);
            const cliCtx = await esbuild.context(cliOptions);

            // Also watch for changes
            await Promise.all([
                browserCtx.serve({
                    servedir: './public',
                    host: 'localhost',
                    port: 8000,
                }),
                browserCtx.watch(),
                cliCtx.watch()
            ]);

            console.log('Serving on http://localhost:8000');
        } else if (watch) {
            // Watch mode
            const browserCtx = await esbuild.context(browserOptions);
            const cliCtx = await esbuild.context(cliOptions);

            await Promise.all([
                browserCtx.watch(),
                cliCtx.watch()
            ]);

            console.log('Watching for changes...');
        } else {
            // Build once
            await Promise.all([
                esbuild.build(browserOptions),
                esbuild.build(cliOptions)
            ]);

            console.log('All builds completed successfully!');
        }
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();

