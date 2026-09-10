import type { APIRoute } from 'astro';
import { publicRoutes } from '../data/site';
import { getPartners, getPeople } from '../content/read';
import accessibility from '../content/legal/accessibility.json';
import privacy from '../content/legal/privacy.json';
import terms from '../content/legal/terms.json';

export const prerender = true;

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  // These pages carry noindex until they hold a record, so the sitemap must
  // not advertise them either.
  const emptyRoutes = new Set([
    ...((await getPeople()).length === 0 ? ['/about/leadership/'] : []),
    ...((await getPartners()).length === 0 ? ['/about/partners/'] : []),
  ]);
  const approvedLegalRoutes = new Set([
    ...(accessibility.status === 'approved' ? ['/accessibility/'] : []),
    ...(privacy.status === 'approved' ? ['/privacy/'] : []),
    ...(terms.status === 'approved' ? ['/terms/'] : []),
  ]);
  const routes = publicRoutes
    .filter((route) => !emptyRoutes.has(route))
    .filter(
      (route) =>
        !['/accessibility/', '/privacy/', '/terms/'].includes(route) ||
        approvedLegalRoutes.has(route),
    );
  const urls = routes
    .map((route) => `<url><loc>${escapeXml(String(new URL(route, origin)))}</loc></url>`)
    .join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
