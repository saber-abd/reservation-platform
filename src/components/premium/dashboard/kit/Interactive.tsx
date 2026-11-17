// Composants interactifs des espaces connectés Premium : jauge, onglets à indicateur glissant,
// panneau latéral, menu d'actions. Animations motion/react, toujours soumises à useReducedMotion().
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MoreHorizontal, X } from 'lucide-react';

/* ---------- Jauge à aiguille (même dessin que les cadrans du site) ---------- */

const GRADUATIONS = Array.from({ length: 11 }, (_, k) => {
	const a = ((135 + 27 * k) * Math.PI) / 180;
	const fort = k % 5 === 0;
	const r1 = fort ? 60 : 66;
	const r2 = 74;
	return {
		fort,
		x1: (100 + r1 * Math.cos(a)).toFixed(2),
		y1: (100 + r1 * Math.sin(a)).toFixed(2),
		x2: (100 + r2 * Math.cos(a)).toFixed(2),
		y2: (100 + r2 * Math.sin(a)).toFixed(2),
	};
});

/** `value` entre 0 et 1 ; l'aiguille et l'arc montent depuis 0 au premier affichage (transition CSS). */
export function Gauge({ value, ariaLabel, children, className = '' }: { value: number; ariaLabel: string; children?: ReactNode; className?: string }) {
	const [t, setT] = useState(0);
	useEffect(() => {
		const id = requestAnimationFrame(() => setT(Math.max(0, Math.min(1, value))));
		return () => cancelAnimationFrame(id);
	}, [value]);
	return (
		<div className={`pe-jauge ${className}`} style={{ ['--t' as string]: t }}>
			<svg viewBox="0 0 200 200" role="img" aria-label={ariaLabel}>
				<circle className="pe-jauge__piste" cx="100" cy="100" r="82" pathLength={100} transform="rotate(135 100 100)" />
				<circle className="pe-jauge__val" cx="100" cy="100" r="82" pathLength={100} transform="rotate(135 100 100)" />
				{GRADUATIONS.map((g, i) => (
					<line key={i} className={`pe-jauge__tick ${g.fort ? 'pe-jauge__tick--fort' : ''}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
				))}
				<g className="pe-jauge__aiguille">
					<line x1="100" y1="112" x2="100" y2="40" />
				</g>
				<circle className="pe-jauge__axe" cx="100" cy="100" r="6" />
			</svg>
			{children && <div className="pe-jauge__lecture" aria-hidden="true">{children}</div>}
		</div>
	);
}

/* ---------- Onglets ---------- */

export interface TabItem<T extends string> {
	value: T;
	label: string;
	count?: number;
	alert?: boolean;
}

/** Onglets accessibles (flèches, Début, Fin) ; l'indicateur glisse d'un onglet à l'autre (layoutId). */
export function Tabs<T extends string>({
	items,
	value,
	onChange,
	label,
	variant = 'ligne',
}: {
	items: TabItem<T>[];
	value: T;
	onChange: (v: T) => void;
	label: string;
	variant?: 'ligne' | 'boite';
}) {
	const reduce = useReducedMotion();
	const uid = useId();
	const refs = useRef<(HTMLButtonElement | null)[]>([]);

	function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		const idx = items.findIndex((i) => i.value === value);
		let next = idx;
		if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
		else if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = items.length - 1;
		else return;
		e.preventDefault();
		onChange(items[next].value);
		refs.current[next]?.focus();
	}

	return (
		<div role="tablist" aria-label={label} className={`pe-tabs ${variant === 'boite' ? 'pe-tabs--boite' : ''}`} onKeyDown={onKeyDown}>
			{items.map((item, i) => {
				const selected = item.value === value;
				return (
					<button
						key={item.value}
						ref={(el) => {
							refs.current[i] = el;
						}}
						type="button"
						role="tab"
						aria-selected={selected}
						tabIndex={selected ? 0 : -1}
						className="pe-tab"
						onClick={() => onChange(item.value)}
					>
						{selected && (
							<motion.span
								layoutId={`ind-${uid}`}
								className="pe-tab__ind"
								transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
							/>
						)}
						<span>{item.label}</span>
						{item.count !== undefined && (
							<span className="pe-tab__compte" data-alerte={item.alert && item.count > 0 ? 'true' : undefined}>
								{item.count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

/* ---------- Panneau latéral ---------- */

/**
 * Panneau qui glisse depuis la droite (rendu dans <body> pour échapper aux transformations
 * des conteneurs). Échap ou clic sur le voile : fermeture ; focus piégé dans le panneau
 * puis rendu à l'élément d'origine.
 */
export function SidePanel({
	open,
	onClose,
	title,
	children,
	footer,
	wide = false,
}: {
	open: boolean;
	onClose: () => void;
	title: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	wide?: boolean;
}) {
	const reduce = useReducedMotion();
	const [mounted, setMounted] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		const t = window.setTimeout(() => closeRef.current?.focus(), 30);
		function onKey(e: globalThis.KeyboardEvent) {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onCloseRef.current();
				return;
			}
			if (e.key !== 'Tab' || !panelRef.current) return;
			const focusables = panelRef.current.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			);
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
		document.addEventListener('keydown', onKey);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener('keydown', onKey);
			previous?.focus?.();
		};
	}, [open]);

	if (!mounted) return null;

	const dur = reduce ? 0 : 0.45;
	return createPortal(
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="voile"
						className="pe-voile"
						onClick={onClose}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: reduce ? 0 : 0.25 }}
					/>
					<motion.div
						key="panneau"
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						className={`pe-panneau ${wide ? 'pe-panneau--large' : ''}`}
						initial={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
						transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
					>
						<div className="pe-panneau__tete">
							<h2 id={titleId}>{title}</h2>
							<button ref={closeRef} type="button" className="pe-icone-btn" onClick={onClose} aria-label="Fermer le panneau">
								<X />
							</button>
						</div>
						<div className="pe-panneau__corps">{children}</div>
						{footer && <div className="pe-panneau__pied">{footer}</div>}
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body,
	);
}

/* ---------- Menu d'actions secondaires ---------- */

export interface MenuAction {
	label: string;
	icon?: ReactNode;
	onSelect: () => void;
	danger?: boolean;
}

export function ActionMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);
	const btnRef = useRef<HTMLButtonElement>(null);
	const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
	const reduce = useReducedMotion();

	useEffect(() => {
		if (!open) return;
		itemsRef.current[0]?.focus();
		function onDown(e: MouseEvent) {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('mousedown', onDown);
		return () => document.removeEventListener('mousedown', onDown);
	}, [open]);

	function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		const items = itemsRef.current.filter(Boolean) as HTMLButtonElement[];
		const idx = items.indexOf(document.activeElement as HTMLButtonElement);
		if (e.key === 'Escape') {
			e.stopPropagation();
			setOpen(false);
			btnRef.current?.focus();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			items[(idx + 1) % items.length]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			items[(idx - 1 + items.length) % items.length]?.focus();
		} else if (e.key === 'Tab') {
			setOpen(false);
		}
	}

	return (
		<div ref={wrapRef} className="relative" onClick={(e) => e.stopPropagation()}>
			<button
				ref={btnRef}
				type="button"
				className="pe-icone-btn"
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
			>
				<MoreHorizontal />
			</button>
			<AnimatePresence>
				{open && (
					<motion.div
						role="menu"
						aria-label={label}
						className="pe-menu"
						onKeyDown={onKeyDown}
						initial={{ opacity: 0, y: reduce ? 0 : -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: reduce ? 0 : 0.16 }}
					>
						{actions.map((a, i) => (
							<button
								key={a.label}
								ref={(el) => {
									itemsRef.current[i] = el;
								}}
								type="button"
								role="menuitem"
								data-danger={a.danger ? '' : undefined}
								onClick={() => {
									setOpen(false);
									a.onSelect();
								}}
							>
								{a.icon}
								{a.label}
							</button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
