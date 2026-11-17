import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, Pencil, X, Clock } from 'lucide-react';
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
import { EmptyState, PageHead, PageSkeleton, RowsSkeleton, StatusTag } from '@/components/premium/dashboard/kit/Base';
import { SidePanel } from '@/components/premium/dashboard/kit/Interactive';
import { delaiRelatif, heureCourte } from '@/components/premium/dashboard/kit/dates';

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

const statusLabels: Record<Appointment['status'], string> = {
	pending: 'En attente de validation',
	confirmed: 'Confirmé',
	cancelled: 'Annulé',
	completed: 'Terminé',
};

/* ---------- Modification d'un rendez-vous (panneau latéral) ---------- */

function RescheduleContent({
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
			const updated = await rescheduleAppointment(appointment.id, selectedSlot.start.toISOString(), selectedSlot.end.toISOString());
			onRescheduled(updated);
			toast.success(`Rendez-vous déplacé au ${formatDate(selectedSlot.start.toISOString())}.`);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors de la modification.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="grid gap-6">
			<div className="pe-card p-4">
				<p className="pe-tech">Créneau actuel</p>
				<p className="mt-1 font-bold first-letter:uppercase">{formatDate(appointment.start_time)}</p>
				<p className="text-sm text-pe-acier">{appointment.services?.name ?? '—'}</p>
			</div>

			<div className="flex flex-wrap items-end gap-3">
				<div className="min-w-[12rem] flex-1">
					<label className="pe-label" htmlFor="nouvelle-date">
						Nouvelle date
					</label>
					<input
						id="nouvelle-date"
						type="date"
						min={todayISO()}
						value={selectedDate}
						onChange={(e) => {
							setSelectedDate(e.target.value);
							setSlots(null);
							setSelectedSlot(null);
						}}
						className="pe-input"
					/>
				</div>
				<button type="button" onClick={handleShowAvailabilities} disabled={slotsLoading} className="pe-btn pe-btn--encre">
					{slotsLoading ? 'Recherche…' : 'Voir les disponibilités'}
				</button>
			</div>

			{slotsLoading && (
				<div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true">
					<span className="sr-only">Chargement…</span>
					{Array.from({ length: 8 }, (_, i) => (
						<span key={i} className="pe-skel" style={{ height: 44 }} />
					))}
				</div>
			)}

			{slots !== null && (
				<div>
					<p className="pe-label">Créneaux du {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
						{slots.map((slot) => {
							const choisi = selectedSlot?.start.getTime() === slot.start.getTime();
							return (
								<button
									type="button"
									key={slot.start.toISOString()}
									disabled={slot.isBooked}
									aria-pressed={choisi}
									onClick={() => setSelectedSlot(slot)}
									className={`min-h-[44px] rounded-[2px] border text-[0.95rem] font-bold tabular-nums transition-colors ${
										slot.isBooked
											? 'cursor-not-allowed border-pe-filet bg-pe-carte-2 text-pe-acier line-through'
											: choisi
												? 'border-pe-rouge bg-pe-rouge text-white'
												: 'border-pe-filet-fort bg-white hover:border-pe-encre'
									}`}
								>
									{slot.start.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
								</button>
							);
						})}
						{slots.length === 0 && <p className="col-span-full text-sm text-pe-acier">Aucun créneau disponible ce jour-là.</p>}
					</div>
				</div>
			)}

			{error && <p className="pe-erreur">{error}</p>}

			<button type="button" onClick={handleConfirm} disabled={!selectedSlot || submitting} className="pe-btn pe-btn--bloc">
				{submitting ? 'Confirmation…' : 'Confirmer le nouveau créneau'}
			</button>
		</div>
	);
}

/* ---------- Panneau principal ---------- */

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

	if (loading) return <PageSkeleton cards={2} />;
	if (error) return <p className="pe-erreur">{error}</p>;

	const now = new Date();
	const aVenir = appointments
		.filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.start_time) >= now)
		.sort((a, b) => a.start_time.localeCompare(b.start_time));
	const prochain = aVenir[0] ?? null;
	const autres = appointments.filter((a) => a.id !== prochain?.id);

	const reserver = (
		<a href={`${basePath}/reservation`} className="pe-btn">
			<CalendarPlus aria-hidden="true" />
			Réserver un créneau
		</a>
	);

	return (
		<div className="pe-entree">
			<PageHead
				title="Mes rendez-vous"
				sub={
					<>
						Bienvenue, <strong>{client?.full_name ?? 'vous'}</strong>.
					</>
				}
				actions={reserver}
			/>

			{/* Prochain rendez-vous en grand */}
			<section className="pe-card pe-card--sombre overflow-hidden" aria-label="Prochain rendez-vous">
				{loadingAppointments ? (
					<div className="pe-card__corps grid gap-4" aria-busy="true">
						<span className="sr-only">Chargement…</span>
						<span className="pe-skel" style={{ height: 14, width: '25%' }} />
						<span className="pe-skel" style={{ height: 96, width: '55%' }} />
						<span className="pe-skel" style={{ height: 14, width: '40%' }} />
					</div>
				) : prochain ? (
					<div className="grid md:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
						{/* Feuillet date */}
						<div className="flex items-center gap-5 border-b border-pe-filet-sombre p-5 md:block md:border-b-0 md:border-r md:p-8">
							<p className="pe-tech">{new Date(prochain.start_time).toLocaleDateString('fr-FR', { weekday: 'long' })}</p>
							<p className="text-[clamp(4.5rem,11vw,8rem)] font-extrabold leading-[0.85] tracking-[-0.04em] tabular-nums [font-stretch:115%] md:mt-3">
								{new Date(prochain.start_time).getDate()}
							</p>
							<p className="text-xl font-extrabold uppercase [font-stretch:120%] md:mt-2">
								{new Date(prochain.start_time).toLocaleDateString('fr-FR', { month: 'long' })}
							</p>
						</div>
						<div className="flex flex-col gap-5 p-5 md:p-8">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="pe-tech">Prochain rendez-vous</p>
								<StatusTag status={prochain.status} label={statusLabels[prochain.status]} />
							</div>
							<div>
								<p className="flex items-baseline gap-3">
									<span className="text-[clamp(2.4rem,5vw,3.6rem)] font-extrabold leading-none tabular-nums [font-stretch:112%]">
										{heureCourte(new Date(prochain.start_time))}
									</span>
									<span className="pe-tech !text-pe-blanc">{delaiRelatif(new Date(prochain.start_time), now)}</span>
								</p>
								<p className="mt-4 text-[clamp(1.25rem,2.2vw,1.7rem)] font-extrabold uppercase leading-tight tracking-[-0.01em] [font-stretch:118%]">
									{prochain.services?.name ?? '—'}
								</p>
							</div>
							<div className="mt-auto flex flex-wrap gap-2.5">
								{canModify(prochain) && (
									<button type="button" onClick={() => setReschedulingAppointment(prochain)} className="pe-btn pe-btn--clair">
										<Pencil aria-hidden="true" />
										Modifier
									</button>
								)}
								<button type="button" onClick={() => handleCancel(prochain.id)} className="pe-btn pe-btn--fantome">
									<X aria-hidden="true" />
									Annuler
								</button>
							</div>
							{!canModify(prochain) && (
								<p className="flex items-center gap-2 text-sm text-pe-acier-clair">
									<Clock size={14} aria-hidden="true" />
									Le créneau ne peut plus être déplacé moins de {MIN_HOURS_BEFORE_CHANGE} h avant le rendez-vous.
								</p>
							)}
						</div>
					</div>
				) : (
					<EmptyState
						kind="agenda"
						title={appointments.length === 0 ? "Vous n'avez pas encore de rendez-vous." : 'Aucun rendez-vous à venir.'}
						text="Choisissez une prestation et un créneau : la confirmation de l'atelier arrive ensuite ici."
						action={
							<a href={`${basePath}/reservation`} className="pe-btn">
								<CalendarPlus aria-hidden="true" />
								Réserver un créneau
							</a>
						}
					/>
				)}
			</section>

			{/* Tous les rendez-vous */}
			<section className="pe-card mt-4" aria-labelledby="tous-titre">
				<div className="pe-card__tete">
					<h2 id="tous-titre" className="pe-h2">
						Historique
					</h2>
					<span className="pe-tech">
						{appointments.length} rendez-vous · {aVenir.length} à venir
					</span>
				</div>
				{loadingAppointments ? (
					<RowsSkeleton rows={3} />
				) : autres.length === 0 ? (
					<EmptyState kind="liste" title="Rien d'autre pour l'instant." text="Vos rendez-vous passés et annulés s'afficheront ici." />
				) : (
					<ul className="pe-rows">
						{autres.map((appointment) => {
							const d = new Date(appointment.start_time);
							const actif = appointment.status === 'confirmed' || appointment.status === 'pending';
							return (
								<li key={appointment.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-[18px] py-4 md:px-[22px]">
									<span className="pe-date !min-w-[56px] !py-1.5">
										<span>{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
										<b className="!text-[1.4rem]">{d.getDate()}</b>
									</span>
									<span className="min-w-0 flex-1">
										<span className="block font-bold">{appointment.services?.name ?? '—'}</span>
										<span className="pe-tech">{formatDate(appointment.start_time)}</span>
									</span>
									<StatusTag status={appointment.status} label={statusLabels[appointment.status]} />
									{(canModify(appointment) || actif) && (
										<span className="flex w-full gap-2 sm:w-auto">
											{canModify(appointment) && (
												<button type="button" onClick={() => setReschedulingAppointment(appointment)} className="pe-btn pe-btn--ligne pe-btn--sm">
													Modifier
												</button>
											)}
											{actif && (
												<button type="button" onClick={() => handleCancel(appointment.id)} className="pe-btn pe-btn--danger pe-btn--sm">
													Annuler
												</button>
											)}
										</span>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</section>

			<SidePanel open={!!reschedulingAppointment} onClose={() => setReschedulingAppointment(null)} title="Modifier le rendez-vous">
				{reschedulingAppointment && (
					<RescheduleContent
						appointment={reschedulingAppointment}
						onClose={() => setReschedulingAppointment(null)}
						onRescheduled={(updated) => setAppointments((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)))}
					/>
				)}
			</SidePanel>
		</div>
	);
}
