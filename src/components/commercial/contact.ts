// Coordonnées de contact de la page commerciale (boutons, pied de page, pages légales).

const numero = '33767219980';

export const contact = {
	telephone: '07 67 21 99 80',
	telephoneHref: `tel:+${numero}`,
	whatsappHref: `https://wa.me/${numero}?text=${encodeURIComponent('Bonjour, je souhaite échanger au sujet d’un projet de site.')}`,
	// À compléter : adresse e-mail de contact. Tant qu'elle est vide, le bouton e-mail est masqué.
	email: '',
};
