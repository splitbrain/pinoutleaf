import * as esbuild from 'esbuild'
import { mkdir } from 'fs/promises';

const watch = process.argv.includes('--watch');
const serve = process.argv.includes('--serve');

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
    }
}

const cliOptions = {
    ...commonOptions,
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
}

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

