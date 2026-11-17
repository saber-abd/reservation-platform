/**
 * Avatars prédéfinis de la démo Premium (garage), dessinés dans l'identité du site :
 * carbone, blanc cassé, rouge signal, formes nettes. Fichiers SVG dans public/images/premium/avatars/.
 *
 * Stockage inchangé : la colonne `avatar_url` (professionnel ou client) reçoit la clé de l'avatar
 * (« casque », « jante »…) ou une adresse d'image (photo du compte Google, URL, data:).
 * Les clés de l'ancienne série (visages dessinés, « curly-dark »…) restent lisibles : elles
 * s'affichent avec l'avatar correspondant de la nouvelle série.
 */

export type AvatarKey =
	| 'casque'
	| 'cle'
	| 'piston'
	| 'jante'
	| 'bougie'
	| 'plaque'
	| 'compteur'
	| 'damier'
	| 'engrenage'
	| 'numero'
	| 'boite'
	| 'pneu';

interface AvatarDef {
	key: AvatarKey;
	label: string;
}

export const AVATARS: AvatarDef[] = [
	{ key: 'casque', label: 'Casque' },
	{ key: 'cle', label: 'Clé plate' },
	{ key: 'piston', label: 'Piston' },
	{ key: 'jante', label: 'Jante' },
	{ key: 'bougie', label: "Bougie d'allumage" },
	{ key: 'plaque', label: "Plaque d'immatriculation" },
	{ key: 'compteur', label: 'Compte-tours' },
	{ key: 'damier', label: 'Drapeau à damier' },
	{ key: 'engrenage', label: 'Engrenage' },
	{ key: 'numero', label: 'Numéro de course' },
	{ key: 'boite', label: 'Grille de boîte de vitesses' },
	{ key: 'pneu', label: 'Bande de roulement' },
];

/** Anciennes clés (série de visages) → avatar de la nouvelle série. */
const ANCIENNES_CLES: Record<string, AvatarKey> = {
	'curly-dark': 'casque',
	'blonde-straight': 'jante',
	afro: 'compteur',
	redhead: 'bougie',
	'hijab-pink': 'damier',
	ponytail: 'plaque',
	'short-dark': 'cle',
	'beard-glasses': 'boite',
	'gray-hair': 'engrenage',
	'beard-cap': 'numero',
	'asian-modern': 'piston',
	dreadlocks: 'pneu',
};

const srcAvatar = (key: AvatarKey) => `/images/premium/avatars/${key}.svg`;

/** Avatar prédéfini correspondant à une valeur enregistrée (nouvelle ou ancienne clé), sinon null. */
export function resolveAvatarKey(value: string | null | undefined): AvatarKey | null {
	if (!value) return null;
	if (AVATARS.some((a) => a.key === value)) return value as AvatarKey;
	return ANCIENNES_CLES[value] ?? null;
}

const estUneImage = (v: string) => v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/') || v.startsWith('data:');

interface AvatarPickerProps {
	value: string | null;
	onChange: (key: AvatarKey) => void;
}

export function AvatarDisplay({
	avatarKey,
	size = 40,
	className = '',
}: {
	avatarKey: string | null;
	size?: number;
	className?: string;
}) {
	// Photo (compte Google, URL enregistrée…)
	if (avatarKey && estUneImage(avatarKey)) {
		return (
			<span className={`inline-block shrink-0 overflow-hidden rounded-[2px] bg-white ${className}`} style={{ width: size, height: size }}>
				<img src={avatarKey} alt="" width={size} height={size} className="h-full w-full object-cover" />
			</span>
		);
	}

	const key = resolveAvatarKey(avatarKey);
	if (!key) {
		// Aucun avatar choisi (ou valeur inconnue) : silhouette neutre sur carbone.
		return (
			<span
				className={`flex shrink-0 items-center justify-center rounded-[2px] ${className}`}
				style={{ width: size, height: size, background: '#1a1c1f', color: '#9aa0a6' }}
				aria-hidden="true"
			>
				<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" strokeWidth="1.8">
					<circle cx="12" cy="8" r="4" />
					<path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
				</svg>
			</span>
		);
	}
	return (
		<span className={`inline-block shrink-0 overflow-hidden rounded-[2px] ${className}`} style={{ width: size, height: size }}>
			<img src={srcAvatar(key)} alt="" width={size} height={size} className="block h-full w-full" />
		</span>
	);
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
	const actif = resolveAvatarKey(value);
	return (
		<div>
			<p className="pe-label !mb-1">Avatar</p>
			<p className="text-sm text-pe-acier">Choisissez une pièce de l'atelier pour vous représenter.</p>
			<div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-6" role="radiogroup" aria-label="Avatar">
				{AVATARS.map((avatar) => {
					const selected = actif === avatar.key;
					return (
						<button
							key={avatar.key}
							type="button"
							role="radio"
							aria-checked={selected}
							aria-label={avatar.label}
							title={avatar.label}
							onClick={() => onChange(avatar.key)}
							className={`group relative aspect-square w-full max-w-[64px] overflow-hidden rounded-[2px] transition-[filter,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pe-rouge ${
								selected
									? 'shadow-[0_0_0_2px_var(--pe-carte),0_0_0_4px_var(--pe-rouge)]'
									: 'grayscale-[35%] hover:-translate-y-0.5 hover:grayscale-0'
							}`}
						>
							<img src={srcAvatar(avatar.key)} alt="" width={64} height={64} loading="lazy" decoding="async" className="block h-full w-full" />
							{selected && (
								<span className="absolute bottom-0 right-0 h-2.5 w-4 -skew-x-[14deg] translate-x-1 bg-pe-rouge" aria-hidden="true" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
