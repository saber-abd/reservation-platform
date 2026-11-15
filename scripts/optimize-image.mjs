// Télécharge (ou lit) une image et l'écrit en AVIF + WebP à plusieurs largeurs.
//   node scripts/optimize-image.mjs <url-ou-fichier> <dossier-sortie> <nom> [largeurs=1920,1280,768]
// Exemple :
//   node scripts/optimize-image.mjs "https://images.unsplash.com/photo-XXXX?w=2400&q=80&fm=jpg" public/images/premium atelier
//   → public/images/premium/atelier-1920.avif|webp, atelier-1280.*, atelier-768.*
// Affiche les dimensions de chaque sortie (à reporter dans width/height des <img>).
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const [source, outDir, name, widthsArg = '1920,1280,768'] = process.argv.slice(2);
if (!source || !outDir || !name) {
	console.error('Usage : node scripts/optimize-image.mjs <url-ou-fichier> <dossier-sortie> <nom> [largeurs]');
	process.exit(1);
}

let input;
if (/^https?:\/\//.test(source)) {
	const res = await fetch(source);
	if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${source}`);
	input = Buffer.from(await res.arrayBuffer());
} else {
	input = await readFile(source);
}

await mkdir(outDir, { recursive: true });
const meta = await sharp(input).metadata();
console.log(`source : ${meta.width}×${meta.height} ${meta.format}`);

for (const width of widthsArg.split(',').map(Number)) {
	const resized = sharp(input).rotate().resize({ width, withoutEnlargement: true });
	const avif = await resized.clone().avif({ quality: 55 }).toFile(join(outDir, `${name}-${width}.avif`));
	const webp = await resized.clone().webp({ quality: 74 }).toFile(join(outDir, `${name}-${width}.webp`));
	console.log(
		`${name}-${width} : ${avif.width}×${avif.height}, avif ${Math.round(avif.size / 1024)} Ko, webp ${Math.round(webp.size / 1024)} Ko`,
	);
}
