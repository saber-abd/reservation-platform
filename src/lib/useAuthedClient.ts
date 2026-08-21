import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import { getClientById, getProfessionalByUserId, type Client } from '@/lib/queries';

interface AuthedClientState {
	loading: boolean;
	client: Client | null;
	email: string | null;
	error: string | null;
}

/**
 * Hook partagé par les panneaux de l'espace client : vérifie la session Supabase,
 * charge le profil client lié, et redirige vers /connexion si non authentifié.
 */
export function useAuthedClient(): AuthedClientState {
	const [state, setState] = useState<AuthedClientState>({
		loading: true,
		client: null,
		email: null,
		error: null,
	});

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const session = await getSession();
				if (!session) {
					window.location.href = '/connexion';
					return;
				}
				const client = await getClientById(session.user.id);
				if (!client) {
					// Compte professionnel connecté sur l'espace client : renvoyer vers son propre espace, pas vers l'inscription.
					const professional = await getProfessionalByUserId(session.user.id);
					window.location.href = professional ? '/dashboard' : '/inscription';
					return;
				}
				if (!cancelled) {
					setState({ loading: false, client, email: session.user.email ?? null, error: null });
				}
			} catch (err) {
				if (!cancelled) {
					setState({
						loading: false,
						client: null,
						email: null,
						error: err instanceof Error ? err.message : 'Erreur inconnue.',
					});
				}
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, []);

	return state;
}
