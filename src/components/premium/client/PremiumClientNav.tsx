import { useEffect, useState } from 'react';
import { signOut } from '@/lib/auth';
import { LogOut, CalendarClock, Award, MessageSquare, UserCircle } from 'lucide-react';

const links = [
	{ label: 'Mes Réservations', href: '/espace-client', icon: <CalendarClock /> },
	{ label: 'Privilèges', href: '/espace-client/fidelite', icon: <Award /> },
	{ label: 'Messages', href: '/espace-client/messages', icon: <MessageSquare /> },
	{ label: 'Mon profil', href: '/espace-client/profil', icon: <UserCircle /> },
];

const sansBarre = (p: string) => p.replace(/\/+$/, '') || '/';

export default function PremiumClientNav({ basePath = '' }: { basePath?: string }) {
	const [currentPath, setCurrentPath] = useState('');
	const effectiveBasePath = basePath || (typeof window !== 'undefined' ? (window.location.pathname.match(/^\/(demo-[^/]+)/)?.[0] || '') : '');

	useEffect(() => {
		setCurrentPath(window.location.pathname);
	}, []);

	async function handleSignOut() {
		await signOut();
		window.location.href = effectiveBasePath ? `${effectiveBasePath}/connexion` : '/demo-premium/connexion';
	}

	return (
		<nav className="pe-nav" aria-label="Espace client">
			<div className="pe-nav__liste">
				{links.map((link, i) => {
					const isActive = currentPath !== '' && sansBarre(currentPath) === sansBarre(`${basePath}${link.href}`);
					return (
						<a
							key={link.href}
							href={`${basePath}${link.href}`}
							className="pe-nav__lien"
							aria-current={isActive ? 'page' : undefined}
							title={link.label}
						>
							{link.icon}
							<span className="pe-nav__label">{link.label}</span>
							<span className="pe-nav__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
						</a>
					);
				})}
			</div>
			<div className="pe-nav__bas">
				<button type="button" onClick={handleSignOut} className="pe-nav__lien pe-nav__sortie" title="Se déconnecter">
					<LogOut />
					<span className="pe-nav__label">Se déconnecter</span>
				</button>
			</div>
		</nav>
	);
}
