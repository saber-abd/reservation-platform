/**
 * Photos de profil Diamant : une série d'avatars dessinés au trait (public/images/diamant/avatars/*.svg,
 * palette ivoire / brun / terre cuite du salon) ou une photo importée et recadrée.
 *
 * Stockage inchangé : la valeur est une chaîne enregistrée dans `avatar_url` (clients ou professionals).
 * - avatar dessiné : son chemin, ex. « /images/diamant/avatars/ciseaux.svg » ;
 * - photo importée : image JPEG 256 × 256 encodée en data URL (pas de compartiment de stockage dédié) ;
 * - anciennes valeurs (URL Dicebear, clés des anciens avatars) : URL affichée telle quelle, clé inconnue
 *   ou image en erreur → repli sur l'initiale (ou une silhouette si le nom n'est pas fourni).
 */
// Module léger (importé par l'en-tête du site public) : la fenêtre de choix, qui charge le recadrage
// et les primitives des espaces, est dans DiamantAvatarChoix.tsx.
import { useEffect, useState } from 'react';

export interface AvatarDiamant {
	cle: string;
	label: string;
	src: string;
}

const DOSSIER = '/images/diamant/avatars';

export const AVATARS: AvatarDiamant[] = [
	{ cle: 'profil-chignon', label: 'Profil au chignon' },
	{ cle: 'profil-carre', label: 'Profil au carré' },
	{ cle: 'profil-barbe', label: 'Profil barbu' },
	{ cle: 'profil-boucles', label: 'Profil aux boucles' },
	{ cle: 'profil-ondule', label: 'Profil aux cheveux ondulés' },
	{ cle: 'ciseaux', label: 'Ciseaux' },
	{ cle: 'peigne', label: 'Peigne' },
	{ cle: 'meche', label: 'Mèche' },
	{ cle: 'diamant', label: 'Diamant' },
	{ cle: 'miroir', label: 'Miroir' },
	{ cle: 'flacon', label: 'Flacon de soin' },
	{ cle: 'brin', label: 'Brin' },
].map((a) => ({ ...a, src: `${DOSSIER}/${a.cle}.svg` }));

/** Adresse d'image affichable pour une valeur stockée, ou null (repli sur l'initiale). */
export function srcAvatar(valeur: string | null | undefined): string | null {
	if (!valeur) return null;
	const v = valeur.trim();
	if (!v) return null;
	// Clé nue d'un avatar de la série (« ciseaux ») : acceptée aussi.
	const parCle = AVATARS.find((a) => a.cle === v);
	if (parCle) return parCle.src;
	if (/^https?:\/\//.test(v) || v.startsWith('/') || v.startsWith('data:image/')) return v;
	return null;
}

function Silhouette({ size }: { size: number }) {
	return (
		<svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
			<rect width="40" height="40" fill="#ede4d7" />
			<g fill="none" stroke="#6e6157" strokeWidth="1.4" strokeLinecap="round">
				<circle cx="20" cy="16" r="6.5" />
				<path d="M8 38c1.5-7.5 6.5-11.5 12-11.5S30.5 30.5 32 38" />
			</g>
		</svg>
	);
}

export function AvatarDisplay({
	avatarKey,
	size = 40,
	className = '',
	nom,
}: {
	avatarKey: string | null;
	size?: number;
	className?: string;
	/** Nom affiché : son initiale sert de repli quand il n'y a pas d'image. */
	nom?: string | null;
}) {
	const src = srcAvatar(avatarKey);
	const [enErreur, setEnErreur] = useState(false);
	useEffect(() => setEnErreur(false), [src]);

	if (src && !enErreur) {
		return (
			<span
				className={`inline-block shrink-0 overflow-hidden rounded-full bg-dx-ivoire-2 ${className}`}
				style={{ width: size, height: size }}
			>
				<img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" onError={() => setEnErreur(true)} />
			</span>
		);
	}

	const initiale = (nom || '').trim().charAt(0).toUpperCase();
	return (
		<span
			className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-dx-ivoire-2 font-heading text-dx-encre-2 ${className}`}
			style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
			aria-hidden="true"
		>
			{initiale || <Silhouette size={size} />}
		</span>
	);
}
