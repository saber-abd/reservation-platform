import { supabase } from './supabase';

/**
 * Inscription d'un professionnel (ou client) avec email + mot de passe.
 * Ne crée que le compte Auth ; la ligne dans `professionals`/`clients`
 * doit être créée séparément (voir Phase 5 - dashboard pro / espace client).
 */
export async function signUp(email: string, password: string) {
	const { data, error } = await supabase.auth.signUp({ email, password });
	if (error) throw error;
	return data;
}

/** Connexion avec email + mot de passe. */
export async function signIn(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw error;
	return data;
}

/** Déconnexion de l'utilisateur courant. */
export async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

/** Envoie un email contenant un lien de réinitialisation du mot de passe. */
export async function resetPasswordForEmail(email: string) {
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
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
