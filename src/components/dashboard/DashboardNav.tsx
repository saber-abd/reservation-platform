import { useEffect, useState } from 'react';
import { signOut } from '@/lib/auth';

const links = [
	{ label: "Vue d'ensemble", href: '/dashboard' },
	{ label: 'Services', href: '/dashboard/services' },
	{ label: 'Disponibilités', href: '/dashboard/disponibilites' },
	{ label: 'Clients', href: '/dashboard/clients' },
	{ label: 'Statistiques', href: '/dashboard/statistiques' },
	{ label: 'Profil', href: '/dashboard/profil' },
];

export default function DashboardNav() {
	const [currentPath, setCurrentPath] = useState('');

	useEffect(() => {
		setCurrentPath(window.location.pathname);
	}, []);

	async function handleSignOut() {
		await signOut();
		window.location.href = '/connexion';
	}

	return (
		<nav className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
			<div className="flex flex-wrap gap-2">
				{links.map((link) => (
					<a
						key={link.href}
						href={link.href}
						className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
							currentPath === link.href
								? 'bg-rose-50 text-rose-600'
								: 'text-stone-600 hover:bg-stone-50'
						}`}
					>
						{link.label}
					</a>
				))}
			</div>
			<button
				onClick={handleSignOut}
				className="text-sm font-medium text-stone-500 hover:text-stone-900"
			>
				Se déconnecter
			</button>
		</nav>
	);
}
