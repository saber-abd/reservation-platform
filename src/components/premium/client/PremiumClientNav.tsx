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
									? 'bg-stone-900 text-white border-l-4 border-primary'
									: 'text-stone-400 hover:bg-stone-900 hover:text-white border-l-4 border-transparent'
							}`}
						>
							{link.icon}
							{link.label}
						</a>
					);
				})}
			</div>
			<div className="mt-auto pt-4 md:border-t md:border-stone-800 hidden md:block">
				<button
					onClick={handleSignOut}
					className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider text-stone-500 hover:bg-stone-900 hover:text-primary transition-colors"
				>
					<LogOut size={16} />
					Se déconnecter
				</button>
			</div>
		</nav>
	);
}
