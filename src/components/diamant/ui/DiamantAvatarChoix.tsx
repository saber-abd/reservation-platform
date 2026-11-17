// Fenêtre de choix de la photo de profil (espaces connectés Diamant) : avatar dessiné ou photo importée.
// Les avatars et l'affichage sont dans DiamantAvatarPicker.tsx (module léger, aussi utilisé par l'en-tête public).
import { useState } from 'react';
import { Check, ImagePlus } from 'lucide-react';
import ImageCropper from '@/components/diamant/ui/DiamantImageCropper';
import { Fenetre } from '@/components/diamant/dashboard/kit/primitives';
import { AVATARS, srcAvatar } from '@/components/diamant/ui/DiamantAvatarPicker';

/** Réduit une image recadrée à 256 × 256 (JPEG) et la renvoie en data URL. */
async function versDataUrl(blob: Blob, cote = 256): Promise<string> {
	const url = URL.createObjectURL(blob);
	try {
		const img = await new Promise<HTMLImageElement>((resolve, reject) => {
			const i = new Image();
			i.onload = () => resolve(i);
			i.onerror = reject;
			i.src = url;
		});
		const canvas = document.createElement('canvas');
		canvas.width = cote;
		canvas.height = cote;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('canvas');
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(img, 0, 0, cote, cote);
		return canvas.toDataURL('image/jpeg', 0.86);
	} finally {
		URL.revokeObjectURL(url);
	}
}

/**
 * Fenêtre de choix de la photo de profil : un avatar de la série ou une photo importée (recadrée au carré).
 * `onChange` reçoit la valeur à stocker dans `avatar_url`.
 */
export default function AvatarPicker({
	ouvert,
	onClose,
	value,
	onChange,
	lectureSeule = false,
	onLectureSeule,
}: {
	ouvert: boolean;
	onClose: () => void;
	value: string | null;
	onChange: (valeur: string) => void;
	/** Compte en lecture seule : la fenêtre s'affiche, aucun choix n'est enregistré. */
	lectureSeule?: boolean;
	onLectureSeule?: () => void;
}) {
	const [recadrage, setRecadrage] = useState<string | null>(null);
	const actuel = srcAvatar(value);

	function choisir(valeur: string) {
		if (lectureSeule) {
			onLectureSeule?.();
			return;
		}
		onChange(valeur);
		onClose();
	}

	function importer(e: React.ChangeEvent<HTMLInputElement>) {
		const fichier = e.target.files?.[0];
		e.target.value = '';
		if (!fichier) return;
		if (lectureSeule) {
			onLectureSeule?.();
			return;
		}
		const lecteur = new FileReader();
		lecteur.onload = () => setRecadrage(lecteur.result as string);
		lecteur.readAsDataURL(fichier);
	}

	return (
		<>
			<Fenetre
				ouvert={ouvert}
				onClose={onClose}
				largeur={560}
				titre="Photo de profil"
				sousTitre="Choisissez un dessin de la maison ou importez votre photo."
			>
				<div role="radiogroup" aria-label="Avatars" className="grid grid-cols-4 gap-3 sm:grid-cols-6">
					{AVATARS.map((a) => {
						const choisi = actuel === a.src;
						return (
							<button
								key={a.cle}
								type="button"
								role="radio"
								aria-checked={choisi}
								aria-label={a.label}
								title={a.label}
								onClick={() => choisir(a.src)}
								className={`relative aspect-square w-full overflow-hidden rounded-full transition-transform duration-200 hover:scale-[1.04] ${
									choisi ? 'ring-2 ring-dx-terre ring-offset-2 ring-offset-dx-carte' : 'ring-1 ring-dx-filet'
								}`}
							>
								<img src={a.src} alt="" width={72} height={72} loading="lazy" className="h-full w-full" />
								{choisi && (
									<span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-dx-terre text-white">
										<Check size={12} />
									</span>
								)}
							</button>
						);
					})}
				</div>

				<div className="mt-5 border-t border-dx-filet pt-5">
					<label
						className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-dx-filet-fort bg-dx-ivoire px-4 py-3.5 text-sm text-dx-gris transition-colors focus-within:border-dx-terre hover:border-dx-terre hover:text-dx-encre ${
							lectureSeule ? 'opacity-70' : ''
						}`}
					>
						<ImagePlus size={20} className="flex-none text-dx-terre" />
						<span>
							<b className="block font-semibold text-dx-encre">Importer ma photo</b>
							Recadrée au carré avant l'enregistrement.
						</span>
						<input type="file" accept="image/*" onChange={importer} className="sr-only" />
					</label>
					{lectureSeule && <p className="dx-champ-aide mt-2">Lecture seule : le choix n'est pas enregistré.</p>}
				</div>
			</Fenetre>

			{recadrage && (
				<ImageCropper
					imageSrc={recadrage}
					onCancel={() => setRecadrage(null)}
					onCropComplete={async (blob) => {
						setRecadrage(null);
						try {
							choisir(await versDataUrl(blob));
						} catch (e) {
							console.error('Photo de profil : conversion impossible', e);
						}
					}}
				/>
			)}
		</>
	);
}
