import type { APIRoute } from 'astro';
import { isPublicProductionOrigin } from '../lib/site-origin.mjs';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const production = isPublicProductionOrigin(origin);
  const body = production
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        `Sitemap: ${new URL('/sitemap.xml', origin)}`,
        '',
      ].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
