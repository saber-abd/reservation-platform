import { Toaster } from 'sonner';

/**
 * Zone de notifications des espaces connectés Standard (montée une seule fois dans le layout).
 * Mode sans style de sonner : l'habillage vient de la classe sa-toast (standard.css).
 */
export default function StandardToaster() {
	return (
		<Toaster
			position="bottom-right"
			offset={20}
			mobileOffset={{ bottom: 84, left: 16, right: 16 }}
			duration={4000}
			toastOptions={{
				unstyled: true,
				classNames: { toast: 'sa-toast' },
			}}
		/>
	);
}
