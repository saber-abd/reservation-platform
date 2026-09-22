import React from 'react';
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
import { getActiveProRole, setActiveProRole, getProSession, clearProSession, type ProRole } from '@/lib/permissions';

interface DiamantDashboardNavProps {
	basePath: string;
}

export default function DiamantDashboardNav({ basePath }: DiamantDashboardNavProps) {
	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
	const [unreadCount, setUnreadCount] = React.useState(0);
	const [role, setRole] = React.useState<ProRole>('admin');
	const [proUser, setProUser] = React.useState(getProSession());

	React.useEffect(() => {
		setRole(getActiveProRole());

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
			const forbidden = ['/dashboard/services', '/dashboard/statistiques', '/dashboard/droits', `${basePath}/dashboard`];
			const isForbidden = forbidden.some(p => currentPath === p || currentPath === `${p}/`);
			if (isForbidden) {
				window.location.href = `${basePath}/dashboard/disponibilites`;
			}
		}
	}

	// Liste complète des liens pour l'Administrateur
	const allLinks = [
		{ href: `${basePath}/dashboard`, label: 'Tableau de bord', icon: Home, roles: ['admin'] },
		{ href: `${basePath}/dashboard/disponibilites`, label: 'Planning & RDV', icon: Calendar, roles: ['admin', 'employee'] },
		{ href: `${basePath}/dashboard/clients`, label: 'Clientèle', icon: Users, roles: ['admin', 'employee'] },
		{ href: `${basePath}/dashboard/messages`, label: 'Messagerie', icon: MessageSquare, badge: unreadCount, roles: ['admin', 'employee'] },
		{ href: `${basePath}/dashboard/services`, label: 'Gestion des prestations', icon: Scissors, roles: ['admin'] },
		{ href: `${basePath}/dashboard/statistiques`, label: 'Performances', icon: BarChart3, roles: ['admin'] },
		{ href: `${basePath}/dashboard/recherche`, label: 'Recherche', icon: Search, roles: ['admin', 'employee'] },
		{ href: `${basePath}/dashboard/profil`, label: 'Profil Maison', icon: Settings, roles: ['admin'] },
		{ href: `${basePath}/dashboard/droits`, label: 'Gestion des droits', icon: ShieldCheck, roles: ['admin'] },
	];

	// Filtrer selon le rôle actif : l'employé n'accède QU'À planning, clientèle, messagerie, recherche
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

	return (
		<nav className="flex flex-col gap-1">
			{/* Sélecteur & Indicateur de Rôle Actif */}
			<div className="mx-1 mb-4 p-3 rounded-2xl border border-stone-200 bg-stone-50/90 shadow-2xs">
				{proUser && (
					<div className="mb-2.5 pb-2 border-b border-stone-200/80">
						<p className="text-xs font-bold text-stone-900 truncate">{proUser.name}</p>
						<p className="text-[11px] text-stone-500 truncate">{proUser.email}</p>
					</div>
				)}
				<div className="flex items-center justify-between mb-2">
					<span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Rôle Actif</span>
					<span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
						role === 'admin' 
							? 'bg-amber-100 text-amber-800 border border-amber-200' 
							: 'bg-deep-teal-100 text-deep-teal-800 border border-deep-teal-200'
					}`}>
						{role === 'admin' ? 'Gérant' : 'Employé'}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-1 p-0.5 bg-stone-200/70 rounded-xl">
					<button
						type="button"
						onClick={() => handleSwitchRole('admin')}
						className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
							role === 'admin' 
								? 'bg-white text-stone-900 shadow-2xs' 
								: 'text-stone-500 hover:text-stone-900'
						}`}
					>
						Admin
					</button>
					<button
						type="button"
						onClick={() => handleSwitchRole('employee')}
						className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
							role === 'employee' 
								? 'bg-deep-teal-600 text-white shadow-2xs' 
								: 'text-stone-500 hover:text-stone-900'
						}`}
					>
						Employé
					</button>
				</div>
			</div>

			<div className="mb-2 px-2">
				<p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
					{role === 'admin' ? 'Espace Administrateur' : 'Espace Collaborateur'}
				</p>
			</div>

			{visibleLinks.map((link) => {
				const isActive = currentPath === link.href || currentPath === `${link.href}/`;
				const Icon = link.icon;

				return (
					<a
						key={link.href}
						href={link.href}
						className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
							isActive
								? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs'
								: 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
						}`}
					>
						<Icon size={17} className={isActive ? 'text-deep-teal-500' : 'text-stone-400'} />
						<span className="flex-1">{link.label}</span>
						{link.badge && link.badge > 0 ? (
							<span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-deep-teal-600 text-white shadow-2xs animate-pulse">
								{link.badge}
							</span>
						) : null}
					</a>
				);
			})}

			<div className="mt-6 pt-6 border-t border-stone-100 px-2 flex flex-col gap-2">
				<button
					type="button"
					onClick={handleLogout}
					className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 hover:bg-rose-50 hover:text-rose-600 transition-colors border border-transparent cursor-pointer text-left"
				>
					<LogOut size={17} />
					Déconnexion
				</button>
			</div>
		</nav>
	);
}
