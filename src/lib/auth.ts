import { supabase } from './supabase';

function getEffectiveDemoBasePath(customRedirect?: string): string {
	if (customRedirect && customRedirect.startsWith('http')) {
		try {
			const url = new URL(customRedirect);
			const match = url.pathname.match(/^\/(demo-[^/]+)/);
			if (match) return `/${match[1]}`;
		} catch {}
	}
	if (typeof window !== 'undefined') {
		const match = window.location.pathname.match(/^\/(demo-[^/]+)/);
		if (match) return `/${match[1]}`;
		const stored = sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo');
		if (stored) return stored;
	}
	return '/demo-premium';
}

/**
 * Inscription d'un professionnel (ou client) avec email + mot de passe.
 */
export async function signUp(email: string, password: string, metadata?: Record<string, any>, redirectTo?: string) {
	const basePath = getEffectiveDemoBasePath(redirectTo);
	if (typeof window !== 'undefined') {
		sessionStorage.setItem('oauth_demo_redirect', basePath);
		localStorage.setItem('preferred_demo', basePath);
	}
	const emailRedirectTo = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}${basePath}/connexion` : undefined);

	const { data, error } = await supabase.auth.signUp({ 
		email, 
		password,
		options: {
			data: metadata,
			emailRedirectTo
		}
	});
	if (error) throw error;
	return data;
}

/** Connexion avec email + mot de passe. */
export async function signIn(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw error;
	return data;
}

/** Connexion avec Google. */
export async function signInWithGoogle(redirectTo?: string) {
	const basePath = getEffectiveDemoBasePath(redirectTo);
	if (typeof window !== 'undefined') {
		sessionStorage.setItem('oauth_demo_redirect', basePath);
		localStorage.setItem('preferred_demo', basePath);
	}
	const finalRedirectTo = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}${basePath}/connexion` : undefined);

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: finalRedirectTo
		}
	});
	if (error) throw error;
	return data;
}

/** Déconnexion de l'utilisateur courant. */
export async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

/** Envoie un email contenant un lien de réinitialisation du mot de passe. */
export async function resetPasswordForEmail(email: string, redirectTo?: string) {
	const basePath = getEffectiveDemoBasePath(redirectTo);
	if (typeof window !== 'undefined') {
		sessionStorage.setItem('oauth_demo_redirect', basePath);
		localStorage.setItem('preferred_demo', basePath);
	}
	const finalRedirectTo = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}${basePath}/reinitialiser-mot-de-passe` : undefined);

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: finalRedirectTo,
	});
	if (error) throw error;
}

/** Renvoie l'email de confirmation d'inscription (si le compte n'est pas encore confirmé). */
export async function resendConfirmationEmail(email: string, redirectTo?: string) {
	const basePath = getEffectiveDemoBasePath(redirectTo);
	const emailRedirectTo = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}${basePath}/connexion` : undefined);

	const { error } = await supabase.auth.resend({ 
		type: 'signup', 
		email,
		options: {
			emailRedirectTo
		}
	});
	if (error) throw error;
}

/** Définit un nouveau mot de passe (utilisateur déjà authentifié via le lien reçu par email). */
export async function updatePassword(password: string) {
	const { error } = await supabase.auth.updateUser({ password });
	if (error) throw error;
}

/** Récupère la session courante (null si non connecté). */
export async function getSession() {
	const { data, error } = await supabase.auth.getSession();
	if (error) throw error;
	return data.session;
}

/** Récupère l'utilisateur courant (null si non connecté). */
export async function getUser() {
	const { data, error } = await supabase.auth.getUser();
	if (error) throw error;
	return data.user;
}
