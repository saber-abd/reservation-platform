import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Avatar, Pastille } from './kit/primitives';
import { supabase } from '@/lib/supabase';
import { 
	Home, 
	Calendar, 
	Users, 
	Settings, 
	LogOut, 
	BarChart3, 
	Scissors, 
	Search, 
	MessageSquare, 
	ShieldCheck,
	Lock
} from 'lucide-react';
import { getActiveProRole, getRealProRole, setActiveProRole, getProSession, clearProSession, loadProContext, type ProRole } from '@/lib/permissions';

interface DiamantDashboardNavProps {
	basePath: string;
}

export default function DiamantDashboardNav({ basePath }: DiamantDashboardNavProps) {
	// Lus après le montage : le rendu serveur n'a ni l'URL du client ni le localStorage
	const [currentPath, setCurrentPath] = React.useState('');
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [role, setRole] = React.useState<ProRole>('admin');
	const [realRole, setRealRole] = React.useState<ProRole | null>(null);
	const [proUser, setProUser] = React.useState<ReturnType<typeof getProSession>>(null);
	const reduit = useReducedMotion();

	// Espace pro réservé aux comptes connectés : sans session, renvoi vers la connexion (qui propose
	// l'accès au compte de démonstration) ; compte client connecté, renvoi vers son espace client.
	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			const session = await supabase.auth.getSession().then((r) => r.data.session).catch(() => null);
			if (cancelled) return;
			if (!session) {
				window.location.href = `${basePath}/connexion`;
				return;
			}
			if (!getRealProRole()) {
				const ctx = await loadProContext();
				if (!cancelled && !ctx) window.location.href = `${basePath}/espace-client`;
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [basePath]);

	React.useEffect(() => {
		setCurrentPath(window.location.pathname);
		setProUser(getProSession());
		setRole(getActiveProRole());
		setRealRole(getRealProRole());

		async function checkUnread() {
			try {
				let total = 0;
				if (typeof window !== 'undefined') {
					const saved = localStorage.getItem('diamant_conversations_meta');
					if (saved) {
						const parsed = JSON.parse(saved);
						for (const k in parsed) {
							if (parsed[k]?.unread_by_pro) total += parsed[k].unread_by_pro;
						}
					}
				}
				setUnreadCount(total);
			} catch (e) {}
		}

		checkUnread();

		const onMsgUpdate = () => checkUnread();
		const onRoleChange = (e: any) => {
			if (e.detail?.role) setRole(e.detail.role);
			setProUser(getProSession());
			setRealRole(getRealProRole());
			// La session (nom, email) est enregistrée juste après l'événement : relecture au tour suivant.
			window.setTimeout(() => setProUser(getProSession()), 0);
		};

		window.addEventListener('diamant:new-message', onMsgUpdate);
		window.addEventListener('diamant:messages-read', onMsgUpdate);
		window.addEventListener('storage', onMsgUpdate);
		window.addEventListener('pro:role-changed', onRoleChange);

		return () => {
			window.removeEventListener('diamant:new-message', onMsgUpdate);
			window.removeEventListener('diamant:messages-read', onMsgUpdate);
			window.removeEventListener('storage', onMsgUpdate);
			window.removeEventListener('pro:role-changed', onRoleChange);
		};
	}, []);

	function handleSwitchRole(newRole: ProRole) {
		setActiveProRole(newRole);
		setRole(newRole);

		// Si l'utilisateur est sur une page interdite à l'employé, on le redirige vers le planning
		if (newRole === 'employee') {
			const forbidden = ['/dashboard/services', '/dashboard/statistiques', '/dashboard/droits', '/dashboard'].map(p => `${basePath}${p}`);
			const isForbidden = forbidden.some(p => currentPath === p || currentPath === `${p}/`);
			if (isForbidden) {
				window.location.href = `${basePath}/dashboard/disponibilites`;
			}
		}
	}

	// Liste complète des liens pour l'Administrateur et le mode Démo (lecture seule)
	const allLinks = [
		{ href: `${basePath}/dashboard`, label: 'Tableau de bord', icon: Home, roles: ['admin', 'demo'] },
		{ href: `${basePath}/dashboard/disponibilites`, label: 'Planning & RDV', icon: Calendar, roles: ['admin', 'employee', 'demo'] },
		{ href: `${basePath}/dashboard/clients`, label: 'Clientèle', icon: Users, roles: ['admin', 'employee', 'demo'] },
		{ href: `${basePath}/dashboard/messages`, label: 'Messagerie', icon: MessageSquare, badge: unreadCount, roles: ['admin', 'employee', 'demo'] },
		{ href: `${basePath}/dashboard/services`, label: 'Gestion des prestations', icon: Scissors, roles: ['admin', 'demo'] },
		{ href: `${basePath}/dashboard/statistiques`, label: 'Statistiques', icon: BarChart3, roles: ['admin', 'demo'] },
		{ href: `${basePath}/dashboard/recherche`, label: 'Recherche', icon: Search, roles: ['admin', 'employee', 'demo'] },
		{ href: `${basePath}/dashboard/profil`, label: 'Profil Maison', icon: Settings, roles: ['admin', 'demo'] },
		{ href: `${basePath}/dashboard/droits`, label: 'Gestion des droits', icon: ShieldCheck, roles: ['admin', 'demo'] },
	];

	// Filtrer selon le rôle actif : l'employé n'accède QU'À planning, clientèle, messagerie, recherche. Le mode démo accède à tout en lecture seule.
	const visibleLinks = allLinks.filter(link => link.roles.includes(role));

	async function handleLogout() {
		try {
			await supabase.auth.signOut();
			localStorage.removeItem('diamant_client_avatar');
			clearProSession();
		} catch (e) {
			console.error('Erreur déconnexion:', e);
		}
		window.location.href = `${basePath}/connexion`;
	}

	const groupes: { titre: string; hrefs: string[] }[] = [
		{ titre: 'Pilotage', hrefs: [`${basePath}/dashboard`, `${basePath}/dashboard/statistiques`] },
		{ titre: 'Au quotidien', hrefs: [`${basePath}/dashboard/disponibilites`, `${basePath}/dashboard/clients`, `${basePath}/dashboard/messages`, `${basePath}/dashboard/recherche`] },
		{ titre: 'La maison', hrefs: [`${basePath}/dashboard/services`, `${basePath}/dashboard/profil`, `${basePath}/dashboard/droits`] },
	];

	const libelleRole = role === 'admin' ? 'Gérant' : role === 'demo' ? 'Démo' : 'Employé';

	return (
		<nav className="flex flex-col gap-6" aria-label="Espace pro">
			{/* Identité et aperçu du rôle (le rôle réel vient de my_pro_context) */}
			<div className="dx-si-deplie rounded-[14px] border border-dx-filet bg-dx-carte p-3">
				<div className="flex items-center gap-3">
					<Avatar nom={proUser?.name || 'Équipe'} taille={36} ton="encre" />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-dx-encre">{proUser?.name || 'Espace pro'}</p>
						<p className="truncate text-xs text-dx-gris">{proUser?.email || libelleRole}</p>
					</div>
					<Pastille ton={role === 'admin' ? 'terre' : role === 'demo' ? 'encre' : 'neutre'} nu>
						{libelleRole}
					</Pastille>
				</div>
				{realRole === 'admin' && (
					<div className="mt-3 border-t border-dx-filet pt-3">
						<p id="dx-nav-role" className="mb-2 text-xs font-semibold text-dx-gris">Voir l'espace en tant que</p>
						<div role="radiogroup" aria-labelledby="dx-nav-role" className="dx-segments grid w-full grid-cols-3">
							{([
								{ r: 'admin', label: 'Admin', title: 'Accès Administrateur complet' },
								{ r: 'employee', label: 'Employé', title: 'Accès Employé opérationnel' },
								{ r: 'demo', label: 'Démo', title: 'Mode Démo découverte (Lecture seule pour prospects)' },
							] as const).map((o) => {
								const actif = role === o.r;
								return (
									<button
										key={o.r}
										type="button"
										role="radio"
										aria-checked={actif}
										title={o.title}
										onClick={() => handleSwitchRole(o.r)}
										className="dx-segment !px-1 text-center"
									>
										{actif && (
											<motion.span
												layoutId="dx-nav-role-fond"
												className="dx-segment-fond"
												transition={reduit ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
											/>
										)}
										{o.label}
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Barre repliée : seul l'avatar reste */}
			<div className="dx-si-replie flex justify-center" title={`${proUser?.name || 'Espace pro'} · ${libelleRole}`}>
				<Avatar nom={proUser?.name || 'Équipe'} taille={36} ton="encre" />
			</div>

			{role === 'demo' && (
				<div className="dx-si-deplie dx-bandeau !py-3 text-xs leading-snug" data-ton="lecture">
					<Lock size={15} className="mt-0.5 flex-none text-dx-terre-clair" />
					<p>
						<b className="block">Mode découverte</b>
						Consultation complète en lecture seule. Les modifications et suppressions sont désactivées.
					</p>
				</div>
			)}

			{groupes.map((g) => {
				const liens = visibleLinks.filter((l) => g.hrefs.includes(l.href));
				if (liens.length === 0) return null;
				return (
					<div key={g.titre} className="flex flex-col gap-0.5">
						<p className="dx-rubrique dx-label mb-1.5">{g.titre}</p>
						{liens.map((link) => {
							const isActive = currentPath === link.href || currentPath === `${link.href}/`;
							const Icon = link.icon;
							return (
								<a
									key={link.href}
									href={link.href}
									aria-current={isActive ? 'page' : undefined}
									title={link.label}
									className="dx-nav-lien"
								>
									{isActive && <span className="dx-nav-actif" aria-hidden="true" />}
									<Icon size={18} />
									<span className="dx-label flex-1 truncate">{link.label}</span>
									{link.badge && link.badge > 0 ? (
										<span className="dx-nav-badge" aria-label={`${link.badge} non lu${link.badge > 1 ? 's' : ''}`}>
											{link.badge}
										</span>
									) : null}
								</a>
							);
						})}
					</div>
				);
			})}

			<div className="border-t border-dx-filet pt-4">
				<button
					type="button"
					onClick={handleLogout}
					title="Déconnexion"
					className="dx-nav-lien w-full cursor-pointer text-left hover:!text-dx-alerte"
				>
					<LogOut size={18} />
					<span className="dx-label">Déconnexion</span>
				</button>
			</div>
		</nav>
	);
}
