import React from 'react';
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
