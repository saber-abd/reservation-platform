import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, History, Star, MessageSquare, User, LogOut, Lock, ShieldAlert } from 'lucide-react';
import { getBannedClientRecord, type BannedClientRecord } from '@/lib/permissions';

interface DiamantClientNavProps {
	basePath: string;
}

export default function DiamantClientNav({ basePath }: DiamantClientNavProps) {
	const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
	const [bannedRecord, setBannedRecord] = useState<BannedClientRecord | null>(() => {
		if (typeof window !== 'undefined') {
			const email = localStorage.getItem('diamant_client_email');
			if (email) return getBannedClientRecord(null, email);
		}
		return null;
	});

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
		{ href: `${basePath}/espace-client/fidelite`, label: 'Avantages VIP', icon: Star },
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

	return (
		<nav className="flex flex-col gap-2">
			<div className="mb-4 px-3">
				<p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Espace Personnel</p>
			</div>

			{bannedRecord && (
				<div className="mb-4 mx-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 shadow-2xs animate-in fade-in duration-200">
					<div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-rose-700">
						<ShieldAlert size={14} className="shrink-0 text-rose-600" />
						<span>Compte Suspendu</span>
					</div>
					<p className="mt-1.5 text-xs text-rose-950 font-bold leading-tight">
						Accès verrouillé
					</p>
					<p className="mt-1 text-[11px] text-rose-700 leading-snug line-clamp-3">
						Motif : « {bannedRecord.reason} »
					</p>
				</div>
			)}

			{links.map((link) => {
				const isActive = currentPath === link.href || currentPath === `${link.href}/`;
				const Icon = link.icon;

				if (bannedRecord) {
					return (
						<div
							key={link.href}
							aria-disabled="true"
							title={`Accès verrouillé — Motif : ${bannedRecord.reason}`}
							className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-stone-100/70 border border-stone-200 text-stone-400 opacity-60 cursor-not-allowed select-none transition-all"
						>
							<div className="flex items-center gap-3">
								<Icon size={18} className="text-stone-400 shrink-0" />
								<span className="line-through">{link.label}</span>
							</div>
							<span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0">
								<Lock size={10} />
								Bloqué
							</span>
						</div>
					);
				}

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
				<button
					type="button"
					onClick={handleLogout}
					className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors cursor-pointer text-left ${
						bannedRecord
							? 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
							: 'text-stone-500 hover:bg-rose-50 hover:text-rose-600 border border-transparent'
					}`}
				>
					<LogOut size={18} />
					<span>Déconnexion</span>
				</button>
			</div>
		</nav>
	);
}
