// Config alternativa apenas para gerar um único arquivo .html autocontido
// (útil para pré-visualizar antes de hospedar). O build normal (vite.config.js)
// continua sendo o usado para o deploy real no Firebase Hosting.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'preview-dist',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
})
