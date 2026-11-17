import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { useCouche, usePortail } from '@/components/diamant/dashboard/kit/primitives';

// Helper to create an HTML Image
const createImage = (url: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener('load', () => resolve(image));
		image.addEventListener('error', (error) => reject(error));
		image.src = url;
	});

// Helper to extract the cropped part
async function getCroppedImg(
	imageSrc: string,
	pixelCrop: Area,
	flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) return null;

	// set canvas size to match the bounding box
	canvas.width = image.width;
	canvas.height = image.height;

	ctx.translate(image.width / 2, image.height / 2);
	ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
	ctx.translate(-image.width / 2, -image.height / 2);

	ctx.drawImage(image, 0, 0);

	const croppedCanvas = document.createElement('canvas');
	const croppedCtx = croppedCanvas.getContext('2d');

	if (!croppedCtx) return null;

	// Set the size of the cropped canvas
	croppedCanvas.width = pixelCrop.width;
	croppedCanvas.height = pixelCrop.height;

	// Draw the cropped image onto the new canvas
	croppedCtx.drawImage(
		canvas,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		pixelCrop.width,
		pixelCrop.height
	);

	// As Base64
	// return croppedCanvas.toDataURL('image/jpeg');

	// As a blob
	return new Promise((resolve) => {
		croppedCanvas.toBlob((file) => {
			resolve(file);
		}, 'image/jpeg');
	});
}

interface ImageCropperProps {
	imageSrc: string;
	onCropComplete: (croppedBlob: Blob) => void;
	onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	// Rendue dans <body> et inscrite dans la pile des couches : elle passe au-dessus d'un panneau
	// latéral ouvert, Échap ne ferme qu'elle et le focus y reste.
	const ref = useRef<HTMLDivElement>(null);
	const cible = usePortail();
	useCouche(true, onCancel, ref);

	const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleSave = async () => {
		if (!croppedAreaPixels) return;
		try {
			const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
			if (croppedImage) {
				onCropComplete(croppedImage);
			}
		} catch (e) {
			console.error("Erreur lors du recadrage", e);
		}
	};

	if (!cible) return null;
	return createPortal(
		<div ref={ref} className="fixed inset-0 z-[80] flex items-center justify-center bg-dx-nuit/70 p-4" role="dialog" aria-modal="true" aria-labelledby="dx-recadrage-titre">
			<div className="relative flex w-full max-w-lg flex-col rounded-[18px] bg-dx-carte p-6 shadow-[0_30px_80px_-30px_rgb(26_20_17/0.6)]">
				<h3 id="dx-recadrage-titre" className="dx-h2">Recadrer la photo</h3>
				<p className="mb-4 mt-1 text-sm text-dx-gris">Ajustez l'image (déplacez et zoomez) pour qu'elle s'intègre parfaitement dans le carré.</p>

				<div className="relative h-[350px] w-full overflow-hidden rounded-xl bg-dx-ivoire-2">
					<Cropper
						image={imageSrc}
						crop={crop}
						zoom={zoom}
						aspect={1}
						onCropChange={setCrop}
						onCropComplete={handleCropComplete}
						onZoomChange={setZoom}
					/>
				</div>

				<div className="mt-6">
					<label htmlFor="zoom" className="dx-champ-label">Zoom</label>
					<input
						type="range"
						id="zoom"
						value={zoom}
						min={1}
						max={3}
						step={0.1}
						onChange={(e) => setZoom(Number(e.target.value))}
						className="mt-1 w-full accent-dx-terre"
					/>
				</div>

				<div className="mt-6 flex justify-end gap-2">
					<button type="button" onClick={onCancel} className="dx-btn dx-btn--ligne">
						Annuler
					</button>
					<button type="button" onClick={handleSave} className="dx-btn">
						Recadrer et appliquer
					</button>
				</div>
			</div>
		</div>,
		cible
	);
}
