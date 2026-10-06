// Fotos enviadas pelo painel ficam em src/assets/uploads e chegam aqui como caminho
// ("/src/assets/uploads/mesa/presidente/foto.jpg"). Resolvemos o caminho para a imagem importada,
// para o astro:assets redimensionar e recortar no build.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
});

export function uploadedImage(path?: string): ImageMetadata | undefined {
  if (!path) return undefined;
  const file = files[path];
  if (!file) throw new Error(`Imagem não encontrada: ${path}. Envie de novo pelo painel (/keystatic).`);
  return file.default;
}
