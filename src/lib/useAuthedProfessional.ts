import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import { getClientById, getProfessionalByUserId, type Professional } from '@/lib/queries';

interface AuthedProfessionalState {
	loading: boolean;
	professional: Professional | null;
	error: string | null;
}

/**
 * Hook partagé par les panneaux du dashboard : vérifie la session Supabase,
 * charge le professionnel lié, et redirige vers /connexion si non authentifié.
 */
export function useAuthedProfessional(): AuthedProfessionalState {
	const [state, setState] = useState<AuthedProfessionalState>({
		loading: true,
		professional: null,
		error: null,
	});

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const match = typeof window !== 'undefined' ? window.location.pathname.match(/^\/(demo-[^/]+)/) : null;
				const basePath = match ? `/${match[1]}` : (typeof window !== 'undefined' ? (sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo') || '/demo-premium') : '/demo-premium');

				const session = await getSession();
				if (!session) {
					window.location.href = `${basePath}/connexion`;
					return;
				}
				const professional = await getProfessionalByUserId(session.user.id);
				if (!professional) {
					// Compte client connecté sur l'espace pro : renvoyer vers son propre espace, pas vers l'inscription.
					const client = await getClientById(session.user.id);
					window.location.href = client ? `${basePath}/espace-client` : `${basePath}/inscription`;
					return;
				}
				if (!cancelled) setState({ loading: false, professional, error: null });
			} catch (err) {
				if (!cancelled) {
					setState({
						loading: false,
						professional: null,
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
