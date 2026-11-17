import { Toaster } from 'sonner';

/**
 * Unique zone de notifications des espaces connectés Premium (monté une fois dans le layout).
 * Les panneaux appellent `toast()` / `toast.success()` / `toast.error()` de sonner.
 * Habillage : classes pe-toast… dans premium.css (carbone, filet de couleur à gauche).
 */
export default function PremiumToaster() {
	return (
		<Toaster
			position="bottom-right"
			gap={10}
			offset={20}
			mobileOffset={12}
			toastOptions={{
				unstyled: true,
				duration: 4000,
				classNames: {
					toast: 'pe-toast',
					title: 'pe-toast__titre',
					description: 'pe-toast__desc',
				},
			}}
		/>
	);
}

/** Message affiché quand une action est refusée en lecture seule (aperçu, compte de démonstration). */
export const LECTURE_SEULE = 'Action désactivée : cette démonstration est en lecture seule.';
