import React from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Star, MessageSquare, User, LogOut } from 'lucide-react';

interface DiamantClientNavProps {
	basePath: string;
}

export default function DiamantClientNav({ basePath }: DiamantClientNavProps) {
	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

	const links = [
		{ href: `${basePath}/espace-client`, label: 'Mes Rendez-vous', icon: Calendar },
		{ href: `${basePath}/espace-client/fidelite`, label: 'Avantages VIP', icon: Star },
		{ href: `${basePath}/espace-client/messages`, label: 'Messagerie', icon: MessageSquare },
		{ href: `${basePath}/espace-client/profil`, label: 'Mon Profil', icon: User },
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
		<nav className="flex flex-col gap-2">
			<div className="mb-4 px-3">
				<p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Espace Personnel</p>
			</div>
			{links.map((link) => {
				const isActive = currentPath === link.href || currentPath === `${link.href}/`;
				const Icon = link.icon;

				return (
					<a
						key={link.href}
						href={link.href}
						className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
							isActive
								? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-sm'
								: 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
						}`}
					>
						<Icon size={18} className={isActive ? 'text-deep-teal-500' : 'text-stone-400'} />
						{link.label}
					</a>
				);
			})}

			<div className="mt-8 pt-8 border-t border-stone-200 px-3 flex flex-col gap-2">
				<button
					type="button"
					onClick={handleLogout}
					className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-500 hover:bg-rose-50 hover:text-rose-600 transition-colors border border-transparent cursor-pointer text-left"
				>
					<LogOut size={18} />
					Déconnexion
				</button>
			</div>
		</nav>
	);
}
