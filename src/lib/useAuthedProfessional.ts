import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import { getProfessionalByUserId, type Professional } from '@/lib/queries';

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
				const session = await getSession();
				if (!session) {
					window.location.href = '/connexion';
					return;
				}
				const professional = await getProfessionalByUserId(session.user.id);
				if (!professional) {
					window.location.href = '/inscription';
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
