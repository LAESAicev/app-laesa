// Fotos enviadas pelo painel ficam em src/assets/uploads e chegam aqui como caminho
// ("/src/assets/uploads/mandatos/2026-2/membros/0/foto.png"). Resolvemos o caminho para a imagem importada,
// para o astro:assets redimensionar e recortar no build.
import type { ImageMetadata } from 'astro';

// Extensão sem diferenciar maiúscula (FOTO.JPG do celular), como o deploy só de conteúdo (scripts/so-conteudo.mjs, /i).
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/uploads/**/*.{[jJ][pP][gG],[jJ][pP][eE][gG],[pP][nN][gG],[wW][eE][bB][pP],[aA][vV][iI][fF]}',
  { eager: true },
);

export function uploadedImage(path?: string): ImageMetadata | undefined {
  if (!path) return undefined;
  const file = files[path];
  if (!file) throw new Error(`Imagem não encontrada: ${path}. Envie de novo pelo painel (/keystatic).`);
  return file.default;
}
