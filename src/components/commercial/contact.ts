// Coordonnées de contact de la page commerciale (boutons, pied de page, pages légales).

const numero = '33767219980';

export const contact = {
	telephone: '07 67 21 99 80',
	telephoneHref: `tel:+${numero}`,
	whatsappHref: `https://wa.me/${numero}?text=${encodeURIComponent('Bonjour, je souhaite échanger au sujet d’un projet de site.')}`,
	// À compléter : adresse e-mail de contact. Tant qu'elle est vide, le bouton e-mail est masqué.
	email: '',
};

// Formulaire de /contact : même compte EmailJS que les formulaires de contact des démos
// (clé publique, faite pour être utilisée côté navigateur).
export const emailjs = {
	serviceId: 'service_7pvm3br',
	templateId: 'template_3j75n8o',
	publicKey: '5Jjd71i9EWOeYyzsG',
};
