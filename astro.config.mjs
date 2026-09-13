import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// Astro does not inject .env values while this config file is being evaluated.
// Load them explicitly so the documented local canonical-origin override works.
const fileEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

const configuredSite =
  process.env.IMPACT_SOL_SITE_URL?.trim() ||
  fileEnv.IMPACT_SOL_SITE_URL?.trim() ||
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
