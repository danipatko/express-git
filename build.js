const start = Date.now();
require('esbuild')
    .build({
        // bundle: true,
        target: 'esnext',
        format: 'cjs',
        outfile: './dist/bundle.js',
        // external: ['header-stack'],
        platform: 'node',
        tsconfig: 'tsconfig.json',
        entryPoints: ['./src/index.ts'],
    })
    .catch((e) => console.error(e))
    .finally(() => console.log(`Done in ${Date.now() - start}ms\n`));
