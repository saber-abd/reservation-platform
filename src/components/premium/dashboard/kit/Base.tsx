// Primitives des espaces connectés Premium : en-tête de page, pastille de statut, squelettes,
// états vides dessinés, chiffres qui roulent. Styles dans la section « Espaces connectés » de premium.css.
import { useEffect, useState, type ReactNode } from 'react';
import NumberFlow, { type Format } from '@number-flow/react';

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
	return (
		<header className="pe-head">
			<div className="pe-head__texte">
				<h1 className="pe-title">{title}</h1>
				{sub && <p className="pe-sub">{sub}</p>}
			</div>
			{actions && <div className="pe-head__actions">{actions}</div>}
		</header>
	);
}

export type Statut = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export const STATUT_LIBELLE: Record<Statut, string> = {
	pending: 'En attente',
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

export function StatusTag({ status, label }: { status: Statut | 'neutre'; label?: string }) {
	return (
		<span className="pe-tag" data-s={status}>
			{label ?? (status === 'neutre' ? '' : STATUT_LIBELLE[status])}
		</span>
	);
}

/** Bloc gris qui pulse ; `h`/`w` en CSS. */
export function Skel({ h = 14, w = '100%', className = '' }: { h?: number | string; w?: number | string; className?: string }) {
	return <span aria-hidden="true" className={`pe-skel ${className}`} style={{ height: h, width: w }} />;
}

/** Squelette générique d'une page : en-tête + cartes. Texte « Chargement… » réservé aux lecteurs d'écran. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
	return (
		<div aria-busy="true">
			<span className="sr-only" role="status">Chargement…</span>
			<div className="pe-head">
				<div className="grid w-full max-w-md gap-3">
					<Skel h={34} w="70%" />
					<Skel h={14} w="90%" />
				</div>
			</div>
			<div className="pe-bento">
				{Array.from({ length: cards }, (_, i) => (
					<div key={i} className={`pe-card pe-card__corps grid gap-3 ${i === 0 ? 'pe-b-7 pe-b-haut' : 'pe-b-5'}`}>
						<Skel h={12} w="30%" />
						<Skel h={i === 0 ? 120 : 44} w={i === 0 ? '100%' : '50%'} />
						<Skel h={12} w="80%" />
					</div>
				))}
			</div>
		</div>
	);
}

/** Lignes de squelette pour une liste ou un tableau. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div aria-busy="true" className="pe-rows">
			<span className="sr-only" role="status">Chargement…</span>
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} className="flex items-center gap-4 px-[18px] py-4">
					<Skel h={36} w={36} />
					<div className="grid flex-1 gap-2">
						<Skel h={12} w={`${55 - i * 6}%`} />
						<Skel h={10} w={`${35 - i * 3}%`} />
					</div>
					<Skel h={12} w={70} />
				</div>
			))}
		</div>
	);
}

/** Petits dessins au trait pour les états vides (pont élévateur, agenda, bulle, liste). */
function Dessin({ kind }: { kind: 'agenda' | 'pont' | 'bulle' | 'liste' | 'recherche' }) {
	const common = { className: 'pe-vide__dessin', viewBox: '0 0 132 72', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true } as const;
	if (kind === 'pont') {
		return (
			<svg {...common}>
				<path d="M8 66h116" />
				<path d="M22 66V22M110 66V22" />
				<path d="M22 40h88" strokeDasharray="4 4" />
				<path d="M36 40l6-10h42l10 10" />
				<circle cx="48" cy="44" r="5" />
				<circle cx="86" cy="44" r="5" />
				<path d="M16 22h12M104 22h12" />
			</svg>
		);
	}
	if (kind === 'bulle') {
		return (
			<svg {...common}>
				<path d="M20 10h70v38H44l-14 12V48H20z" />
				<path d="M60 26h52v32h-8v10l-12-10H60z" />
				<path d="M32 24h44M32 34h30" />
			</svg>
		);
	}
	if (kind === 'liste' || kind === 'recherche') {
		return (
			<svg {...common}>
				<path d="M14 12h76M14 30h76M14 48h50" />
				<path d="M6 12h2M6 30h2M6 48h2" />
				{kind === 'recherche' ? (
					<>
						<circle cx="100" cy="46" r="14" />
						<path d="M110 56l12 12" />
					</>
				) : (
					<path d="M100 40l8 8 16-18" />
				)}
			</svg>
		);
	}
	return (
		<svg {...common}>
			<rect x="10" y="10" width="112" height="54" />
			<path d="M10 24h112M38 10v54M66 10v54M94 10v54" />
			<path d="M44 34h16v12H44z" fill="currentColor" stroke="none" opacity="0.5" />
			<path d="M10 4v10M122 4v10" />
		</svg>
	);
}

export function EmptyState({
	title,
	text,
	action,
	kind = 'agenda',
}: {
	title: string;
	text?: ReactNode;
	action?: ReactNode;
	kind?: 'agenda' | 'pont' | 'bulle' | 'liste' | 'recherche';
}) {
	return (
		<div className="pe-vide">
			<Dessin kind={kind} />
			<p className="pe-vide__titre">{title}</p>
			{text && <p>{text}</p>}
			{action && <div className="mt-1">{action}</div>}
		</div>
	);
}

/**
 * Chiffre qui roule (NumberFlow) : part de 0 au premier affichage puis suit la valeur.
 * NumberFlow respecte de lui-même prefers-reduced-motion.
 */
export function Rolling({ value, format, suffix, className }: { value: number; format?: Format; suffix?: string; className?: string }) {
	const [shown, setShown] = useState(0);
	useEffect(() => {
		const id = requestAnimationFrame(() => setShown(value));
		return () => cancelAnimationFrame(id);
	}, [value]);
	return <NumberFlow className={className} value={shown} format={format} locales="fr-FR" suffix={suffix} />;
}

export const EUROS: Format = { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 };
export const EUROS_CENTS: Format = { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 };
