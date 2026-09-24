import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAccountType, enrollClientInDemo, createProfessional, getDemoTag } from '@/lib/queries';
import { getBannedClientRecord, checkIsClientBannedInDb } from '@/lib/permissions';
import CompleteProfileForm from './CompleteProfileForm';

export default function OAuthCallback() {
	const [status, setStatus] = useState('Connexion en cours...');
	const [showCompletion, setShowCompletion] = useState(false);
	const [pendingUser, setPendingUser] = useState<any | null>(null);
	const [targetDemoPath, setTargetDemoPath] = useState('/demo-diamant');

	useEffect(() => {
		async function handleAuth() {
			try {
				// Attendre un bref instant pour que supabase-js analyse le fragment d'URL #access_token=...
				const { data: { session }, error } = await supabase.auth.getSession();
				if (error) throw error;

				const targetDemo = (typeof window !== 'undefined' ? (sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo')) : null) || '/demo-diamant';
				setTargetDemoPath(targetDemo);
				const demoTag = getDemoTag(targetDemo);

				if (session && session.user) {
					const user = session.user;

					// Cache email
					if (typeof window !== 'undefined' && user.email) {
						localStorage.setItem('diamant_client_email', user.email);
						try {
							const map = JSON.parse(localStorage.getItem('diamant_client_emails') || '{}');
							map[user.id] = user.email;
							localStorage.setItem('diamant_client_emails', JSON.stringify(map));
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
						await supabase.auth.signOut();
						localStorage.removeItem('diamant_client_avatar');
						localStorage.removeItem('diamant_client_email');
						sessionStorage.setItem(
							'ban_error_message',
							`Connexion refusée : votre compte est suspendu par l'établissement. Motif : « ${ban.reason} ». L'accès à votre espace client et aux réservations est bloqué.`
						);
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
			<div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-deep-teal-600"></div>
			<p className="text-sm font-semibold text-stone-700">{status}</p>
		</div>
	);
}
