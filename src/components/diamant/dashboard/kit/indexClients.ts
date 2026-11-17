// Index des clients pour la palette de commandes (Ctrl+K). Aucune requête ici : les panneaux
// qui chargent déjà des clients (clientèle, messagerie, droits, recherche) les publient, et la
// palette les lit. Copie de confort dans sessionStorage (onglet courant seulement) pour que la
// palette les retrouve d'une page à l'autre.
export interface ClientIndexe {
	id: string;
	nom: string;
	telephone?: string | null;
	email?: string | null;
}

const CLE = 'diamant_palette_clients';
const EVENEMENT = 'diamant:palette-clients';
let memoire: ClientIndexe[] = [];

export function publierClients(liste: { id: string; full_name?: string | null; name?: string | null; phone?: string | null; email?: string | null }[]) {
	if (typeof window === 'undefined') return;
	const parId = new Map<string, ClientIndexe>(memoire.map((c) => [c.id, c]));
	for (const c of liste) {
		if (!c?.id) continue;
		parId.set(c.id, {
			id: c.id,
			nom: c.full_name || c.name || 'Client',
			telephone: c.phone ?? null,
			email: c.email ?? null,
		});
	}
	memoire = Array.from(parId.values());
	try {
		sessionStorage.setItem(CLE, JSON.stringify(memoire));
	} catch {}
	window.dispatchEvent(new CustomEvent(EVENEMENT));
}

export function lireClients(): ClientIndexe[] {
	if (memoire.length === 0 && typeof window !== 'undefined') {
		try {
			const brut = sessionStorage.getItem(CLE);
			if (brut) memoire = JSON.parse(brut);
		} catch {}
	}
	return memoire;
}

export function surClientsPublies(cb: () => void) {
	window.addEventListener(EVENEMENT, cb);
	return () => window.removeEventListener(EVENEMENT, cb);
}
