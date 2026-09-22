import React from 'react';
import { supabase } from '@/lib/supabase';
import { Home, Calendar, Users, Settings, LogOut, BarChart3, Scissors, Search, MessageSquare } from 'lucide-react';

interface DiamantDashboardNavProps {
	basePath: string;
}

export default function DiamantDashboardNav({ basePath }: DiamantDashboardNavProps) {
	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
	const [unreadCount, setUnreadCount] = React.useState(0);

	React.useEffect(() => {
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

		const onUpdate = () => checkUnread();
		window.addEventListener('diamant:new-message', onUpdate);
		window.addEventListener('diamant:messages-read', onUpdate);
		window.addEventListener('storage', onUpdate);

		return () => {
			window.removeEventListener('diamant:new-message', onUpdate);
			window.removeEventListener('diamant:messages-read', onUpdate);
			window.removeEventListener('storage', onUpdate);
		};
	}, []);

	const links = [
		{ href: `${basePath}/dashboard`, label: 'Tableau de bord', icon: Home },
		{ href: `${basePath}/dashboard/disponibilites`, label: 'Planning & RDV', icon: Calendar },
		{ href: `${basePath}/dashboard/clients`, label: 'Clientèle', icon: Users },
		{ href: `${basePath}/dashboard/messages`, label: 'Messagerie', icon: MessageSquare, badge: unreadCount },
		{ href: `${basePath}/dashboard/services`, label: 'Gestion des prestations', icon: Scissors },
		{ href: `${basePath}/dashboard/statistiques`, label: 'Performances', icon: BarChart3 },
		{ href: `${basePath}/dashboard/recherche`, label: 'Recherche', icon: Search },
		{ href: `${basePath}/dashboard/profil`, label: 'Profil Maison', icon: Settings },
	];

	async function handleLogout() {
		try {
			await supabase.auth.signOut();
			localStorage.removeItem('diamant_client_avatar');
		} catch (e) {
			console.error('Erreur déconnexion:', e);
		}
		window.location.href = `${basePath}/connexion`;
	}

	return (
		<nav className="flex flex-col gap-1">
			<div className="mb-3 px-2">
				<p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Espace Professionnel</p>
			</div>
			{links.map((link) => {
				const isActive = currentPath === link.href || currentPath === `${link.href}/`;
				const Icon = link.icon;

				return (
					<a
						key={link.href}
						href={link.href}
						className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
							isActive
								? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200'
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
