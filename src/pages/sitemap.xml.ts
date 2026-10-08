// GET /sitemap.xml — gerado no build com as páginas públicas. Fora: /avisos/* (links com token), /api/* e o 404.
import type { APIRoute } from 'astro';
import { editais } from '../lib/content';

export const prerender = true;

const paginas = ['/', '/atividades', '/novidades', '/processos-seletivos', '/contato', '/privacidade'];

export const GET: APIRoute = ({ site }) => {
  const caminhos = [...paginas, ...editais.map((e) => `/processos-seletivos/${e.slug}`)];
  const urls = caminhos.map((c) => `  <url><loc>${new URL(c, site)}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
