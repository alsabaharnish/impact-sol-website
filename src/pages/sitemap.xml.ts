import type { APIRoute } from 'astro';
import { publicRoutes } from '../data/site';
import accessibility from '../content/legal/accessibility.json';
import privacy from '../content/legal/privacy.json';
import terms from '../content/legal/terms.json';

export const prerender = true;

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const approvedLegalRoutes = new Set([
    ...(accessibility.status === 'approved' ? ['/accessibility/'] : []),
    ...(privacy.status === 'approved' ? ['/privacy/'] : []),
    ...(terms.status === 'approved' ? ['/terms/'] : []),
  ]);
  const routes = publicRoutes.filter(
    (route) => !['/accessibility/', '/privacy/', '/terms/'].includes(route) || approvedLegalRoutes.has(route),
  );
  const urls = routes
    .map((route) => `<url><loc>${escapeXml(String(new URL(route, origin)))}</loc></url>`)
    .join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
