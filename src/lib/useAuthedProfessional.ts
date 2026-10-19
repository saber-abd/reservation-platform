import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import { getClientById, getProfessionalById, getDemoTag, type Professional } from '@/lib/queries';
import { loadProContext } from '@/lib/permissions';
import { isPreviewMode, previewProfessional } from '@/lib/preview';

interface AuthedProfessionalState {
	loading: boolean;
	professional: Professional | null;
	error: string | null;
}

/**
 * Hook partagé par les panneaux du dashboard : exige une session Supabase, charge le rôle
 * (propriétaire ou collaborateur) depuis la base, puis l'établissement correspondant.
 * Sans session ou sans rôle professionnel, redirige vers la connexion / l'espace client.
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
			if (isPreviewMode()) {
				if (!cancelled) setState({ loading: false, professional: previewProfessional, error: null });
				return;
			}
			try {
				const match = typeof window !== 'undefined' ? window.location.pathname.match(/^\/(demo-[^/]+)/) : null;
				const basePath = match
					? `/${match[1]}`
					: (typeof window !== 'undefined'
						? (sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo') || '/demo-premium')
						: '/demo-premium');
				const tag = getDemoTag();

				const session = await getSession().catch(() => null);
				if (!session) {
					window.location.href = `${basePath}/connexion`;
					return;
				}

				const ctx = await loadProContext();
				if (!ctx) {
					// Compte client connecté sur l'espace pro : renvoyer vers son propre espace.
					const client = await getClientById(session.user.id, tag).catch(() => null);
					window.location.href = client ? `${basePath}/espace-client` : `${basePath}/inscription`;
					return;
				}

				const professional = await getProfessionalById(ctx.professional_id, ctx.tag_bd || tag).catch(() => null);
				if (!professional) {
					if (!cancelled) setState({ loading: false, professional: null, error: 'Établissement introuvable.' });
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
