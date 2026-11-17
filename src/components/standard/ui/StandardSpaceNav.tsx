import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ExternalLink, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { signOut } from '@/lib/auth';

export interface SpaceLink {
	label: string;
	/** Libellé court pour la barre d'onglets mobile */
	short?: string;
	href: string;
	icon: LucideIcon;
}

interface Props {
	basePath?: string;
	/** Chemin courant transmis par la page Astro : l'onglet actif est juste dès le rendu serveur. */
	currentPath?: string;
	links: SpaceLink[];
	/** Titre de la liste de navigation (« Espace pro », « Espace client ») */
	title: string;
	/** Barre d'onglets en bas de l'écran sur mobile (espace client) */
	bottomTabs?: boolean;
}

const normalize = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);

/**
 * Navigation des espaces connectés : liste verticale dans la barre latérale (bureau),
 * bouton « Menu » et tiroir (mobile), barre d'onglets basse pour l'espace client.
 * Rendue dans la barre latérale du layout (astro-island en display: contents).
 */
export default function StandardSpaceNav({ basePath = '', currentPath = '', links, title, bottomTabs = false }: Props) {
	const [path, setPath] = useState(normalize(currentPath));
	const [open, setOpen] = useState(false);
	const reduce = useReducedMotion();
	const buttonRef = useRef<HTMLButtonElement>(null);
	const effectiveBasePath = basePath || (path.match(/^\/(demo-[^/]+)/)?.[0] ?? '');

	useEffect(() => {
		setPath(normalize(window.location.pathname));
	}, []);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				setOpen(false);
				buttonRef.current?.focus();
			}
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open]);

	async function handleSignOut() {
		await signOut();
		window.location.href = effectiveBasePath ? `${effectiveBasePath}/connexion` : '/demo-standard/connexion';
	}

	const isActive = (href: string) => path === normalize(`${basePath}${href}`);

	const linkList = (onNavigate?: () => void) =>
		links.map((link) => {
			const Icon = link.icon;
			return (
				<a
					key={link.href}
					href={`${basePath}${link.href}`}
					className="sa-nav-link"
					aria-current={isActive(link.href) ? 'page' : undefined}
					onClick={onNavigate}
				>
					<Icon size={18} strokeWidth={1.7} aria-hidden="true" />
					{link.label}
				</a>
			);
		});

	const footer = (
		<div className="sa-side-foot">
			<a href={`${effectiveBasePath}/`}>
				<ArrowLeft size={16} strokeWidth={1.7} aria-hidden="true" />
				Retour au site
			</a>
			<a href="/">
				<ExternalLink size={16} strokeWidth={1.7} aria-hidden="true" />
				Portfolio
			</a>
			<button type="button" onClick={handleSignOut}>
				<LogOut size={16} strokeWidth={1.7} aria-hidden="true" />
				Se déconnecter
			</button>
		</div>
	);

	return (
		<>
			{/* Bureau : navigation verticale */}
			<nav aria-label={title} className="sa-nav max-lg:hidden">
				<p className="sa-nav-title">{title}</p>
				{linkList()}
			</nav>
			<div className="contents max-lg:hidden">{footer}</div>

			{/* Mobile : bouton Menu + tiroir */}
			<button
				ref={buttonRef}
				type="button"
				className="sa-menu-btn lg:hidden"
				aria-expanded={open}
				aria-controls="sa-drawer"
				onClick={() => setOpen((v) => !v)}
			>
				{open ? <X size={17} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />}
				Menu
			</button>
			<AnimatePresence>
				{open && (
					<>
						<motion.div
							key="scrim"
							className="sa-drawer-scrim lg:hidden"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: reduce ? 0 : 0.2 }}
							onClick={() => setOpen(false)}
							aria-hidden="true"
						/>
						<motion.div
							key="drawer"
							id="sa-drawer"
							className="sa-drawer lg:hidden"
							initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
							transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
						>
							<nav aria-label={title} className="sa-nav">
								<p className="sa-nav-title">{title}</p>
								{linkList(() => setOpen(false))}
							</nav>
							{footer}
						</motion.div>
					</>
				)}
			</AnimatePresence>

			{/* Mobile, espace client : onglets en bas d'écran */}
			{bottomTabs && (
				<nav aria-label={`${title} (raccourcis)`} className="sa-tabbar lg:hidden">
					{links.map((link) => {
						const Icon = link.icon;
						return (
							<a key={link.href} href={`${basePath}${link.href}`} aria-current={isActive(link.href) ? 'page' : undefined}>
								<Icon size={20} strokeWidth={1.7} aria-hidden="true" />
								{link.short ?? link.label}
							</a>
						);
					})}
				</nav>
			)}
		</>
	);
}
