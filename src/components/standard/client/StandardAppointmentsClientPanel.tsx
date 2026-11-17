import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';
import { useAuthedClient } from '@/lib/useAuthedClient';
import {
	getAppointmentsForClient,
	getAppointmentsForDate,
	getAvailabilityRules,
	rescheduleAppointment,
	updateAppointmentStatus,
	type Appointment,
} from '@/lib/queries';
import { generateSlotsForDate, type GeneratedSlot } from '@/lib/slots';
import {
	Busy,
	DateBlock,
	EmptyState,
	PageHeader,
	Panel,
	Sheet,
	Skeleton,
	StatusPill,
	statusTone,
	useLastDefined,
} from '@/components/standard/ui/StandardKit';

type ClientAppointment = Appointment & { services: { name: string } | null };

const MIN_HOURS_BEFORE_CHANGE = 24;

function formatDate(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

function canModify(appointment: Appointment) {
	if (appointment.status !== 'confirmed' && appointment.status !== 'pending') return false;
	const hoursUntil = (new Date(appointment.start_time).getTime() - Date.now()) / 3_600_000;
	return hoursUntil >= MIN_HOURS_BEFORE_CHANGE;
}

function RescheduleSheet({
	appointment,
	open,
	onClose,
	onRescheduled,
}: {
	appointment: ClientAppointment | null;
	open: boolean;
	onClose: () => void;
	onRescheduled: (updated: Appointment) => void;
}) {
	const shown = useLastDefined(appointment);
	const [selectedDate, setSelectedDate] = useState(todayISO());
	const [slots, setSlots] = useState<GeneratedSlot[] | null>(null);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Chaque ouverture repart d'un état vierge (comme l'ancienne modale, recréée à chaque fois).
	useEffect(() => {
		if (!open) return;
		setSelectedDate(todayISO());
		setSlots(null);
		setSelectedSlot(null);
		setError(null);
	}, [open, appointment?.id]);

	if (!shown) return null;

	async function handleShowAvailabilities() {
		if (!shown) return;
		setSlotsLoading(true);
		setSlots(null);
		setSelectedSlot(null);
		try {
			const [rules, appointments] = await Promise.all([
				getAvailabilityRules(shown.professional_id),
				getAppointmentsForDate(shown.professional_id, selectedDate),
			]);
			// Exclut le rendez-vous en cours de modification : son créneau actuel ne doit pas apparaître comme "pris".
			const otherAppointments = appointments.filter((a) => a.id !== shown.id);
			setSlots(generateSlotsForDate(rules, selectedDate, otherAppointments));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors du chargement des disponibilités.');
		} finally {
			setSlotsLoading(false);
		}
	}

	async function handleConfirm() {
		if (!selectedSlot || !shown) return;
		setSubmitting(true);
		setError(null);
		try {
			const updated = await rescheduleAppointment(shown.id, selectedSlot.start.toISOString(), selectedSlot.end.toISOString());
			onRescheduled(updated);
			toast.success('Votre rendez-vous a été déplacé.');
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors de la modification.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Sheet
			open={open}
			onClose={onClose}
			title="Modifier le rendez-vous"
			description={`Créneau actuel : ${formatDate(shown.start_time)}`}
			footer={
				<button type="button" onClick={handleConfirm} disabled={!selectedSlot || submitting} className="sa-btn sa-btn--primary">
					{submitting ? 'Confirmation...' : 'Confirmer le nouveau créneau'}
				</button>
			}
		>
			<div className="flex flex-wrap items-end gap-3">
				<div>
					<label className="sa-label" htmlFor="sa-new-date">
						Nouvelle date
					</label>
					<input
						id="sa-new-date"
						type="date"
						min={todayISO()}
						value={selectedDate}
						onChange={(e) => {
							setSelectedDate(e.target.value);
							setSlots(null);
							setSelectedSlot(null);
						}}
						className="sa-input sa-num w-auto"
					/>
				</div>
				<button type="button" onClick={handleShowAvailabilities} disabled={slotsLoading} className="sa-btn sa-btn--secondary">
					{slotsLoading ? 'Recherche…' : 'Voir les disponibilités'}
				</button>
			</div>

			{slotsLoading && (
				<Busy label="Recherche des créneaux…">
					<div className="sa-slots mt-5">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-10" />
						))}
					</div>
				</Busy>
			)}

			{slots !== null && (
				<div className="mt-5">
					{slots.length === 0 ? (
						<p className="text-sm text-ink-mute">Aucun créneau disponible ce jour-là.</p>
					) : (
						<>
							<p className="sa-label">Créneaux du {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
							<div className="sa-slots">
								{slots.map((slot) => (
									<button
										type="button"
										key={slot.start.toISOString()}
										disabled={slot.isBooked}
										aria-pressed={selectedSlot?.start.getTime() === slot.start.getTime()}
										onClick={() => setSelectedSlot(slot)}
										className="sa-slot"
									>
										{slot.start.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
									</button>
								))}
							</div>
						</>
					)}
				</div>
			)}

			{error && <p className="sa-alert mt-4">{error}</p>}
		</Sheet>
	);
}

const statusLabels: Record<Appointment['status'], string> = {
	pending: 'En attente de validation',
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

function AppointmentRows({
	items,
	onModify,
	onCancel,
}: {
	items: ClientAppointment[];
	onModify: (a: ClientAppointment) => void;
	onCancel: (id: string) => void;
}) {
	return (
		<table className="sa-table sa-table--stack">
			<thead>
				<tr>
					<th scope="col">Prestation</th>
					<th scope="col">Créneau</th>
					<th scope="col">Statut</th>
					<th scope="col">
						<span className="sr-only">Actions</span>
					</th>
				</tr>
			</thead>
			<tbody>
				{items.map((appointment) => (
					<tr key={appointment.id}>
						<td data-cell="main" className="sa-cell-strong">
							{appointment.services?.name ?? '—'}
						</td>
						<td data-cell="full">
							<span className="flex items-center gap-2.5">
								<DateBlock iso={appointment.start_time} />
								<span className="sa-num">{formatDate(appointment.start_time)}</span>
							</span>
						</td>
						<td data-cell="side">
							<StatusPill tone={statusTone[appointment.status]}>{statusLabels[appointment.status]}</StatusPill>
						</td>
						<td data-cell="full" className="sa-cell-end">
							<span className="inline-flex gap-1.5">
								{canModify(appointment) && (
									<button type="button" onClick={() => onModify(appointment)} className="sa-btn sa-btn--secondary sa-btn--sm">
										Modifier
									</button>
								)}
								{(appointment.status === 'confirmed' || appointment.status === 'pending') && (
									<button type="button" onClick={() => onCancel(appointment.id)} className="sa-btn sa-btn--danger sa-btn--sm">
										Annuler
									</button>
								)}
							</span>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export default function AppointmentsClientPanel() {
	const { loading, client, error } = useAuthedClient();
	const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [reschedulingAppointment, setReschedulingAppointment] = useState<ClientAppointment | null>(null);
	const [basePath, setBasePath] = useState('');

	useEffect(() => {
		setBasePath(window.location.pathname.match(/^\/(demo-[^/]+)/)?.[0] || '');
	}, []);

	useEffect(() => {
		if (!client) return;
		getAppointmentsForClient(client.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [client]);

	async function handleCancel(id: string) {
		try {
			const updated = await updateAppointmentStatus(id, 'cancelled');
			setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
			toast.success('Rendez-vous annulé.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "L'annulation a échoué.");
		}
	}

	const reserveHref = `${basePath}/reservation`;

	if (loading) {
		return (
			<Busy>
				<div className="sa-pagehead">
					<div className="grid gap-3">
						<Skeleton className="h-9 w-64" />
						<Skeleton className="h-4 w-40" />
					</div>
				</div>
				<Skeleton className="h-52 w-full" />
			</Busy>
		);
	}
	if (error) return <p className="sa-alert">{error}</p>;

	const now = Date.now();
	const upcoming = appointments
		.filter((a) => (a.status === 'confirmed' || a.status === 'pending') && new Date(a.start_time).getTime() >= now)
		.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
	const next = upcoming[0] ?? null;
	const others = upcoming.slice(1);
	const history = appointments.filter((a) => !upcoming.includes(a));

	return (
		<div>
			<PageHeader
				title="Mes rendez-vous"
				subtitle={`Bienvenue, ${client?.full_name ?? 'vous'}.`}
				actions={
					<a href={reserveHref} className="sa-btn sa-btn--secondary">
						<CalendarPlus size={16} aria-hidden="true" />
						Réserver un créneau
					</a>
				}
			/>

			{loadingAppointments ? (
				<Busy>
					<Skeleton className="h-52 w-full" />
				</Busy>
			) : appointments.length === 0 ? (
				<div className="sa-panel">
					<EmptyState
						kind="calendar"
						title="Vous n'avez pas encore de rendez-vous."
						action={
							<a href={reserveHref} className="sa-btn sa-btn--primary">
								Réserver un créneau
							</a>
						}
					>
						Choisissez une intervention et un créneau : la demande est confirmée par le technicien.
					</EmptyState>
				</div>
			) : (
				<div className="grid gap-8">
					{/* Prochain rendez-vous */}
					{next ? (
						<section className="sa-next" aria-label="Prochain rendez-vous">
							<div className="sa-next-date">
								<span className="sa-next-day">{new Date(next.start_time).getDate()}</span>
								<span className="sa-next-month">
									{new Date(next.start_time).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
								</span>
								<span className="sa-next-time">
									{new Date(next.start_time).toLocaleDateString('fr-FR', { weekday: 'long' })}, à{' '}
									{new Date(next.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
								</span>
							</div>
							<div className="sa-next-body">
								<div>
									<p className="text-sm font-medium text-[#aab3c7]">Prochain rendez-vous</p>
									<h2 className="sa-next-title mt-1">{next.services?.name ?? 'Intervention'}</h2>
									<div className="mt-3 flex flex-wrap items-center gap-3">
										<StatusPill tone={statusTone[next.status]}>{statusLabels[next.status]}</StatusPill>
										<span className="text-sm text-[#aab3c7]">
											{canModify(next)
												? `Modifiable ou annulable jusqu'à ${MIN_HOURS_BEFORE_CHANGE} h avant.`
												: 'Moins de 24 h avant : contactez le technicien pour tout changement.'}
										</span>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									{canModify(next) && (
										<button type="button" onClick={() => setReschedulingAppointment(next)} className="sa-btn sa-btn--secondary">
											Modifier
										</button>
									)}
									<button type="button" onClick={() => handleCancel(next.id)} className="sa-btn sa-btn--danger">
										Annuler
									</button>
								</div>
							</div>
						</section>
					) : (
						<div className="sa-panel">
							<EmptyState
								kind="calendar"
								title="Aucun rendez-vous à venir."
								action={
									<a href={reserveHref} className="sa-btn sa-btn--primary">
										Réserver un créneau
									</a>
								}
							>
								Votre historique reste consultable ci-dessous.
							</EmptyState>
						</div>
					)}

					{others.length > 0 && (
						<Panel title="Ensuite" bodyClassName="">
							<AppointmentRows items={others} onModify={setReschedulingAppointment} onCancel={handleCancel} />
						</Panel>
					)}

					{history.length > 0 && (
						<Panel title="Historique" description="Rendez-vous passés et annulés." bodyClassName="">
							<AppointmentRows items={history} onModify={setReschedulingAppointment} onCancel={handleCancel} />
						</Panel>
					)}
				</div>
			)}

			<RescheduleSheet
				appointment={reschedulingAppointment}
				open={reschedulingAppointment !== null}
				onClose={() => setReschedulingAppointment(null)}
				onRescheduled={(updated) =>
					setAppointments((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)))
				}
			/>
		</div>
	);
}
