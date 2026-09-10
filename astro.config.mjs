import { defineConfig } from 'astro/config';

const configuredSite =
  process.env.IMPACT_SOL_SITE_URL?.trim() ||
  (process.env.CONTEXT === 'production' ? process.env.URL?.trim() : undefined);
const site = configuredSite || 'http://localhost:4321';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
      minify: 'esbuild',
    },
  },
});
