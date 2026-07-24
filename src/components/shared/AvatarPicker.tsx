/**
 * Avatars prédéfinis SVG inline pour le profil utilisateur.
 * Chaque avatar est une illustration vectorielle de visage stylisé.
 */

export type AvatarKey =
	| 'curly-dark'
	| 'blonde-straight'
	| 'afro'
	| 'redhead'
	| 'hijab-pink'
	| 'ponytail'
	| 'short-dark'
	| 'beard-glasses'
	| 'gray-hair'
	| 'beard-cap'
	| 'asian-modern'
	| 'dreadlocks';

interface AvatarDef {
	key: AvatarKey;
	label: string;
	/** inline SVG content */
	svg: string;
}

export const AVATARS: AvatarDef[] = [
	{
		key: 'curly-dark',
		label: 'Cheveux bouclés foncés',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#fce7f3"/>
  <!-- Hair -->
  <ellipse cx="50" cy="28" rx="26" ry="18" fill="#1c1917"/>
  <ellipse cx="30" cy="35" rx="10" ry="14" fill="#1c1917"/>
  <ellipse cx="70" cy="35" rx="10" ry="14" fill="#1c1917"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fbbf24"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="49" rx="3" ry="3.5" fill="#1c1917"/>
  <ellipse cx="57" cy="49" rx="3" ry="3.5" fill="#1c1917"/>
  <circle cx="44" cy="48" r="1" fill="white"/>
  <circle cx="58" cy="48" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="56" rx="2" ry="2.5" fill="#d97706"/>
  <!-- Smile -->
  <path d="M43 63 Q50 69 57 63" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <ellipse cx="39" cy="60" rx="5" ry="3" fill="#f9a8d4" opacity="0.5"/>
  <ellipse cx="61" cy="60" rx="5" ry="3" fill="#f9a8d4" opacity="0.5"/>
</svg>`,
	},
	{
		key: 'blonde-straight',
		label: 'Cheveux lisses blonds',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#fef3c7"/>
  <!-- Hair sides -->
  <rect x="24" y="33" width="10" height="42" rx="5" fill="#fbbf24"/>
  <rect x="66" y="33" width="10" height="42" rx="5" fill="#fbbf24"/>
  <!-- Hair top -->
  <ellipse cx="50" cy="28" rx="25" ry="15" fill="#fbbf24"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fde68a"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="49" rx="3" ry="3.5" fill="#1e3a5f"/>
  <ellipse cx="57" cy="49" rx="3" ry="3.5" fill="#1e3a5f"/>
  <circle cx="44" cy="48" r="1" fill="white"/>
  <circle cx="58" cy="48" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="56" rx="2" ry="2.5" fill="#d97706"/>
  <!-- Smile -->
  <path d="M43 63 Q50 69 57 63" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <ellipse cx="39" cy="60" rx="5" ry="3" fill="#fca5a5" opacity="0.5"/>
  <ellipse cx="61" cy="60" rx="5" ry="3" fill="#fca5a5" opacity="0.5"/>
</svg>`,
	},
	{
		key: 'afro',
		label: 'Cheveux afro',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#fdf4ff"/>
  <!-- Afro hair -->
  <circle cx="50" cy="34" r="28" fill="#1c1917"/>
  <!-- Face -->
  <ellipse cx="50" cy="56" rx="18" ry="22" fill="#78350f"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="51" rx="3" ry="3.5" fill="#1c1917"/>
  <ellipse cx="57" cy="51" rx="3" ry="3.5" fill="#1c1917"/>
  <circle cx="44" cy="50" r="1" fill="white"/>
  <circle cx="58" cy="50" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="58" rx="2.5" ry="2" fill="#92400e"/>
  <!-- Smile -->
  <path d="M43 65 Q50 71 57 65" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <ellipse cx="39" cy="62" rx="4" ry="3" fill="#f9a8d4" opacity="0.4"/>
  <ellipse cx="61" cy="62" rx="4" ry="3" fill="#f9a8d4" opacity="0.4"/>
</svg>`,
	},
	{
		key: 'redhead',
		label: 'Cheveux roux',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#fff7ed"/>
  <!-- Hair sides -->
  <rect x="25" y="33" width="9" height="40" rx="4" fill="#dc2626"/>
  <rect x="66" y="33" width="9" height="40" rx="4" fill="#dc2626"/>
  <!-- Hair top -->
  <ellipse cx="50" cy="28" rx="25" ry="15" fill="#dc2626"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fed7aa"/>
  <!-- Freckles -->
  <circle cx="41" cy="55" r="1.5" fill="#ea580c" opacity="0.6"/>
  <circle cx="44" cy="57" r="1.5" fill="#ea580c" opacity="0.6"/>
  <circle cx="56" cy="55" r="1.5" fill="#ea580c" opacity="0.6"/>
  <circle cx="59" cy="57" r="1.5" fill="#ea580c" opacity="0.6"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="49" rx="3" ry="3.5" fill="#166534"/>
  <ellipse cx="57" cy="49" rx="3" ry="3.5" fill="#166534"/>
  <circle cx="44" cy="48" r="1" fill="white"/>
  <circle cx="58" cy="48" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="56" rx="2" ry="2.5" fill="#c2410c"/>
  <!-- Smile -->
  <path d="M43 63 Q50 69 57 63" stroke="#9a3412" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,
	},
	{
		key: 'hijab-pink',
		label: 'Hijab rose',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#fdf2f8"/>
  <!-- Hijab body -->
  <ellipse cx="50" cy="65" rx="38" ry="38" fill="#ec4899"/>
  <!-- Hijab top -->
  <ellipse cx="50" cy="38" rx="28" ry="22" fill="#ec4899"/>
  <!-- Face -->
  <ellipse cx="50" cy="52" rx="18" ry="20" fill="#fde68a"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="47" rx="3" ry="3.5" fill="#1c1917"/>
  <ellipse cx="57" cy="47" rx="3" ry="3.5" fill="#1c1917"/>
  <circle cx="44" cy="46" r="1" fill="white"/>
  <circle cx="58" cy="46" r="1" fill="white"/>
  <!-- Eyebrows -->
  <path d="M39 42 Q43 40 47 42" stroke="#1c1917" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M53 42 Q57 40 61 42" stroke="#1c1917" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Nose -->
  <ellipse cx="50" cy="54" rx="2" ry="2.5" fill="#d97706"/>
  <!-- Smile -->
  <path d="M43 61 Q50 67 57 61" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <ellipse cx="38" cy="57" rx="4" ry="3" fill="#fca5a5" opacity="0.5"/>
  <ellipse cx="62" cy="57" rx="4" ry="3" fill="#fca5a5" opacity="0.5"/>
</svg>`,
	},
	{
		key: 'ponytail',
		label: 'Queue de cheval',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#f0fdf4"/>
  <!-- Ponytail -->
  <rect x="70" y="30" width="8" height="30" rx="4" fill="#92400e"/>
  <!-- Hair top -->
  <ellipse cx="50" cy="28" rx="25" ry="14" fill="#92400e"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fbbf24"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="49" rx="3" ry="3.5" fill="#166534"/>
  <ellipse cx="57" cy="49" rx="3" ry="3.5" fill="#166534"/>
  <circle cx="44" cy="48" r="1" fill="white"/>
  <circle cx="58" cy="48" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="56" rx="2" ry="2.5" fill="#d97706"/>
  <!-- Smile -->
  <path d="M43 63 Q50 69 57 63" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <ellipse cx="39" cy="60" rx="5" ry="3" fill="#f9a8d4" opacity="0.5"/>
  <ellipse cx="61" cy="60" rx="5" ry="3" fill="#f9a8d4" opacity="0.5"/>
</svg>`,
	},
	{
		key: 'short-dark',
		label: 'Cheveux courts foncés',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#eff6ff"/>
  <!-- Hair -->
  <ellipse cx="50" cy="30" rx="23" ry="14" fill="#292524"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fed7aa"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="49" rx="3" ry="3.5" fill="#292524"/>
  <ellipse cx="57" cy="49" rx="3" ry="3.5" fill="#292524"/>
  <circle cx="44" cy="48" r="1" fill="white"/>
  <circle cx="58" cy="48" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="56" rx="2" ry="2.5" fill="#d97706"/>
  <!-- Smile -->
  <path d="M43 63 Q50 69 57 63" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <ellipse cx="39" cy="60" rx="5" ry="3" fill="#fca5a5" opacity="0.4"/>
  <ellipse cx="61" cy="60" rx="5" ry="3" fill="#fca5a5" opacity="0.4"/>
</svg>`,
	},
	{
		key: 'beard-glasses',
		label: 'Barbe et lunettes',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#f1f5f9"/>
  <!-- Hair -->
  <ellipse cx="50" cy="28" rx="24" ry="15" fill="#7c3aed"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fde68a"/>
  <!-- Beard -->
  <ellipse cx="50" cy="70" rx="16" ry="10" fill="#6d28d9"/>
  <!-- Glasses left -->
  <rect x="34" y="45" width="13" height="10" rx="3" fill="none" stroke="#1e293b" stroke-width="2"/>
  <!-- Glasses right -->
  <rect x="53" y="45" width="13" height="10" rx="3" fill="none" stroke="#1e293b" stroke-width="2"/>
  <!-- Bridge -->
  <line x1="47" y1="50" x2="53" y2="50" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Eyes behind glasses -->
  <ellipse cx="40.5" cy="50" rx="2.5" ry="3" fill="#1e293b"/>
  <ellipse cx="59.5" cy="50" rx="2.5" ry="3" fill="#1e293b"/>
  <!-- Nose -->
  <ellipse cx="50" cy="57" rx="2" ry="2.5" fill="#d97706"/>
  <!-- Smile -->
  <path d="M44 63 Q50 68 56 63" stroke="#7c3aed" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,
	},
	{
		key: 'gray-hair',
		label: 'Cheveux gris',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#f8fafc"/>
  <!-- Hair -->
  <ellipse cx="50" cy="28" rx="24" ry="15" fill="#94a3b8"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fed7aa"/>
  <!-- Wrinkles -->
  <path d="M38 45 Q43 43 47 45" stroke="#d97706" stroke-width="1" fill="none" opacity="0.5"/>
  <path d="M53 45 Q57 43 62 45" stroke="#d97706" stroke-width="1" fill="none" opacity="0.5"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="49" rx="3" ry="3.5" fill="#475569"/>
  <ellipse cx="57" cy="49" rx="3" ry="3.5" fill="#475569"/>
  <circle cx="44" cy="48" r="1" fill="white"/>
  <circle cx="58" cy="48" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="56" rx="2.5" ry="2.5" fill="#d97706"/>
  <!-- Smile lines -->
  <path d="M38 65 Q40 62 38 59" stroke="#d97706" stroke-width="1" fill="none" opacity="0.4"/>
  <path d="M62 65 Q60 62 62 59" stroke="#d97706" stroke-width="1" fill="none" opacity="0.4"/>
  <!-- Smile -->
  <path d="M43 63 Q50 70 57 63" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,
	},
	{
		key: 'beard-cap',
		label: 'Barbe et casquette',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#ecfdf5"/>
  <!-- Cap brim -->
  <rect x="22" y="36" width="56" height="6" rx="3" fill="#065f46"/>
  <!-- Cap body -->
  <ellipse cx="50" cy="30" rx="26" ry="15" fill="#059669"/>
  <!-- Face -->
  <ellipse cx="50" cy="57" rx="20" ry="22" fill="#fbbf24"/>
  <!-- Beard -->
  <ellipse cx="50" cy="72" rx="14" ry="9" fill="#92400e"/>
  <!-- Moustache -->
  <path d="M42 63 Q50 67 58 63" fill="#92400e"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="51" rx="3" ry="3.5" fill="#1c1917"/>
  <ellipse cx="57" cy="51" rx="3" ry="3.5" fill="#1c1917"/>
  <circle cx="44" cy="50" r="1" fill="white"/>
  <circle cx="58" cy="50" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="58" rx="2.5" ry="2" fill="#d97706"/>
</svg>`,
	},
	{
		key: 'asian-modern',
		label: 'Coupe moderne',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#fff7ed"/>
  <!-- Hair styled -->
  <ellipse cx="50" cy="25" rx="24" ry="12" fill="#1c1917"/>
  <rect x="27" y="25" width="6" height="20" rx="3" fill="#1c1917"/>
  <rect x="67" y="25" width="6" height="20" rx="3" fill="#1c1917"/>
  <!-- Face -->
  <ellipse cx="50" cy="54" rx="20" ry="24" fill="#fde68a"/>
  <!-- Eyes (slightly narrower for style) -->
  <ellipse cx="43" cy="49" rx="3.5" ry="2.5" fill="#1c1917"/>
  <ellipse cx="57" cy="49" rx="3.5" ry="2.5" fill="#1c1917"/>
  <circle cx="44" cy="48.5" r="0.8" fill="white"/>
  <circle cx="58" cy="48.5" r="0.8" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="56" rx="2" ry="2" fill="#d97706"/>
  <!-- Smile -->
  <path d="M43 63 Q50 68 57 63" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <ellipse cx="39" cy="59" rx="5" ry="3" fill="#fca5a5" opacity="0.4"/>
  <ellipse cx="61" cy="59" rx="5" ry="3" fill="#fca5a5" opacity="0.4"/>
</svg>`,
	},
	{
		key: 'dreadlocks',
		label: 'Dreadlocks',
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#fef9c3"/>
  <!-- Dreadlocks -->
  <rect x="26" y="25" width="6" height="50" rx="3" fill="#451a03"/>
  <rect x="35" y="20" width="6" height="55" rx="3" fill="#78350f"/>
  <rect x="44" y="18" width="6" height="52" rx="3" fill="#451a03"/>
  <rect x="53" y="20" width="6" height="52" rx="3" fill="#78350f"/>
  <rect x="62" y="24" width="6" height="50" rx="3" fill="#451a03"/>
  <!-- Hair top overlay -->
  <ellipse cx="50" cy="26" rx="28" ry="16" fill="#1c1917"/>
  <!-- Face -->
  <ellipse cx="50" cy="56" rx="18" ry="22" fill="#78350f"/>
  <!-- Eyes -->
  <ellipse cx="43" cy="51" rx="3" ry="3.5" fill="#1c1917"/>
  <ellipse cx="57" cy="51" rx="3" ry="3.5" fill="#1c1917"/>
  <circle cx="44" cy="50" r="1" fill="white"/>
  <circle cx="58" cy="50" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="50" cy="58" rx="2.5" ry="2" fill="#92400e"/>
  <!-- Smile -->
  <path d="M43 65 Q50 71 57 65" stroke="#92400e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,
	},
];

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
	const avatar = AVATARS.find((a) => a.key === avatarKey);
	if (!avatar) {
		// Default placeholder: scissors icon in rose circle
		return (
			<span
				className={`flex items-center justify-center rounded-full bg-rose-600 text-white ${className}`}
				style={{ width: size, height: size, fontSize: size * 0.45 }}
			>
				✂
			</span>
		);
	}
	return (
		<span
			className={`inline-block overflow-hidden rounded-full ${className}`}
			style={{ width: size, height: size }}
			dangerouslySetInnerHTML={{ __html: avatar.svg }}
		/>
	);
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
	return (
		<div>
			<p className="text-sm font-medium text-stone-700">Photo de profil</p>
			<p className="mt-0.5 text-xs text-stone-500">Choisissez un avatar prédéfini</p>
			<div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-6">
				{AVATARS.map((avatar) => (
					<button
						key={avatar.key}
						type="button"
						title={avatar.label}
						onClick={() => onChange(avatar.key)}
						className={`overflow-hidden rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 ${
							value === avatar.key
								? 'ring-2 ring-rose-600 ring-offset-2 scale-110'
								: 'opacity-70 hover:opacity-100'
						}`}
						style={{ width: 52, height: 52 }}
						dangerouslySetInnerHTML={{ __html: avatar.svg }}
					/>
				))}
			</div>
		</div>
	);
}
