import React from 'react';
import { Home, Calendar, Users, Settings, LogOut, BarChart3, Scissors, Search } from 'lucide-react';

interface DiamantDashboardNavProps {
	basePath: string;
}

export default function DiamantDashboardNav({ basePath }: DiamantDashboardNavProps) {
	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

	const links = [
		{ href: `${basePath}/dashboard`, label: 'Tableau de bord', icon: Home },
		{ href: `${basePath}/dashboard/disponibilites`, label: 'Planning & RDV', icon: Calendar },
		{ href: `${basePath}/dashboard/clients`, label: 'Clientèle', icon: Users },
		{ href: `${basePath}/dashboard/services`, label: 'Gestion des prestations', icon: Scissors },
		{ href: `${basePath}/dashboard/statistiques`, label: 'Performances', icon: BarChart3 },
		{ href: `${basePath}/dashboard/recherche`, label: 'Recherche', icon: Search },
		{ href: `${basePath}/dashboard/profil`, label: 'Profil Maison', icon: Settings },
	];

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
						{link.label}
					</a>
				);
			})}

			<div className="mt-6 pt-6 border-t border-stone-100 px-2">
				<a
					href={basePath}
					className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors border border-transparent"
				>
					<LogOut size={17} />
					Retour au site
				</a>
			</div>
		</nav>
	);
}
