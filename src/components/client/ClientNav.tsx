import { useEffect, useState } from 'react';
import { signOut } from '@/lib/auth';

const links = [
	{ label: 'Mes rendez-vous', href: '/espace-client' },
	{ label: 'Fidélité', href: '/espace-client/fidelite' },
	{ label: 'Messages', href: '/espace-client/messages' },
	{ label: 'Mon profil', href: '/espace-client/profil' },
];

export default function ClientNav({ basePath = '' }: { basePath?: string }) {
	const [currentPath, setCurrentPath] = useState('');

	useEffect(() => {
		setCurrentPath(window.location.pathname);
	}, []);

	async function handleSignOut() {
		await signOut();
		window.location.href = basePath ? `${basePath}/connexion` : '/connexion';
	}

	return (
		<nav className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
			<div className="flex flex-wrap gap-2">
				{links.map((link) => (
					<a
						key={link.href}
						href={`${basePath}${link.href}`}
						className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
							currentPath === `${basePath}${link.href}`
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
