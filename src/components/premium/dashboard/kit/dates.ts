// Petits utilitaires de dates pour les vues calculées (agenda, accueil). Aucun accès au DOM.

export const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** Lundi 00:00 de la semaine contenant `d`. */
export function debutSemaine(d: Date): Date {
	const r = new Date(d);
	r.setHours(0, 0, 0, 0);
	const offset = (r.getDay() + 6) % 7; // lundi = 0
	r.setDate(r.getDate() - offset);
	return r;
}

export function ajouterJours(d: Date, n: number): Date {
	const r = new Date(d);
	r.setDate(r.getDate() + n);
	return r;
}

export function memeJour(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** « YYYY-MM-DD » en heure locale. */
export function isoLocal(d: Date): string {
	return d.toLocaleDateString('sv');
}

export function heureCourte(d: Date): string {
	return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** « 16 – 22 novembre » ou « 28 oct. – 3 nov. » */
export function libelleSemaine(debut: Date): string {
	const fin = ajouterJours(debut, 6);
	if (debut.getMonth() === fin.getMonth()) {
		return `${debut.getDate()} – ${fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
	}
	const f = { day: 'numeric', month: 'short' } as const;
	return `${debut.toLocaleDateString('fr-FR', f)} – ${fin.toLocaleDateString('fr-FR', f)}`;
}

/** « dans 2 jours », « demain », « aujourd'hui », « dans 3 h » */
export function delaiRelatif(cible: Date, maintenant = new Date()): string {
	const ms = cible.getTime() - maintenant.getTime();
	const jours = Math.round((new Date(cible).setHours(0, 0, 0, 0) - new Date(maintenant).setHours(0, 0, 0, 0)) / 86_400_000);
	if (ms < 0) return 'passé';
	if (jours === 0) {
		const h = Math.floor(ms / 3_600_000);
		if (h < 1) return `dans ${Math.max(1, Math.round(ms / 60_000))} min`;
		return `aujourd'hui, dans ${h} h`;
	}
	if (jours === 1) return 'demain';
	return `dans ${jours} jours`;
}
