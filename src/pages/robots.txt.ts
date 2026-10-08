// GET /robots.txt — gerado no build (e não em public/) porque a linha Sitemap exige o endereço absoluto,
// que só existe em SITE_URL.
import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nDisallow: /api/\nDisallow: /avisos/\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
