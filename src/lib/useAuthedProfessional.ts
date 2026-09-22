import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import { getClientById, getProfessionalByUserId, getPrimaryProfessional, getDemoTag, type Professional } from '@/lib/queries';
import { getProSession, getActiveProRole } from '@/lib/permissions';

interface AuthedProfessionalState {
	loading: boolean;
	professional: Professional | null;
	error: string | null;
}

/**
 * Hook partagé par les panneaux du dashboard : vérifie la session Supabase ou pro démo,
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
				const tag = getDemoTag();

				// 1. Si une session pro locale/démo est active (ex: compte créé via gestion des droits)
				const proSession = getProSession();
				if (proSession) {
					const pro = await getPrimaryProfessional(tag).catch(() => null);
					const effectivePro: Professional = pro || {
						id: 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7',
						user_id: proSession.id,
						business_name: 'Maison Prestige Diamant',
						email: proSession.email,
						tag_bd: tag,
						created_at: new Date().toISOString()
					};
					if (!cancelled) setState({ loading: false, professional: effectivePro, error: null });
					return;
				}

				// 2. Si on est dans une démo et qu'un rôle pro (admin, employee, demo) est actif
				const activeRole = getActiveProRole();
				if (match && activeRole) {
					const pro = await getPrimaryProfessional(tag).catch(() => null);
					const effectivePro: Professional = pro || {
						id: 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7',
						user_id: 'demo-pro-user',
						business_name: 'Maison Prestige Diamant',
						email: 'contact@diamant-prestige.fr',
						tag_bd: tag,
						created_at: new Date().toISOString()
					};
					if (!cancelled) setState({ loading: false, professional: effectivePro, error: null });
					return;
				}

				// 3. Vérification session Supabase standard
				const session = await getSession().catch(() => null);
				if (!session) {
					// Si on est dans un environnement démo (/demo-*), on ne bloque pas avec une redirection brutale
					if (match) {
						const fallbackPro: Professional = {
							id: 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7',
							user_id: 'demo-pro-user',
							business_name: 'Maison Prestige Diamant',
							email: 'contact@diamant-prestige.fr',
							tag_bd: tag,
							created_at: new Date().toISOString()
						};
						if (!cancelled) setState({ loading: false, professional: fallbackPro, error: null });
						return;
					}
					window.location.href = `${basePath}/connexion`;
					return;
				}

				let professional = await getProfessionalByUserId(session.user.id, tag).catch(() => null);
				if (!professional) {
					professional = await getPrimaryProfessional(tag).catch(() => null);
				}

				if (!professional) {
					// Compte client connecté sur l'espace pro : renvoyer vers son propre espace, pas vers l'inscription.
					const client = await getClientById(session.user.id, tag).catch(() => null);
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
