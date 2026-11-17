// Primitives des espaces connectés Diamant : squelettes, états vides dessinés, pastilles,
// avatars, contrôle segmenté, panneau latéral, fenêtre, menu d'actions, chiffres animés, courbe.
// Habillage : classes dx-* de src/styles/diamant.css (section « Espaces connectés »).
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { MoreHorizontal, X } from 'lucide-react';

export const EASE = [0.22, 1, 0.36, 1] as const;

export function cx(...parts: (string | false | null | undefined)[]) {
	return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Chargement                                                          */
/* ------------------------------------------------------------------ */

export function Squelette({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
	return <span aria-hidden="true" className={cx('dx-squelette block', className)} style={style} />;
}

/** Zone en cours de chargement : squelettes visibles, texte masqué pour les lecteurs d'écran. */
export function EnChargement({ label = 'Chargement…', className = '', children }: { label?: string; className?: string; children: React.ReactNode }) {
	return (
		<div aria-busy="true" className={className}>
			<span className="sr-only" role="status">{label}</span>
			{children}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* États vides dessinés                                                */
/* ------------------------------------------------------------------ */

type Dessin = 'agenda' | 'ciseaux' | 'messages' | 'recherche' | 'clients' | 'releve' | 'etoile';

function DessinVide({ type }: { type: Dessin }) {
	const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
	return (
		<svg viewBox="0 0 120 84" width="120" height="84" aria-hidden="true" className="text-dx-sable">
			<path d="M8 76h104" {...common} opacity="0.6" />
			{type === 'agenda' && (
				<g {...common}>
					<rect x="30" y="14" width="60" height="54" rx="6" />
					<path d="M30 28h60M44 8v12M76 8v12" />
					<path d="M42 40h8M56 40h8M70 40h8M42 52h8M56 52h8" opacity="0.7" />
					<circle cx="74" cy="52" r="5" className="text-dx-terre" stroke="currentColor" style={{ color: 'var(--dx-terre)' }} />
				</g>
			)}
			{type === 'ciseaux' && (
				<g {...common}>
					<circle cx="40" cy="56" r="9" />
					<circle cx="40" cy="28" r="9" />
					<path d="M48 52 92 22M48 32l44 30" />
					<circle cx="62" cy="42" r="2" style={{ color: 'var(--dx-terre)' }} stroke="currentColor" />
				</g>
			)}
			{type === 'messages' && (
				<g {...common}>
					<path d="M24 18h48a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H42l-12 10v-10h-6a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6Z" />
					<path d="M60 40h32a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6h-4v8l-10-8H60" style={{ color: 'var(--dx-terre)' }} stroke="currentColor" />
					<path d="M32 32h30M32 40h18" opacity="0.7" />
				</g>
			)}
			{type === 'recherche' && (
				<g {...common}>
					<circle cx="54" cy="38" r="20" />
					<path d="m69 53 18 18" style={{ color: 'var(--dx-terre)' }} stroke="currentColor" strokeWidth="2.5" />
					<path d="M44 34a10 10 0 0 1 10-8" opacity="0.6" />
				</g>
			)}
			{type === 'clients' && (
				<g {...common}>
					<circle cx="46" cy="30" r="10" />
					<path d="M28 66c0-12 8-20 18-20s18 8 18 20" />
					<circle cx="78" cy="34" r="8" style={{ color: 'var(--dx-terre)' }} stroke="currentColor" />
					<path d="M68 66c0-9 4-16 10-16s12 7 12 16" style={{ color: 'var(--dx-terre)' }} stroke="currentColor" />
				</g>
			)}
			{type === 'releve' && (
				<g {...common}>
					<path d="M38 10h44v62l-7-5-7 5-8-5-7 5-8-5-7 5Z" />
					<path d="M48 26h24M48 36h24M48 46h14" opacity="0.7" />
					<path d="M64 54h8" style={{ color: 'var(--dx-terre)' }} stroke="currentColor" strokeWidth="2.5" />
				</g>
			)}
			{type === 'etoile' && (
				<g {...common}>
					<path d="m60 14 9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3Z" />
					<circle cx="60" cy="42" r="4" style={{ color: 'var(--dx-terre)' }} stroke="currentColor" />
				</g>
			)}
		</svg>
	);
}

export function EtatVide({
	dessin,
	titre,
	texte,
	action,
	className = '',
}: {
	dessin: Dessin;
	titre: string;
	texte?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
			<DessinVide type={dessin} />
			<p className="dx-h3 mt-4">{titre}</p>
			{texte && <p className="mt-1.5 max-w-sm text-sm text-dx-gris">{texte}</p>}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Pastilles et avatars                                                */
/* ------------------------------------------------------------------ */

export type Ton = 'ok' | 'attente' | 'alerte' | 'terre' | 'encre' | 'neutre';

export function Pastille({ ton = 'neutre', children, className = '', nu = false }: { ton?: Ton; children: React.ReactNode; className?: string; nu?: boolean }) {
	return (
		<span data-ton={ton} className={cx('dx-pastille', nu && 'dx-pastille--nu', className)}>
			{children}
		</span>
	);
}

export const STATUT_RDV: Record<string, { label: string; ton: Ton }> = {
	pending: { label: 'En attente', ton: 'attente' },
	confirmed: { label: 'Confirmé', ton: 'terre' },
	cancelled: { label: 'Annulé', ton: 'neutre' },
	completed: { label: 'Terminé', ton: 'ok' },
};

export function PastilleStatut({ statut }: { statut: string }) {
	const meta = STATUT_RDV[statut] ?? { label: statut, ton: 'neutre' as Ton };
	return <Pastille ton={meta.ton}>{meta.label}</Pastille>;
}

export function Avatar({
	nom,
	url,
	taille = 36,
	ton,
	className = '',
}: {
	nom?: string | null;
	url?: string | null;
	taille?: number;
	ton?: 'terre' | 'encre' | 'alerte';
	className?: string;
}) {
	const initiale = (nom || '?').trim().charAt(0).toUpperCase() || '?';
	return (
		<span
			data-ton={ton}
			className={cx('dx-avatar', className)}
			style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.42) }}
			aria-hidden="true"
		>
			{url && url.startsWith('http') ? <img src={url} alt="" width={taille} height={taille} loading="lazy" decoding="async" /> : initiale}
		</span>
	);
}

/* ------------------------------------------------------------------ */
/* Contrôle segmenté (périodes, vues, onglets)                         */
/* ------------------------------------------------------------------ */

export interface OptionSegment<T extends string> {
	value: T;
	label: React.ReactNode;
	title?: string;
}

export function Segments<T extends string>({
	options,
	value,
	onChange,
	label,
	role = 'tablist',
	className = '',
	taille = 'md',
}: {
	options: OptionSegment<T>[];
	value: T;
	onChange: (v: T) => void;
	label: string;
	role?: 'tablist' | 'radiogroup';
	className?: string;
	taille?: 'sm' | 'md';
}) {
	const id = useId();
	const reduit = useReducedMotion();
	const refs = useRef<(HTMLButtonElement | null)[]>([]);

	function onKey(e: React.KeyboardEvent, index: number) {
		if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
		e.preventDefault();
		let next = index;
		if (e.key === 'ArrowRight') next = (index + 1) % options.length;
		if (e.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
		if (e.key === 'Home') next = 0;
		if (e.key === 'End') next = options.length - 1;
		onChange(options[next].value);
		refs.current[next]?.focus();
	}

	return (
		<div role={role} aria-label={label} className={cx('dx-segments', className)}>
			{options.map((o, i) => {
				const actif = o.value === value;
				return (
					<button
						key={o.value}
						ref={(el) => {
							refs.current[i] = el;
						}}
						type="button"
						role={role === 'tablist' ? 'tab' : 'radio'}
						aria-selected={role === 'tablist' ? actif : undefined}
						aria-checked={role === 'radiogroup' ? actif : undefined}
						tabIndex={actif ? 0 : -1}
						title={o.title}
						onClick={() => onChange(o.value)}
						onKeyDown={(e) => onKey(e, i)}
						className={cx('dx-segment', taille === 'sm' && '!px-3 !py-1.5 !text-xs')}
					>
						{actif && (
							<motion.span
								layoutId={`seg-${id}`}
								className="dx-segment-fond"
								transition={reduit ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
							/>
						)}
						{o.label}
					</button>
				);
			})}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Couche flottante : portail + Échap + focus                          */
/* ------------------------------------------------------------------ */

function usePortail() {
	const [cible, setCible] = useState<HTMLElement | null>(null);
	useEffect(() => setCible(document.body), []);
	return cible;
}

// Pile des couches ouvertes : seule la plus haute réagit à Échap et au piège de focus.
const pileCouches: symbol[] = [];

function useCouche(ouvert: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
	const fermer = useRef(onClose);
	fermer.current = onClose;
	useEffect(() => {
		if (!ouvert) return;
		const jeton = Symbol('couche');
		pileCouches.push(jeton);
		const precedent = document.activeElement as HTMLElement | null;
		const t = window.setTimeout(() => {
			const el = ref.current;
			if (!el) return;
			const cible = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>('input, select, textarea, button, a[href]');
			cible?.focus();
		}, 60);
		function onKey(e: KeyboardEvent) {
			if (pileCouches[pileCouches.length - 1] !== jeton) return;
			if (e.key === 'Escape') {
				e.stopPropagation();
				fermer.current();
				return;
			}
			if (e.key === 'Tab' && ref.current) {
				const items = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'));
				if (items.length === 0) return;
				const premier = items[0];
				const dernier = items[items.length - 1];
				if (e.shiftKey && document.activeElement === premier) {
					e.preventDefault();
					dernier.focus();
				} else if (!e.shiftKey && document.activeElement === dernier) {
					e.preventDefault();
					premier.focus();
				}
			}
		}
		document.addEventListener('keydown', onKey);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener('keydown', onKey);
			const i = pileCouches.indexOf(jeton);
			if (i >= 0) pileCouches.splice(i, 1);
			precedent?.focus?.();
		};
	}, [ouvert, ref]);
}

/** Panneau latéral glissant depuis la droite (fiche client, détail d'un rendez-vous…). */
export function Panneau({
	ouvert,
	onClose,
	titre,
	sousTitre,
	entete,
	children,
	pied,
	largeur = 560,
}: {
	ouvert: boolean;
	onClose: () => void;
	titre: React.ReactNode;
	sousTitre?: React.ReactNode;
	entete?: React.ReactNode;
	children: React.ReactNode;
	pied?: React.ReactNode;
	largeur?: number;
}) {
	const cible = usePortail();
	const reduit = useReducedMotion();
	const ref = useRef<HTMLDivElement>(null);
	const titreId = useId();
	useCouche(ouvert, onClose, ref);
	if (!cible) return null;
	return createPortal(
		<AnimatePresence>
			{ouvert && (
				<>
					<motion.div
						key="voile"
						className="dx-voile"
						onClick={onClose}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: reduit ? 0 : 0.25 }}
					/>
					<motion.div
						key="panneau"
						ref={ref}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titreId}
						className="dx-panneau"
						style={{ width: `min(${largeur}px, 100vw)` }}
						initial={reduit ? { opacity: 0 } : { x: '100%' }}
						animate={reduit ? { opacity: 1 } : { x: 0 }}
						exit={reduit ? { opacity: 0 } : { x: '100%' }}
						transition={reduit ? { duration: 0 } : { duration: 0.45, ease: EASE }}
					>
						<div className="dx-panneau__tete">
							<div className="min-w-0 flex-1">
								{entete}
								<h2 id={titreId} className="dx-h2 break-words">{titre}</h2>
								{sousTitre && <div className="mt-1 text-sm text-dx-gris">{sousTitre}</div>}
							</div>
							<button type="button" onClick={onClose} className="dx-icone-btn -mr-2 -mt-1" aria-label="Fermer le panneau">
								<X size={18} />
							</button>
						</div>
						<div className="dx-panneau__corps">{children}</div>
						{pied && <div className="border-t border-dx-filet bg-dx-papier px-6 py-4">{pied}</div>}
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		cible
	);
}

/** Fenêtre centrée (confirmation, formulaire court). */
export function Fenetre({
	ouvert,
	onClose,
	titre,
	sousTitre,
	icone,
	children,
	pied,
	largeur = 480,
	fermerSurVoile = true,
}: {
	ouvert: boolean;
	onClose: () => void;
	titre: React.ReactNode;
	sousTitre?: React.ReactNode;
	icone?: React.ReactNode;
	children?: React.ReactNode;
	pied?: React.ReactNode;
	largeur?: number;
	fermerSurVoile?: boolean;
}) {
	const cible = usePortail();
	const reduit = useReducedMotion();
	const ref = useRef<HTMLDivElement>(null);
	const titreId = useId();
	useCouche(ouvert, onClose, ref);
	if (!cible) return null;
	return createPortal(
		<AnimatePresence>
			{ouvert && (
				<>
					<motion.div
						key="voile"
						className="dx-voile"
						onClick={fermerSurVoile ? onClose : undefined}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: reduit ? 0 : 0.2 }}
					/>
					<div className="dx-fenetre-cadre">
						<motion.div
							key="fenetre"
							ref={ref}
							role="dialog"
							aria-modal="true"
							aria-labelledby={titreId}
							className="dx-fenetre"
							style={{ maxWidth: largeur }}
							initial={reduit ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
							animate={reduit ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
							exit={reduit ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
							transition={reduit ? { duration: 0 } : { duration: 0.35, ease: EASE }}
						>
							<div className="dx-fenetre__tete">
								{icone && <span className="mt-0.5 inline-grid h-10 w-10 flex-none place-items-center rounded-full bg-dx-ivoire text-dx-terre">{icone}</span>}
								<div className="min-w-0 flex-1">
									<h2 id={titreId} className="dx-h2">{titre}</h2>
									{sousTitre && <div className="mt-1 text-sm text-dx-gris">{sousTitre}</div>}
								</div>
								<button type="button" onClick={onClose} className="dx-icone-btn -mr-2 -mt-1" aria-label="Fermer">
									<X size={18} />
								</button>
							</div>
							{children && <div className="dx-fenetre__corps">{children}</div>}
							{pied && <div className="dx-fenetre__pied">{pied}</div>}
						</motion.div>
					</div>
				</>
			)}
		</AnimatePresence>,
		cible
	);
}

/* ------------------------------------------------------------------ */
/* Menu d'actions secondaires                                          */
/* ------------------------------------------------------------------ */

export function MenuActions({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
	const [ouvert, setOuvert] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const reduit = useReducedMotion();
	useEffect(() => {
		if (!ouvert) return;
		function onDoc(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setOuvert(false);
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('.dx-menu button, .dx-menu a') ?? []);
				if (!items.length) return;
				e.preventDefault();
				const i = items.indexOf(document.activeElement as HTMLElement);
				const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
				items[n].focus();
			}
		}
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>('.dx-menu button, .dx-menu a')?.focus(), 30);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [ouvert]);
	return (
		<div ref={ref} className={cx('relative inline-block', className)} onClick={(e) => e.stopPropagation()}>
			<button
				type="button"
				className="dx-icone-btn"
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={ouvert}
				onClick={() => setOuvert((o) => !o)}
			>
				<MoreHorizontal size={18} />
			</button>
			<AnimatePresence>
				{ouvert && (
					<motion.div
						role="menu"
						className="dx-menu"
						initial={reduit ? false : { opacity: 0, y: -4, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={reduit ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
						transition={{ duration: reduit ? 0 : 0.16 }}
						onClick={() => setOuvert(false)}
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Chiffres                                                            */
/* ------------------------------------------------------------------ */

/** Chiffre qui roule quand il change (NumberFlow), en Fraunces. */
export function Chiffre({
	valeur,
	euros = false,
	suffixe,
	prefixe,
	className = '',
}: {
	valeur: number;
	euros?: boolean;
	suffixe?: string;
	prefixe?: string;
	className?: string;
}) {
	return (
		<NumberFlow
			value={Number.isFinite(valeur) ? valeur : 0}
			locales="fr-FR"
			format={euros ? { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 }}
			suffix={suffixe}
			prefix={prefixe}
			className={cx('dx-chiffre', className)}
		/>
	);
}

/** Petite courbe (SVG) : tracé dessiné à l'apparition, aire en dégradé léger. Largeur mesurée
 * (ResizeObserver) pour un trait net, sans étirement. */
export function Courbe({
	valeurs,
	hauteur = 44,
	couleur = 'var(--dx-terre)',
	className = '',
}: {
	valeurs: number[];
	hauteur?: number;
	couleur?: string;
	className?: string;
}) {
	const id = useId().replace(/:/g, '');
	const reduit = useReducedMotion();
	const boite = useRef<HTMLDivElement>(null);
	const [largeur, setLargeur] = useState(0);
	useEffect(() => {
		const el = boite.current;
		if (!el) return;
		setLargeur(el.clientWidth);
		const ro = new ResizeObserver(() => setLargeur(el.clientWidth));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const pts = valeurs.length === 1 ? [valeurs[0], valeurs[0]] : valeurs;
	if (pts.length === 0) return null;
	const l = Math.max(largeur, 1);
	const max = Math.max(...pts, 1);
	const min = Math.min(...pts, 0);
	const pas = (l - 6) / (pts.length - 1);
	const y = (v: number) => hauteur - 4 - ((v - min) / (max - min || 1)) * (hauteur - 10);
	const coords = pts.map((v, i) => [3 + i * pas, y(v)] as const);
	const d = coords.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
	const aire = `${d} L${coords[coords.length - 1][0].toFixed(1)} ${hauteur} L3 ${hauteur} Z`;
	const [dx, dy] = coords[coords.length - 1];
	return (
		<div ref={boite} className={cx('w-full', className)} style={{ height: hauteur }}>
			{largeur > 0 && (
				<svg viewBox={`0 0 ${l} ${hauteur}`} width={l} height={hauteur} aria-hidden="true" className="block overflow-visible">
					<defs>
						<linearGradient id={`c-${id}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={couleur} stopOpacity="0.2" />
							<stop offset="100%" stopColor={couleur} stopOpacity="0" />
						</linearGradient>
					</defs>
					<motion.path
						d={aire}
						fill={`url(#c-${id})`}
						initial={reduit ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.8, delay: 0.5 }}
					/>
					<motion.path
						d={d}
						fill="none"
						stroke={couleur}
						strokeWidth="1.75"
						strokeLinejoin="round"
						strokeLinecap="round"
						initial={reduit ? false : { pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={{ duration: 1.2, ease: EASE }}
					/>
					<motion.circle
						cx={dx}
						cy={dy}
						r="3.5"
						fill="var(--dx-carte)"
						stroke={couleur}
						strokeWidth="1.75"
						initial={reduit ? false : { opacity: 0, scale: 0.4 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.4, delay: reduit ? 0 : 1.1 }}
					/>
				</svg>
			)}
		</div>
	);
}

/** En-tête de section dans une carte : titre + action à droite. */
export function TeteCarte({ titre, sousTitre, action, className = '' }: { titre: React.ReactNode; sousTitre?: React.ReactNode; action?: React.ReactNode; className?: string }) {
	return (
		<div className={cx('flex items-start justify-between gap-4', className)}>
			<div className="min-w-0">
				<h2 className="dx-h2">{titre}</h2>
				{sousTitre && <p className="dx-meta mt-1">{sousTitre}</p>}
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</div>
	);
}
