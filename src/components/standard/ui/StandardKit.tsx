/**
 * Primitives des espaces connectés Standard (tableau de bord pro, espace client) :
 * en-tête de page, panneau, pastille de statut, onglets, squelettes, état vide, panneau latéral.
 * Styles dans src/styles/standard.css (section « Espaces connectés », classes sa-…).
 */
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import type { Appointment } from '@/lib/queries';

/* ---------- En-tête de page ---------- */

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
	return (
		<header className="sa-pagehead">
			<div className="min-w-0">
				<h1 className="sa-h1">{title}</h1>
				{subtitle && <p className="sa-sub">{subtitle}</p>}
			</div>
			{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
		</header>
	);
}

/* ---------- Panneau ---------- */

export function Panel({
	title,
	description,
	actions,
	children,
	className = '',
	bodyClassName = 'sa-panel-body',
	as: Tag = 'section',
}: {
	title?: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
	bodyClassName?: string;
	as?: 'section' | 'div';
}) {
	return (
		<Tag className={`sa-panel ${className}`}>
			{(title || actions) && (
				<div className="sa-panel-head">
					<div className="min-w-0">
						{title && <h2 className="sa-panel-title">{title}</h2>}
						{description && <p className="sa-panel-desc">{description}</p>}
					</div>
					{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
				</div>
			)}
			<div className={bodyClassName}>{children}</div>
		</Tag>
	);
}

/* ---------- Pastille de statut ---------- */

export type Tone = Appointment['status'] | 'muted' | 'neutral';

export const statusTone: Record<Appointment['status'], Tone> = {
	pending: 'pending',
	confirmed: 'confirmed',
	cancelled: 'cancelled',
	completed: 'completed',
};

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
	return (
		<span className="sa-pill" data-tone={tone}>
			{children}
		</span>
	);
}

/* ---------- Onglets (souligné glissant ou segmenté) ---------- */

export interface TabItem<T extends string> {
	value: T;
	label: string;
	count?: number;
}

export function Tabs<T extends string>({
	items,
	value,
	onChange,
	label,
	variant = 'line',
	panelId,
}: {
	items: TabItem<T>[];
	value: T;
	onChange: (v: T) => void;
	label: string;
	variant?: 'line' | 'segmented';
	panelId?: string;
}) {
	const reduce = useReducedMotion();
	const groupId = useId();
	const refs = useRef<(HTMLButtonElement | null)[]>([]);

	function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
		let next = -1;
		if (e.key === 'ArrowRight') next = (index + 1) % items.length;
		else if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = items.length - 1;
		if (next < 0) return;
		e.preventDefault();
		onChange(items[next].value);
		refs.current[next]?.focus();
	}

	return (
		<div role="tablist" aria-label={label} className={variant === 'segmented' ? 'sa-seg' : 'sa-tabs'}>
			{items.map((item, i) => {
				const selected = item.value === value;
				// Aucun onglet actif (période personnalisée…) : le premier reste atteignable au clavier.
				const reachable = selected || (i === 0 && !items.some((x) => x.value === value));
				return (
					<button
						key={item.value}
						ref={(el) => {
							refs.current[i] = el;
						}}
						type="button"
						role="tab"
						aria-selected={selected}
						aria-controls={panelId}
						tabIndex={reachable ? 0 : -1}
						onClick={() => onChange(item.value)}
						onKeyDown={(e) => onKeyDown(e, i)}
						className="sa-tab"
					>
						{selected && (
							<motion.span
								layoutId={`sa-tab-${groupId}`}
								className="sa-tab-ind"
								transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
								aria-hidden="true"
							/>
						)}
						<span>{item.label}</span>
						{typeof item.count === 'number' && <span className="sa-tab-count">{item.count}</span>}
					</button>
				);
			})}
		</div>
	);
}

/* ---------- Squelettes ---------- */

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
	return <span aria-hidden="true" className={`sa-skel ${className}`} style={style} />;
}

/** Zone en cours de chargement : texte masqué pour les lecteurs d'écran, squelettes visibles. */
export function Busy({ children, label = 'Chargement…' }: { children: ReactNode; label?: string }) {
	return (
		<div aria-busy="true" aria-live="polite">
			<span className="sr-only">{label}</span>
			{children}
		</div>
	);
}

/** Squelette d'une page entière : en-tête, bandeau, lignes. */
export function PageSkeleton({ rows = 4, figures = true }: { rows?: number; figures?: boolean }) {
	return (
		<Busy>
			<div className="sa-pagehead">
				<div className="grid gap-3">
					<Skeleton className="h-9 w-56" />
					<Skeleton className="h-4 w-80 max-w-full" />
				</div>
			</div>
			{figures && (
				<div className="sa-panel mb-8 grid gap-6 p-5 md:grid-cols-3">
					{[0, 1, 2].map((i) => (
						<div key={i} className="grid gap-3">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-9 w-20" />
						</div>
					))}
				</div>
			)}
			<TableSkeleton rows={rows} />
		</Busy>
	);
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div className="sa-panel">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 border-b border-[var(--sa-line-soft)] px-5 py-4 last:border-b-0">
					<Skeleton className="h-9 w-9 shrink-0 rounded-full" />
					<div className="grid flex-1 gap-2">
						<Skeleton className="h-4 w-40 max-w-full" />
						<Skeleton className="h-3 w-56 max-w-full" />
					</div>
					<Skeleton className="hidden h-6 w-20 sm:block" />
				</div>
			))}
		</div>
	);
}

/* ---------- États vides ---------- */

export type EmptyIllustration = 'calendar' | 'list' | 'people' | 'chat' | 'search' | 'clock';

function EmptyArt({ kind }: { kind: EmptyIllustration }) {
	const common = { width: 56, height: 56, viewBox: '0 0 56 56', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
	switch (kind) {
		case 'calendar':
			return (
				<svg {...common}>
					<rect x="8" y="12" width="40" height="34" rx="3" />
					<path d="M8 21h40M18 8v8M38 8v8" />
					<path d="M16 29h6M25 29h6M34 29h6M16 37h6M25 37h6" opacity=".55" />
					<path d="M35 36.5l2.5 2.5 5-5" stroke="var(--color-brand)" strokeWidth="1.8" />
				</svg>
			);
		case 'people':
			return (
				<svg {...common}>
					<circle cx="22" cy="21" r="7" />
					<path d="M9 44c1.5-7.5 6.5-11 13-11s11.5 3.5 13 11" />
					<circle cx="38" cy="19" r="5" opacity=".55" />
					<path d="M37 29c5 0 9 2.6 10.5 8.5" opacity=".55" />
				</svg>
			);
		case 'chat':
			return (
				<svg {...common}>
					<path d="M9 14a4 4 0 0 1 4-4h22a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H20l-7 6v-6h0a4 4 0 0 1-4-4z" />
					<path d="M44 22h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-2v5l-6-5H27" opacity=".55" />
					<path d="M16 19h16M16 24h10" stroke="var(--color-brand)" />
				</svg>
			);
		case 'search':
			return (
				<svg {...common}>
					<circle cx="24" cy="24" r="12" />
					<path d="M33 33l11 11" />
					<path d="M19 24h10" stroke="var(--color-brand)" />
				</svg>
			);
		case 'clock':
			return (
				<svg {...common}>
					<circle cx="28" cy="28" r="18" />
					<path d="M28 18v10l7 5" stroke="var(--color-brand)" />
				</svg>
			);
		default:
			return (
				<svg {...common}>
					<rect x="10" y="9" width="36" height="38" rx="3" />
					<path d="M18 19h20M18 27h20M18 35h12" opacity=".55" />
					<path d="M14 19h.01M14 27h.01M14 35h.01" stroke="var(--color-brand)" strokeWidth="2.4" />
				</svg>
			);
	}
}

export function EmptyState({
	kind = 'list',
	title,
	children,
	action,
}: {
	kind?: EmptyIllustration;
	title: ReactNode;
	children?: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="sa-empty">
			<EmptyArt kind={kind} />
			<div className="min-w-0">
				<p className="sa-empty-title">{title}</p>
				{children && <div className="sa-empty-text">{children}</div>}
				{action && <div className="mt-3">{action}</div>}
			</div>
		</div>
	);
}

/* ---------- Panneau latéral glissant ---------- */

/** Garde la dernière valeur non nulle : le contenu reste affiché pendant l'animation de fermeture. */
export function useLastDefined<T>(value: T | null | undefined): T | null {
	const ref = useRef<T | null>(value ?? null);
	if (value !== null && value !== undefined) ref.current = value;
	return ref.current;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
	open,
	onClose,
	title,
	description,
	children,
	footer,
	width,
}: {
	open: boolean;
	onClose: () => void;
	title: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	/** Largeur maximale (CSS), 30rem par défaut */
	width?: string;
}) {
	const reduce = useReducedMotion();
	const panelRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef(onClose);
	closeRef.current = onClose;
	const titleId = useId();

	useEffect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		const root = document.documentElement;
		const prevOverflow = root.style.overflow;
		root.style.overflow = 'hidden';
		const timer = window.setTimeout(() => panelRef.current?.focus(), 20);
		function onKey(e: globalThis.KeyboardEvent) {
			if (e.key === 'Escape') {
				// Laisse un éventuel sous-dialogue (recadrage d'image…) traiter Échap en premier.
				if (e.defaultPrevented) return;
				closeRef.current();
			}
		}
		document.addEventListener('keydown', onKey);
		return () => {
			window.clearTimeout(timer);
			document.removeEventListener('keydown', onKey);
			root.style.overflow = prevOverflow;
			previous?.focus?.();
		};
	}, [open]);

	// Piège de focus minimal : Tab boucle dans le panneau.
	function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.key !== 'Tab' || !panelRef.current) return;
		const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
		if (nodes.length === 0) return;
		const first = nodes[0];
		const last = nodes[nodes.length - 1];
		if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	const ease = [0.22, 1, 0.36, 1] as const;

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="overlay"
						className="sa-overlay"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: reduce ? 0 : 0.2 }}
						onClick={onClose}
						aria-hidden="true"
					/>
					<motion.div
						key="sheet"
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						tabIndex={-1}
						onKeyDown={onKeyDown}
						className="sa-sheet"
						style={width ? ({ '--sa-sheet-w': width } as React.CSSProperties) : undefined}
						initial={reduce ? { opacity: 0 } : { x: '100%' }}
						animate={reduce ? { opacity: 1 } : { x: 0 }}
						exit={reduce ? { opacity: 0 } : { x: '100%' }}
						transition={{ duration: reduce ? 0 : 0.34, ease }}
					>
						<div className="sa-sheet-head">
							<div className="min-w-0">
								<h2 id={titleId} className="sa-sheet-title">
									{title}
								</h2>
								{description && <p className="sa-sheet-desc">{description}</p>}
							</div>
							<button type="button" onClick={onClose} className="sa-btn sa-btn--quiet sa-btn--icon -mr-2 -mt-1" aria-label="Fermer le panneau">
								<X size={18} />
							</button>
						</div>
						<div className="sa-sheet-body">{children}</div>
						{footer && <div className="sa-sheet-foot">{footer}</div>}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

/* ---------- Petits utilitaires d'affichage ---------- */

/** Bloc date compact : « 18 / nov. » */
export function DateBlock({ iso }: { iso: string }) {
	const d = new Date(iso);
	return (
		<span className="sa-date" aria-hidden="true">
			<b>{d.getDate()}</b>
			<span>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
		</span>
	);
}

/** Initiale (ou photo) d'un client. */
export function Initial({ name, url, large = false }: { name?: string | null; url?: string | null; large?: boolean }) {
	return (
		<span className={`sa-initial${large ? ' sa-initial--lg' : ''}`} aria-hidden="true">
			{url && url.startsWith('http') ? (
				<img src={url} alt="" className="h-full w-full object-cover" width={56} height={56} loading="lazy" decoding="async" />
			) : (
				(name?.trim().charAt(0) || '?').toUpperCase()
			)}
		</span>
	);
}
