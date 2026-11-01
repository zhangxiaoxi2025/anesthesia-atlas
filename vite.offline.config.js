import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'build-offline',
    lib: { entry: 'src/main.jsx', name: 'AnesthesiaAtlas', formats: ['iife'], fileName: () => 'app.js' },
    cssCodeSplit: false,
  },
});
