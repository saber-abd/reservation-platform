import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAccountType, enrollClientInDemo, createProfessional, getDemoTag } from '@/lib/queries';
import { getBannedClientRecord, checkIsClientBannedInDb } from '@/lib/permissions';
import { clearRejectedSession, consumeBanErrorFromUrl, fetchBanNotice, storeBanNotice } from '@/lib/ban';
import CompleteProfileForm from '@/components/premium/auth/PremiumCompleteProfileForm';

export default function OAuthCallback() {
	const [status, setStatus] = useState('Connexion en cours...');
	const [showCompletion, setShowCompletion] = useState(false);
	const [pendingUser, setPendingUser] = useState<any | null>(null);
	const [targetDemoPath, setTargetDemoPath] = useState('/demo-premium');

	useEffect(() => {
		async function handleAuth() {
			try {
				// Compte banni : Supabase refuse la session et renvoie l'erreur dans l'URL (#error_code=user_banned).
				if (consumeBanErrorFromUrl()) {
					const bannedDemo = sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo') || '/demo-premium';
					await clearRejectedSession(bannedDemo.replace('/demo-', ''));
					storeBanNotice(null);
					window.location.replace(`${bannedDemo}/connexion?error=banned`);
					return;
				}

				// Attendre un bref instant pour que supabase-js analyse le fragment d'URL #access_token=...
				const { data: { session }, error } = await supabase.auth.getSession();
				if (error) throw error;

				const targetDemo = (typeof window !== 'undefined' ? (sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo')) : null) || '/demo-premium';
				setTargetDemoPath(targetDemo);
				const demoTag = getDemoTag(targetDemo);

				if (session && session.user) {
					const user = session.user;

					// Cache email
					if (typeof window !== 'undefined' && user.email) {
						localStorage.setItem('premium_client_email', user.email);
						try {
							const map = JSON.parse(localStorage.getItem('premium_client_emails') || '{}');
							map[user.id] = user.email;
							localStorage.setItem('premium_client_emails', JSON.stringify(map));
						} catch (e) {}
					}

					// Vérification bannissement (Local + Base de données Supabase)
					let ban = getBannedClientRecord(
						user.id,
						user.email,
						user.user_metadata?.full_name || user.user_metadata?.name
					);

					if (!ban) {
						const dbBan = await checkIsClientBannedInDb(user.id, user.email);
						if (dbBan) {
							ban = {
								clientId: user.id,
								clientName: user.user_metadata?.full_name || user.user_metadata?.name || 'Client',
								clientEmail: user.email,
								reason: dbBan.reason || 'Compte suspendu par l’établissement',
								bannedAt: new Date().toISOString()
							};
						}
					}

					if (ban) {
						await clearRejectedSession('premium');
						storeBanNotice((await fetchBanNotice(user.email, user.id)) ?? { reason: ban.reason, bannedAt: null, bannedUntil: null });
						window.location.replace(`${targetDemo}/connexion?error=banned`);
						return;
					}

					setStatus('Vérification du profil...');
					const accountType = await getAccountType(user.id, demoTag);

					if (accountType === 'professional') {
						window.location.replace(`${targetDemo}/dashboard`);
						return;
					}

					const meta = user.user_metadata;
					if (meta?.account_role === 'professional') {
						await createProfessional({
							user_id: user.id,
							business_name: meta.business_name || 'Mon activité',
							email: user.email!,
						}, demoTag);
						window.location.replace(`${targetDemo}/dashboard`);
						return;
					}

					// Vérifier si le client a déjà complété ses coordonnées (téléphone présent)
					const { data: existingClient } = await supabase
						.from('clients')
						.select('id, phone, full_name')
						.eq('id', user.id)
						.maybeSingle();

					const isAlreadyComplete = !!(existingClient?.phone && existingClient.phone.trim() !== '');

					if (!isAlreadyComplete) {
						// Nouvel utilisateur ou profil incomplet : afficher le formulaire de finalisation
						setPendingUser(user);
						setShowCompletion(true);
						return;
					}

					// Profil déjà complet : enrôler et rediriger directement vers l'espace client
					await enrollClientInDemo(user.id, demoTag, {
						full_name: existingClient.full_name || meta?.full_name || meta?.name || 'Client',
						email: user.email || null,
						phone: existingClient.phone
					});
					window.location.replace(`${targetDemo}/espace-client`);
					return;
				}

				// Pas de session détectée, rediriger vers la page de connexion de la démo
				window.location.replace(`${targetDemo}/connexion`);
			} catch (err) {
				console.error('Erreur authentification:', err);
				const targetDemo = (typeof window !== 'undefined' ? localStorage.getItem('preferred_demo') : null) || '/demo-premium';
				window.location.replace(`${targetDemo}/connexion`);
			}
		}

		handleAuth();
	}, []);

	if (showCompletion && pendingUser) {
		return (
			<CompleteProfileForm 
				user={pendingUser} 
				targetDemo={targetDemoPath} 
				onCompleted={() => {
					window.location.replace(`${targetDemoPath}/espace-client`);
				}}
			/>
		);
	}

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-6">
			<div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-primary"></div>
			<p className="text-sm font-semibold text-stone-700">{status}</p>
		</div>
	);
}
