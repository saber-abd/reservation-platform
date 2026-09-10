import { useEffect, useState } from 'react';
import { signOut } from '@/lib/auth';
import { LogOut, Calendar, Award, MessageSquare, UserCircle } from 'lucide-react';

const links = [
	{ label: 'Mes Réservations', href: '/espace-client', icon: <Calendar size={16} /> },
	{ label: 'Privilèges', href: '/espace-client/fidelite', icon: <Award size={16} /> },
	{ label: 'Messages', href: '/espace-client/messages', icon: <MessageSquare size={16} /> },
	{ label: 'Mon profil', href: '/espace-client/profil', icon: <UserCircle size={16} /> },
];

export default function PremiumClientNav({ basePath = '' }: { basePath?: string }) {
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
