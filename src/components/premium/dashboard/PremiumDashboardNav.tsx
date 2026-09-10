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
		<nav className="flex flex-col gap-2 h-full">
			<div className="flex flex-col gap-1 flex-1">
				{links.map((link) => {
					const isActive = currentPath === `${basePath}${link.href}`;
					return (
						<a
							key={link.href}
							href={`${basePath}${link.href}`}
							className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
								isActive
									? 'bg-muted text-foreground border-l-4 border-primary'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-4 border-transparent'
							}`}
						>
							{link.icon}
							{link.label}
						</a>
					);
				})}
			</div>
			<div className="mt-auto pt-4 md:border-t md:border-border hidden md:block">
				<button
					onClick={handleSignOut}
					className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
				>
					<LogOut size={16} />
					Se déconnecter
				</button>
			</div>
		</nav>
	);
}
