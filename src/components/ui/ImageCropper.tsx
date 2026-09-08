import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
			<div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col">
				<h3 className="mb-4 text-lg font-bold text-stone-900">Recadrer la photo</h3>
				<p className="text-sm text-stone-500 mb-4">Ajustez l'image (déplacez et zoomez) pour qu'elle s'intègre parfaitement dans le carré.</p>
				
				<div className="relative h-[350px] w-full rounded-xl overflow-hidden bg-stone-100">
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
					<label htmlFor="zoom" className="block text-sm font-medium text-stone-700">Zoom</label>
					<input
						type="range"
						id="zoom"
						value={zoom}
						min={1}
						max={3}
						step={0.1}
						aria-labelledby="Zoom"
						onChange={(e) => setZoom(Number(e.target.value))}
						className="w-full mt-2"
					/>
				</div>

				<div className="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-xl border border-border px-4 py-2 font-medium text-stone-600 transition-colors hover:bg-stone-50"
					>
						Annuler
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="rounded-xl bg-rose-600 px-4 py-2 font-medium text-white transition-colors hover:bg-rose-700"
					>
						Recadrer et appliquer
					</button>
				</div>
			</div>
		</div>
	);
}
