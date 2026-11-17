import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getBannedClientRecord, checkIsClientBannedInDb, type BannedClientRecord } from '@/lib/permissions';
import { ShieldAlert, AlertTriangle, LogOut, ArrowRight } from 'lucide-react';

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
		return <div className="p-8 text-center text-sm text-dx-gris">Vérification des accès...</div>;
	}

	if (bannedRecord) {
		return (
			<div data-ban-guard="true" className="mx-auto max-w-2xl py-6">
				<div className="dx-carte overflow-hidden">
					<div className="flex items-center gap-4 bg-dx-nuit px-6 py-6 text-dx-creme sm:px-9">
						<span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-dx-alerte text-white">
							<ShieldAlert size={22} />
						</span>
						<div>
							<p className="text-sm text-dx-sable">Accès Restreint & Suspendu</p>
							<h2 className="font-heading text-[clamp(1.6rem,3vw,2.2rem)] font-light leading-tight tracking-[-0.03em] text-white">
								Votre compte a été suspendu
							</h2>
						</div>
					</div>

					<div className="space-y-6 px-6 py-7 sm:px-9">
						<p className="text-[0.9375rem] leading-relaxed text-dx-encre-2">
							La direction de l'établissement a bloqué l'accès à votre espace personnel ainsi qu'à la prise de rendez-vous en ligne.
						</p>

						{/* Motif du bannissement */}
						<div className="border-l-2 border-dx-alerte pl-5">
							<p className="flex items-center gap-1.5 text-xs font-semibold text-dx-alerte">
								<AlertTriangle size={14} />
								<span>Motif de la suspension</span>
							</p>
							<p className="mt-1.5 font-heading text-xl italic text-dx-encre">« {bannedRecord.reason} »</p>
							{bannedRecord.bannedAt && (
								<p className="mt-2 text-xs text-dx-gris">
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
						<div className="rounded-xl bg-dx-ivoire p-4 text-sm text-dx-encre-2">
							<p className="mb-2 font-semibold text-dx-encre">Conséquences de cette mesure :</p>
							<ul className="list-disc space-y-1 pl-5">
								<li>Tous vos onglets (Mes Rendez-vous, Avantages VIP, Messagerie, Profil) sont verrouillés.</li>
								<li>Aucune réservation ne peut être confirmée sous ce compte.</li>
								<li>Pour toute régularisation ou réclamation, merci de contacter directement le salon.</li>
							</ul>
						</div>

						{/* Boutons d'action */}
						<div className="flex flex-col gap-2.5 sm:flex-row">
							<a href={`${basePath}/contact`} className="dx-btn dx-btn--ligne">
								<span>Contacter l'établissement</span>
								<ArrowRight size={14} />
							</a>
							<button type="button" onClick={handleLogout} className="dx-btn dx-btn--danger">
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
