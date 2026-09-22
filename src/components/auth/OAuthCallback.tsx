import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAccountType, createClient, createProfessional } from '@/lib/queries';

export default function OAuthCallback() {
	const [status, setStatus] = useState('Connexion en cours...');

	useEffect(() => {
		async function handleAuth() {
			try {
				// Attendre un bref instant pour que supabase-js analyse le fragment d'URL #access_token=...
				const { data: { session }, error } = await supabase.auth.getSession();
				if (error) throw error;

				const targetDemo = (typeof window !== 'undefined' ? (sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo')) : null) || '/demo-premium';

				if (session && session.user) {
					setStatus('Redirection vers votre espace...');
					const user = session.user;
					const accountType = await getAccountType(user.id);

					if (accountType === 'professional') {
						window.location.replace(`${targetDemo}/dashboard`);
						return;
					}

					// Client ou nouvel utilisateur Google
					const meta = user.user_metadata;
					if (meta?.account_role === 'professional') {
						await createProfessional({
							user_id: user.id,
							business_name: meta.business_name || 'Mon activité',
							email: user.email!,
						});
						window.location.replace(`${targetDemo}/dashboard`);
					} else {
						await createClient({
							id: user.id,
							full_name: meta?.full_name || meta?.name || 'Client',
							avatar_url: meta?.avatar_url || meta?.picture || null,
						});
						window.location.replace(`${targetDemo}/espace-client`);
					}
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

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-6">
			<div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-rose-600"></div>
			<p className="text-sm font-semibold text-stone-700">{status}</p>
		</div>
	);
}
