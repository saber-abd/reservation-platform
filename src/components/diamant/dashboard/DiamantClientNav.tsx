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
				<a
					href={basePath}
					className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
				>
					<LogOut size={18} />
					Déconnexion
				</a>
				<a
					href="/"
					className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-stone-500 transition-colors hover:border-deep-teal-300 hover:text-deep-teal-600 hover:bg-deep-teal-50 mt-4"
				>
					Retour Portfolio
				</a>
			</div>
		</nav>
	);
}
