import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Conversão técnica aprovada: preserva o desenho; não utiliza IA ou fontes.
const pasta = resolve(import.meta.dirname, '../app/avantavendas/sistema/assets');
const entrada = process.argv[2] || resolve(pasta, 'logo-avantavendas-aprovado-20261025-v2.jpg');
const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
// O slogan começa abaixo da marca. A faixa superior contém somente AVANTAVENDAS.
for (let y = 0; y < Math.floor(info.height * .64); y++) for (let x = 0; x < info.width; x++) {
  const i = (y * info.width + x) * 3;
  if (data[i] < 150 && data[i + 2] > data[i] + 25) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left || bottom < top) throw new Error('Marca não localizada na imagem aprovada.');
left = Math.max(0, left - 6); top = Math.max(0, top - 6);
right = Math.min(info.width - 1, right + 6); bottom = Math.min(info.height - 1, bottom + 6);
const width = right - left + 1, height = bottom - top + 1;
const positivo = Buffer.alloc(width * height * 4), negativo = Buffer.alloc(positivo.length);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = ((y + top) * info.width + x + left) * 3, o = (y * width + x) * 4;
  const rgb = [data[i], data[i + 1], data[i + 2]];
  const minimo = Math.min(...rgb);
  const alpha = minimo >= 245 ? 0 : Math.max(0, Math.min(1, (255 - minimo) / 235));
  const color = rgb.map(c => alpha > 0 && alpha < 1 ? Math.max(0, Math.min(255, Math.round(255 - (255 - c) / alpha))) : c);
  for (let k = 0; k < 3; k++) positivo[o + k] = alpha ? color[k] : 0;
  positivo[o + 3] = Math.round(alpha * 255);
  const escuro = color[1] < 100;
  for (let k = 0; k < 3; k++) negativo[o + k] = alpha ? (escuro ? 255 : color[k]) : 0;
  negativo[o + 3] = positivo[o + 3];
}
for (const [nome, bytes] of [['positivo', positivo], ['negativo', negativo]]) {
  await sharp(bytes, { raw: { width, height, channels: 4 } }).png().toFile(resolve(pasta, `logo-avantavendas-${nome}.png`));
}
console.log(JSON.stringify({ width, height, crop: { left, top, right, bottom }, sourceSha256: createHash('sha256').update(await readFile(entrada)).digest('hex') }));
