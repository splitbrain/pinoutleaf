import * as esbuild from 'esbuild'
import { mkdir } from 'fs/promises';

const watch = process.argv.includes('--watch');

await mkdir('./dist', { recursive: true });

const commonOptions = {
    bundle: true,
    sourcemap: true,
    minify: true,
    target: ['esnext'],
    format: 'esm',
}

const cliOptions = {
    ...commonOptions,
    entryPoints: ['./src/cli.js'],
    outfile: './dist/cli.js',
    platform: 'node',
    external: ['svgdom'],
    banner: {
        js: '#!/usr/bin/env node',
    },
}

async function build() {
    try {
        if (watch) {
            // Watch mode
            //const browserCtx = await esbuild.context(browserOptions);
            const cliCtx = await esbuild.context(cliOptions);

            await Promise.all([
                //browserCtx.watch(),
                cliCtx.watch()
            ]);

            console.log('Watching for changes...');
        } else {
            // Build once

            //esbuild.build(browserOptions),
            esbuild.build(cliOptions);


            console.log('All builds completed successfully!');
        }
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();

