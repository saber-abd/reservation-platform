import React from 'react';
import { Home, Calendar, Users, Settings, LogOut, BarChart3, Star } from 'lucide-react';

interface DiamantDashboardNavProps {
	basePath: string;
}

export default function DiamantDashboardNav({ basePath }: DiamantDashboardNavProps) {
	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

	const links = [
		{ href: `${basePath}/dashboard`, label: 'Tableau de bord', icon: Home },
		{ href: `${basePath}/dashboard/disponibilites`, label: 'Planning & RDV', icon: Calendar },
		{ href: `${basePath}/dashboard/clients`, label: 'Clientèle VIP', icon: Users },
		{ href: `${basePath}/dashboard/services`, label: 'Carte des Soins', icon: Star },
		{ href: `${basePath}/dashboard/statistiques`, label: 'Performances', icon: BarChart3 },
		{ href: `${basePath}/dashboard/profil`, label: 'Profil Maison', icon: Settings },
	];

	return (
		<nav className="flex flex-col gap-2">
			<div className="mb-4 px-3">
				<p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Espace Professionnel</p>
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
								? 'bg-gradient-to-r from-jasmine-500/10 to-transparent text-jasmine-400 border-l-2 border-jasmine-400 shadow-[inset_0_0_20px_rgba(235,188,102,0.05)]'
								: 'text-stone-400 hover:bg-white/5 hover:text-stone-200 border-l-2 border-transparent'
						}`}
					>
						<Icon size={18} className={isActive ? 'text-jasmine-400' : 'opacity-70'} />
						{link.label}
					</a>
				);
			})}

			<div className="mt-8 pt-8 border-t border-white/5 px-3">
				<a
					href={basePath}
					className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
				>
					<LogOut size={18} />
					Déconnexion
				</a>
			</div>
		</nav>
	);
}
