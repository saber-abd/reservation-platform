// Lecture seule du compte « démo » (Diamant, espace pro) : état réactif pour l'interface.
// La vérification qui compte reste isRoleReadOnly() au moment de l'action (et la RLS en base).
import { useEffect, useState } from 'react';
import { getRealProRole, isRoleReadOnly } from '@/lib/permissions';

/**
 * Vrai quand le rôle actif est « démo ». `actif` = false (espace client) : toujours faux,
 * car isRoleReadOnly() vaut « démo » tant qu'aucun contexte pro n'est chargé.
 * Tant que le rôle réel n'est pas connu, on reste prudent (lecture seule).
 */
export function useLectureSeule(actif = true): boolean {
	const [lecture, setLecture] = useState(actif);
	useEffect(() => {
		if (!actif) {
			setLecture(false);
			return;
		}
		const maj = () => setLecture(isRoleReadOnly());
		maj();
		window.addEventListener('pro:role-changed', maj);
		return () => window.removeEventListener('pro:role-changed', maj);
	}, [actif]);
	return lecture;
}

/** Appelle `action` dès que le rôle réel est connu et autorise l'écriture (jamais pour le compte démo). */
export function quandEcritureAutorisee(action: () => void): () => void {
	if (getRealProRole()) {
		if (!isRoleReadOnly()) action();
		return () => {};
	}
	const surRole = () => {
		if (!getRealProRole()) return;
		window.removeEventListener('pro:role-changed', surRole);
		if (!isRoleReadOnly()) action();
	};
	window.addEventListener('pro:role-changed', surRole);
	return () => window.removeEventListener('pro:role-changed', surRole);
}
