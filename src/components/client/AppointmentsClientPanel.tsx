import { useEffect, useState } from 'react';
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

function RescheduleModal({
	appointment,
	onClose,
	onRescheduled,
}: {
	appointment: ClientAppointment;
	onClose: () => void;
	onRescheduled: (updated: Appointment) => void;
}) {
	const [selectedDate, setSelectedDate] = useState(todayISO());
	const [slots, setSlots] = useState<GeneratedSlot[] | null>(null);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleShowAvailabilities() {
		setSlotsLoading(true);
		setSlots(null);
		setSelectedSlot(null);
		try {
			const [rules, appointments] = await Promise.all([
				getAvailabilityRules(appointment.professional_id),
				getAppointmentsForDate(appointment.professional_id, selectedDate),
			]);
			// Exclut le rendez-vous en cours de modification : son créneau actuel ne doit pas apparaître comme "pris".
			const otherAppointments = appointments.filter((a) => a.id !== appointment.id);
			setSlots(generateSlotsForDate(rules, selectedDate, otherAppointments));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors du chargement des disponibilités.');
		} finally {
			setSlotsLoading(false);
		}
	}

	async function handleConfirm() {
		if (!selectedSlot) return;
		setSubmitting(true);
		setError(null);
		try {
			const updated = await rescheduleAppointment(
				appointment.id,
				selectedSlot.start.toISOString(),
				selectedSlot.end.toISOString(),
			);
			onRescheduled(updated);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors de la modification.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
			<div
				className="w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between">
					<h2 className="text-lg font-semibold text-stone-900">Modifier le rendez-vous</h2>
					<button onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600">
						✕
					</button>
				</div>
				<p className="mt-1 text-sm text-stone-500">
					Créneau actuel : {formatDate(appointment.start_time)}
				</p>

				<div className="mt-4 flex flex-wrap items-end gap-3">
					<div>
						<label className="text-sm text-stone-700">Nouvelle date</label>
						<input
							type="date"
							min={todayISO()}
							value={selectedDate}
							onChange={(e) => {
								setSelectedDate(e.target.value);
								setSlots(null);
								setSelectedSlot(null);
							}}
							className="mt-1 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						/>
					</div>
					<button
						type="button"
						onClick={handleShowAvailabilities}
						disabled={slotsLoading}
						className="rounded-xl border border-rose-600 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
					>
						{slotsLoading ? 'Chargement...' : 'Voir les disponibilités'}
					</button>
				</div>

				{slots !== null && (
					<div className="mt-4 grid gap-2 sm:grid-cols-3">
						{slots.map((slot) => (
							<button
								type="button"
								key={slot.start.toISOString()}
								disabled={slot.isBooked}
								onClick={() => setSelectedSlot(slot)}
								className={`rounded-xl border p-3 text-center text-sm capitalize transition-colors ${
									slot.isBooked
										? 'cursor-not-allowed border-border bg-stone-100 text-stone-400 line-through'
										: selectedSlot?.start.getTime() === slot.start.getTime()
											? 'border-rose-600 bg-rose-600 text-white'
											: 'border-border bg-white hover:border-rose-300'
								}`}
							>
								{slot.start.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
							</button>
						))}
						{slots.length === 0 && (
							<p className="col-span-full text-sm text-stone-500">Aucun créneau disponible ce jour-là.</p>
						)}
					</div>
				)}

				{error && <p className="mt-3 text-sm text-red-600">{error}</p>}

				<button
					type="button"
					onClick={handleConfirm}
					disabled={!selectedSlot || submitting}
					className="mt-6 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Confirmation...' : 'Confirmer le nouveau créneau'}
				</button>
			</div>
		</div>
	);
}

const statusLabels: Record<Appointment['status'], string> = {
	pending: 'En attente de validation',
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

const statusStyles: Record<Appointment['status'], string> = {
	pending: 'bg-amber-50 text-amber-700',
	confirmed: 'bg-rose-50 text-rose-700',
	cancelled: 'bg-red-50 text-red-700',
	completed: 'bg-green-50 text-green-700',
};

export default function AppointmentsClientPanel() {
	const { loading, client, error } = useAuthedClient();
	const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [reschedulingAppointment, setReschedulingAppointment] = useState<ClientAppointment | null>(null);

	useEffect(() => {
		if (!client) return;
		getAppointmentsForClient(client.id)
			.then(setAppointments)
			.finally(() => setLoadingAppointments(false));
	}, [client]);

	async function handleCancel(id: string) {
		const updated = await updateAppointmentStatus(id, 'cancelled');
		setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
	}

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Mes rendez-vous</h1>
			<p className="mt-1 text-sm text-stone-500">Bienvenue, {client?.full_name ?? 'vous'}.</p>

			<div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
				<table className="w-full text-left text-sm">
					<thead className="bg-stone-50 text-xs uppercase text-stone-500">
						<tr>
							<th className="px-4 py-3">Prestation</th>
							<th className="px-4 py-3">Créneau</th>
							<th className="px-4 py-3">Statut</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody>
						{loadingAppointments && (
							<tr>
								<td className="px-4 py-4 text-stone-500" colSpan={4}>
									Chargement des rendez-vous...
								</td>
							</tr>
						)}
						{!loadingAppointments && appointments.length === 0 && (
							<tr>
								<td className="px-4 py-4 text-stone-500" colSpan={4}>
									Vous n'avez pas encore de rendez-vous. <a href="/reservation" className="text-rose-600 hover:underline">Réserver un créneau</a>.
								</td>
							</tr>
						)}
						{appointments.map((appointment) => (
							<tr key={appointment.id} className="border-t border-border">
								<td className="px-4 py-3 font-medium text-stone-900">{appointment.services?.name ?? '—'}</td>
								<td className="px-4 py-3 text-stone-600">{formatDate(appointment.start_time)}</td>
								<td className="px-4 py-3">
									<span
										className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}
									>
										{statusLabels[appointment.status]}
									</span>
								</td>
								<td className="px-4 py-3 text-right">
									{canModify(appointment) && (
										<button
											onClick={() => setReschedulingAppointment(appointment)}
											className="mr-3 text-xs font-medium text-rose-600 hover:underline"
										>
											Modifier
										</button>
									)}
									{(appointment.status === 'confirmed' || appointment.status === 'pending') && (
										<button
											onClick={() => handleCancel(appointment.id)}
											className="text-xs font-medium text-red-600 hover:underline"
										>
											Annuler
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{reschedulingAppointment && (
				<RescheduleModal
					appointment={reschedulingAppointment}
					onClose={() => setReschedulingAppointment(null)}
					onRescheduled={(updated) =>
						setAppointments((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)))
					}
				/>
			)}
		</div>
	);
}
