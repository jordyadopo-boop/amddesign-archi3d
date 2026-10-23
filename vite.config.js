import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const PARTIALS = resolve(root, 'src/partials');

/** Composition HTML au build : <!-- @include chemin.html --> et jeton {{base}}. */
function htmlComposer() {
  let base = '/';
  const expand = (html, depth = 0) => {
    if (depth > 10) throw new Error('[html-composer] profondeur d’inclusion dépassée');
    html = html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, p) => {
      const file = resolve(PARTIALS, p);
      if (!existsSync(file)) {
        console.warn(`[html-composer] partiel manquant : ${p}`);
        return `<!-- partiel manquant : ${p} -->`;
      }
      return expand(readFileSync(file, 'utf8'), depth + 1);
    });
    return html.replaceAll('{{base}}', base);
  };
  return {
    name: 'html-composer',
    enforce: 'pre',
    configResolved(config) { base = config.base; },
    transformIndexHtml: { order: 'pre', handler: (html) => expand(html) },
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  // BASE_PATH est fixé par le workflow GitHub Pages ("/<dépôt>/" sans domaine, "/" avec un domaine).
  base: process.env.BASE_PATH || '/',
  plugins: [htmlComposer()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),
        projet: resolve(root, 'projet.html'),
        mentions: resolve(root, 'mentions-legales.html'),
        notfound: resolve(root, '404.html'),
      },
    },
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
