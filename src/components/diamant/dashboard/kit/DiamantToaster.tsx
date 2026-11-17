// Îlot unique des notifications (sonner), habillé aux couleurs de Diamant (classe dx-toast).
import { Toaster } from 'sonner';
import { Check, Info, Lock, TriangleAlert } from 'lucide-react';

export default function DiamantToaster() {
	return (
		<Toaster
			position="bottom-right"
			gap={10}
			offset={20}
			mobileOffset={{ bottom: 96, left: 16, right: 16 }}
			visibleToasts={3}
			duration={4200}
			icons={{
				success: <Check size={17} />,
				error: <TriangleAlert size={17} />,
				info: <Info size={17} />,
				warning: <Lock size={17} />,
			}}
			toastOptions={{
				unstyled: true,
				classNames: { toast: 'dx-toast' },
			}}
		/>
	);
}
