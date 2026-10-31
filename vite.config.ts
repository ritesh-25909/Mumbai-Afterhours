import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// GitHub Pages serves from /<repo>/ unless a custom domain is used; set VITE_BASE accordingly.
export default defineConfig({ base: process.env.VITE_BASE ?? '/', plugins: [react()] });
