import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const production = origin.protocol === 'https:' && !origin.hostname.endsWith('.example');
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
