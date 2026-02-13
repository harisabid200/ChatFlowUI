import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'ChatFlowUI',
            fileName: 'widget',
            formats: ['iife'], // Single bundle for <script> tag
        },
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'esbuild', // Use esbuild instead of terser (built-in)
        rollupOptions: {
            output: {
                // Single file output
                inlineDynamicImports: true,
            },
        },
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
});
