import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getBannedClientRecord, checkIsClientBannedInDb, type BannedClientRecord } from '@/lib/permissions';
import { ShieldAlert, AlertTriangle, LogOut, Phone, Mail, ArrowRight } from 'lucide-react';

interface DiamantClientBanGuardProps {
	basePath: string;
	children?: React.ReactNode;
}

export default function DiamantClientBanGuard({ basePath, children }: DiamantClientBanGuardProps) {
	const [bannedRecord, setBannedRecord] = useState<BannedClientRecord | null>(() => {
		if (typeof window !== 'undefined') {
			const email = localStorage.getItem('diamant_client_email');
			if (email) {
				return getBannedClientRecord(null, email);
			}
		}
		return null;
	});
	const [loading, setLoading] = useState(false);

	async function checkBanStatus() {
		try {
			const cachedEmail = typeof window !== 'undefined' ? localStorage.getItem('diamant_client_email') : null;
			if (cachedEmail) {
				const fastBan = getBannedClientRecord(null, cachedEmail);
				if (fastBan) {
					setBannedRecord(fastBan);
					if (typeof document !== 'undefined') document.documentElement.classList.add('diamant-client-banned');
					return;
				}
			}
			const { data: { session } } = await supabase.auth.getSession();
			const user = session?.user;
			let ban = getBannedClientRecord(
				user?.id,
				user?.email,
				user?.user_metadata?.full_name || user?.user_metadata?.name
			);

			if (!ban && (user?.id || user?.email || cachedEmail)) {
				const dbBan = await checkIsClientBannedInDb(user?.id, user?.email || cachedEmail);
				if (dbBan) {
					ban = {
						clientId: user?.id || 'unknown',
						clientName: user?.user_metadata?.full_name || user?.user_metadata?.name || 'Client',
						clientEmail: user?.email || cachedEmail,
						reason: dbBan.reason || 'Compte suspendu par l’établissement',
						bannedAt: new Date().toISOString()
					};
				}
			}

			setBannedRecord(ban);
			if (typeof document !== 'undefined') {
				if (ban) {
					document.documentElement.classList.add('diamant-client-banned');
				} else {
					document.documentElement.classList.remove('diamant-client-banned');
				}
			}
		} catch (e) {
			console.error('Erreur vérification ban:', e);
		}
	}

	useEffect(() => {
		checkBanStatus();

		const onBannedUpdate = () => checkBanStatus();
		window.addEventListener('diamant:client-banned', onBannedUpdate);
		window.addEventListener('diamant:client-unbanned', onBannedUpdate);
		window.addEventListener('storage', onBannedUpdate);

		return () => {
			window.removeEventListener('diamant:client-banned', onBannedUpdate);
			window.removeEventListener('diamant:client-unbanned', onBannedUpdate);
			window.removeEventListener('storage', onBannedUpdate);
		};
	}, []);

	async function handleLogout() {
		try {
			await supabase.auth.signOut();
			localStorage.removeItem('diamant_client_avatar');
			localStorage.removeItem('diamant_client_email');
			if (typeof document !== 'undefined') document.documentElement.classList.remove('diamant-client-banned');
		} catch (e) {}
		window.location.href = `${basePath}/connexion`;
	}

	if (loading) {
		return <div className="p-8 text-center text-xs text-stone-400">Vérification des accès...</div>;
	}

	if (bannedRecord) {
		return (
			<div data-ban-guard="true" className="max-w-2xl mx-auto py-8 px-2 animate-in fade-in zoom-in-95 duration-300">
				<div className="rounded-3xl border-2 border-rose-200 bg-white p-8 md:p-10 shadow-xl text-center relative overflow-hidden">
					{/* Effet d'arrière-plan discret */}
					<div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-100/50 rounded-full blur-3xl pointer-events-none"></div>
					<div className="absolute -bottom-16 -left-16 w-48 h-48 bg-rose-100/50 rounded-full blur-3xl pointer-events-none"></div>

					<div className="relative z-10">
						<div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
							<ShieldAlert size={36} />
						</div>

						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-black uppercase tracking-wider mb-4">
							<span>Accès Restreint & Suspendu</span>
						</div>

						<h2 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight mb-3">
							Votre compte a été suspendu
						</h2>

						<p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed mb-6">
							La direction de l'établissement a bloqué l'accès à votre espace personnel ainsi qu'à la prise de rendez-vous en ligne.
						</p>

						{/* Boîte Motif du Bannissement */}
						<div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-left mb-6 shadow-2xs">
							<p className="text-[11px] font-black uppercase tracking-wider text-rose-700 mb-1 flex items-center gap-1.5">
								<AlertTriangle size={14} />
								<span>Motif de la suspension</span>
							</p>
							<p className="text-base font-bold text-rose-950 mt-1">
								« {bannedRecord.reason} »
							</p>
							{bannedRecord.bannedAt && (
								<p className="text-xs text-stone-400 mt-2">
									Sanction appliquée le {new Date(bannedRecord.bannedAt).toLocaleDateString('fr-FR', {
										day: 'numeric',
										month: 'long',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</p>
							)}
						</div>

						{/* Précisions des restrictions */}
						<div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 text-left mb-8 space-y-1.5">
							<p className="font-bold text-stone-700">Conséquences de cette mesure :</p>
							<p>• Tous vos onglets (Mes Rendez-vous, Avantages VIP, Messagerie, Profil) sont verrouillés.</p>
							<p>• Aucune réservation ne peut être confirmée sous ce compte.</p>
							<p>• Pour toute régularisation ou réclamation, merci de contacter directement le salon.</p>
						</div>

						{/* Boutons d'action */}
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
							<a
								href={`${basePath}/contact`}
								className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
							>
								<span>Contacter l'établissement</span>
								<ArrowRight size={14} />
							</a>
							<button
								type="button"
								onClick={handleLogout}
								className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
							>
								<LogOut size={14} />
								<span>Se déconnecter</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
