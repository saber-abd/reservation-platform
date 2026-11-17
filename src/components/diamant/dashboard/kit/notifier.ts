// Notifications des espaces connectés (sonner). Le <Toaster /> est monté une fois dans
// DiamantDashboardLayout (îlot DiamantToaster) ; ici, les raccourcis utilisés par les panneaux.
import { toast } from 'sonner';

/** Message affiché quand une action est bloquée par le rôle « démo » (lecture seule). */
export const MESSAGE_LECTURE_SEULE =
	'Action désactivée en mode Démo : Ce rôle est réservé à la présentation commerciale en lecture seule.';

export function avertirLectureSeule(message: string = MESSAGE_LECTURE_SEULE) {
	// Type « warning » : icône cadenas (voir DiamantToaster).
	toast.warning(message, { id: 'lecture-seule' });
}

export function confirmer(message: string, description?: string) {
	toast.success(message, description ? { description } : undefined);
}

export function signalerErreur(message: string, description?: string) {
	toast.error(message, description ? { description } : undefined);
}

export function informer(message: string, description?: string) {
	toast(message, description ? { description } : undefined);
}

export { toast };
