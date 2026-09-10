import { useEffect, useState } from 'react';
import { signOut } from '@/lib/auth';
import { LayoutDashboard, Scissors, Calendar, Users, BarChart3, UserCircle, LogOut } from 'lucide-react';

const links = [
	{ label: "Arsenal", href: '/dashboard', icon: <LayoutDashboard size={16} /> },
	{ label: 'Services', href: '/dashboard/services', icon: <Scissors size={16} /> },
	{ label: 'Disponibilités', href: '/dashboard/disponibilites', icon: <Calendar size={16} /> },
	{ label: 'Pilotes', href: '/dashboard/clients', icon: <Users size={16} /> },
	{ label: 'Télémétrie', href: '/dashboard/statistiques', icon: <BarChart3 size={16} /> },
	{ label: 'Mécanicien', href: '/dashboard/profil', icon: <UserCircle size={16} /> },
];

export default function PremiumDashboardNav({ basePath = '' }: { basePath?: string }) {
	const [currentPath, setCurrentPath] = useState('');

	useEffect(() => {
		setCurrentPath(window.location.pathname);
	}, []);

	async function handleSignOut() {
		await signOut();
		window.location.href = basePath ? `${basePath}/connexion` : '/connexion';
	}

	return (
		<nav className="mb-8 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
			<div className="flex flex-wrap gap-2 w-full sm:w-auto">
				{links.map((link) => {
					const isActive = currentPath === `${basePath}${link.href}`;
					return (
						<a
							key={link.href}
							href={`${basePath}${link.href}`}
							className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-all ${
								isActive
									? 'bg-primary text-white shadow-[0_0_15px_rgba(255,50,50,0.3)]'
									: 'text-stone-400 hover:bg-stone-900 hover:text-white'
							}`}
						>
							{link.icon}
							{link.label}
						</a>
					);
				})}
			</div>
			<button
				onClick={handleSignOut}
				className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500 hover:text-primary transition-colors"
			>
				<LogOut size={16} />
				Se déconnecter
			</button>
		</nav>
	);
}
