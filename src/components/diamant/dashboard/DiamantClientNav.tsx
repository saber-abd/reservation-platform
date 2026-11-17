import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { Calendar, History, Star, MessageSquare, User, LogOut, Lock, ShieldAlert } from 'lucide-react';
import { getBannedClientRecord, type BannedClientRecord } from '@/lib/permissions';

interface DiamantClientNavProps {
	basePath: string;
}

export default function DiamantClientNav({ basePath }: DiamantClientNavProps) {
	// URL et localStorage lus après le montage : les lire pendant le rendu donnait un HTML
	// serveur différent de celui du navigateur (avertissement d'hydratation React).
	const [currentPath, setCurrentPath] = useState('');
	const [bannedRecord, setBannedRecord] = useState<BannedClientRecord | null>(null);
	const [cible, setCible] = useState<HTMLElement | null>(null);

	useEffect(() => {
		setCurrentPath(window.location.pathname);
		setCible(document.body);
		const email = localStorage.getItem('diamant_client_email');
		if (email) setBannedRecord(getBannedClientRecord(null, email));
	}, []);

	useEffect(() => {
		async function checkBan() {
			try {
				const email = localStorage.getItem('diamant_client_email');
				if (email) {
					const fastBan = getBannedClientRecord(null, email);
					if (fastBan) {
						setBannedRecord(fastBan);
						return;
					}
				}
				const { data: { session } } = await supabase.auth.getSession();
				const user = session?.user;
				const ban = getBannedClientRecord(
					user?.id,
					user?.email,
					user?.user_metadata?.full_name || user?.user_metadata?.name
				);
				setBannedRecord(ban);
			} catch (e) {}
		}

		checkBan();

		const onBannedUpdate = () => checkBan();
		window.addEventListener('diamant:client-banned', onBannedUpdate);
		window.addEventListener('diamant:client-unbanned', onBannedUpdate);
		window.addEventListener('storage', onBannedUpdate);

		return () => {
			window.removeEventListener('diamant:client-banned', onBannedUpdate);
			window.removeEventListener('diamant:client-unbanned', onBannedUpdate);
			window.removeEventListener('storage', onBannedUpdate);
		};
	}, []);

	const links = [
		{ href: `${basePath}/espace-client`, label: 'Mes Rendez-vous', icon: Calendar },
		{ href: `${basePath}/espace-client/historique`, label: 'Historique des RDV', icon: History },
		{ href: `${basePath}/espace-client/fidelite`, label: 'Fidélité', icon: Star },
		{ href: `${basePath}/espace-client/messages`, label: 'Messagerie', icon: MessageSquare },
		{ href: `${basePath}/espace-client/profil`, label: 'Mon Profil', icon: User },
	];

	async function handleLogout() {
		try {
			await supabase.auth.signOut();
			localStorage.removeItem('diamant_client_avatar');
			localStorage.removeItem('diamant_client_email');
			if (typeof document !== 'undefined') document.documentElement.classList.remove('diamant-client-banned');
		} catch (e) {
			console.error('Erreur déconnexion:', e);
		}
		window.location.href = `${basePath}/connexion`;
	}

	const courts: Record<string, string> = {
		[`${basePath}/espace-client`]: 'RDV',
		[`${basePath}/espace-client/historique`]: 'Historique',
		[`${basePath}/espace-client/fidelite`]: 'Fidélité',
		[`${basePath}/espace-client/messages`]: 'Messages',
		[`${basePath}/espace-client/profil`]: 'Profil',
	};

	return (
		<nav className="flex flex-col gap-6" aria-label="Espace client">
			{bannedRecord && (
				<div className="dx-si-deplie dx-bandeau !py-3 text-xs" data-ton="alerte">
					<ShieldAlert size={15} className="mt-0.5 flex-none" />
					<p>
						<b className="block">Compte Suspendu</b>
						Accès verrouillé
						<span className="mt-1 block line-clamp-3">Motif : « {bannedRecord.reason} »</span>
					</p>
				</div>
			)}

			<div className="flex flex-col gap-0.5">
				<p className="dx-rubrique dx-label mb-1.5">Espace Personnel</p>
				{links.map((link) => {
					const isActive = currentPath === link.href || currentPath === `${link.href}/`;
					const Icon = link.icon;

					if (bannedRecord) {
						return (
							<div
								key={link.href}
								aria-disabled="true"
								title={`Accès verrouillé — Motif : ${bannedRecord.reason}`}
								className="dx-nav-lien cursor-not-allowed select-none opacity-50"
							>
								<Icon size={18} />
								<span className="dx-label flex-1 truncate line-through">{link.label}</span>
								<Lock size={13} className="dx-label !text-dx-alerte" />
							</div>
						);
					}

					return (
						<a key={link.href} href={link.href} aria-current={isActive ? 'page' : undefined} title={link.label} className="dx-nav-lien">
							{isActive && <span className="dx-nav-actif" aria-hidden="true" />}
							<Icon size={18} />
							<span className="dx-label flex-1 truncate">{link.label}</span>
						</a>
					);
				})}
			</div>

			<div className="border-t border-dx-filet pt-4">
				<button
					type="button"
					onClick={handleLogout}
					title="Déconnexion"
					className={bannedRecord ? 'dx-btn dx-btn--danger w-full' : 'dx-nav-lien w-full cursor-pointer text-left hover:!text-dx-alerte'}
				>
					<LogOut size={18} />
					<span className="dx-label">Déconnexion</span>
				</button>
			</div>

			{/* Barre d'onglets du bas, sur téléphone (hors du tiroir, qui est transformé) */}
			{cible && !bannedRecord &&
				createPortal(
					<nav className="dx-tabbar md:hidden" aria-label="Espace client (raccourcis)">
						{links.map((link) => {
							const isActive = currentPath === link.href || currentPath === `${link.href}/`;
							const Icon = link.icon;
							return (
								<a key={link.href} href={link.href} aria-current={isActive ? 'page' : undefined}>
									{isActive && <span className="dx-tabbar-actif" aria-hidden="true" />}
									<Icon size={19} />
									<span>{courts[link.href]}</span>
								</a>
							);
						})}
					</nav>,
					cible
				)}
		</nav>
	);
}
