import type { APIRoute } from 'astro';
import configSource from '../../admin/config.yml?raw';

export const prerender = true;

/**
 * Decap's `local_backend` flag makes the CMS probe http://localhost:8081 for a
 * developer proxy on every load. In production that host does not exist, the
 * admin CSP blocks the request as a `connect-src` violation, and the editor
 * stalls on "Loading configuration…" before recovering.
 *
 * The flag therefore belongs only to local origins, so it is added here rather
 * than committed into the config the CMS ships.
 */
export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const isProduction = origin.protocol === 'https:' && !origin.hostname.endsWith('.example');
  const body = isProduction
    ? configSource
    : `# Added for local origins only. Requires a trusted, pinned Decap proxy.\nlocal_backend: true\n\n${configSource}`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
