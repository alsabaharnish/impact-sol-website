import type { APIRoute } from 'astro';
import configSource from '../../admin/config.yml?raw';

export const prerender = true;

/**
 * Decap's `local_backend` flag makes the CMS probe http://localhost:8081 for a
 * developer proxy on every load. In production that host does not exist, the
 * admin CSP blocks the request as a `connect-src` violation, and the editor
 * stalls on "Loading configuration…" before recovering.
 *
 * The flag therefore belongs only to Astro's development server. A static
 * build may use a localhost canonical origin for a remote deploy preview, so
 * the configured site URL is not a reliable development-mode signal.
 */
export const GET: APIRoute = () => {
  const body = import.meta.env.DEV
    ? `# Added by Astro's development server only. Requires a trusted, pinned Decap proxy.\nlocal_backend: true\n\n${configSource}`
    : configSource;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
