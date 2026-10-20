import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'dist', emptyOutDir: true,
    lib: { entry: 'src/index.js', formats: ['es'], fileName: () => 'passive-income-mgk.js' },
    rollupOptions: { output: { assetFileNames: a => a.names?.[0]?.endsWith('.css') ? 'passive-income-mgk.css' : '[name][extname]' } }
  }
});
