import { useEffect, useState } from 'react';
import { signOut } from '@/lib/auth';
import { CalendarClock, Wrench, CalendarRange, Users, Gauge, Building2, LogOut } from 'lucide-react';

// Libellés alignés sur les titres des pages (l'ancien « Arsenal » / « Pilotes » ne disait pas où l'on allait).
const links = [
	{ label: 'Rendez-vous', href: '/dashboard', icon: <CalendarClock /> },
	{ label: 'Prestations', href: '/dashboard/services', icon: <Wrench /> },
	{ label: 'Disponibilités', href: '/dashboard/disponibilites', icon: <CalendarRange /> },
	{ label: 'Clients', href: '/dashboard/clients', icon: <Users /> },
	{ label: 'Statistiques', href: '/dashboard/statistiques', icon: <Gauge /> },
	{ label: 'Profil', href: '/dashboard/profil', icon: <Building2 /> },
];

const sansBarre = (p: string) => p.replace(/\/+$/, '') || '/';

export default function PremiumDashboardNav({ basePath = '' }: { basePath?: string }) {
	const [currentPath, setCurrentPath] = useState('');
	const effectiveBasePath = basePath || (typeof window !== 'undefined' ? (window.location.pathname.match(/^\/(demo-[^/]+)/)?.[0] || '') : '');

	useEffect(() => {
		setCurrentPath(window.location.pathname);
	}, []);

	const isPreview = effectiveBasePath.endsWith('/apercu');

	async function handleSignOut() {
		if (isPreview) {
			window.location.href = effectiveBasePath.replace(/\/apercu$/, '') || '/demo-premium';
			return;
		}
		await signOut();
		window.location.href = effectiveBasePath ? `${effectiveBasePath}/connexion` : '/demo-premium/connexion';
	}

	return (
		<nav className="pe-nav" aria-label="Tableau de bord">
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
				<button type="button" onClick={handleSignOut} className="pe-nav__lien pe-nav__sortie" title={isPreview ? "Quitter l'aperçu" : 'Se déconnecter'}>
					<LogOut />
					<span className="pe-nav__label">{isPreview ? "Quitter l'aperçu" : 'Se déconnecter'}</span>
				</button>
			</div>
		</nav>
	);
}
